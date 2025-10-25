import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// POST /api/video-lessons - Create a video lesson entry
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      lessonId, 
      videoURL, 
      duration, 
      thumbnail, 
      transcriptURL, 
      transcriptText, 
      videoMetadata,
      fileSize 
    } = req.body;
    const userId = (req as any).user.userId;

    console.log('Creating video lesson:', { lessonId, videoURL, duration });

    // Validate required fields
    if (!lessonId || !videoURL) {
      return res.status(400).json({ 
        error: 'Missing required fields: lessonId and videoURL are required' 
      });
    }

    // Verify the lesson exists and user has permission (instructor of course)
    const lessonCheck = await db.query(`
      SELECT L.Id, L.CourseId, C.InstructorId
      FROM dbo.Lessons L
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      WHERE L.Id = @lessonId
    `, { lessonId });

    if (!lessonCheck.length) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonCheck[0];
    if (lesson.InstructorId !== userId) {
      return res.status(403).json({ 
        error: 'Only the course instructor can add video lessons' 
      });
    }

    // Check if video lesson already exists for this lesson
    const existingVideo = await db.query(
      'SELECT Id FROM dbo.VideoLessons WHERE LessonId = @lessonId',
      { lessonId }
    );

    if (existingVideo.length > 0) {
      return res.status(400).json({ 
        error: 'Video lesson already exists for this lesson. Use PUT to update.' 
      });
    }

    const videoLessonId = uuidv4();

    // Create video lesson entry
    const request = await db.getRequest();
    request.input('id', sql.UniqueIdentifier, videoLessonId);
    request.input('lessonId', sql.UniqueIdentifier, lessonId);
    request.input('videoURL', sql.NVarChar(1000), videoURL);
    request.input('duration', sql.Int, duration || 0);
    request.input('thumbnail', sql.NVarChar(500), thumbnail || null);
    request.input('transcriptURL', sql.NVarChar(1000), transcriptURL || null);
    request.input('transcriptText', sql.NVarChar(sql.MAX), transcriptText || null);
    request.input('videoMetadata', sql.NVarChar(sql.MAX), videoMetadata ? JSON.stringify(videoMetadata) : null);
    request.input('processingStatus', sql.NVarChar(20), 'ready');
    request.input('fileSize', sql.BigInt, fileSize || null);
    request.input('uploadedBy', sql.UniqueIdentifier, userId);

    await request.query(`
      INSERT INTO dbo.VideoLessons 
      (Id, LessonId, VideoURL, Duration, Thumbnail, TranscriptURL, TranscriptText, 
       VideoMetadata, ProcessingStatus, FileSize, UploadedBy, CreatedAt, UpdatedAt)
      VALUES 
      (@id, @lessonId, @videoURL, @duration, @thumbnail, @transcriptURL, @transcriptText,
       @videoMetadata, @processingStatus, @fileSize, @uploadedBy, GETUTCDATE(), GETUTCDATE())
    `);

    const videoLesson = {
      id: videoLessonId,
      lessonId,
      videoUrl: videoURL,
      duration: duration || 0,
      thumbnailUrl: thumbnail,
      transcriptUrl: transcriptURL,
      transcriptText,
      videoMetadata,
      processingStatus: 'ready',
      fileSize,
      uploadedBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      videoLesson
    });

  } catch (error) {
    console.error('Error creating video lesson:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create video lesson' 
    });
  }
});

