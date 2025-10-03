import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './services/DatabaseService';

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
    console.log('User connected:', socket.id, 'UserId:', socket.userId);

    // Join user to their personal room for direct messages
    if (socket.userId) {
      socket.join(`user-${socket.userId}`);
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

    // Chat room events
    socket.on('join-room', async (roomId: string) => {
      try {
        // Verify user has access to this room
        const room = await db.query(`
          SELECT ParticipantsJson FROM dbo.ChatRooms 
          WHERE Id = @roomId AND IsActive = 1
        `, { roomId });

        if (room.length === 0) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const participants = JSON.parse(room[0].ParticipantsJson || '[]');
        if (participants.includes(socket.userId)) {
          socket.join(roomId);
          socket.emit('joined-room', { roomId });
          console.log(`User ${socket.userId} joined room ${roomId}`);
        } else {
          socket.emit('error', { message: 'Access denied to this room' });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      socket.emit('left-room', { roomId });
      console.log(`User ${socket.userId} left room ${roomId}`);
    });

    socket.on('chat-message', async (data: {
      roomId: string;
      content: string;
      messageType?: string;
      messageId?: string;
      createdAt?: string;
    }) => {
      try {
        // Verify user has access to this room
        const room = await db.query(`
          SELECT ParticipantsJson FROM dbo.ChatRooms 
          WHERE Id = @roomId AND IsActive = 1
        `, { roomId: data.roomId });

        if (room.length === 0) {
          socket.emit('error', { message: 'Chat room not found' });
          return;
        }

        const participants = JSON.parse(room[0].ParticipantsJson || '[]');
        if (!participants.includes(socket.userId)) {
          socket.emit('error', { message: 'Access denied to this room' });
          return;
        }

        // Get user info for the message
        const userInfo = await db.query(`
          SELECT FirstName, LastName, Email FROM dbo.Users WHERE Id = @userId
        `, { userId: socket.userId });

        const messageData = {
          id: data.messageId || require('uuid').v4(), // Use provided messageId if available
          roomId: data.roomId,
          content: data.content,
          messageType: data.messageType || 'text',
          createdAt: data.createdAt || new Date().toISOString(),
          user: {
            id: socket.userId,
            firstName: userInfo[0]?.FirstName,
            lastName: userInfo[0]?.LastName,
            email: userInfo[0]?.Email
          }
        };

        // Broadcast message to OTHER users in the room (exclude sender to prevent double display)
        socket.to(data.roomId).emit('new-message', messageData);
        console.log(`Broadcasting message ${messageData.id} to room ${data.roomId} (excluding sender)`);

      } catch (error) {
        console.error('Error broadcasting message:', error);
        socket.emit('error', { message: 'Failed to broadcast message' });
      }
    });

    // Typing indicators
    socket.on('typing-start', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user-typing', {
        userId: socket.userId,
        email: socket.userEmail,
        roomId: data.roomId
      });
    });

    socket.on('typing-stop', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user-stop-typing', {
        userId: socket.userId,
        roomId: data.roomId
      });
    });
  });
};