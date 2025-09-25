import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

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
const generateToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  
  return jwt.sign(
    { userId, email, role }, 
    secret, 
    { expiresIn: '24h' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, firstName, lastName, password, learningStyle } = req.body;

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

    // Create user
    const result = await db.execute(
      `INSERT INTO dbo.Users (Email, Username, FirstName, LastName, PasswordHash, LearningStyle, Role, IsActive, EmailVerified, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.Id, INSERTED.Email, INSERTED.Username, INSERTED.FirstName, INSERTED.LastName, INSERTED.Role, INSERTED.LearningStyle, INSERTED.CreatedAt
       VALUES (@email, @username, @firstName, @lastName, @passwordHash, @learningStyle, 'student', 1, 0, GETUTCDATE(), GETUTCDATE())`,
      { 
        email: email.toLowerCase(), 
        username, 
        firstName, 
        lastName, 
        passwordHash,
        learningStyle: learningStyle || null
      }
    );

    const newUser = result.recordset[0];

    // Generate JWT token
    const token = generateToken(newUser.Id, newUser.Email, newUser.Role);

    logger.info(`User registered successfully: ${email}`);

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
          createdAt: newUser.CreatedAt
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

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

    // Generate JWT token
    const token = generateToken(user.Id, user.Email, user.Role);

    logger.info(`User logged in successfully: ${email}`);

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
        token
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', {
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
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token. We could implement token blacklisting
  // if needed for enhanced security.
  
  logger.info(`User logged out: ${req.user?.email}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export { router as authRoutes };