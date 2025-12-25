/**
 * Email Service - SendGrid Integration
 * Handles all email communications for the platform
 */

import sgMail from '@sendgrid/mail';

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

class EmailService {
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (apiKey && apiKey !== 'your-sendgrid-api-key-here') {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      console.log('✅ SendGrid email service configured');
    } else {
      console.warn('⚠️ SendGrid API key not configured. Emails will be logged to console.');
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

      const msg: any = {
        to: options.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@mishinlearn.com',
        subject: options.subject,
      };

      // Add text or html content (at least one is required)
      if (options.html) {
        msg.html = options.html;
      }
      if (options.text) {
        msg.text = options.text;
      }

      await sgMail.send(msg);
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
   * Send password reset email (enhanced from existing)
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
}

export default new EmailService();
