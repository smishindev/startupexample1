import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Get user's enrollments
router.get('/my-enrollments', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const enrollments = await db.query(`
      SELECT 
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
        u.FirstName as instructorFirstName,
        u.LastName as instructorLastName,
        up.OverallProgress,
        up.TimeSpent,
        up.LastAccessedAt
      FROM dbo.Enrollments e
      INNER JOIN dbo.Courses c ON e.CourseId = c.Id
      INNER JOIN dbo.Users u ON c.InstructorId = u.Id
      LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
      WHERE e.UserId = @userId
      ORDER BY e.EnrolledAt DESC
    `, { userId });

    res.json(enrollments);
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

    // Check if already enrolled
    const existingEnrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    if (existingEnrollment.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Verify course exists and is published
    const course = await db.query(`
      SELECT Id, Title, InstructorId, Price, IsPublished
      FROM dbo.Courses
      WHERE Id = @courseId AND IsPublished = 1
    `, { courseId });

    if (course.length === 0) {
      return res.status(404).json({ error: 'Course not found or not available' });
    }

    // Don't allow instructor to enroll in their own course
    if (course[0].InstructorId === userId) {
      return res.status(400).json({ error: 'Cannot enroll in your own course' });
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

    // Initialize user progress
    await db.execute(`
      INSERT INTO dbo.UserProgress (UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt, UpdatedAt)
      VALUES (@userId, @courseId, @progress, @timeSpent, @lastAccessed, @createdAt, @updatedAt)
    `, {
      userId,
      courseId,
      progress: 0,
      timeSpent: 0,
      lastAccessed: now,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({
      enrollmentId,
      courseId,
      status: 'active',
      enrolledAt: now,
      message: 'Successfully enrolled in course'
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
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

    // Update enrollment status to 'dropped' instead of deleting
    await db.execute(`
      UPDATE dbo.Enrollments
      SET Status = 'dropped', DroppedAt = @droppedAt
      WHERE UserId = @userId AND CourseId = @courseId
    `, {
      userId,
      courseId,
      droppedAt: new Date().toISOString()
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
        COUNT(CASE WHEN Status = 'dropped' THEN 1 END) as droppedEnrollments,
        AVG(CASE WHEN up.OverallProgress IS NOT NULL THEN CAST(up.OverallProgress as FLOAT) END) as avgProgress
      FROM dbo.Enrollments e
      LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
      WHERE e.CourseId = @courseId
    `, { courseId });

    res.json(stats[0] || {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      droppedEnrollments: 0,
      avgProgress: 0
    });

  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment statistics' });
  }
});

export { router as enrollmentRoutes };