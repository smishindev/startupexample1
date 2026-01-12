import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import VerificationService from '../services/VerificationService';
import { PresenceService } from '../services/PresenceService';

const router = Router();
const db = DatabaseService.getInstance();

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Input validation helper
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Generate JWT token
const generateToken = (userId: string, email: string, role: string, rememberMe: boolean = false): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  
  const expiresIn = rememberMe ? '30d' : '24h'; // 30 days if remember me, otherwise 24 hours
  
  return jwt.sign(
    { userId, email, role }, 
    secret, 
    { expiresIn }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, firstName, lastName, password, role, learningStyle } = req.body;

    // Basic validation
    if (!email || !username || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'All fields are required: email, username, firstName, lastName, password'
        }
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address'
        }
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message
        }
      });
    }

    // Validate username (no spaces, min 3 chars)
    if (username.length < 3 || /\s/.test(username)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be at least 3 characters and contain no spaces'
        }
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT Id FROM dbo.Users WHERE Email = @email OR Username = @username',
      { email: email.toLowerCase(), username }
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email or username already exists'
        }
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Validate and set role (default to 'student')
    const userRole = role && ['student', 'instructor', 'admin'].includes(role) ? role : 'student';

    // Create user
    const result = await db.execute(
      `INSERT INTO dbo.Users (Email, Username, FirstName, LastName, PasswordHash, LearningStyle, Role, IsActive, EmailVerified, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.Username, INSERTED.FirstName, INSERTED.LastName, INSERTED.Role, INSERTED.LearningStyle, INSERTED.CreatedAt
       VALUES (@email, @username, @firstName, @lastName, @passwordHash, @learningStyle, @role, 1, 0, GETUTCDATE(), GETUTCDATE())`,
      { 
        email: email.toLowerCase(), 
        username, 
        firstName, 
        lastName, 
        passwordHash,
        learningStyle: learningStyle || null,
        role: userRole
      }
    );

    const newUser = result.recordset[0];

    // Generate JWT token
    const token = generateToken(newUser.Id, newUser.Email, newUser.Role);

    logger.info(`User registered successfully: ${email} (Email verified: false)`);
    
    // Send verification email
    console.log(`[EMAIL VERIFICATION] User ${email} needs to verify their email`);
    try {
      await VerificationService.sendVerificationCode(newUser.Id);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error(`⚠️ Failed to send verification email to ${email}:`, emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.Id,
          email: newUser.Email,
          username: newUser.Username,
          firstName: newUser.FirstName,
          lastName: newUser.LastName,
          role: newUser.Role,
          learningStyle: newUser.LearningStyle,
          createdAt: newUser.CreatedAt,
          emailVerified: false // Indicate email is not verified
        },
        token
      },
      message: 'Account created successfully. Please check your email to verify your account.'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    // Find user
    const users = await db.query(
      `SELECT Id, Email, Username, FirstName, LastName, PasswordHash, Role, LearningStyle, IsActive, EmailVerified 
       FROM dbo.Users WHERE Email = @email`,
      { email: email.toLowerCase() }
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.IsActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact support.'
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.PasswordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await db.execute(
      'UPDATE dbo.Users SET LastLoginAt = GETUTCDATE(), UpdatedAt = GETUTCDATE() WHERE Id = @userId',
      { userId: user.Id }
    );

    // Generate JWT token (with remember me option)
    const token = generateToken(user.Id, user.Email, user.Role, !!rememberMe);

    logger.info(`User logged in successfully: ${email} (Remember Me: ${!!rememberMe})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.Id,
          email: user.Email,
          username: user.Username,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          learningStyle: user.LearningStyle,
          emailVerified: user.EmailVerified
        },
        token,
        expiresIn: rememberMe ? '30d' : '24h'
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Refresh token is required'
        }
      });
    }

    // Verify the current token (even if expired, we can refresh)
    try {
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is not configured');
      }
      
      const decoded = jwt.verify(token, secret, {
        ignoreExpiration: true
      }) as TokenPayload;

      // Check if user still exists and is active
      const users = await db.query(
        'SELECT Id, Email, Role, IsActive FROM dbo.Users WHERE Id = @userId AND IsActive = 1',
        { userId: decoded.userId }
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found or inactive'
          }
        });
      }

      const user = users[0];

      // Generate new token
      const newToken = generateToken(user.Id, user.Email, user.Role);

      res.json({
        success: true,
        data: { token: newToken }
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or malformed token'
        }
      });
    }
  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    // Get full user profile
    const users = await db.query(
      `SELECT Id, Email, Username, FirstName, LastName, Role, LearningStyle, Avatar, 
              PreferencesJson, EmailVerified, CreatedAt, LastLoginAt
       FROM dbo.Users WHERE Id = @userId AND IsActive = 1`,
      { userId: req.user.userId }
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found'
        }
      });
    }

    const user = users[0];
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.Id,
          email: user.Email,
          username: user.Username,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          learningStyle: user.LearningStyle,
          avatar: user.Avatar,
          preferences: user.PreferencesJson ? JSON.parse(user.PreferencesJson) : null,
          emailVerified: user.EmailVerified,
          createdAt: user.CreatedAt,
          lastLoginAt: user.LastLoginAt
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. We could implement token blacklisting
  // if needed for enhanced security.
  
  const userId = req.user?.userId;
  
  // Set user offline when they explicitly logout
  if (userId) {
    try {
      await PresenceService.setUserOffline(userId);
      logger.info(`User ${req.user?.email} logged out and set offline`);
    } catch (error) {
      logger.error('Error setting user offline on logout:', error);
    }
  }
  
  logger.info(`User logged out: ${req.user?.email}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/auth/verify - Verify token and return user data
router.get('/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' }
      });
    }

    // Fetch fresh user data from database
    const result = await db.query(
      `SELECT 
        Id, Email, Username, FirstName, LastName, Role, 
        LearningStyle, Avatar, PreferencesJson, EmailVerified, 
        CreatedAt, LastLoginAt
      FROM dbo.Users 
      WHERE Id = @userId AND IsActive = 1`,
      { userId }
    );

    if (!result.length) {
      logger.warn(`Token verification failed: User not found or inactive (ID: ${userId})`);
      return res.status(401).json({
        success: false,
        error: { message: 'User not found or account inactive' }
      });
    }

    const user = result[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.Id,
          email: user.Email,
          username: user.Username,
          firstName: user.FirstName,
          lastName: user.LastName,
          role: user.Role,
          learningStyle: user.LearningStyle,
          avatar: user.Avatar,
          preferences: user.PreferencesJson ? JSON.parse(user.PreferencesJson) : null,
          emailVerified: user.EmailVerified,
          createdAt: user.CreatedAt,
          lastLoginAt: user.LastLoginAt,
        }
      }
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Token verification failed' }
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email address is required'
        }
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address'
        }
      });
    }

    // Check if user exists
    const users = await db.query(
      'SELECT Id, Email, FirstName FROM dbo.Users WHERE Email = @email AND IsActive = 1',
      { email: email.toLowerCase() }
    );

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    const user = users[0];

    // Generate reset token (6-digit code for simplicity, valid for 1 hour)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await db.execute(
      `UPDATE dbo.Users 
       SET PasswordResetToken = @token, 
           PasswordResetExpiry = @expiry,
           UpdatedAt = GETUTCDATE()
       WHERE Id = @userId`,
      { 
        token: resetToken,
        expiry: resetTokenExpiry,
        userId: user.Id 
      }
    );

    logger.info(`Password reset requested for: ${email}`);
    
    // TODO: Send email with reset token
    // For now, log it (in production, use email service)
    console.log(`[PASSWORD RESET] Token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.',
      // REMOVE IN PRODUCTION - only for development
      _devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
});

// POST /api/auth/verify-reset-token - Verify reset token is valid
router.post('/verify-reset-token', async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and reset code are required'
        }
      });
    }

    const users = await db.query(
      `SELECT Id, PasswordResetToken, PasswordResetExpiry 
       FROM dbo.Users 
       WHERE Email = @email AND IsActive = 1`,
      { email: email.toLowerCase() }
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset code'
        }
      });
    }

    const user = users[0];

    if (!user.PasswordResetToken || user.PasswordResetToken !== token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset code'
        }
      });
    }

    if (!user.PasswordResetExpiry || new Date(user.PasswordResetExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Reset code has expired. Please request a new one.'
        }
      });
    }

    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });
  } catch (error) {
    logger.error('Verify reset token error:', error);
    next(error);
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, reset code, and new password are required'
        }
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message
        }
      });
    }

    const users = await db.query(
      `SELECT Id, PasswordResetToken, PasswordResetExpiry 
       FROM dbo.Users 
       WHERE Email = @email AND IsActive = 1`,
      { email: email.toLowerCase() }
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset code'
        }
      });
    }

    const user = users[0];

    if (!user.PasswordResetToken || user.PasswordResetToken !== token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset code'
        }
      });
    }

    if (!user.PasswordResetExpiry || new Date(user.PasswordResetExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Reset code has expired. Please request a new one.'
        }
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await db.execute(
      `UPDATE dbo.Users 
       SET PasswordHash = @passwordHash,
           PasswordResetToken = NULL,
           PasswordResetExpiry = NULL,
           UpdatedAt = GETUTCDATE()
       WHERE Id = @userId`,
      { passwordHash, userId: user.Id }
    );

    logger.info(`Password reset successful for: ${email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
});

export { router as authRoutes };