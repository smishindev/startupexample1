# Stripe Payment Integration Setup Guide

## Overview

This guide walks you through setting up Stripe payment processing for course purchases in the Mishin Learn Platform.

---

## Prerequisites

✅ Phase 1 completed (Email service, verification, billing fields, transaction tables, refund policy)  
✅ Stripe account created at [stripe.com](https://stripe.com)  
✅ SendGrid configured for transactional emails  
✅ Backend and frontend servers configured

---

## Step 1: Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and sign up
2. Complete business verification (required for live mode)
3. Navigate to **Developers → API Keys**
4. Copy your **Publishable Key** and **Secret Key**

### Test Mode vs Live Mode

- **Test Mode**: Use for development and testing
  - Test cards: `4242 4242 4242 4242` (Visa), `5555 5555 5555 4444` (Mastercard)
  - Any future expiration date, any CVC
- **Live Mode**: Use for production with real payments
  - Toggle in Stripe Dashboard top-right corner

---

## Step 2: Configure Environment Variables

### Backend (.env)

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your-secret-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# SendGrid (if not already configured)
SENDGRID_API_KEY=your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Frontend (.env)

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key-here
```

⚠️ **Important**: Never commit real API keys to version control!

---

## Step 3: Database Migration

The `StripeCustomerId` column has already been added to the Users table. Verify it exists:

```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'StripeCustomerId';
```

If not present, run:

```bash
sqlcmd -S localhost,61299 -d startUp1 -U mishin_learn_user -P "MishinLearn2024!" -i "database/add_stripe_customer_id.sql"
```

---

## Step 4: Configure Stripe Webhook

Webhooks notify your server about payment events (success, failure, refunds).

### Development (using Stripe CLI)

1. **Install Stripe CLI**:
   ```bash
   # Windows (using Scoop)
   scoop install stripe
   
   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`) to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production (Stripe Dashboard)

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your production URL: `https://yourdomain.com/api/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the **Signing secret** to production `.env`

---

## Step 5: Testing the Integration

### 1. Start Servers

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd client
npm run dev
```

**Terminal 3 - Stripe CLI** (Development only):
```bash
stripe listen --forward-to localhost:3001/api/payments/webhook
```

### 2. Test Purchase Flow

1. Navigate to `http://localhost:5173`
2. Login as a student
3. Browse courses at `/courses`
4. Click on a course → **Purchase Course** button
5. Fill in payment details:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - Name: Your name
6. Click **Pay $XX.XX**
7. Verify success page appears
8. Check email for purchase confirmation
9. Check database:
   ```sql
   SELECT * FROM Transactions WHERE Status = 'completed';
   SELECT * FROM Enrollments;
   SELECT * FROM Invoices;
   ```

### 3. Test Refund Flow

1. Go to `/profile/transactions`
2. Find a completed transaction
3. Click **Request Refund**
4. Enter reason
5. Submit request
6. Verify:
   - Transaction status changed to `refunded`
   - Enrollment status changed to `revoked`
   - Refund confirmation email received
   - Stripe Dashboard shows refund

### 4. Test Webhook Events

Monitor Stripe CLI output to see webhook events:
```bash
✓ payment_intent.succeeded
✓ charge.succeeded
✓ payment_intent.created
```

---

## Step 6: Verify Email Notifications

### Purchase Confirmation Email

Sent automatically after successful payment. Contains:
- Course title and details
- Purchase amount
- Transaction ID
- Receipt/invoice link
- Next steps

### Refund Confirmation Email

Sent automatically after refund processed. Contains:
- Refund amount
- Course title
- Refund reason
- Processing timeline

---

## API Endpoints

### Payment Endpoints

**POST** `/api/payments/create-payment-intent`  
Creates a Stripe Payment Intent for course purchase

**Request**:
```json
{
  "courseId": "uuid",
  "amount": 99.99,
  "currency": "usd"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
  }
}
```

**POST** `/api/payments/webhook`  
Stripe webhook handler (called by Stripe, not your frontend)

**GET** `/api/payments/transactions`  
Get user's transaction history

**GET** `/api/payments/transaction/:id`  
Get specific transaction details

**POST** `/api/payments/request-refund`  
Request a refund for a transaction

**Request**:
```json
{
  "transactionId": "uuid",
  "reason": "Not satisfied with course content"
}
```

---

## Frontend Routes

### Checkout Page
**Route**: `/checkout/:courseId`  
**Component**: `CourseCheckoutPage.tsx`  
**Purpose**: Stripe checkout form with Payment Element

### Success Page
**Route**: `/payment/success?courseId=:id`  
**Component**: `PaymentSuccessPage.tsx`  
**Purpose**: Post-payment confirmation and enrollment

### Transactions Page
**Route**: `/profile/transactions`  
**Component**: `TransactionsPage.tsx`  
**Purpose**: View purchase history and request refunds

---

## Security Best Practices

### ✅ Implemented

1. **Server-side validation**: All amount/price checks done on backend
2. **Webhook signature verification**: Prevents fake webhook attacks
3. **Secure credential storage**: API keys in environment variables
4. **PCI compliance**: No card data stored (handled by Stripe)
5. **HTTPS only**: Stripe requires HTTPS in production
6. **Authentication required**: All payment endpoints protected

### 🔐 Additional Recommendations

1. **Rate limiting**: Already configured in `server/index.ts`
2. **CSRF protection**: Available in `middleware/csrf.ts` (optional activation)
3. **SQL injection prevention**: Using parameterized queries
4. **XSS protection**: React escapes outputs by default

---

## Troubleshooting

### Issue: "STRIPE_SECRET_KEY is not configured"

**Solution**: Add `STRIPE_SECRET_KEY` to `server/.env`

### Issue: "Webhook signature verification failed"

**Solution**: 
1. Check `STRIPE_WEBHOOK_SECRET` in `.env`
2. Restart Stripe CLI: `stripe listen --forward-to localhost:3001/api/payments/webhook`
3. Copy new webhook secret to `.env`

### Issue: "Already enrolled in this course"

**Solution**: Payment intent creation checks for existing enrollment. This is expected behavior to prevent duplicate purchases.

### Issue: Payment succeeds but enrollment not created

**Solution**: 
1. Check webhook is configured correctly
2. Verify `payment_intent.succeeded` event is being received
3. Check server logs for errors
4. Manually verify database: `SELECT * FROM Enrollments WHERE UserId = 'xxx'`

### Issue: Test card declined

**Solution**: 
- Use `4242 4242 4242 4242` for successful test payments
- Use `4000 0000 0000 0002` for declined test payments
- Use `4000 0000 0000 9995` for insufficient funds test

---

## Refund Policy Implementation

### Automatic Calculation

Refund amounts are calculated automatically based on course completion:

- **< 50% completed**: Full refund (100%)
- **50-75% completed**: 50% refund
- **75-100% completed**: 25% refund

### Time Window

- Refunds allowed within **30 days** of purchase
- Beyond 30 days: No refunds available

### Access Revocation

When a refund is processed:
1. Transaction status → `refunded`
2. Enrollment status → `revoked`
3. Course access removed immediately
4. Email notification sent

---

## Production Checklist

Before going live, complete these steps:

- [ ] Switch Stripe to **Live Mode**
- [ ] Update environment variables with live API keys
- [ ] Configure production webhook URL
- [ ] Test with real payment method (small amount)
- [ ] Verify email notifications work
- [ ] Enable HTTPS on your domain
- [ ] Review Stripe Dashboard settings
- [ ] Set up automatic payout schedule
- [ ] Configure tax settings (if applicable)
- [ ] Review and customize refund policy
- [ ] Test refund flow in production
- [ ] Monitor first 10 transactions closely

---

## Monitoring & Analytics

### Stripe Dashboard

Monitor:
- Payment success rate
- Failed payments
- Refund rate
- Revenue analytics
- Customer lifetime value

### Database Queries

**Total Revenue**:
```sql
SELECT 
  SUM(Amount) as TotalRevenue,
  Currency
FROM Transactions 
WHERE Status = 'completed'
GROUP BY Currency;
```

**Refund Rate**:
```sql
SELECT 
  COUNT(CASE WHEN Status = 'refunded' THEN 1 END) * 100.0 / COUNT(*) as RefundRate
FROM Transactions
WHERE Status IN ('completed', 'refunded');
```

**Popular Courses**:
```sql
SELECT 
  c.Title,
  COUNT(t.Id) as PurchaseCount,
  SUM(t.Amount) as Revenue
FROM Transactions t
JOIN Courses c ON t.CourseId = c.Id
WHERE t.Status = 'completed'
GROUP BY c.Title
ORDER BY PurchaseCount DESC;
```

---

## Support & Resources

### Stripe Documentation
- [Stripe API Docs](https://stripe.com/docs/api)
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

### Platform Documentation
- `REFUND_POLICY.md` - Full refund policy details
- `PAYMENT_IMPLEMENTATION_SUMMARY.md` - Phase 1 details
- `PROJECT_STATUS.md` - Overall project status

### Get Help
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)
- Stripe Community: [https://discord.gg/stripe](https://discord.gg/stripe)

---

## Next Steps

After successful Stripe integration:

1. **Invoice PDF Generation**: Implement PDF generation for invoices
2. **Subscription Support**: Add recurring payment options
3. **Multiple Currencies**: Support international currencies
4. **Coupons/Discounts**: Implement promotional codes
5. **Payment Plans**: Add installment payment options
6. **Analytics Dashboard**: Build instructor revenue analytics
7. **Affiliate System**: Track referral commissions

---

**✅ Stripe Integration Complete!**

You now have a fully functional payment system with:
- Secure payment processing
- Automated enrollment
- Refund management
- Email notifications
- Transaction tracking
- Webhook handling

Test thoroughly before going live! 🚀
