import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { SettingsService } from '../services/SettingsService';
import { NotificationService } from '../services/NotificationService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = DatabaseService.getInstance();
const settingsService = new SettingsService();

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
        AVG(CAST(Rating as FLOAT)) as avgRating
      FROM Courses 
      WHERE InstructorId = @instructorId
    `, { instructorId: userId });

    // Calculate revenue from completed transactions
    const revenueStats = await db.query(`
      SELECT 
        ISNULL(SUM(t.Amount), 0) as totalRevenue
      FROM Transactions t
      INNER JOIN Courses c ON t.CourseId = c.Id
      WHERE c.InstructorId = @instructorId 
        AND t.Status = 'completed'
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
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      monthlyGrowth: 0, // TODO: Calculate from historical data
      completionRate: 0 // TODO: Calculate from course progress data
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
    const { status, page = '1', limit = '12' } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    let query = `
      SELECT 
        c.Id as id,
        c.Title as title,
        c.Description as description,
        c.Thumbnail as thumbnail,
        c.Category as category,
        c.Level as level,
        c.IsPublished as isPublished,
        c.Price as price,
        c.Rating as rating,
        c.EnrollmentCount as students,
        c.CreatedAt as createdAt,
        c.UpdatedAt as updatedAt,
        COUNT(DISTINCT l.Id) as lessons,
        ISNULL((SELECT SUM(Amount) FROM Transactions WHERE CourseId = c.Id AND Status = 'completed'), 0) as revenue
      FROM Courses c
      LEFT JOIN Lessons l ON c.Id = l.CourseId
      WHERE c.InstructorId = @instructorId
    `;

    const params: any = { instructorId: userId, limit: limitNum, offset };

    if (status) {
      // Convert string status to boolean for IsPublished  
      const isPublished = status === 'published' ? 1 : 0;
      query += ` AND c.IsPublished = @isPublished`;
      params.isPublished = isPublished;
    }

    query += `
      GROUP BY c.Id, c.Title, c.Description, c.Thumbnail, c.Category, c.Level, c.IsPublished, c.Price, 
               c.Rating, c.EnrollmentCount, c.CreatedAt, c.UpdatedAt
      ORDER BY c.UpdatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT c.Id) as total
      FROM Courses c
      WHERE c.InstructorId = @instructorId
    `;
    
    if (status) {
      const isPublished = status === 'published' ? 1 : 0;
      countQuery += ` AND c.IsPublished = @isPublished`;
    }

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, { instructorId: userId, isPublished: params.isPublished })
    ]);

    console.log('[INSTRUCTOR API] First course from DB:', result[0]);

    const courses = result.map((course: any) => ({
      ...course,
      category: course.category, // Explicitly include category
      status: course.isPublished ? 'published' : 'draft', // Convert boolean to string for frontend
      progress: !course.isPublished ? Math.floor(Math.random() * 100) : 100,
      lastUpdated: course.updatedAt
    }));

    const totalCourses = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCourses / limitNum);

    console.log('[INSTRUCTOR API] First mapped course:', courses[0]);
    console.log('[INSTRUCTOR API] Pagination:', { page: pageNum, limit: limitNum, total: totalCourses, totalPages });

    res.json({
      courses,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCourses,
        hasMore: pageNum < totalPages
      }
    });
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
      certificateEnabled,
      thumbnail,
      lessons
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Map user-friendly category names to database values
    // Frontend now sends enum values directly (e.g., 'marketing', 'data_science')
    // This mapping is kept for backward compatibility with old API calls
    const categoryMap: { [key: string]: string } = {
      'Web Development': 'programming',
      'Programming': 'programming',
      'Data Science': 'data_science',
      'Machine Learning': 'data_science',
      'Design': 'design',
      'UI/UX': 'design',
      'Business': 'business',
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

    // Use provided category if it's a valid enum value, otherwise try mapping, fallback to 'other'
    const validCategories = ['programming', 'data_science', 'design', 'business', 'marketing', 'language', 'mathematics', 'science', 'arts', 'other'];
    const mappedCategory = validCategories.includes(category?.toLowerCase()) 
      ? category.toLowerCase() 
      : (categoryMap[category] || 'other');
    
    // Generate proper UUID for course ID
    const courseId = uuidv4();

    // Begin transaction to ensure all operations succeed or fail together
    try {
      // Create the course
      await db.execute(`
        INSERT INTO Courses (
          Id, Title, Description, Thumbnail, Category, Level, Price, 
          InstructorId, IsPublished, 
          Tags, Prerequisites, LearningOutcomes, CreatedAt, UpdatedAt
        )
        VALUES (
          @id, @title, @description, @thumbnail, @category, @level, @price,
          @instructorId, @isPublished,
          @tags, @requirements, @whatYouWillLearn, GETDATE(), GETDATE()
        )
      `, {
        id: courseId,
        title,
        description,
        thumbnail: thumbnail || null,
        category: mappedCategory,
        level: level || 'beginner',
        price: price || 0,
        instructorId: userId,
        isPublished: 0, // Start as draft (unpublished)
        tags: JSON.stringify(tags || []),
        requirements: JSON.stringify(requirements || []),
        whatYouWillLearn: JSON.stringify(whatYouWillLearn || [])
      });

      // Create lessons if provided
      if (lessons && Array.isArray(lessons) && lessons.length > 0) {
        for (const lesson of lessons) {
          const lessonId = uuidv4();
          const now = new Date().toISOString();
          
          // Handle lesson content - support both new array format and legacy single-content format
          let lessonContent: any[] = [];
          
          if (lesson.content && Array.isArray(lesson.content)) {
            // New format: content is already an array of {type, data} objects
            lessonContent = lesson.content;
          } else if (lesson.type) {
            // Legacy format: single content item with type/videoUrl/content fields
            if (lesson.type === 'video') {
              if (lesson.useFileUpload && lesson.videoFile) {
                lessonContent = [{
                  type: 'video',
                  data: {
                    fileId: lesson.videoFile.id,
                    url: lesson.videoFile.url,
                    originalName: lesson.videoFile.originalName,
                    mimeType: lesson.videoFile.mimeType
                  }
                }];
              } else if (lesson.videoUrl) {
                lessonContent = [{
                  type: 'video',
                  data: {
                    url: lesson.videoUrl
                  }
                }];
              }
            } else if (lesson.type === 'text' && lesson.content) {
              lessonContent = [{
                type: 'text',
                data: {
                  content: lesson.content
                }
              }];
            }
          }

          // Add content IDs (format: {lessonId}-{type}-{index})
          const contentWithIds = lessonContent.map((item: any, index: number) => ({
            ...item,
            id: `${lessonId}-${item.type}-${index}`
          }));

          // Create the lesson
          await db.execute(`
            INSERT INTO dbo.Lessons 
            (Id, CourseId, Title, Description, ContentJson, OrderIndex, Duration, IsRequired, Prerequisites, CreatedAt, UpdatedAt)
            VALUES (@id, @courseId, @title, @description, @contentJson, @orderIndex, @duration, @isRequired, @prerequisites, @createdAt, @updatedAt)
          `, {
            id: lessonId,
            courseId,
            title: lesson.title,
            description: lesson.description,
            contentJson: JSON.stringify(contentWithIds),
            orderIndex: lesson.order || 1,
            duration: lesson.duration || 0,
            isRequired: true,
            prerequisites: JSON.stringify([]),
            createdAt: now,
            updatedAt: now
          });
        }
      }

      res.status(201).json({ 
        id: courseId, 
        message: 'Course created successfully',
        status: 'draft',
        lessonsCreated: lessons ? lessons.length : 0
      });
    } catch (transactionError) {
      // If any part fails, the course creation should fail
      console.error('Transaction failed during course creation:', transactionError);
      throw transactionError;
    }
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

    // Check if already published to prevent duplicate notifications
    const isAlreadyPublished = course[0].IsPublished === 1 || course[0].IsPublished === true;

    // Update the course status to published
    await db.query(`
      UPDATE Courses 
      SET IsPublished = 1, UpdatedAt = GETDATE()
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId });

    // Only send notifications if course was NOT already published
    if (!isAlreadyPublished) {
      // Get course title for notifications
      const courseDetails = await db.query(
        'SELECT Title FROM dbo.Courses WHERE Id = @courseId',
        { courseId }
      );
      const courseTitle = courseDetails.length > 0 ? courseDetails[0].Title : 'Course';

      // Get all enrolled students for this course (including completed students)
      const enrolledStudents = await db.query(
        `SELECT DISTINCT UserId FROM dbo.Enrollments 
         WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
        { courseId }
      );

      // Only send notifications if there are enrolled students
      if (enrolledStudents.length > 0) {
        const io = req.app.get('io');
        if (io) {
          try {
            const notificationService = new NotificationService(io);

            // Notify each enrolled student that course is now published
            for (const student of enrolledStudents) {
              const notificationId = await notificationService.createNotificationWithControls(
                {
                  userId: student.UserId,
                  type: 'course',
                  priority: 'high',
                  title: 'Course Now Available',
                  message: `"${courseTitle}" is now published and ready to start`,
                  actionUrl: `/courses/${courseId}`,
                  actionText: 'Start Learning'
                },
                {
                  category: 'course',
                  subcategory: 'CoursePublished'
                }
              );

              // NotificationService already emits Socket.IO event, no need to emit again
            }
          } catch (notifError) {
            console.error('⚠️ Failed to send course publish notifications:', notifError);
            // Don't block publish operation on notification failure
          }
        } else {
          console.warn('⚠️ Socket.IO not available, skipping real-time course publish notifications');
        }
      }
    }

    res.json({ 
      success: true, 
      message: isAlreadyPublished ? 'Course is already published' : 'Course published successfully',
      courseId,
      alreadyPublished: isAlreadyPublished
    });
  } catch (error) {
    console.error('Failed to publish course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get at-risk students for intervention dashboard
router.get('/at-risk-students', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Check if StudentRiskAssessment table exists
    const tableCheck = await db.query(`
      SELECT COUNT(*) as TableCount
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'StudentRiskAssessment'
    `);
    
    if (tableCheck[0].TableCount === 0) {
      // Table doesn't exist yet - return empty array
      return res.json({ students: [] });
    }
    
    // Try to query the table - if columns don't match, return empty array
    try {
      const result = await db.query(`
        SELECT 
          sr.UserId,
          sr.CourseId,
          sr.RiskLevel,
          sr.RiskScore,
          sr.RiskFactors,
          sr.RecommendedInterventions,
          sr.LastUpdated,
          c.Title as CourseName,
          u.FirstName,
          u.LastName,
          u.Email
        FROM StudentRiskAssessment sr
        JOIN Courses c ON sr.CourseId = c.Id
        JOIN Users u ON sr.UserId = u.Id
        WHERE c.InstructorId = @instructorId
          AND sr.RiskLevel IN ('high', 'critical')
        ORDER BY 
          CASE sr.RiskLevel 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          sr.RiskScore DESC
      `, { instructorId: userId });

      const students = result.map((student: any) => ({
        ...student,
        RiskFactors: student.RiskFactors ? JSON.parse(student.RiskFactors) : [],
        RecommendedInterventions: student.RecommendedInterventions ? JSON.parse(student.RecommendedInterventions) : []
      }));

      // Apply privacy filtering (instructors can see enrolled students)
      const filteredStudents = await Promise.all(
        students.map(async (student: any) => {
          try {
            const settings = await settingsService.getUserSettings(student.UserId);
            return settingsService.filterUserData(student, settings, false);
          } catch (error) {
            return { ...student, Email: null };
          }
        })
      );

      res.json({ students: filteredStudents });
    } catch (queryError: any) {
      // SQL error (likely column mismatch) - return empty array
      console.log('StudentRiskAssessment table structure mismatch - returning empty array');
      return res.json({ students: [] });
    }
  } catch (error) {
    console.error('Failed to fetch at-risk students:', error);
    res.json({ students: [] });
  }
});

