import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = DatabaseService.getInstance();

// Get instructor dashboard stats
router.get('/stats', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Get instructor courses stats
    const courseStats = await db.query(`
      SELECT 
        COUNT(*) as totalCourses,
        SUM(CASE WHEN IsPublished = 1 THEN 1 ELSE 0 END) as publishedCourses,
        SUM(CASE WHEN IsPublished = 0 THEN 1 ELSE 0 END) as draftCourses,
        AVG(CAST(Rating as FLOAT)) as avgRating,
        SUM(Price * EnrollmentCount) as totalRevenue
      FROM Courses 
      WHERE InstructorId = @instructorId
    `, { instructorId: userId });

    // Get total students enrolled
    const studentStats = await db.query(`
      SELECT 
        COUNT(DISTINCT e.UserId) as totalStudents,
        COUNT(*) as totalEnrollments
      FROM Enrollments e
      INNER JOIN Courses c ON e.CourseId = c.Id
      WHERE c.InstructorId = @instructorId
    `, { instructorId: userId });

    const stats = {
      totalCourses: courseStats[0]?.totalCourses || 0,
      publishedCourses: courseStats[0]?.publishedCourses || 0,
      draftCourses: courseStats[0]?.draftCourses || 0,
      totalStudents: studentStats[0]?.totalStudents || 0,
      totalEnrollments: studentStats[0]?.totalEnrollments || 0,
      avgRating: courseStats[0]?.avgRating || 0,
      totalRevenue: courseStats[0]?.totalRevenue || 0,
      monthlyGrowth: 12.5,
      completionRate: 78
    };

    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch instructor stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get instructor's courses
router.get('/courses', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;
    
    let query = `
      SELECT 
        c.Id as id,
        c.Title as title,
        c.Description as description,
        c.Thumbnail as thumbnail,
        c.IsPublished as isPublished,
        c.Price as price,
        c.Rating as rating,
        c.EnrollmentCount as students,
        c.CreatedAt as createdAt,
        c.UpdatedAt as updatedAt,
        COUNT(l.Id) as lessons,
        CASE 
          WHEN c.IsPublished = 1 THEN c.Price * c.EnrollmentCount
          ELSE 0
        END as revenue
      FROM Courses c
      LEFT JOIN Lessons l ON c.Id = l.CourseId
      WHERE c.InstructorId = @instructorId
    `;

    const params: any = { instructorId: userId };

    if (status) {
      // Convert string status to boolean for IsPublished  
      const isPublished = status === 'published' ? 1 : 0;
      query += ` AND c.IsPublished = @isPublished`;
      params.isPublished = isPublished;
    }

    query += `
      GROUP BY c.Id, c.Title, c.Description, c.Thumbnail, c.IsPublished, c.Price, 
               c.Rating, c.EnrollmentCount, c.CreatedAt, c.UpdatedAt
      ORDER BY c.UpdatedAt DESC
    `;

    const result = await db.query(query, params);

    const courses = result.map((course: any) => ({
      ...course,
      status: course.isPublished ? 'published' : 'draft', // Convert boolean to string for frontend
      progress: !course.isPublished ? Math.floor(Math.random() * 100) : 100,
      lastUpdated: course.updatedAt
    }));

    res.json(courses);
  } catch (error) {
    console.error('Failed to fetch instructor courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new course
router.post('/courses', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const {
      title,
      subtitle,
      description,
      category,
      level,
      language,
      price,
      tags,
      requirements,
      whatYouWillLearn,
      isPublic,
      allowComments,
      certificateEnabled
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Map user-friendly category names to database values
    const categoryMap: { [key: string]: string } = {
      'Web Development': 'programming',
      'Programming': 'programming',
      'Data Science': 'data_science',
      'Machine Learning': 'data_science',
      'Design': 'design',
      'UI/UX': 'design',
      'Business': 'business',
      'Marketing': 'business',
      'Language': 'language',
      'English': 'language',
      'Mathematics': 'mathematics',
      'Math': 'mathematics',
      'Science': 'science',
      'Physics': 'science',
      'Chemistry': 'science',
      'Arts': 'arts',
      'Music': 'arts',
      'Drawing': 'arts',
      'Other': 'other'
    };

    // Map category or use 'other' as fallback
    const mappedCategory = categoryMap[category] || 'other';
    
    // Generate proper UUID for course ID
    const courseId = uuidv4();

    await db.query(`
      INSERT INTO Courses (
        Id, Title, Description, Category, Level, Price, 
        InstructorId, IsPublished, 
        Tags, Prerequisites, LearningOutcomes, CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @title, @description, @category, @level, @price,
        @instructorId, @isPublished,
        @tags, @requirements, @whatYouWillLearn, GETDATE(), GETDATE()
      )
    `, {
      id: courseId,
      title,
      description,
      category: mappedCategory,
      level: level || 'beginner',
      price: price || 0,
      instructorId: userId,
      isPublished: 0, // Start as draft (unpublished)
      tags: JSON.stringify(tags || []),
      requirements: JSON.stringify(requirements || []),
      whatYouWillLearn: JSON.stringify(whatYouWillLearn || [])
    });

    res.status(201).json({ 
      id: courseId, 
      message: 'Course created successfully',
      status: 'draft' // Return string status for frontend compatibility
    });
  } catch (error) {
    console.error('Failed to create course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish course (update status from draft to published)
router.post('/courses/:id/publish', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.params.id;

    // Verify the course exists and belongs to this instructor
    const course = await db.query(`
      SELECT Id, IsPublished FROM Courses 
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId });

    if (!course || course.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update the course status to published
    await db.query(`
      UPDATE Courses 
      SET IsPublished = 1, UpdatedAt = GETDATE()
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId });

    res.json({ 
      success: true, 
      message: 'Course published successfully',
      courseId
    });
  } catch (error) {
    console.error('Failed to publish course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;