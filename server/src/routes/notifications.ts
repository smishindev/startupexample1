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
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notificationService = getNotificationService(req);
    const includeRead = req.query.includeRead !== 'false'; // default true
    const notifications = await notificationService.getUserNotifications(userId, includeRead);
    
    res.json({
      success: true,
      notifications
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
    const { type, priority, title, message } = req.body;
    
    const params: CreateNotificationParams = {
      userId,
      type: type || 'progress',
      priority: priority || 'normal',
      title: title || 'Test Notification',
      message: message || 'This is a test notification'
    };
    
    const notificationId = await notificationService.createNotification(params);
    
    res.json({
      success: true,
      message: notificationId ? 'Test notification created' : 'Notification queued or blocked by preferences',
      notificationId
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

export default router;
