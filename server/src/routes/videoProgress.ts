import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';

const router = Router();
const db = DatabaseService.getInstance();

// Helper function to parse contentItemId and get lesson/video data
// ContentItemId format: {lessonId}-{type}-{uniqueId} where uniqueId is UUID suffix
const getVideoDataFromContentItemId = async (contentItemId: string, userId: string) => {
  const parts = contentItemId.split('-');
  if (parts.length < 3) {
    throw new Error('Invalid contentItemId format');
  }
  
  // Extract content type (second-to-last part)
  const contentType = parts[parts.length - 2];
  const lessonId = parts.slice(0, -2).join('-');
  
  // Get lesson data with access verification
  const lessonData = await db.query(`
    SELECT L.Id, L.Title, L.ContentJson, L.CourseId
    FROM dbo.Lessons L
    INNER JOIN dbo.Courses C ON L.CourseId = C.Id
    LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
    WHERE L.Id = @lessonId
    AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
  `, { lessonId, userId });
  
  if (!lessonData.length) {
    throw new Error('Lesson not found or access denied');
  }
  
  const content = JSON.parse(lessonData[0].ContentJson || '[]');
  const contentItem = content.find((item: any) => item.id === contentItemId);
  
  if (!contentItem) {
    throw new Error(`Content item not found in lesson: ${contentItemId}`);
  }
  
  // For non-video content, duration might not exist
  const duration = contentItem.data?.duration || 0;
  
  return {
    lessonId,
    lessonTitle: lessonData[0].Title,
    courseId: lessonData[0].CourseId,
    videoDuration: duration,
    videoUrl: contentItem.data?.url || contentItem.url || '',
    contentItemId,
    contentType: contentItem.type
  };
};

