import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { DatabaseService } from './DatabaseService';
import { StripeService } from './StripeService';
import { NotificationService } from './NotificationService';
import { CourseManagementService } from './CourseManagementService';
import EmailService from './EmailService';
import { Server as SocketIOServer } from 'socket.io';

interface DeleteAccountParams {
  userId: string;
  confirmPassword: string;
  reason?: string;
  instructorAction?: 'archive' | 'transfer' | 'force';
  transferToInstructorId?: string;
}

interface InstructorContent {
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  activeOfficeHours: number;
  activeLiveSessions: number;
}

interface InstructorDeletionOptions {
  canDeleteDirectly: boolean;
  requiresAction: boolean;
  blockedReason?: string;
  content: InstructorContent;
  options: {
    canArchive: boolean;
    canTransfer: boolean;
    canForceDelete: boolean;
  };
}

export class AccountDeletionService {
  private db: DatabaseService;
  private stripeService: StripeService;
  private notificationService: NotificationService;
  private courseManagementService: CourseManagementService;
  private io: SocketIOServer | null = null;

  constructor(io?: SocketIOServer) {
    this.db = DatabaseService.getInstance();
    this.stripeService = StripeService.getInstance();
    this.notificationService = new NotificationService(io);
    this.courseManagementService = new CourseManagementService(io);
    if (io) {
      this.io = io;
    }
  }

  /**
   * Set Socket.IO instance for real-time notifications
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
    this.notificationService.setSocketIO(io);
  }

  /**
   * Get instructor deletion options and requirements
   */
  async getInstructorDeletionOptions(userId: string): Promise<InstructorDeletionOptions> {
    const content = await this.checkInstructorContent(userId);
    const canDeleteDirectly = content.totalStudents === 0;

    return {
      canDeleteDirectly,
      requiresAction: !canDeleteDirectly,
      blockedReason: canDeleteDirectly 
        ? undefined 
        : `You have ${content.totalStudents} active students in ${content.publishedCourses} published course${content.publishedCourses > 1 ? 's' : ''}. Please choose an action below.`,
      content,
      options: {
        canArchive: content.publishedCourses > 0,
        canTransfer: content.totalCourses > 0,
        canForceDelete: true // Always available with extra confirmation
      }
    };
  }

