import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// POST /api/video-progress/:videoLessonId/update - Update video watch progress
router.post('/:videoLessonId/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoLessonId } = req.params;
    const { lastPosition, watchedDuration, playbackSpeed } = req.body;
    const userId = (req as any).user.userId;

    console.log('Updating video progress:', { videoLessonId, lastPosition, watchedDuration });

    // Validate required fields
    if (lastPosition === undefined) {
      return res.status(400).json({ 
        error: 'lastPosition is required' 
      });
    }

    // Verify video lesson exists and user has access
    const videoCheck = await db.query(`
      SELECT VL.Id, VL.Duration, L.CourseId
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE VL.Id = @videoLessonId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { videoLessonId, userId });

    if (!videoCheck.length) {
      return res.status(404).json({ 
        error: 'Video lesson not found or you do not have access' 
      });
    }

    const video = videoCheck[0];
    const videoDuration = video.Duration || 0;
    
    // Calculate completion percentage
    const completionPercentage = videoDuration > 0 
      ? Math.min(100, (lastPosition / videoDuration) * 100) 
      : 0;
    
    // Mark as completed if watched >= 90% of the video
    const isCompleted = completionPercentage >= 90;

    // Check if progress record exists
    const existingProgress = await db.query(
      'SELECT Id FROM dbo.VideoProgress WHERE UserId = @userId AND VideoLessonId = @videoLessonId',
      { userId, videoLessonId }
    );

    const request = await db.getRequest();
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('videoLessonId', sql.UniqueIdentifier, videoLessonId);
    request.input('lastPosition', sql.Int, lastPosition);
    request.input('watchedDuration', sql.Int, watchedDuration || lastPosition);
    request.input('completionPercentage', sql.Decimal(5, 2), completionPercentage);
    request.input('isCompleted', sql.Bit, isCompleted);
    request.input('playbackSpeed', sql.Decimal(3, 2), playbackSpeed || 1.00);
    request.input('lastWatchedAt', sql.DateTime2, new Date());

    if (existingProgress.length > 0) {
      // Update existing progress
      const updateQuery = `
        UPDATE dbo.VideoProgress 
        SET 
          WatchedDuration = CASE 
            WHEN @watchedDuration > WatchedDuration THEN @watchedDuration 
            ELSE WatchedDuration 
          END,
          LastPosition = @lastPosition,
          CompletionPercentage = @completionPercentage,
          IsCompleted = @isCompleted,
          PlaybackSpeed = @playbackSpeed,
          LastWatchedAt = @lastWatchedAt,
          CompletedAt = CASE 
            WHEN @isCompleted = 1 AND CompletedAt IS NULL THEN @lastWatchedAt 
            ELSE CompletedAt 
          END,
          UpdatedAt = GETUTCDATE()
        WHERE UserId = @userId AND VideoLessonId = @videoLessonId
      `;
      await request.query(updateQuery);
    } else {
      // Insert new progress record
      request.input('id', sql.UniqueIdentifier, uuidv4());
      request.input('completedAt', sql.DateTime2, isCompleted ? new Date() : null);
      
      try {
        const insertQuery = `
          INSERT INTO dbo.VideoProgress 
          (Id, UserId, VideoLessonId, WatchedDuration, LastPosition, CompletionPercentage, 
           IsCompleted, PlaybackSpeed, LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt)
          VALUES 
          (@id, @userId, @videoLessonId, @watchedDuration, @lastPosition, @completionPercentage,
           @isCompleted, @playbackSpeed, @lastWatchedAt, @completedAt, GETUTCDATE(), GETUTCDATE())
        `;
        await request.query(insertQuery);
      } catch (insertError: any) {
        // If duplicate key error (race condition), update instead
        if (insertError.message?.includes('UNIQUE KEY constraint') || insertError.message?.includes('duplicate key')) {
          console.log('Race condition detected, performing UPDATE instead of INSERT');
          const updateQuery = `
            UPDATE dbo.VideoProgress 
            SET 
              WatchedDuration = CASE 
                WHEN @watchedDuration > WatchedDuration THEN @watchedDuration 
                ELSE WatchedDuration 
              END,
              LastPosition = @lastPosition,
              CompletionPercentage = @completionPercentage,
              IsCompleted = @isCompleted,
              PlaybackSpeed = @playbackSpeed,
              LastWatchedAt = @lastWatchedAt,
              CompletedAt = CASE 
                WHEN @isCompleted = 1 AND CompletedAt IS NULL THEN @lastWatchedAt 
                ELSE CompletedAt 
              END,
              UpdatedAt = GETUTCDATE()
            WHERE UserId = @userId AND VideoLessonId = @videoLessonId
          `;
          await request.query(updateQuery);
        } else {
          throw insertError;
        }
      }
    }

    // Track analytics event
    const sessionId = req.headers['x-session-id'] || uuidv4();
    const analyticsRequest = await db.getRequest();
    analyticsRequest.input('id', sql.UniqueIdentifier, uuidv4());
    analyticsRequest.input('videoLessonId', sql.UniqueIdentifier, videoLessonId);
    analyticsRequest.input('userId', sql.UniqueIdentifier, userId);
    analyticsRequest.input('sessionId', sql.UniqueIdentifier, sessionId);
    analyticsRequest.input('eventType', sql.NVarChar(20), 'seek');
    analyticsRequest.input('timestamp', sql.Int, lastPosition);
    analyticsRequest.input('eventData', sql.NVarChar(sql.MAX), JSON.stringify({ 
      completionPercentage,
      playbackSpeed 
    }));

    await analyticsRequest.query(`
      INSERT INTO dbo.VideoAnalytics 
      (Id, VideoLessonId, UserId, SessionId, EventType, Timestamp, EventData, CreatedAt)
      VALUES 
      (@id, @videoLessonId, @userId, @sessionId, @eventType, @timestamp, @eventData, GETUTCDATE())
    `);

    res.json({
      success: true,
      progress: {
        lastPosition,
        watchedDuration: watchedDuration || lastPosition,
        completionPercentage: parseFloat(completionPercentage.toFixed(2)),
        isCompleted,
        playbackSpeed: playbackSpeed || 1.00
      }
    });

  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update video progress' 
    });
  }
});

// GET /api/video-progress/:videoLessonId - Get user's progress for a video
router.get('/:videoLessonId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoLessonId } = req.params;
    const userId = (req as any).user.userId;

    // Verify access to video lesson
    const accessCheck = await db.query(`
      SELECT 1 as HasAccess
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE VL.Id = @videoLessonId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { videoLessonId, userId });

    if (!accessCheck.length) {
      return res.status(403).json({ 
        error: 'You do not have access to this video' 
      });
    }

    // Get progress
    const result = await db.query(`
      SELECT 
        Id, UserId, VideoLessonId, WatchedDuration, LastPosition, 
        CompletionPercentage, IsCompleted, PlaybackSpeed, 
        LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt
      FROM dbo.VideoProgress
      WHERE UserId = @userId AND VideoLessonId = @videoLessonId
    `, { userId, videoLessonId });

    if (!result.length) {
      // No progress yet - return default values
      return res.json({
        progress: {
          hasProgress: false,
          lastPosition: 0,
          watchedDuration: 0,
          completionPercentage: 0,
          isCompleted: false,
          playbackSpeed: 1.00
        }
      });
    }

    const progress = result[0];
    res.json({
      progress: {
        hasProgress: true,
        id: progress.Id,
        lastPosition: progress.LastPosition,
        watchedDuration: progress.WatchedDuration,
        completionPercentage: parseFloat(progress.CompletionPercentage),
        isCompleted: progress.IsCompleted,
        playbackSpeed: parseFloat(progress.PlaybackSpeed),
        lastWatchedAt: progress.LastWatchedAt,
        completedAt: progress.CompletedAt
      }
    });

  } catch (error) {
    console.error('Error fetching video progress:', error);
    res.status(500).json({ error: 'Failed to fetch video progress' });
  }
});

