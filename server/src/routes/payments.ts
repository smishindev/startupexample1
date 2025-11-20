import express, { Request, Response } from 'express';
import { StripeService } from '../services/StripeService';
import { DatabaseService } from '../services/DatabaseService';
import EmailService from '../services/EmailService';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();
const stripeService = StripeService.getInstance();
const db = DatabaseService.getInstance();
const emailService = EmailService;

/**
 * POST /api/payments/create-payment-intent
 * Create a payment intent for course purchase
 */
router.post('/create-payment-intent', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { courseId, amount, currency = 'usd' } = req.body;

    if (!courseId || !amount) {
      return res.status(400).json({ success: false, message: 'courseId and amount are required' });
    }

    // Verify course exists
    const courses = await db.query(
      `SELECT Id, Title, Price FROM dbo.Courses WHERE Id = @courseId`,
      { courseId }
    );

    if (!courses.length) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const course = courses[0];

    // Verify amount matches course price
    if (Math.abs(amount - course.Price) > 0.01) {
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

    console.log(`✅ Payment intent created: ${paymentIntent.id} for user ${userId}`);

    res.json({
      success: true,
      data: {
        clientSecret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create payment intent' 
    });
  }
});

/**
 * POST /api/payments/webhook
 * Stripe webhook endpoint for payment events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ success: false, message: 'No signature provided' });
    }

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(req.body, signature as string);

    console.log(`📨 Received webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await stripeService.handlePaymentSuccess(paymentIntent);
        
        // Send purchase confirmation email
        const { userId, courseId } = paymentIntent.metadata;
        if (userId && courseId) {
          try {
            const users = await db.query(`SELECT Email, FullName FROM dbo.Users WHERE Id = @userId`, { userId });
            const courses = await db.query(`SELECT Title FROM dbo.Courses WHERE Id = @courseId`, { courseId });
            const transactions = await db.query(`SELECT Id FROM dbo.Transactions WHERE StripePaymentIntentId = @paymentIntentId`, { paymentIntentId: paymentIntent.id });
            
            if (users.length && courses.length && transactions.length) {
              await emailService.sendPurchaseConfirmation({
                email: users[0].Email,
                firstName: users[0].FullName.split(' ')[0],
                courseName: courses[0].Title,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                transactionId: transactions[0].Id,
                purchaseDate: new Date().toISOString(),
              });
            }
          } catch (emailError) {
            console.error('⚠️ Failed to send purchase confirmation email:', emailError);
            // Don't fail the webhook if email fails
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await db.query(
          `UPDATE dbo.Transactions 
           SET Status = 'failed' 
           WHERE StripePaymentIntentId = @paymentIntentId`,
          { paymentIntentId: failedPayment.id }
        );
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        break;

      case 'charge.refunded':
        const charge = event.data.object;
        console.log(`💰 Refund processed for charge: ${charge.id}`);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ success: true, received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Webhook processing failed' 
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
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(transaction.CreatedAt).getTime()) / (1000 * 60 * 60 * 24)
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
