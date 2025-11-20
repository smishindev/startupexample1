/**
 * Email Verification Routes
 * Handles email verification endpoints
 */

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import VerificationService from '../services/VerificationService';

const router = express.Router();

/**
 * POST /api/verification/send
 * Send verification code to user's email
 */
router.post('/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const result = await VerificationService.sendVerificationCode(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      data: {
        email: result.user!.email,
        expiresIn: '24 hours'
      }
    });

  } catch (error) {
    console.error('Error in send verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

/**
 * POST /api/verification/verify
 * Verify the code provided by user
 */
router.post('/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    const result = await VerificationService.verifyCode(userId, code.trim());

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        user: result.user
      }
    });

  } catch (error) {
    console.error('Error in verify code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code'
    });
  }
});

/**
 * POST /api/verification/resend
 * Resend verification code
 */
router.post('/resend', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const result = await VerificationService.resendVerificationCode(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email',
      data: {
        email: result.user!.email,
        expiresIn: '24 hours'
      }
    });

  } catch (error) {
    console.error('Error in resend verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code'
    });
  }
});

/**
 * GET /api/verification/status
 * Check email verification status
 */
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    const result = await VerificationService.checkVerificationStatus(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: {
        emailVerified: result.user!.emailVerified,
        email: result.user!.email
      }
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status'
    });
  }
});

export default router;
