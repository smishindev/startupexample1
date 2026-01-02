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
  // Global toggles
  EnableInAppNotifications: boolean;
  EnableEmailNotifications: boolean;
  EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  QuietHoursStart: string | null;
  QuietHoursEnd: string | null;
  
  // Category toggles
  EnableProgressUpdates: boolean;
  EnableCourseUpdates: boolean;
  EnableAssessmentUpdates: boolean;
  EnableCommunityUpdates: boolean;
  EnableSystemAlerts: boolean;
  
  // Progress Updates subcategories
  EnableLessonCompletion: boolean | null;
  EnableVideoCompletion: boolean | null;
  EnableCourseMilestones: boolean | null;
  EnableProgressSummary: boolean | null;
  EmailLessonCompletion: boolean | null;
  EmailVideoCompletion: boolean | null;
  EmailCourseMilestones: boolean | null;
  EmailProgressSummary: boolean | null;
  
  // Course Updates subcategories
  EnableCourseEnrollment: boolean | null;
  EnableNewLessons: boolean | null;
  EnableLiveSessions: boolean | null;
  EnableCoursePublished: boolean | null;
  EnableInstructorAnnouncements: boolean | null;
  EmailCourseEnrollment: boolean | null;
  EmailNewLessons: boolean | null;
  EmailLiveSessions: boolean | null;
  EmailCoursePublished: boolean | null;
  EmailInstructorAnnouncements: boolean | null;
  
  // Assessment Updates subcategories
  EnableAssessmentSubmitted: boolean | null;
  EnableAssessmentGraded: boolean | null;
  EnableNewAssessment: boolean | null;
  EnableAssessmentDue: boolean | null;
  EnableSubmissionToGrade: boolean | null;
  EmailAssessmentSubmitted: boolean | null;
  EmailAssessmentGraded: boolean | null;
  EmailNewAssessment: boolean | null;
  EmailAssessmentDue: boolean | null;
  EmailSubmissionToGrade: boolean | null;
  
  // Community Updates subcategories
  EnableComments: boolean | null;
  EnableReplies: boolean | null;
  EnableMentions: boolean | null;
  EnableGroupInvites: boolean | null;
  EnableOfficeHours: boolean | null;
  EmailComments: boolean | null;
  EmailReplies: boolean | null;
  EmailMentions: boolean | null;
  EmailGroupInvites: boolean | null;
  EmailOfficeHours: boolean | null;
  
  // System Alerts subcategories
  EnablePaymentConfirmation: boolean | null;
  EnableRefundConfirmation: boolean | null;
  EnableCertificates: boolean | null;
  EnableSecurityAlerts: boolean | null;
  EnableProfileUpdates: boolean | null;
  EmailPaymentConfirmation: boolean | null;
  EmailRefundConfirmation: boolean | null;
  EmailCertificates: boolean | null;
  EmailSecurityAlerts: boolean | null;
  EmailProfileUpdates: boolean | null;
}

export interface NotificationCheckParams {
  category: 'progress' | 'course' | 'assessment' | 'community' | 'system';
  subcategory?: string; // e.g., 'LessonCompletion', 'VideoCompletion'
  checkEmail?: boolean; // Check email-specific toggle
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
      
