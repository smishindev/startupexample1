import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { SettingsService } from '../services/SettingsService';
import { NotificationService } from '../services/NotificationService';
import { triggerAtRiskDetection } from '../services/NotificationScheduler';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const db = DatabaseService.getInstance();
const settingsService = new SettingsService();

// Get instructor dashboard stats
router.get('/stats', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Get instructor courses stats (exclude deleted courses)
    const courseStats = await db.query(`
      SELECT 
        COUNT(*) as totalCourses,
        SUM(CASE WHEN Status = 'published' OR (Status IS NULL AND IsPublished = 1) THEN 1 ELSE 0 END) as publishedCourses,
        SUM(CASE WHEN Status = 'draft' OR (Status IS NULL AND IsPublished = 0) THEN 1 ELSE 0 END) as draftCourses,
        SUM(CASE WHEN Status = 'archived' THEN 1 ELSE 0 END) as archivedCourses,
        AVG(CAST(Rating as FLOAT)) as avgRating
      FROM Courses 
      WHERE InstructorId = @instructorId
        AND (Status IS NULL OR Status != 'deleted')
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
        c.Status as status,
        c.IsPublished as isPublished,
        c.Price as price,
        c.Rating as rating,
        c.EnrollmentCount as students,
        c.CreatedAt as createdAt,
        c.UpdatedAt as updatedAt,
        c.Prerequisites as prerequisites,
        c.LearningOutcomes as learningOutcomes,
        c.MaxEnrollment as maxEnrollment,
        c.EnrollmentOpenDate as enrollmentOpenDate,
        c.EnrollmentCloseDate as enrollmentCloseDate,
        c.RequiresApproval as requiresApproval,
        c.CertificateEnabled as certificateEnabled,
        c.CertificateTitle as certificateTitle,
        c.CertificateTemplate as certificateTemplate,
        c.Visibility as visibility,
        c.PreviewToken as previewToken,
        COUNT(DISTINCT l.Id) as lessons,
        ISNULL((SELECT SUM(Amount) FROM Transactions WHERE CourseId = c.Id AND Status = 'completed'), 0) as revenue
      FROM Courses c
      LEFT JOIN Lessons l ON c.Id = l.CourseId
      WHERE c.InstructorId = @instructorId
        AND (c.Status IS NULL OR c.Status != 'deleted')
    `;

    const params: any = { instructorId: userId, limit: limitNum, offset };

    if (status) {
      // Support both old IsPublished and new Status field
      if (status === 'published' || status === 'draft') {
        query += ` AND (c.Status = @status OR (c.Status IS NULL AND c.IsPublished = @isPublished))`;
        params.status = status;
        params.isPublished = status === 'published' ? 1 : 0;
      } else if (status === 'archived') {
        query += ` AND c.Status = 'archived'`;
      }
    }

    query += `
      GROUP BY c.Id, c.Title, c.Description, c.Thumbnail, c.Category, c.Level, c.Status, c.IsPublished, c.Price, 
               c.Rating, c.EnrollmentCount, c.CreatedAt, c.UpdatedAt, c.Prerequisites, c.LearningOutcomes,
               c.MaxEnrollment, c.EnrollmentOpenDate, c.EnrollmentCloseDate, c.RequiresApproval,
               c.CertificateEnabled, c.CertificateTitle, c.CertificateTemplate,
               c.Visibility, c.PreviewToken
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
      if (status === 'published' || status === 'draft') {
        countQuery += ` AND (c.Status = @status OR (c.Status IS NULL AND c.IsPublished = @isPublished))`;
      } else if (status === 'archived') {
        countQuery += ` AND c.Status = 'archived'`;
      }
    }

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, { instructorId: userId, ...params })
    ]);

    console.log('[INSTRUCTOR API] First course from DB:', result[0]);

    const courses = result.map((course: any) => {
      // Normalize level to lowercase (must be done AFTER spreading to override capital Level)
      const normalizedLevel = course.level?.toLowerCase() || course.Level?.toLowerCase() || 'beginner';
      
      // Use Status field if available, otherwise convert IsPublished to status
      let courseStatus = course.status;
      if (!courseStatus) {
        courseStatus = course.isPublished ? 'published' : 'draft';
      }
      
      // Parse JSON fields
      let prerequisites: string[] = [];
      let learningOutcomes: string[] = [];
      
      try {
        if (course.prerequisites) {
          prerequisites = JSON.parse(course.prerequisites);
        }
      } catch (e) {
        console.error('Failed to parse prerequisites:', e);
      }
      
      try {
        if (course.learningOutcomes) {
          learningOutcomes = JSON.parse(course.learningOutcomes);
        }
      } catch (e) {
        console.error('Failed to parse learningOutcomes:', e);
      }
      
      const mappedCourse = {
        ...course,
        category: course.category,
        level: normalizedLevel,
        status: courseStatus,
        progress: courseStatus === 'draft' ? Math.floor(Math.random() * 100) : 100,
        lastUpdated: course.updatedAt,
        prerequisites,
        learningOutcomes,
        // Enrollment controls: use null coalescing, don't fall back on 0/false
        maxEnrollment: course.maxEnrollment ?? null,
        enrollmentOpenDate: course.enrollmentOpenDate ?? null,
        enrollmentCloseDate: course.enrollmentCloseDate ?? null,
        requiresApproval: Boolean(course.requiresApproval), // BIT returns 0/1, convert to boolean
        // Certificate Settings (Phase 3)
        certificateEnabled: course.certificateEnabled !== undefined ? Boolean(course.certificateEnabled) : true,
        certificateTitle: course.certificateTitle ?? null,
        certificateTemplate: course.certificateTemplate || 'classic',
        // Advanced Visibility (Phase 4)
        visibility: course.visibility || 'public',
        previewToken: course.previewToken || null
      };
      // Remove unnecessary properties
      delete mappedCourse.Level;
      delete mappedCourse.MaxEnrollment;
      delete mappedCourse.EnrollmentOpenDate;
      delete mappedCourse.EnrollmentCloseDate;
      delete mappedCourse.RequiresApproval;
      delete mappedCourse.CertificateEnabled;
      delete mappedCourse.CertificateTitle;
      delete mappedCourse.CertificateTemplate;
      return mappedCourse;
    });

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
    
    // Validate level
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const validatedLevel = validLevels.includes(level?.toLowerCase()) ? level.toLowerCase() : 'beginner';
    
    // Generate proper UUID for course ID
    const courseId = uuidv4();

    // Begin transaction to ensure all operations succeed or fail together
    try {
      // Create the course
      await db.execute(`
        INSERT INTO Courses (
          Id, Title, Description, Thumbnail, Category, Level, Price, 
          InstructorId, IsPublished, 
          Tags, Prerequisites, LearningOutcomes,
          MaxEnrollment, EnrollmentOpenDate, EnrollmentCloseDate, RequiresApproval,
          CreatedAt, UpdatedAt
        )
        VALUES (
          @id, @title, @description, @thumbnail, @category, @level, @price,
          @instructorId, @isPublished,
          @tags, @requirements, @whatYouWillLearn,
          @maxEnrollment, @enrollmentOpenDate, @enrollmentCloseDate, @requiresApproval,
          GETDATE(), GETDATE()
        )
      `, {
        id: courseId,
        title,
        description,
        thumbnail: thumbnail || null,
        category: mappedCategory,
        level: validatedLevel,
        price: price || 0,
        instructorId: userId,
        isPublished: 0, // Start as draft (unpublished)
        tags: JSON.stringify(tags || []),
        requirements: JSON.stringify(requirements || []),
        whatYouWillLearn: JSON.stringify(whatYouWillLearn || []),
        maxEnrollment: req.body.maxEnrollment || null,
        enrollmentOpenDate: req.body.enrollmentOpenDate || null,
        enrollmentCloseDate: req.body.enrollmentCloseDate || null,
        requiresApproval: req.body.requiresApproval ? 1 : 0
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

// Update course details
router.put('/courses/:id', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.params.id;
    const {
      title,
      description,
      category,
      level,
      price,
      thumbnail,
      prerequisites,
      learningOutcomes
    } = req.body;

    console.log('📝 [PUT /courses/:id] Request received:', {
      courseId,
      userId,
      bodyKeys: Object.keys(req.body),
      enrollmentControls: {
        maxEnrollment: req.body.maxEnrollment,
        enrollmentOpenDate: req.body.enrollmentOpenDate,
        enrollmentCloseDate: req.body.enrollmentCloseDate,
        requiresApproval: req.body.requiresApproval
      }
    });

    // Verify the course exists and belongs to this instructor
    const course = await db.query(`
      SELECT Id FROM dbo.Courses 
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId });

    if (!course || course.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any = { courseId, instructorId: userId };

    if (title !== undefined) {
      updates.push('Title = @title');
      params.title = title;
    }
    if (description !== undefined) {
      updates.push('Description = @description');
      params.description = description;
    }
    if (category !== undefined) {
      // Map user-friendly category names to database values
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
      
      updates.push('Category = @category');
      params.category = mappedCategory;
    }
    if (level !== undefined) {
      // Validate level
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      const validatedLevel = validLevels.includes(level?.toLowerCase()) ? level.toLowerCase() : 'beginner';
      updates.push('Level = @level');
      params.level = validatedLevel;
    }
    if (price !== undefined) {
      updates.push('Price = @price');
      params.price = price;
    }
    if (thumbnail !== undefined) {
      updates.push('Thumbnail = @thumbnail');
      params.thumbnail = thumbnail;
    }
    if (prerequisites !== undefined) {
      // Validate prerequisites is an array and contains valid UUIDs
      if (!Array.isArray(prerequisites)) {
        return res.status(400).json({ error: 'Prerequisites must be an array' });
      }
      // Store as JSON string
      updates.push('Prerequisites = @prerequisites');
      params.prerequisites = JSON.stringify(prerequisites);
    }
    if (learningOutcomes !== undefined) {
      // Validate learningOutcomes is an array of strings
      if (!Array.isArray(learningOutcomes)) {
        return res.status(400).json({ error: 'Learning outcomes must be an array' });
      }
      // Store as JSON string
      updates.push('LearningOutcomes = @learningOutcomes');
      params.learningOutcomes = JSON.stringify(learningOutcomes);
    }

    // Enrollment Controls (Phase 2) - with validation
    
    // Validate date range if both dates are provided
    if (req.body.enrollmentOpenDate && req.body.enrollmentCloseDate) {
      const openDate = new Date(req.body.enrollmentOpenDate);
      const closeDate = new Date(req.body.enrollmentCloseDate);
      if (openDate >= closeDate) {
        return res.status(400).json({ 
          error: 'Enrollment open date must be before close date',
          code: 'INVALID_DATE_RANGE'
        });
      }
    }
    
    // Validate maxEnrollment against current enrollment count
    if (req.body.maxEnrollment !== undefined) {
      const maxEnrollment = req.body.maxEnrollment;
      if (maxEnrollment !== null && (maxEnrollment < 1 || !Number.isInteger(maxEnrollment))) {
        return res.status(400).json({ error: 'Max enrollment must be null or a positive integer' });
      }
      
      // Check current enrollment count
      if (maxEnrollment !== null) {
        const currentCourse = await db.query(`
          SELECT EnrollmentCount FROM dbo.Courses WHERE Id = @courseId
        `, { courseId });
        
        const currentCount = currentCourse[0]?.EnrollmentCount || 0;
        if (maxEnrollment < currentCount) {
          return res.status(400).json({ 
            error: `Cannot set max enrollment to ${maxEnrollment}. Course already has ${currentCount} enrolled students.`,
            code: 'MAX_ENROLLMENT_TOO_LOW',
            currentEnrollment: currentCount,
            requestedMax: maxEnrollment
          });
        }
      }
      
      updates.push('MaxEnrollment = @maxEnrollment');
      params.maxEnrollment = maxEnrollment;
    }
    if (req.body.enrollmentOpenDate !== undefined) {
      updates.push('EnrollmentOpenDate = @enrollmentOpenDate');
      params.enrollmentOpenDate = req.body.enrollmentOpenDate;
    }
    if (req.body.enrollmentCloseDate !== undefined) {
      updates.push('EnrollmentCloseDate = @enrollmentCloseDate');
      params.enrollmentCloseDate = req.body.enrollmentCloseDate;
    }
    if (req.body.requiresApproval !== undefined) {
      updates.push('RequiresApproval = @requiresApproval');
      params.requiresApproval = req.body.requiresApproval ? 1 : 0;
    }

    // Certificate Settings (Phase 3)
    if (req.body.certificateEnabled !== undefined) {
      updates.push('CertificateEnabled = @certificateEnabled');
      params.certificateEnabled = req.body.certificateEnabled ? 1 : 0;
    }
    if (req.body.certificateTitle !== undefined) {
      if (req.body.certificateTitle !== null && req.body.certificateTitle.length > 200) {
        return res.status(400).json({ error: 'Certificate title must be 200 characters or less' });
      }
      updates.push('CertificateTitle = @certificateTitle');
      params.certificateTitle = req.body.certificateTitle || null;
    }
    if (req.body.certificateTemplate !== undefined) {
      const validTemplates = ['classic', 'modern', 'elegant', 'minimal'];
      if (!validTemplates.includes(req.body.certificateTemplate)) {
        return res.status(400).json({ error: `Invalid certificate template. Must be one of: ${validTemplates.join(', ')}` });
      }
      updates.push('CertificateTemplate = @certificateTemplate');
      params.certificateTemplate = req.body.certificateTemplate;
    }

    // Advanced Visibility (Phase 4)
    if (req.body.visibility !== undefined) {
      const validVisibilities = ['public', 'unlisted'];
      if (!validVisibilities.includes(req.body.visibility)) {
        return res.status(400).json({ error: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}` });
      }
      updates.push('Visibility = @visibility');
      params.visibility = req.body.visibility;
    }

    // Always update the UpdatedAt timestamp
    updates.push('UpdatedAt = GETDATE()');

    if (updates.length === 1) {
      // Only UpdatedAt, no actual changes
      return res.json({ message: 'No changes to update' });
    }

    // Execute the update
    console.log('🔄 [PUT /courses/:id] Updating course with params:', { courseId, updates: updates.join(', '), params });
    const updateResult: any = await db.query(`
      UPDATE dbo.Courses 
      SET ${updates.join(', ')}
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, params);
    console.log('✅ [PUT /courses/:id] Course updated successfully');

    res.json({ 
      message: 'Course updated successfully',
      courseId 
    });
  } catch (error) {
    console.error('Failed to update course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate or regenerate a preview token for a course
router.post('/courses/:id/preview-token', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.params.id;

    // Verify the course exists and belongs to this instructor
    const course = await db.query(`
      SELECT Id FROM dbo.Courses 
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId });

    if (!course || course.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    const previewToken = uuidv4();

    await db.query(`
      UPDATE dbo.Courses 
      SET PreviewToken = @previewToken, UpdatedAt = GETDATE()
      WHERE Id = @courseId AND InstructorId = @instructorId
    `, { courseId, instructorId: userId, previewToken });

    res.json({
      message: 'Preview token generated successfully',
      previewToken
    });
  } catch (error) {
    console.error('Failed to generate preview token:', error);
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
      SET IsPublished = 1, Status = 'published', UpdatedAt = GETDATE()
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

// Manual trigger for at-risk student detection (testing only)
router.post(
  '/test-at-risk-detection',
  authenticateToken,
  authorize(['instructor', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const result = await triggerAtRiskDetection();

      res.json({
        success: true,
        message: 'At-risk detection triggered successfully',
        data: result
      });
    } catch (error) {
      console.error('Failed to trigger at-risk detection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger at-risk detection'
      });
    }
  }
);

// ============= ENROLLMENT APPROVAL SYSTEM (Phase 2) =============

// Get pending enrollments for instructor's courses
router.get('/enrollments/pending', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.query.courseId as string | undefined;

    let query = `
      SELECT 
        e.Id as EnrollmentId,
        e.CourseId,
        e.UserId,
        e.EnrolledAt,
        e.Status,
        c.Title as CourseTitle,
        u.FirstName,
        u.LastName,
        u.Email,
        u.ProfilePicture
      FROM dbo.Enrollments e
      JOIN dbo.Courses c ON e.CourseId = c.Id
      JOIN dbo.Users u ON e.UserId = u.Id
      WHERE c.InstructorId = @instructorId 
        AND e.Status = 'pending'
    `;

    const params: any = { instructorId: userId };

    if (courseId) {
      query += ' AND e.CourseId = @courseId';
      params.courseId = courseId;
    }

    query += ' ORDER BY e.EnrolledAt DESC';

    const pendingEnrollments = await db.query(query, params);

    res.json({ 
      enrollments: pendingEnrollments,
      total: pendingEnrollments.length
    });
  } catch (error) {
    console.error('Failed to fetch pending enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve a pending enrollment
router.put('/enrollments/:enrollmentId/approve', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const enrollmentId = req.params.enrollmentId;

    // Verify enrollment exists, is pending, and belongs to instructor's course
    const enrollment = await db.query(`
      SELECT 
        e.Id,
        e.UserId,
        e.CourseId,
        e.Status,
        c.Title as CourseTitle,
        c.InstructorId,
        c.MaxEnrollment,
        c.EnrollmentCount,
        c.Price,
        u.FirstName,
        u.LastName
      FROM dbo.Enrollments e
      JOIN dbo.Courses c ON e.CourseId = c.Id
      JOIN dbo.Users u ON e.UserId = u.Id
      WHERE e.Id = @enrollmentId
    `, { enrollmentId });

    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollmentData = enrollment[0];

    // Verify instructor owns this course
    if (enrollmentData.InstructorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already processed
    if (enrollmentData.Status !== 'pending') {
      return res.status(400).json({ 
        error: `Enrollment is already ${enrollmentData.Status}`,
        code: 'ALREADY_PROCESSED'
      });
    }

    // Check capacity (in case it changed since enrollment request)
    if (enrollmentData.MaxEnrollment !== null && 
        enrollmentData.EnrollmentCount >= enrollmentData.MaxEnrollment) {
      return res.status(403).json({
        error: 'Course has reached maximum capacity',
        code: 'ENROLLMENT_FULL'
      });
    }

    // Determine new status based on course price
    // Paid courses: approved (student still needs to pay) 
    // Free courses: active (fully enrolled)
    const isPaidCourse = enrollmentData.Price > 0;
    const newStatus = isPaidCourse ? 'approved' : 'active';

    // Update enrollment status
    await db.execute(`
      UPDATE dbo.Enrollments 
      SET Status = @newStatus
      WHERE Id = @enrollmentId
    `, { enrollmentId, newStatus });

    // Only increment enrollment count for free courses (paid courses increment after payment)
    if (!isPaidCourse) {
      await db.execute(`
        UPDATE dbo.Courses 
        SET EnrollmentCount = ISNULL(EnrollmentCount, 0) + 1
        WHERE Id = @courseId
      `, { courseId: enrollmentData.CourseId });
    }

    // Send notification to student
    const io = req.app.get('io');
    if (io) {
      try {
        const NotificationService = require('../services/NotificationService').NotificationService;
        const notificationService = new NotificationService(io);

        if (isPaidCourse) {
          // Paid course: notify with checkout link
          await notificationService.createNotificationWithControls(
            {
              userId: enrollmentData.UserId,
              type: 'course',
              priority: 'high',
              title: 'Enrollment Approved! 🎉',
              message: `Your enrollment in "${enrollmentData.CourseTitle}" has been approved! Complete your purchase to access the course.`,
              actionUrl: `/checkout/${enrollmentData.CourseId}`,
              actionText: 'Complete Purchase'
            },
            {
              category: 'course',
              subcategory: 'EnrollmentApproved'
            }
          );
        } else {
          // Free course: notify with course link
          await notificationService.createNotificationWithControls(
            {
              userId: enrollmentData.UserId,
              type: 'course',
              priority: 'high',
              title: 'Enrollment Approved! 🎉',
              message: `Your enrollment in "${enrollmentData.CourseTitle}" has been approved. You can now access the course.`,
              actionUrl: `/courses/${enrollmentData.CourseId}`,
              actionText: 'Go to Course'
            },
            {
              category: 'course',
              subcategory: 'EnrollmentApproved'
            }
          );
        }
      } catch (notifError) {
        console.error('⚠️ Failed to send approval notification:', notifError);
      }
    }

    res.json({ 
      message: isPaidCourse 
        ? 'Enrollment approved. Student has been notified to complete payment.'
        : 'Enrollment approved successfully',
      enrollmentId,
      status: newStatus,
      studentName: `${enrollmentData.FirstName} ${enrollmentData.LastName}`
    });
  } catch (error) {
    console.error('Failed to approve enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject a pending enrollment
router.put('/enrollments/:enrollmentId/reject', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const enrollmentId = req.params.enrollmentId;
    const reason = req.body.reason || 'Your enrollment request was not approved at this time.';

    // Verify enrollment exists, is pending, and belongs to instructor's course
    const enrollment = await db.query(`
      SELECT 
        e.Id,
        e.UserId,
        e.CourseId,
        e.Status,
        c.Title as CourseTitle,
        c.InstructorId,
        u.FirstName,
        u.LastName
      FROM dbo.Enrollments e
      JOIN dbo.Courses c ON e.CourseId = c.Id
      JOIN dbo.Users u ON e.UserId = u.Id
      WHERE e.Id = @enrollmentId
    `, { enrollmentId });

    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollmentData = enrollment[0];

    // Verify instructor owns this course
    if (enrollmentData.InstructorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already processed
    if (enrollmentData.Status !== 'pending') {
      return res.status(400).json({ 
        error: `Enrollment is already ${enrollmentData.Status}`,
        code: 'ALREADY_PROCESSED'
      });
    }

    // Update enrollment status to rejected
    await db.execute(`
      UPDATE dbo.Enrollments 
      SET Status = 'rejected'
      WHERE Id = @enrollmentId
    `, { enrollmentId });

    // Send notification to student
    const io = req.app.get('io');
    if (io) {
      try {
        const NotificationService = require('../services/NotificationService').NotificationService;
        const notificationService = new NotificationService(io);

        await notificationService.createNotificationWithControls(
          {
            userId: enrollmentData.UserId,
            type: 'course',
            priority: 'normal',
            title: 'Enrollment Request Update',
            message: `Your enrollment request for "${enrollmentData.CourseTitle}" was not approved. ${reason}`,
            actionUrl: `/courses`,
            actionText: 'Browse Courses'
          },
          {
            category: 'course',
            subcategory: 'EnrollmentRejected'
          }
        );
      } catch (notifError) {
        console.error('⚠️ Failed to send rejection notification:', notifError);
      }
    }

    res.json({ 
      message: 'Enrollment rejected',
      enrollmentId,
      studentName: `${enrollmentData.FirstName} ${enrollmentData.LastName}`
    });
  } catch (error) {
    console.error('Failed to reject enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
