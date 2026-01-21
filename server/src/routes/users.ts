import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { SettingsService } from '../services/SettingsService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import sql from 'mssql';

const router = Router();
const settingsService = new SettingsService();

router.get('/', (req: any, res: any) => {
  res.json({ message: 'Users endpoint - coming soon' });
});

/**
 * @route   GET /api/users/search
 * @desc    Search for users by name, username, or email
 * @access  Private
 */
router.get('/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q.trim()}%`;
    const db = DatabaseService.getInstance();
    const currentUserId = req.user!.userId;

    const result = await db.query<{
      Id: string;
      FirstName: string;
      LastName: string;
      Username: string;
      Email: string;
    }>(
      `SELECT TOP (@limit) Id, FirstName, LastName, Username, Email
       FROM dbo.Users
       WHERE IsActive = 1
         AND Id != @currentUserId
         AND (
           FirstName LIKE @searchTerm
           OR LastName LIKE @searchTerm
           OR Username LIKE @searchTerm
           OR Email LIKE @searchTerm
         )
       ORDER BY FirstName, LastName`,
      { searchTerm, currentUserId, limit: parseInt(limit as string) || 10 }
    );

    res.json({ users: result });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      message: 'Failed to search users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/users/instructors
 * @desc    Get all instructors (with privacy filtering)
 * @access  Private
 */
router.get('/instructors', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = DatabaseService.getInstance();
    const viewerId = req.user!.userId;
    
    const result = await (await db.getRequest())
      .query(`
        SELECT Id, FirstName, LastName, Email, Avatar
        FROM dbo.Users
        WHERE Role = 'instructor' AND IsActive = 1
        ORDER BY FirstName, LastName
      `);
    
    // Apply privacy filtering to each instructor
    const filteredInstructors = await Promise.all(
      result.recordset.map(async (instructor) => {
        try {
          const settings = await settingsService.getUserSettings(instructor.Id);
          const isOwnProfile = instructor.Id === viewerId;
          
          return settingsService.filterUserData(instructor, settings, isOwnProfile);
        } catch (error) {
          console.error(`Error filtering instructor ${instructor.Id}:`, error);
          // On error, return without email (fail closed)
          return {
            Id: instructor.Id,
            FirstName: instructor.FirstName,
            LastName: instructor.LastName,
            Avatar: instructor.Avatar,
            Email: null
          };
        }
      })
    );
    
    res.json(filteredInstructors);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ 
      message: 'Failed to fetch instructors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as userRoutes };