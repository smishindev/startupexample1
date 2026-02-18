/**
 * Video Analytics Routes - ContentJson-based Instructor Analytics
 * Provides aggregated video engagement metrics across all students
 */

import express, { Response } from 'express';
import { AuthRequest, authenticateToken, authorize } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = express.Router();
const db = DatabaseService.getInstance();

/**
 * GET /api/video-analytics/course/:courseId
 * Get aggregated video progress analytics for all students in a course
 * Instructor-only endpoint
 */
router.get('/course/:courseId', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is the instructor for this course
    const courseCheck = await db.query(`
      SELECT Id, InstructorId 
      FROM dbo.Courses 
      WHERE Id = @courseId AND InstructorId = @userId
    `, { courseId, userId });

    if (!courseCheck.length) {
      return res.status(403).json({ error: 'Access denied. You must be the course instructor.' });
    }

    // Get all video progress for this course's content items
    // We need to get all lessons first, then find all video contentItemIds
    const lessons = await db.query(`
      SELECT Id as LessonId
      FROM dbo.Lessons
      WHERE CourseId = @courseId
    `, { courseId });

    if (lessons.length === 0) {
      return res.json({ progress: [] });
    }

    const lessonIds = lessons.map((l: any) => l.LessonId);

    // Get all video progress for content items in these lessons (for all students)
    const progressQuery = `
      SELECT 
        vp.ContentItemId,
        vp.UserId,
        vp.WatchedDuration,
        vp.LastPosition,
        vp.CompletionPercentage,
        vp.IsCompleted,
        vp.LastWatchedAt,
        vp.CompletedAt
      FROM dbo.VideoProgress vp
      WHERE ${lessonIds.map((_: any, idx: number) => `vp.ContentItemId LIKE @lessonPrefix${idx}`).join(' OR ')}
      ORDER BY vp.ContentItemId, vp.UserId
    `;

    const progressParams = lessonIds.reduce((params: any, id: string, idx: number) => {
      params[`lessonPrefix${idx}`] = `${id}-%`;
      return params;
    }, {});

    const allProgress = await db.query(progressQuery, progressParams);

    // Return raw progress data - frontend will aggregate it
    const progress = allProgress.map((row: any) => ({
      contentItemId: row.ContentItemId,
      userId: row.UserId,
      watchedDuration: row.WatchedDuration || 0,
      lastPosition: row.LastPosition || 0,
      completionPercentage: row.CompletionPercentage ? parseFloat(row.CompletionPercentage) : 0,
      isCompleted: row.IsCompleted || false,
      lastWatchedAt: row.LastWatchedAt,
      completedAt: row.CompletedAt
    }));

    res.json({ progress });

  } catch (error) {
    console.error('Error fetching video analytics:', error);
    res.status(500).json({ error: 'Failed to fetch video analytics' });
  }
});

export { router as videoAnalyticsRoutes };
