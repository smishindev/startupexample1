import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';

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
        // TODO: Queue notification for later delivery
        return '';
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
      
      return notificationId;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string, includeRead: boolean = true): Promise<Notification[]> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('IncludeRead', sql.Bit, includeRead)
        .query(`
          SELECT 
            Id, UserId, Type, Priority, Title, Message, Data,
            IsRead, 
            FORMAT(CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CreatedAt,
            FORMAT(ReadAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as ReadAt,
            FORMAT(ExpiresAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as ExpiresAt,
            ActionUrl, ActionText, RelatedEntityId, RelatedEntityType
          FROM Notifications
          WHERE UserId = @UserId
            AND (@IncludeRead = 1 OR IsRead = 0)
            AND (ExpiresAt IS NULL OR ExpiresAt > GETUTCDATE())
          ORDER BY CreatedAt DESC
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

      return result.rowsAffected[0] > 0;
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

      return result.rowsAffected[0];
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

      return result.rowsAffected[0] > 0;
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

    const [startHours, startMinutes] = preferences.QuietHoursStart.split(':').map(Number);
    const [endHours, endMinutes] = preferences.QuietHoursEnd.split(':').map(Number);
    
    const quietStart = startHours * 60 + startMinutes;
    const quietEnd = endHours * 60 + endMinutes;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }
    
    return currentTime >= quietStart && currentTime <= quietEnd;
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
}
