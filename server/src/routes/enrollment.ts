import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';
import { CourseEventService } from '../services/CourseEventService';

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
      // For instructors, return BOTH courses they teach AND courses they're enrolled in
      // Use UNION to combine teaching courses with student enrollments
      const instructorEnrollments = await db.query(`
        -- Courses the instructor is teaching
        SELECT 
          c.Id as enrollmentId,
          c.Id as courseId,
          COALESCE(c.CreatedAt, GETUTCDATE()) as EnrolledAt,
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
          0 as TimeSpent,
          MAX(COALESCE(up.LastAccessedAt, c.UpdatedAt, GETUTCDATE())) as LastAccessedAt
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.Status IN ('active', 'completed')
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @userId 
          AND (c.Status IN ('published', 'archived') OR (c.Status IS NULL AND c.IsPublished = 1))
        GROUP BY c.Id, c.Title, c.Description, c.Thumbnail, c.Duration, c.Level, c.Price, c.Category, c.CreatedAt, c.UpdatedAt
        
        UNION ALL
        
        -- Courses the instructor is enrolled in as a student
        SELECT DISTINCT
          e.Id as enrollmentId,
          c.Id as courseId,
          e.EnrolledAt,
          e.Status,
          e.CompletedAt,
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
        
        ORDER BY EnrolledAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `, { userId, offset, limit: limitNum });
      
      // Get total count (teaching courses + enrolled courses)
      const countResult = await db.query(`
        SELECT 
          (SELECT COUNT(DISTINCT c.Id) 
           FROM dbo.Courses c
           WHERE c.InstructorId = @userId 
             AND (c.Status IN ('published', 'archived') OR (c.Status IS NULL AND c.IsPublished = 1)))
          +
          (SELECT COUNT(DISTINCT e.Id)
           FROM dbo.Enrollments e
           WHERE e.UserId = @userId)
        as total
      `, { userId });

      const totalEnrollments = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalEnrollments / limitNum);

      // Normalize level to lowercase
      const normalizedEnrollments = instructorEnrollments.map((enrollment: any) => ({
        ...enrollment,
        Level: enrollment.Level?.toLowerCase()
      }));

      res.json({
        enrollments: normalizedEnrollments,
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

      // Normalize level to lowercase
      const normalizedEnrollments = enrollments.map((enrollment: any) => ({
        ...enrollment,
        Level: enrollment.Level?.toLowerCase()
      }));

      console.log('[ENROLLMENT API] First enrollment from DB:', enrollments[0]);
      console.log('[ENROLLMENT API] Pagination:', { page: pageNum, limit: limitNum, total: totalEnrollments, totalPages });

      res.json({
        enrollments: normalizedEnrollments,
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

    // Get course details including prerequisites, enrollment controls, and verify published status
    const courseDetails = await db.query(`
      SELECT 
        Id, 
        Title, 
        Prerequisites,
        InstructorId,
        Status,
        IsPublished,
        Price,
        MaxEnrollment,
        EnrollmentCount,
        EnrollmentOpenDate,
        EnrollmentCloseDate,
        RequiresApproval
      FROM dbo.Courses
      WHERE Id = @courseId
        AND (Status = 'published' OR (Status IS NULL AND IsPublished = 1))
    `, { courseId });

    if (courseDetails.length === 0) {
      return res.status(404).json({ 
        error: 'Course not found or not available for enrollment',
        code: 'COURSE_NOT_FOUND' 
      });
    }

    const courseData = courseDetails[0];

    // Don't allow instructor to enroll in their own course
    if (courseData.InstructorId === userId) {
      return res.status(403).json({ 
        error: 'Cannot enroll in your own course',
        code: 'INSTRUCTOR_SELF_ENROLLMENT'
      });
    }

    // ===== ENROLLMENT CONTROLS VALIDATION (Phase 2) =====
    // These checks run BEFORE the price check so that a full/closed paid course
    // returns ENROLLMENT_FULL instead of PAYMENT_REQUIRED (prevents useless checkout redirect)
    
    // 1. Check enrollment capacity
    if (courseData.MaxEnrollment !== null && courseData.EnrollmentCount >= courseData.MaxEnrollment) {
      return res.status(403).json({
        error: 'This course has reached its maximum enrollment capacity',
        code: 'ENROLLMENT_FULL',
        maxEnrollment: courseData.MaxEnrollment,
        currentEnrollment: courseData.EnrollmentCount
      });
    }

    // 2. Check enrollment date range
    const now = new Date();
    if (courseData.EnrollmentOpenDate && new Date(courseData.EnrollmentOpenDate) > now) {
      return res.status(403).json({
        error: 'Enrollment for this course has not opened yet',
        code: 'ENROLLMENT_NOT_OPEN',
        enrollmentOpenDate: courseData.EnrollmentOpenDate
      });
    }

    if (courseData.EnrollmentCloseDate && new Date(courseData.EnrollmentCloseDate) < now) {
      return res.status(403).json({
        error: 'Enrollment period for this course has closed',
        code: 'ENROLLMENT_CLOSED',
        enrollmentCloseDate: courseData.EnrollmentCloseDate
      });
    }

    // 3. Check if manual approval is required BEFORE price check (Phase 2 fix)
    // For paid courses with RequiresApproval, we create a pending enrollment first.
    // The student pays AFTER the instructor approves.
    if (courseData.RequiresApproval && courseData.Price > 0) {
      // Skip the price check — approval comes first, payment later
      // Fall through to prerequisite check, existing enrollment check, and pending creation below
    } else if (courseData.Price > 0) {
      // Standard paid course without approval: redirect to checkout
      return res.status(402).json({ 
        error: 'This course requires payment. Please complete the checkout process.',
        code: 'PAYMENT_REQUIRED',
        price: courseData.Price,
        checkoutUrl: `/checkout/${courseId}`
      });
    }

    // Check prerequisites if they exist
    if (courseData.Prerequisites) {
      try {
        const prerequisites = JSON.parse(courseData.Prerequisites);
        
        if (Array.isArray(prerequisites) && prerequisites.length > 0) {
          // Check if user has completed all prerequisite courses
          const prerequisiteCheck = await db.query(`
            SELECT 
              c.Id,
              c.Title,
              CASE 
                WHEN cp.CompletedAt IS NOT NULL THEN 1
                ELSE 0
              END as IsCompleted
            FROM Courses c
            LEFT JOIN CourseProgress cp ON c.Id = cp.CourseId AND cp.UserId = @userId
            WHERE c.Id IN (${prerequisites.map((_: any, i: number) => `@prereq${i}`).join(', ')})
              AND (c.Status = 'published' OR (c.Status IS NULL AND c.IsPublished = 1))
          `, prerequisites.reduce((acc: any, prereqId: string, i: number) => {
            acc[`prereq${i}`] = prereqId;
            return acc;
          }, { userId }));

          // Only check prerequisites that actually exist (ignore deleted courses)
          const missingPrerequisites = prerequisiteCheck.filter((p: any) => !p.IsCompleted);
          
          if (missingPrerequisites.length > 0) {
            return res.status(403).json({
              error: 'You must complete prerequisite courses before enrolling in this course',
              code: 'PREREQUISITES_NOT_MET',
              message: 'You must complete prerequisite courses before enrolling in this course',
              missingPrerequisites: missingPrerequisites.map((p: any) => ({
                id: p.Id,
                title: p.Title
              }))
            });
          }
        }
      } catch (parseError) {
        console.error('Failed to parse prerequisites:', parseError);
        // Continue with enrollment if prerequisites are malformed
      }
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
      } else if (status === 'pending') {
        // Already has a pending enrollment request
        return res.status(409).json({
          error: 'Your enrollment request is already pending approval',
          code: 'ENROLLMENT_ALREADY_PENDING',
          enrollmentId: existingEnrollment[0].Id
        });
      } else if (status === 'approved') {
        // Instructor approved but student hasn't paid yet (paid course with approval)
        if (courseData.Price > 0) {
          return res.status(200).json({
            enrollmentId: existingEnrollment[0].Id,
            courseId,
            status: 'approved',
            message: 'Your enrollment has been approved! Please complete payment to access the course.',
            code: 'ENROLLMENT_APPROVED_PENDING_PAYMENT',
            price: courseData.Price,
            checkoutUrl: `/checkout/${courseId}`
          });
        } else {
          // Free course that's approved — activate it
          await db.execute(`
            UPDATE dbo.Enrollments SET Status = 'active' WHERE Id = @enrollmentId
          `, { enrollmentId: existingEnrollment[0].Id });
          await db.execute(`
            UPDATE dbo.Courses SET EnrollmentCount = EnrollmentCount + 1 WHERE Id = @courseId
          `, { courseId });
          res.status(200).json({
            enrollmentId: existingEnrollment[0].Id,
            courseId,
            status: 'active',
            message: 'Successfully enrolled in course',
            code: 'ENROLLMENT_SUCCESS'
          });
          try { CourseEventService.getInstance().emitEnrollmentCountChanged(courseId); } catch (e) { console.error('[Enrollment] Emit failed:', e); }
          return;
        }
      } else if (status === 'rejected') {
        // Previously rejected - allow re-enrollment by updating the existing record
        const newStatus = courseData.RequiresApproval ? 'pending' : 'active';
        await db.execute(`
          UPDATE dbo.Enrollments
          SET Status = @newStatus, EnrolledAt = @enrolledAt
          WHERE Id = @enrollmentId
        `, {
          enrollmentId: existingEnrollment[0].Id,
          enrolledAt: new Date().toISOString(),
          newStatus
        });

        if (newStatus === 'active') {
          // Increment enrollment count for auto-approved re-enrollment
          await db.execute(`
            UPDATE dbo.Courses SET EnrollmentCount = EnrollmentCount + 1 WHERE Id = @courseId
          `, { courseId });
        }

        res.status(200).json({
          enrollmentId: existingEnrollment[0].Id,
          courseId,
          status: newStatus,
          enrolledAt: new Date().toISOString(),
          message: newStatus === 'pending' 
            ? 'Your enrollment request has been resubmitted. Awaiting instructor approval.'
            : 'Successfully re-enrolled in course',
          code: newStatus === 'pending' ? 'ENROLLMENT_PENDING_APPROVAL' : 'RE_ENROLLED'
        });

        // Emit after response sent
        if (newStatus === 'active') {
          try { CourseEventService.getInstance().emitEnrollmentCountChanged(courseId); } catch (e) { console.error('[Enrollment] Emit failed:', e); }
        }
        return;
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
      } else if (status === 'suspended') {
        // Suspended enrollment — student cannot self-reactivate
        return res.status(403).json({
          error: 'Your enrollment has been suspended. Please contact the instructor for more information.',
          code: 'ENROLLMENT_SUSPENDED',
          enrollmentId: existingEnrollment[0].Id
        });
      } else if (status === 'cancelled') {
        // Reactivate cancelled enrollment
        // Same logic as rejected: if RequiresApproval, go back to pending (re-approval needed)
        const reactivateStatus = courseData.RequiresApproval ? 'pending' : 'active';
        
        await db.execute(`
          UPDATE dbo.Enrollments
          SET Status = @reactivateStatus, EnrolledAt = @enrolledAt
          WHERE Id = @enrollmentId
        `, {
          enrollmentId: existingEnrollment[0].Id,
          enrolledAt: new Date().toISOString(),
          reactivateStatus
        });

        // Increment enrollment count only when directly activating (free course, no approval)
        if (reactivateStatus === 'active') {
          await db.execute(`
            UPDATE dbo.Courses SET EnrollmentCount = EnrollmentCount + 1 WHERE Id = @courseId
          `, { courseId });
        }

        // Get user details for notifications (already have course details from courseData)
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

            if (reactivateStatus === 'active') {
              // Notify student: Welcome back notification
              await notificationService.createNotificationWithControls(
                {
                  userId: userId!,
                  type: 'course',
                  priority: 'high',
                  title: `Welcome Back to ${courseData.Title}!`,
                  message: `You're re-enrolled! Continue your learning journey.`,
                  actionUrl: `/courses/${courseId}`,
                  actionText: 'Continue Learning'
                },
                {
                  category: 'course',
                  subcategory: 'CourseEnrollment'
                }
              );

              // Notify instructor: Re-enrollment alert
              const instructorId = courseData.InstructorId;
              await notificationService.createNotificationWithControls(
                {
                  userId: instructorId,
                  type: 'course',
                  priority: 'normal',
                  title: 'Student Re-enrolled',
                  message: `${studentName} re-enrolled in "${courseData.Title}"`,
                  actionUrl: `/instructor/students?courseId=${courseId}`,
                  actionText: 'View Students'
                },
                {
                  category: 'course',
                  subcategory: 'CourseEnrollment'
                }
              );
            } else {
              // Notify instructor: Re-enrollment request (needs approval)
              await notificationService.createNotificationWithControls(
                {
                  userId: courseData.InstructorId,
                  type: 'course',
                  priority: 'high',
                  title: 'Re-enrollment Request',
                  message: `${studentName} requested to re-enroll in "${courseData.Title}"`,
                  actionUrl: `/instructor/students?courseId=${courseId}`,
                  actionText: 'Review Request'
                },
                {
                  category: 'course',
                  subcategory: 'EnrollmentRequest'
                }
              );
            }

            // NotificationService already emits Socket.IO event, no need to emit again
          } catch (notifError) {
            console.error('⚠️ Failed to send re-enrollment notifications:', notifError);
            // Don't block re-enrollment on notification failure
          }
        } else {
          console.warn('⚠️ Socket.IO not available, skipping real-time re-enrollment notifications');
        }

        res.status(reactivateStatus === 'pending' ? 202 : 200).json({
          enrollmentId: existingEnrollment[0].Id,
          courseId,
          status: reactivateStatus,
          enrolledAt: new Date().toISOString(),
          message: reactivateStatus === 'pending'
            ? 'Your enrollment request has been resubmitted. Awaiting instructor approval.'
            : 'Successfully re-enrolled in course',
          code: reactivateStatus === 'pending' ? 'ENROLLMENT_PENDING_APPROVAL' : 'RE_ENROLLED'
        });

        // Emit real-time enrollment count change (after response sent)
        if (reactivateStatus === 'active') {
          try { CourseEventService.getInstance().emitEnrollmentCountChanged(courseId); } catch (e) { console.error('[Enrollment] Emit failed:', e); }
        }
        return;
      }
    }

    const enrollmentId = uuidv4();
    const nowIso = new Date().toISOString();

    // 3. Check if manual approval is required (Phase 2)
    if (courseData.RequiresApproval) {
      // Create pending enrollment
      await db.execute(`
        INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
        VALUES (@id, @userId, @courseId, @enrolledAt, @status)
      `, {
        id: enrollmentId,
        userId,
        courseId,
        enrolledAt: nowIso,
        status: 'pending'
      });

      // Send notification to instructor about pending enrollment
      const io = req.app.get('io');
      if (io) {
        try {
          const NotificationService = require('../services/NotificationService').NotificationService;
          const notificationService = new NotificationService(io);

          const userDetails = await db.query(`
            SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId
          `, { userId });
          const studentName = userDetails.length > 0 
            ? `${userDetails[0].FirstName} ${userDetails[0].LastName}` 
            : 'A student';

          await notificationService.createNotificationWithControls(
            {
              userId: courseData.InstructorId,
              type: 'course',
              priority: 'high',
              title: 'New Enrollment Request',
              message: `${studentName} requested to enroll in "${courseData.Title}"`,
              actionUrl: `/instructor/students?courseId=${courseId}`,
              actionText: 'Review Request'
            },
            {
              category: 'course',
              subcategory: 'EnrollmentRequest'
            }
          );
        } catch (notifError) {
          console.error('⚠️ Failed to send enrollment request notification:', notifError);
        }
      }

      return res.status(202).json({
        enrollmentId,
        courseId,
        courseTitle: courseData.Title,
        status: 'pending',
        enrolledAt: nowIso,
        message: 'Your enrollment request has been submitted. Awaiting instructor approval.',
        code: 'ENROLLMENT_PENDING_APPROVAL'
      });
    }

    // Create active enrollment (auto-approved)
    await db.execute(`
      INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
      VALUES (@id, @userId, @courseId, @enrolledAt, @status)
    `, {
      id: enrollmentId,
      userId,
      courseId,
      enrolledAt: nowIso,
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
            title: `Welcome to ${courseData.Title}!`,
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
        const instructorId = courseData.InstructorId;
        const instructorNotificationId = await notificationService.createNotificationWithControls(
          {
            userId: instructorId,
            type: 'course',
            priority: 'normal',
            title: 'New Student Enrolled',
            message: `${studentName} enrolled in "${courseData.Title}"`,
            actionUrl: `/instructor/students?courseId=${courseId}`,
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
      courseTitle: courseData.Title,
      status: 'active',
      enrolledAt: nowIso,
      message: `Successfully enrolled in "${courseData.Title}"`,
      code: 'ENROLLMENT_SUCCESS',
      nextSteps: {
        startLearning: `/courses/${courseId}/lessons`,
        viewProgress: `/my-learning`,
        courseDetail: `/courses/${courseId}`
      }
    });

    // Emit real-time enrollment count change + join user to course room (after response sent)
    try {
      const courseEventService = CourseEventService.getInstance();
      courseEventService.emitEnrollmentCountChanged(courseId);
      await courseEventService.joinUserToCourseRoom(userId!, courseId);
    } catch (emitError) {
      console.error('[Enrollment] Failed to emit enrollment event:', emitError);
    }

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