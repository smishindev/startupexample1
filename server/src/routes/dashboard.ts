import express, { Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { SettingsService } from '../services/SettingsService';
import { authenticateToken } from '../middleware/auth';
import sql from 'mssql';

const router = express.Router();
const settingsService = new SettingsService();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics for the authenticated user
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Note: Dashboard stats are for own profile, so no privacy filtering needed
    // Privacy filtering only applies when viewing OTHER users' stats

    const db = DatabaseService.getInstance();

    // Get total enrolled courses
    const enrollmentRequest = await db.getRequest();
    const enrollmentResult = await enrollmentRequest
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(DISTINCT CourseId) as TotalCourses
        FROM Enrollments
        WHERE UserId = @userId AND Status = 'active'
      `);

    const totalCourses = enrollmentResult.recordset[0]?.TotalCourses || 0;

    // Get completed courses (courses with 100% progress)
    const completedRequest = await db.getRequest();
    const completedResult = await completedRequest
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(DISTINCT CourseId) as CompletedCourses
        FROM CourseProgress
        WHERE UserId = @userId AND OverallProgress >= 100
      `);

    const completedCourses = completedResult.recordset[0]?.CompletedCourses || 0;

    // Calculate total hours learned (sum of TimeSpent from LearningActivities)
    const hoursRequest = await db.getRequest();
    const hoursResult = await hoursRequest
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT ISNULL(SUM(TimeSpent), 0) as TotalSeconds
        FROM LearningActivities
        WHERE UserId = @userId
      `);

    const totalSeconds = hoursResult.recordset[0]?.TotalSeconds || 0;
    const hoursLearned = Math.round((totalSeconds / 3600) * 10) / 10; // Round to 1 decimal place

    // Calculate current learning streak (consecutive days with activity)
    const streakRequest = await db.getRequest();
    const streakResult = await streakRequest
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        WITH DailyActivity AS (
          SELECT DISTINCT CAST(CreatedAt AS DATE) as ActivityDate
          FROM LearningActivities
          WHERE UserId = @userId
          UNION
          SELECT DISTINCT CAST(EnrolledAt AS DATE) as ActivityDate
          FROM Enrollments
          WHERE UserId = @userId AND EnrolledAt IS NOT NULL
        ),
        OrderedDates AS (
          SELECT 
            ActivityDate,
            DATEDIFF(DAY, ActivityDate, CAST(GETDATE() AS DATE)) as DaysAgo,
            ROW_NUMBER() OVER (ORDER BY ActivityDate DESC) as RowNum
          FROM DailyActivity
        )
        SELECT COUNT(*) as Streak
        FROM OrderedDates
        WHERE DaysAgo = RowNum - 1 AND DaysAgo < 30
      `);

    const currentStreak = streakResult.recordset[0]?.Streak || 0;

    // Get recent achievements (based on actual user milestones)
    const achievements = [];

    // First course completion achievement
    if (completedCourses >= 1) {
      achievements.push({
        id: '1',
        title: 'First Steps',
        description: 'Completed your first course',
        icon: '🎯',
        type: 'bronze',
        unlockedAt: 'Recently',
      });
    }

    // 7-day streak achievement
    if (currentStreak >= 7) {
      achievements.push({
        id: '2',
        title: 'Streak Master',
        description: `${currentStreak}-day learning streak`,
        icon: '🔥',
        type: 'silver',
        unlockedAt: 'Active',
      });
    }

    // 3 courses completed achievement
    if (completedCourses >= 3) {
      achievements.push({
        id: '3',
        title: 'Knowledge Seeker',
        description: `Completed ${completedCourses} courses`,
        icon: '📚',
        type: 'gold',
        unlockedAt: 'Recently',
      });
    }

    // 10 hours learned achievement
    if (hoursLearned >= 10) {
      achievements.push({
        id: '4',
        title: 'Dedicated Learner',
        description: `${hoursLearned} hours of learning`,
        icon: '⏰',
        type: 'silver',
        unlockedAt: 'Recently',
      });
    }

    // 5 courses enrolled achievement
    if (totalCourses >= 5) {
      achievements.push({
        id: '5',
        title: 'Course Explorer',
        description: `Enrolled in ${totalCourses} courses`,
        icon: '🌟',
        type: 'bronze',
        unlockedAt: 'Recently',
      });
    }

    const stats = {
      totalCourses,
      completedCourses,
      hoursLearned,
      currentStreak,
      achievements,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router;
