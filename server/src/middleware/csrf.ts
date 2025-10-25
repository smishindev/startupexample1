import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (data.expiresAt < now) {
      csrfTokens.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

export const generateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Generate or retrieve session ID from cookie
  let sessionId = req.cookies?.['session-id'];
  
  if (!sessionId) {
    sessionId = crypto.randomBytes(32).toString('hex');
    res.cookie('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // Generate CSRF token
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

  csrfTokens.set(sessionId, { token: csrfToken, expiresAt });

  // Attach token to response
  res.locals.csrfToken = csrfToken;
  next();
};

export const verifyCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = req.cookies?.['session-id'];
  const clientToken = req.headers['x-csrf-token'] as string;

  if (!sessionId || !clientToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required'
      }
    });
    return;
  }

  const storedData = csrfTokens.get(sessionId);

  if (!storedData) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid or expired CSRF token'
      }
    });
    return;
  }

  if (storedData.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId);
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_EXPIRED',
        message: 'CSRF token has expired'
      }
    });
    return;
  }

  if (storedData.token !== clientToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token mismatch'
      }
    });
    return;
  }

  next();
};

// Endpoint to get CSRF token
export const getCsrfToken = (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      csrfToken: res.locals.csrfToken
    }
  });
};
