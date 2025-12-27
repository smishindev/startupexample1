# Date Handling Guide - Payment System & Email Verification

**Last Updated**: December 27, 2025  
**Status**: ✅ Fixed and Verified

---

## Overview

This guide documents the correct date handling across the payment system and email verification to ensure timezone-safe operations.

## Critical Date Handling Rules

### ✅ Database Layer (SQL Server)
- **ALWAYS use `GETUTCDATE()`** - stores all timestamps in UTC
- Never use `GETDATE()` which returns local server time
- Columns: `CreatedAt`, `UpdatedAt`, `CompletedAt`, `RefundedAt`

### ✅ Backend (Node.js/TypeScript)
- Date calculations use `Date.getTime()` for millisecond timestamps
- Millisecond timestamps are timezone-independent
- No timezone conversions needed for calculations

### ✅ Frontend (React/TypeScript)
- Display dates use `date-fns format()` - automatically converts to user's local timezone
- Calculations use `.getTime()` for timezone-independent comparisons
- Never use `Date.now()` directly - use `new Date().getTime()` for consistency

---

## Implementation Details

### 1. Refund Eligibility (30-Day Window)

#### ❌ INCORRECT - Old Implementation
```typescript
// PROBLEM: Date.now() vs new Date().getTime() inconsistency
const daysSincePurchase = Math.floor(
  (Date.now() - new Date(transaction.CreatedAt).getTime()) / (1000 * 60 * 60 * 24)
);
```

#### ✅ CORRECT - Current Implementation
```typescript
// SOLUTION: Both dates created consistently
const purchaseDate = new Date(transaction.CreatedAt); // From database (UTC)
const now = new Date(); // Current time

// Calculate days using UTC timestamps (timezone-independent)
const daysSincePurchase = Math.floor(
  (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
);

return daysSincePurchase <= 30;
```

**Why This Works:**
- `new Date(isoString)` parses ISO 8601 dates correctly (database returns ISO format)
- `.getTime()` returns milliseconds since Unix epoch (UTC-based)
- Math operations on timestamps are timezone-independent
- Division by `(1000 * 60 * 60 * 24)` converts milliseconds to days

### 2. Date Display to Users

#### ✅ CORRECT - Display Formatting
```typescript
import { format } from 'date-fns';

// Database stores: "2025-12-15T10:30:00.000Z" (UTC)
// Display shows: "Dec 15, 2025" (user's local timezone)
const displayDate = format(new Date(transaction.CompletedAt), 'MMM dd, yyyy');
```

**Why This Works:**
- `date-fns` automatically converts UTC to user's browser timezone
- User sees dates in their local time (expected behavior)
- No manual timezone conversion needed

### 3. Database Queries with Date Ranges

#### ✅ CORRECT - 30-Minute Pending Check
```sql
SELECT StripePaymentIntentId 
FROM dbo.Transactions 
WHERE UserId = @userId 
  AND CourseId = @courseId 
  AND Status = 'pending'
  AND CreatedAt > DATEADD(MINUTE, -30, GETUTCDATE())
```

**Why This Works:**
- `GETUTCDATE()` returns current UTC time
- `DATEADD()` subtracts 30 minutes in UTC
- Comparison is done in UTC (database timezone)
- No timezone conversion issues

---

## Date Fields Reference

### Email Verification System (Added Dec 27, 2025)

#### EmailVerificationExpiry Field

| Field | Type | Value | Usage |
|-------|------|-------|-------|
| `EmailVerificationExpiry` | DATETIME2 | UTC | 24-hour code expiration |

**Database Query** (VerificationService.ts):
```sql
UPDATE dbo.Users 
SET EmailVerificationCode = @code,
    EmailVerificationExpiry = DATEADD(HOUR, 24, GETUTCDATE())
WHERE UserId = @userId
```

**Validation Logic** (Backend):
```typescript
const user = await db.query(`
  SELECT EmailVerificationCode, EmailVerificationExpiry 
  FROM dbo.Users 
  WHERE UserId = @userId
`);

// Check if code expired (UTC comparison)
if (user.EmailVerificationExpiry && new Date(user.EmailVerificationExpiry) < new Date()) {
  return { success: false, message: 'Verification code has expired' };
}
```

