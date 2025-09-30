import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { AuthRequest, authenticateToken, authorize } from '../middleware/auth';

const router = Router();
const db = DatabaseService.getInstance();

// Get course analytics overview
router.get('/courses/:courseId', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user!.userId;

    console.log(`[Analytics] Getting course analytics for courseId: ${courseId}, instructorId: ${instructorId}`);

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    console.log(`[Analytics] Course ownership check: found ${courseCheck.length} courses`);

    if (courseCheck.length === 0) {
      console.log(`[Analytics] Course not found or access denied for courseId: ${courseId}, instructorId: ${instructorId}`);
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get comprehensive course analytics
    const [
      enrollmentStats,
      progressStats,
      engagementStats,
      recentActivity
    ] = await Promise.all([
      // Enrollment statistics
      db.query(`
        SELECT 
          COUNT(*) as totalEnrollments,
          COUNT(CASE WHEN Status = 'active' THEN 1 END) as activeEnrollments,
          COUNT(CASE WHEN Status = 'completed' THEN 1 END) as completedEnrollments,
          COUNT(CASE WHEN Status = 'dropped' THEN 1 END) as droppedEnrollments,
          AVG(CASE WHEN Status = 'completed' THEN DATEDIFF(day, EnrolledAt, GETUTCDATE()) END) as avgCompletionDays
        FROM dbo.Enrollments 
        WHERE CourseId = @courseId
      `, { courseId }),

      // Progress statistics
      db.query(`
        SELECT 
          AVG(CAST(OverallProgress as FLOAT)) as avgProgress,
          AVG(CAST(TimeSpent as FLOAT)) as avgTimeSpent,
          COUNT(CASE WHEN OverallProgress = 100 THEN 1 END) as completedStudents,
          COUNT(CASE WHEN OverallProgress > 0 AND OverallProgress < 100 THEN 1 END) as inProgressStudents,
          COUNT(CASE WHEN OverallProgress = 0 THEN 1 END) as notStartedStudents
        FROM dbo.UserProgress 
        WHERE CourseId = @courseId
      `, { courseId }),

      // Engagement statistics
      db.query(`
        SELECT 
          COUNT(DISTINCT UserId) as activeUsers,
          COUNT(CASE WHEN LastAccessedAt >= DATEADD(day, -7, GETUTCDATE()) THEN 1 END) as weeklyActiveUsers,
          COUNT(CASE WHEN LastAccessedAt >= DATEADD(day, -30, GETUTCDATE()) THEN 1 END) as monthlyActiveUsers,
          AVG(CAST(TimeSpent as FLOAT)) as avgSessionTime
        FROM dbo.UserProgress 
        WHERE CourseId = @courseId AND LastAccessedAt IS NOT NULL
      `, { courseId }),

      // Recent activity
      db.query(`
        SELECT TOP 10
          u.FirstName,
          u.LastName,
          u.Email,
          up.OverallProgress,
          up.LastAccessedAt,
          e.Status as EnrollmentStatus
        FROM dbo.UserProgress up
        JOIN dbo.Users u ON up.UserId = u.Id
        JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
        WHERE up.CourseId = @courseId
        ORDER BY up.LastAccessedAt DESC
      `, { courseId })
    ]);

    const analytics = {
      enrollment: enrollmentStats[0] || {},
      progress: progressStats[0] || {},
      engagement: engagementStats[0] || {},
      recentActivity: recentActivity || []
    };

    console.log(`[Analytics] Returning analytics data:`, {
      enrollmentCount: enrollmentStats.length,
      progressCount: progressStats.length,
      engagementCount: engagementStats.length,
      recentActivityCount: recentActivity.length
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ error: 'Failed to fetch course analytics' });
  }
});

