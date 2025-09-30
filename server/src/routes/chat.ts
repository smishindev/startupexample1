import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Get chat rooms for user
router.get('/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const rooms = await db.query(`
      SELECT 
        cr.Id as roomId,
        cr.Name as roomName,
        cr.Type as roomType,
        cr.CreatedAt,
        c.Title as courseTitle,
        (SELECT TOP 1 cm.Content 
         FROM dbo.ChatMessages cm 
         WHERE cm.RoomId = cr.Id 
         ORDER BY cm.CreatedAt DESC) as lastMessage,
        (SELECT TOP 1 cm.CreatedAt 
         FROM dbo.ChatMessages cm 
         WHERE cm.RoomId = cr.Id 
         ORDER BY cm.CreatedAt DESC) as lastMessageTime
      FROM dbo.ChatRooms cr
      LEFT JOIN dbo.Courses c ON cr.CourseId = c.Id
      WHERE cr.IsActive = 1 
        AND JSON_VALUE(cr.ParticipantsJson, '$') LIKE '%' + @userId + '%'
      ORDER BY lastMessageTime DESC, cr.CreatedAt DESC
    `, { userId });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is member of the room
    const room = await db.query(`
      SELECT ParticipantsJson FROM dbo.ChatRooms 
      WHERE Id = @roomId AND IsActive = 1
    `, { roomId });

    if (room.length === 0) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const participants = JSON.parse(room[0].ParticipantsJson || '[]');
    if (!participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    const offset = (Number(page) - 1) * Number(limit);

    const messages = await db.query(`
      SELECT 
        cm.Id,
        cm.Content,
        cm.CreatedAt,
        cm.EditedAt,
        cm.Type as MessageType,
        u.FirstName,
        u.LastName,
        u.Email,
        u.Id as UserId
      FROM dbo.ChatMessages cm
      INNER JOIN dbo.Users u ON cm.UserId = u.Id
      WHERE cm.RoomId = @roomId
      ORDER BY cm.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `, { roomId, offset, limit });

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const userId = req.user?.userId;

    // Check if user is member of the room
    const room = await db.query(`
      SELECT ParticipantsJson FROM dbo.ChatRooms 
      WHERE Id = @roomId AND IsActive = 1
    `, { roomId });

    if (room.length === 0) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const participants = JSON.parse(room[0].ParticipantsJson || '[]');
    if (!participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    const messageId = uuidv4();
    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO dbo.ChatMessages (Id, RoomId, UserId, Content, Type, CreatedAt)
      VALUES (@id, @roomId, @userId, @content, @type, @createdAt)
    `, {
      id: messageId,
      roomId,
      userId,
      content,
      type: messageType,
      createdAt: now
    });

    // Get the created message with user info
    const newMessage = await db.query(`
      SELECT 
        cm.Id,
        cm.Content,
        cm.CreatedAt,
        cm.Type as MessageType,
        u.FirstName,
        u.LastName,
        u.Email,
        u.Id as UserId
      FROM dbo.ChatMessages cm
      INNER JOIN dbo.Users u ON cm.UserId = u.Id
      WHERE cm.Id = @messageId
    `, { messageId });

    res.status(201).json(newMessage[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create a new chat room
router.post('/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, type = 'course_general', courseId } = req.body;
    const userId = req.user?.userId;

    const roomId = uuidv4();
    const now = new Date().toISOString();
    const participants = [userId]; // Creator is first participant

    await db.execute(`
      INSERT INTO dbo.ChatRooms (Id, Name, Type, CourseId, CreatedBy, ParticipantsJson, CreatedAt, UpdatedAt)
      VALUES (@id, @name, @type, @courseId, @createdBy, @participantsJson, @createdAt, @updatedAt)
    `, {
      id: roomId,
      name,
      type,
      courseId,
      createdBy: userId,
      participantsJson: JSON.stringify(participants),
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({ roomId, name, type, courseId });
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// Join a chat room
router.post('/rooms/:roomId/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;

    // Get current room info
    const room = await db.query(`
      SELECT ParticipantsJson FROM dbo.ChatRooms 
      WHERE Id = @roomId AND IsActive = 1
    `, { roomId });

    if (room.length === 0) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const participants = JSON.parse(room[0].ParticipantsJson || '[]');
    
    if (participants.includes(userId)) {
      return res.json({ message: 'Already a member of this room' });
    }

    // Add user to participants
    participants.push(userId);
    const now = new Date().toISOString();

    await db.execute(`
      UPDATE dbo.ChatRooms 
      SET ParticipantsJson = @participantsJson, UpdatedAt = @updatedAt
      WHERE Id = @roomId
    `, {
      roomId,
      participantsJson: JSON.stringify(participants),
      updatedAt: now
    });

    res.json({ message: 'Successfully joined the room' });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Create some default chat rooms for testing
router.post('/rooms/init-defaults', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const now = new Date().toISOString();

    // Create general discussion room
    const generalRoomId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatRooms (Id, Name, Type, CreatedBy, ParticipantsJson, CreatedAt, UpdatedAt)
      VALUES (@id, @name, @type, @createdBy, @participantsJson, @createdAt, @updatedAt)
    `, {
      id: generalRoomId,
      name: 'General Discussion',
      type: 'course_general',
      createdBy: userId,
      participantsJson: JSON.stringify([userId]),
      createdAt: now,
      updatedAt: now
    });

    // Create study group room
    const studyRoomId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatRooms (Id, Name, Type, CreatedBy, ParticipantsJson, CreatedAt, UpdatedAt)
      VALUES (@id, @name, @type, @createdBy, @participantsJson, @createdAt, @updatedAt)
    `, {
      id: studyRoomId,
      name: 'Study Group',
      type: 'study_group',
      createdBy: userId,
      participantsJson: JSON.stringify([userId]),
      createdAt: now,
      updatedAt: now
    });

    res.json({ 
      message: 'Default rooms created',
      rooms: [
        { id: generalRoomId, name: 'General Discussion' },
        { id: studyRoomId, name: 'Study Group' }
      ]
    });
  } catch (error) {
    console.error('Error creating default rooms:', error);
    res.status(500).json({ error: 'Failed to create default rooms' });
  }
});

export { router as chatRoutes };