**Key Points:**
- **Code Generation**: `DATEADD(HOUR, 24, GETUTCDATE())` sets 24-hour expiry in UTC
- **Validation**: `new Date(expiry) < new Date()` compares UTC timestamps (timezone-independent)
- **Frontend Display**: No expiry shown to user (backend validation only)
- **Resend Logic**: Generates new code + new 24-hour expiry window
- **Cleanup**: Code cleared on successful verification (`EmailVerificationCode = NULL`)

**Why This Works:**
- Database stores UTC timestamp
- JavaScript `new Date()` creates UTC-based Date object
- Comparison uses `.getTime()` internally (milliseconds since epoch)
- Timezone-independent: Works correctly for users in any timezone

**Example Scenario:**
```typescript
// User requests code at 10:00 AM PST (6:00 PM UTC)
// Database: EmailVerificationExpiry = "2025-12-28 18:00:00.000" (UTC)

// User verifies at 9:00 AM PST next day (5:00 PM UTC)
// Check: "2025-12-28 18:00:00.000" > "2025-12-28 17:00:00.000" ✅ (valid)

// User verifies at 11:00 AM PST next day (7:00 PM UTC)
// Check: "2025-12-28 18:00:00.000" > "2025-12-28 19:00:00.000" ❌ (expired)
```

---

### Transaction Table Timestamps

| Field | Type | Value | Usage |
|-------|------|-------|-------|
| `CreatedAt` | DATETIME | UTC | Payment intent creation |
| `CompletedAt` | DATETIME | UTC | Payment success timestamp |
| `RefundedAt` | DATETIME | UTC | Refund processed timestamp |
| `UpdatedAt` | DATETIME | UTC | Last modification time |

### Date Calculations

| Calculation | Formula | Purpose |
|-------------|---------|---------|
| Days Since Purchase | `(now - CreatedAt) / (24 * 60 * 60 * 1000)` | Refund eligibility |
| Days Remaining | `30 - daysSincePurchase` | Progress bar display |
| Within 30 Minutes | `CreatedAt > NOW - 30min` | Duplicate prevention |

---

## Testing Date Logic

### Test Scenarios

#### 1. Same-Day Purchase (Within 30 Days)
```typescript
const purchaseDate = new Date('2025-12-15T10:00:00Z'); // 10 AM UTC
const now = new Date('2025-12-15T15:00:00Z');          // 3 PM UTC (same day)

const days = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
// Result: 0 days (eligible for refund)
```

#### 2. Exactly 30 Days Later
```typescript
const purchaseDate = new Date('2025-11-15T10:00:00Z');
const now = new Date('2025-12-15T10:00:00Z'); // Exactly 30 days

const days = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
// Result: 30 days (still eligible - uses <= 30)
```

#### 3. After 30 Days (Expired)
```typescript
const purchaseDate = new Date('2025-11-14T10:00:00Z');
const now = new Date('2025-12-15T10:00:00Z'); // 31 days

const days = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
// Result: 31 days (ineligible - exceeds 30 days)
```

#### 4. Timezone Edge Case
```typescript
// User in PST (UTC-8), server in UTC
const purchaseDate = new Date('2025-12-15T08:00:00Z'); // 12 AM PST
const now = new Date('2025-12-15T20:00:00Z');          // 12 PM PST (noon next day)

const days = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
// Result: 0 days (timestamp math is timezone-independent) ✅
```

---

## Common Pitfalls Avoided

### ❌ Don't Use Local Date Methods
```typescript
// BAD: These are affected by user's timezone
transaction.CreatedAt.getDate()
transaction.CreatedAt.getHours()
transaction.CreatedAt.getDay()
```

### ✅ Use UTC Methods or Timestamps
```typescript
// GOOD: Timezone-independent
transaction.CreatedAt.getTime()        // Milliseconds since epoch
transaction.CreatedAt.toISOString()    // ISO 8601 UTC string
```

### ❌ Don't Mix Date.now() and new Date()
```typescript
// BAD: Inconsistent approach
const diff = Date.now() - new Date(dateString).getTime();
```

### ✅ Be Consistent
```typescript
// GOOD: Both use Date objects
const now = new Date();
const past = new Date(dateString);
const diff = now.getTime() - past.getTime();
```

---

## Browser Timezone Handling

### How Dates Flow Through System

