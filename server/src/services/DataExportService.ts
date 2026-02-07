import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface ExportRequest {
  Id: string;
  UserId: string;
  Status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  RequestedAt: Date;
  CompletedAt: Date | null;
  ExpiresAt: Date | null;
  FilePath: string | null;
  FileName: string | null;
  FileSize: number | null;
  DownloadCount: number;
  LastDownloadedAt: Date | null;
  ErrorMessage: string | null;
}

export class DataExportService {
  private readonly EXPORT_DIR = path.join(__dirname, '../../uploads/exports');
  private readonly EXPIRY_DAYS = 7;
  private readonly MAX_EXPORT_SIZE_MB = 500; // Maximum 500MB per export
  private readonly MIN_DISK_SPACE_MB = 1024; // Require at least 1GB free disk space
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    // Ensure export directory exists
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }
  }

  /**
   * Create a new export request
   */
  async createExportRequest(userId: string): Promise<ExportRequest> {
    const request = await this.dbService.getRequest();

    // Check for existing pending/processing requests
    const existingResult = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 1 * FROM DataExportRequests
        WHERE UserId = @userId
          AND Status IN ('pending', 'processing')
          AND RequestedAt > DATEADD(HOUR, -24, GETUTCDATE())
        ORDER BY RequestedAt DESC
      `);

    if (existingResult.recordset.length > 0) {
      return existingResult.recordset[0];
    }

    // Check rate limiting (max 3 per day)
    const request2 = await this.dbService.getRequest();
    const recentRequestsResult = await request2
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) as Count FROM DataExportRequests
        WHERE UserId = @userId
          AND RequestedAt > DATEADD(DAY, -1, GETUTCDATE())
      `);

    const recentCount = recentRequestsResult.recordset[0].Count;
    if (recentCount >= 3) {
      throw new Error('Rate limit exceeded. Maximum 3 export requests per 24 hours.');
    }

    // Create new request
    const request3 = await this.dbService.getRequest();
    const result = await request3
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        INSERT INTO DataExportRequests (UserId, Status, RequestedAt)
        OUTPUT INSERTED.*
        VALUES (@userId, 'pending', GETUTCDATE())
      `);

    return result.recordset[0];
  }

  /**
   * Get export request by ID
   */
  async getExportRequest(requestId: string, userId: string): Promise<ExportRequest | null> {
    const request = await this.dbService.getRequest();

    const result = await request
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM DataExportRequests
        WHERE Id = @requestId AND UserId = @userId
      `);

    return result.recordset[0] || null;
  }

  /**
   * Get latest export request for user
   */
  async getLatestExportRequest(userId: string): Promise<ExportRequest | null> {
    const request = await this.dbService.getRequest();

    const result = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 1 * FROM DataExportRequests
        WHERE UserId = @userId
        ORDER BY RequestedAt DESC
      `);

    return result.recordset[0] || null;
  }

  /**
   * Update export request status
   */
  async updateExportStatus(
    requestId: string,
    status: 'processing' | 'completed' | 'failed' | 'expired',
    filePath?: string,
    fileName?: string,
    fileSize?: number,
    errorMessage?: string
  ): Promise<void> {
    const request = await this.dbService.getRequest();

    const expiresAt = status === 'completed' 
      ? new Date(Date.now() + this.EXPIRY_DAYS * 24 * 60 * 60 * 1000) 
      : null;

    await request
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('status', sql.NVarChar(20), status)
      .input('completedAt', sql.DateTime2, status === 'completed' ? new Date() : null)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('filePath', sql.NVarChar(500), filePath || null)
      .input('fileName', sql.NVarChar(255), fileName || null)
      .input('fileSize', sql.BigInt, fileSize || null)
      .input('errorMessage', sql.NVarChar(sql.MAX), errorMessage || null)
      .query(`
        UPDATE DataExportRequests
        SET 
          Status = @status,
          CompletedAt = @completedAt,
          ExpiresAt = @expiresAt,
          FilePath = @filePath,
          FileName = @fileName,
          FileSize = @fileSize,
          ErrorMessage = @errorMessage,
          UpdatedAt = GETUTCDATE()
        WHERE Id = @requestId
      `);
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(requestId: string): Promise<void> {
    const request = await this.dbService.getRequest();

    await request
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        UPDATE DataExportRequests
        SET 
          DownloadCount = DownloadCount + 1,
          LastDownloadedAt = GETUTCDATE(),
          UpdatedAt = GETUTCDATE()
        WHERE Id = @requestId
      `);
  }

  /**
   * Check available disk space (Windows compatible)
   */
  private async checkDiskSpace(): Promise<number> {
    try {
      const drive = path.parse(this.EXPORT_DIR).root;
      // Extract drive letter (e.g., "D:\\" or "D:" -> "D")
      const driveLetter = drive.replace(/[:\\]/g, '');
      const { stdout } = await execAsync(`powershell "Get-PSDrive ${driveLetter} | Select-Object -ExpandProperty Free"`);
      const freeBytes = parseInt(stdout.trim(), 10);
      return freeBytes / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.warn('Could not check disk space, proceeding with caution:', error);
      return Infinity; // Proceed if check fails
    }
  }

  /**
   * Generate complete data export for user
   */
  async generateExport(userId: string, requestId: string): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    let filePath: string | null = null;
    
    try {
      // Check disk space before starting
      const freeSpaceMB = await this.checkDiskSpace();
      if (freeSpaceMB < this.MIN_DISK_SPACE_MB) {
        throw new Error(`Insufficient disk space. Available: ${freeSpaceMB.toFixed(0)}MB, Required: ${this.MIN_DISK_SPACE_MB}MB`);
      }

      // Update status to processing
      await this.updateExportStatus(requestId, 'processing');

      // Create user-specific directory
      const userExportDir = path.join(this.EXPORT_DIR, userId);
      if (!fs.existsSync(userExportDir)) {
        fs.mkdirSync(userExportDir, { recursive: true });
      }

      // Collect all data
      const exportData = await this.collectUserData(userId);

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `mishin-learn-export-${timestamp}.zip`;
      filePath = path.join(userExportDir, fileName);

      // Create ZIP file with size validation
      await this.createZipExport(exportData, filePath, userId);

      // Get file size and validate
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const fileSizeMB = fileSize / (1024 * 1024);

      if (fileSizeMB > this.MAX_EXPORT_SIZE_MB) {
        // Delete oversized file
        fs.unlinkSync(filePath);
        throw new Error(`Export too large: ${fileSizeMB.toFixed(2)}MB exceeds maximum ${this.MAX_EXPORT_SIZE_MB}MB`);
      }

      // Update status to completed
      await this.updateExportStatus(requestId, 'completed', filePath, fileName, fileSize);

      return { filePath, fileName, fileSize };
    } catch (error: any) {
      console.error('Error generating export:', error);
      
      // Clean up partial file if it exists
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🧹 Cleaned up partial export file: ${filePath}`);
        } catch (cleanupError) {
          console.error('Error cleaning up partial file:', cleanupError);
        }
      }
      
      await this.updateExportStatus(requestId, 'failed', undefined, undefined, undefined, error.message);
      throw error;
    }
  }

  /**
   * Collect all user data from database
   */
  private async collectUserData(userId: string): Promise<any> {
    // Profile Data
    const request1 = await this.dbService.getRequest();
    const profileResult = await request1
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          Id, Email, Username, FirstName, LastName, Avatar, Role, LearningStyle,
          BillingStreetAddress, BillingCity, BillingState, BillingPostalCode, BillingCountry,
          EmailVerified, CreatedAt, UpdatedAt, LastLoginAt
        FROM Users
        WHERE Id = @userId
      `);

    // User Settings
    const request2 = await this.dbService.getRequest();
    const settingsResult = await request2
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM UserSettings WHERE UserId = @userId
      `);

    // Notification Preferences
    const request3 = await this.dbService.getRequest();
    const notifPrefsResult = await request3
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM NotificationPreferences WHERE UserId = @userId
      `);

    // Enrollments
    const request4 = await this.dbService.getRequest();
    const enrollmentsResult = await request4
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          e.Id, e.CourseId, c.Title as CourseTitle, c.Category, c.Level,
          e.EnrolledAt, e.CompletedAt, e.Status
        FROM Enrollments e
        INNER JOIN Courses c ON e.CourseId = c.Id
        WHERE e.UserId = @userId
        ORDER BY e.EnrolledAt DESC
      `);

    // Course Progress
    const request5 = await this.dbService.getRequest();
    const courseProgressResult = await request5
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          cp.Id, cp.CourseId, c.Title as CourseTitle,
          cp.OverallProgress, cp.TimeSpent, cp.LastAccessedAt, cp.CompletedAt
        FROM CourseProgress cp
        INNER JOIN Courses c ON cp.CourseId = c.Id
        WHERE cp.UserId = @userId
        ORDER BY cp.LastAccessedAt DESC
      `);

    // Lesson Progress
    const request6 = await this.dbService.getRequest();
    const lessonProgressResult = await request6
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          up.Id, up.LessonId, l.Title as LessonTitle, up.CourseId, c.Title as CourseTitle,
          up.Status, up.ProgressPercentage, up.LastAccessedAt, up.CompletedAt, up.TimeSpent
        FROM UserProgress up
        INNER JOIN Lessons l ON up.LessonId = l.Id
        INNER JOIN Courses c ON up.CourseId = c.Id
        WHERE up.UserId = @userId
        ORDER BY up.LastAccessedAt DESC
      `);

    // Video Progress
    const request7 = await this.dbService.getRequest();
    const videoProgressResult = await request7
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM VideoProgress
        WHERE UserId = @userId
        ORDER BY LastWatchedAt DESC
      `);

    // Assessment Submissions
    const request8 = await this.dbService.getRequest();
    const assessmentsResult = await request8
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          asub.Id, asub.AssessmentId, a.Title as AssessmentTitle,
          a.LessonId, l.Title as LessonTitle, l.CourseId, c.Title as CourseTitle,
          asub.Score, asub.MaxScore, asub.TimeSpent, asub.AttemptNumber,
          asub.Status, asub.StartedAt, asub.CompletedAt
        FROM AssessmentSubmissions asub
        INNER JOIN Assessments a ON asub.AssessmentId = a.Id
        INNER JOIN Lessons l ON a.LessonId = l.Id
        INNER JOIN Courses c ON l.CourseId = c.Id
        WHERE asub.UserId = @userId
        ORDER BY asub.StartedAt DESC
      `);

    // Certificates
    const request9 = await this.dbService.getRequest();
    const certificatesResult = await request9
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM Certificates
        WHERE UserId = @userId
        ORDER BY IssuedAt DESC
      `);

    // Transactions
    const request10 = await this.dbService.getRequest();
    const transactionsResult = await request10
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          t.Id, t.CourseId, c.Title as CourseTitle,
          t.Amount, t.Currency, t.Status,
          t.PaymentMethod, t.PaymentMethodLast4, t.PaymentMethodBrand,
          t.RefundReason, t.RefundAmount,
          t.CreatedAt, t.CompletedAt, t.RefundedAt
        FROM Transactions t
        LEFT JOIN Courses c ON t.CourseId = c.Id
        WHERE t.UserId = @userId
        ORDER BY t.CreatedAt DESC
      `);

    // Invoices
    const request11 = await this.dbService.getRequest();
    const invoicesResult = await request11
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          i.*, t.CourseId, t.Status as TransactionStatus
        FROM Invoices i
        INNER JOIN Transactions t ON i.TransactionId = t.Id
        WHERE t.UserId = @userId
        ORDER BY i.CreatedAt DESC
      `);

    // Bookmarks
    const request12 = await this.dbService.getRequest();
    const bookmarksResult = await request12
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          b.Id, b.CourseId, c.Title as CourseTitle, c.Category, c.Level,
          b.BookmarkedAt, b.Notes
        FROM Bookmarks b
        INNER JOIN Courses c ON b.CourseId = c.Id
        WHERE b.UserId = @userId
        ORDER BY b.BookmarkedAt DESC
      `);

    // Notifications (last 1000)
    const request13 = await this.dbService.getRequest();
    const notificationsResult = await request13
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 1000 * FROM Notifications
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    // Comments
    const request14 = await this.dbService.getRequest();
    const commentsResult = await request14
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM Comments
        WHERE UserId = @userId AND IsDeleted = 0
        ORDER BY CreatedAt DESC
      `);

    // Comment Likes
    const request15 = await this.dbService.getRequest();
    const commentLikesResult = await request15
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT cl.*, c.EntityType, c.EntityId
        FROM CommentLikes cl
        INNER JOIN Comments c ON cl.CommentId = c.Id
        WHERE cl.UserId = @userId
        ORDER BY cl.CreatedAt DESC
      `);

    // Chat Rooms
    const request16 = await this.dbService.getRequest();
    const chatRoomsResult = await request16
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT DISTINCT cr.*
        FROM ChatRooms cr
        INNER JOIN ChatParticipants cp ON cr.Id = cp.RoomId
        WHERE cp.UserId = @userId
        ORDER BY cr.LastMessageAt DESC
      `);

    // Chat Messages
    const request17 = await this.dbService.getRequest();
    const chatMessagesResult = await request17
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT cm.*, cr.Name as RoomName, cr.Type as RoomType
        FROM ChatMessages cm
        INNER JOIN ChatRooms cr ON cm.RoomId = cr.Id
        WHERE cm.UserId = @userId
        ORDER BY cm.CreatedAt DESC
      `);

    // Tutoring Sessions
    const request18 = await this.dbService.getRequest();
    const tutoringSessionsResult = await request18
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM TutoringSessions
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    // Tutoring Messages
    const request19 = await this.dbService.getRequest();
    const tutoringMessagesResult = await request19
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT tm.*
        FROM TutoringMessages tm
        INNER JOIN TutoringSessions ts ON tm.SessionId = ts.Id
        WHERE ts.UserId = @userId
        ORDER BY tm.Timestamp DESC
      `);

    // Live Session Attendance
    const request20 = await this.dbService.getRequest();
    const liveSessionsResult = await request20
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          lsa.*, ls.Title as SessionTitle, ls.ScheduledAt, ls.Duration,
          ls.InstructorId, c.Title as CourseTitle
        FROM LiveSessionAttendees lsa
        INNER JOIN LiveSessions ls ON lsa.SessionId = ls.Id
        LEFT JOIN Courses c ON ls.CourseId = c.Id
        WHERE lsa.UserId = @userId
        ORDER BY lsa.JoinedAt DESC
      `);

    // Study Groups
    const request21 = await this.dbService.getRequest();
    const studyGroupsResult = await request21
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          sg.*, sgm.Role, sgm.JoinedAt,
          c.Title as CourseTitle
        FROM StudyGroupMembers sgm
        INNER JOIN StudyGroups sg ON sgm.GroupId = sg.Id
        LEFT JOIN Courses c ON sg.CourseId = c.Id
        WHERE sgm.UserId = @userId
        ORDER BY sgm.JoinedAt DESC
      `);

    // Learning Activities
    const request22 = await this.dbService.getRequest();
    const learningActivitiesResult = await request22
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT TOP 1000 * FROM LearningActivities
        WHERE UserId = @userId
        ORDER BY CreatedAt DESC
      `);

    return {
      profile: profileResult.recordset[0] || {},
      settings: settingsResult.recordset[0] || {},
      notificationPreferences: notifPrefsResult.recordset[0] || {},
      enrollments: enrollmentsResult.recordset,
      courseProgress: courseProgressResult.recordset,
      lessonProgress: lessonProgressResult.recordset,
      videoProgress: videoProgressResult.recordset,
      assessments: assessmentsResult.recordset,
      certificates: certificatesResult.recordset,
      transactions: transactionsResult.recordset,
      invoices: invoicesResult.recordset,
      bookmarks: bookmarksResult.recordset,
      notifications: notificationsResult.recordset,
      comments: commentsResult.recordset,
      commentLikes: commentLikesResult.recordset,
      chatRooms: chatRoomsResult.recordset,
      chatMessages: chatMessagesResult.recordset,
      tutoringSessions: tutoringSessionsResult.recordset,
      tutoringMessages: tutoringMessagesResult.recordset,
      liveSessionAttendance: liveSessionsResult.recordset,
      studyGroups: studyGroupsResult.recordset,
      learningActivities: learningActivitiesResult.recordset,
    };
  }

  /**
   * Create ZIP file with all export data
   */
  private async createZipExport(data: any, outputPath: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));
      
      // Note: Size validation happens after ZIP creation in generateExport()
      // This ensures we don't create oversized exports

      archive.pipe(output);

      // Add JSON files
      archive.append(JSON.stringify(data.profile, null, 2), { name: 'profile/personal-info.json' });
      archive.append(JSON.stringify(data.settings, null, 2), { name: 'profile/settings.json' });
      archive.append(JSON.stringify(data.notificationPreferences, null, 2), { name: 'profile/notification-preferences.json' });

      archive.append(JSON.stringify(data.enrollments, null, 2), { name: 'learning/enrollments.json' });
      archive.append(JSON.stringify(data.courseProgress, null, 2), { name: 'learning/course-progress.json' });
      archive.append(JSON.stringify(data.lessonProgress, null, 2), { name: 'learning/lesson-progress.json' });
      archive.append(JSON.stringify(data.videoProgress, null, 2), { name: 'learning/video-progress.json' });
      archive.append(JSON.stringify(data.assessments, null, 2), { name: 'learning/assessments.json' });
      archive.append(JSON.stringify(data.certificates, null, 2), { name: 'learning/certificates.json' });
      archive.append(JSON.stringify(data.learningActivities, null, 2), { name: 'learning/learning-activities.json' });

      archive.append(JSON.stringify(data.comments, null, 2), { name: 'community/comments.json' });
      archive.append(JSON.stringify(data.commentLikes, null, 2), { name: 'community/comment-likes.json' });
      archive.append(JSON.stringify(data.chatRooms, null, 2), { name: 'community/chat-rooms.json' });
      archive.append(JSON.stringify(data.chatMessages, null, 2), { name: 'community/chat-messages.json' });
      archive.append(JSON.stringify(data.studyGroups, null, 2), { name: 'community/study-groups.json' });

      archive.append(JSON.stringify(data.tutoringSessions, null, 2), { name: 'ai-tutoring/sessions.json' });
      archive.append(JSON.stringify(data.tutoringMessages, null, 2), { name: 'ai-tutoring/messages.json' });

      archive.append(JSON.stringify(data.transactions, null, 2), { name: 'transactions/payments.json' });
      archive.append(JSON.stringify(data.invoices, null, 2), { name: 'transactions/invoices.json' });

      archive.append(JSON.stringify(data.bookmarks, null, 2), { name: 'activity/bookmarks.json' });
      archive.append(JSON.stringify(data.notifications, null, 2), { name: 'activity/notifications.json' });
      archive.append(JSON.stringify(data.liveSessionAttendance, null, 2), { name: 'activity/live-sessions.json' });

      // Add CSV files (summary data)
      archive.append(this.convertToCSV(data.enrollments), { name: 'csv/enrollments.csv' });
      archive.append(this.convertToCSV(data.courseProgress), { name: 'csv/course-progress.csv' });
      archive.append(this.convertToCSV(data.assessments), { name: 'csv/assessments.csv' });
      archive.append(this.convertToCSV(data.transactions), { name: 'csv/transactions.csv' });
      archive.append(this.convertToCSV(data.certificates), { name: 'csv/certificates.csv' });

      // Add README
      const readme = this.generateReadme(data.profile);
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * Convert JSON array to CSV
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No data available\n';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Generate README file
   */
  private generateReadme(profile: any): string {
    const now = new Date().toISOString();
    const userName = profile.FirstName && profile.LastName 
      ? `${profile.FirstName} ${profile.LastName}` 
      : profile.Username || 'Unknown User';
    const userEmail = profile.Email || 'Not available';
    const userId = profile.Id || 'Unknown';
    
    return `MISHIN LEARN DATA EXPORT
