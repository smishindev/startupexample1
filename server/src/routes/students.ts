import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = express.Router();
const db = DatabaseService.getInstance();

// Get all students for instructor's courses
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const instructorId = req.user.userId;
    const { courseId, search, status, sortBy = 'enrolledAt', sortOrder = 'desc' } = req.query;

    console.log('[STUDENT API] Fetching students for instructor:', instructorId);
    console.log('[STUDENT API] Filters:', { courseId, search, status, sortBy, sortOrder });
    
    let query = `
      SELECT DISTINCT
        u.Id as userId,
        u.FirstName,
        u.LastName,
        u.Email,
        u.Avatar,
        u.CreatedAt as userCreatedAt,
        e.Id as enrollmentId,
        e.CourseId,
        e.EnrolledAt,
        e.CompletedAt,
        e.Status as enrollmentStatus,
        c.Title as courseTitle,
        up.OverallProgress,
        up.TimeSpent,
        up.LastAccessedAt,
        up.CompletedLessons,
        COALESCE(lesson_count.total, 0) as totalLessons
      FROM dbo.Users u
      INNER JOIN dbo.Enrollments e ON u.Id = e.UserId
      INNER JOIN dbo.Courses c ON e.CourseId = c.Id
      LEFT JOIN dbo.UserProgress up ON u.Id = up.UserId AND c.Id = up.CourseId
      LEFT JOIN (
        SELECT CourseId, COUNT(*) as total
        FROM dbo.Lessons
        GROUP BY CourseId
      ) lesson_count ON c.Id = lesson_count.CourseId
      WHERE c.InstructorId = @instructorId
    `;

    const params: any = { instructorId };

    // Add filters
    if (courseId) {
      query += ` AND c.Id = @courseId`;
      params.courseId = courseId;
    }

    if (search) {
      query += ` AND (u.FirstName LIKE @search OR u.LastName LIKE @search OR u.Email LIKE @search)`;
      params.search = `%${search}%`;
    }

    if (status) {
      query += ` AND e.Status = @status`;
      params.status = status;
    }

    // Add sorting
    const validSortFields = ['enrolledAt', 'lastName', 'progress', 'lastAccessed'];
    const validSortOrders = ['asc', 'desc'];
    
    if (validSortFields.includes(sortBy as string) && validSortOrders.includes(sortOrder as string)) {
      const sortField = sortBy === 'enrolledAt' ? 'e.EnrolledAt' :
                       sortBy === 'lastName' ? 'u.LastName' :
                       sortBy === 'progress' ? 'up.OverallProgress' :
                       sortBy === 'lastAccessed' ? 'up.LastAccessedAt' : 'e.EnrolledAt';
      
      query += ` ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
    }

    console.log('[STUDENT API] Fetching students for instructor:', instructorId);
    const students = await db.query(query, params);

    // Transform the data
    const transformedStudents = students.map((student: any) => ({
      id: student.userId,
      firstName: student.FirstName,
      lastName: student.LastName,
      email: student.Email,
      avatar: student.Avatar,
      userCreatedAt: student.userCreatedAt,
      enrollment: {
        id: student.enrollmentId,
        courseId: student.CourseId,
        courseTitle: student.courseTitle,
        enrolledAt: student.EnrolledAt,
        completedAt: student.CompletedAt,
        status: student.enrollmentStatus
      },
      progress: {
        overall: student.OverallProgress || 0,
        timeSpent: student.TimeSpent || 0,
        lastAccessedAt: student.LastAccessedAt,
        completedLessons: student.CompletedLessons ? JSON.parse(student.CompletedLessons) : [],
        totalLessons: student.totalLessons
      }
    }));

    res.json(transformedStudents);
  } catch (error) {
    console.error('[STUDENT API] Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get detailed student progress for a specific course
router.get('/:studentId/progress/:courseId', authenticateToken, async (req: any, res) => {
  try {
    const instructorId = req.user.userId;
    const { studentId, courseId } = req.params;

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    if (courseCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Get detailed progress information
    const progressQuery = `
      SELECT 
        up.OverallProgress,
        up.TimeSpent,
        up.LastAccessedAt,
        up.StartedAt,
        up.CompletedAt,
        up.CompletedLessons,
        up.CurrentLesson,
        up.PerformanceMetrics,
        e.EnrolledAt,
        e.Status as enrollmentStatus,
        u.FirstName,
        u.LastName,
        u.Email,
        c.Title as courseTitle
      FROM dbo.UserProgress up
      INNER JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
      INNER JOIN dbo.Users u ON up.UserId = u.Id
      INNER JOIN dbo.Courses c ON up.CourseId = c.Id
      WHERE up.UserId = @studentId AND up.CourseId = @courseId
    `;

    const progress = await db.query(progressQuery, { studentId, courseId });

    if (progress.length === 0) {
      return res.status(404).json({ error: 'Progress not found for this student' });
    }

    // Get lesson progress details
    const lessonsQuery = `
      SELECT 
        l.Id,
        l.Title,
        l.OrderIndex,
        l.Duration,
        CASE WHEN JSON_VALUE(up.CompletedLessons, '$') LIKE '%' + CAST(l.Id AS NVARCHAR(36)) + '%' 
             THEN 1 ELSE 0 END as isCompleted
      FROM dbo.Lessons l
      LEFT JOIN dbo.UserProgress up ON up.CourseId = l.CourseId AND up.UserId = @studentId
      WHERE l.CourseId = @courseId
      ORDER BY l.OrderIndex
    `;

    const lessons = await db.query(lessonsQuery, { studentId, courseId });

    const progressData = progress[0];
    const detailedProgress = {
      student: {
        id: studentId,
        firstName: progressData.FirstName,
        lastName: progressData.LastName,
        email: progressData.Email
      },
      course: {
        id: courseId,
        title: progressData.courseTitle
      },
      enrollment: {
        enrolledAt: progressData.EnrolledAt,
        status: progressData.enrollmentStatus
      },
      progress: {
        overall: progressData.OverallProgress || 0,
        timeSpent: progressData.TimeSpent || 0,
        lastAccessedAt: progressData.LastAccessedAt,
        startedAt: progressData.StartedAt,
        completedAt: progressData.CompletedAt,
        currentLesson: progressData.CurrentLesson,
        completedLessons: progressData.CompletedLessons ? JSON.parse(progressData.CompletedLessons) : [],
        performanceMetrics: progressData.PerformanceMetrics ? JSON.parse(progressData.PerformanceMetrics) : {}
      },
      lessons: lessons.map((lesson: any) => ({
        id: lesson.Id,
        title: lesson.Title,
        orderIndex: lesson.OrderIndex,
        duration: lesson.Duration,
        isCompleted: Boolean(lesson.isCompleted)
      }))
    };

    res.json(detailedProgress);
  } catch (error) {
    console.error('[STUDENT API] Error fetching student progress:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

// Update student enrollment status
router.put('/:studentId/enrollment/:enrollmentId', authenticateToken, async (req: any, res) => {
  try {
    const instructorId = req.user.userId;
    const { studentId, enrollmentId } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'suspended', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid enrollment status' });
    }

    // Verify instructor owns the course for this enrollment
    const enrollmentCheck = await db.query(`
      SELECT e.Id, e.CourseId 
      FROM dbo.Enrollments e
      INNER JOIN dbo.Courses c ON e.CourseId = c.Id
      WHERE e.Id = @enrollmentId AND e.UserId = @studentId AND c.InstructorId = @instructorId
    `, { enrollmentId, studentId, instructorId });

    if (enrollmentCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to this enrollment' });
    }

    // Update enrollment status
    await db.execute(
      'UPDATE dbo.Enrollments SET Status = @status WHERE Id = @enrollmentId',
      { status, enrollmentId }
    );

    console.log(`[STUDENT API] Updated enrollment ${enrollmentId} status to ${status}`);
    res.json({ message: 'Enrollment status updated successfully' });
  } catch (error) {
    console.error('[STUDENT API] Error updating enrollment:', error);
    res.status(500).json({ error: 'Failed to update enrollment status' });
  }
});

// Send message/announcement to students
router.post('/message', authenticateToken, async (req: any, res) => {
  try {
    const instructorId = req.user.userId;
    const { courseId, studentIds, subject, message, type = 'message' } = req.body;

    if (!courseId || !message) {
      return res.status(400).json({ error: 'Course ID and message are required' });
    }

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    if (courseCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // If no specific students provided, get all enrolled students
    let recipients = studentIds;
    if (!recipients || recipients.length === 0) {
      const allStudents = await db.query(`
        SELECT e.UserId 
        FROM dbo.Enrollments e
        INNER JOIN dbo.Courses c ON e.CourseId = c.Id
        WHERE c.Id = @courseId AND c.InstructorId = @instructorId AND e.Status = 'active'
      `, { courseId, instructorId });
      
      recipients = allStudents.map((s: any) => s.UserId);
    }

    // For now, we'll log the message (in a real app, you'd integrate with email/notification service)
    console.log(`[STUDENT API] Sending ${type} to ${recipients.length} students:`, {
      subject,
      message,
      courseId,
      recipients
    });

    // TODO: Implement actual message sending (email, in-app notifications, etc.)
    // This could integrate with services like SendGrid, AWS SES, or in-app notification system

    res.json({ 
      message: `${type} sent successfully to ${recipients.length} students`,
      recipients: recipients.length
    });
  } catch (error) {
    console.error('[STUDENT API] Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get student analytics summary
router.get('/analytics', authenticateToken, async (req: any, res) => {
  try {
    const instructorId = req.user.userId;
    const { courseId } = req.query;

    let courseFilter = '';
    const params: any = { instructorId };

    if (courseId) {
      courseFilter = 'AND c.Id = @courseId';
      params.courseId = courseId;
    }

    const analyticsQuery = `
      SELECT 
        COUNT(DISTINCT e.UserId) as totalStudents,
        COUNT(DISTINCT CASE WHEN e.Status = 'active' THEN e.UserId END) as activeStudents,
        COUNT(DISTINCT CASE WHEN e.Status = 'completed' THEN e.UserId END) as completedStudents,
        COUNT(DISTINCT CASE WHEN e.Status = 'suspended' THEN e.UserId END) as suspendedStudents,
        AVG(CAST(up.OverallProgress AS FLOAT)) as avgProgress,
        AVG(CAST(up.TimeSpent AS FLOAT)) as avgTimeSpent,
        COUNT(DISTINCT CASE WHEN up.LastAccessedAt > DATEADD(day, -7, GETUTCDATE()) THEN e.UserId END) as activeLastWeek,
        COUNT(DISTINCT CASE WHEN up.LastAccessedAt > DATEADD(day, -30, GETUTCDATE()) THEN e.UserId END) as activeLastMonth
      FROM dbo.Enrollments e
      INNER JOIN dbo.Courses c ON e.CourseId = c.Id
      LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
      WHERE c.InstructorId = @instructorId ${courseFilter}
    `;

    const analytics = await db.query(analyticsQuery, params);
    const result = analytics[0] || {};

    res.json({
      totalStudents: result.totalStudents || 0,
      activeStudents: result.activeStudents || 0,
      completedStudents: result.completedStudents || 0,
      suspendedStudents: result.suspendedStudents || 0,
      averageProgress: Math.round(result.avgProgress || 0),
      averageTimeSpent: Math.round(result.avgTimeSpent || 0),
      activeLastWeek: result.activeLastWeek || 0,
      activeLastMonth: result.activeLastMonth || 0
    });
  } catch (error) {
    console.error('[STUDENT API] Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

export default router;