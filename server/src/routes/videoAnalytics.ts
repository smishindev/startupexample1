import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// GET /api/video-analytics/course/:courseId - Get video analytics for a course
router.get('/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;

    console.log('Fetching video analytics for course:', courseId);

    // Verify user is the instructor of this course
    const courseCheck = await db.query(`
      SELECT Id, Title, InstructorId
      FROM dbo.Courses
      WHERE Id = @courseId AND InstructorId = @userId
    `, { courseId, userId });

    if (!courseCheck.length) {
      return res.status(403).json({ 
        error: 'Only the course instructor can view video analytics' 
      });
    }

    const course = courseCheck[0];

    // Get video analytics for all videos in the course
    const analyticsQuery = await db.query(`
      SELECT 
        VL.Id as VideoLessonId,
        L.Title as LessonTitle,
        COUNT(DISTINCT VP.UserId) as UniqueViewers,
        COUNT(VP.Id) as TotalViews,
        AVG(CAST(VP.WatchedDuration as FLOAT)) as AverageWatchTime,
        AVG(CAST(VP.CompletionPercentage as FLOAT)) as AverageCompletionPercentage,
        SUM(CAST(VP.WatchedDuration as FLOAT)) as TotalWatchTime,
        SUM(CASE WHEN VP.Completed = 1 THEN 1 ELSE 0 END) as CompletedViews
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      LEFT JOIN dbo.VideoProgress VP ON VP.VideoLessonId = VL.Id
      WHERE L.CourseId = @courseId
      GROUP BY VL.Id, L.Title, L.OrderIndex
      ORDER BY L.OrderIndex
    `, { courseId });

    const videos = analyticsQuery.map((row: any) => ({
      videoLessonId: row.VideoLessonId,
      lessonTitle: row.LessonTitle,
      totalViews: row.TotalViews || 0,
      uniqueViewers: row.UniqueViewers || 0,
      averageWatchTime: Math.round(row.AverageWatchTime || 0),
      completionRate: row.TotalViews > 0 
        ? Math.round((row.CompletedViews / row.TotalViews) * 100) 
        : 0,
      averageCompletionTime: Math.round(row.AverageWatchTime || 0),
      totalWatchTime: Math.round(row.TotalWatchTime || 0),
    }));

    // Calculate course-level summary
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, v) => sum + v.totalViews, 0);
    const averageCompletionRate = totalVideos > 0
      ? Math.round(videos.reduce((sum, v) => sum + v.completionRate, 0) / totalVideos)
      : 0;

    const analytics = {
      courseId: course.Id,
      courseTitle: course.Title,
      totalVideos,
      totalViews,
      averageCompletionRate,
      videos,
    };

    res.json(analytics);

  } catch (error) {
    console.error('Error fetching video analytics:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch video analytics' 
    });
  }
});

// GET /api/video-analytics/course/:courseId/events - Get event analytics for a course
router.get('/course/:courseId/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user is the instructor
    const courseCheck = await db.query(`
      SELECT Id FROM dbo.Courses
      WHERE Id = @courseId AND InstructorId = @userId
    `, { courseId, userId });

    if (!courseCheck.length) {
      return res.status(403).json({ 
        error: 'Only the course instructor can view video analytics' 
      });
    }

    // Get event analytics
    const eventsQuery = await db.query(`
      SELECT 
        VA.EventType,
        COUNT(*) as EventCount
      FROM dbo.VideoAnalytics VA
      INNER JOIN dbo.VideoLessons VL ON VA.VideoLessonId = VL.Id
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      WHERE L.CourseId = @courseId
      GROUP BY VA.EventType
    `, { courseId });

    const totalEvents = eventsQuery.reduce((sum: number, row: any) => sum + row.EventCount, 0);

    const events = eventsQuery.map((row: any) => ({
      eventType: row.EventType,
      count: row.EventCount,
      percentage: totalEvents > 0 
        ? Math.round((row.EventCount / totalEvents) * 100) 
        : 0,
    }));

    res.json(events);

  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch event analytics' 
    });
  }
});

// GET /api/video-analytics/video/:videoLessonId - Get detailed analytics for a specific video
router.get('/video/:videoLessonId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoLessonId } = req.params;
    const userId = (req as any).user.userId;

    // Verify user is the instructor
    const videoCheck = await db.query(`
      SELECT VL.Id, C.InstructorId, L.Title as LessonTitle
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      WHERE VL.Id = @videoLessonId AND C.InstructorId = @userId
    `, { videoLessonId, userId });

    if (!videoCheck.length) {
      return res.status(403).json({ 
        error: 'Only the course instructor can view video analytics' 
      });
    }

    const video = videoCheck[0];

    // Get detailed viewer progress data
    const progressData = await db.query(`
      SELECT 
        U.Email as UserEmail,
        U.FirstName,
        U.LastName,
        VP.LastPosition,
        VP.WatchedDuration,
        VP.CompletionPercentage,
        VP.Completed,
        VP.CompletedAt,
        VP.LastWatchedAt
      FROM dbo.VideoProgress VP
      INNER JOIN dbo.Users U ON VP.UserId = U.Id
      WHERE VP.VideoLessonId = @videoLessonId
      ORDER BY VP.LastWatchedAt DESC
    `, { videoLessonId });

    const viewers = progressData.map((row: any) => ({
      userEmail: row.UserEmail,
      userName: `${row.FirstName} ${row.LastName}`,
      lastPosition: row.LastPosition,
      watchedDuration: row.WatchedDuration,
      completionPercentage: row.CompletionPercentage,
      completed: row.Completed,
      completedAt: row.CompletedAt,
      lastWatchedAt: row.LastWatchedAt,
    }));

    // Get event breakdown
    const eventsData = await db.query(`
      SELECT 
        EventType,
        COUNT(*) as EventCount
      FROM dbo.VideoAnalytics
      WHERE VideoLessonId = @videoLessonId
      GROUP BY EventType
    `, { videoLessonId });

    const events = eventsData.map((row: any) => ({
      eventType: row.EventType,
      count: row.EventCount,
    }));

    res.json({
      videoLessonId: video.Id,
      lessonTitle: video.LessonTitle,
      viewers,
      events,
    });

  } catch (error) {
    console.error('Error fetching video analytics:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch video analytics' 
    });
  }
});

export { router as videoAnalyticsRoutes };
