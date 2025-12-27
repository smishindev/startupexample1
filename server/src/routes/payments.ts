import express, { Request, Response } from 'express';
import { StripeService } from '../services/StripeService';
import { DatabaseService } from '../services/DatabaseService';
import EmailService from '../services/EmailService';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import InvoicePdfService from '../services/InvoicePdfService';
import path from 'path';

const router = express.Router();
const stripeService = StripeService.getInstance();
const db = DatabaseService.getInstance();
const emailService = EmailService;

/**
 * POST /api/payments/create-payment-intent
 * Create a payment intent for course purchase
 * Enhanced with detailed error logging
 */
router.post('/create-payment-intent', authenticateToken, async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      console.error(`[${requestId}] Authentication failed: No userId`);
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { courseId, amount, currency = 'usd' } = req.body;

    console.log(`[${requestId}] Payment intent request:`, {
      userId,
      courseId,
      amount,
      currency,
    });

    if (!courseId || !amount) {
      console.error(`[${requestId}] Validation failed: Missing courseId or amount`);
      return res.status(400).json({ success: false, message: 'courseId and amount are required' });
    }

    // Verify course exists
    const courses = await db.query(
      `SELECT Id, Title, Price FROM dbo.Courses WHERE Id = @courseId`,
      { courseId }
    );

    if (!courses.length) {
      console.error(`[${requestId}] Course not found:`, courseId);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const course = courses[0];

    // Verify amount matches course price
    if (Math.abs(amount - course.Price) > 0.01) {
      console.error(`[${requestId}] Price mismatch:`, {
        requested: amount,
        actual: course.Price,
        difference: Math.abs(amount - course.Price),
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Amount does not match course price' 
      });
    }

    // Check if already enrolled
    const enrollments = await db.query(
      `SELECT Id FROM dbo.Enrollments WHERE UserId = @userId AND CourseId = @courseId`,
      { userId, courseId }
    );

    if (enrollments.length > 0) {
      console.warn(`[${requestId}] User already enrolled:`, { userId, courseId });
      return res.status(400).json({ 
        success: false, 
        message: 'Already enrolled in this course' 
      });
    }

    // Create payment intent
    const { clientSecret, paymentIntent } = await stripeService.createPaymentIntent({
      userId,
      courseId,
      amount,
      currency,
      metadata: {
        courseTitle: course.Title,
      },
    });

    const processingTime = Date.now() - startTime;
    console.log(`[${requestId}] Payment intent created successfully:`, {
      paymentIntentId: paymentIntent.id,
      userId,
      courseId,
      processingTime: `${processingTime}ms`,
    });

    res.json({
      success: true,
      data: {
        clientSecret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Payment intent creation failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
    });
    
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create payment intent' 
    });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook endpoint for payment events
 * Implements retry logic with exponential backoff
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const startTime = Date.now();
  let eventId = 'unknown';
  
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      console.error('❌ Webhook: No signature provided');
      return res.status(400).json({ success: false, message: 'No signature provided' });
    }

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(req.body, signature as string);
    eventId = event.id;

    console.log(`📨 Webhook received: ${event.type} (ID: ${eventId})`);

    // Process event with error handling
    try {
      await processWebhookEvent(event);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Webhook processed successfully: ${event.type} (${processingTime}ms)`);
      
      res.json({ success: true, received: true, eventId: event.id });
    } catch (processingError) {
      // Log detailed error for debugging
      console.error(`❌ Webhook processing error for ${event.type} (${eventId}):`, {
        error: processingError instanceof Error ? processingError.message : 'Unknown error',
        stack: processingError instanceof Error ? processingError.stack : undefined,
        eventType: event.type,
        eventId: event.id,
      });

      // Return 500 to trigger Stripe's retry mechanism
      // Stripe will retry with exponential backoff: immediately, 1h, 2h, 4h, 8h, 16h, 24h
      return res.status(500).json({ 
        success: false, 
        message: 'Webhook processing failed, will retry',
        eventId: event.id,
      });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Webhook verification error (${processingTime}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventId,
    });
    
    // Invalid signature or malformed request - don't retry
    return res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Webhook verification failed' 
    });
  }
});

/**
 * Process webhook event with proper error handling
 * This function is separated to allow for better error isolation
 */
async function processWebhookEvent(event: any): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle payment_intent.succeeded webhook
 */
async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
  try {
    await stripeService.handlePaymentSuccess(paymentIntent);
    
    // Send purchase confirmation email (non-blocking)
    const { userId, courseId } = paymentIntent.metadata;
    if (userId && courseId) {
      sendPurchaseConfirmationEmail(userId, courseId, paymentIntent).catch(emailError => {
        console.error('⚠️ Failed to send purchase confirmation email:', emailError);
        // Email failure shouldn't fail the webhook
      });
    }
  } catch (error) {
    console.error('❌ Error in handlePaymentIntentSucceeded:', error);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Handle payment_intent.payment_failed webhook
 */
async function handlePaymentIntentFailed(failedPayment: any): Promise<void> {
  try {
    await db.query(
      `UPDATE dbo.Transactions 
       SET Status = 'failed', UpdatedAt = GETUTCDATE()
       WHERE StripePaymentIntentId = @paymentIntentId`,
      { paymentIntentId: failedPayment.id }
    );
    console.log(`❌ Payment failed: ${failedPayment.id}`);
  } catch (error) {
    console.error('❌ Error in handlePaymentIntentFailed:', error);
    throw error;
  }
}

/**
 * Handle charge.refunded webhook
 */
async function handleChargeRefunded(charge: any): Promise<void> {
  try {
    console.log(`💰 Refund processed for charge: ${charge.id}`);
    // Additional refund processing logic can be added here
  } catch (error) {
    console.error('❌ Error in handleChargeRefunded:', error);
    throw error;
  }
}

/**
 * Send purchase confirmation email (async, non-blocking)
 */
async function sendPurchaseConfirmationEmail(
  userId: string, 
  courseId: string, 
  paymentIntent: any
): Promise<void> {
  try {
    const users = await db.query(`SELECT Email, FirstName FROM dbo.Users WHERE Id = @userId`, { userId });
    const courses = await db.query(`SELECT Title FROM dbo.Courses WHERE Id = @courseId`, { courseId });
    const transactions = await db.query(
      `SELECT Id FROM dbo.Transactions WHERE StripePaymentIntentId = @paymentIntentId`, 
      { paymentIntentId: paymentIntent.id }
    );
    
    if (users.length && courses.length && transactions.length) {
      await emailService.sendPurchaseConfirmation({
        email: users[0].Email,
        firstName: users[0].FirstName,
        courseName: courses[0].Title,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        transactionId: transactions[0].Id,
        purchaseDate: new Date().toISOString(),
      });
      console.log(`📧 Purchase confirmation sent to ${users[0].Email}`);
    }
  } catch (error) {
    console.error('⚠️ Email sending failed:', error);
    // Don't throw - email failure shouldn't fail the webhook
  }
}

/**
 * POST /api/payments/test-complete
 * DEV ONLY: Manually complete a transaction for testing
 * Simulates what the webhook would do
 */
router.post('/test-complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId is required' });
    }

    // Get the payment intent from Stripe
    const paymentIntent = await stripeService['stripe'].paymentIntents.retrieve(paymentIntentId);
    
    // Manually trigger payment success handling
    await stripeService.handlePaymentSuccess(paymentIntent);

    res.json({
      success: true,
      message: 'Transaction completed and invoice generated',
    });
  } catch (error) {
    console.error('❌ Error completing test payment:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to complete payment' 
    });
  }
});

/**
 * POST /api/payments/confirm-enrollment
 * Confirm enrollment after successful payment (for test mode when webhook isn't triggered)
 * SECURITY: Only creates enrollment if a valid completed payment exists
 */
router.post('/confirm-enrollment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { courseId, paymentIntentId } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    // SECURITY CHECK: Verify a COMPLETED payment transaction exists for this user and course
    const transactions = await db.query(
      `SELECT Id, Status, StripePaymentIntentId FROM dbo.Transactions 
       WHERE CourseId = @courseId 
       AND UserId = @userId 
       AND Status = 'completed'
       ${paymentIntentId ? 'AND StripePaymentIntentId = @paymentIntentId' : ''}
       ORDER BY CreatedAt DESC`,
      { courseId, userId, paymentIntentId }
    );

    if (!transactions.length) {
      console.warn(`⚠️ Enrollment attempt without valid payment: User ${userId}, Course ${courseId}`);
      return res.status(403).json({ 
        success: false, 
        message: 'No valid payment found for this course. Please complete payment first.' 
      });
    }

    // Verify the transaction status is 'completed'
    if (transactions[0].Status !== 'completed') {
      return res.status(403).json({ 
        success: false, 
        message: 'Payment is not completed yet.' 
      });
    }

    // Create enrollment if it doesn't exist
    await db.query(
      `IF NOT EXISTS (SELECT 1 FROM dbo.Enrollments WHERE UserId = @userId AND CourseId = @courseId)
       BEGIN
         INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
         VALUES (NEWID(), @userId, @courseId, GETUTCDATE(), 'active')
       END`,
      { userId, courseId }
    );

    console.log(`✅ Enrollment confirmed for user ${userId} in course ${courseId} (Transaction: ${transactions[0].Id})`);

    res.json({
      success: true,
      message: 'Enrollment confirmed',
    });
  } catch (error) {
    console.error('❌ Error confirming enrollment:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to confirm enrollment' 
    });
  }
});

/**
 * GET /api/payments/transactions
 * Get user's transaction history
 */
router.get('/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const transactions = await stripeService.getUserTransactions(userId);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve transactions' 
    });
  }
});

/**
 * GET /api/payments/invoice/:invoiceId/download
 * Download invoice PDF
 */
router.get('/invoice/:invoiceId/download', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { invoiceId } = req.params;

    // Get invoice with transaction verification
    const invoices = await db.query<{
      PdfUrl: string;
      InvoiceNumber: string;
      UserId: string;
    }>(
      `SELECT i.PdfUrl, i.InvoiceNumber, t.UserId
       FROM dbo.Invoices i
       INNER JOIN dbo.Transactions t ON i.TransactionId = t.Id
       WHERE i.Id = @invoiceId`,
      { invoiceId }
    );

    if (!invoices.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    const invoice = invoices[0];

    // Security: Verify invoice belongs to user
    if (invoice.UserId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Check if PDF exists
    if (!invoice.PdfUrl) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice PDF not generated yet' 
      });
    }

    const filepath = InvoicePdfService.getInvoiceFilePath(invoice.PdfUrl);

    if (!InvoicePdfService.invoiceExists(invoice.PdfUrl)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice PDF file not found' 
      });
    }

    // Send file
    res.download(filepath, `${invoice.InvoiceNumber}.pdf`, (err) => {
      if (err) {
        console.error('❌ Error downloading invoice:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: 'Failed to download invoice' 
          });
        }
      }
    });
  } catch (error) {
    console.error('❌ Error downloading invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to download invoice' 
    });
  }
});

/**
 * POST /api/payments/request-refund
 * Request a refund for a transaction
 */
router.post('/request-refund', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { transactionId, reason } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId and reason are required' 
      });
    }

    // Verify transaction belongs to user
    const transactions = await db.query(
      `SELECT Id, UserId, CourseId, Amount, Currency, CreatedAt 
       FROM dbo.Transactions 
       WHERE Id = @transactionId AND UserId = @userId`,
      { transactionId, userId }
    );

    if (!transactions.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    const transaction = transactions[0];

    // Check refund eligibility (30 days)
    // Use UTC timestamps for consistent date calculations across timezones
    const purchaseDate = new Date(transaction.CreatedAt);
    const now = new Date();
    
    // Calculate days since purchase using UTC timestamps
    const daysSincePurchase = Math.floor(
      (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePurchase > 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refund window has expired (30 days)' 
      });
    }

    // Check course completion
    const progress = await db.query(
      `SELECT OverallProgress FROM dbo.CourseProgress 
       WHERE UserId = @userId AND CourseId = @courseId`,
      { userId, courseId: transaction.CourseId }
    );

    let refundAmount = transaction.Amount;
    if (progress.length && progress[0].OverallProgress > 50) {
      // Partial refund based on completion
      if (progress[0].OverallProgress >= 75) {
        refundAmount = transaction.Amount * 0.25; // 25% refund
      } else {
        refundAmount = transaction.Amount * 0.50; // 50% refund
      }
    }

    // Process refund
    const { refund, success } = await stripeService.processRefund({
      transactionId,
      reason,
      amount: refundAmount,
    });

    // Send refund confirmation email
    try {
      const users = await db.query(`SELECT Email, FullName FROM dbo.Users WHERE Id = @userId`, { userId });
      const courses = await db.query(`SELECT Title FROM dbo.Courses WHERE Id = @courseId`, { courseId: transaction.CourseId });
      
      if (users.length && courses.length) {
        await emailService.sendRefundConfirmation({
          email: users[0].Email,
          firstName: users[0].FullName.split(' ')[0],
          courseName: courses[0].Title,
          refundAmount,
          currency: transaction.Currency,
          refundReason: reason,
          processDate: new Date().toISOString(),
        });
      }
    } catch (emailError) {
      console.error('⚠️ Failed to send refund confirmation email:', emailError);
    }

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refundAmount,
        currency: transaction.Currency,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to process refund' 
    });
  }
});

/**
 * GET /api/payments/transaction/:id
 * Get specific transaction details
 */
router.get('/transaction/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { id } = req.params;

    const transactions = await db.query(
      `SELECT 
        t.*, 
        c.Title as CourseTitle, 
        c.ThumbnailUrl as CourseThumbnail,
        i.InvoiceNumber, 
        i.PdfUrl as InvoicePdfUrl,
        i.TotalAmount as InvoiceTotal
       FROM dbo.Transactions t
       LEFT JOIN dbo.Courses c ON t.CourseId = c.Id
       LEFT JOIN dbo.Invoices i ON t.Id = i.TransactionId
       WHERE t.Id = @id AND t.UserId = @userId`,
      { id, userId }
    );

    if (!transactions.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    res.json({
      success: true,
      data: transactions[0],
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve transaction' 
    });
  }
});

export default router;
