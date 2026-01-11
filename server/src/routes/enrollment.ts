import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';

const router = Router();
const db = DatabaseService.getInstance();

// Get user's enrollments
router.get('/my-enrollments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { page = '1', limit = '20' } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    if (userRole === 'instructor') {
      // For instructors, return the courses they teach with student enrollment stats
      const instructorCourses = await db.query(`
        SELECT 
          c.Id as courseId,
          c.Id as enrollmentId,
          GETUTCDATE() as EnrolledAt,
          'teaching' as Status,
          NULL as CompletedAt,
          c.Title,
          c.Description,
          c.Thumbnail,
          c.Duration,
          c.Level,
          c.Price,
          c.Category,
          'You' as instructorFirstName,
          'are teaching' as instructorLastName,
          COALESCE(AVG(CAST(up.ProgressPercentage as FLOAT)), 0) as OverallProgress,
          COUNT(DISTINCT e.UserId) as TimeSpent,
          MAX(COALESCE(up.LastAccessedAt, GETUTCDATE())) as LastAccessedAt
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.Status IN ('active', 'completed')
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @userId AND c.IsPublished = 1
        GROUP BY c.Id, c.Title, c.Description, c.Thumbnail, c.Duration, c.Level, c.Price, c.Category
        ORDER BY c.Id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `, { userId, offset, limit: limitNum });
      
      // Get total count
      const countResult = await db.query(`
        SELECT COUNT(DISTINCT c.Id) as total
        FROM dbo.Courses c
        WHERE c.InstructorId = @userId AND c.IsPublished = 1
      `, { userId });

      const totalEnrollments = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalEnrollments / limitNum);

      res.json({
        enrollments: instructorCourses,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEnrollments,
          hasMore: pageNum < totalPages
        }
      });
    } else {
      // For students, return their enrollments
      const enrollments = await db.query(`
        SELECT DISTINCT
          e.Id as enrollmentId,
          e.EnrolledAt,
          e.Status,
          e.CompletedAt,
          c.Id as courseId,
          c.Title,
          c.Description,
          c.Thumbnail,
          c.Duration,
          c.Level,
          c.Price,
          c.Category,
          u.FirstName as instructorFirstName,
          u.LastName as instructorLastName,
          COALESCE(up.ProgressPercentage, 0) as OverallProgress,
          COALESCE(up.TimeSpent, 0) as TimeSpent,
          up.LastAccessedAt
        FROM dbo.Enrollments e
        INNER JOIN dbo.Courses c ON e.CourseId = c.Id
        INNER JOIN dbo.Users u ON c.InstructorId = u.Id
        LEFT JOIN (
          SELECT UserId, CourseId, ProgressPercentage, TimeSpent, LastAccessedAt,
                 ROW_NUMBER() OVER (PARTITION BY UserId, CourseId ORDER BY LastAccessedAt DESC) as rn
          FROM dbo.UserProgress
        ) up ON e.UserId = up.UserId AND e.CourseId = up.CourseId AND up.rn = 1
        WHERE e.UserId = @userId
        ORDER BY e.EnrolledAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `, { userId, offset, limit: limitNum });
      
      // Get total count for students
      const countResult = await db.query(`
        SELECT COUNT(DISTINCT e.Id) as total
        FROM dbo.Enrollments e
        WHERE e.UserId = @userId
      `, { userId });

      const totalEnrollments = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalEnrollments / limitNum);

      console.log('[ENROLLMENT API] First enrollment from DB:', enrollments[0]);
      console.log('[ENROLLMENT API] Pagination:', { page: pageNum, limit: limitNum, total: totalEnrollments, totalPages });

      res.json({
        enrollments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalEnrollments,
          hasMore: pageNum < totalPages
        }
      });
    }
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Check enrollment status for a course
router.get('/courses/:courseId/enrollment-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    // First check if user is the instructor of this course
    const instructorCheck = await db.query(`
      SELECT Id, InstructorId FROM dbo.Courses
      WHERE Id = @courseId
    `, { courseId });

    if (instructorCheck.length > 0 && instructorCheck[0].InstructorId === userId) {
      return res.json({
        enrolled: false,
        isInstructor: true,
        status: 'instructor',
        message: 'You are the instructor of this course'
      });
    }

    // Check for regular enrollment
    const enrollment = await db.query(`
      SELECT Id, Status, EnrolledAt, CompletedAt
      FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.json({ enrolled: false });
    }

    res.json({
      enrolled: true,
      enrollmentId: enrollment[0].Id,
      status: enrollment[0].Status,
      enrolledAt: enrollment[0].EnrolledAt,
      completedAt: enrollment[0].CompletedAt
    });
  } catch (error) {
    console.error('Error checking enrollment status:', error);
    res.status(500).json({ error: 'Failed to check enrollment status' });
  }
});

// Enroll in a course
router.post('/courses/:courseId/enroll', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    // Validate course ID format
    if (!courseId || courseId.length !== 36) {
      return res.status(400).json({ 
        error: 'Invalid course ID format',
        code: 'INVALID_COURSE_ID' 
      });
    }

    // Check if already enrolled
    const existingEnrollment = await db.query(`
      SELECT Id, Status FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    if (existingEnrollment.length > 0) {
      const status = existingEnrollment[0].Status;
      if (status === 'active') {
        return res.status(409).json({ 
          error: 'Already enrolled in this course',
          code: 'ALREADY_ENROLLED',
          enrollmentId: existingEnrollment[0].Id
        });
      } else if (status === 'completed') {
        // Student completed the course but can remain enrolled to access new content
        // Just return the existing enrollment
        return res.status(200).json({
          enrollmentId: existingEnrollment[0].Id,
          courseId,
          status: 'completed',
          enrolledAt: existingEnrollment[0].EnrolledAt,
          completedAt: existingEnrollment[0].CompletedAt,
          message: 'Already completed this course. You still have full access.',
          code: 'ALREADY_COMPLETED'
        });
      } else if (status === 'cancelled') {
        // Reactivate cancelled enrollment
        await db.execute(`
          UPDATE dbo.Enrollments
          SET Status = 'active', EnrolledAt = @enrolledAt
          WHERE Id = @enrollmentId
        `, {
          enrollmentId: existingEnrollment[0].Id,
          enrolledAt: new Date().toISOString()
        });

        // Get course and user details for notifications
        const course = await db.query(`
          SELECT Title, InstructorId FROM dbo.Courses WHERE Id = @courseId
        `, { courseId });

        if (course.length === 0) {
          // Course was deleted between checks - still return success for enrollment
          return res.status(200).json({
            enrollmentId: existingEnrollment[0].Id,
            courseId,
            status: 'active',
            enrolledAt: new Date().toISOString(),
            message: 'Successfully re-enrolled in course',
            code: 'RE_ENROLLED'
          });
        }

        const userDetails = await db.query(`
          SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId
        `, { userId });
        const studentName = userDetails.length > 0 
          ? `${userDetails[0].FirstName} ${userDetails[0].LastName}` 
          : 'A student';

        // Send notifications for re-enrollment
        const io = req.app.get('io');
        if (io) {
          try {
            const notificationService = new NotificationService(io);

            // Notify student: Welcome back notification
            const studentNotificationId = await notificationService.createNotificationWithControls(
              {
                userId: userId!,
                type: 'course',
                priority: 'high',
                title: `Welcome Back to ${course[0].Title}!`,
                message: `You're re-enrolled! Continue your learning journey.`,
                actionUrl: `/courses/${courseId}`,
                actionText: 'Continue Learning'
              },
              {
                category: 'course',
                subcategory: 'CourseEnrollment'
              }
            );

            // NotificationService already emits Socket.IO event, no need to emit again

            // Notify instructor: Re-enrollment alert
            const instructorId = course[0].InstructorId;
            const instructorNotificationId = await notificationService.createNotificationWithControls(
              {
                userId: instructorId,
                type: 'course',
                priority: 'normal',
                title: 'Student Re-enrolled',
                message: `${studentName} re-enrolled in "${course[0].Title}"`,
                actionUrl: `/instructor/courses/${courseId}/students`,
                actionText: 'View Students'
              },
              {
                category: 'course',
                subcategory: 'CourseEnrollment'
              }
            );

            // NotificationService already emits Socket.IO event, no need to emit again
          } catch (notifError) {
            console.error('⚠️ Failed to send re-enrollment notifications:', notifError);
            // Don't block re-enrollment on notification failure
          }
        } else {
          console.warn('⚠️ Socket.IO not available, skipping real-time re-enrollment notifications');
        }

        return res.status(200).json({
          enrollmentId: existingEnrollment[0].Id,
          courseId,
          status: 'active',
          enrolledAt: new Date().toISOString(),
          message: 'Successfully re-enrolled in course',
          code: 'RE_ENROLLED'
        });
      }
    }

    // Verify course exists and is published
    const course = await db.query(`
      SELECT Id, Title, InstructorId, Price, IsPublished, EnrollmentCount
      FROM dbo.Courses
      WHERE Id = @courseId
    `, { courseId });

    if (course.length === 0) {
      return res.status(404).json({ 
        error: 'Course not found',
        code: 'COURSE_NOT_FOUND'
      });
    }

    if (!course[0].IsPublished) {
      return res.status(403).json({ 
        error: 'Course is not available for enrollment',
        code: 'COURSE_NOT_PUBLISHED'
      });
    }

    // Don't allow instructor to enroll in their own course
    if (course[0].InstructorId === userId) {
      return res.status(403).json({ 
        error: 'Cannot enroll in your own course',
        code: 'INSTRUCTOR_SELF_ENROLLMENT'
      });
    }

    // Prevent enrollment in paid courses without payment
    if (course[0].Price > 0) {
      return res.status(402).json({ 
        error: 'This course requires payment. Please complete the checkout process.',
        code: 'PAYMENT_REQUIRED',
        price: course[0].Price,
        checkoutUrl: `/checkout/${courseId}`
      });
    }

    const enrollmentId = uuidv4();
    const now = new Date().toISOString();

    // Create enrollment
    await db.execute(`
      INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
      VALUES (@id, @userId, @courseId, @enrolledAt, @status)
    `, {
      id: enrollmentId,
      userId,
      courseId,
      enrolledAt: now,
      status: 'active'
    });

    // Note: UserProgress is now per-lesson, not per-course
    // Progress entries will be created as the student accesses lessons
    // We no longer create a course-level progress entry here

    // Update course enrollment count
    await db.execute(`
      UPDATE dbo.Courses
      SET EnrollmentCount = EnrollmentCount + 1
      WHERE Id = @courseId
    `, {
      courseId
    });

    // Get user details for notifications
    const userDetails = await db.query(`
      SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId
    `, { userId });
    const studentName = userDetails.length > 0 
      ? `${userDetails[0].FirstName} ${userDetails[0].LastName}` 
      : 'A student';

    // Send notification to io instance
    const io = req.app.get('io');
    if (io) {
      try {
        const notificationService = new NotificationService(io);

        // Notify student: Welcome notification
        const studentNotificationId = await notificationService.createNotificationWithControls(
          {
            userId: userId!,
            type: 'course',
            priority: 'high',
            title: `Welcome to ${course[0].Title}!`,
            message: `You're now enrolled! Start with the first lesson and track your progress.`,
            actionUrl: `/courses/${courseId}`,
            actionText: 'Start Learning'
          },
          {
            category: 'course',
            subcategory: 'CourseEnrollment'
          }
        );

        // NotificationService already emits Socket.IO event, no need to emit again

        // Notify instructor: New enrollment alert
        const instructorId = course[0].InstructorId;
        const instructorNotificationId = await notificationService.createNotificationWithControls(
          {
            userId: instructorId,
            type: 'course',
            priority: 'normal',
            title: 'New Student Enrolled',
            message: `${studentName} enrolled in "${course[0].Title}"`,
            actionUrl: `/instructor/courses/${courseId}/students`,
            actionText: 'View Students'
          },
          {
            category: 'course',
            subcategory: 'CourseEnrollment'
          }
        );

        // NotificationService already emits Socket.IO event, no need to emit again
        } catch (notifError) {
        console.error('⚠️ Failed to send enrollment notifications:', notifError);
        // Don't block enrollment on notification failure
      }
    } else {
      console.warn('⚠️ Socket.IO not available, skipping real-time enrollment notifications');
    }

    res.status(201).json({
      enrollmentId,
      courseId,
      courseTitle: course[0].Title,
      status: 'active',
      enrolledAt: now,
      message: `Successfully enrolled in "${course[0].Title}"`,
      code: 'ENROLLMENT_SUCCESS',
      nextSteps: {
        startLearning: `/courses/${courseId}/lessons`,
        viewProgress: `/my-learning`,
        courseDetail: `/courses/${courseId}/preview`
      }
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ 
      error: 'Failed to enroll in course. Please try again.',
      code: 'ENROLLMENT_FAILED'
    });
  }
});

