import express, { Request, Response } from 'express';
import { NotificationService, CreateNotificationParams } from '../services/NotificationService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// NotificationService will be initialized with io in index.ts
// We'll get it from app settings in each route
const getNotificationService = (req: Request): NotificationService => {
  return req.app.get('notificationService') as NotificationService;
};

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 * Query params: includeRead, type, priority, limit, offset
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const includeRead = req.query.includeRead !== 'false'; // default true
    const type = req.query.type as string | undefined;
    const priority = req.query.priority as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const notifications = await notificationService.getUserNotifications(userId, includeRead, {
      type,
      priority,
      limit,
      offset
    });
    
    res.json({
      success: true,
      notifications,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const notificationId = req.params.id;
    const success = await notificationService.markAsRead(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the user
 */
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const count = await notificationService.markAllAsRead(userId);
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const notificationId = req.params.id;
    const success = await notificationService.deleteNotification(notificationId, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 */
router.get('/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const preferences = await notificationService.getUserPreferences(userId);
    
    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences
 */
router.patch('/preferences', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const preferences = req.body;
    const success = await notificationService.updatePreferences(userId, preferences);
    
    if (!success) {
      return res.status(400).json({ error: 'Failed to update preferences' });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

/**
 * POST /api/notifications (Admin/Instructor only - for creating manual notifications)
 * Create a new notification
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'instructor') {
      return res.status(403).json({ error: 'Only admins and instructors can create notifications' });
    }

    const notificationService = getNotificationService(req);
    const params: CreateNotificationParams = req.body;
    const notificationId = await notificationService.createNotification(params);
    
    if (!notificationId) {
      return res.status(400).json({ 
        error: 'Notification not created (possibly blocked by user preferences or quiet hours)' 
      });
    }

    res.json({
      success: true,
      message: 'Notification created',
      notificationId
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * GET /api/notifications/queue/count
 * Get count of queued notifications for the authenticated user
 */
router.get('/queue/count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const count = await notificationService.getQueuedCount(userId);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error getting queued count:', error);
    res.status(500).json({ error: 'Failed to get queued count' });
  }
});

/**
 * POST /api/notifications/test
 * Test notification endpoint (Development only)
 */
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const { type, priority, title, message, subcategory } = req.body;
    
    // Use createNotificationWithControls to respect granular preferences
    const notificationId = await notificationService.createNotificationWithControls(
      {
        userId,
        type: type || 'progress',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        priority: priority || 'normal'
      },
      {
        category: 'progress',
        subcategory: subcategory || 'LessonCompletion'
      }
    );
    
    res.json({
      success: true,
      message: notificationId ? 'Test notification created' : 'Notification blocked by preferences',
      notificationId
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

/**
 * POST /api/notifications/test-all-types
 * Test all 6 notification types with email (Development only)
 */
router.post('/test-all-types', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const results = [];

    // Define all 6 notification types with realistic examples
    const testNotifications = [
      {
        type: 'progress' as const,
        priority: 'normal' as const,
        title: 'Lesson Completed!',
        message: 'Congratulations! You have completed "Introduction to TypeScript" with a score of 95%. Keep up the great work!',
        actionUrl: '/courses/typescript-101/lessons/intro',
        actionText: 'Continue Learning'
      },
      {
        type: 'risk' as const,
        priority: 'urgent' as const,
        title: 'At-Risk Alert',
        message: 'Your performance in "Advanced JavaScript" has declined. You haven\'t completed any lessons in the past 7 days. Your instructor recommends reviewing the material.',
        actionUrl: '/courses/javascript-advanced',
        actionText: 'View Course'
      },
      {
        type: 'achievement' as const,
        priority: 'high' as const,
        title: '🏆 Achievement Unlocked!',
        message: 'You\'ve earned the "Week Streak Master" badge! You\'ve completed lessons for 7 consecutive days. Amazing dedication!',
        actionUrl: '/profile',
        actionText: 'View Achievements'
      },
      {
        type: 'intervention' as const,
        priority: 'high' as const,
        title: 'Instructor Feedback',
        message: 'Your instructor has reviewed your latest assignment and provided detailed feedback. Great work on the project structure!',
        actionUrl: '/courses/web-dev/assignments/final-project',
        actionText: 'View Feedback'
      },
      {
        type: 'assignment' as const,
        priority: 'normal' as const,
        title: 'Assignment Due Soon',
        message: 'Reminder: "Build a REST API" assignment is due in 2 days (Dec 30, 2025). You\'ve completed 60% of the requirements.',
        actionUrl: '/courses/backend-dev/assignments/rest-api',
        actionText: 'Continue Assignment'
      },
      {
        type: 'course' as const,
        priority: 'low' as const,
        title: 'New Content Available',
        message: 'New lessons have been added to "React Mastery": Advanced Hooks, Performance Optimization, and Testing Best Practices.',
        actionUrl: '/courses/react-mastery',
        actionText: 'Explore New Content'
      }
    ];

    // Send each notification
    for (const notification of testNotifications) {
      try {
        const notificationId = await notificationService.createNotification({
          userId,
          ...notification
        });
        
        results.push({
          type: notification.type,
          success: true,
          notificationId,
          message: notificationId ? 'Sent' : 'Queued or blocked'
        });
      } catch (error: any) {
        results.push({
          type: notification.type,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Sent ${testNotifications.length} test notifications of all types`,
      results,
      info: 'Check your email (if realtime notifications enabled) and notification bell'
    });
  } catch (error) {
    console.error('Error sending test notifications:', error);
    res.status(500).json({ error: 'Failed to send test notifications' });
  }
});

export default router;
