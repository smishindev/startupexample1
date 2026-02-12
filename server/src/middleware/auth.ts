import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_MISSING',
          message: 'Access token is required'
        }
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      logger.error('JWT_SECRET environment variable is not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_CONFIG_ERROR',
          message: 'Server authentication configuration error'
        }
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, secret) as TokenPayload;

    console.log(`[AUTH] JWT decoded - userId: ${decoded.userId}, email: ${decoded.email}, role: ${decoded.role}`);

    // Optional: Verify user still exists and is active
    const db = DatabaseService.getInstance();
    try {
      const users = await db.query(
        'SELECT Id, Email, Username, FirstName, LastName, Role, IsActive FROM dbo.Users WHERE Id = @userId AND IsActive = 1',
        { userId: decoded.userId }
      );

      console.log(`[AUTH] Database lookup for userId: ${decoded.userId}, found ${users.length} users`);
      if (users.length > 0) {
        console.log(`[AUTH] User found with role: ${users[0].Role}`);
      }

      if (users.length === 0) {
        console.log(`[AUTH] User not found or inactive for userId: ${decoded.userId}`);
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found or inactive'
          }
        });
        return;
      }

      // Add user info to request object (use role from database, not token)
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: users[0].Role  // Use current role from database
      };

      console.log(`[AUTH] Authentication successful for user: ${decoded.email}, role: ${users[0].Role}`);

      next();
    } catch (dbError) {
      logger.warn('Database check failed in auth middleware, proceeding with token data', dbError);
      // If database is down, proceed with token data
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      next();
    }
  } catch (error) {
    logger.error('Token verification failed:', error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired'
        }
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid access token'
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication verification failed'
      }
    });
  }
};

// Optional authentication middleware - parses JWT if present, but does not reject unauthenticated requests
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token - proceed without user context
      next();
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;

    const db = DatabaseService.getInstance();
    try {
      const users = await db.query(
        'SELECT Id, Email, Username, FirstName, LastName, Role, IsActive FROM dbo.Users WHERE Id = @userId AND IsActive = 1',
        { userId: decoded.userId }
      );

      if (users.length > 0) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: users[0].Role
        };
      }
    } catch (dbError) {
      // If DB check fails, use token data
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch {
    // Token invalid/expired - proceed without user context
  }
  next();
};

// Role-based authorization middleware
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    next();
  };
};