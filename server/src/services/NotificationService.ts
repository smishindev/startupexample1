import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
import EmailService from './EmailService';
import EmailDigestService from './EmailDigestService';

export interface CreateNotificationParams {
  userId: string;
  type: 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  actionText?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'course' | 'lesson' | 'assessment' | 'student';
  expiresAt?: Date;
}

export interface Notification {
  Id: string;
  UserId: string;
  Type: string;
  Priority: string;
  Title: string;
  Message: string;
  Data: any;
  IsRead: boolean;
  CreatedAt: Date;
  ReadAt: Date | null;
  ExpiresAt: Date | null;
  ActionUrl: string | null;
  ActionText: string | null;
  RelatedEntityId: string | null;
  RelatedEntityType: string | null;
}

export interface NotificationPreferences {
  UserId: string;
  EnableProgressNotifications: boolean;
  EnableRiskAlerts: boolean;
  EnableAchievementNotifications: boolean;
  EnableCourseUpdates: boolean;
  EnableAssignmentReminders: boolean;
  EnableEmailNotifications: boolean;
  EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  QuietHoursStart: string | null;
  QuietHoursEnd: string | null;
}

export class NotificationService {
  private dbService: DatabaseService;
  private io: Server | null = null;

  constructor(io?: Server) {
    this.dbService = DatabaseService.getInstance();
    if (io) {
      this.io = io;
    }
  }

