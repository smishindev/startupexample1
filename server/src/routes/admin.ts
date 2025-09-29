import express from 'express';
import { DatabaseService } from '../services/DatabaseService';

const router = express.Router();
const db = DatabaseService.getInstance();

// Temporary endpoint to promote user to instructor (remove in production)
router.post('/promote-to-instructor', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const users = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Email = @email', { email });
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Update role to instructor
    await db.execute('UPDATE dbo.Users SET Role = @role WHERE Id = @id', { 
      role: 'instructor', 
      id: user.Id 
    });
    
    // Get updated user data
    const updatedUsers = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Id = @id', { id: user.Id });
    
    res.json({
      success: true,
      message: 'User promoted to instructor',
      user: {
        id: updatedUsers[0].Id,
        email: updatedUsers[0].Email,
        role: updatedUsers[0].Role
      }
    });
    
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

export { router as adminRoutes };