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
    console.log(`Loading rooms for user: ${userId}`);

    // First, let's see all rooms without filtering
    const allRooms = await db.query(`
      SELECT 
        cr.Id as roomId,
        cr.Name as roomName,
        cr.Type as roomType,
        cr.CreatedAt,
        cr.ParticipantsJson,
        cr.IsActive
      FROM dbo.ChatRooms cr
      WHERE cr.IsActive = 1 
      ORDER BY cr.CreatedAt DESC
    `, {});

    console.log(`Found ${allRooms.length} total active rooms:`, allRooms);

    // Filter rooms where user is a participant
    const userRooms = allRooms.filter(room => {
      try {
        const participants = JSON.parse(room.ParticipantsJson || '[]');
        const isParticipant = participants.includes(userId);
        console.log(`Room ${room.roomName}: participants=${JSON.stringify(participants)}, isParticipant=${isParticipant}`);
        return isParticipant;
      } catch (e) {
        console.error('Error parsing participants JSON for room', room.roomId, e);
        return false;
      }
    });

    console.log(`User ${userId} is participant in ${userRooms.length} rooms`);

    // Now get the full room data with last messages for user's rooms
    const roomIds = userRooms.map(room => room.roomId);
    
    if (roomIds.length === 0) {
      console.log('No rooms found for user');
      return res.json([]);
    }

    const roomsWithMessages = await db.query(`
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
      WHERE cr.Id IN (${roomIds.map((_, i) => `@roomId${i}`).join(', ')})
      ORDER BY lastMessageTime DESC, cr.CreatedAt DESC
    `, roomIds.reduce((params, id, i) => ({ ...params, [`roomId${i}`]: id }), {}));

    console.log(`Returning ${roomsWithMessages.length} rooms with message data`);
    res.json(roomsWithMessages);
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

    console.log(`Loading messages for room ${roomId}, user ${userId}`);

    // Check if user is member of the room
    const room = await db.query(`
      SELECT ParticipantsJson FROM dbo.ChatRooms 
      WHERE Id = @roomId AND IsActive = 1
    `, { roomId });

    if (room.length === 0) {
      console.log(`Room ${roomId} not found`);
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const participants = JSON.parse(room[0].ParticipantsJson || '[]');
    if (!participants.includes(userId)) {
      console.log(`User ${userId} not in room participants:`, participants);
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    // Check if the ChatMessages table exists and what's in it
    console.log('Checking ChatMessages table...');
    
    // First test - does the table exist?
    const tableCheck = await db.query(`
      SELECT COUNT(*) as table_exists 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'ChatMessages'
    `, {});
    
    console.log('Table check result:', tableCheck);

    if (tableCheck[0]?.table_exists === 0) {
      console.log('ChatMessages table does not exist!');
      return res.status(500).json({ error: 'ChatMessages table not found' });
    }

    // Test query to see what's in the table
    const messageCount = await db.query(`
      SELECT COUNT(*) as count FROM dbo.ChatMessages WHERE RoomId = @roomId
    `, { roomId });

    console.log(`Found ${messageCount[0]?.count || 0} messages in room ${roomId}`);

    // Get the actual messages with user information
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
      ORDER BY cm.CreatedAt ASC
    `, { roomId });

    console.log(`Returning ${messages.length} actual messages for room ${roomId}`);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    console.error('Error details:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch messages', details: (error as Error).message });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const userId = req.user?.userId;

    console.log(`Sending message to room ${roomId} from user ${userId}: "${content}"`);

    // Check if user is member of the room
    const room = await db.query(`
      SELECT ParticipantsJson FROM dbo.ChatRooms 
      WHERE Id = @roomId AND IsActive = 1
    `, { roomId });

    if (room.length === 0) {
      console.log(`Room ${roomId} not found for message sending`);
      return res.status(404).json({ error: 'Chat room not found' });
    }

    const participants = JSON.parse(room[0].ParticipantsJson || '[]');
    if (!participants.includes(userId)) {
      console.log(`User ${userId} not authorized to send message to room ${roomId}`);
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    const messageId = uuidv4();
    const now = new Date().toISOString();

    console.log(`Inserting message with ID ${messageId} into database...`);

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

    console.log(`Message ${messageId} inserted successfully`);

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

    console.log(`Retrieved saved message:`, newMessage[0]);

    res.status(201).json(newMessage[0]);
  } catch (error) {
    console.error('Error sending message:', error);
    console.error('Error details:', (error as Error).message);
    res.status(500).json({ error: 'Failed to send message', details: (error as Error).message });
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