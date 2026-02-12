import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
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

    // Use Status field if it exists, fallback to IsPublished
    // Only show public courses in catalog (unlisted courses hidden)
    let whereClause = "WHERE (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1)) AND ISNULL(c.Visibility, 'public') = 'public'";
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
        (SELECT COUNT(*) FROM Enrollments e WHERE e.CourseId = c.Id AND e.Status IN ('active', 'completed')) as EnrollmentCount,
        c.Tags,
        c.CreatedAt,
        c.UpdatedAt,
        c.InstructorId, -- Added instructor ID to response
        u.FirstName as InstructorFirstName,
        u.LastName as InstructorLastName,
        u.Avatar as InstructorAvatar,
        (SELECT COUNT(*) FROM Lessons l WHERE l.CourseId = c.Id) as LessonCount,
        c.MaxEnrollment,
        c.EnrollmentOpenDate,
        c.EnrollmentCloseDate,
        c.RequiresApproval
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
      Level: course.Level?.toLowerCase(), // Normalize level to lowercase
      Tags: course.Tags ? JSON.parse(course.Tags) : [],
      RequiresApproval: Boolean(course.RequiresApproval), // Convert BIT to boolean
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
router.get('/:id', optionalAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;

    const query = `
      SELECT 
        c.*,
        u.FirstName as InstructorFirstName,
        u.LastName as InstructorLastName,
        u.Avatar as InstructorAvatar,
        u.Email as InstructorEmail,
        (SELECT COUNT(*) FROM Enrollments e WHERE e.CourseId = c.Id AND e.Status IN ('active', 'completed')) as ActiveEnrollmentCount,
        (SELECT COUNT(DISTINCT e2.UserId) 
         FROM Enrollments e2 
         INNER JOIN Courses c2 ON e2.CourseId = c2.Id 
         WHERE c2.InstructorId = c.InstructorId AND e2.Status IN ('active', 'completed')) as InstructorStudentCount
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      WHERE c.Id = @id AND (
        (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
        OR (c.InstructorId = @userId AND (c.Status IS NULL OR c.Status != 'deleted'))
      )
    `;
    // Note: Unlisted courses are accessible via direct link (no Visibility filter here)
    // Only the catalog listing filters by Visibility = 'public'
    // Instructors can view their own courses regardless of status (draft, published, etc.)

    const result = await db.query(query, { id, userId });

    if (result.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result[0];
    
    console.log('Course enrollment data:', {
      CourseId: course.Id,
      ActiveEnrollmentCount: course.ActiveEnrollmentCount,
      InstructorStudentCount: course.InstructorStudentCount,
      StaticEnrollmentCount: course.EnrollmentCount
    });

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
      Level: course.Level?.toLowerCase(), // Normalize level to lowercase
      EnrollmentCount: course.ActiveEnrollmentCount || 0, // Use computed count
      Prerequisites: course.Prerequisites ? JSON.parse(course.Prerequisites) : [],
      LearningOutcomes: course.LearningOutcomes ? JSON.parse(course.LearningOutcomes) : [],
      Tags: course.Tags ? JSON.parse(course.Tags) : [],
      // Enrollment Controls (Phase 2)
      MaxEnrollment: course.MaxEnrollment,
      EnrollmentOpenDate: course.EnrollmentOpenDate,
      EnrollmentCloseDate: course.EnrollmentCloseDate,
      RequiresApproval: Boolean(course.RequiresApproval), // Convert BIT to boolean
      // Certificate Settings (Phase 3)
      CertificateEnabled: course.CertificateEnabled !== undefined ? Boolean(course.CertificateEnabled) : true,
      Instructor: {
        Id: course.InstructorId,
        FirstName: course.InstructorFirstName,
        LastName: course.InstructorLastName,
        Avatar: course.InstructorAvatar,
        Email: course.InstructorEmail
      },
      Lessons: lessons
    };

    // Remove temporary and instructor fields from main course object
    delete courseData.ActiveEnrollmentCount;
    delete courseData.InstructorFirstName;
    delete courseData.InstructorLastName;
    delete courseData.InstructorAvatar;
    delete courseData.InstructorEmail;
    // Strip internal fields from public response (security)
    delete courseData.PreviewToken;
    delete courseData.InstructorId;
    delete courseData.PasswordHash;
    delete courseData.IsPublished;
    delete courseData.Visibility;

    res.json(courseData);

  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Preview a course by preview token (no auth required, works for any status)
router.get('/:id/preview/:token', async (req: any, res: any) => {
  try {
    const { id, token } = req.params;

    // Validate UUID format to prevent SQL conversion errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return res.status(404).json({ error: 'Course not found or invalid preview link' });
    }

    const query = `
      SELECT 
        c.*,
        u.FirstName as InstructorFirstName,
        u.LastName as InstructorLastName,
        u.Avatar as InstructorAvatar,
        u.Email as InstructorEmail,
        (SELECT COUNT(*) FROM Enrollments e WHERE e.CourseId = c.Id AND e.Status IN ('active', 'completed')) as ActiveEnrollmentCount
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      WHERE c.Id = @id AND c.PreviewToken = @token
        AND (c.Status IS NULL OR c.Status != 'deleted')
    `;

    const result = await db.query(query, { id, token });

    if (result.length === 0) {
      return res.status(404).json({ error: 'Course not found or invalid preview link' });
    }

    const course = result[0];

    // Get lessons for this course
    const lessons = await db.query(`
      SELECT Id, Title, Description, OrderIndex, Duration, IsRequired
      FROM Lessons
      WHERE CourseId = @courseId
      ORDER BY OrderIndex
    `, { courseId: id });

    const courseData = {
      ...course,
      Level: course.Level?.toLowerCase(),
      EnrollmentCount: course.ActiveEnrollmentCount || 0,
      Prerequisites: course.Prerequisites ? JSON.parse(course.Prerequisites) : [],
      LearningOutcomes: course.LearningOutcomes ? JSON.parse(course.LearningOutcomes) : [],
      Tags: course.Tags ? JSON.parse(course.Tags) : [],
      MaxEnrollment: course.MaxEnrollment,
      EnrollmentOpenDate: course.EnrollmentOpenDate,
      EnrollmentCloseDate: course.EnrollmentCloseDate,
      RequiresApproval: Boolean(course.RequiresApproval),
      CertificateEnabled: course.CertificateEnabled !== undefined ? Boolean(course.CertificateEnabled) : true,
      IsPreview: true,
      Status: course.Status,
      Instructor: {
        Id: course.InstructorId,
        FirstName: course.InstructorFirstName,
        LastName: course.InstructorLastName,
        Avatar: course.InstructorAvatar,
        Email: course.InstructorEmail
      },
      Lessons: lessons
    };

    // Cleanup temp fields
    delete courseData.ActiveEnrollmentCount;
    delete courseData.InstructorFirstName;
    delete courseData.InstructorLastName;
    delete courseData.InstructorAvatar;
    delete courseData.InstructorEmail;
    // Strip internal fields from preview response (security)
    delete courseData.PreviewToken;
    delete courseData.InstructorId;
    delete courseData.PasswordHash;
    delete courseData.IsPublished;
    delete courseData.Visibility;

    res.json(courseData);
  } catch (error) {
    console.error('Error fetching course preview:', error);
    res.status(500).json({ error: 'Failed to fetch course preview' });
  }
});

