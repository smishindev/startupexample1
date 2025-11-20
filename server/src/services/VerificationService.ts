/**
 * Email Verification Service
 * Handles email verification code generation, validation, and tracking
 */

import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import EmailService from './EmailService';

const dbService = DatabaseService.getInstance();

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    emailVerified: boolean;
  };
}

class VerificationService {
  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification email to user
   */
  async sendVerificationCode(userId: string): Promise<VerificationResult> {
    try {
      // Get user details
      const userResult = await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Id, Email, FirstName, EmailVerified
          FROM dbo.Users
          WHERE Id = @UserId AND IsActive = 1
        `);

      if (userResult.recordset.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.recordset[0];

      if (user.EmailVerified) {
        return {
          success: false,
          message: 'Email already verified'
        };
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24); // 24 hour expiry

      // Store verification code in database
      await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('Code', sql.NVarChar(10), verificationCode)
        .input('Expiry', sql.DateTime2, expiry)
        .query(`
          UPDATE dbo.Users
          SET EmailVerificationCode = @Code,
              EmailVerificationExpiry = @Expiry,
              UpdatedAt = GETUTCDATE()
          WHERE Id = @UserId
        `);

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail({
        email: user.Email,
        firstName: user.FirstName,
        verificationCode
      });

      if (!emailSent) {
        console.warn(`⚠️ Failed to send verification email to ${user.Email}, but code saved in database`);
      }

      console.log(`✅ Verification code sent to ${user.Email} (expires in 24h)`);

      return {
        success: true,
        message: 'Verification code sent successfully',
        user: {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          emailVerified: false
        }
      };

    } catch (error) {
      console.error('❌ Error sending verification code:', error);
      return {
        success: false,
        message: 'Failed to send verification code'
      };
    }
  }

  /**
   * Verify the code provided by user
   */
  async verifyCode(userId: string, code: string): Promise<VerificationResult> {
    try {
      // Get user and verification details
      const userResult = await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Id, Email, FirstName, EmailVerified, 
                 EmailVerificationCode, EmailVerificationExpiry
          FROM dbo.Users
          WHERE Id = @UserId AND IsActive = 1
        `);

      if (userResult.recordset.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.recordset[0];

      // Check if already verified
      if (user.EmailVerified) {
        return {
          success: false,
          message: 'Email already verified'
        };
      }

      // Check if code exists
      if (!user.EmailVerificationCode) {
        return {
          success: false,
          message: 'No verification code found. Please request a new code.'
        };
      }

      // Check if code matches
      if (user.EmailVerificationCode !== code) {
        return {
          success: false,
          message: 'Invalid verification code'
        };
      }

      // Check if code has expired
      const now = new Date();
      const expiry = new Date(user.EmailVerificationExpiry);
      
      if (now > expiry) {
        return {
          success: false,
          message: 'Verification code has expired. Please request a new code.'
        };
      }

      // Mark email as verified
      await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          UPDATE dbo.Users
          SET EmailVerified = 1,
              EmailVerificationCode = NULL,
              EmailVerificationExpiry = NULL,
              UpdatedAt = GETUTCDATE()
          WHERE Id = @UserId
        `);

      console.log(`✅ Email verified successfully for user: ${user.Email}`);

      // Send welcome email
      await EmailService.sendWelcomeEmail({
        email: user.Email,
        firstName: user.FirstName
      });

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          emailVerified: true
        }
      };

    } catch (error) {
      console.error('❌ Error verifying code:', error);
      return {
        success: false,
        message: 'Failed to verify code'
      };
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(userId: string): Promise<VerificationResult> {
    try {
      // Check if user exists and is not verified
      const userResult = await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Id, Email, FirstName, EmailVerified
          FROM dbo.Users
          WHERE Id = @UserId AND IsActive = 1
        `);

      if (userResult.recordset.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.recordset[0];

      if (user.EmailVerified) {
        return {
          success: false,
          message: 'Email already verified'
        };
      }

      // Send new verification code
      return this.sendVerificationCode(userId);

    } catch (error) {
      console.error('❌ Error resending verification code:', error);
      return {
        success: false,
        message: 'Failed to resend verification code'
      };
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(userId: string): Promise<VerificationResult> {
    try {
      const userResult = await (await dbService.getRequest())
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Id, Email, FirstName, EmailVerified
          FROM dbo.Users
          WHERE Id = @UserId AND IsActive = 1
        `);

      if (userResult.recordset.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.recordset[0];

      return {
        success: true,
        message: user.EmailVerified ? 'Email verified' : 'Email not verified',
        user: {
          id: user.Id,
          email: user.Email,
          firstName: user.FirstName,
          emailVerified: user.EmailVerified
        }
      };

    } catch (error) {
      console.error('❌ Error checking verification status:', error);
      return {
        success: false,
        message: 'Failed to check verification status'
      };
    }
  }

  /**
   * Send verification code during registration
   */
  async sendVerificationOnRegistration(userId: string): Promise<void> {
    try {
      // Send verification code (but don't fail registration if it fails)
      const result = await this.sendVerificationCode(userId);
      
      if (!result.success) {
        console.warn(`⚠️ Could not send verification email during registration: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Error in registration verification:', error);
      // Don't throw error - registration should succeed even if email fails
    }
  }
}

export default new VerificationService();