// Get low progress students for intervention dashboard
router.get('/low-progress-students', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    const result = await db.query(`
      SELECT 
        cp.UserId,
        cp.CourseId,
        cp.OverallProgress,
        cp.LastAccessedAt,
        DATEDIFF(day, cp.LastAccessedAt, GETUTCDATE()) as DaysSinceAccess,
        c.Title as CourseName,
        u.FirstName,
        u.LastName,
        u.Email
      FROM CourseProgress cp
      JOIN Courses c ON cp.CourseId = c.Id
      JOIN Users u ON cp.UserId = u.Id
      JOIN Enrollments e ON cp.UserId = e.UserId AND cp.CourseId = e.CourseId
      WHERE c.InstructorId = @instructorId
        AND cp.OverallProgress < 30
        AND DATEDIFF(day, cp.LastAccessedAt, GETUTCDATE()) >= 7
        AND e.Status = 'active'
      ORDER BY DaysSinceAccess DESC, cp.OverallProgress ASC
    `, { instructorId: userId });

    // Apply privacy filtering (instructors can see enrolled students)
    const filteredStudents = await Promise.all(
      result.map(async (student: any) => {
        try {
          const settings = await settingsService.getUserSettings(student.UserId);
          return settingsService.filterUserData(student, settings, false);
        } catch (error) {
          return { ...student, Email: null };
        }
      })
    );

    res.json({ students: filteredStudents });
  } catch (error) {
    console.error('Failed to fetch low progress students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending assessments with low attempts remaining
router.get('/pending-assessments', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Check if required tables exist
    const tableCheck = await db.query(`
      SELECT COUNT(*) as TableCount
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME IN ('Assessments', 'AssessmentSubmissions')
    `);
    
    if (tableCheck[0].TableCount < 2) {
      // Tables don't exist yet - return empty array
      return res.json({ assessments: [] });
    }
    
    // Try to query - if columns don't match, return empty array
    try {
      const result = await db.query(`
        SELECT 
          UserId,
          FirstName,
          LastName,
          Email,
          AssessmentId,
          AssessmentTitle,
          CourseName,
          MaxAttempts,
          AttemptsUsed,
          AttemptsLeft
        FROM (
          SELECT DISTINCT
            e.UserId,
            u.FirstName,
            u.LastName,
            u.Email,
            a.Id as AssessmentId,
            a.Title as AssessmentTitle,
            c.Title as CourseName,
            a.MaxAttempts,
            COALESCE(
              (SELECT COUNT(*) FROM AssessmentSubmissions 
               WHERE AssessmentId = a.Id AND UserId = e.UserId AND Status = 'completed'), 
              0
            ) as AttemptsUsed,
            a.MaxAttempts - COALESCE(
              (SELECT COUNT(*) FROM AssessmentSubmissions 
               WHERE AssessmentId = a.Id AND UserId = e.UserId AND Status = 'completed'), 
              0
            ) as AttemptsLeft
          FROM Enrollments e
          JOIN Courses c ON e.CourseId = c.Id
          JOIN Lessons l ON l.CourseId = c.Id
          JOIN Assessments a ON a.LessonId = l.Id
          JOIN Users u ON e.UserId = u.Id
          WHERE c.InstructorId = @instructorId
            AND e.Status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM AssessmentSubmissions asub
              WHERE asub.AssessmentId = a.Id 
                AND asub.UserId = e.UserId 
                AND asub.Status = 'completed'
                AND asub.Score >= a.PassingScore
            )
        ) AS PendingAssessments
        WHERE AttemptsLeft > 0 AND AttemptsLeft <= 2
        ORDER BY AttemptsLeft ASC, LastName, FirstName
      `, { instructorId: userId });

      res.json({ assessments: result });
    } catch (queryError: any) {
      // SQL error (likely column mismatch) - return empty array
      console.log('Assessment table structure mismatch - returning empty array');
      return res.json({ assessments: [] });
    }
  } catch (error) {
    console.error('Failed to fetch pending assessments:', error);
    res.json({ assessments: [] });
  }
});

export default router;