Generated: ${now}
User: ${userName} (${userEmail})
User ID: ${userId}

====================================
WHAT'S INCLUDED
====================================

PROFILE INFORMATION:
- Personal details (name, email, username, role)
- Settings (privacy, appearance, notifications)
- Billing address information

LEARNING DATA:
- Course enrollments and completions
- Lesson progress tracking
- Video watching history
- Assessment submissions and scores
- Earned certificates
- Learning activity patterns

COMMUNITY INTERACTIONS:
- Comments and replies
- Comment likes
- Chat conversations and messages
- Study group memberships

AI TUTORING:
- Tutoring session history
- AI conversation messages

TRANSACTIONS:
- Purchase history
- Payment details
- Invoices
- Refund information

ACTIVITY:
- Bookmarks (saved courses)
- Notification history
- Live session attendance

====================================
FILE FORMATS
====================================

JSON FILES:
- Complete data in machine-readable format
- Located in categorized folders
- Can be parsed by any JSON-compatible tool

CSV FILES:
- Summary data for spreadsheet applications
- Can be opened in Excel, Google Sheets, etc.
- Located in 'csv/' folder

====================================
DATA RETENTION
====================================

This export file contains a snapshot of your data as of ${now}.
Your data remains active on the Mishin Learn platform.

This export link expires after 7 days for security purposes.
You can request a new export at any time from your settings page.

