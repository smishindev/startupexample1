import { Router } from 'express';
import { Server } from 'socket.io';
import { LiveSessionService } from '../services/LiveSessionService';
import { NotificationService } from '../services/NotificationService';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = Router();
const notificationService = new NotificationService();

/**
 * @route   POST /api/live-sessions
 * @desc    Create a new live session (instructor only)
 * @access  Private (instructor)
 */
router.post('/', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { title, description, courseId, scheduledAt, duration, capacity, streamUrl, materials } = req.body;

    if (!title || !description || !scheduledAt) {
      return res.status(400).json({ message: 'Title, description, and scheduled time are required' });
    }

    const session = await LiveSessionService.createSession({
      title,
      description,
      instructorId: req.user!.userId,
      courseId: courseId || null,
      scheduledAt: new Date(scheduledAt),
      duration,
      capacity,
      streamUrl,
      materials
    });

    // Emit Socket.IO event to notify students about new session
    const io: Server = req.app.get('io');
    if (io && session.CourseId) {
      io.emit('session-created', {
        sessionId: session.Id,
        courseId: session.CourseId,
        title: session.Title,
        scheduledAt: session.ScheduledAt,
        instructorId: session.InstructorId
      });

      // Create persistent notifications for enrolled students
      try {
        const dbService = DatabaseService.getInstance();
        const enrolledStudents = await dbService.query<{ UserId: string }>(
          `SELECT DISTINCT UserId 
           FROM Enrollments 
           WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
          { courseId: session.CourseId }
        );

        // Create notification for each enrolled student
        for (const student of enrolledStudents) {
          const notificationId = await notificationService.createNotification({
            userId: student.UserId,
            type: 'course',
            priority: 'normal',
            title: 'New Live Session',
            message: `A new live session "${session.Title}" has been scheduled`,
            actionUrl: `/live-sessions`,
            actionText: 'View Session',
            relatedEntityId: session.Id,
            relatedEntityType: 'course'
          });

          // Emit notification-created event to the specific student
          io.to(`user-${student.UserId}`).emit('notification-created', {
            id: notificationId,
            userId: student.UserId,
            type: 'course',
            priority: 'normal',
            title: 'New Live Session',
            message: `A new live session "${session.Title}" has been scheduled`,
            actionUrl: '/live-sessions',
            actionText: 'View Session'
          });
        }
      } catch (notifError) {
        console.error('Error creating notifications:', notifError);
        // Don't fail the request if notifications fail
      }
    }

    res.status(201).json({ 
      message: 'Live session created successfully', 
      session 
    });
  } catch (error) {
    console.error('Error creating live session:', error);
    res.status(500).json({ 
      message: 'Failed to create live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/live-sessions/:sessionId
 * @desc    Get a specific live session
 * @access  Private
 */
router.get('/:sessionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    const session = await LiveSessionService.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Live session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error fetching live session:', error);
    res.status(500).json({ 
      message: 'Failed to fetch live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/live-sessions/course/:courseId
 * @desc    Get upcoming live sessions for a course
 * @access  Private
 */
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const sessions = await LiveSessionService.getUpcomingSessions(courseId, limit);

    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('Error fetching course sessions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch course sessions', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/live-sessions/instructor/my-sessions
 * @desc    Get instructor's own sessions
 * @access  Private (instructor)
 */
router.get('/instructor/my-sessions', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as 'scheduled' | 'live' | 'ended' | 'cancelled' | undefined;

    const sessions = await LiveSessionService.getInstructorSessions(req.user!.userId, status);

    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('Error fetching instructor sessions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch instructor sessions', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/live-sessions/:sessionId/start
 * @desc    Start a live session (instructor only)
 * @access  Private (instructor)
 */
router.post('/:sessionId/start', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    // Verify the instructor owns this session
    const existingSession = await LiveSessionService.getSessionById(sessionId);
    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (existingSession.InstructorId !== req.user!.userId) {
      return res.status(403).json({ message: 'You are not authorized to start this session' });
    }

    const session = await LiveSessionService.startSession(sessionId);

    // Emit Socket.IO event to notify students about session starting
    const io: Server = req.app.get('io');
    if (io && session.CourseId) {
      io.emit('session-started', {
        sessionId: session.Id,
        courseId: session.CourseId,
        title: session.Title
      });

      // Create persistent notifications for enrolled students
      try {
        const dbService = DatabaseService.getInstance();
        const enrolledStudents = await dbService.query<{ UserId: string }>(
          `SELECT DISTINCT UserId 
           FROM Enrollments 
           WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
          { courseId: session.CourseId }
        );

        // Create notification for each enrolled student
        for (const student of enrolledStudents) {
          const notificationId = await notificationService.createNotification({
            userId: student.UserId,
            type: 'course',
            priority: 'urgent',
            title: 'Session Starting Now',
            message: `The live session "${session.Title}" is starting now! Join now.`,
            actionUrl: `/live-sessions`,
            actionText: 'Join Session',
            relatedEntityId: session.Id,
            relatedEntityType: 'course'
          });

          // Emit notification-created event to the specific student
          io.to(`user-${student.UserId}`).emit('notification-created', {
            id: notificationId,
            userId: student.UserId,
            type: 'course',
            priority: 'urgent',
            title: 'Session Starting Now',
            message: `The live session "${session.Title}" is starting now! Join now.`,
            actionUrl: '/live-sessions',
            actionText: 'Join Session'
          });
        }
      } catch (notifError) {
        console.error('Error creating session start notifications:', notifError);
        // Don't fail the request if notifications fail
      }
    }

    res.json({ 
      message: 'Live session started', 
      session 
    });
  } catch (error) {
    console.error('Error starting live session:', error);
    res.status(500).json({ 
      message: 'Failed to start live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/live-sessions/:sessionId/end
 * @desc    End a live session (instructor only)
 * @access  Private (instructor)
 */
router.post('/:sessionId/end', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { recordingUrl } = req.body;

    // Verify the instructor owns this session
    const existingSession = await LiveSessionService.getSessionById(sessionId);
    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (existingSession.InstructorId !== req.user!.userId) {
      return res.status(403).json({ message: 'You are not authorized to end this session' });
    }

    const session = await LiveSessionService.endSession(sessionId, recordingUrl);

    // Emit Socket.IO event to notify students about session ending
    const io: Server = req.app.get('io');
    if (io && session.CourseId) {
      io.emit('session-ended', {
        sessionId: session.Id,
        courseId: session.CourseId,
        title: session.Title,
        endedAt: session.EndedAt
      });

      // Create persistent notifications for enrolled students
      try {
        const dbService = DatabaseService.getInstance();
        const enrolledStudents = await dbService.query<{ UserId: string }>(
          `SELECT DISTINCT UserId 
           FROM Enrollments 
           WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
          { courseId: session.CourseId }
        );

        // Create notification for each enrolled student
        for (const student of enrolledStudents) {
          const notificationId = await notificationService.createNotification({
            userId: student.UserId,
            type: 'course',
            priority: 'normal',
            title: 'Session Ended',
            message: `The live session "${session.Title}" has ended`,
            actionUrl: `/live-sessions`,
            actionText: 'View Sessions',
            relatedEntityId: session.Id,
            relatedEntityType: 'course'
          });

          // Emit notification-created event to the specific student
          io.to(`user-${student.UserId}`).emit('notification-created', {
            id: notificationId,
            userId: student.UserId,
            type: 'course',
            priority: 'normal',
            title: 'Session Ended',
            message: `The live session "${session.Title}" has ended`,
            actionUrl: '/live-sessions',
            actionText: 'View Sessions'
          });
        }
      } catch (notifError) {
        console.error('Error creating session end notifications:', notifError);
        // Don't fail the request if notifications fail
      }
    }

    res.json({ 
      message: 'Live session ended', 
      session 
    });
  } catch (error) {
    console.error('Error ending live session:', error);
    res.status(500).json({ 
      message: 'Failed to end live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/live-sessions/:sessionId/cancel
 * @desc    Cancel a scheduled session (instructor only)
 * @access  Private (instructor)
 */
router.post('/:sessionId/cancel', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    // Verify the instructor owns this session
    const existingSession = await LiveSessionService.getSessionById(sessionId);
    if (!existingSession) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (existingSession.InstructorId !== req.user!.userId) {
      return res.status(403).json({ message: 'You are not authorized to cancel this session' });
    }

    const session = await LiveSessionService.cancelSession(sessionId);

    // Emit Socket.IO event to notify students about cancelled session
    const io: Server = req.app.get('io');
    if (io && session.CourseId) {
      io.emit('session-cancelled', {
        sessionId: session.Id,
        courseId: session.CourseId,
        title: session.Title
      });

      // Create persistent notifications for enrolled students
      try {
        const dbService = DatabaseService.getInstance();
        const enrolledStudents = await dbService.query<{ UserId: string }>(
          `SELECT DISTINCT UserId 
           FROM Enrollments 
           WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
          { courseId: session.CourseId }
        );

        // Create notification for each enrolled student
        for (const student of enrolledStudents) {
          const notificationId = await notificationService.createNotification({
            userId: student.UserId,
            type: 'course',
            priority: 'high',
            title: 'Session Cancelled',
            message: `The live session "${session.Title}" has been cancelled`,
            actionUrl: `/live-sessions`,
            actionText: 'View Sessions',
            relatedEntityId: session.Id,
            relatedEntityType: 'course'
          });

          // Emit notification-created event to the specific student
          io.to(`user-${student.UserId}`).emit('notification-created', {
            id: notificationId,
            userId: student.UserId,
            type: 'course',
            priority: 'high',
            title: 'Session Cancelled',
            message: `The live session "${session.Title}" has been cancelled`,
            actionUrl: '/live-sessions',
            actionText: 'View Sessions'
          });
        }
      } catch (notifError) {
        console.error('Error creating cancellation notifications:', notifError);
        // Don't fail the request if notifications fail
      }
    }

    res.json({ 
      message: 'Live session cancelled', 
      session 
    });
  } catch (error) {
    console.error('Error cancelling live session:', error);
    res.status(500).json({ 
      message: 'Failed to cancel live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/live-sessions/:sessionId/join
 * @desc    Join a live session as attendee
 * @access  Private
 */
router.post('/:sessionId/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    const attendee = await LiveSessionService.addAttendee(sessionId, req.user!.userId);

    res.json({ 
      message: 'Joined live session successfully', 
      attendee 
    });
  } catch (error) {
    console.error('Error joining live session:', error);
    res.status(500).json({ 
      message: 'Failed to join live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/live-sessions/:sessionId/leave
 * @desc    Leave a live session
 * @access  Private
 */
router.post('/:sessionId/leave', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    await LiveSessionService.removeAttendee(sessionId, req.user!.userId);

    res.json({ message: 'Left live session successfully' });
  } catch (error) {
    console.error('Error leaving live session:', error);
    res.status(500).json({ 
      message: 'Failed to leave live session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/live-sessions/:sessionId/attendees
 * @desc    Get attendees for a live session
 * @access  Private
 */
router.get('/:sessionId/attendees', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;

    const attendees = await LiveSessionService.getSessionAttendees(sessionId);
    const activeCount = await LiveSessionService.getActiveAttendeesCount(sessionId);

    res.json({ 
      attendees, 
      totalCount: attendees.length,
      activeCount
    });
  } catch (error) {
    console.error('Error fetching session attendees:', error);
    res.status(500).json({ 
      message: 'Failed to fetch session attendees', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
