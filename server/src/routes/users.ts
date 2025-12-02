import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import sql from 'mssql';

const router = Router();

router.get('/', (req: any, res: any) => {
  res.json({ message: 'Users endpoint - coming soon' });
});

/**
 * @route   GET /api/users/instructors
 * @desc    Get all instructors
 * @access  Private
 */
router.get('/instructors', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = DatabaseService.getInstance();
    
    const result = await (await db.getRequest())
      .query(`
        SELECT Id, FirstName, LastName, Email, Avatar
        FROM dbo.Users
        WHERE Role = 'instructor' AND IsActive = 1
        ORDER BY FirstName, LastName
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ 
      message: 'Failed to fetch instructors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as userRoutes };