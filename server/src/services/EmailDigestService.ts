/**
 * Email Digest Service
 * Manages daily and weekly email digest aggregation and delivery
 * Created: December 28, 2025
 */

import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import EmailService from './EmailService';
import { Notification } from './NotificationService';

export interface DigestNotification {
  Id: string;
  Type: string;
  Priority: string;
  Title: string;
  Message: string;
  ActionUrl: string | null;
  ActionText: string | null;
  CreatedAt: string;
}

export interface UserDigest {
  userId: string;
  email: string;
  firstName: string;
  frequency: 'daily' | 'weekly';
  notifications: DigestNotification[];
}

export class EmailDigestService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Add a notification to the email digest queue
   */
  async addToDigest(
    userId: string,
    notificationId: string,
    frequency: 'daily' | 'weekly'
  ): Promise<string> {
    try {
      // Calculate scheduled delivery time
      const scheduledFor = this.calculateScheduledTime(frequency);

      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('NotificationId', sql.UniqueIdentifier, notificationId)
        .input('Frequency', sql.NVarChar(20), frequency)
        .input('ScheduledFor', sql.DateTime2, scheduledFor)
        .query(`
          INSERT INTO EmailDigests (UserId, NotificationId, Frequency, ScheduledFor)
          OUTPUT INSERTED.Id
          VALUES (@UserId, @NotificationId, @Frequency, @ScheduledFor)
        `);

      const digestId = result.recordset[0].Id;
      console.log(`📬 Notification ${notificationId} added to ${frequency} digest for user ${userId}`);
      return digestId;
    } catch (error) {
      console.error('❌ Error adding to digest:', error);
      throw error;
    }
  }

  /**
   * Calculate the next scheduled delivery time based on frequency
   * Uses UTC timezone for consistent scheduling across all users
   */
  private calculateScheduledTime(frequency: 'daily' | 'weekly'): Date {
    const now = new Date();
    const scheduled = new Date(now);

    if (frequency === 'daily') {
      // Schedule for next 8 AM UTC
      scheduled.setUTCHours(8, 0, 0, 0);
      
      // If it's already past 8 AM UTC today, schedule for tomorrow
      if (now.getUTCHours() >= 8) {
        scheduled.setUTCDate(scheduled.getUTCDate() + 1);
      }
    } else {
      // Schedule for next Monday 8 AM UTC
      scheduled.setUTCHours(8, 0, 0, 0);
      
      const dayOfWeek = scheduled.getUTCDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      
      scheduled.setUTCDate(scheduled.getUTCDate() + daysUntilMonday);
    }

    return scheduled;
  }

  /**
   * Get all digests ready to be sent
   */
  async getDigestsToSend(frequency: 'daily' | 'weekly'): Promise<UserDigest[]> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('Frequency', sql.NVarChar(20), frequency)
        .query(`
          SELECT 
            ED.UserId,
            U.Email,
            U.FirstName,
            ED.Frequency,
            N.Id,
            N.Type,
            N.Priority,
            N.Title,
            N.Message,
            N.ActionUrl,
            N.ActionText,
            FORMAT(N.CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CreatedAt
          FROM EmailDigests ED
          INNER JOIN Users U ON ED.UserId = U.Id
          INNER JOIN Notifications N ON ED.NotificationId = N.Id
          WHERE ED.Frequency = @Frequency
            AND ED.Sent = 0
            AND ED.ScheduledFor <= GETUTCDATE()
          ORDER BY ED.UserId, N.CreatedAt DESC
        `);

      // Group notifications by user
      const userDigestsMap = new Map<string, UserDigest>();

      for (const row of result.recordset) {
        if (!userDigestsMap.has(row.UserId)) {
          userDigestsMap.set(row.UserId, {
            userId: row.UserId,
            email: row.Email,
            firstName: row.FirstName,
            frequency: row.Frequency,
            notifications: []
          });
        }

        userDigestsMap.get(row.UserId)!.notifications.push({
          Id: row.Id,
          Type: row.Type,
          Priority: row.Priority,
          Title: row.Title,
          Message: row.Message,
          ActionUrl: row.ActionUrl,
          ActionText: row.ActionText,
          CreatedAt: row.CreatedAt
        });
      }

      return Array.from(userDigestsMap.values());
    } catch (error) {
      console.error('❌ Error getting digests to send:', error);
      throw error;
    }
  }

  /**
   * Send daily digests to all eligible users
   */
  async sendDailyDigests(): Promise<number> {
    try {
      console.log('📧 Processing daily email digests...');
      
      const digests = await this.getDigestsToSend('daily');
      
      if (digests.length === 0) {
        console.log('✨ No daily digests to send');
        return 0;
      }

      let sentCount = 0;

      for (const digest of digests) {
        try {
          // Send digest email
          const emailSent = await EmailService.sendDigestEmail({
            email: digest.email,
            firstName: digest.firstName,
            userId: digest.userId,
            digestId: digest.userId + '-daily-' + new Date().toISOString(),
            frequency: 'daily',
            notifications: digest.notifications
          });

          if (emailSent) {
            // Mark all digest entries as sent
            await this.markDigestAsSent(digest.userId, 'daily');
            sentCount++;
            console.log(`✅ Daily digest sent to ${digest.email} (${digest.notifications.length} notifications)`);
          } else {
            console.error(`❌ Failed to send daily digest to ${digest.email}`);
          }
        } catch (error) {
          console.error(`❌ Error sending daily digest to ${digest.email}:`, error);
        }
      }

      console.log(`📊 Sent ${sentCount} daily digests`);
      return sentCount;
    } catch (error) {
      console.error('❌ Error in sendDailyDigests:', error);
      throw error;
    }
  }

  /**
   * Send weekly digests to all eligible users
   */
  async sendWeeklyDigests(): Promise<number> {
    try {
      console.log('📧 Processing weekly email digests...');
      
      const digests = await this.getDigestsToSend('weekly');
      
      if (digests.length === 0) {
        console.log('✨ No weekly digests to send');
        return 0;
      }

      let sentCount = 0;

      for (const digest of digests) {
        try {
          // Send digest email
          const emailSent = await EmailService.sendDigestEmail({
            email: digest.email,
            firstName: digest.firstName,
            userId: digest.userId,
            digestId: digest.userId + '-weekly-' + new Date().toISOString(),
            frequency: 'weekly',
            notifications: digest.notifications
          });

          if (emailSent) {
            // Mark all digest entries as sent
            await this.markDigestAsSent(digest.userId, 'weekly');
            sentCount++;
            console.log(`✅ Weekly digest sent to ${digest.email} (${digest.notifications.length} notifications)`);
          } else {
            console.error(`❌ Failed to send weekly digest to ${digest.email}`);
          }
        } catch (error) {
          console.error(`❌ Error sending weekly digest to ${digest.email}:`, error);
        }
      }

      console.log(`📊 Sent ${sentCount} weekly digests`);
      return sentCount;
    } catch (error) {
      console.error('❌ Error in sendWeeklyDigests:', error);
      throw error;
    }
  }

  /**
   * Mark all digest entries as sent for a user
   */
  private async markDigestAsSent(userId: string, frequency: 'daily' | 'weekly'): Promise<void> {
    try {
      const request = await this.dbService.getRequest();
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('Frequency', sql.NVarChar(20), frequency)
        .query(`
          UPDATE EmailDigests
          SET Sent = 1, SentAt = GETUTCDATE()
          WHERE UserId = @UserId 
            AND Frequency = @Frequency 
            AND Sent = 0
            AND ScheduledFor <= GETUTCDATE()
        `);
    } catch (error) {
      console.error('❌ Error marking digest as sent:', error);
      throw error;
    }
  }

  /**
   * Clean up old sent digests (older than 30 days)
   */
  async cleanupOldDigests(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        DELETE FROM EmailDigests
        WHERE Sent = 1
          AND SentAt < DATEADD(DAY, -30, GETUTCDATE())
      `);

      const deletedCount = result.rowsAffected[0];
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old digest entries`);
      }
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old digests:', error);
      throw error;
    }
  }

  /**
   * Get digest statistics
   */
  async getDigestStats(): Promise<{ daily: number; weekly: number; pending: number }> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT 
          Frequency,
          SUM(CASE WHEN Sent = 0 THEN 1 ELSE 0 END) as Pending,
          SUM(CASE WHEN Sent = 1 THEN 1 ELSE 0 END) as Sent
        FROM EmailDigests
        GROUP BY Frequency
      `);

      const stats = { daily: 0, weekly: 0, pending: 0 };
      
      for (const row of result.recordset) {
        if (row.Frequency === 'daily') {
          stats.daily = row.Sent || 0;
          stats.pending += row.Pending || 0;
        } else if (row.Frequency === 'weekly') {
          stats.weekly = row.Sent || 0;
          stats.pending += row.Pending || 0;
        }
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting digest stats:', error);
      throw error;
    }
  }
}

export default new EmailDigestService();