// GET /api/video-lessons/lesson/:lessonId - Get video lesson for a specific lesson
router.get('/lesson/:lessonId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = (req as any).user.userId;

    console.log('Fetching video lesson for lesson:', lessonId);

    // Check if user has access to this lesson (enrolled or instructor)
    const accessCheck = await db.query(`
      SELECT DISTINCT 1 as HasAccess
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

    // Get video lesson
    const result = await db.query(`
      SELECT 
        Id, LessonId, VideoURL, Duration, Thumbnail, TranscriptURL, TranscriptText,
        VideoMetadata, ProcessingStatus, FileSize, UploadedBy, CreatedAt, UpdatedAt
      FROM dbo.VideoLessons
      WHERE LessonId = @lessonId
    `, { lessonId });

    if (!result.length) {
      return res.status(404).json({ error: 'Video lesson not found' });
    }

    const video = result[0];
    const videoLesson = {
      id: video.Id,
      lessonId: video.LessonId,
      videoUrl: video.VideoURL,
      duration: video.Duration,
      thumbnailUrl: video.Thumbnail,
      transcriptUrl: video.TranscriptURL,
      transcriptText: video.TranscriptText,
      videoMetadata: video.VideoMetadata ? JSON.parse(video.VideoMetadata) : null,
      processingStatus: video.ProcessingStatus,
      fileSize: video.FileSize,
      uploadedBy: video.UploadedBy,
      createdAt: video.CreatedAt,
      updatedAt: video.UpdatedAt
    };

    res.json({ videoLesson });

  } catch (error) {
    console.error('Error fetching video lesson:', error);
    res.status(500).json({ error: 'Failed to fetch video lesson' });
  }
});

// PUT /api/video-lessons/:videoId - Update video lesson
router.put('/:videoId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const { 
      videoURL, 
      duration, 
      thumbnail, 
      transcriptURL, 
      transcriptText, 
      videoMetadata,
      fileSize,
      processingStatus
    } = req.body;
    const userId = (req as any).user.userId;

    // Verify video lesson exists and user is instructor
    const videoCheck = await db.query(`
      SELECT VL.Id, VL.LessonId, C.InstructorId
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      WHERE VL.Id = @videoId
    `, { videoId });

    if (!videoCheck.length) {
      return res.status(404).json({ error: 'Video lesson not found' });
    }

    const video = videoCheck[0];
    if (video.InstructorId !== userId) {
      return res.status(403).json({ 
        error: 'Only the course instructor can update video lessons' 
      });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const request = await db.getRequest();
    request.input('videoId', sql.UniqueIdentifier, videoId);

    if (videoURL !== undefined) {
      updates.push('VideoURL = @videoURL');
      request.input('videoURL', sql.NVarChar(1000), videoURL);
    }
    if (duration !== undefined) {
      updates.push('Duration = @duration');
      request.input('duration', sql.Int, duration);
    }
    if (thumbnail !== undefined) {
      updates.push('Thumbnail = @thumbnail');
      request.input('thumbnail', sql.NVarChar(500), thumbnail);
    }
    if (transcriptURL !== undefined) {
      updates.push('TranscriptURL = @transcriptURL');
      request.input('transcriptURL', sql.NVarChar(1000), transcriptURL);
    }
    if (transcriptText !== undefined) {
      updates.push('TranscriptText = @transcriptText');
      request.input('transcriptText', sql.NVarChar(sql.MAX), transcriptText);
    }
    if (videoMetadata !== undefined) {
      updates.push('VideoMetadata = @videoMetadata');
      request.input('videoMetadata', sql.NVarChar(sql.MAX), JSON.stringify(videoMetadata));
    }
    if (fileSize !== undefined) {
      updates.push('FileSize = @fileSize');
      request.input('fileSize', sql.BigInt, fileSize);
    }
    if (processingStatus !== undefined) {
      updates.push('ProcessingStatus = @processingStatus');
      request.input('processingStatus', sql.NVarChar(20), processingStatus);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('UpdatedAt = GETUTCDATE()');

    await request.query(`
      UPDATE dbo.VideoLessons 
      SET ${updates.join(', ')}
      WHERE Id = @videoId
    `);

    res.json({ 
      success: true, 
      message: 'Video lesson updated successfully' 
    });

  } catch (error) {
    console.error('Error updating video lesson:', error);
    res.status(500).json({ error: 'Failed to update video lesson' });
  }
});

// DELETE /api/video-lessons/:videoId - Delete video lesson
router.delete('/:videoId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = (req as any).user.userId;

    // Verify video lesson exists and user is instructor
    const videoCheck = await db.query(`
      SELECT VL.Id, C.InstructorId
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      INNER JOIN dbo.Courses C ON L.CourseId = C.Id
      WHERE VL.Id = @videoId
    `, { videoId });

    if (!videoCheck.length) {
      return res.status(404).json({ error: 'Video lesson not found' });
    }

    const video = videoCheck[0];
    if (video.InstructorId !== userId) {
      return res.status(403).json({ 
        error: 'Only the course instructor can delete video lessons' 
      });
    }

    // Delete video lesson (will cascade delete progress and analytics)
    await db.execute(
      'DELETE FROM dbo.VideoLessons WHERE Id = @videoId',
      { videoId }
    );

    res.json({ 
      success: true, 
      message: 'Video lesson deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting video lesson:', error);
    res.status(500).json({ error: 'Failed to delete video lesson' });
  }
});

// GET /api/video-lessons/course/:courseId - Get all video lessons for a course
router.get('/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId;

    // Check if user has access to this course
    const accessCheck = await db.query(`
      SELECT 1 as HasAccess
      FROM dbo.Courses C
      LEFT JOIN dbo.Enrollments E ON E.CourseId = C.Id AND E.UserId = @userId
      WHERE C.Id = @courseId 
      AND (C.InstructorId = @userId OR E.UserId IS NOT NULL)
    `, { courseId, userId });

    if (!accessCheck.length) {
      return res.status(403).json({ 
        error: 'You do not have access to this course' 
      });
    }

    // Get all video lessons for the course
    const result = await db.query(`
      SELECT 
        VL.Id, VL.LessonId, VL.VideoURL, VL.Duration, VL.Thumbnail, 
        VL.TranscriptURL, VL.VideoMetadata, VL.ProcessingStatus, VL.FileSize,
        L.Title as LessonTitle, L.OrderIndex
      FROM dbo.VideoLessons VL
      INNER JOIN dbo.Lessons L ON VL.LessonId = L.Id
      WHERE L.CourseId = @courseId
      ORDER BY L.OrderIndex
    `, { courseId });

    const videoLessons = result.map((row: any) => ({
      id: row.Id,
      lessonId: row.LessonId,
      lessonTitle: row.LessonTitle,
      orderIndex: row.OrderIndex,
      videoUrl: row.VideoURL,
      duration: row.Duration,
      thumbnailUrl: row.Thumbnail,
      transcriptUrl: row.TranscriptURL,
      videoMetadata: row.VideoMetadata ? JSON.parse(row.VideoMetadata) : null,
      processingStatus: row.ProcessingStatus,
      fileSize: row.FileSize
    }));

    res.json({ videoLessons });

  } catch (error) {
    console.error('Error fetching course video lessons:', error);
    res.status(500).json({ error: 'Failed to fetch video lessons' });
  }
});

export { router as videoLessonRoutes };
