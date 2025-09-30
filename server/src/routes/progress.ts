import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Get user's overall progress
router.get('/my-progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const progressOverview = await db.query(`
      SELECT 
        COUNT(DISTINCT up.CourseId) as totalCourses,
        AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
        SUM(up.TimeSpent) as totalTimeSpent,
        COUNT(CASE WHEN up.OverallProgress = 100 THEN 1 END) as completedCourses,
        COUNT(CASE WHEN up.OverallProgress > 0 AND up.OverallProgress < 100 THEN 1 END) as inProgressCourses
      FROM dbo.UserProgress up
      INNER JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
      WHERE up.UserId = @userId AND e.Status = 'active'
    `, { userId });

    const recentActivity = await db.query(`
      SELECT TOP 10
        up.CourseId,
        c.Title as courseTitle,
        up.OverallProgress,
        up.LastAccessedAt,
        up.TimeSpent,
        u.FirstName as instructorFirstName,
        u.LastName as instructorLastName
      FROM dbo.UserProgress up
      INNER JOIN dbo.Courses c ON up.CourseId = c.Id
      INNER JOIN dbo.Users u ON c.InstructorId = u.Id
      INNER JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
      WHERE up.UserId = @userId AND e.Status = 'active'
      ORDER BY up.LastAccessedAt DESC
    `, { userId });

    res.json({
      overview: progressOverview[0] || {
        totalCourses: 0,
        avgProgress: 0,
        totalTimeSpent: 0,
        completedCourses: 0,
        inProgressCourses: 0
      },
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// Get progress for a specific course
router.get('/courses/:courseId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    // Verify user is enrolled in the course
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get overall course progress
    const courseProgress = await db.query(`
      SELECT 
        OverallProgress,
        TimeSpent,
        LastAccessedAt,
        CreatedAt,
        UpdatedAt
      FROM dbo.UserProgress
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    // Get lesson progress
    const lessonProgress = await db.query(`
      SELECT 
        lp.LessonId,
        l.Title as lessonTitle,
        l.OrderIndex,
        lp.CompletedAt,
        lp.TimeSpent as lessonTimeSpent,
        lp.ProgressPercentage,
        lp.Notes
      FROM dbo.LessonProgress lp
      INNER JOIN dbo.Lessons l ON lp.LessonId = l.Id
      WHERE lp.UserId = @userId AND l.CourseId = @courseId
      ORDER BY l.OrderIndex
    `, { userId, courseId });

    // Get course lessons for comparison
    const allLessons = await db.query(`
      SELECT Id, Title, OrderIndex, IsRequired
      FROM dbo.Lessons
      WHERE CourseId = @courseId
      ORDER BY OrderIndex
    `, { courseId });

    res.json({
      courseProgress: courseProgress[0] || {
        OverallProgress: 0,
        TimeSpent: 0,
        LastAccessedAt: null,
        CreatedAt: null,
        UpdatedAt: null
      },
      lessonProgress,
      allLessons,
      stats: {
        totalLessons: allLessons.length,
        completedLessons: lessonProgress.filter(lp => lp.CompletedAt).length,
        remainingLessons: allLessons.length - lessonProgress.filter(lp => lp.CompletedAt).length
      }
    });

  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Mark lesson as completed
router.post('/lessons/:lessonId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { timeSpent = 0, notes = '' } = req.body;
    const userId = req.user?.userId;

    // Get lesson info
    const lesson = await db.query(`
      SELECT CourseId, Title, IsRequired FROM dbo.Lessons WHERE Id = @lessonId
    `, { lessonId });

    if (lesson.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lesson[0].CourseId;

    // Verify user is enrolled
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const now = new Date().toISOString();

    // Check if lesson progress already exists
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.LessonProgress
      WHERE UserId = @userId AND LessonId = @lessonId
    `, { userId, lessonId });

    if (existingProgress.length > 0) {
      // Update existing progress
      await db.execute(`
        UPDATE dbo.LessonProgress
        SET CompletedAt = @completedAt, TimeSpent = @timeSpent, 
            ProgressPercentage = 100, Notes = @notes, UpdatedAt = @updatedAt
        WHERE UserId = @userId AND LessonId = @lessonId
      `, { userId, lessonId, completedAt: now, timeSpent, notes, updatedAt: now });
    } else {
      // Create new progress record
      await db.execute(`
        INSERT INTO dbo.LessonProgress (Id, UserId, LessonId, CompletedAt, TimeSpent, ProgressPercentage, Notes, CreatedAt, UpdatedAt)
        VALUES (@id, @userId, @lessonId, @completedAt, @timeSpent, @progressPercentage, @notes, @createdAt, @updatedAt)
      `, {
        id: uuidv4(),
        userId,
        lessonId,
        completedAt: now,
        timeSpent,
        progressPercentage: 100,
        notes,
        createdAt: now,
        updatedAt: now
      });
    }

    // Update overall course progress
    await updateCourseProgress(userId!, courseId);

    res.json({ message: 'Lesson marked as completed', lessonId, timeSpent });

  } catch (error) {
    console.error('Error marking lesson as completed:', error);
    res.status(500).json({ error: 'Failed to mark lesson as completed' });
  }
});

// Update lesson progress (for partial completion)
router.put('/lessons/:lessonId/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { progressPercentage = 0, timeSpent = 0, notes = '' } = req.body;
    const userId = req.user?.userId;

    if (progressPercentage < 0 || progressPercentage > 100) {
      return res.status(400).json({ error: 'Progress percentage must be between 0 and 100' });
    }

    // Get lesson info
    const lesson = await db.query(`
      SELECT CourseId FROM dbo.Lessons WHERE Id = @lessonId
    `, { lessonId });

    if (lesson.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lesson[0].CourseId;

    // Verify user is enrolled
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const now = new Date().toISOString();
    const completedAt = progressPercentage >= 100 ? now : null;

    // Check if lesson progress exists
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.LessonProgress
      WHERE UserId = @userId AND LessonId = @lessonId
    `, { userId, lessonId });

    if (existingProgress.length > 0) {
      // Update existing progress
      await db.execute(`
        UPDATE dbo.LessonProgress
        SET ProgressPercentage = @progressPercentage, TimeSpent = @timeSpent, 
            CompletedAt = @completedAt, Notes = @notes, UpdatedAt = @updatedAt
        WHERE UserId = @userId AND LessonId = @lessonId
      `, { userId, lessonId, progressPercentage, timeSpent, completedAt, notes, updatedAt: now });
    } else {
      // Create new progress record
      await db.execute(`
        INSERT INTO dbo.LessonProgress (Id, UserId, LessonId, ProgressPercentage, TimeSpent, CompletedAt, Notes, CreatedAt, UpdatedAt)
        VALUES (@id, @userId, @lessonId, @progressPercentage, @timeSpent, @completedAt, @notes, @createdAt, @updatedAt)
      `, {
        id: uuidv4(),
        userId,
        lessonId,
        progressPercentage,
        timeSpent,
        completedAt,
        notes,
        createdAt: now,
        updatedAt: now
      });
    }

    // Update overall course progress
    await updateCourseProgress(userId!, courseId);

    res.json({ message: 'Lesson progress updated', lessonId, progressPercentage, timeSpent });

  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: 'Failed to update lesson progress' });
  }
});

