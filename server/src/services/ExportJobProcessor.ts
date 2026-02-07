import { DataExportService } from './DataExportService';
import EmailService from './EmailService';
import { DatabaseService } from './DatabaseService';
import { PendingExportRequest, UserInfo } from '../types/database';
import { logger } from '../utils/logger';
import sql from 'mssql';

export class ExportJobProcessor {
  private static instance: ExportJobProcessor;
  private dataExportService: DataExportService;
  private emailService: typeof EmailService;
  private dbService: DatabaseService;
  private isProcessing: boolean = false;

  private constructor() {
    this.dataExportService = new DataExportService();
    this.emailService = EmailService;
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ExportJobProcessor {
    if (!ExportJobProcessor.instance) {
      ExportJobProcessor.instance = new ExportJobProcessor();
    }
    return ExportJobProcessor.instance;
  }

  /**
   * Process pending export requests
   * Called by cron job every minute
   */
  async processPendingExports(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      logger.info('⏭️ Export job already running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;

      // Get all pending requests
      const pendingRequests = await this.getPendingRequests();

      if (pendingRequests.length === 0) {
        return;
      }

      logger.info(`📦 Processing ${pendingRequests.length} pending export request(s)...`);

      for (const request of pendingRequests) {
        await this.processExportRequest(request);
      }

      logger.info('✅ Finished processing export requests');
    } catch (error) {
      logger.error('❌ Error processing export requests:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get all pending export requests
   */
  private async getPendingRequests(): Promise<PendingExportRequest[]> {
    const request = await this.dbService.getRequest();

    const result = await request
      .query(`
        SELECT * FROM DataExportRequests
        WHERE Status = 'pending'
        ORDER BY RequestedAt ASC
      `);

    return result.recordset as PendingExportRequest[];
  }

  /**
   * Process a single export request
   */
  private async processExportRequest(request: PendingExportRequest): Promise<void> {
    try {
      logger.info(`📦 Generating export for user ${request.UserId} (Request ID: ${request.Id})`);

      // Generate the export
      const result = await this.dataExportService.generateExport(request.UserId, request.Id);

      logger.info(`✅ Export generated: ${result.fileName} (${this.formatFileSize(result.fileSize)})`);

      // Get user info for email
      const userInfo = await this.getUserInfo(request.UserId);

      if (userInfo) {
        // Send notification email
        await this.sendExportReadyEmail(userInfo, request.Id, result.fileName, result.fileSize);
      }

    } catch (error: any) {
      logger.error(`❌ Failed to generate export for request ${request.Id}:`, error);
      // Error status is already set by DataExportService
    }
  }

  /**
   * Get user information
   */
  private async getUserInfo(userId: string): Promise<UserInfo | null> {
    const request = await this.dbService.getRequest();

    const result = await request
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT Id, Email, FirstName, LastName, Username
        FROM Users
        WHERE Id = @userId
      `);

    return (result.recordset[0] as UserInfo) || null;
  }

  /**
   * Send export ready email notification
   */
  private async sendExportReadyEmail(
    user: any,
    requestId: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    try {
      const downloadUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?export=${requestId}`;
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      await this.emailService.sendEmail({
        to: user.Email,
        subject: '✅ Your Mishin Learn Data Export is Ready',
        html: this.generateEmailTemplate(user.FirstName, downloadUrl, fileName, fileSize, expiryDate),
      });

      logger.info(`📧 Export ready email sent to ${user.Email}`);
    } catch (error) {
      logger.error('❌ Failed to send export ready email:', error);
      // Don't throw - export is still successful even if email fails
    }
  }

  /**
   * Generate email HTML template
   */
  private generateEmailTemplate(
    firstName: string,
    downloadUrl: string,
    fileName: string,
    fileSize: number,
    expiryDate: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Data Export is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📦 Data Export Ready
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi ${firstName},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Great news! We've finished preparing your personal data export from Mishin Learn. Your complete learning history, 
                progress, certificates, and more are now ready to download.
              </p>

              <!-- Export Details Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666;">
                          <strong style="color: #333;">File Name:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right;">
                          ${fileName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666;">
                          <strong style="color: #333;">File Size:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333; text-align: right;">
                          ${this.formatFileSize(fileSize)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666;">
                          <strong style="color: #333;">Expires:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #dc3545; text-align: right;">
                          ${expiryDate} (7 days)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Download Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; 
                              box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      ⬇️ Download My Data Export
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's Included -->
              <div style="margin: 30px 0; padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1976d2;">
                  📋 What's Included in Your Export
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #333; font-size: 14px; line-height: 1.8;">
                  <li>Profile information and settings</li>
                  <li>Course enrollments and progress</li>
                  <li>Assessment submissions and scores</li>
                  <li>Earned certificates</li>
                  <li>Purchase history and invoices</li>
                  <li>Chat conversations and messages</li>
                  <li>AI tutoring session history</li>
                  <li>Comments and community interactions</li>
                  <li>Bookmarks and saved courses</li>
                </ul>
              </div>

              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⚠️ Security Notice:</strong> This export contains all your personal data. 
                  Keep this file secure and do not share it with others. The download link will expire in 7 days.
                </p>
              </div>

              <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #666;">
                Need help? Contact us at 
                <a href="mailto:support@mishinlearn.com" style="color: #667eea; text-decoration: none;">support@mishinlearn.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                © ${new Date().getFullYear()} Mishin Learn. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                This is an automated notification about your data export request.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
