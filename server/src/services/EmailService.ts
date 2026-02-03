/**
 * Email Service - Nodemailer + Gmail Integration
 * Alternative to SendGrid - Uses Gmail SMTP
 * 
 * Enhanced with email tracking and analytics
 */

import nodemailer from 'nodemailer';
import EmailAnalyticsService from './EmailAnalyticsService';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface VerificationEmailData {
  email: string;
  firstName: string;
  verificationCode: string;
}

interface WelcomeEmailData {
  email: string;
  firstName: string;
}

interface PurchaseConfirmationData {
  email: string;
  firstName: string;
  courseName: string;
  amount: number;
  currency: string;
  transactionId: string;
  purchaseDate: string;
  invoiceUrl?: string;
}

interface RefundConfirmationData {
  email: string;
  firstName: string;
  courseName: string;
  refundAmount: number;
  currency: string;
  refundReason?: string;
  processDate: string;
}

interface DigestEmailData {
  email: string;
  firstName: string;
  frequency: 'daily' | 'weekly';
  notifications: Array<{
    Id: string;
    Type: string;
    Priority: string;
    Title: string;
    Message: string;
    ActionUrl: string | null;
    ActionText: string | null;
    CreatedAt: string;
  }>;
}

class EmailService {
  private transporter: any = null;
  private isConfigured: boolean = false;
  private fromEmail: string = 'noreply@mishinlearn.com';

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    
    if (gmailUser && gmailAppPassword && gmailAppPassword !== 'your-gmail-app-password-here') {
      // Configure nodemailer with Gmail
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword
        }
      });
      
      this.fromEmail = gmailUser;
      this.isConfigured = true;
      console.log('✅ Gmail email service configured');
      
      // Verify connection
      this.transporter.verify((error: any, success: any) => {
        if (error) {
          console.error('❌ Gmail connection failed:', error);
          this.isConfigured = false;
        } else {
          console.log('✅ Gmail SMTP ready to send emails');
        }
      });
    } else {
      console.warn('⚠️ Gmail credentials not configured. Emails will be logged to console.');
    }
  }

  /**
   * Wrap URL with click tracking
   */
  private wrapUrlWithTracking(url: string, trackingToken: string): string {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    return `${serverUrl}/api/email/track/${trackingToken}/click?url=${encodeURIComponent(url)}`;
  }

  /**
   * Generate tracking pixel HTML
   */
  private getTrackingPixel(trackingToken: string): string {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    return `<img src="${serverUrl}/api/email/track/${trackingToken}/pixel.gif" width="1" height="1" alt="" style="display:block" />`;
  }

  /**
   * Generate unsubscribe link HTML
   */
  private async getUnsubscribeLink(userId: string, emailType?: 'notification' | 'digest'): Promise<string> {
    try {
      const token = await EmailAnalyticsService.generateUnsubscribeToken(userId, emailType || null);
      const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
      return `<a href="${serverUrl}/api/email/unsubscribe/${token}" style="color: #999; text-decoration: underline;">Unsubscribe</a>`;
    } catch (error) {
      console.error('Error generating unsubscribe link:', error);
      return '<span style="color: #999;">Unsubscribe</span>';
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.log('📧 [EMAIL SIMULATION]', {
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html?.substring(0, 100) + '...'
        });
        return true;
      }

      const mailOptions = {
        from: `"Mishin Learn" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Send email verification code
   */
  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px solid #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Welcome to <strong>Mishin Learn Platform</strong>! To complete your registration, please verify your email address using the code below:</p>
            
            <div class="code-box">${data.verificationCode}</div>
            
            <p>This code will expire in <strong>24 hours</strong>.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hi ${data.firstName},
      
      Welcome to Mishin Learn Platform! 
      
      Your verification code is: ${data.verificationCode}
      
      This code will expire in 24 hours.
      
      If you didn't create an account with us, please ignore this email.
      
      Best regards,
      The Mishin Learn Team
    `;

    return this.sendEmail({
      to: data.email,
      subject: '🔐 Verify Your Email - Mishin Learn',
      text,
      html
    });
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Mishin Learn!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>We're excited to have you on board! You now have access to:</p>
            
            <div class="feature">
              <strong>📚 Premium Courses</strong><br>
              Browse hundreds of courses across multiple categories
            </div>
            
            <div class="feature">
              <strong>🤖 AI Tutoring</strong><br>
              Get personalized help from our AI tutor anytime
            </div>
            
            <div class="feature">
              <strong>📊 Progress Tracking</strong><br>
              Monitor your learning journey with detailed analytics
            </div>
            
            <div class="feature">
              <strong>🎯 Adaptive Assessments</strong><br>
              Test your knowledge with intelligent assessments
            </div>
            
            <p>Start exploring courses and begin your learning journey today!</p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.email,
      subject: '🎉 Welcome to Mishin Learn Platform!',
      html
    });
  }

  /**
   * Send purchase confirmation with receipt
   */
  async sendPurchaseConfirmation(data: PurchaseConfirmationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 20px; font-weight: bold; color: #43e97b; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Purchase Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Thank you for your purchase! You now have full access to:</p>
            
            <h2>${data.courseName}</h2>
            
            <div class="receipt">
              <h3>Receipt</h3>
              <div class="receipt-row">
                <span>Transaction ID:</span>
                <span><strong>${data.transactionId}</strong></span>
              </div>
              <div class="receipt-row">
                <span>Purchase Date:</span>
                <span>${data.purchaseDate}</span>
              </div>
              <div class="receipt-row">
                <span>Course:</span>
                <span>${data.courseName}</span>
              </div>
              <div class="receipt-row">
                <span class="total">Total Amount:</span>
                <span class="total">${data.currency} ${data.amount.toFixed(2)}</span>
              </div>
            </div>
            
            ${data.invoiceUrl ? `<p><a href="${data.invoiceUrl}">Download Invoice (PDF)</a></p>` : ''}
            
            <p>You can start learning immediately by visiting your <strong>My Learning</strong> page.</p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.email,
      subject: `✅ Receipt for ${data.courseName}`,
      html
    });
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmation(data: RefundConfirmationData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💸 Refund Processed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>Your refund has been processed successfully.</p>
            
            <div class="info-box">
              <p><strong>Course:</strong> ${data.courseName}</p>
              <p><strong>Refund Amount:</strong> ${data.currency} ${data.refundAmount.toFixed(2)}</p>
              <p><strong>Process Date:</strong> ${data.processDate}</p>
              ${data.refundReason ? `<p><strong>Reason:</strong> ${data.refundReason}</p>` : ''}
            </div>
            
            <p>The refund will appear in your account within 5-10 business days, depending on your payment method.</p>
            <p><strong>Note:</strong> Your access to this course has been revoked.</p>
            
            <p>We're sorry to see you go. If you have any feedback, please don't hesitate to reach out.</p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: data.email,
      subject: `💸 Refund Confirmation - ${data.courseName}`,
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, firstName: string, resetCode: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-box { background: white; border: 2px solid #f5576c; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f5576c; margin: 20px 0; border-radius: 8px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Use the code below to complete the reset:</p>
            
            <div class="code-box">${resetCode}</div>
            
            <p>This code will expire in <strong>1 hour</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              If you didn't request this password reset, please ignore this email and ensure your account is secure.
            </div>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔒 Password Reset Code - Mishin Learn',
      html
    });
  }

  /**
   * Send notification email based on notification type
   * Enhanced with tracking and unsubscribe functionality
   */
  async sendNotificationEmail(data: {
    email: string;
    firstName: string;
    userId: string;
    notificationId?: string;
    notification: {
      title: string;
      message: string;
      type: 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course' | 'assessment' | 'community';
      priority: 'low' | 'normal' | 'high' | 'urgent';
      actionUrl?: string;
      actionText?: string;
    }
  }): Promise<boolean> {
    const { email, firstName, userId, notificationId, notification } = data;
    
    // Define type-specific styling
    const typeConfig: Record<string, { icon: string; color: string; gradient: string; subject: string }> = {
      progress: {
        icon: '📈',
        color: '#43e97b',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        subject: 'Learning Progress Update'
      },
      risk: {
        icon: '⚠️',
        color: '#f5576c',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        subject: 'Attention Required'
      },
      achievement: {
        icon: '🏆',
        color: '#ffd700',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        subject: 'New Achievement Unlocked!'
      },
      intervention: {
        icon: '💬',
        color: '#667eea',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        subject: 'Instructor Message'
      },
      assignment: {
        icon: '📝',
        color: '#ff9800',
        gradient: 'linear-gradient(135deg, #ff9800 0%, #f44336 100%)',
        subject: 'Assignment Reminder'
      },
      course: {
        icon: '📚',
        color: '#667eea',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        subject: 'Course Update'
      },
      assessment: {
        icon: '📝',
        color: '#2196F3',
        gradient: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
        subject: 'Assessment Update'
      },
      community: {
        icon: '👥',
        color: '#9c27b0',
        gradient: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
        subject: 'Community Update'
      }
    };

    const config = typeConfig[notification.type];
    
    // Generate tracking token
    let trackingToken = '';
    try {
      trackingToken = await EmailAnalyticsService.recordEmailSent(
        userId,
        'notification',
        notificationId
      );
    } catch (error) {
      console.error('Error generating tracking token:', error);
    }

    // Generate unsubscribe link
    const unsubscribeLink = await this.getUnsubscribeLink(userId, 'notification');
    
    // Wrap action URL with tracking
    const trackedActionUrl = notification.actionUrl && trackingToken
      ? this.wrapUrlWithTracking(notification.actionUrl, trackingToken)
      : notification.actionUrl;
    
    const priorityBadge = notification.priority === 'urgent' || notification.priority === 'high' 
      ? `<div style="background: #f5576c; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 15px;">
           ${notification.priority.toUpperCase()} PRIORITY
         </div>` 
      : '';

    const actionButton = trackedActionUrl && notification.actionText
      ? `<div style="text-align: center; margin: 30px 0;">
           <a href="${trackedActionUrl}" style="display: inline-block; padding: 15px 40px; background: ${config.color}; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
             ${notification.actionText}
           </a>
         </div>`
      : '';

    const trackingPixel = trackingToken ? this.getTrackingPixel(trackingToken) : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${config.gradient}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .notification-box { background: white; padding: 20px; border-left: 4px solid ${config.color}; border-radius: 5px; margin: 20px 0; }
          .message { font-size: 15px; line-height: 1.8; color: #555; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
          .footer a { color: ${config.color}; text-decoration: none; }
          .button { display: inline-block; padding: 15px 40px; background: ${config.color}; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
          .button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.icon} ${config.subject}</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            ${priorityBadge}
            
            <div class="notification-box">
              <h2 style="margin-top: 0; color: ${config.color};">${notification.title}</h2>
              <div class="message">
                ${notification.message}
              </div>
            </div>
            
            ${actionButton}
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              You received this email because you have email notifications enabled in your preferences. 
              You can manage your notification settings in your <a href="http://localhost:5173/settings" style="color: ${config.color};">profile settings</a>.
            </p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="http://localhost:5173/settings">Manage Preferences</a> | 
              <a href="http://localhost:5173/notifications">View All Notifications</a> |
              ${unsubscribeLink}
            </p>
          </div>
        </div>
        ${trackingPixel}
      </body>
      </html>
    `;

    const text = `
${config.icon} ${config.subject}

Hi ${firstName},

${notification.title}

${notification.message}

${notification.actionUrl ? `${notification.actionText || 'View Details'}: ${notification.actionUrl}` : ''}

---
You received this email because you have email notifications enabled in your preferences.
Manage your notification settings: http://localhost:5173/settings

Best regards,
The Mishin Learn Team

© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject: `${config.icon} ${config.subject} - Mishin Learn`,
      text,
      html
    });
  }

  /**
   * Send email digest (daily or weekly summary)
   * Enhanced with tracking and unsubscribe functionality
   */
  async sendDigestEmail(data: DigestEmailData & { userId: string; digestId?: string }): Promise<boolean> {
    const { email, firstName, userId, digestId, frequency, notifications } = data;
    
    // Generate tracking token
    let trackingToken = '';
    try {
      trackingToken = await EmailAnalyticsService.recordEmailSent(
        userId,
        'digest',
        undefined,
        digestId
      );
    } catch (error) {
      console.error('Error generating tracking token:', error);
    }

    // Generate unsubscribe link
    const unsubscribeLink = await this.getUnsubscribeLink(userId, 'digest');
    
    const frequencyText = frequency === 'daily' ? 'Daily' : 'Weekly';
    const notificationCount = notifications.length;
    
    // Group notifications by type
    const grouped = notifications.reduce((acc, notif) => {
      if (!acc[notif.Type]) {
        acc[notif.Type] = [];
      }
      acc[notif.Type].push(notif);
      return acc;
    }, {} as Record<string, typeof notifications>);

    // Type icons and colors
    const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
      progress: { icon: '📈', color: '#43e97b', label: 'Progress Updates' },
      risk: { icon: '⚠️', color: '#f5576c', label: 'Risk Alerts' },
      achievement: { icon: '🏆', color: '#ffd700', label: 'Achievements' },
      intervention: { icon: '💬', color: '#667eea', label: 'Instructor Messages' },
      assignment: { icon: '📝', color: '#ff9800', label: 'Assignment Reminders' },
      course: { icon: '📚', color: '#667eea', label: 'Course Updates' }
    };

    // Build summary section
    const summary = Object.keys(grouped).map(type => {
      const config = typeConfig[type] || { icon: '📌', color: '#667eea', label: type };
      return `<div style="padding: 10px; margin: 5px 0; border-left: 4px solid ${config.color}; background: white; border-radius: 5px;">
        <strong>${config.icon} ${config.label}:</strong> ${grouped[type].length}
      </div>`;
    }).join('');

    // Build notification list
    const notificationList = notifications.slice(0, 20).map(notif => {
      const config = typeConfig[notif.Type] || { icon: '📌', color: '#667eea', label: notif.Type };
      const priorityBadge = notif.Priority === 'urgent' || notif.Priority === 'high'
        ? `<span style="background: #f5576c; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; margin-left: 10px;">${notif.Priority.toUpperCase()}</span>`
        : '';
      
      // Wrap action URL with tracking
      let actionLink = '';
      if (notif.ActionUrl) {
        const trackedUrl = trackingToken 
          ? this.wrapUrlWithTracking(notif.ActionUrl, trackingToken)
          : notif.ActionUrl;
        actionLink = `<a href="${trackedUrl}" style="color: ${config.color}; text-decoration: none; font-weight: bold;">${notif.ActionText || 'View'} →</a>`;
      }

      return `
      <div style="background: white; padding: 15px; margin: 10px 0; border-left: 4px solid ${config.color}; border-radius: 5px;">
        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 5px;">
          ${config.icon} ${notif.Title} ${priorityBadge}
        </div>
        <div style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
          ${notif.Message.substring(0, 200)}${notif.Message.length > 200 ? '...' : ''}
        </div>
        ${actionLink ? `<div style="margin-top: 10px;">${actionLink}</div>` : ''}
      </div>`;
    }).join('');

    const showingCount = Math.min(notifications.length, 20);
    const remaining = notifications.length - showingCount;
    const remainingMessage = remaining > 0
      ? `<p style="text-align: center; color: #666; margin-top: 20px;">+ ${remaining} more notification${remaining > 1 ? 's' : ''} in your <a href="http://localhost:5173/notifications" style="color: #667eea;">notification center</a></p>`
      : '';

    const trackingPixel = trackingToken ? this.getTrackingPixel(trackingToken) : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e0e0e0; }
          .footer a { color: #667eea; text-decoration: none; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 Your ${frequencyText} Digest</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">You have ${notificationCount} notification${notificationCount > 1 ? 's' : ''}</p>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Here's your ${frequency} summary of what happened in your learning journey:</p>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #667eea; margin-bottom: 15px;">📊 Summary</h3>
              ${summary}
            </div>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #667eea; margin-bottom: 15px;">📋 Recent Notifications</h3>
              ${notificationList}
              ${remainingMessage}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:5173/notifications" class="button">View All Notifications</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              You're receiving this ${frequency} digest because you have email notifications set to "${frequency}" in your preferences. 
              You can <a href="http://localhost:5173/settings" style="color: #667eea;">change your email preferences</a> anytime.
            </p>
            
            <p>Best regards,<br>The Mishin Learn Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.</p>
            <p style="margin-top: 10px;">
              <a href="http://localhost:5173/settings">Manage Preferences</a> | 
              <a href="http://localhost:5173/notifications">View All Notifications</a> |
              ${unsubscribeLink}
            </p>
          </div>
        </div>
        ${trackingPixel}
      </body>
      </html>
    `;

    const text = `
${frequencyText} Digest - Mishin Learn

Hi ${firstName},

You have ${notificationCount} notification${notificationCount > 1 ? 's' : ''} in your ${frequency} digest.

${notifications.slice(0, 20).map((n, i) => `
${i + 1}. ${n.Title}
   ${n.Message.substring(0, 150)}${n.Message.length > 150 ? '...' : ''}
   ${n.ActionUrl || ''}
`).join('\n')}

${remaining > 0 ? `\n+ ${remaining} more notifications\n` : ''}

View all notifications: http://localhost:5173/notifications
Manage your preferences: http://localhost:5173/settings

Best regards,
The Mishin Learn Team

© ${new Date().getFullYear()} Mishin Learn Platform. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject: `📬 Your ${frequencyText} Digest - Mishin Learn`,
      text,
      html
    });
  }
}

export default new EmailService();