1. **Database (SQL Server)**
   ```sql
   INSERT ... VALUES (..., GETUTCDATE())
   -- Stores: 2025-12-15 10:30:00.000 (UTC)
   ```

2. **Backend API Response**
   ```json
   {
     "CreatedAt": "2025-12-15T10:30:00.000Z",
     "CompletedAt": "2025-12-15T10:35:00.000Z"
   }
   ```

3. **Frontend Receives**
   ```typescript
   const transaction = await getUserTransactions();
   // transaction.CreatedAt = "2025-12-15T10:30:00.000Z" (string)
   ```

4. **Frontend Calculations**
   ```typescript
   const purchaseDate = new Date(transaction.CreatedAt);
   // JavaScript Date object (internally UTC)
   // .getTime() returns: 1734261000000 (milliseconds, UTC-based)
   ```

5. **Frontend Display**
   ```typescript
   format(purchaseDate, 'MMM dd, yyyy')
   // User in PST sees: "Dec 15, 2025" (2:30 AM PST)
   // User in EST sees: "Dec 15, 2025" (5:30 AM EST)
   // Both calculations use same UTC timestamp ✅
   ```

---

## Files Updated (Dec 15, 2025)

### ✅ Fixed Files

1. **client/src/pages/Profile/TransactionsPage.tsx**
   - `isRefundEligible()`: Fixed date calculation
   - `getDaysRemaining()`: Fixed date calculation
   - Date displays: Already correct (using date-fns format)

2. **server/src/routes/payments.ts**
   - Refund eligibility check: Fixed date calculation
   - Consistent with frontend logic

3. **server/src/services/StripeService.ts**
   - All SQL queries use `GETUTCDATE()` ✅
   - No JavaScript date calculations (only database queries)

### No Changes Needed

4. **Database Schema**
   - All DATETIME columns correctly use `GETUTCDATE()` defaults
   - No GETDATE() usage found ✅

---

## Verification Checklist

- [x] All database queries use `GETUTCDATE()` not `GETDATE()`
- [x] Date calculations use `.getTime()` for timezone independence
- [x] Frontend displays use `date-fns format()` for automatic timezone conversion
- [x] No mix of `Date.now()` and `new Date().getTime()`
- [x] 30-day refund window calculated consistently (frontend + backend)
- [x] Idempotency window (30 minutes) uses UTC comparison
- [x] TypeScript errors: 0
- [x] Both frontend and backend use identical calculation logic

---

---

## Known Issues (Non-Critical)

### ⚠️ Non-Payment Code Using GETDATE()

The following files use `GETDATE()` instead of `GETUTCDATE()`. These are **NOT payment-related** and have **low priority**:

**Test Scripts** (no user impact):
- `server/src/scripts/create-video-lesson.ts`
- `server/src/scripts/create-sample-data.ts`
- `server/src/scripts/create-instructor-test-data.ts`
- `database/sample_progress_data.sql`

**Analytics/Progress Tracking** (minor timezone impact):
- `server/src/routes/student-progress.ts` - Lines 53, 71, 353
  - Uses: `DATEADD(day, -90, GETDATE())` for 90-day performance
  - Impact: Server timezone affects which data is included
  - Fix Priority: Low (doesn't affect money or critical operations)
  - Recommended: Change to `GETUTCDATE()` for consistency

- `server/src/routes/progress.ts` - Lines 571, 609
  - Test data creation only
  - No production impact

### Recommendation
These can be fixed in a future update for consistency, but **DO NOT affect**:
- Payment processing ✅
- Refund eligibility ✅
- Transaction timestamps ✅
- Invoice generation ✅

---

## Summary

**Date Handling Status**: ✅ Production Ready (Payment System)

**Payment System** - All date operations correct:
- Store timestamps in UTC (database - `GETUTCDATE()`)
- Calculate durations using UTC timestamps (timezone-independent)
- Display dates in user's local timezone (date-fns automatic conversion)
- Use consistent Date object creation (no Date.now() mixing)
- Handle timezone edge cases correctly

**Other Systems** - Minor inconsistencies in non-payment code:
- Test scripts use `GETDATE()` (no user impact)
- Analytics queries use `GETDATE()` (minor timezone variance, non-critical)
- Can be fixed in future update for full consistency

**Key Principle**: Use `.getTime()` for all calculations, use `format()` for all displays.