// Helper function to recalculate course progress
async function updateCourseProgress(userId: string, courseId: string) {
  try {
    // Get all lessons in the course
    const allLessons = await db.query(`
      SELECT Id, IsRequired FROM dbo.Lessons WHERE CourseId = @courseId
    `, { courseId });

    // Get completed lessons
    const completedLessons = await db.query(`
      SELECT LessonId, ProgressPercentage, TimeSpent
      FROM dbo.LessonProgress
      WHERE UserId = @userId AND LessonId IN (
        SELECT Id FROM dbo.Lessons WHERE CourseId = @courseId
      )
    `, { userId, courseId });

    const totalLessons = allLessons.length;
    const totalTimeSpent = completedLessons.reduce((sum, lesson) => sum + (lesson.TimeSpent || 0), 0);
    
    // Calculate progress based on lesson completion percentage
    const avgProgress = totalLessons > 0 
      ? completedLessons.reduce((sum, lesson) => sum + (lesson.ProgressPercentage || 0), 0) / totalLessons
      : 0;

    const now = new Date().toISOString();

    // Update or create user progress record
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.UserProgress
      WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    if (existingProgress.length > 0) {
      await db.execute(`
        UPDATE dbo.UserProgress
        SET OverallProgress = @progress, TimeSpent = @timeSpent, LastAccessedAt = @lastAccessed, UpdatedAt = @updatedAt
        WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId, progress: Math.round(avgProgress), timeSpent: totalTimeSpent, lastAccessed: now, updatedAt: now });
    } else {
      await db.execute(`
        INSERT INTO dbo.UserProgress (UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt, UpdatedAt)
        VALUES (@userId, @courseId, @progress, @timeSpent, @lastAccessed, @createdAt, @updatedAt)
      `, { userId, courseId, progress: Math.round(avgProgress), timeSpent: totalTimeSpent, lastAccessed: now, createdAt: now, updatedAt: now });
    }

    // Check if course is completed and update enrollment status
    if (avgProgress >= 100) {
      await db.execute(`
        UPDATE dbo.Enrollments
        SET Status = 'completed', CompletedAt = @completedAt
        WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId, completedAt: now });
    }

  } catch (error) {
    console.error('Error updating course progress:', error);
  }
}