      // Use legacy checking for backwards compatibility
      // TODO: Update all triggers to use new NotificationCheckParams format
      if (!this.shouldSendNotificationLegacy(params.type, preferences)) {
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
   * Create a notification with hybrid control checking (NEW METHOD)
   * Use this method for new triggers to support granular subcategory controls
   * 
   * @param params Notification parameters
   * @param checkParams Control check parameters (category + subcategory)
   * @returns Notification ID or empty string if skipped
   */
  async createNotificationWithControls(
    params: CreateNotificationParams,
    checkParams: NotificationCheckParams
  ): Promise<string> {
    try {
      // Check user preferences with hybrid control system
      const preferences = await this.getUserPreferences(params.userId);
      
      // Check if EITHER in-app OR email notification should be sent
      const shouldSendInApp = this.shouldSendNotification(checkParams, preferences);
      const shouldSendEmail = this.shouldSendNotification({ ...checkParams, checkEmail: true }, preferences);
      
      if (!shouldSendInApp && !shouldSendEmail) {
        console.log(`📵 Notification completely blocked for user ${params.userId} - both in-app and email disabled`);
        return '';
      }

      console.log(`✅ Notification allowed for user ${params.userId} - InApp: ${shouldSendInApp}, Email: ${shouldSendEmail}`);

      // Check quiet hours (only affects in-app notifications)
      if (shouldSendInApp && this.isInQuietHours(preferences)) {
        console.log(`🔕 In-app notification delayed for user ${params.userId} - quiet hours active`);
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
      
      // Emit real-time notification via Socket.io (only if in-app is enabled)
      if (shouldSendInApp && this.io) {
        this.io.to(`user-${params.userId}`).emit('notification-created', {
          id: notificationId,
          userId: params.userId,
          type: params.type,
          priority: params.priority,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
          actionText: params.actionText,
          createdAt: new Date().toISOString()
        });
        console.log(`🔔 Socket.io event emitted to user-${params.userId}`);
      }

      // Send email if enabled (we already checked shouldSendEmail at the start)
      if (shouldSendEmail && preferences.EmailDigestFrequency === 'realtime') {
        console.log(`📧 Sending realtime email to user ${params.userId}`);
        // Get user info for email
        const userResult = await (await this.dbService.getRequest())
          .input('userId', sql.VarChar(50), params.userId)
          .query('SELECT Email, FirstName FROM Users WHERE UserID = @userId');
        
        if (userResult.recordset.length > 0) {
          const user = userResult.recordset[0];
          await EmailService.sendNotificationEmail({
            email: user.Email,
            firstName: user.FirstName,
            userId: params.userId,
            notificationId: notificationId,
            notification: {
              title: params.title,
              message: params.message,
              type: params.type as 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course',
              priority: params.priority,
              actionUrl: params.actionUrl,
              actionText: params.actionText
            }
          });
        }
      } else if (shouldSendEmail && (preferences.EmailDigestFrequency === 'daily' || preferences.EmailDigestFrequency === 'weekly')) {
        console.log(`📧 Notification will be included in ${preferences.EmailDigestFrequency} digest`);
        // Will be picked up by digest cron job
      }

      return notificationId;
    } catch (error) {
      console.error('❌ Error creating notification with controls:', error);
      return '';
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
            UserId, EnableInAppNotifications, EnableProgressUpdates, EnableSystemAlerts,
            EnableCommunityUpdates, EnableCourseUpdates,
            EnableAssessmentUpdates, EnableEmailNotifications,
            EmailDigestFrequency, QuietHoursStart, QuietHoursEnd,
            EnableLessonCompletion, EmailLessonCompletion,
            EnableVideoCompletion, EmailVideoCompletion,
            EnableCourseMilestones, EmailCourseMilestones,
            EnableProgressSummary, EmailProgressSummary,
            EnableCourseEnrollment, EmailCourseEnrollment,
            EnableNewLessons, EmailNewLessons,
            EnableLiveSessions, EmailLiveSessions,
            EnableCoursePublished, EmailCoursePublished,
            EnableInstructorAnnouncements, EmailInstructorAnnouncements,
            EnableAssessmentSubmitted, EmailAssessmentSubmitted,
            EnableAssessmentGraded, EmailAssessmentGraded,
            EnableNewAssessment, EmailNewAssessment,
            EnableAssessmentDue, EmailAssessmentDue,
            EnableSubmissionToGrade, EmailSubmissionToGrade,
            EnableComments, EmailComments,
            EnableReplies, EmailReplies,
            EnableMentions, EmailMentions,
            EnableGroupInvites, EmailGroupInvites,
            EnableOfficeHours, EmailOfficeHours,
            EnablePaymentConfirmation, EmailPaymentConfirmation,
            EnableRefundConfirmation, EmailRefundConfirmation,
            EnableCertificates, EmailCertificates,
            EnableSecurityAlerts, EmailSecurityAlerts,
            EnableProfileUpdates, EmailProfileUpdates
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

      // Global and category controls
      if (preferences.EnableInAppNotifications !== undefined) {
        updates.push('EnableInAppNotifications = @EnableInAppNotifications');
        updateRequest.input('EnableInAppNotifications', sql.Bit, preferences.EnableInAppNotifications);
      }
      if (preferences.EnableProgressUpdates !== undefined) {
        updates.push('EnableProgressUpdates = @EnableProgressUpdates');
        updateRequest.input('EnableProgressUpdates', sql.Bit, preferences.EnableProgressUpdates);
      }
      if (preferences.EnableSystemAlerts !== undefined) {
        updates.push('EnableSystemAlerts = @EnableSystemAlerts');
        updateRequest.input('EnableSystemAlerts', sql.Bit, preferences.EnableSystemAlerts);
      }
      if (preferences.EnableCommunityUpdates !== undefined) {
        updates.push('EnableCommunityUpdates = @EnableCommunityUpdates');
        updateRequest.input('EnableCommunityUpdates', sql.Bit, preferences.EnableCommunityUpdates);
      }
      if (preferences.EnableCourseUpdates !== undefined) {
        updates.push('EnableCourseUpdates = @EnableCourseUpdates');
        updateRequest.input('EnableCourseUpdates', sql.Bit, preferences.EnableCourseUpdates);
      }
      if (preferences.EnableAssessmentUpdates !== undefined) {
        updates.push('EnableAssessmentUpdates = @EnableAssessmentUpdates');
        updateRequest.input('EnableAssessmentUpdates', sql.Bit, preferences.EnableAssessmentUpdates);
      }
      if (preferences.EnableEmailNotifications !== undefined) {
        updates.push('EnableEmailNotifications = @EnableEmailNotifications');
        updateRequest.input('EnableEmailNotifications', sql.Bit, preferences.EnableEmailNotifications);
      }
      if (preferences.EmailDigestFrequency !== undefined) {
        updates.push('EmailDigestFrequency = @EmailDigestFrequency');
        updateRequest.input('EmailDigestFrequency', sql.NVarChar(20), preferences.EmailDigestFrequency);
      }
      
      // Progress subcategories
      const progressFields = ['EnableLessonCompletion', 'EmailLessonCompletion', 'EnableVideoCompletion', 'EmailVideoCompletion',
        'EnableCourseMilestones', 'EmailCourseMilestones', 'EnableProgressSummary', 'EmailProgressSummary'];
      // Course subcategories
      const courseFields = ['EnableCourseEnrollment', 'EmailCourseEnrollment', 'EnableNewLessons', 'EmailNewLessons',
        'EnableLiveSessions', 'EmailLiveSessions', 'EnableCoursePublished', 'EmailCoursePublished',
        'EnableInstructorAnnouncements', 'EmailInstructorAnnouncements'];
      // Assessment subcategories
      const assessmentFields = ['EnableAssessmentSubmitted', 'EmailAssessmentSubmitted', 'EnableAssessmentGraded', 'EmailAssessmentGraded',
        'EnableNewAssessment', 'EmailNewAssessment', 'EnableAssessmentDue', 'EmailAssessmentDue',
        'EnableSubmissionToGrade', 'EmailSubmissionToGrade'];
      // Community subcategories
      const communityFields = ['EnableComments', 'EmailComments', 'EnableReplies', 'EmailReplies',
        'EnableMentions', 'EmailMentions', 'EnableGroupInvites', 'EmailGroupInvites',
        'EnableOfficeHours', 'EmailOfficeHours'];
      // System subcategories
      const systemFields = ['EnablePaymentConfirmation', 'EmailPaymentConfirmation', 'EnableRefundConfirmation', 'EmailRefundConfirmation',
        'EnableCertificates', 'EmailCertificates', 'EnableSecurityAlerts', 'EmailSecurityAlerts',
        'EnableProfileUpdates', 'EmailProfileUpdates'];
      
      const allSubcategoryFields = [...progressFields, ...courseFields, ...assessmentFields, ...communityFields, ...systemFields];
      
      for (const field of allSubcategoryFields) {
        const value = (preferences as any)[field];
        if (value !== undefined) {
          updates.push(`${field} = @${field}`);
          updateRequest.input(field, sql.Bit, value);
        }
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

      // Re-fetch the preferences to get database default values
      const result = await request
        .input('UserId2', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 
            UserId, EnableInAppNotifications, EnableProgressUpdates, EnableSystemAlerts,
            EnableCommunityUpdates, EnableCourseUpdates,
            EnableAssessmentUpdates, EnableEmailNotifications,
            EmailDigestFrequency, QuietHoursStart, QuietHoursEnd,
            EnableLessonCompletion, EmailLessonCompletion,
            EnableVideoCompletion, EmailVideoCompletion,
            EnableCourseMilestones, EmailCourseMilestones,
            EnableProgressSummary, EmailProgressSummary,
            EnableCourseEnrollment, EmailCourseEnrollment,
            EnableNewLessons, EmailNewLessons,
            EnableLiveSessions, EmailLiveSessions,
            EnableCoursePublished, EmailCoursePublished,
            EnableInstructorAnnouncements, EmailInstructorAnnouncements,
            EnableAssessmentSubmitted, EmailAssessmentSubmitted,
            EnableAssessmentGraded, EmailAssessmentGraded,
            EnableNewAssessment, EmailNewAssessment,
            EnableAssessmentDue, EmailAssessmentDue,
            EnableSubmissionToGrade, EmailSubmissionToGrade,
            EnableComments, EmailComments,
            EnableReplies, EmailReplies,
            EnableMentions, EmailMentions,
            EnableGroupInvites, EmailGroupInvites,
            EnableOfficeHours, EmailOfficeHours,
            EnablePaymentConfirmation, EmailPaymentConfirmation,
            EnableRefundConfirmation, EmailRefundConfirmation,
            EnableCertificates, EmailCertificates,
            EnableSecurityAlerts, EmailSecurityAlerts,
            EnableProfileUpdates, EmailProfileUpdates
          FROM NotificationPreferences
          WHERE UserId = @UserId2
        `);

      return result.recordset[0];
    } catch (error) {
      console.error('❌ Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Check if a notification type should be sent based on user preferences
   * Supports hybrid control: Global → Category → Subcategory
   * 
   * @param params Notification check parameters
   * @param preferences User notification preferences
   * @returns true if notification should be sent, false otherwise
   */
  private shouldSendNotification(
    params: NotificationCheckParams,
    preferences: NotificationPreferences
  ): boolean {
    const { category, subcategory, checkEmail = false } = params;

    // 1. Check global toggle
    if (checkEmail) {
      if (!preferences.EnableEmailNotifications) {
        console.log(`📵 Email disabled globally for user`);
        return false;
      }
    } else {
      if (!preferences.EnableInAppNotifications) {
        console.log(`📵 In-app notifications disabled globally for user`);
        return false;
      }
    }

    // 2. Check category toggle
    let categoryEnabled = false;
    switch (category) {
      case 'progress':
        categoryEnabled = preferences.EnableProgressUpdates;
        break;
      case 'course':
        categoryEnabled = preferences.EnableCourseUpdates;
        break;
      case 'assessment':
        categoryEnabled = preferences.EnableAssessmentUpdates;
        break;
      case 'community':
        categoryEnabled = preferences.EnableCommunityUpdates;
        break;
      case 'system':
        categoryEnabled = preferences.EnableSystemAlerts;
        break;
    }

    if (!categoryEnabled) {
      console.log(`📵 Category '${category}' disabled for user`);
      return false;
    }

    // 3. Check subcategory toggle (if specified)
    if (subcategory) {
      const subcategoryKey = (checkEmail ? `Email${subcategory}` : `Enable${subcategory}`) as keyof NotificationPreferences;
      const subcategoryValue = preferences[subcategoryKey];

      // NULL/undefined = inherit from category, 0 = OFF, 1 = ON
      if (subcategoryValue === null || subcategoryValue === undefined) {
        console.log(`✅ Subcategory '${subcategory}' inherits from category '${category}' (enabled)`);
        return categoryEnabled; // Inherit from category
      }

      if (subcategoryValue === false) {
        console.log(`📵 Subcategory '${subcategory}' explicitly disabled`);
        return false;
      }

      console.log(`✅ Subcategory '${subcategory}' explicitly enabled`);
      return true;
    }

    console.log(`✅ Category '${category}' enabled (no subcategory check)`);
    return categoryEnabled;
  }

  /**
   * LEGACY: Check if notification should be sent based on old 'type' parameter
   * @deprecated Use shouldSendNotification() with NotificationCheckParams instead
   */
  private shouldSendNotificationLegacy(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'progress':
        return preferences.EnableProgressUpdates;
      case 'risk':
      case 'intervention':
        return preferences.EnableSystemAlerts;
      case 'achievement':
        return preferences.EnableCommunityUpdates;
      case 'course':
        return preferences.EnableCourseUpdates;
      case 'assignment':
        return preferences.EnableAssessmentUpdates;
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
          EnableInAppNotifications: true,
          EnableProgressUpdates: true,
          EnableSystemAlerts: true,
          EnableCommunityUpdates: true,
          EnableCourseUpdates: true,
          EnableAssessmentUpdates: true,
          EnableEmailNotifications: false,
          EmailDigestFrequency: 'none',
          QuietHoursStart: queued.QuietHoursStart,
          QuietHoursEnd: queued.QuietHoursEnd,
          // Subcategory fields default to NULL (inherit)
          EnableLessonCompletion: null,
          EmailLessonCompletion: null,
          EnableVideoCompletion: null,
          EmailVideoCompletion: null,
          EnableCourseMilestones: null,
          EmailCourseMilestones: null,
          EnableProgressSummary: null,
          EmailProgressSummary: null,
          EnableCourseEnrollment: null,
          EmailCourseEnrollment: null,
          EnableNewLessons: null,
          EmailNewLessons: null,
          EnableLiveSessions: null,
          EmailLiveSessions: null,
          EnableCoursePublished: null,
          EmailCoursePublished: null,
          EnableInstructorAnnouncements: null,
          EmailInstructorAnnouncements: null,
          EnableAssessmentSubmitted: null,
          EmailAssessmentSubmitted: null,
          EnableAssessmentGraded: null,
          EmailAssessmentGraded: null,
          EnableNewAssessment: null,
          EmailNewAssessment: null,
          EnableAssessmentDue: null,
          EmailAssessmentDue: null,
          EnableSubmissionToGrade: null,
          EmailSubmissionToGrade: null,
          EnableComments: null,
          EmailComments: null,
          EnableReplies: null,
          EmailReplies: null,
          EnableMentions: null,
          EmailMentions: null,
          EnableGroupInvites: null,
          EmailGroupInvites: null,
          EnableOfficeHours: null,
          EmailOfficeHours: null,
          EnablePaymentConfirmation: null,
          EmailPaymentConfirmation: null,
          EnableRefundConfirmation: null,
          EmailRefundConfirmation: null,
          EnableCertificates: null,
          EmailCertificates: null,
          EnableSecurityAlerts: null,
          EmailSecurityAlerts: null,
          EnableProfileUpdates: null,
          EmailProfileUpdates: null
        };

        // Check if still in quiet hours
        if (this.isInQuietHours(preferences)) {
          continue; // Still in quiet hours, skip for now
        }

        // Quiet hours ended, deliver notification using legacy createNotification
        // Note: This will recursively call createNotification which handles email/socket
        await this.createNotification({
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

        // Mark as delivered
        const updateRequest = await this.dbService.getRequest();
        await updateRequest
          .input('Id', sql.UniqueIdentifier, queued.Id)
          .query(`
            UPDATE NotificationQueue
            SET Status = 'delivered', DeliveredAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
            WHERE Id = @Id
          `);
        
        processedCount++;
        console.log(`✅ Delivered queued notification: ${queued.Id} to user ${queued.UserId}`);
      }

      if (processedCount > 0) {
        console.log(`🎯 Processed ${processedCount} queued notifications`);
      }
      return processedCount;
    } catch (error: any) {
      console.error('❌ Error processing queued notifications:', error);
      throw error;
    }
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
