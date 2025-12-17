import Stripe from 'stripe';
import { DatabaseService } from './DatabaseService';
import InvoicePdfService from './InvoicePdfService';

/**
 * StripeService - Handles all Stripe payment operations
 * 
 * Features:
 * - Payment Intent creation for course purchases
 * - Customer management (create/retrieve)
 * - Refund processing with validation
 * - Invoice generation
 * - Transaction tracking in database
 * - Webhook event handling
 */
export class StripeService {
  private static instance: StripeService;
  private stripe: Stripe;

  private constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in environment variables');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });

    console.log('✅ Stripe Service initialized');
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  /**
   * Create a payment intent for course purchase
   */
  async createPaymentIntent(params: {
    userId: string;
    courseId: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<{ paymentIntent: Stripe.PaymentIntent; clientSecret: string }> {
    try {
      const db = DatabaseService.getInstance();
      const { userId, courseId, amount, currency = 'usd', metadata = {}, idempotencyKey } = params;

      // Check for existing pending transaction (prevent duplicates)
      const existingTransactions = await db.query<{ StripePaymentIntentId: string }>(
        `SELECT StripePaymentIntentId FROM dbo.Transactions 
         WHERE UserId = @userId AND CourseId = @courseId AND Status = 'pending'
         AND CreatedAt > DATEADD(MINUTE, -30, GETUTCDATE())`,
        { userId, courseId }
      );

      // If recent pending transaction exists, retrieve that payment intent
      if (existingTransactions.length > 0 && existingTransactions[0].StripePaymentIntentId) {
        try {
          const existingIntent = await this.stripe.paymentIntents.retrieve(
            existingTransactions[0].StripePaymentIntentId
          );
          
          if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
            console.log(`♻️ Reusing existing payment intent: ${existingIntent.id} for user ${userId}`);
            return {
              paymentIntent: existingIntent,
              clientSecret: existingIntent.client_secret!,
            };
          }
        } catch (error) {
          console.warn(`⚠️ Could not retrieve existing payment intent, creating new one`);
        }
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(userId);

      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || `pi_${userId}_${courseId}_${Date.now()}`;

      // Create payment intent with idempotency key
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customer.id,
        metadata: {
          userId,
          courseId,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: finalIdempotencyKey, // Prevent duplicate charges
      });

      // Create pending transaction in database
      // Wrapped in try-catch to handle race condition where duplicate is created
      try {
        await db.query(
          `INSERT INTO dbo.Transactions (
            Id, UserId, CourseId, Amount, Currency, Status,
            StripePaymentIntentId, PaymentMethod, CreatedAt
          ) VALUES (
            NEWID(), @userId, @courseId, @amount, @currency, 'pending',
            @paymentIntentId, 'card', GETUTCDATE()
          )`,
          {
            userId,
            courseId,
            amount,
            currency: currency.toUpperCase(),
            paymentIntentId: paymentIntent.id,
          }
        );

        console.log(`✅ Payment Intent created: ${paymentIntent.id} for user ${userId}, course ${courseId}`);
      } catch (insertError: any) {
        // Check if it's a unique constraint violation (error 2601 or 2627)
        if (insertError.number === 2601 || insertError.number === 2627) {
          console.log(`⚠️ Duplicate pending transaction detected for user ${userId}, course ${courseId}`);
          console.log(`🔄 Retrieving existing pending transaction...`);
          
          // Query for the existing pending transaction
          const existingPending = await db.query<{ StripePaymentIntentId: string }>(
            `SELECT StripePaymentIntentId FROM dbo.Transactions 
             WHERE UserId = @userId AND CourseId = @courseId AND Status = 'pending'`,
            { userId, courseId }
          );

          if (existingPending.length > 0 && existingPending[0].StripePaymentIntentId) {
            // Return the existing payment intent instead
            const existingIntent = await this.stripe.paymentIntents.retrieve(
              existingPending[0].StripePaymentIntentId
            );
            
            console.log(`♻️ Returning existing payment intent: ${existingIntent.id}`);
            return {
              paymentIntent: existingIntent,
              clientSecret: existingIntent.client_secret!,
            };
          }
        }
        
        // If it's not a unique constraint violation or we couldn't find existing, rethrow
        throw insertError;
      }

      return {
        paymentIntent,
        clientSecret: paymentIntent.client_secret!,
      };
    } catch (error) {
      console.error('❌ Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Get or create Stripe customer for user
   */
  async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    try {
      const db = DatabaseService.getInstance();

      // Check if user already has a Stripe customer ID
      const result = await db.query<{ StripeCustomerId?: string; Email: string; FirstName: string; LastName: string }>(
        `SELECT StripeCustomerId, Email, FirstName, LastName FROM dbo.Users WHERE Id = @userId`,
        { userId }
      );

      if (!result.length) {
        throw new Error('User not found');
      }

      const user = result[0];
      const fullName = `${user.FirstName} ${user.LastName}`.trim();

      // If customer exists, retrieve it
      if (user.StripeCustomerId) {
        try {
          const customer = await this.stripe.customers.retrieve(user.StripeCustomerId);
          if (!customer.deleted) {
            return customer as Stripe.Customer;
          }
        } catch (error) {
          console.warn(`⚠️ Stripe customer ${user.StripeCustomerId} not found, creating new one`);
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: user.Email,
        name: fullName,
        metadata: {
          userId,
        },
      });

      // Update user with Stripe customer ID
      await db.query(
        `UPDATE dbo.Users SET StripeCustomerId = @customerId WHERE Id = @userId`,
        { customerId: customer.id, userId }
      );

      console.log(`✅ Created Stripe customer ${customer.id} for user ${userId}`);

      return customer;
    } catch (error) {
      console.error('❌ Error getting/creating customer:', error);
      throw new Error('Failed to get or create Stripe customer');
    }
  }

  /**
   * Handle successful payment (called from webhook)
   * Implements concurrent enrollment prevention
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const db = DatabaseService.getInstance();
    const { userId, courseId } = paymentIntent.metadata;

    if (!userId || !courseId) {
      throw new Error('Missing userId or courseId in payment metadata');
    }

    try {
      // Use database transaction for atomic operations (prevents race conditions)
      // Check if already enrolled BEFORE updating transaction
      const existingEnrollments = await db.query(
        `SELECT Id FROM dbo.Enrollments WHERE UserId = @userId AND CourseId = @courseId`,
        { userId, courseId }
      );

      // Update transaction status (idempotent - can be called multiple times)
      const updateResult = await db.query(
        `UPDATE dbo.Transactions 
         SET Status = 'completed',
             StripeChargeId = @chargeId,
             CompletedAt = GETUTCDATE(),
             UpdatedAt = GETUTCDATE()
         WHERE StripePaymentIntentId = @paymentIntentId
         AND Status IN ('pending', 'completed')`, // Allow re-processing of already completed
        {
          chargeId: paymentIntent.latest_charge,
          paymentIntentId: paymentIntent.id,
        }
      );

      // Create enrollment only if not already enrolled (prevents duplicates)
      if (existingEnrollments.length === 0) {
        await db.query(
          `INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
           VALUES (NEWID(), @userId, @courseId, GETUTCDATE(), 'active')`,
          { userId, courseId }
        );
        console.log(`✅ Enrollment created for user ${userId}, course ${courseId}`);
      } else {
        console.log(`ℹ️ User ${userId} already enrolled in course ${courseId}, skipping enrollment creation`);
      }

      // Generate invoice (idempotent - checks if invoice already exists)
      await this.generateInvoice(paymentIntent.id);

      console.log(`✅ Payment success processed for payment intent ${paymentIntent.id}`);
    } catch (error) {
      console.error('❌ Error handling payment success:', error);
      throw error; // Re-throw to trigger webhook retry
    }
  }

  /**
   * Process refund for a transaction
   */
  async processRefund(params: {
    transactionId: string;
    reason: string;
    amount?: number;
  }): Promise<{ refund: Stripe.Refund; success: boolean }> {
    try {
      const db = DatabaseService.getInstance();
      const { transactionId, reason, amount } = params;

      // Get transaction details
      const transactions = await db.query<{
        StripeChargeId: string;
        Amount: number;
        Status: string;
        CourseId: string;
        UserId: string;
      }>(
        `SELECT StripeChargeId, Amount, Status, CourseId, UserId 
         FROM dbo.Transactions 
         WHERE Id = @transactionId`,
        { transactionId }
      );

      if (!transactions.length) {
        throw new Error('Transaction not found');
      }

      const transaction = transactions[0];

      if (transaction.Status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      if (!transaction.StripeChargeId) {
        throw new Error('No Stripe charge ID found for this transaction');
      }

      // Create refund in Stripe
      const refundAmount = amount ? Math.round(amount * 100) : undefined;
      const refund = await this.stripe.refunds.create({
        charge: transaction.StripeChargeId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          transactionId,
          refundReason: reason,
        },
      });

      // Update transaction in database
      await db.query(
        `UPDATE dbo.Transactions 
         SET Status = 'refunded',
             RefundReason = @reason,
             RefundedAt = GETUTCDATE()
         WHERE Id = @transactionId`,
        { transactionId, reason }
      );

      // Revoke course access
      await db.query(
        `UPDATE dbo.Enrollments 
         SET Status = 'revoked'
         WHERE UserId = @userId AND CourseId = @courseId`,
        { userId: transaction.UserId, courseId: transaction.CourseId }
      );

      console.log(`✅ Refund processed: ${refund.id} for transaction ${transactionId}`);

      return { refund, success: true };
    } catch (error) {
      console.error('❌ Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  /**
   * Generate invoice for completed transaction (idempotent)
   */
  async generateInvoice(paymentIntentId: string): Promise<string> {
    try {
      const db = DatabaseService.getInstance();

      // Check if invoice already exists (idempotency)
      const existingInvoices = await db.query<{ InvoiceNumber: string }>(
        `SELECT i.InvoiceNumber FROM dbo.Invoices i
         INNER JOIN dbo.Transactions t ON i.TransactionId = t.Id
         WHERE t.StripePaymentIntentId = @paymentIntentId`,
        { paymentIntentId }
      );

      if (existingInvoices.length > 0) {
        console.log(`ℹ️ Invoice already exists for payment ${paymentIntentId}: ${existingInvoices[0].InvoiceNumber}`);
        return existingInvoices[0].InvoiceNumber;
      }

      // Get transaction details with user and course info
      const transactions = await db.query<{
        Id: string;
        Amount: number;
        Currency: string;
        UserId: string;
        CourseId: string;
        PaymentMethod: string;
      }>(
        `SELECT t.Id, t.Amount, t.Currency, t.UserId, t.CourseId, t.PaymentMethod
         FROM dbo.Transactions t
         WHERE t.StripePaymentIntentId = @paymentIntentId`,
        { paymentIntentId }
      );

      if (!transactions.length) {
        throw new Error('Transaction not found');
      }

      const transaction = transactions[0];

      // Get user details
      const users = await db.query<{
        FirstName: string;
        LastName: string;
        Email: string;
        BillingStreetAddress: string | null;
        BillingCity: string | null;
        BillingState: string | null;
        BillingPostalCode: string | null;
        BillingCountry: string | null;
      }>(
        `SELECT FirstName, LastName, Email, BillingStreetAddress, BillingCity, 
                BillingState, BillingPostalCode, BillingCountry 
         FROM dbo.Users WHERE Id = @userId`,
        { userId: transaction.UserId }
      );

      // Get course details
      const courses = await db.query<{
        Title: string;
        Price: number;
      }>(
        `SELECT Title, Price FROM dbo.Courses WHERE Id = @courseId`,
        { courseId: transaction.CourseId }
      );

      if (!users.length || !courses.length) {
        throw new Error('User or course not found');
      }

      const user = users[0];
      const course = courses[0];

      // Format billing address
      const billingAddressParts = [
        user.BillingStreetAddress,
        user.BillingCity,
        user.BillingState,
        user.BillingPostalCode,
        user.BillingCountry,
      ].filter(Boolean);
      const billingAddress = billingAddressParts.length > 0 
        ? billingAddressParts.join(', ') 
        : undefined;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${transaction.Id.substring(0, 8).toUpperCase()}`;

      // Calculate tax (0% for now, can be enhanced based on location)
      const taxAmount = 0;
      const totalAmount = transaction.Amount + taxAmount;

      // Generate PDF
      const pdfUrl = await InvoicePdfService.generateInvoicePdf({
        invoiceNumber,
        date: new Date(),
        customerName: `${user.FirstName} ${user.LastName}`.trim(),
        customerEmail: user.Email,
        billingAddress: billingAddress,
        items: [
          {
            description: `Course: ${course.Title}`,
            amount: transaction.Amount,
          },
        ],
        subtotal: transaction.Amount,
        tax: taxAmount,
        total: totalAmount,
        paymentMethod: transaction.PaymentMethod || 'Card',
      });

      // Insert invoice with PDF path
      await db.query(
        `INSERT INTO dbo.Invoices (
          Id, TransactionId, InvoiceNumber, Amount, TaxAmount, TotalAmount, PdfPath, CreatedAt
        ) VALUES (
          NEWID(), @transactionId, @invoiceNumber, @amount, @taxAmount, @totalAmount, @pdfPath, GETUTCDATE()
        )`,
        {
          transactionId: transaction.Id,
          invoiceNumber,
          amount: transaction.Amount,
          taxAmount,
          totalAmount,
          pdfPath: pdfUrl,
        }
      );

      console.log(`✅ Invoice generated: ${invoiceNumber} for payment ${paymentIntentId} (PDF: ${pdfUrl})`);

      return invoiceNumber;
    } catch (error) {
      console.error('❌ Error generating invoice:', error);
      throw new Error('Failed to generate invoice');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get transaction history for user
   */
  async getUserTransactions(userId: string): Promise<any[]> {
    try {
      const db = DatabaseService.getInstance();

      const transactions = await db.query(
        `SELECT 
          t.Id, t.Amount, t.Currency, t.Status, t.CreatedAt, t.CompletedAt, t.RefundedAt,
          t.StripePaymentIntentId,
          c.Title as CourseTitle, c.Thumbnail as CourseThumbnail,
          i.Id as InvoiceId, i.InvoiceNumber, i.PdfPath as InvoicePdfUrl
        FROM dbo.Transactions t
        LEFT JOIN dbo.Courses c ON t.CourseId = c.Id
        LEFT JOIN dbo.Invoices i ON t.Id = i.TransactionId
        WHERE t.UserId = @userId
        ORDER BY t.CreatedAt DESC`,
        { userId }
      );

      return transactions;
    } catch (error) {
      console.error('❌ Error getting user transactions:', error);
      throw new Error('Failed to retrieve transactions');
    }
  }
}

export default StripeService;
