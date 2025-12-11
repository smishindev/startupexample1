import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = DatabaseService.getInstance();

// Configure multer for avatar uploads
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/images');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// GET /api/profile - Get current user's complete profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const result = await db.query(`
      SELECT 
        Id, Email, Username, FirstName, LastName, Avatar, Role, 
        LearningStyle, PreferencesJson, IsActive, EmailVerified,
        BillingStreetAddress, BillingCity, BillingState, BillingPostalCode, BillingCountry,
        CreatedAt, UpdatedAt, LastLoginAt
      FROM dbo.Users
      WHERE Id = @userId AND IsActive = 1
    `, { userId });

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = result[0];
    
    // Parse JSON fields
    const profile = {
      id: user.Id,
      email: user.Email,
      username: user.Username,
      firstName: user.FirstName,
      lastName: user.LastName,
      avatar: user.Avatar,
      role: user.Role,
      learningStyle: user.LearningStyle,
      preferences: user.PreferencesJson ? JSON.parse(user.PreferencesJson) : null,
      emailVerified: user.EmailVerified,
      billingAddress: {
        streetAddress: user.BillingStreetAddress,
        city: user.BillingCity,
        state: user.BillingState,
        postalCode: user.BillingPostalCode,
        country: user.BillingCountry
      },
      createdAt: user.CreatedAt,
      updatedAt: user.UpdatedAt,
      lastLoginAt: user.LastLoginAt
    };

    res.json({ 
      success: true, 
      data: profile 
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
});

// PUT /api/profile/personal-info - Update personal information
router.put('/personal-info', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { firstName, lastName, username, learningStyle } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'First name, last name, and username are required' 
      });
    }

    // Check if username is already taken by another user
    const existingUser = await db.query(`
      SELECT Id FROM dbo.Users 
      WHERE Username = @username AND Id != @userId
    `, { username, userId });

    if (existingUser.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username is already taken' 
      });
    }

    // Update user
    await db.execute(`
      UPDATE dbo.Users
      SET FirstName = @firstName,
          LastName = @lastName,
          Username = @username,
          LearningStyle = @learningStyle,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { firstName, lastName, username, learningStyle: learningStyle || null, userId });

    res.json({ 
      success: true, 
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile' 
    });
  }
});

// PUT /api/profile/billing-address - Update billing address
router.put('/billing-address', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { streetAddress, city, state, postalCode, country } = req.body;

    await db.execute(`
      UPDATE dbo.Users
      SET BillingStreetAddress = @streetAddress,
          BillingCity = @city,
          BillingState = @state,
          BillingPostalCode = @postalCode,
          BillingCountry = @country,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { 
      streetAddress: streetAddress || null, 
      city: city || null, 
      state: state || null, 
      postalCode: postalCode || null, 
      country: country || null, 
      userId 
    });

    res.json({ 
      success: true, 
      message: 'Billing address updated successfully' 
    });
  } catch (error) {
    logger.error('Update billing address error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update billing address' 
    });
  }
});

// PUT /api/profile/password - Change password
router.put('/password', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Get current password hash
    const result = await db.query(`
      SELECT PasswordHash FROM dbo.Users WHERE Id = @userId
    `, { userId });

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, result[0].PasswordHash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.execute(`
      UPDATE dbo.Users
      SET PasswordHash = @passwordHash,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { passwordHash: newPasswordHash, userId });

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password' 
    });
  }
});

// PUT /api/profile/avatar - Update avatar URL
router.put('/avatar', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { avatar } = req.body;

    await db.execute(`
      UPDATE dbo.Users
      SET Avatar = @avatar,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { avatar: avatar || null, userId });

    res.json({ 
      success: true, 
      message: 'Avatar updated successfully',
      data: { avatar }
    });
  } catch (error) {
    logger.error('Update avatar error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update avatar' 
    });
  }
});

// POST /api/profile/avatar/upload - Upload avatar image
router.post('/avatar/upload', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Process image with sharp - create optimized version
    const filename = `avatar_${userId}_${uuidv4()}.webp`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    await sharp(file.path)
      .resize(200, 200, { 
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Delete original uploaded file
    await fs.unlink(file.path);

    // Generate URL - use full server URL for cross-origin access
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    const avatarUrl = `${serverUrl}/uploads/images/${filename}`;

    // Update user's avatar in database
    await db.execute(`
      UPDATE dbo.Users
      SET Avatar = @avatar,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { avatar: avatarUrl, userId });

    res.json({ 
      success: true, 
      message: 'Avatar uploaded successfully',
      data: { 
        avatar: avatarUrl,
        filename 
      }
    });
  } catch (error) {
    logger.error('Upload avatar error:', error);
    
    // Clean up file if upload failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to clean up file:', unlinkError);
      }
    }

    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload avatar' 
    });
  }
});

// PUT /api/profile/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { preferences } = req.body;

    const preferencesJson = JSON.stringify(preferences);

    await db.execute(`
      UPDATE dbo.Users
      SET PreferencesJson = @preferencesJson,
          UpdatedAt = GETUTCDATE()
      WHERE Id = @userId
    `, { preferencesJson, userId });

    res.json({ 
      success: true, 
      message: 'Preferences updated successfully' 
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update preferences' 
    });
  }
});

export default router;
