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

    // Simplified: Return empty array since ChatRooms table doesn't have ParticipantsJson or IsActive columns
    // TODO: Add ChatParticipants junction table to properly track room membership
    // For now, return empty to avoid database errors
    console.log('Chat rooms endpoint returning empty array - table schema needs participants tracking');
    res.json([]);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Get messages for a room
router.get('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Chat functionality disabled - needs ChatParticipants junction table
    // ChatRooms table missing columns: ParticipantsJson, IsActive, UpdatedAt
    return res.status(501).json({ 
      error: 'Chat messaging is currently disabled', 
      message: 'Chat infrastructure needs to be rebuilt with proper participant tracking'
    });
  } catch (error) {
    console.error('Error in chat messages endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
router.post('/rooms/:roomId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'Chat messaging is currently disabled' });
});

// Create a new chat room
router.post('/rooms', authenticateToken, async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'Chat room creation is currently disabled' });
});

// Join a chat room
router.post('/rooms/:roomId/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'Chat room joining is currently disabled' });
});

// Create some default chat rooms for testing
router.post('/rooms/init-defaults', authenticateToken, async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'Chat initialization is currently disabled' });
});

export { router as chatRoutes };