// Get learning streaks and achievements
router.get('/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Calculate current streak
    const streakData = await db.query(`
      WITH DailyActivity AS (
        SELECT DISTINCT CAST(LastAccessedAt as DATE) as ActivityDate
        FROM dbo.UserProgress
        WHERE UserId = @userId AND LastAccessedAt IS NOT NULL
      ),
      DateSequence AS (
        SELECT ActivityDate,
               LAG(ActivityDate) OVER (ORDER BY ActivityDate) as PrevDate,
               ROW_NUMBER() OVER (ORDER BY ActivityDate DESC) as RowNum
        FROM DailyActivity
      )
      SELECT COUNT(*) as CurrentStreak
      FROM DateSequence
      WHERE RowNum <= (
        SELECT COALESCE(MIN(RowNum), 0)
        FROM DateSequence
        WHERE DATEDIFF(day, PrevDate, ActivityDate) > 1
      )
    `, { userId });

    // Get achievement stats
    const achievements = await db.query(`
      SELECT 
        COUNT(DISTINCT up.CourseId) as coursesStarted,
        COUNT(DISTINCT CASE WHEN up.OverallProgress = 100 THEN up.CourseId END) as coursesCompleted,
        SUM(up.TimeSpent) as totalTimeSpent,
        COUNT(DISTINCT lp.LessonId) as lessonsCompleted,
        MAX(up.LastAccessedAt) as lastActivity
      FROM dbo.UserProgress up
      LEFT JOIN dbo.LessonProgress lp ON up.UserId = lp.UserId
      WHERE up.UserId = @userId
    `, { userId });

    const currentStreak = streakData[0]?.CurrentStreak || 0;
    const stats = achievements[0] || {};

    // Generate achievement badges
    const badges = [];
    
    if (stats.coursesCompleted >= 1) badges.push({ name: 'First Course', icon: '🎯', description: 'Completed your first course' });
    if (stats.coursesCompleted >= 5) badges.push({ name: 'Course Master', icon: '🏆', description: 'Completed 5 courses' });
    if (stats.coursesCompleted >= 10) badges.push({ name: 'Learning Champion', icon: '👑', description: 'Completed 10 courses' });
    if (currentStreak >= 7) badges.push({ name: 'Week Warrior', icon: '🔥', description: '7-day learning streak' });
    if (currentStreak >= 30) badges.push({ name: 'Month Master', icon: '💪', description: '30-day learning streak' });
    if (stats.totalTimeSpent >= 3600) badges.push({ name: 'Time Keeper', icon: '⏰', description: '1+ hours of learning' });
    if (stats.totalTimeSpent >= 36000) badges.push({ name: 'Dedicated Learner', icon: '📚', description: '10+ hours of learning' });
    if (stats.lessonsCompleted >= 50) badges.push({ name: 'Lesson Legend', icon: '⭐', description: 'Completed 50 lessons' });

    res.json({
      currentStreak,
      stats: {
        coursesStarted: stats.coursesStarted || 0,
        coursesCompleted: stats.coursesCompleted || 0,
        totalTimeSpent: stats.totalTimeSpent || 0,
        lessonsCompleted: stats.lessonsCompleted || 0,
        lastActivity: stats.lastActivity
      },
      badges
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

export { router as progressRoutes };