// Get enrollment status for authenticated user
router.get('/:id/enrollment', authenticateToken, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // Changed from req.user.id to req.user.userId

    const query = `
      SELECT Id, Status, EnrolledAt, CompletedAt
      FROM Enrollments
      WHERE UserId = @userId AND CourseId = @courseId
    `;

    const result = await db.query(query, { userId, courseId: id });

    if (result.length === 0) {
      return res.json({ isEnrolled: false });
    }

    const enrollment = result[0];
    const response = {
      isEnrolled: true,
      status: enrollment.Status,
      enrolledAt: enrollment.EnrolledAt,
      completedAt: enrollment.CompletedAt
    };
    
    res.json(response);

  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
});

// Check if user can enroll (prerequisites validation)
router.get('/:id/check-prerequisites', authenticateToken, async (req: any, res: any) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user.userId;

    // Get course prerequisites
    const courseResult = await db.query(`
      SELECT Prerequisites FROM Courses WHERE Id = @courseId
    `, { courseId });

    if (courseResult.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult[0];
    
    // If no prerequisites, user can enroll
    if (!course.Prerequisites) {
      return res.json({
        canEnroll: true,
        missingPrerequisites: []
      });
    }

    try {
      const prerequisites = JSON.parse(course.Prerequisites);
      
      if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
        return res.json({
          canEnroll: true,
          missingPrerequisites: []
        });
      }

      // Check completion status for each prerequisite
      const prerequisiteCheck = await db.query(`
        SELECT 
          c.Id,
          c.Title,
          c.Thumbnail,
          cp.OverallProgress,
          CASE 
            WHEN cp.CompletedAt IS NOT NULL THEN 1
            ELSE 0
          END as IsCompleted
        FROM Courses c
        LEFT JOIN CourseProgress cp ON c.Id = cp.CourseId AND cp.UserId = @userId
        WHERE c.Id IN (${prerequisites.map((_, i) => `@prereq${i}`).join(', ')})
          AND (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
      `, prerequisites.reduce((acc: any, prereqId: string, i: number) => {
        acc[`prereq${i}`] = prereqId;
        return acc;
      }, { userId }));

      // Only return courses that exist and are published (deleted courses are ignored)
      const allPrerequisites = prerequisiteCheck.map((p: any) => ({
        id: p.Id,
        title: p.Title,
        thumbnail: p.Thumbnail,
        progress: p.OverallProgress || 0,
        isCompleted: !!p.IsCompleted
      }));

      const missingPrerequisites = allPrerequisites.filter((p: any) => !p.isCompleted);

      return res.json({
        canEnroll: missingPrerequisites.length === 0,
        prerequisites: allPrerequisites,
        missingPrerequisites: missingPrerequisites.map(p => ({ id: p.id, title: p.title }))
      });

    } catch (parseError) {
      console.error('Failed to parse prerequisites:', parseError);
      return res.json({
        canEnroll: true,
        missingPrerequisites: []
      });
    }

  } catch (error) {
    console.error('Error checking prerequisites:', error);
    res.status(500).json({ error: 'Failed to check prerequisites' });
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
      INNER JOIN Users u ON c.InstructorId = u.Id
      LEFT JOIN (
        SELECT 
          CourseId,
          COUNT(*) as EnrollmentCount
        FROM Enrollments 
        WHERE Status IN ('active', 'completed')
        GROUP BY CourseId
      ) e ON c.Id = e.CourseId
      WHERE (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
        AND ISNULL(c.Visibility, 'public') = 'public'
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
      INNER JOIN Users u ON c.InstructorId = u.Id
      LEFT JOIN (
        SELECT 
          CourseId,
          COUNT(*) as EnrollmentCount
        FROM Enrollments 
        WHERE Status IN ('active', 'completed')
        GROUP BY CourseId
      ) e ON c.Id = e.CourseId
      WHERE (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
        AND ISNULL(c.Visibility, 'public') = 'public'
      GROUP BY c.Level
      ORDER BY Count DESC
    `;

    const result = await db.query(query);
    
    // Normalize level to lowercase
    const normalizedResult = result.map((level: any) => ({
      ...level,
      Level: level.Level?.toLowerCase()
    }));
    
    console.log('Levels API response:', JSON.stringify(normalizedResult, null, 2));

    res.json(normalizedResult);

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
        ISNULL((SELECT COUNT(DISTINCT UserId) FROM Enrollments WHERE Status IN ('active', 'completed')), 0) as TotalStudents,
        COUNT(DISTINCT c.Category) as TotalCategories
      FROM Courses c
      INNER JOIN Users u ON c.InstructorId = u.Id
      WHERE (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
        AND ISNULL(c.Visibility, 'public') = 'public'
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