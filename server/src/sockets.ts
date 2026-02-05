import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './services/DatabaseService';
import { LiveSessionService } from './services/LiveSessionService';
import { PresenceService } from './services/PresenceService';
import { ChatService } from './services/ChatService';

const db = DatabaseService.getInstance();

interface AuthenticatedSocket {
  id: string;
  userId?: string;
  userEmail?: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  to: (room: string) => any;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data?: any) => void) => void;
}

export const setupSocketHandlers = (io: Server) => {
  // Middleware to authenticate socket connections
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('🟢 [Socket.IO] ===== USER CONNECTED =====');
    console.log('   - Socket ID:', socket.id);
    console.log('   - User ID:', socket.userId);
    console.log('   - User Email:', socket.userEmail);

    // Join user to their personal room for direct messages
    if (socket.userId) {
      const userRoom = `user-${socket.userId}`;
      socket.join(userRoom);
      console.log(`✅ [Socket.IO] User ${socket.userId} joined room: "${userRoom}"`);
      
      // Set user online presence
      PresenceService.setUserOnline(socket.userId).catch(err => {
        console.error('Error setting user online:', err);
      });

      // Join user to all their enrolled course rooms
      db.query<{ CourseId: string }>(
        `SELECT DISTINCT CourseId FROM Enrollments WHERE UserId = @userId AND Status IN ('active', 'completed')`,
        { userId: socket.userId }
      ).then(enrollments => {
        enrollments.forEach(e => {
          if (e.CourseId) {
            socket.join(`course-${e.CourseId}`);
          }
        });
        console.log(`User ${socket.userId} joined ${enrollments.length} course rooms`);
      }).catch(err => {
        console.error('Error joining course rooms:', err);
      });

      // Join instructor to all their course rooms
      db.query<{ Id: string }>(
        `SELECT DISTINCT Id FROM Courses WHERE InstructorId = @instructorId`,
        { instructorId: socket.userId }
      ).then(courses => {
        courses.forEach(c => {
          if (c.Id) {
            socket.join(`course-${c.Id}`);
          }
        });
        if (courses.length > 0) {
          console.log(`Instructor ${socket.userId} joined ${courses.length} course rooms`);
        }
      }).catch(err => {
        console.error('Error joining instructor course rooms:', err);
      });
    }

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Don't immediately set user offline on socket disconnect
      // The status (away/busy/online) should persist across page refreshes
      // Users will be marked offline by the inactivity checker after 5 minutes
      // or when they explicitly log out
      
      // Just update LastSeenAt to current time
      if (socket.userId) {
        try {
          const existing = await PresenceService.getUserPresence(socket.userId);
          if (existing) {
            await PresenceService.updatePresence({
              userId: socket.userId,
              status: existing.Status, // Keep existing status
              activity: existing.Activity || undefined
            });
            console.log('[PRESENCE] Socket disconnected, preserving status:', existing.Status);
          }
        } catch (err) {
          console.error('Error updating LastSeenAt on disconnect:', err);
        }
      }
    });

    // ========================================
    // Chat Room Events (Updated Feb 5, 2026)
    // ========================================

    // Join chat room
    socket.on('chat:join-room', async (roomId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('chat:error', { message: 'User not authenticated' });
          return;
        }

        // Verify user is participant using ChatParticipants table
        const result = await db.query(`
          SELECT 1 FROM dbo.ChatParticipants
          WHERE RoomId = @roomId AND UserId = @userId AND IsActive = 1
        `, { roomId, userId: socket.userId });

        if (result.length === 0) {
          socket.emit('chat:error', { message: 'Not authorized to join this room' });
          return;
        }

        const chatRoomName = `chat-room-${roomId}`;
        socket.join(chatRoomName);
        console.log(`✅ [Chat] User ${socket.userId} joined chat room ${roomId}`);

        // Notify other participants
        socket.to(chatRoomName).emit('chat:user-joined', {
          userId: socket.userId,
          roomId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error joining chat room:', error);
        socket.emit('chat:error', { message: 'Failed to join room' });
      }
    });

    // Leave chat room
    socket.on('chat:leave-room', (roomId: string) => {
      const chatRoomName = `chat-room-${roomId}`;
      socket.leave(chatRoomName);
      console.log(`👋 [Chat] User ${socket.userId} left chat room ${roomId}`);

      // Notify other participants
      socket.to(chatRoomName).emit('chat:user-left', {
        userId: socket.userId,
        roomId,
        timestamp: new Date().toISOString()
      });
    });

    // Typing indicators
    socket.on('chat:typing-start', (roomId: string) => {
      socket.to(`chat-room-${roomId}`).emit('chat:user-typing', {
        userId: socket.userId,
        roomId,
        isTyping: true
      });
    });

    socket.on('chat:typing-stop', (roomId: string) => {
      socket.to(`chat-room-${roomId}`).emit('chat:user-typing', {
        userId: socket.userId,
        roomId,
        isTyping: false
      });
    });

    // ========================================
    // Phase 2: Live Session Events
    // ========================================

    // Join a live session room
    socket.on('join-live-session', async (data: { sessionId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Verify session exists and is live
        const session = await LiveSessionService.getSessionById(data.sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.Status !== 'live') {
          socket.emit('error', { message: 'Session is not currently live' });
          return;
        }

        // Join the session room
        socket.join(`session-${data.sessionId}`);
        
        // Broadcast to others that someone joined
        socket.to(`session-${data.sessionId}`).emit('session-participant-joined', {
          userId: socket.userId,
          sessionId: data.sessionId,
          timestamp: new Date()
        });

        socket.emit('joined-live-session', { 
          sessionId: data.sessionId,
          message: 'Successfully joined live session'
        });

        console.log(`User ${socket.userId} joined live session ${data.sessionId}`);
      } catch (error) {
        console.error('Error joining live session:', error);
        socket.emit('error', { message: 'Failed to join live session' });
      }
    });

    // Leave a live session room
    socket.on('leave-live-session', (data: { sessionId: string }) => {
      socket.leave(`session-${data.sessionId}`);
      
      // Broadcast to others that someone left
      socket.to(`session-${data.sessionId}`).emit('session-participant-left', {
        userId: socket.userId,
        sessionId: data.sessionId,
        timestamp: new Date()
      });

      socket.emit('left-live-session', { sessionId: data.sessionId });
      console.log(`User ${socket.userId} left live session ${data.sessionId}`);
    });

    // Send a message in a live session
    socket.on('session-message', async (data: {
      sessionId: string;
      content: string;
      messageType?: 'text' | 'question' | 'poll';
    }) => {
      try {
        // Get user info
        const userInfo = await db.query(`
          SELECT FirstName, LastName, Email FROM dbo.Users WHERE Id = @userId
        `, { userId: socket.userId });

        const messageData = {
          id: require('uuid').v4(),
          sessionId: data.sessionId,
          content: data.content,
          messageType: data.messageType || 'text',
          createdAt: new Date().toISOString(),
          user: {
            id: socket.userId,
            firstName: userInfo[0]?.FirstName,
            lastName: userInfo[0]?.LastName,
            email: userInfo[0]?.Email
          }
        };

        // Broadcast to all in session (including sender for confirmation)
        io.to(`session-${data.sessionId}`).emit('session-new-message', messageData);
        console.log(`Broadcasting session message to session ${data.sessionId}`);
      } catch (error) {
        console.error('Error broadcasting session message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator in live session
    socket.on('session-typing-start', (data: { sessionId: string }) => {
      socket.to(`session-${data.sessionId}`).emit('session-user-typing', {
        userId: socket.userId,
        email: socket.userEmail,
        sessionId: data.sessionId
      });
    });

    socket.on('session-typing-stop', (data: { sessionId: string }) => {
      socket.to(`session-${data.sessionId}`).emit('session-user-stop-typing', {
        userId: socket.userId,
        sessionId: data.sessionId
      });
    });

    // ========================================
    // Phase 2: Presence Events
    // ========================================

    // Update user presence status
    socket.on('update-presence', async (data: {
      status: 'online' | 'offline' | 'away' | 'busy';
      activity?: string;
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        await PresenceService.updatePresence({
          userId: socket.userId,
          status: data.status,
          activity: data.activity
        });

        socket.emit('presence-updated', { 
          status: data.status,
          activity: data.activity 
        });
      } catch (error) {
        console.error('Error updating presence:', error);
        socket.emit('error', { message: 'Failed to update presence' });
      }
    });

    // Heartbeat to keep user online
    socket.on('presence-heartbeat', async () => {
      try {
        if (socket.userId) {
          await PresenceService.updateLastSeen(socket.userId);
        }
      } catch (error) {
        console.error('Error processing heartbeat:', error);
      }
    });

    // Update activity without changing status
    socket.on('update-activity', async (data: { activity: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        await PresenceService.updateActivity(socket.userId, data.activity);
        socket.emit('activity-updated', { activity: data.activity });
      } catch (error) {
        console.error('Error updating activity:', error);
        socket.emit('error', { message: 'Failed to update activity' });
      }
    });

    // ========================================
    // Phase 2: Study Group Events
    // ========================================

    // Join a study group room (for real-time updates, does NOT mean joining as a member)
    socket.on('join-study-group', (data: { groupId: string }) => {
      socket.join(`study-group-${data.groupId}`);
      // Do NOT emit member-joined - that's only for actual group membership changes
      console.log(`User ${socket.userId} joined study group room ${data.groupId} (socket only)`);
    });

    // Leave a study group room (socket only, does NOT mean leaving as a member)
    socket.on('leave-study-group', (data: { groupId: string }) => {
      socket.leave(`study-group-${data.groupId}`);
      // Do NOT emit member-left - that's only for actual group membership changes
      console.log(`User ${socket.userId} left study group room ${data.groupId} (socket only)`);
    });

    // ========================================
    // Phase 2: Office Hours Events
    // ========================================

    // Instructor joins office hours room (to receive queue updates)
    socket.on('join-office-hours', (data: { instructorId: string }) => {
      socket.join(`office-hours-${data.instructorId}`);
      console.log(`Instructor ${socket.userId} joined office hours room ${data.instructorId}`);
    });

    // Instructor leaves office hours room
    socket.on('leave-office-hours', (data: { instructorId: string }) => {
      socket.leave(`office-hours-${data.instructorId}`);
      console.log(`Instructor ${socket.userId} left office hours room ${data.instructorId}`);
    });

    // Join office hours queue
    socket.on('join-office-hours-queue', (data: { 
      instructorId: string;
      queueId: string;
    }) => {
      // Join instructor's office hours room to get updates
      socket.join(`office-hours-${data.instructorId}`);
      
      // Notify instructor of new queue member
      socket.to(`office-hours-${data.instructorId}`).emit('queue-member-joined', {
        queueId: data.queueId,
        studentId: socket.userId,
        timestamp: new Date()
      });

      socket.emit('joined-office-hours-queue', { 
        instructorId: data.instructorId,
        queueId: data.queueId
      });
      
      console.log(`User ${socket.userId} joined office hours queue for instructor ${data.instructorId}`);
    });

    // Leave office hours queue
    socket.on('leave-office-hours-queue', (data: { 
      instructorId: string;
      queueId: string;
    }) => {
      socket.leave(`office-hours-${data.instructorId}`);
      
      // Notify instructor
      socket.to(`office-hours-${data.instructorId}`).emit('queue-member-left', {
        queueId: data.queueId,
        studentId: socket.userId,
        timestamp: new Date()
      });

      socket.emit('left-office-hours-queue', { 
        instructorId: data.instructorId 
      });
      
      console.log(`User ${socket.userId} left office hours queue for instructor ${data.instructorId}`);
    });

    // ========================================
    // Comments System Events
    // ========================================

    // Subscribe to comments for an entity (lesson, course, etc.)
    socket.on('comment:subscribe', (data: { entityType: string; entityId: string }) => {
      const room = `comments:${data.entityType}:${data.entityId}`;
      socket.join(room);
      console.log(`📝 [Socket.IO] User ${socket.userId} subscribed to comments: ${room}`);
    });

    // Unsubscribe from comments for an entity
    socket.on('comment:unsubscribe', (data: { entityType: string; entityId: string }) => {
      const room = `comments:${data.entityType}:${data.entityId}`;
      socket.leave(room);
      console.log(`📝 [Socket.IO] User ${socket.userId} unsubscribed from comments: ${room}`);
    });

    // Note: comment:created, comment:updated, comment:deleted, comment:liked
    // are emitted by CommentService, not handled as incoming events
  });
};