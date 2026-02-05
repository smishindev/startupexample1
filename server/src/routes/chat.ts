import { Router } from 'express';
import { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ChatService } from '../services/ChatService';

const router = Router();

// Get chat rooms for user
router.get('/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');
    const chatService = new ChatService(io);

    const rooms = await chatService.getUserRooms(userId);
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roomId } = req.params;
    const { limit, offset, before } = req.query;
    
    const io = req.app.get('io');
    const chatService = new ChatService(io);

    const messages = await chatService.getRoomMessages(roomId, userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      beforeTimestamp: before as string
    });

    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    if (error.message === 'User is not a participant of this room') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roomId } = req.params;
    const { content, type, replyTo } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    const io = req.app.get('io');
    const chatService = new ChatService(io);

    const message = await chatService.sendMessage(roomId, userId, content, type, replyTo);
    res.status(201).json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (error.message === 'User is not a participant of this room') {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Recipient does not accept direct messages') {
      return res.status(403).json({ 
        error: error.message,
        code: 'MESSAGES_DISABLED'
      });
    }
    if (error.message === 'Room not found or inactive') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create a direct message room
router.post('/rooms/direct', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (userId === recipientId) {
      return res.status(400).json({ error: 'Cannot create direct message with yourself' });
    }

    const io = req.app.get('io');
    const chatService = new ChatService(io);

    const room = await chatService.createDirectMessageRoom(userId, recipientId);
    res.status(201).json(room);
  } catch (error: any) {
    console.error('Error creating direct message room:', error);
    if (error.message === 'User does not accept direct messages') {
      return res.status(403).json({ 
        error: error.message,
        code: 'MESSAGES_DISABLED'
      });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create direct message room' });
  }
});

// Mark messages as read
router.post('/rooms/:roomId/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roomId } = req.params;

    const io = req.app.get('io');
    const chatService = new ChatService(io);

    await chatService.markMessagesAsRead(roomId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Leave a room (soft delete)
router.delete('/rooms/:roomId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roomId } = req.params;

    const io = req.app.get('io');
    const chatService = new ChatService(io);

    await chatService.leaveRoom(roomId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

export { router as chatRoutes };