// POST /api/video-progress/:videoLessonId/complete - Mark video as completed
router.post('/:videoLessonId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoLessonId } = req.params;
    const userId = (req as any).user.userId;

    // Verify access and get video duration
    const videoCheck = await db.query(`
      SELECT VL.Id, VL.Duration, VL.LessonId
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE VL.Id = @videoLessonId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { videoLessonId, userId });

    if (!videoCheck.length) {
      return res.status(404).json({ 
        error: 'Video lesson not found or you do not have access' 
      });
    }

    const video = videoCheck[0];
    const videoDuration = video.Duration || 0;

    // Update or create progress record marking as completed
    const request = await db.getRequest();
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('videoLessonId', sql.UniqueIdentifier, videoLessonId);
    request.input('duration', sql.Int, videoDuration);
    request.input('completedAt', sql.DateTime2, new Date());

    // Use MERGE to update or insert
    await request.query(`
      MERGE INTO dbo.VideoProgress AS target
      USING (SELECT @userId as UserId, @videoLessonId as VideoLessonId) AS source
      ON (target.UserId = source.UserId AND target.VideoLessonId = source.VideoLessonId)
      WHEN MATCHED THEN
        UPDATE SET 
          IsCompleted = 1,
          CompletionPercentage = 100.00,
          CompletedAt = @completedAt,
          UpdatedAt = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT (Id, UserId, VideoLessonId, WatchedDuration, LastPosition, 
                CompletionPercentage, IsCompleted, PlaybackSpeed, 
                LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @userId, @videoLessonId, @duration, @duration,
                100.00, 1, 1.00, @completedAt, @completedAt, GETUTCDATE(), GETUTCDATE());
    `);

    // Track completion event in analytics
    const sessionId = req.headers['x-session-id'] || uuidv4();
    const analyticsRequest = await db.getRequest();
    analyticsRequest.input('id', sql.UniqueIdentifier, uuidv4());
    analyticsRequest.input('videoLessonId', sql.UniqueIdentifier, videoLessonId);
    analyticsRequest.input('userId', sql.UniqueIdentifier, userId);
    analyticsRequest.input('sessionId', sql.UniqueIdentifier, sessionId);
    analyticsRequest.input('eventType', sql.NVarChar(20), 'complete');
    analyticsRequest.input('timestamp', sql.Int, videoDuration);
    analyticsRequest.input('eventData', sql.NVarChar(sql.MAX), JSON.stringify({ 
      completedAt: new Date().toISOString()
    }));

    await analyticsRequest.query(`
      INSERT INTO dbo.VideoAnalytics 
      (Id, VideoLessonId, UserId, SessionId, EventType, Timestamp, EventData, CreatedAt)
      VALUES 
      (@id, @videoLessonId, @userId, @sessionId, @eventType, @timestamp, @eventData, GETUTCDATE())
    `);

    res.json({
      success: true,
      message: 'Video marked as completed'
    });

  } catch (error) {
    console.error('Error marking video as complete:', error);
    res.status(500).json({ error: 'Failed to mark video as complete' });
  }
});

// POST /api/video-progress/:videoLessonId/event - Track video playback event
router.post('/:videoLessonId/event', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoLessonId } = req.params;
    const { eventType, timestamp, eventData } = req.body;
    const userId = (req as any).user.userId;

    // Validate event type
    const validEvents = ['play', 'pause', 'seek', 'complete', 'speed_change', 'quality_change'];
    if (!validEvents.includes(eventType)) {
      return res.status(400).json({ 
        error: `Invalid event type. Must be one of: ${validEvents.join(', ')}` 
      });
    }

    // Verify access
    const accessCheck = await db.query(`
      SELECT 1 as HasAccess
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE VL.Id = @videoLessonId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { videoLessonId, userId });

    if (!accessCheck.length) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Track event
    const sessionId = req.headers['x-session-id'] || uuidv4();
    const request = await db.getRequest();
    request.input('id', sql.UniqueIdentifier, uuidv4());
    request.input('videoLessonId', sql.UniqueIdentifier, videoLessonId);
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('sessionId', sql.UniqueIdentifier, sessionId);
    request.input('eventType', sql.NVarChar(20), eventType);
    request.input('timestamp', sql.Int, timestamp || 0);
    request.input('eventData', sql.NVarChar(sql.MAX), eventData ? JSON.stringify(eventData) : null);

    await request.query(`
      INSERT INTO dbo.VideoAnalytics 
      (Id, VideoLessonId, UserId, SessionId, EventType, Timestamp, EventData, CreatedAt)
      VALUES 
      (@id, @videoLessonId, @userId, @sessionId, @eventType, @timestamp, @eventData, GETUTCDATE())
    `);

    res.json({ success: true });

  } catch (error) {
    console.error('Error tracking video event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// GET /api/video-progress/course/:courseId - Get user's progress for all videos in a course
router.get('/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;

    // Verify access to course
    const accessCheck = await db.query(`
      SELECT 1 as HasAccess
      FROM dbo.Courses C
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE C.Id = @courseId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { courseId, userId });

    if (!accessCheck.length) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all video progress for the course
    const result = await db.query(`
      SELECT 
        VL.Id as VideoLessonId,
        VL.LessonId,
        VL.Duration as VideoDuration,
        L.Title as LessonTitle,
        VP.LastPosition,
        VP.WatchedDuration,
        VP.CompletionPercentage,
        VP.IsCompleted,
        VP.LastWatchedAt
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      LEFT JOIN dbo.VideoProgress VP ON VP.VideoLessonId = VL.Id AND VP.UserId = @userId
      WHERE L.CourseId = @courseId
      ORDER BY L.OrderIndex
    `, { courseId, userId });

    const progress = result.map((row: any) => ({
      videoLessonId: row.VideoLessonId,
      lessonId: row.LessonId,
      lessonTitle: row.LessonTitle,
      videoDuration: row.VideoDuration,
      lastPosition: row.LastPosition || 0,
      watchedDuration: row.WatchedDuration || 0,
      completionPercentage: row.CompletionPercentage ? parseFloat(row.CompletionPercentage) : 0,
      isCompleted: row.IsCompleted || false,
      lastWatchedAt: row.LastWatchedAt
    }));

    res.json({ progress });

  } catch (error) {
    console.error('Error fetching course video progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export { router as videoProgressRoutes };