====================================
PRIVACY & SECURITY
====================================

This export contains all your personal data stored on Mishin Learn.
Keep this file secure and do not share it with others.

For questions or concerns about your data, contact:
Email: support@mishinlearn.com
Website: https://mishinlearn.com

====================================
GDPR COMPLIANCE
====================================

This export fulfills your right to data portability under:
- GDPR (EU General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Other applicable privacy regulations

You have the right to:
- Access your data (this export)
- Correct your data (via platform settings)
- Delete your data (account deletion feature)
- Restrict processing (privacy settings)
- Data portability (this export feature)

Last Updated: February 6, 2026
`;
  }

  /**
   * Get expired export requests for cleanup
   */
  async getExpiredExports(): Promise<ExportRequest[]> {
    const request = await this.dbService.getRequest();

    const result = await request
      .query(`
        SELECT * FROM DataExportRequests
        WHERE Status = 'completed'
          AND ExpiresAt IS NOT NULL
          AND ExpiresAt < GETUTCDATE()
      `);

    return result.recordset;
  }

  /**
   * Delete expired export files and update database
   */
  async cleanupExpiredExports(): Promise<number> {
    const expiredExports = await this.getExpiredExports();
    let cleanedCount = 0;

    for (const exportReq of expiredExports) {
      try {
        // Delete file from filesystem
        if (exportReq.FilePath && fs.existsSync(exportReq.FilePath)) {
          fs.unlinkSync(exportReq.FilePath);
        }

        // Update database status
        const request = await this.dbService.getRequest();
        await request
          .input('requestId', sql.UniqueIdentifier, exportReq.Id)
          .query(`
            UPDATE DataExportRequests
            SET Status = 'expired', UpdatedAt = GETUTCDATE()
            WHERE Id = @requestId
          `);

        cleanedCount++;
      } catch (error) {
        console.error(`Error cleaning up export ${exportReq.Id}:`, error);
      }
    }

    return cleanedCount;
  }
}