// Unenroll from a course
router.delete('/courses/:courseId/unenroll', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    // Check if enrolled
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // Update enrollment status to 'cancelled' instead of deleting
    await db.execute(`
      UPDATE dbo.Enrollments
      SET Status = 'cancelled'
      WHERE UserId = @userId AND CourseId = @courseId
    `, {
      userId,
      courseId
    });

    res.json({ message: 'Successfully unenrolled from course' });

  } catch (error) {
    console.error('Error unenrolling from course:', error);
    res.status(500).json({ error: 'Failed to unenroll from course' });
  }
});

// Get enrollment statistics for a course (public)
router.get('/courses/:courseId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;

    const stats = await db.query(`
      SELECT 
        COUNT(*) as totalEnrollments,
        COUNT(CASE WHEN Status = 'active' THEN 1 END) as activeEnrollments,
        COUNT(CASE WHEN Status = 'completed' THEN 1 END) as completedEnrollments,
        COUNT(CASE WHEN Status = 'cancelled' THEN 1 END) as cancelledEnrollments,
        AVG(CASE WHEN up.ProgressPercentage IS NOT NULL THEN CAST(up.ProgressPercentage as FLOAT) END) as avgProgress
      FROM dbo.Enrollments e
      LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
      WHERE e.CourseId = @courseId
    `, { courseId });

    res.json(stats[0] || {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      cancelledEnrollments: 0,
      avgProgress: 0
    });

  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment statistics' });
  }
});

export { router as enrollmentRoutes };