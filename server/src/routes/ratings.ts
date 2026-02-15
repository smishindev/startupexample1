import express from 'express';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import { RatingService } from '../services/RatingService';
import { NotificationService } from '../services/NotificationService';
import { CourseEventService } from '../services/CourseEventService';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

const router = express.Router();
const ratingService = new RatingService();
const db = DatabaseService.getInstance();

// GET /api/ratings/courses/:courseId - Get paginated ratings for a course (public)
router.get('/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = '1', limit = '10', sort = 'newest' } = req.query;

    const result = await ratingService.getCourseRatings(
      courseId,
      parseInt(page as string, 10),
      parseInt(limit as string, 10),
      sort as 'newest' | 'oldest' | 'highest' | 'lowest'
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to fetch course ratings', { error, courseId: req.params.courseId });
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// GET /api/ratings/courses/:courseId/summary - Get rating distribution (public)
router.get('/courses/:courseId/summary', async (req, res) => {
  try {
    const { courseId } = req.params;
    const summary = await ratingService.getRatingSummary(courseId);
    res.json(summary);
  } catch (error) {
    logger.error('Failed to fetch rating summary', { error, courseId: req.params.courseId });
    res.status(500).json({ error: 'Failed to fetch rating summary' });
  }
});

// GET /api/ratings/courses/:courseId/my-rating - Get current user's rating (authenticated)
router.get('/courses/:courseId/my-rating', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.userId;

    const rating = await ratingService.getUserRating(userId, courseId);
    res.json({ rating });
  } catch (error) {
    logger.error('Failed to fetch user rating', { error, userId: (req as AuthRequest).user?.userId });
    res.status(500).json({ error: 'Failed to fetch your rating' });
  }
});

// POST /api/ratings/courses/:courseId - Submit or update a rating (authenticated)
router.post('/courses/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.userId;
    const { rating, reviewText } = req.body;

    // Validate rating
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Validate reviewText length
    if (reviewText && typeof reviewText === 'string' && reviewText.trim().length > 2000) {
      return res.status(400).json({ error: 'Review text must be 2000 characters or less' });
    }

    // Check if user can rate
    const { canRate, reason } = await ratingService.canUserRate(userId, courseId);
    if (!canRate) {
      return res.status(403).json({ error: reason });
    }

    // Submit rating (upsert)
    const result = await ratingService.submitRating(userId, courseId, rating, reviewText);
    
    res.json({
      success: true,
      message: result.isNew ? 'Rating submitted successfully' : 'Rating updated successfully',
      rating: result.rating,
      isNew: result.isNew,
    });

    // Emit real-time update (after res.json, isolated try-catch)
    try {
      const courseEventService = CourseEventService.getInstance();
      courseEventService.emitCourseUpdated(courseId, ['rating']);
    } catch (emitError) {
      logger.error('[Ratings] Failed to emit course update:', { error: emitError });
    }

    // Send notification to instructor for new and updated ratings
    try {
      const notificationService: NotificationService = req.app.get('notificationService');
      
      // Get course info for notification
      const courseInfo = await db.query(`
        SELECT c.Title, c.InstructorId, u.FirstName, u.LastName
        FROM Courses c
        INNER JOIN Users u ON u.Id = @userId
        WHERE c.Id = @courseId
      `, { courseId, userId });

      if (courseInfo.length > 0 && courseInfo[0].InstructorId) {
        const course = courseInfo[0];
        const studentName = `${course.FirstName} ${course.LastName}`;

        if (result.isNew) {
          await notificationService.createNotification({
            userId: course.InstructorId,
            type: 'course',
            priority: 'normal',
            title: 'New Course Rating',
            message: `${studentName} rated "${course.Title}" ${rating}/5 stars${reviewText ? ' and left a review' : ''}`,
            actionUrl: `/courses/${courseId}#reviews`,
            actionText: 'View Rating',
            relatedEntityId: courseId,
            relatedEntityType: 'course',
          });
        } else {
          await notificationService.createNotification({
            userId: course.InstructorId,
            type: 'course',
            priority: 'low',
            title: 'Course Rating Updated',
            message: `${studentName} updated their rating for "${course.Title}" to ${rating}/5 stars`,
            actionUrl: `/courses/${courseId}#reviews`,
            actionText: 'View Rating',
            relatedEntityId: courseId,
            relatedEntityType: 'course',
          });
        }
      }
    } catch (notifError) {
      logger.error('[Ratings] Failed to send notification:', { error: notifError });
    }
  } catch (error) {
    logger.error('Failed to submit rating', { error, userId: (req as AuthRequest).user?.userId });
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// DELETE /api/ratings/courses/:courseId - Delete your own rating (authenticated)
router.delete('/courses/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.userId;

    // Check if rating exists
    const existing = await ratingService.getUserRating(userId, courseId);
    if (!existing) {
      return res.status(404).json({ error: 'No rating found to delete' });
    }

    await ratingService.deleteRating(userId, courseId);

    res.json({ success: true, message: 'Rating deleted successfully' });

    // Emit real-time update (after res.json, isolated try-catch)
    try {
      const courseEventService = CourseEventService.getInstance();
      courseEventService.emitCourseUpdated(courseId, ['rating']);
    } catch (emitError) {
      logger.error('[Ratings] Failed to emit course update on delete:', { error: emitError });
    }
  } catch (error) {
    logger.error('Failed to delete rating', { error, userId: (req as AuthRequest).user?.userId });
    res.status(500).json({ error: 'Failed to delete rating' });
  }
});

// GET /api/ratings/instructor/summary - Get instructor's rating summary (authenticated instructor)
router.get('/instructor/summary', authenticateToken, authorize(['instructor', 'admin']), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const summary = await ratingService.getInstructorRatingSummary(userId);
    res.json(summary);
  } catch (error) {
    logger.error('Failed to fetch instructor rating summary', { error, userId: (req as AuthRequest).user?.userId });
    res.status(500).json({ error: 'Failed to fetch instructor rating summary' });
  }
});

export default router;
