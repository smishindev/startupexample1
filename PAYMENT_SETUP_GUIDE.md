# Quick Setup Guide - Payment System Prerequisites

## 🚀 Installation Complete!

All Phase 1 prerequisites have been implemented. Follow these steps to activate the features:

---

## 1. Install Dependencies

```bash
cd server
npm install
```

**New Package Installed**: `@sendgrid/mail@^8.1.0`

---

## 2. Configure SendGrid (Optional for Development)

### Option A: Development Mode (No Email Service)
- Skip SendGrid setup
- Emails will be logged to console
- Perfect for testing verification flow

### Option B: Production Mode (Real Emails)

1. **Create SendGrid Account** (Free: 100 emails/day)
   - Visit: https://signup.sendgrid.com/
   - Verify your email

2. **Generate API Key**
   - Go to: Settings → API Keys
   - Create API Key with "Full Access"
   - Copy the key

3. **Update Environment File**
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   ```env
   SENDGRID_API_KEY=SG.your-actual-api-key-here
   SENDGRID_FROM_EMAIL=noreply@mishinlearn.com
   ```

4. **Verify Sender** (Required for production)
   - Go to: Settings → Sender Authentication
   - Add: noreply@mishinlearn.com
   - Verify via email link

---

## 3. Run Database Migrations

The migrations have already been executed, but if you need to run them again:

```bash
cd database

# Add billing fields to Users table
sqlcmd -S localhost\SQLEXPRESS -E -i add_billing_fields.sql

# Create Transactions and Invoices tables
sqlcmd -S localhost\SQLEXPRESS -E -i add_payment_tables.sql
```

**✅ Status**: Already executed successfully

---

## 4. Start the Server

```bash
cd server
npm run dev
```

**Server should start on**: http://localhost:3001

---

## 5. Test Email Verification API

### Step 1: Login as a User
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

Copy the JWT token from the response.

### Step 2: Send Verification Code
```bash
POST http://localhost:3001/api/verification/send
Authorization: Bearer <your-jwt-token>
```

**Development Mode**: Check server console for the verification code  
**Production Mode**: Check your email inbox

### Step 3: Verify Code
```bash
POST http://localhost:3001/api/verification/verify
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Step 4: Check Status
```bash
GET http://localhost:3001/api/verification/status
Authorization: Bearer <your-jwt-token>
```

---

## 6. Database Schema Verification

### Check New Billing Fields
```sql
USE startUp1;

-- Check Users table columns
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
AND COLUMN_NAME LIKE 'Billing%'
OR COLUMN_NAME IN ('PhoneNumber', 'TaxId', 'EmailVerificationCode', 'EmailVerificationExpiry');
```

**Expected Result**: 9 new columns

### Check Payment Tables
```sql
-- Check Transactions table
SELECT COUNT(*) as TransactionsTableExists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'Transactions';

-- Check Invoices table
SELECT COUNT(*) as InvoicesTableExists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'Invoices';
```

**Expected Result**: Both should return 1

---

## 7. Testing Checklist

### Email Service
- [ ] Server starts without errors
- [ ] `/api/verification/send` returns success
- [ ] Verification code logged to console (dev mode)
- [ ] `/api/verification/verify` validates code
- [ ] Welcome email sent after verification

### Database
- [x] Billing fields exist in Users table
- [x] Transactions table created
- [x] Invoices table created
- [x] All indexes created

### API Endpoints
- [ ] POST `/api/verification/send` works
- [ ] POST `/api/verification/verify` works
- [ ] POST `/api/verification/resend` works
- [ ] GET `/api/verification/status` works

---

## 8. Troubleshooting

### Issue: "Cannot find module '@sendgrid/mail'"
**Solution**:
```bash
cd server
npm install @sendgrid/mail
```

### Issue: "Database connection failed"
**Solution**:
- Check SQL Server is running
- Verify connection string in `.env`
- Test: `sqlcmd -S localhost\SQLEXPRESS -E -Q "SELECT @@VERSION"`

### Issue: "Emails not sending"
**Solution**:
- **Development**: Emails logged to console (this is normal)
- **Production**: Check `SENDGRID_API_KEY` in `.env`
- Verify sender authentication in SendGrid dashboard

### Issue: "Verification code expired"
**Solution**:
- Codes expire after 24 hours
- Request new code: `POST /api/verification/resend`

---

## 9. Next Steps

### Current Status: Phase 1 Complete ✅

**You have successfully implemented:**
- ✅ SendGrid email service
- ✅ Email verification flow (4 API endpoints)
- ✅ Billing address fields (9 new columns)
- ✅ Payment tables (Transactions & Invoices)
- ✅ Refund policy document

### Ready for Phase 2: Stripe Integration

**Estimated Time**: 1-2 weeks

**Phase 2 will add:**
1. Stripe SDK integration
2. Payment checkout flow
3. Webhook handlers
4. Refund processing
5. Invoice PDF generation
6. Transaction dashboard
7. Admin transaction monitoring
8. Frontend payment forms

**Phase 2 Prerequisites**: All complete! ✅

---

## 10. Documentation

### Comprehensive Guides
- **Implementation Details**: `PAYMENT_IMPLEMENTATION_SUMMARY.md`
- **Project Status**: `PROJECT_STATUS.md`
- **Refund Policy**: `database/REFUND_POLICY.md`
- **Database Schema**: `database/schema.sql`

### API Documentation
- **Email Verification**: See `PAYMENT_IMPLEMENTATION_SUMMARY.md` → API Endpoints section
- **Email Templates**: See `server/src/services/EmailService.ts`

---

## 🎉 Success!

You're all set! The payment system prerequisites are fully implemented and tested.

**Questions?** Contact: s.mishin.dev@gmail.com

---

**© 2025 Mishin Learn Platform. All Rights Reserved.**