// Get instructor dashboard analytics (all courses)
router.get('/dashboard', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const instructorId = req.user!.userId;

    const [
      overviewStats,
      coursePerformance,
      monthlyTrends,
      topCourses
    ] = await Promise.all([
      // Overall statistics
      db.query(`
        SELECT 
          COUNT(DISTINCT c.Id) as totalCourses,
          COUNT(DISTINCT e.UserId) as totalStudents,
          COUNT(e.Id) as totalEnrollments,
          AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
          SUM(CAST(up.TimeSpent as FLOAT)) as totalTimeSpent
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @instructorId
      `, { instructorId }),

      // Course performance
      db.query(`
        SELECT 
          c.Id,
          c.Title,
          COUNT(DISTINCT e.UserId) as enrolledStudents,
          AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
          COUNT(CASE WHEN up.OverallProgress = 100 THEN 1 END) as completedStudents,
          AVG(CAST(up.TimeSpent as FLOAT)) as avgTimeSpent
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @instructorId
        GROUP BY c.Id, c.Title
        ORDER BY enrolledStudents DESC
      `, { instructorId }),

      // Monthly enrollment trends (last 6 months)
      db.query(`
        SELECT 
          FORMAT(e.EnrolledAt, 'yyyy-MM') as month,
          COUNT(*) as enrollments,
          COUNT(DISTINCT e.UserId) as uniqueStudents
        FROM dbo.Enrollments e
        JOIN dbo.Courses c ON e.CourseId = c.Id
        WHERE c.InstructorId = @instructorId 
          AND e.EnrolledAt >= DATEADD(month, -6, GETUTCDATE())
        GROUP BY FORMAT(e.EnrolledAt, 'yyyy-MM')
        ORDER BY month
      `, { instructorId }),

      // Top performing courses
      db.query(`
        SELECT TOP 5
          c.Title,
          COUNT(DISTINCT e.UserId) as enrollments,
          AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
          COUNT(CASE WHEN up.OverallProgress = 100 THEN 1 END) as completions
        FROM dbo.Courses c
        JOIN dbo.Enrollments e ON c.Id = e.CourseId
        JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @instructorId
        GROUP BY c.Id, c.Title
        ORDER BY (COUNT(CASE WHEN up.OverallProgress = 100 THEN 1 END) * 100.0 / COUNT(DISTINCT e.UserId)) DESC
      `, { instructorId })
    ]);

    const dashboard = {
      overview: overviewStats[0] || {},
      coursePerformance: coursePerformance || [],
      monthlyTrends: monthlyTrends || [],
      topCourses: topCourses || []
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// Get progress trends for a specific course
router.get('/courses/:courseId/trends', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user!.userId;

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    if (courseCheck.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get weekly progress trends
    const trends = await db.query(`
      SELECT 
        DATEPART(week, up.LastAccessedAt) as week,
        DATEPART(year, up.LastAccessedAt) as year,
        AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
        COUNT(DISTINCT up.UserId) as activeStudents,
        SUM(CAST(up.TimeSpent as FLOAT)) as totalTimeSpent
      FROM dbo.UserProgress up
      WHERE up.CourseId = @courseId 
        AND up.LastAccessedAt >= DATEADD(week, -12, GETUTCDATE())
      GROUP BY DATEPART(week, up.LastAccessedAt), DATEPART(year, up.LastAccessedAt)
      ORDER BY year, week
    `, { courseId });

    res.json(trends);
  } catch (error) {
    console.error('Error fetching course trends:', error);
    res.status(500).json({ error: 'Failed to fetch course trends' });
  }
});

// Get student performance distribution
router.get('/courses/:courseId/performance-distribution', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user!.userId;

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    if (courseCheck.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get performance distribution
    const distribution = await db.query(`
      SELECT 
        CASE 
          WHEN OverallProgress = 0 THEN 'Not Started'
          WHEN OverallProgress BETWEEN 1 AND 25 THEN '1-25%'
          WHEN OverallProgress BETWEEN 26 AND 50 THEN '26-50%'
          WHEN OverallProgress BETWEEN 51 AND 75 THEN '51-75%'
          WHEN OverallProgress BETWEEN 76 AND 99 THEN '76-99%'
          WHEN OverallProgress = 100 THEN 'Completed'
        END as progressRange,
        COUNT(*) as studentCount,
        CASE 
          WHEN OverallProgress = 0 THEN 1
          WHEN OverallProgress BETWEEN 1 AND 25 THEN 2
          WHEN OverallProgress BETWEEN 26 AND 50 THEN 3
          WHEN OverallProgress BETWEEN 51 AND 75 THEN 4
          WHEN OverallProgress BETWEEN 76 AND 99 THEN 5
          WHEN OverallProgress = 100 THEN 6
        END as sortOrder
      FROM dbo.UserProgress
      WHERE CourseId = @courseId
      GROUP BY 
        CASE 
          WHEN OverallProgress = 0 THEN 'Not Started'
          WHEN OverallProgress BETWEEN 1 AND 25 THEN '1-25%'
          WHEN OverallProgress BETWEEN 26 AND 50 THEN '26-50%'
          WHEN OverallProgress BETWEEN 51 AND 75 THEN '51-75%'
          WHEN OverallProgress BETWEEN 76 AND 99 THEN '76-99%'
          WHEN OverallProgress = 100 THEN 'Completed'
        END,
        CASE 
          WHEN OverallProgress = 0 THEN 1
          WHEN OverallProgress BETWEEN 1 AND 25 THEN 2
          WHEN OverallProgress BETWEEN 26 AND 50 THEN 3
          WHEN OverallProgress BETWEEN 51 AND 75 THEN 4
          WHEN OverallProgress BETWEEN 76 AND 99 THEN 5
          WHEN OverallProgress = 100 THEN 6
        END
      ORDER BY sortOrder
    `, { courseId });

    res.json(distribution);
  } catch (error) {
    console.error('Error fetching performance distribution:', error);
    res.status(500).json({ error: 'Failed to fetch performance distribution' });
  }
});

export { router as analyticsRoutes };