  /**
   * Check if user is an instructor with active content
   */
  async checkInstructorContent(userId: string): Promise<InstructorContent> {
    const request = await this.db.getRequest();

    // Get instructor content statistics
    const result = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          -- Courses
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @userId) AS TotalCourses,
          (SELECT COUNT(*) FROM dbo.Courses WHERE InstructorId = @userId AND Status = 'published') AS PublishedCourses,
          (SELECT COUNT(DISTINCT e.UserId) 
           FROM dbo.Enrollments e 
           INNER JOIN dbo.Courses c ON e.CourseId = c.Id 
           WHERE c.InstructorId = @userId AND e.Status = 'active') AS TotalStudents,
          -- Office Hours
          (SELECT COUNT(*) FROM dbo.OfficeHours WHERE InstructorId = @userId AND IsActive = 1) AS ActiveOfficeHours,
          -- Live Sessions
          (SELECT COUNT(*) FROM dbo.LiveSessions WHERE InstructorId = @userId AND Status IN ('scheduled', 'live')) AS ActiveLiveSessions
      `);

    const stats = result.recordset[0];
    return {
      totalCourses: stats.TotalCourses || 0,
      publishedCourses: stats.PublishedCourses || 0,
      totalStudents: stats.TotalStudents || 0,
      activeOfficeHours: stats.ActiveOfficeHours || 0,
      activeLiveSessions: stats.ActiveLiveSessions || 0
    };
  }

  /**
   * Verify user password before deletion
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const request = await this.db.getRequest();
    const result = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query('SELECT PasswordHash FROM dbo.Users WHERE Id = @userId');

    if (result.recordset.length === 0) {
      throw new Error('User not found');
    }

    const passwordHash = result.recordset[0].PasswordHash;
    return await bcrypt.compare(password, passwordHash);
  }

  /**
   * Cancel all active Stripe subscriptions for user
   */
  async cancelStripeSubscriptions(userId: string): Promise<void> {
    const request = await this.db.getRequest();
    
    // Get user's Stripe customer ID
    const userResult = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query('SELECT StripeCustomerId FROM dbo.Users WHERE Id = @userId');

    const stripeCustomerId = userResult.recordset[0]?.StripeCustomerId;

    if (stripeCustomerId) {
      try {
        // Cancel all active subscriptions through Stripe
        // Note: StripeService doesn't have subscription methods yet, so we'll handle via Stripe API directly
        const stripe = this.stripeService['stripe']; // Access private stripe instance
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'active'
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
          console.log(`✅ Canceled Stripe subscription: ${subscription.id}`);
        }

        // Optionally delete the Stripe customer
        // await stripe.customers.del(stripeCustomerId);
        console.log(`✅ Stripe subscriptions canceled for customer: ${stripeCustomerId}`);
      } catch (error) {
        console.error('Error canceling Stripe subscriptions:', error);
        // Log but don't fail - we'll still delete the account
      }
    }
  }

  /**
   * Delete all user data (called within transaction)
   */
  async deleteUserData(userId: string, transaction: sql.Transaction): Promise<void> {
    const request = new sql.Request(transaction);
    request.input('userId', sql.UniqueIdentifier, userId);

    // Tables without CASCADE DELETE that need manual deletion
    // Note: Most tables now have CASCADE DELETE, but we'll explicitly delete some for logging

    // 1. Delete email digests (ON DELETE NO ACTION)
    await request.query('DELETE FROM dbo.EmailDigests WHERE UserId = @userId');
    console.log('✅ Deleted email digests');

    // 2. Delete user progress records (now has CASCADE but we log it)
    const progressResult = await request.query('DELETE FROM dbo.UserProgress WHERE UserId = @userId');
    console.log(`✅ Deleted ${progressResult.rowsAffected[0]} user progress records`);

    // 3. Delete office hours queue entries where user is instructor (CASCADE handles student entries)
    await request.query('DELETE FROM dbo.OfficeHoursQueue WHERE InstructorId = @userId');
    console.log('✅ Deleted office hours queue entries (as instructor)');

    // 4. Anonymize or delete chat messages (CASCADE handles this, but we could anonymize instead)
    // For now, let CASCADE handle it
    // await request.query("UPDATE dbo.ChatMessages SET Content = '[deleted]' WHERE UserId = @userId");

    // 5. Handle instructor-owned content
    // NOTE: Instructor courses are already handled by archive/transfer/force actions
    // in the deleteAccount() method BEFORE calling this function.
    // For any remaining courses, handle based on their current status
    const remainingCoursesResult = await request.query(`
      SELECT Id, Title, Status FROM dbo.Courses WHERE InstructorId = @userId
    `);
    const remainingCourses = remainingCoursesResult.recordset.length;
    
    if (remainingCourses > 0) {
      console.warn(`⚠️ Found ${remainingCourses} courses still assigned to instructor`);
      
      // Soft delete courses that are NOT already archived or deleted
      // (Archived courses from archive action should stay archived)
      // (Deleted courses from force action should stay deleted)
      await request.query(`
        UPDATE dbo.Courses 
        SET Status = 'deleted',
            UpdatedAt = GETUTCDATE()
        WHERE InstructorId = @userId
          AND Status NOT IN ('archived', 'deleted')
      `);
      
      // Log orphaned courses to CourseOwnershipHistory for audit trail
      for (const course of remainingCoursesResult.recordset) {
        const historyRequest = new sql.Request(transaction);
        await historyRequest
          .input('courseId', sql.UniqueIdentifier, course.Id)
          .input('instructorId', sql.UniqueIdentifier, userId)
          .query(`
            INSERT INTO dbo.CourseOwnershipHistory 
              (CourseId, FromInstructorId, ToInstructorId, TransferReason, Notes)
            VALUES 
              (@courseId, @instructorId, NULL, 'account_deletion', 'Course orphaned due to instructor account deletion')
          `);
      }
      console.log(`✅ Logged ${remainingCourses} orphaned courses to ownership history`);
      
      // Remove instructor ownership from ALL remaining courses
      await request.query(`
        UPDATE dbo.Courses 
        SET InstructorId = NULL 
        WHERE InstructorId = @userId
      `);
    }
    console.log('✅ Instructor ownership handled');

    // 6. Delete or update live sessions
    await request.query(`
      UPDATE dbo.LiveSessions 
      SET InstructorId = NULL, Status = 'cancelled'
      WHERE InstructorId = @userId AND Status IN ('scheduled', 'live')
    `);
    console.log('✅ Canceled instructor live sessions');

    // 7. Update chat rooms created by user
    await request.query(`
      UPDATE dbo.ChatRooms 
      SET CreatedBy = NULL
      WHERE CreatedBy = @userId
    `);
    console.log('✅ Removed chat room ownership');

    // 8. Update study groups created by user
    await request.query(`
      UPDATE dbo.StudyGroups 
      SET CreatedBy = NULL
      WHERE CreatedBy = @userId
    `);
    console.log('✅ Removed study group ownership');

    // 9. Delete office hours schedules
    await request.query('DELETE FROM dbo.OfficeHours WHERE InstructorId = @userId');
    console.log('✅ Deleted office hours schedules');

    // Note: The following tables will CASCADE DELETE automatically:
    // - Enrollments (CASCADE)
    // - Notifications (CASCADE)
    // - NotificationQueue (CASCADE)
    // - NotificationPreferences (CASCADE - PRIMARY KEY)
    // - Bookmarks (CASCADE)
    // - AssessmentSubmissions (CASCADE)
    // - LiveSessionAttendees (CASCADE)
    // - ChatMessages (CASCADE)
    // - TutoringSessions (CASCADE)
    // - FileUploads (CASCADE)
    // - CourseProgress (CASCADE)
    // - LearningActivities (CASCADE)
    // - StudentRecommendations (CASCADE)
    // - StudentRiskAssessment (CASCADE)
    // - PeerComparison (CASCADE)
    // - Transactions (CASCADE)
    // - UserPresence (CASCADE - PRIMARY KEY)
    // - StudyGroupMembers (CASCADE)

    console.log('✅ All related data prepared for deletion');
  }

  /**
   * Log account deletion for compliance (GDPR, audit trail)
   */
  async logDeletion(
    userId: string, 
    userEmail: string, 
    userRole: string,
    instructorStats: InstructorContent | null,
    deletionMethod: 'direct' | 'after_archive' | 'after_transfer' | 'force_delete',
    reason?: string
  ): Promise<void> {
    try {
      const request = await this.db.getRequest();
      
      // Insert into AccountDeletionLog table for audit compliance
      await request
        .input('userId', sql.UniqueIdentifier, userId)
        .input('userEmail', sql.NVarChar(255), userEmail)
        .input('userRole', sql.NVarChar(20), userRole)
        .input('totalCourses', sql.Int, instructorStats?.totalCourses || 0)
        .input('publishedCourses', sql.Int, instructorStats?.publishedCourses || 0)
        .input('archivedCourses', sql.Int, 0) // TODO: Track archived count in stats
        .input('totalStudents', sql.Int, instructorStats?.totalStudents || 0)
        .input('deletionMethod', sql.NVarChar(50), deletionMethod)
        .input('deletionReason', sql.NVarChar(500), reason || 'User requested account deletion')
        .input('deletedBy', sql.NVarChar(20), 'user')
        .query(`
          INSERT INTO dbo.AccountDeletionLog (
            UserId, UserEmail, UserRole, TotalCourses, PublishedCourses, 
            ArchivedCourses, TotalStudents, DeletionMethod, DeletionReason, DeletedBy
          )
          VALUES (
            @userId, @userEmail, @userRole, @totalCourses, @publishedCourses,
            @archivedCourses, @totalStudents, @deletionMethod, @deletionReason, @deletedBy
          )
        `);
      
      console.log('✅ Account deletion logged to audit table');
    } catch (error) {
      console.error('❌ Failed to log account deletion:', error);
      // Don't fail the deletion if logging fails
    }
  }

  /**
   * Send deletion confirmation email
   */
  async sendConfirmationEmail(userEmail: string, firstName: string): Promise<void> {
    try {
      await EmailService.sendEmail({
        to: userEmail,
        subject: 'Account Deletion Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Account Deleted</h2>
            <p>Hi ${firstName},</p>
            <p>Your account has been successfully deleted as requested.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>What has been deleted:</strong>
              <ul>
                <li>Your profile and personal information</li>
                <li>All course enrollments and progress data</li>
                <li>All assessment submissions and grades</li>
                <li>All notifications and preferences</li>
                <li>All bookmarks and saved content</li>
                <li>All payment transaction history</li>
              </ul>
            </div>

            <p>If you did not request this deletion, please contact us immediately at <strong>support@mishinlearn.com</strong>.</p>
            
            <p>We're sorry to see you go. If you change your mind, you can always create a new account.</p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              For compliance reasons, we retain minimal deletion audit records (user ID, email, and deletion timestamp) in our system logs.
            </p>
            
            <p>Best regards,<br>
            The Mishin Learn Team</p>
          </div>
        `
      });
      console.log('✅ Deletion confirmation email sent');
    } catch (error) {
      console.error('❌ Failed to send deletion confirmation email:', error);
      // Don't fail the deletion if email fails
    }
  }

  /**
   * Notify admins of account deletion (optional)
   */
  async notifyAdmin(userId: string, userEmail: string, userName: string, role: string): Promise<void> {
    try {
      // Get all admin users
      const request = await this.db.getRequest();
      const adminResult = await request.query(`
        SELECT Id FROM dbo.Users WHERE Role = 'admin' AND IsActive = 1
      `);

      // Create notification for each admin
      for (const admin of adminResult.recordset) {
        await this.notificationService.createNotificationWithControls(
          {
            userId: admin.Id,
            type: 'intervention',
            priority: 'normal',
            title: 'Account Deletion',
            message: `User ${userName} (${userEmail}) deleted their ${role} account.`,
            actionUrl: '/admin/users',
            actionText: 'View Users'
          },
          {
            category: 'system',
            subcategory: 'SecurityAlerts'
          }
        );
      }
      console.log('✅ Admin notifications sent');
    } catch (error) {
      console.error('❌ Failed to notify admins:', error);
      // Don't fail the deletion if notification fails
    }
  }

  /**
   * Main account deletion method
   */
  async deleteAccount(params: DeleteAccountParams): Promise<{ success: boolean; message: string }> {
    const { userId, confirmPassword, reason, instructorAction, transferToInstructorId } = params;

    try {
      // 1. Get user details before deletion
      const userRequest = await this.db.getRequest();
      const userResult = await userRequest
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT Email, FirstName, LastName, Role, Username 
          FROM dbo.Users 
          WHERE Id = @userId
        `);

      if (userResult.recordset.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.recordset[0];
      const userEmail = user.Email;
      const firstName = user.FirstName;
      const userName = `${user.FirstName} ${user.LastName}`;
      const userRole = user.Role;

      // 2. Verify password
      const passwordValid = await this.verifyPassword(userId, confirmPassword);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Incorrect password. Account deletion cancelled.'
        };
      }

      // 3. Handle instructor-specific requirements
      let content: InstructorContent | null = null;
      
      if (userRole === 'instructor') {
        content = await this.checkInstructorContent(userId);
        
        // Block deletion if has students and no action specified
        if (content.totalStudents > 0 && !instructorAction) {
          return {
            success: false,
            message: `Cannot delete account: You have ${content.totalStudents} active students. Please archive or transfer your courses first.`
          };
        }

        // Execute instructor action if specified
        if (instructorAction === 'archive' && content.publishedCourses > 0) {
          console.log(`📦 Archiving all courses for instructor ${userId}`);
          await this.courseManagementService.archiveAllCourses(userId, 'Account deletion');
        } else if (instructorAction === 'transfer' && transferToInstructorId) {
          console.log(`📤 Transferring all courses to instructor ${transferToInstructorId}`);
          await this.courseManagementService.transferCourses({
            fromInstructorId: userId,
            toInstructorId: transferToInstructorId,
            reason: 'account_deletion',
            transferredBy: userId
          });
        } else if (instructorAction === 'force') {
          console.warn(`⚠️ Force deleting instructor account with ${content.totalStudents} active students`);
          // Soft delete all courses instead of leaving orphaned
          await this.courseManagementService.softDeleteCourses(userId);
        } else if (content.totalStudents > 0) {
          // No valid action but has students - block deletion
          return {
            success: false,
            message: 'Invalid instructor action specified. Please choose archive, transfer, or force delete.'
          };
        }
      }

      // 4. Cancel Stripe subscriptions
      await this.cancelStripeSubscriptions(userId);

      // 5. Start database transaction for data deletion
      const pool = await this.db.getPool();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      try {
        // Delete all user data
        await this.deleteUserData(userId, transaction);

        // Finally, delete the user record (this triggers CASCADE deletes)
        const deleteRequest = new sql.Request(transaction);
        await deleteRequest
          .input('userId', sql.UniqueIdentifier, userId)
          .query('DELETE FROM dbo.Users WHERE Id = @userId');

        await transaction.commit();
        console.log('✅ Database transaction committed - user deleted');
      } catch (error) {
        await transaction.rollback();
        console.error('❌ Database transaction rolled back:', error);
        throw error;
      }

      // 6. Post-deletion actions (these don't fail the deletion)
      const deletionMethod = instructorAction ? 
        (instructorAction === 'archive' ? 'after_archive' : 
         instructorAction === 'transfer' ? 'after_transfer' : 'force_delete') :
        'direct';
      
      await this.logDeletion(userId, userEmail, userRole, content, deletionMethod, reason);
      await this.sendConfirmationEmail(userEmail, firstName);
      await this.notifyAdmin(userId, userEmail, userName, userRole);

      return {
        success: true,
        message: 'Your account has been permanently deleted. You will be logged out shortly.'
      };

    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
}
