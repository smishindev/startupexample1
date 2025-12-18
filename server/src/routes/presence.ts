import { Router } from 'express';
import { PresenceService } from '../services/PresenceService';
import { SettingsService } from '../services/SettingsService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const settingsService = new SettingsService();

/**
 * @route   GET /api/presence/online
 * @desc    Get all online users
 * @access  Private
 */
router.get('/online', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const viewerId = req.user!.userId;
    
    const users = await PresenceService.getOnlineUsers(limit);
    const count = await PresenceService.getOnlineUsersCount();

    // Apply privacy filtering
    const filteredUsers = await Promise.all(
      users.map(async (user: any) => {
        try {
          const settings = await settingsService.getUserSettings(user.UserId);
          const isOwnProfile = user.UserId === viewerId;
          return settingsService.filterUserData(user, settings, isOwnProfile);
        } catch (error) {
          return { ...user, Email: null };
        }
      })
    );

    res.json({ 
      users: filteredUsers, 
      count,
      limit 
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch online users', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/presence/course/:courseId
 * @desc    Get online users in a specific course
 * @access  Private
 */
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const viewerId = req.user!.userId;
    
    const users = await PresenceService.getOnlineUsersInCourse(courseId);

    // Apply privacy filtering
    const filteredUsers = await Promise.all(
      users.map(async (user: any) => {
        try {
          const settings = await settingsService.getUserSettings(user.UserId);
          const isOwnProfile = user.UserId === viewerId;
          return settingsService.filterUserData(user, settings, isOwnProfile);
        } catch (error) {
          return { ...user, Email: null };
        }
      })
    );

    res.json({ 
      users: filteredUsers, 
      count: filteredUsers.length,
      courseId 
    });
  } catch (error) {
    console.error('Error fetching course online users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch course online users', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/presence/user/:userId
 * @desc    Get presence status for a specific user
 * @access  Private
 */
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    
    const presence = await PresenceService.getUserPresence(userId);

    if (!presence) {
      return res.status(404).json({ message: 'User presence not found' });
    }

    res.json({ presence });
  } catch (error) {
    console.error('Error fetching user presence:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user presence', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/presence/bulk
 * @desc    Get presence for multiple users
 * @access  Private
 */
router.post('/bulk', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds must be an array' });
    }

    const presences = await PresenceService.getMultipleUserPresence(userIds);

    res.json({ 
      presences,
      count: presences.length 
    });
  } catch (error) {
    console.error('Error fetching bulk presence:', error);
    res.status(500).json({ 
      message: 'Failed to fetch presence data', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   PUT /api/presence/status
 * @desc    Update own presence status
 * @access  Private
 */
router.put('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, activity } = req.body;

    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be: online, offline, away, or busy' 
      });
    }

    const presence = await PresenceService.updatePresence({
      userId: req.user!.userId,
      status,
      activity
    });

    res.json({ 
      message: 'Presence updated successfully', 
      presence 
    });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ 
      message: 'Failed to update presence', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   PUT /api/presence/activity
 * @desc    Update own activity without changing status
 * @access  Private
 */
router.put('/activity', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { activity } = req.body;

    if (!activity || typeof activity !== 'string') {
      return res.status(400).json({ message: 'Activity string is required' });
    }

    await PresenceService.updateActivity(req.user!.userId, activity);

    res.json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ 
      message: 'Failed to update activity', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/presence/heartbeat
 * @desc    Send heartbeat to update last seen timestamp
 * @access  Private
 */
router.post('/heartbeat', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await PresenceService.updateLastSeen(req.user!.userId);

    res.json({ message: 'Heartbeat received' });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ 
      message: 'Failed to process heartbeat', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
