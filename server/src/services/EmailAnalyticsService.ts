import crypto from 'crypto';
import sql from 'mssql';
import { DatabaseService } from './DatabaseService';

/**
 * EmailAnalyticsService
 * 
 * Handles email tracking, analytics, and unsubscribe functionality.
 * 
 * Features:
 * - Email open tracking (1x1 pixel)
 * - Click tracking for links
 * - Bounce handling
 * - Unsubscribe token management
 * - Analytics and reporting
 * 
 * Date Handling: All timestamps use UTC (GETUTCDATE() in SQL, Date in JS)
 */
class EmailAnalyticsService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }
  
  /**
   * Generate a unique tracking token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Record email sent event
   */
  async recordEmailSent(
    userId: string,
    emailType: 'notification' | 'digest' | 'verification' | 'welcome' | 'password-reset' | 'purchase' | 'refund',
    notificationId?: string,
    digestId?: string
  ): Promise<string> {
    const request = await this.dbService.getRequest();
    const trackingToken = this.generateToken();

    try {
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('EmailType', sql.NVarChar(50), emailType)
        .input('EventType', sql.NVarChar(20), 'sent')
        .input('NotificationId', sql.UniqueIdentifier, notificationId || null)
        .input('DigestId', sql.UniqueIdentifier, digestId || null)
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .query(`
          INSERT INTO EmailTrackingEvents 
            (UserId, EmailType, EventType, NotificationId, DigestId, TrackingToken)
          VALUES 
            (@UserId, @EmailType, @EventType, @NotificationId, @DigestId, @TrackingToken)
        `);

      return trackingToken;
    } catch (error) {
      console.error('Error recording email sent:', error);
      throw error;
    }
  }

  /**
   * Record email open event (triggered by tracking pixel)
   */
  async recordEmailOpen(
    trackingToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Check if already opened (only record first open)
      const existingRequest = await this.dbService.getRequest();
      const existing = await existingRequest
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .query(`
          SELECT Id FROM EmailTrackingEvents
          WHERE TrackingToken = @TrackingToken
            AND EventType = 'opened'
        `);

      if (existing.recordset.length > 0) {
        return false; // Already recorded
      }

      // Get the original sent event
      const sentRequest = await this.dbService.getRequest();
      const sent = await sentRequest
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .query(`
          SELECT UserId, EmailType, NotificationId, DigestId
          FROM EmailTrackingEvents
          WHERE TrackingToken = @TrackingToken
            AND EventType = 'sent'
        `);

      if (sent.recordset.length === 0) {
        return false; // No sent event found
      }

      const { UserId, EmailType, NotificationId, DigestId } = sent.recordset[0];

      // Record open event
      const insertRequest = await this.dbService.getRequest();
      await insertRequest
        .input('UserId', sql.UniqueIdentifier, UserId)
        .input('EmailType', sql.NVarChar(50), EmailType)
        .input('EventType', sql.NVarChar(20), 'opened')
        .input('NotificationId', sql.UniqueIdentifier, NotificationId)
        .input('DigestId', sql.UniqueIdentifier, DigestId)
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .input('UserAgent', sql.NVarChar(500), userAgent || null)
        .input('IpAddress', sql.NVarChar(50), ipAddress || null)
        .query(`
          INSERT INTO EmailTrackingEvents 
            (UserId, EmailType, EventType, NotificationId, DigestId, TrackingToken, UserAgent, IpAddress)
          VALUES 
            (@UserId, @EmailType, @EventType, @NotificationId, @DigestId, @TrackingToken, @UserAgent, @IpAddress)
        `);

      console.log(`📧 Email opened - Token: ${trackingToken.substring(0, 10)}..., Type: ${EmailType}`);
      return true;
    } catch (error) {
      console.error('Error recording email open:', error);
      return false;
    }
  }

  /**
   * Record email click event
   */
  async recordEmailClick(
    trackingToken: string,
    clickedUrl: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Get the original sent event
      const sentRequest = await this.dbService.getRequest();
      const sent = await sentRequest
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .query(`
          SELECT UserId, EmailType, NotificationId, DigestId
          FROM EmailTrackingEvents
          WHERE TrackingToken = @TrackingToken
            AND EventType = 'sent'
        `);

      if (sent.recordset.length === 0) {
        return false;
      }

      const { UserId, EmailType, NotificationId, DigestId } = sent.recordset[0];

      // Record click event (allow multiple clicks)
      const insertRequest = await this.dbService.getRequest();
      await insertRequest
        .input('UserId', sql.UniqueIdentifier, UserId)
        .input('EmailType', sql.NVarChar(50), EmailType)
        .input('EventType', sql.NVarChar(20), 'clicked')
        .input('NotificationId', sql.UniqueIdentifier, NotificationId)
        .input('DigestId', sql.UniqueIdentifier, DigestId)
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .input('ClickedUrl', sql.NVarChar(2000), clickedUrl)
        .input('UserAgent', sql.NVarChar(500), userAgent || null)
        .input('IpAddress', sql.NVarChar(50), ipAddress || null)
        .query(`
          INSERT INTO EmailTrackingEvents 
            (UserId, EmailType, EventType, NotificationId, DigestId, TrackingToken, ClickedUrl, UserAgent, IpAddress)
          VALUES 
            (@UserId, @EmailType, @EventType, @NotificationId, @DigestId, @TrackingToken, @ClickedUrl, @UserAgent, @IpAddress)
        `);

      console.log(`🔗 Email link clicked - Token: ${trackingToken.substring(0, 10)}..., URL: ${clickedUrl}`);
      return true;
    } catch (error) {
      console.error('Error recording email click:', error);
      return false;
    }
  }

  /**
   * Record email bounce event
   */
  async recordEmailBounce(
    trackingToken: string,
    bounceReason: string
  ): Promise<boolean> {
    try {
      // Get the original sent event
      const sentRequest = await this.dbService.getRequest();
      const sent = await sentRequest
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .query(`
          SELECT UserId, EmailType, NotificationId, DigestId
          FROM EmailTrackingEvents
          WHERE TrackingToken = @TrackingToken
            AND EventType = 'sent'
        `);

      if (sent.recordset.length === 0) {
        return false;
      }

      const { UserId, EmailType, NotificationId, DigestId } = sent.recordset[0];

      // Record bounce event
      const insertRequest = await this.dbService.getRequest();
      await insertRequest
        .input('UserId', sql.UniqueIdentifier, UserId)
        .input('EmailType', sql.NVarChar(50), EmailType)
        .input('EventType', sql.NVarChar(20), 'bounced')
        .input('NotificationId', sql.UniqueIdentifier, NotificationId)
        .input('DigestId', sql.UniqueIdentifier, DigestId)
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .input('BounceReason', sql.NVarChar(1000), bounceReason)
        .query(`
          INSERT INTO EmailTrackingEvents 
            (UserId, EmailType, EventType, NotificationId, DigestId, TrackingToken, BounceReason)
          VALUES 
            (@UserId, @EmailType, @EventType, @NotificationId, @DigestId, @TrackingToken, @BounceReason)
        `);

      console.warn(`⚠️ Email bounced - Token: ${trackingToken.substring(0, 10)}..., Reason: ${bounceReason}`);
      
      // TODO: Consider disabling email notifications for user after multiple bounces
      
      return true;
    } catch (error) {
      console.error('Error recording email bounce:', error);
      return false;
    }
  }

  /**
   * Record email failure event
   */
  async recordEmailFailure(
    userId: string,
    emailType: string,
    errorMessage: string,
    notificationId?: string,
    digestId?: string
  ): Promise<void> {
    const request = await this.dbService.getRequest();
    const trackingToken = this.generateToken();

    try {
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('EmailType', sql.NVarChar(50), emailType)
        .input('EventType', sql.NVarChar(20), 'failed')
        .input('NotificationId', sql.UniqueIdentifier, notificationId || null)
        .input('DigestId', sql.UniqueIdentifier, digestId || null)
        .input('TrackingToken', sql.NVarChar(255), trackingToken)
        .input('BounceReason', sql.NVarChar(1000), errorMessage)
        .query(`
          INSERT INTO EmailTrackingEvents 
            (UserId, EmailType, EventType, NotificationId, DigestId, TrackingToken, BounceReason)
          VALUES 
            (@UserId, @EmailType, @EventType, @NotificationId, @DigestId, @TrackingToken, @BounceReason)
        `);

      console.error(`❌ Email failed - User: ${userId}, Type: ${emailType}, Error: ${errorMessage}`);
    } catch (error) {
      console.error('Error recording email failure:', error);
    }
  }

  /**
   * Generate unsubscribe token
   */
  async generateUnsubscribeToken(
    userId: string,
    emailType?: 'notification' | 'digest' | null
  ): Promise<string> {
    const request = await this.dbService.getRequest();
    const token = this.generateToken();

    try {
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('Token', sql.NVarChar(255), token)
        .input('EmailType', sql.NVarChar(50), emailType || null)
        .query(`
          INSERT INTO EmailUnsubscribeTokens (UserId, Token, EmailType)
          VALUES (@UserId, @Token, @EmailType)
        `);

      return token;
    } catch (error) {
      console.error('Error generating unsubscribe token:', error);
      throw error;
    }
  }

  /**
   * Process unsubscribe request
   */
  async processUnsubscribe(
    token: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      // Validate token
      const validateRequest = await this.dbService.getRequest();
      const result = await validateRequest
        .input('Token', sql.NVarChar(255), token)
        .query(`
          SELECT UT.UserId, UT.EmailType, UT.UsedAt, UT.ExpiresAt, U.Email
          FROM EmailUnsubscribeTokens UT
          INNER JOIN Users U ON UT.UserId = U.Id
          WHERE UT.Token = @Token
        `);

      if (result.recordset.length === 0) {
        return { success: false, message: 'Invalid unsubscribe token' };
      }

      const tokenData = result.recordset[0];

      // Check if already used
      if (tokenData.UsedAt) {
        return { 
          success: true, 
          message: 'You have already been unsubscribed',
          email: tokenData.Email
        };
      }

      // Check if expired
      if (tokenData.ExpiresAt && new Date(tokenData.ExpiresAt) < new Date()) {
        return { success: false, message: 'Unsubscribe token has expired' };
      }

      // Mark token as used
      const markUsedRequest = await this.dbService.getRequest();
      await markUsedRequest
        .input('Token', sql.NVarChar(255), token)
        .query(`
          UPDATE EmailUnsubscribeTokens
          SET UsedAt = GETUTCDATE()
          WHERE Token = @Token
        `);

      // Update notification preferences
      if (tokenData.EmailType === null) {
        // Unsubscribe from ALL emails
        const updatePrefsRequest = await this.dbService.getRequest();
        await updatePrefsRequest
          .input('UserId', sql.UniqueIdentifier, tokenData.UserId)
          .input('Reason', sql.NVarChar(500), reason || 'User unsubscribed via email link')
          .query(`
            UPDATE NotificationPreferences
            SET EnableEmailNotifications = 0,
                UnsubscribedAt = GETUTCDATE(),
                UnsubscribeReason = @Reason,
                UpdatedAt = GETUTCDATE()
            WHERE UserId = @UserId
          `);

        console.log(`📭 User ${tokenData.Email} unsubscribed from ALL emails`);
        
        return {
          success: true,
          message: 'You have been unsubscribed from all email notifications',
          email: tokenData.Email
        };
      } else {
        // Unsubscribe from specific email type (e.g., digests only)
        const updateDigestRequest = await this.dbService.getRequest();
        await updateDigestRequest
          .input('UserId', sql.UniqueIdentifier, tokenData.UserId)
          .input('Reason', sql.NVarChar(500), reason || `Unsubscribed from ${tokenData.EmailType} emails`)
          .query(`
            UPDATE NotificationPreferences
            SET EmailDigestFrequency = 'none',
                UnsubscribedAt = GETUTCDATE(),
                UnsubscribeReason = @Reason,
                UpdatedAt = GETUTCDATE()
            WHERE UserId = @UserId
          `);

        console.log(`📭 User ${tokenData.Email} unsubscribed from ${tokenData.EmailType} emails`);
        
        return {
          success: true,
          message: `You have been unsubscribed from ${tokenData.EmailType} emails`,
          email: tokenData.Email
        };
      }
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      return { success: false, message: 'An error occurred processing your request' };
    }
  }

  /**
   * Get email analytics for a user
   */
  async getUserEmailStats(userId: string): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    openRate: number;
    clickRate: number;
  }> {
    const request = await this.dbService.getRequest();

    try {
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 
            EventType,
            COUNT(*) AS Count
          FROM EmailTrackingEvents
          WHERE UserId = @UserId
          GROUP BY EventType
        `);

      const stats = {
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        openRate: 0,
        clickRate: 0
      };

      result.recordset.forEach((row: any) => {
        stats[row.EventType as keyof typeof stats] = row.Count;
      });

      // Calculate rates
      if (stats.sent > 0) {
        stats.openRate = (stats.opened / stats.sent) * 100;
        stats.clickRate = (stats.clicked / stats.sent) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting user email stats:', error);
      throw error;
    }
  }

  /**
   * Get system-wide email analytics (admin dashboard)
   */
  async getSystemEmailStats(days: number = 30): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    openRate: number;
    clickRate: number;
    byType: Array<{ emailType: string; sent: number; opened: number; clicked: number }>;
  }> {
    const request = await this.dbService.getRequest();

    try {
      // Overall stats
      const overall = await request
        .input('Days', sql.Int, days)
        .query(`
          SELECT 
            EventType,
            COUNT(*) AS Count
          FROM EmailTrackingEvents
          WHERE CreatedAt >= DATEADD(DAY, -@Days, GETUTCDATE())
          GROUP BY EventType
        `);

      const stats = {
        sent: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        openRate: 0,
        clickRate: 0,
        byType: [] as Array<{ emailType: string; sent: number; opened: number; clicked: number }>
      };

      overall.recordset.forEach((row: any) => {
        stats[row.EventType as keyof typeof stats] = row.Count;
      });

      // Calculate rates
      if (stats.sent > 0) {
        stats.openRate = (stats.opened / stats.sent) * 100;
        stats.clickRate = (stats.clicked / stats.sent) * 100;
      }

      // Stats by email type
      const byType = await request
        .input('Days', sql.Int, days)
        .query(`
          SELECT 
            EmailType,
            SUM(CASE WHEN EventType = 'sent' THEN 1 ELSE 0 END) AS Sent,
            SUM(CASE WHEN EventType = 'opened' THEN 1 ELSE 0 END) AS Opened,
            SUM(CASE WHEN EventType = 'clicked' THEN 1 ELSE 0 END) AS Clicked
          FROM EmailTrackingEvents
          WHERE CreatedAt >= DATEADD(DAY, -@Days, GETUTCDATE())
          GROUP BY EmailType
        `);

      stats.byType = byType.recordset.map((row: any) => ({
        emailType: row.EmailType,
        sent: row.Sent,
        opened: row.Opened,
        clicked: row.Clicked
      }));

      return stats;
    } catch (error) {
      console.error('Error getting system email stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup old tracking events (older than 90 days)
   */
  async cleanupOldEvents(): Promise<number> {
    const request = await this.dbService.getRequest();

    try {
      const result = await request
        .query(`
          DELETE FROM EmailTrackingEvents
          WHERE CreatedAt < DATEADD(DAY, -90, GETUTCDATE())
        `);

      const deletedCount = result.rowsAffected[0];
      
      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} old email tracking events`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old tracking events:', error);
      return 0;
    }
  }
}

export default new EmailAnalyticsService();