// POST /api/video-progress/:videoLessonId/update - Update video watch progress
// Note: Route param is named videoLessonId for backward compatibility, but it's actually contentItemId format
router.post('/:videoLessonId/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    const contentItemId = req.params.videoLessonId; // Route param named videoLessonId for backward compatibility
    const { lastPosition, watchedDuration, playbackSpeed } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (lastPosition === undefined) {
      return res.status(400).json({ 
        error: 'lastPosition is required' 
      });
    }

    // Use contentItemId format: {lessonId}-{type}-{index}
    
    let videoDuration = 0;

    // Get video data from contentItemId
    const videoData = await getVideoDataFromContentItemId(contentItemId, userId);
    videoDuration = videoData.videoDuration;
    console.log(`[VIDEO-PROGRESS] Using contentItemId: ${contentItemId}`);
    
    // Calculate completion percentage
    const completionPercentage = videoDuration > 0 
      ? Math.min(100, (lastPosition / videoDuration) * 100) 
      : 0;
    
    // Mark as completed if watched >= 90% of the video
    const isCompleted = completionPercentage >= 90;

    // Check if progress record exists using ContentItemId
    const existingProgress = await db.query(
      'SELECT Id FROM dbo.VideoProgress WHERE UserId = @userId AND ContentItemId = @contentItemId',
      { userId, contentItemId }
    );

    const request = await db.getRequest();
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('contentItemId', sql.NVarChar(100), contentItemId);
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
          IsCompleted = CASE 
            WHEN IsCompleted = 1 THEN 1 
            ELSE @isCompleted 
          END,
          PlaybackSpeed = @playbackSpeed,
          LastWatchedAt = @lastWatchedAt,
          CompletedAt = CASE 
            WHEN @isCompleted = 1 AND CompletedAt IS NULL THEN @lastWatchedAt 
            ELSE CompletedAt 
          END,
          UpdatedAt = GETUTCDATE()
        WHERE UserId = @userId AND ContentItemId = @contentItemId
      `;
      await request.query(updateQuery);
    } else {
      // Insert new progress record
      request.input('id', sql.UniqueIdentifier, uuidv4());
      request.input('completedAt', sql.DateTime2, isCompleted ? new Date() : null);
      
      try {
        const insertQuery = `
          INSERT INTO dbo.VideoProgress 
          (Id, UserId, ContentItemId, WatchedDuration, LastPosition, CompletionPercentage, 
           IsCompleted, PlaybackSpeed, LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt)
          VALUES 
          (@id, @userId, @contentItemId, @watchedDuration, @lastPosition, @completionPercentage,
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
              ContentItemId = @contentItemId,
              CompletionPercentage = @completionPercentage,
              IsCompleted = CASE 
                WHEN IsCompleted = 1 THEN 1 
                ELSE @isCompleted 
              END,
              PlaybackSpeed = @playbackSpeed,
              LastWatchedAt = @lastWatchedAt,
              CompletedAt = CASE 
                WHEN @isCompleted = 1 AND CompletedAt IS NULL THEN @lastWatchedAt 
                ELSE CompletedAt 
              END,
              UpdatedAt = GETUTCDATE()
            WHERE UserId = @userId AND ContentItemId = @contentItemId
          `;
          await request.query(updateQuery);
        } else {
          throw insertError;
        }
      }
    }

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

// GET /api/video-progress/:contentItemId - Get user's progress for a video/content item
router.get('/:videoLessonId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const contentItemId = req.params.videoLessonId; // Route param named videoLessonId for backward compatibility
    const userId = (req as any).user.userId;

    // Verify access via contentItemId (parse lessonId from it)
    const videoData = await getVideoDataFromContentItemId(contentItemId, userId);

    // Get progress
    const result = await db.query(`
      SELECT 
        Id, UserId, ContentItemId, WatchedDuration, LastPosition, 
        CompletionPercentage, IsCompleted, PlaybackSpeed, 
        LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt
      FROM dbo.VideoProgress
      WHERE UserId = @userId AND ContentItemId = @contentItemId
    `, { userId, contentItemId });

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

// POST /api/video-progress/:contentItemId/complete - Mark video as completed
router.post('/:videoLessonId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const contentItemId = req.params.videoLessonId; // Route param named videoLessonId for backward compatibility
    const userId = (req as any).user.userId;

    let videoDuration = 0;
    let lessonId = '';
    let lessonTitle = '';
    let courseId = '';

    // Get video data from contentItemId
    const videoData = await getVideoDataFromContentItemId(contentItemId, userId);
    videoDuration = videoData.videoDuration;
    lessonId = videoData.lessonId;
    lessonTitle = videoData.lessonTitle;
    courseId = videoData.courseId;
      
    // Update or create progress record marking as completed
    const request = await db.getRequest();
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('contentItemId', sql.NVarChar(100), contentItemId);
    request.input('duration', sql.Int, videoDuration);
    request.input('completedAt', sql.DateTime2, new Date());

    // Use MERGE to handle insert or update, and OUTPUT to detect if it was already completed
    const result = await request.query(`
      DECLARE @WasAlreadyCompleted BIT;
      
      MERGE INTO dbo.VideoProgress AS target
      USING (SELECT @userId as UserId, @contentItemId as ContentItemId) AS source
      ON (target.UserId = source.UserId AND target.ContentItemId = source.ContentItemId)
      WHEN MATCHED THEN
        UPDATE SET 
          @WasAlreadyCompleted = IsCompleted,
          IsCompleted = 1,
          CompletionPercentage = 100.00,
          CompletedAt = CASE WHEN CompletedAt IS NULL THEN @completedAt ELSE CompletedAt END,
          UpdatedAt = GETUTCDATE()
      WHEN NOT MATCHED THEN
        INSERT (Id, UserId, ContentItemId, WatchedDuration, LastPosition, 
                CompletionPercentage, IsCompleted, PlaybackSpeed, 
                LastWatchedAt, CompletedAt, CreatedAt, UpdatedAt)
        VALUES (NEWID(), @userId, @contentItemId, @duration, @duration,
                100.00, 1, 1.00, @completedAt, @completedAt, GETUTCDATE(), GETUTCDATE());
      
      SELECT ISNULL(@WasAlreadyCompleted, 0) as WasAlreadyCompleted;
    `);

    const wasAlreadyCompleted = result.recordset && result.recordset[0]?.WasAlreadyCompleted === 1;

    const durationMinutes = Math.round(videoDuration / 60);

    // Only send notification if this is the first time completing the content
    if (!wasAlreadyCompleted) {
      // Determine content type from contentItemId format: {lessonId}-{type}-{index}
      const contentType = contentItemId.split('-').slice(-2, -1)[0] || 'video'; // Extract type from ID
      
      // Get io instance and create notification service
      const io = req.app.get('io');
      const notificationService = new NotificationService(io);

      // Send appropriate notification based on content type
      try {
        let notificationData;
        
        if (contentType === 'video') {
          notificationData = {
            title: 'Video Completed!',
            message: `You finished watching the video in "${lessonTitle}". Duration: ${durationMinutes} minutes`,
            subcategory: 'VideoCompletion'
          };
        } else if (contentType === 'text') {
          notificationData = {
            title: 'Content Completed!',
            message: `You finished reading the content in "${lessonTitle}".`,
            subcategory: 'LessonCompletion'
          };
        } else if (contentType === 'quiz') {
          notificationData = {
            title: 'Quiz Completed!',
            message: `You completed the quiz in "${lessonTitle}".`,
            subcategory: 'LessonCompletion'
          };
        } else {
          // Fallback for unknown types
          notificationData = {
            title: 'Content Completed!',
            message: `You completed content in "${lessonTitle}".`,
            subcategory: 'LessonCompletion'
          };
        }

        await notificationService.createNotificationWithControls(
          {
            userId: userId!,
            type: 'progress',
            priority: 'low',
            title: notificationData.title,
            message: notificationData.message,
            actionUrl: `/courses/${courseId}/lessons/${lessonId}`,
            actionText: 'Continue to Next Lesson'
          },
          {
            category: 'progress',
            subcategory: notificationData.subcategory
          }
        );
        console.log(`✅ ${contentType} completion notification sent to user ${userId}`);
      } catch (notifError) {
        console.error('⚠️ Failed to send content completion notification:', notifError);
      }
    } else {
      console.log(`ℹ️ Content already completed, skipping duplicate notification for user ${userId}`);
    }

    res.json({
      success: true,
      message: 'Video marked as completed'
    });

  } catch (error) {
    console.error('Error marking video as complete:', error);
    res.status(500).json({ error: 'Failed to mark video as complete' });
  }
});

// GET /api/video-progress/lesson/:lessonId - Get all content progress for a lesson
router.get('/lesson/:lessonId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = (req as any).user.userId;

    // Verify access to lesson
    const accessCheck = await db.query(`
      SELECT 1 as HasAccess
      FROM dbo.Lessons L
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE L.Id = @lessonId
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { lessonId, userId });

    if (!accessCheck.length) {
      return res.status(403).json({ 
        error: 'You do not have access to this lesson' 
      });
    }

    // Get video progress for all content items in this lesson (using ContentItemId)
    const result = await db.query(`
      SELECT 
        ContentItemId, WatchedDuration, LastPosition, 
        CompletionPercentage, IsCompleted, LastWatchedAt, CompletedAt
      FROM dbo.VideoProgress
      WHERE UserId = @userId 
      AND ContentItemId LIKE @lessonPrefix
    `, { 
      userId, 
      lessonId,
      lessonPrefix: `${lessonId}-%`
    });

    const progress = result.map((row: any) => ({
      contentItemId: row.ContentItemId,
      lastPosition: row.LastPosition || 0,
      watchedDuration: row.WatchedDuration || 0,
      completionPercentage: row.CompletionPercentage ? parseFloat(row.CompletionPercentage) : 0,
      isCompleted: row.IsCompleted || false,
      lastWatchedAt: row.LastWatchedAt,
      completedAt: row.CompletedAt,
      totalDuration: 0 // Will be enriched by frontend if needed
    }));

    res.json({ progress });

  } catch (error) {
    console.error('Error fetching lesson content progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// GET /api/video-progress/course/:courseId - Get user's progress for all content items in a course
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

    // Get all lessons for the course with their ContentJson
    const lessons = await db.query(`
      SELECT 
        L.Id as LessonId,
        L.Title as LessonTitle,
        L.ContentJson,
        L.OrderIndex
      FROM dbo.Lessons L
      WHERE L.CourseId = @courseId
      ORDER BY L.OrderIndex
    `, { courseId });

    // Get all progress for content items in these lessons
    const lessonIds = lessons.map((l: any) => l.LessonId);
    if (lessonIds.length === 0) {
      return res.json({ progress: [] });
    }

    // Build contentItemId pattern for all lessons (lessonId-%)
    const progressResult = await db.query(`
      SELECT 
        ContentItemId,
        LastPosition,
        WatchedDuration,
        CompletionPercentage,
        IsCompleted,
        LastWatchedAt,
        CompletedAt
      FROM dbo.VideoProgress
      WHERE UserId = @userId
      AND (${lessonIds.map((_: any, idx: number) => `ContentItemId LIKE @lessonPrefix${idx}`).join(' OR ')})
    `, lessonIds.reduce((params: any, id: string, idx: number) => {
      params[`lessonPrefix${idx}`] = `${id}-%`;
      return params;
    }, { userId }));

    // Map progress by contentItemId
    const progressMap: any = {};
    progressResult.forEach((row: any) => {
      progressMap[row.ContentItemId] = {
        lastPosition: row.LastPosition || 0,
        watchedDuration: row.WatchedDuration || 0,
        completionPercentage: row.CompletionPercentage ? parseFloat(row.CompletionPercentage) : 0,
        isCompleted: row.IsCompleted || false,
        lastWatchedAt: row.LastWatchedAt,
        completedAt: row.CompletedAt
      };
    });

    // Build response with lesson info and progress
    const progress = lessons.flatMap((lesson: any) => {
      try {
        const content = lesson.ContentJson ? JSON.parse(lesson.ContentJson) : [];
        return content
          .filter((item: any) => item.type === 'video') // Only videos for this endpoint
          .map((item: any) => ({
            contentItemId: item.id,
            lessonId: lesson.LessonId,
            lessonTitle: lesson.LessonTitle,
            videoDuration: item.data?.duration || 0,
            ...progressMap[item.id] || {
              lastPosition: 0,
              watchedDuration: 0,
              completionPercentage: 0,
              isCompleted: false,
              lastWatchedAt: null,
              completedAt: null
            }
          }));
      } catch (e) {
        console.error(`Failed to parse ContentJson for lesson ${lesson.LessonId}`, e);
        return [];
      }
    });
    res.json({ progress });

  } catch (error) {
    console.error('Error fetching course video progress:', error);
    res.status(500).json({ error: 'Failed to fetch video progress' });
  }
});

export { router as videoProgressRoutes };