import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Get all published courses with optional filtering and search
router.get('/', async (req: any, res: any) => {
  try {
    const { 
      search = '', 
      category = '', 
      level = '', 
      instructorId = '',
      page = 1, 
      limit = 12 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE c.IsPublished = 1';
    const params: any = {};

    // Add search filter
    if (search) {
      whereClause += ' AND (c.Title LIKE @search OR c.Description LIKE @search OR c.Tags LIKE @search)';
      params.search = `%${search}%`;
    }

    // Add category filter
    if (category) {
      whereClause += ' AND c.Category = @category';
      params.category = category;
    }

    // Add level filter
    if (level) {
      whereClause += ' AND c.Level = @level';
      params.level = level;
    }

    // Add instructor filter
    if (instructorId) {
      whereClause += ' AND c.InstructorId = @instructorId';
      params.instructorId = instructorId;
    }

    const query = `
      SELECT 
        c.Id,
        c.Title,
        c.Description,
        c.Thumbnail,
        c.Category,
        c.Level,
        c.Duration,
        c.Price,
        c.Rating,
        c.EnrollmentCount,
        c.Tags,
        c.CreatedAt,
        c.UpdatedAt,
        c.InstructorId, -- Added instructor ID to response
        u.FirstName as InstructorFirstName,
        u.LastName as InstructorLastName,
        u.Avatar as InstructorAvatar,
        (SELECT COUNT(*) FROM Lessons l WHERE l.CourseId = c.Id) as LessonCount
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      ${whereClause}
      ORDER BY c.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      ${whereClause}
    `;

    const [coursesResult, countResult] = await Promise.all([
      db.query(query, { ...params, offset, limit: parseInt(limit) }),
      db.query(countQuery, params)
    ]);

    const courses = coursesResult.map((course: any) => ({
      ...course,
      Tags: course.Tags ? JSON.parse(course.Tags) : [],
      Instructor: {
        Id: course.InstructorId, // Added instructor ID to response
        FirstName: course.InstructorFirstName,
        LastName: course.InstructorLastName,
        Avatar: course.InstructorAvatar
      }
    }));

    // Remove instructor fields from course object
    courses.forEach((course: any) => {
      delete course.InstructorId; // Remove since it's now in Instructor object
      delete course.InstructorFirstName;
      delete course.InstructorLastName;
      delete course.InstructorAvatar;
    });

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      courses,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID with detailed information
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        c.*,
        u.FirstName as InstructorFirstName,
        u.LastName as InstructorLastName,
        u.Avatar as InstructorAvatar,
        u.Email as InstructorEmail
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      WHERE c.Id = @id AND c.IsPublished = 1
    `;

    const result = await db.query(query, { id });

    if (result.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result[0];

    // Get lessons for this course
    const lessonsQuery = `
      SELECT Id, Title, Description, OrderIndex, Duration, IsRequired
      FROM Lessons
      WHERE CourseId = @courseId
      ORDER BY OrderIndex
    `;

    const lessons = await db.query(lessonsQuery, { courseId: id });

    // Format response
    const courseData = {
      ...course,
      Prerequisites: course.Prerequisites ? JSON.parse(course.Prerequisites) : [],
      LearningOutcomes: course.LearningOutcomes ? JSON.parse(course.LearningOutcomes) : [],
      Tags: course.Tags ? JSON.parse(course.Tags) : [],
      Instructor: {
        Id: course.InstructorId,
        FirstName: course.InstructorFirstName,
        LastName: course.InstructorLastName,
        Avatar: course.InstructorAvatar,
        Email: course.InstructorEmail
      },
      Lessons: lessons
    };

    // Remove instructor fields from main course object
    delete courseData.InstructorFirstName;
    delete courseData.InstructorLastName;
    delete courseData.InstructorAvatar;
    delete courseData.InstructorEmail;

    res.json(courseData);

  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Get enrollment status for authenticated user
router.get('/:id/enrollment', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // Changed from req.user.id to req.user.userId

    console.log(`[ENROLLMENT DEBUG] Checking enrollment for userId: ${userId}, courseId: ${id}`);

    const query = `
      SELECT Id, Status, EnrolledAt, CompletedAt
      FROM Enrollments
      WHERE UserId = @userId AND CourseId = @courseId
    `;

    const result = await db.query(query, { userId, courseId: id });

    console.log(`[ENROLLMENT DEBUG] Query result:`, result);

    if (result.length === 0) {
      console.log(`[ENROLLMENT DEBUG] No enrollment found, returning isEnrolled: false`);
      return res.json({ isEnrolled: false });
    }

    const enrollment = result[0];
    const response = {
      isEnrolled: true,
      status: enrollment.Status,
      enrolledAt: enrollment.EnrolledAt,
      completedAt: enrollment.CompletedAt
    };
    
    console.log(`[ENROLLMENT DEBUG] Enrollment found, returning:`, response);
    res.json(response);

  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
});

// Get course categories and stats
router.get('/meta/categories', async (req: any, res: any) => {
  try {
    const query = `
      SELECT 
        c.Category,
        COUNT(*) as Count,
        ISNULL(AVG(CAST(c.Rating as FLOAT)), 0) as AverageRating,
        ISNULL(AVG(CAST(e.EnrollmentCount as FLOAT)), 0) as AverageEnrollments
      FROM Courses c
      LEFT JOIN (
        SELECT 
          CourseId,
          COUNT(*) as EnrollmentCount
        FROM Enrollments 
        WHERE Status = 'active'
        GROUP BY CourseId
      ) e ON c.Id = e.CourseId
      WHERE c.IsPublished = 1
      GROUP BY c.Category
      ORDER BY Count DESC
    `;

    const result = await db.query(query);
    
    console.log('Categories API response:', JSON.stringify(result, null, 2));

    res.json(result);

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get course levels and stats
router.get('/meta/levels', async (req: any, res: any) => {
  try {
    const query = `
      SELECT 
        c.Level,
        COUNT(*) as Count,
        ISNULL(AVG(CAST(c.Rating as FLOAT)), 0) as AverageRating,
        ISNULL(AVG(CAST(e.EnrollmentCount as FLOAT)), 0) as AverageEnrollments
      FROM Courses c
      LEFT JOIN (
        SELECT 
          CourseId,
          COUNT(*) as EnrollmentCount
        FROM Enrollments 
        WHERE Status = 'active'
        GROUP BY CourseId
      ) e ON c.Id = e.CourseId
      WHERE c.IsPublished = 1
      GROUP BY c.Level
      ORDER BY Count DESC
    `;

    const result = await db.query(query);
    
    console.log('Levels API response:', JSON.stringify(result, null, 2));

    res.json(result);

  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
});

// Get overall course statistics
router.get('/meta/stats', async (req: any, res: any) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as TotalCourses,
        COUNT(CASE WHEN c.Price = 0 THEN 1 END) as FreeCourses,
        ISNULL((SELECT COUNT(DISTINCT UserId) FROM Enrollments WHERE Status = 'active'), 0) as TotalStudents,
        COUNT(DISTINCT c.Category) as TotalCategories
      FROM Courses c
      WHERE c.IsPublished = 1
    `;

    const result = await db.query(query);
    
    console.log('Overall Stats API response:', JSON.stringify(result, null, 2));
    
    res.json(result[0] || {
      TotalCourses: 0,
      FreeCourses: 0,
      TotalStudents: 0,
      TotalCategories: 0
    });

  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({ error: 'Failed to fetch overall stats' });
  }
});

export { router as courseRoutes };