  /**
   * Set Socket.io instance for real-time notifications
   */
  setSocketIO(io: Server): void {
    this.io = io;
  }

  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<string> {
    try {
      // Check user preferences before creating notification
      const preferences = await this.getUserPreferences(params.userId);
      if (!this.shouldSendNotification(params.type, preferences)) {
        console.log(`📵 Notification skipped for user ${params.userId} - type ${params.type} disabled in preferences`);
        return '';
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        console.log(`🔕 Notification delayed for user ${params.userId} - quiet hours active`);
        // Queue notification for later delivery
        return await this.queueNotification(params);
      }

      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, params.userId)
        .input('Type', sql.NVarChar(50), params.type)
        .input('Priority', sql.NVarChar(20), params.priority)
        .input('Title', sql.NVarChar(200), params.title)
        .input('Message', sql.NVarChar(sql.MAX), params.message)
        .input('Data', sql.NVarChar(sql.MAX), params.data ? JSON.stringify(params.data) : null)
        .input('ActionUrl', sql.NVarChar(500), params.actionUrl || null)
        .input('ActionText', sql.NVarChar(100), params.actionText || null)
        .input('RelatedEntityId', sql.UniqueIdentifier, params.relatedEntityId || null)
        .input('RelatedEntityType', sql.NVarChar(50), params.relatedEntityType || null)
        .input('ExpiresAt', sql.DateTime2, params.expiresAt || null)
        .query(`
          INSERT INTO Notifications (
            UserId, Type, Priority, Title, Message, Data,
            ActionUrl, ActionText, RelatedEntityId, RelatedEntityType, ExpiresAt
          )
          OUTPUT INSERTED.Id
          VALUES (
            @UserId, @Type, @Priority, @Title, @Message, @Data,
            @ActionUrl, @ActionText, @RelatedEntityId, @RelatedEntityType, @ExpiresAt
          )
        `);

      const notificationId = result.recordset[0].Id;
      console.log(`✅ Notification created: ${notificationId} for user ${params.userId}`);
      
      // Emit real-time notification via Socket.io
      if (this.io) {
        this.io.to(`user-${params.userId}`).emit('notification-created', {
          id: notificationId,
          type: params.type,
          priority: params.priority,
          title: params.title,
          message: params.message,
          data: params.data,
          actionUrl: params.actionUrl,
          actionText: params.actionText
        });
        console.log(`📡 Real-time notification sent to user-${params.userId}`);
      }

      // Handle email notifications based on frequency preference
      if (preferences.EnableEmailNotifications) {
        if (preferences.EmailDigestFrequency === 'realtime') {
          // Send email immediately
          console.log(`📧 Sending realtime email notification to user ${params.userId}`);
          this.sendEmailNotification(params.userId, {
            id: notificationId,
            type: params.type,
            priority: params.priority,
            title: params.title,
            message: params.message,
            actionUrl: params.actionUrl,
            actionText: params.actionText
          }).catch(error => {
            console.error(`❌ Failed to send email notification: ${error.message}`);
          });
        } else if (preferences.EmailDigestFrequency === 'daily' || preferences.EmailDigestFrequency === 'weekly') {
          // Add to digest queue
          console.log(`📬 Adding notification to ${preferences.EmailDigestFrequency} digest for user ${params.userId}`);
          EmailDigestService.addToDigest(
            params.userId,
            notificationId,
            preferences.EmailDigestFrequency as 'daily' | 'weekly'
          ).catch(error => {
            console.error(`❌ Failed to add to digest: ${error.message}`);
          });
        }
      }
      
      return notificationId;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(
    userId: string, 
    includeRead: boolean = true,
    options?: {
      type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    try {
      const request = await this.dbService.getRequest();
      request.input('UserId', sql.UniqueIdentifier, userId);
      request.input('IncludeRead', sql.Bit, includeRead);

      let whereConditions = [
        'UserId = @UserId',
        '(@IncludeRead = 1 OR IsRead = 0)',
        '(ExpiresAt IS NULL OR ExpiresAt > GETUTCDATE())'
      ];

      // Add type filter
      if (options?.type && options.type !== 'all') {
        request.input('Type', sql.NVarChar(50), options.type);
        whereConditions.push('Type = @Type');
      }

      // Add priority filter
      if (options?.priority && options.priority !== 'all') {
        request.input('Priority', sql.NVarChar(20), options.priority);
        whereConditions.push('Priority = @Priority');
      }

      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      request.input('Limit', sql.Int, limit);
      request.input('Offset', sql.Int, offset);

      const result = await request.query(`
        SELECT 
          Id, UserId, Type, Priority, Title, Message, Data,
          IsRead, 
          FORMAT(CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CreatedAt,
          FORMAT(ReadAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as ReadAt,
          FORMAT(ExpiresAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as ExpiresAt,
          ActionUrl, ActionText, RelatedEntityId, RelatedEntityType
        FROM Notifications
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY CreatedAt DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limit ROWS ONLY
      `);

      return result.recordset.map((record: any) => ({
        ...record,
        Data: record.Data ? JSON.parse(record.Data) : null,
        ReadAt: record.ReadAt === 'Z' ? null : record.ReadAt,
        ExpiresAt: record.ExpiresAt === 'Z' ? null : record.ExpiresAt
      }));
    } catch (error) {
      console.error('❌ Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT COUNT(*) as UnreadCount
          FROM Notifications
          WHERE UserId = @UserId
            AND IsRead = 0
            AND (ExpiresAt IS NULL OR ExpiresAt > GETUTCDATE())
        `);

      return result.recordset[0].UnreadCount;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('Id', sql.UniqueIdentifier, notificationId)
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          UPDATE Notifications
          SET IsRead = 1, ReadAt = GETUTCDATE()
          WHERE Id = @Id AND UserId = @UserId
        `);

      const success = result.rowsAffected[0] > 0;
      if (success && this.io) {
        this.io.to(`user-${userId}`).emit('notification-read', { notificationId });
      }
      return success;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          UPDATE Notifications
          SET IsRead = 1, ReadAt = GETUTCDATE()
          WHERE UserId = @UserId AND IsRead = 0
        `);

      const count = result.rowsAffected[0];
      if (count > 0 && this.io) {
        this.io.to(`user-${userId}`).emit('notifications-read-all', { count });
      }
      return count;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('Id', sql.UniqueIdentifier, notificationId)
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          DELETE FROM Notifications
          WHERE Id = @Id AND UserId = @UserId
        `);

      const success = result.rowsAffected[0] > 0;
      if (success && this.io) {
        this.io.to(`user-${userId}`).emit('notification-deleted', { notificationId });
      }
      return success;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 
            UserId, EnableProgressNotifications, EnableRiskAlerts,
            EnableAchievementNotifications, EnableCourseUpdates,
            EnableAssignmentReminders, EnableEmailNotifications,
            EmailDigestFrequency, QuietHoursStart, QuietHoursEnd
          FROM NotificationPreferences
          WHERE UserId = @UserId
        `);

      if (result.recordset.length === 0) {
        // Create default preferences if not exists
        return await this.createDefaultPreferences(userId);
      }

      return result.recordset[0];
    } catch (error) {
      console.error('❌ Error fetching notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      console.log('🔧 updatePreferences called for userId:', userId);
      console.log('🔧 preferences data:', JSON.stringify(preferences, null, 2));
      
      // First, ensure the user has a preferences record
      const request = await this.dbService.getRequest();
      request.input('UserId', sql.UniqueIdentifier, userId);
      
      // Check if preferences exist
      const checkResult = await request.query(`
        SELECT COUNT(*) as count FROM NotificationPreferences WHERE UserId = @UserId
      `);
      
      const exists = checkResult.recordset[0].count > 0;
      console.log('🔧 Preferences exist:', exists);
      
      if (!exists) {
        // Create default preferences first
        console.log('🔧 Creating default preferences...');
        await this.createDefaultPreferences(userId);
        console.log('🔧 Default preferences created');
      }

      // Now update with the provided preferences
      const updates: string[] = [];
      const updateRequest = await this.dbService.getRequest();
      updateRequest.input('UserId', sql.UniqueIdentifier, userId);

      if (preferences.EnableProgressNotifications !== undefined) {
        updates.push('EnableProgressNotifications = @EnableProgressNotifications');
        updateRequest.input('EnableProgressNotifications', sql.Bit, preferences.EnableProgressNotifications);
      }
      if (preferences.EnableRiskAlerts !== undefined) {
        updates.push('EnableRiskAlerts = @EnableRiskAlerts');
        updateRequest.input('EnableRiskAlerts', sql.Bit, preferences.EnableRiskAlerts);
      }
      if (preferences.EnableAchievementNotifications !== undefined) {
        updates.push('EnableAchievementNotifications = @EnableAchievementNotifications');
        updateRequest.input('EnableAchievementNotifications', sql.Bit, preferences.EnableAchievementNotifications);
      }
      if (preferences.EnableCourseUpdates !== undefined) {
        updates.push('EnableCourseUpdates = @EnableCourseUpdates');
        updateRequest.input('EnableCourseUpdates', sql.Bit, preferences.EnableCourseUpdates);
      }
      if (preferences.EnableAssignmentReminders !== undefined) {
        updates.push('EnableAssignmentReminders = @EnableAssignmentReminders');
        updateRequest.input('EnableAssignmentReminders', sql.Bit, preferences.EnableAssignmentReminders);
      }
      if (preferences.EnableEmailNotifications !== undefined) {
        updates.push('EnableEmailNotifications = @EnableEmailNotifications');
        updateRequest.input('EnableEmailNotifications', sql.Bit, preferences.EnableEmailNotifications);
      }
      if (preferences.EmailDigestFrequency !== undefined) {
        updates.push('EmailDigestFrequency = @EmailDigestFrequency');
        updateRequest.input('EmailDigestFrequency', sql.NVarChar(20), preferences.EmailDigestFrequency);
      }
      if (preferences.QuietHoursStart !== undefined) {
        updates.push('QuietHoursStart = @QuietHoursStart');
        // Handle null or convert time string properly
        let startTime = null;
        if (preferences.QuietHoursStart) {
          const timeStr = preferences.QuietHoursStart.length === 5 ? 
            `${preferences.QuietHoursStart}:00` : preferences.QuietHoursStart;
          // Create a date object with just the time component
          const today = new Date().toISOString().split('T')[0];
          startTime = new Date(`${today}T${timeStr}`);
        }
        updateRequest.input('QuietHoursStart', sql.Time, startTime);
      }
      if (preferences.QuietHoursEnd !== undefined) {
        updates.push('QuietHoursEnd = @QuietHoursEnd');
        // Handle null or convert time string properly
        let endTime = null;
        if (preferences.QuietHoursEnd) {
          const timeStr = preferences.QuietHoursEnd.length === 5 ? 
            `${preferences.QuietHoursEnd}:00` : preferences.QuietHoursEnd;
          // Create a date object with just the time component
          const today = new Date().toISOString().split('T')[0];
          endTime = new Date(`${today}T${timeStr}`);
        }
        updateRequest.input('QuietHoursEnd', sql.Time, endTime);
      }

      if (updates.length === 0) {
        console.log('🔧 No updates to perform');
        return true; // No updates to perform
      }

      updates.push('UpdatedAt = GETUTCDATE()');

      console.log('🔧 Executing UPDATE with fields:', updates);
      const result = await updateRequest.query(`
        UPDATE NotificationPreferences
        SET ${updates.join(', ')}
        WHERE UserId = @UserId
      `);

      console.log('🔧 Update result - rowsAffected:', result.rowsAffected[0]);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Create default notification preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const request = await this.dbService.getRequest();
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          INSERT INTO NotificationPreferences (UserId)
          VALUES (@UserId)
        `);

      // Return default preferences
      return {
        UserId: userId,
        EnableProgressNotifications: true,
        EnableRiskAlerts: true,
        EnableAchievementNotifications: true,
        EnableCourseUpdates: true,
        EnableAssignmentReminders: true,
        EnableEmailNotifications: true,
        EmailDigestFrequency: 'daily',
        QuietHoursStart: null,
        QuietHoursEnd: null
      };
    } catch (error) {
      console.error('❌ Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Check if a notification type should be sent based on user preferences
   */
  private shouldSendNotification(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'progress':
        return preferences.EnableProgressNotifications;
      case 'risk':
      case 'intervention':
        return preferences.EnableRiskAlerts;
      case 'achievement':
        return preferences.EnableAchievementNotifications;
      case 'course':
        return preferences.EnableCourseUpdates;
      case 'assignment':
        return preferences.EnableAssignmentReminders;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.QuietHoursStart || !preferences.QuietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    // Parse quiet hours - can be string "HH:mm:ss" or Date object
    const parseTime = (timeValue: string | Date): number => {
      if (timeValue instanceof Date) {
        return timeValue.getHours() * 60 + timeValue.getMinutes();
      }
      // Handle string format "HH:mm:ss" or "HH:mm"
      const [hours, minutes] = String(timeValue).split(':').map(Number);
      return hours * 60 + minutes;
    };

    const quietStart = parseTime(preferences.QuietHoursStart as any);
    const quietEnd = parseTime(preferences.QuietHoursEnd as any);

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
    
    return currentTime >= quietStart && currentTime <= quietEnd;
  }

  /**
   * Send email notification to user
   */
  private async sendEmailNotification(
    userId: string,
    notification: {
      id: string;
      type: 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course';
      priority: 'low' | 'normal' | 'high' | 'urgent';
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
    }
  ): Promise<void> {
    try {
      // Fetch user details (email and name)
      const request = await this.dbService.getRequest();
      const userResult = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Email, FirstName 
          FROM Users 
          WHERE Id = @UserId
        `);

      if (userResult.recordset.length === 0) {
        console.error(`❌ User not found for email notification: ${userId}`);
        return;
      }

      const user = userResult.recordset[0];
      
      // Convert actionUrl to absolute URL if it's relative
      let absoluteActionUrl = notification.actionUrl;
      if (absoluteActionUrl && !absoluteActionUrl.startsWith('http')) {
        // Use frontend URL from environment or default to localhost:5173
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        absoluteActionUrl = `${frontendUrl}${absoluteActionUrl}`;
      }

      // Send email via EmailService
      const emailSent = await EmailService.sendNotificationEmail({
        email: user.Email,
        firstName: user.FirstName,
        userId: userId,
        notificationId: notification.id,
        notification: {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          actionUrl: absoluteActionUrl,
          actionText: notification.actionText
        }
      });

      if (emailSent) {
        console.log(`✅ Email notification sent to ${user.Email} (${user.FirstName})`);
      } else {
        console.error(`❌ Failed to send email notification to ${user.Email}`);
      }
    } catch (error) {
      console.error('❌ Error in sendEmailNotification:', error);
      // Don't throw - email failures shouldn't break notification creation
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .query(`
          DELETE FROM Notifications
          WHERE ExpiresAt IS NOT NULL AND ExpiresAt < GETUTCDATE()
        `);

      const deletedCount = result.rowsAffected[0];
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired notifications`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired notifications:', error);
      throw error;
    }
  }

  /**
   * Queue notification for later delivery (during quiet hours)
   */
  async queueNotification(params: CreateNotificationParams): Promise<string> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, params.userId)
        .input('Type', sql.NVarChar(50), params.type)
        .input('Priority', sql.NVarChar(20), params.priority)
        .input('Title', sql.NVarChar(200), params.title)
        .input('Message', sql.NVarChar(sql.MAX), params.message)
        .input('Data', sql.NVarChar(sql.MAX), params.data ? JSON.stringify(params.data) : null)
        .input('ActionUrl', sql.NVarChar(500), params.actionUrl || null)
        .input('ActionText', sql.NVarChar(100), params.actionText || null)
        .input('RelatedEntityId', sql.UniqueIdentifier, params.relatedEntityId || null)
        .input('RelatedEntityType', sql.NVarChar(50), params.relatedEntityType || null)
        .input('ExpiresAt', sql.DateTime2, params.expiresAt || null)
        .query(`
          INSERT INTO NotificationQueue (
            UserId, Type, Priority, Title, Message, Data,
            ActionUrl, ActionText, RelatedEntityId, RelatedEntityType, ExpiresAt
          )
          OUTPUT INSERTED.Id
          VALUES (
            @UserId, @Type, @Priority, @Title, @Message, @Data,
            @ActionUrl, @ActionText, @RelatedEntityId, @RelatedEntityType, @ExpiresAt
          )
        `);

      const queueId = result.recordset[0].Id;
      console.log(`⏰ Notification queued: ${queueId} for user ${params.userId} (quiet hours)`);
      return queueId;
    } catch (error) {
      console.error('❌ Error queueing notification:', error);
      throw error;
    }
  }

  /**
   * Process queued notifications for all users whose quiet hours have ended
   */
  async processQueuedNotifications(): Promise<number> {
    try {
      console.log('🔄 Processing queued notifications...');
      
      // Get all queued notifications with user preferences
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT 
          Q.Id, Q.UserId, Q.Type, Q.Priority, Q.Title, Q.Message, Q.Data,
          Q.ActionUrl, Q.ActionText, Q.RelatedEntityId, Q.RelatedEntityType, Q.ExpiresAt,
          NP.QuietHoursStart, NP.QuietHoursEnd
        FROM NotificationQueue Q
        LEFT JOIN NotificationPreferences NP ON Q.UserId = NP.UserId
        WHERE Q.Status = 'queued'
          AND (Q.ExpiresAt IS NULL OR Q.ExpiresAt > GETUTCDATE())
      `);

      const queuedNotifications = result.recordset;
      let processedCount = 0;

      for (const queued of queuedNotifications) {
        const preferences: NotificationPreferences = {
          UserId: queued.UserId,
          EnableProgressNotifications: true,
          EnableRiskAlerts: true,
          EnableAchievementNotifications: true,
          EnableCourseUpdates: true,
          EnableAssignmentReminders: true,
          EnableEmailNotifications: false,
          EmailDigestFrequency: 'none',
          QuietHoursStart: queued.QuietHoursStart,
          QuietHoursEnd: queued.QuietHoursEnd
        };

        // Check if still in quiet hours
        if (this.isInQuietHours(preferences)) {
          continue; // Still in quiet hours, skip for now
        }

        // Quiet hours ended, deliver notification
        try {
          // Get full user preferences to check email settings
          const fullPreferences = await this.getUserPreferences(queued.UserId);

          // Create the actual notification (recursive call without preferences check)
          const notificationId = await this.createNotificationDirect({
            userId: queued.UserId,
            type: queued.Type,
            priority: queued.Priority,
            title: queued.Title,
            message: queued.Message,
            data: queued.Data ? JSON.parse(queued.Data) : undefined,
            actionUrl: queued.ActionUrl || undefined,
            actionText: queued.ActionText || undefined,
            relatedEntityId: queued.RelatedEntityId || undefined,
            relatedEntityType: queued.RelatedEntityType as any,
            expiresAt: queued.ExpiresAt ? new Date(queued.ExpiresAt) : undefined
          });

          // Send email if enabled and frequency is 'realtime'
          if (fullPreferences.EnableEmailNotifications && fullPreferences.EmailDigestFrequency === 'realtime') {
            console.log(`📧 Sending email for queued notification to user ${queued.UserId}`);
            this.sendEmailNotification(queued.UserId, {
              id: notificationId,
              type: queued.Type,
              priority: queued.Priority,
              title: queued.Title,
              message: queued.Message,
              actionUrl: queued.ActionUrl || undefined,
              actionText: queued.ActionText || undefined
            }).catch(error => {
              console.error(`❌ Failed to send email for queued notification: ${error.message}`);
            });
          }

          // Mark as delivered
          await this.markQueuedAsDelivered(queued.Id);
          processedCount++;
          
          console.log(`✅ Delivered queued notification: ${queued.Id} → ${notificationId} to user ${queued.UserId}`);
        } catch (error) {
          console.error(`❌ Failed to deliver queued notification ${queued.Id}:`, error);
        }
      }

      if (processedCount > 0) {
        console.log(`🎯 Processed ${processedCount} queued notifications`);
      }
      return processedCount;
    } catch (error) {
      console.error('❌ Error processing queued notifications:', error);
      throw error;
    }
  }

  /**
   * Create notification directly without preferences check (for internal use)
   */
  private async createNotificationDirect(params: CreateNotificationParams): Promise<string> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, params.userId)
        .input('Type', sql.NVarChar(50), params.type)
        .input('Priority', sql.NVarChar(20), params.priority)
        .input('Title', sql.NVarChar(200), params.title)
        .input('Message', sql.NVarChar(sql.MAX), params.message)
        .input('Data', sql.NVarChar(sql.MAX), params.data ? JSON.stringify(params.data) : null)
        .input('ActionUrl', sql.NVarChar(500), params.actionUrl || null)
        .input('ActionText', sql.NVarChar(100), params.actionText || null)
        .input('RelatedEntityId', sql.UniqueIdentifier, params.relatedEntityId || null)
        .input('RelatedEntityType', sql.NVarChar(50), params.relatedEntityType || null)
        .input('ExpiresAt', sql.DateTime2, params.expiresAt || null)
        .query(`
          INSERT INTO Notifications (
            UserId, Type, Priority, Title, Message, Data,
            ActionUrl, ActionText, RelatedEntityId, RelatedEntityType, ExpiresAt
          )
          OUTPUT INSERTED.Id
          VALUES (
            @UserId, @Type, @Priority, @Title, @Message, @Data,
            @ActionUrl, @ActionText, @RelatedEntityId, @RelatedEntityType, @ExpiresAt
          )
        `);

      const notificationId = result.recordset[0].Id;
      
      // Emit real-time notification via Socket.io
      if (this.io) {
        this.io.to(`user-${params.userId}`).emit('notification-created', {
          id: notificationId,
          type: params.type,
          priority: params.priority,
          title: params.title,
          message: params.message,
          data: params.data,
          actionUrl: params.actionUrl,
          actionText: params.actionText
        });
        console.log(`📡 Real-time notification sent to user-${params.userId}`);
      }
      
      return notificationId;
    } catch (error) {
      console.error('❌ Error creating notification directly:', error);
      throw error;
    }
  }

  /**
   * Mark queued notification as delivered
   */
  private async markQueuedAsDelivered(queueId: string): Promise<void> {
    const request = await this.dbService.getRequest();
    await request
      .input('Id', sql.UniqueIdentifier, queueId)
      .query(`
        UPDATE NotificationQueue
        SET Status = 'delivered', DeliveredAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
        WHERE Id = @Id
      `);
  }

  /**
   * Clean up expired queued notifications
   */
  async cleanupExpiredQueue(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        UPDATE NotificationQueue
        SET Status = 'expired', UpdatedAt = GETUTCDATE()
        WHERE Status = 'queued'
          AND ExpiresAt IS NOT NULL 
          AND ExpiresAt < GETUTCDATE()
      `);

      const expiredCount = result.rowsAffected[0];
      if (expiredCount > 0) {
        console.log(`🧹 Marked ${expiredCount} queued notifications as expired`);
      }
      
      return expiredCount;
    } catch (error) {
      console.error('❌ Error cleaning up expired queue:', error);
      throw error;
    }
  }

  /**
   * Get queued notification count for a user
   */
  async getQueuedCount(userId: string): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT COUNT(*) as QueuedCount
          FROM NotificationQueue
          WHERE UserId = @UserId AND Status = 'queued'
        `);
      return result.recordset[0].QueuedCount;
    } catch (error) {
      console.error('❌ Error getting queued count:', error);
      throw error;
    }
  }
}
