# Mishin Learn Platform - System Architecture

**Last Updated**: January 29, 2026 - Comments System Bug Fixes ✅  
**Purpose**: Understanding system components, data flows, and dependencies

---

## 🏗️ SYSTEM OVERVIEW

### Tech Stack
```
Frontend: React 18 + TypeScript + Material-UI + Vite
Backend: Node.js + Express + TypeScript
Database: SQL Server (SQLEXPRESS)
Real-time: Socket.io
State: Zustand (auth), React state (components)
```

### Server Ports
- **Backend API**: `http://localhost:3001`
- **Frontend Dev**: `http://localhost:5173`
- **NEVER CHANGE THESE** - CORS configured for these exact ports

---

## 🔌 API ENDPOINTS

### Instructor Course Management (updated Jan 14, 2026)
```
GET    /api/instructor/courses         - Get instructor's courses with pagination
                                        - Query params: status (all/published/draft), page, limit
                                        - Returns: { courses: [], pagination: {} }
                                        - Level field: lowercase 'level'

POST   /api/instructor/courses         - Create new course
                                        - Validates & normalizes level to lowercase
                                        - Validates & maps category to database enum
                                        - Returns: { id, message, status }

PUT    /api/instructor/courses/:id     - Update course details
                                        - Validates ownership (instructor can only edit own courses)
                                        - Dynamic updates (only changed fields)
                                        - Normalizes level to lowercase
                                        - Maps category names to database values
                                        - Returns: { message, courseId }

GET    /api/instructor/stats           - Get instructor dashboard statistics
GET    /api/instructor/courses/:id/students - Get students enrolled in course
```

**Level Field Normalization (Critical Fix - Jan 14, 2026):**
- **Database**: Stores lowercase (beginner, intermediate, advanced, expert)
- **API Responses**: All GET endpoints normalize to lowercase `level` property
- **API Inputs**: All POST/PUT validate and lowercase before saving
- **Frontend**: Expects lowercase, uses `.toLowerCase()` for safety
- **Validation**: Invalid levels default to 'beginner'

**Category Mapping:**
- Frontend displays: "Web Development", "Data Science", "Mathematics", etc.
- Database stores: 'programming', 'data_science', 'mathematics', etc.
- Backend maps user-friendly names to database enums
- 10 valid categories: programming, data_science, design, business, marketing, language, mathematics, science, arts, other

### Profile Management (added Dec 11, 2025)
```
GET    /api/profile                    - Get user profile
PUT    /api/profile/personal-info      - Update name, username, learning style
PUT    /api/profile/billing-address    - Update billing address
PUT    /api/profile/password           - Change password (requires current) + sends security notification
PUT    /api/profile/avatar             - Update avatar URL
POST   /api/profile/avatar/upload      - Upload avatar (multer + sharp)
PUT    /api/profile/preferences        - Update notification preferences

GET    /api/notifications/preferences  - Get notification preferences
PATCH  /api/notifications/preferences  - Update notification preferences

GET    /api/settings                   - Get user settings
PATCH  /api/settings                   - Update settings (privacy + appearance)
POST   /api/settings/export-data       - Request data export (TODO)
DELETE /api/account-deletion/delete    - Delete account with course management (Jan 19, 2026)
```

**Account Deletion Flow (Added Jan 18-19, 2026):**
```
Settings Page → Privacy & Security → Delete Account Button
  ↓
InstructorDeletionDialog (if instructor role)
  ├─ Select course action: Archive / Transfer / Force Delete
  ├─ If Transfer: Select target instructor from dropdown
  └─ Password confirmation required
  ↓
accountDeletionApi.deleteAccount({ instructorAction, transferToInstructorId, password })
  ↓
Backend AccountDeletionService:
  ├─ Verify password
  ├─ Execute course action (archive/transfer/force)
  ├─ Send critical emails (always, bypass preferences):
  │   ├─ Account deletion confirmation to user
  │   ├─ Course transfer notification to students
  │   ├─ Course archive notification to students
  │   └─ Course deletion warning to students
  ├─ Soft-delete user (Status='deleted')
  ├─ Log in AccountDeletionLog
  └─ Commit transaction or rollback on error
  ↓
Frontend: Logout, navigate to login, show success message

Note: Account deletion emails are security-critical and always sent,
regardless of user notification preferences.
```

### Comments & Discussion (added Jan 25, updated Jan 29, 2026)
```
GET    /api/comments/:entityType/:entityId  - Get comments with pagination
POST   /api/comments                        - Create comment or reply
PUT    /api/comments/:commentId             - Update comment (5-min window)
DELETE /api/comments/:commentId             - Delete comment (soft delete)
POST   /api/comments/:commentId/like        - Toggle like on comment

Socket.IO Events:
  Client → Server: comment:subscribe, comment:unsubscribe
  Server → Client: comment:created, comment:updated, comment:deleted, comment:liked
```

**Comments System Architecture:**
- **Entity-Agnostic Design**: Works with lessons, courses, assignments, announcements
- **Threading**: One-level replies (comment → reply, no nested replies)
- **Real-time Updates**: Socket.IO rooms per entity (`comments:entityType:entityId`)
- **Access Control**: Enrollment-based (must be enrolled to view/post)
- **Optimistic Updates**: UI updates immediately, confirmed by Socket.IO
- **React StrictMode Fix** (Jan 29): handlersRef pattern prevents duplicate subscriptions
- **No Count Display** (Jan 29): Removed totalCount to eliminate synchronization complexity
- **Tables**: Comments (main), CommentLikes (many-to-many)
- **Indexes**: 6 total (entity lookup, parent lookup, user comments, likes, active filter)
- **Denormalization**: LikesCount, RepliesCount for performance
- **Security**: Enrollment check, owner verification, moderator override (instructors)
- **Notifications**: Integrated with reply notifications (EnableReplies preference)

**Bug Fixes (Jan 29, 2026):**
- Fixed React StrictMode double-mount causing duplicate Socket.IO subscriptions
- Implemented atomic state updates to prevent race conditions
- Removed totalCount display and all increment/decrement logic

**Settings Implementation Status (Verified Jan 10, 2026):**
- **Privacy Settings**: ✅ Fully enforced across 8+ endpoints
  - ProfileVisibility (public/students/private) - enforced in profile viewing
  - ShowEmail - enforced in 7 endpoints with instructor override
  - ShowProgress - enforced with 403 errors for private progress
  - AllowMessages - stored but not enforced (chat disabled)
- **Appearance Settings**: ⚠️ Stored in DB but NOT applied to UI
  - Theme/Language/FontSize save correctly but don't change frontend

### Email Verification (added Dec 27, 2025)
```
POST   /api/verification/send          - Send 6-digit verification code to user email
POST   /api/verification/verify        - Verify code provided by user
POST   /api/verification/resend        - Resend verification code
GET    /api/verification/status        - Check verification status

All endpoints require JWT authentication (authenticateToken middleware)
```

**Email Verification Details:**
- **Code Generation**: 6-digit random number (100000-999999)
- **Storage**: EmailVerificationCode (NVARCHAR 10), EmailVerificationExpiry (DATETIME2) in Users table
- **Expiry**: 24 hours from code generation
- **Email Service**: Gmail SMTP via Nodemailer
- **Templates**: HTML emails with purple gradient header, professional styling
- **Welcome Email**: Sent automatically after successful verification
- **Security**: Codes are one-time use, cleared after verification
- **Validation**: Code match check, expiry check, already verified check

**Frontend Integration:**
- verificationApi.ts service with 4 methods
- EmailVerificationPage (/verify-email) standalone page
- EmailVerificationBanner in DashboardLayout
- Profile badge integration (clickable for unverified)

### Relative Timestamp Auto-Update (added Jan 12, 2026)

**Pattern for Auto-Updating "X minutes ago" Displays:**

All components displaying relative timestamps using `formatDistanceToNow` implement a 60-second auto-update timer:

```typescript
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

// Component setup
const [, setCurrentTime] = useState(Date.now()); // Trigger re-renders

// Auto-update every 60 seconds
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(Date.now());
  }, 60000);
  return () => clearInterval(interval); // Cleanup
}, []);

// Display (re-calculates on each render)
{formatDistanceToNow(new Date(utcTimestamp), { addSuffix: true })}
```

**Components Using This Pattern:**
- Office Hours: [QueueDisplay.tsx](client/src/components/OfficeHours/QueueDisplay.tsx)
- Notifications: [NotificationsPage.tsx](client/src/pages/Notifications/NotificationsPage.tsx)
- Notification Bell: [NotificationBell.tsx](client/src/components/Notifications/NotificationBell.tsx)
- Chat: [Chat.tsx](client/src/pages/Chat/Chat.tsx)
- AI Tutoring: [Tutoring.tsx](client/src/pages/Tutoring/Tutoring.tsx)
- My Learning: [MyLearningPage.tsx](client/src/pages/Learning/MyLearningPage.tsx)

**Why This Works:**
- `Date.now()` change forces component re-render
- `formatDistanceToNow` recalculates on each render
- UTC timestamps from DB auto-convert to user's local time
- No additional API calls needed
- Cleanup prevents memory leaks
- Registration dialog with verification prompt
- authStore.updateEmailVerified() for state management

### Email Notifications (added Dec 28-29, 2025)
```
GET    /api/notifications/preferences  - Get notification preferences
PATCH  /api/notifications/preferences  - Update notification preferences
GET    /api/email-analytics/stats      - Get email tracking statistics
POST   /api/email-unsubscribe/verify   - Verify unsubscribe token
POST   /api/email-unsubscribe/confirm  - Confirm unsubscribe
POST   /api/email-unsubscribe/resubscribe - Resubscribe to emails
```

**Email System (Phases 1-3 Complete):**
- **Realtime Delivery**: Sends emails immediately based on notification triggers
- **Daily Digest**: Cron job at 8 AM UTC aggregates previous day's notifications
- **Weekly Digest**: Cron job Monday 8 AM UTC aggregates previous week's notifications
- **Email Tracking**: Opens (1x1 pixel), Clicks (wrapped URLs), Analytics service
- **Unsubscribe**: One-click token-based unsubscribe with database tracking
- **Templates**: Beautiful HTML emails with type-specific styling (progress, course, system, social, assessment)

**Socket.IO Architecture (Updated February 2, 2026):**
- **Emission Pattern**: ALL socket events emit exclusively from route handlers
- **Service Layer**: Pure data operations, NO socket emissions
- **Broadcasting**: Global `io.emit()` strategy (not room-based)
- **Event Types**: 20+ unique events across features
- **Critical Fix**: Removed duplicate emissions from all service classes
- **Example**: Study Groups emits 6 events (member-joined, member-left, member-promoted, member-removed, group-created, group-deleted)
- **Pattern**: Routes get `io` instance from `req.app.get('io')`, emit after successful DB operation
- **Services**: Return data only, add comment `// Note: Socket event is emitted in the route handler, not here`

**Notification Triggers (22/31 Active - February 2, 2026):**
- ✅ **Lesson Completion**: Student progress update + instructor milestones (25%, 50%, 75%, 100%) - Dec 29, 2025
- ✅ **Video Completion**: Student completion notification - Jan 8, 2026
- ✅ **Course Completion**: Student achievement celebration - Jan 15, 2026
- ✅ **Live Session Created**: All enrolled students notified with session details - Pre-existing
- ✅ **Live Session Updated**: Students notified of changes - Jan 6, 2026
- ✅ **Live Session Deleted**: Students notified of cancellation - Jan 6, 2026
- ✅ **Course Enrollment**: Welcome message to student + enrollment alert to instructor - Jan 11, 2026
- ✅ **New Lesson Created**: All enrolled students (active + completed) notified - Jan 11, 2026
- ✅ **Course Published**: All enrolled students (active + completed) notified - Jan 11, 2026
- ✅ **Assessment Created**: Students notified of new assessment - Jan 11, 2026
- ✅ **Assessment Submitted**: Instructor notified of student submission - Jan 11, 2026
- ✅ **Assessment Graded**: Student notified of grade - Jan 11, 2026
- ✅ **Office Hours Completed**: Student notified with session duration - Jan 17, 2026
- ✅ **Payment Receipt**: Instant confirmation after successful payment - Jan 17, 2026
- ✅ **Refund Confirmation**: Notification when refund is processed - Jan 17, 2026
- ✅ **Password Changed**: Security alert sent to user - Jan 17, 2026
- ✅ **Assessment Due Reminders**: Daily cron job (9 AM UTC) checks for assessments due in 2 days - Jan 20, 2026
- ✅ **Weekly Progress Summary**: Weekly cron job (Monday 8 AM UTC) sends activity summaries - Jan 21, 2026
- ✅ **Study Group Invitation**: Member invites user to join group - Jan 21, 2026
- ✅ **Study Group Member Joined**: All existing members notified when someone joins - Jan 21, 2026
- ✅ **Study Group Member Promoted**: User promoted to admin role with management permissions - Feb 2, 2026
- 🔜 **10 Remaining**: Direct messages, certificates, badges, interventions, etc.

**Implementation Pattern:**
```typescript
// Backend route (e.g., lessons.ts, enrollment.ts)
const io = req.app.get('io'); // Get Socket.io instance
const notificationService = new NotificationService(io);

await notificationService.createNotificationWithControls(
  {
    userId,
    type: 'course',
    priority: 'normal',
    title: 'New Lesson Available!',
    message: `New lesson added to "${courseTitle}": ${lessonTitle}`,
    actionUrl: `/courses/${courseId}`,
    actionText: 'Check it Out'
  },
  {
    category: 'course',
    subcategory: 'NewLessons'
  }
);
```

**Automated Cron Schedulers (Added Jan 20-21, 2026):**
```typescript
// server/src/services/NotificationScheduler.ts
// Initialized in server/src/index.ts after Socket.io setup

1. Assessment Due Date Reminders - Daily at 9:00 AM UTC
   - Cron: '0 9 * * *'
   - Query: getUpcomingAssessmentsDue(2) from NotificationHelpers
   - Finds: Assessments due in 2 days without completed submissions
   - Creates: Type='assignment', Priority='urgent', Category='assessment'
   - Message: "\u23f0 Assessment Due Soon: [title] is due in 2 days"
   - Non-blocking: Continues on per-user errors
   - Manual Test: POST /api/notifications/test-assessment-reminders (instructor/admin)

2. Weekly Progress Summary - Monday at 8:00 AM UTC
   - Cron: '0 8 * * 1'
   - Query: getWeeklyActivitySummaries() from NotificationHelpers
   - Aggregates: Past 7 days activity (lessons, videos, assessments, time, courses)
   - Creates: Type='progress', Priority='normal', Category='progress'
   - Message: Multi-line with emojis (\u2705 lessons, \ud83c\udfac videos, \ud83d\udcdd assessments, \u23f1\ufe0f time, \ud83d\udcda courses)
   - Only sends: To students with activity in past 7 days
   - Manual Test: POST /api/notifications/test-weekly-summary (instructor/admin)

Scheduler Features:
- Double initialization protection (returns early if already running)
- Console logging for job registration and execution
- Success/failure counters for monitoring
- Socket.io integration for real-time delivery
- Exported trigger functions for API testing
```

**Real-time Updates:**
- Socket.io emits to user-specific rooms: `io.to(\`user-${userId}\`).emit('notification-created', {...})`
- Frontend NotificationBell listens and updates count instantly
- Cross-tab synchronization via socket events
- **Single Socket Connection**: Managed by App.tsx, components register via callbacks
- **Callback Lifecycle**: connectCallbacks[] and disconnectCallbacks[] arrays for proper cleanup

### Payment & Billing (added Dec 11, updated Dec 14, 2025)
```
POST   /api/payments/create-payment-intent       - Create Stripe payment intent
POST   /api/payments/webhook                     - Stripe webhook events
POST   /api/payments/confirm-enrollment          - Confirm enrollment after payment (with security validation)
GET    /api/payments/transactions                - Get user transaction history
POST   /api/payments/request-refund              - Request refund for transaction
GET    /api/payments/transaction/:id             - Get transaction details
GET    /api/payments/invoice/:invoiceId/download - Download invoice PDF (secure, ownership verified)
POST   /api/payments/test-complete               - DEV ONLY: Complete test payment without webhook
```

**Payment Security Details:**
- `/confirm-enrollment` validates completed transaction exists before creating enrollment
- Checks: `Status = 'completed'`, `UserId` match, course ownership
- Prevents free enrollment via URL manipulation
- Returns 403 Forbidden if no valid payment found
- Logs security warnings for unauthorized attempts

**Stripe Integration:**
- Test mode with test keys
- Payment intents for checkout flow
- Customer management (create/retrieve)
- Webhook processing for payment events
- Refund processing with progress-based calculations

**Invoice PDF Generation (Phase 3 - Dec 14, 2025):**
- PDFKit library for professional PDF generation
- Automatic invoice generation on payment success
- Multi-table queries: Users, Courses, Transactions
- Billing address formatting (5 separate fields → single string)
- PDF branding: Mishin Learn header, purple theme (#667eea)
- Secure download: Ownership verification before serving PDF
- Storage: `server/uploads/invoices/invoice_{invoiceNumber}.pdf`
- Database: PdfPath column in Invoices table
- Test endpoint: `/api/payments/test-complete` for local development
- Frontend: Test Complete button, download functionality

**Duplicate Transaction Prevention (Phase 6 - Dec 17, 2025):**
- **Problem**: Race conditions causing multiple pending transactions for same course enrollment
- **Root Cause**: Check-then-insert pattern in StripeService allowed simultaneous requests to both pass
- **Solution Architecture** (3-Layer Defense):
  1. **Database Level** (DEFINITIVE): Filtered unique index `IX_Transactions_Unique_Pending` on (UserId, CourseId) WHERE Status='pending'
  2. **Backend Level**: Try-catch around INSERT, detects constraint violations (errors 2601/2627), returns existing payment intent
  3. **Frontend Level**: Button debouncing, useRef with courseId tracking prevents React Strict Mode duplicates
- **Technical Details**:
  - Filtered index allows multiple completed/refunded transactions (purchase history)
  - StripeService gracefully handles constraint violations without user-visible errors
  - CourseCheckoutPage tracks courseId in useRef (not boolean) to prevent Strict Mode double-execution
  - CoursesPage maintains Set of enrolling courseIds with loading states
- **Result**: Mathematically impossible to create duplicate pending transactions
- **Files**: Database IX_Transactions_Unique_Pending index (applied), `server/src/services/StripeService.ts`, `DUPLICATE_FIX_FINAL.md`

**Error Handling & Reliability (Phase 5 - Dec 15, 2025):**
- Idempotency keys: Prevent duplicate charges (checks last 30 min)
- Webhook retry logic: Exponential backoff (7 retries over 24h)
- Concurrent enrollment prevention: Idempotent operations, race condition handling
- Network timeouts: 30s API calls, 60s file downloads
- Categorized error messages: card_error, validation_error, api_error, rate_limit_error
- Detailed logging: Request IDs, processing times, stack traces
- Auto-retry on webhook failure (returns 500 status)
- Reuses existing payment intents when valid

```

**Avatar Upload Details:**
- Accepts: multipart/form-data with 'avatar' field
- File types: JPEG, PNG, GIF, WebP
- Max size: 5MB
- Processing: resize 200x200, convert WebP, quality 85
- Storage: uploads/images/avatar_${userId}_${uuid}.webp
- Returns: { avatarUrl: 'http://localhost:3001/uploads/images/...' }

**Notification Preferences Details (UPDATED Dec 29, 2025):**
- **64 fields total**: 2 global toggles, 5 category toggles, 50 subcategory pairs, 5 metadata
- **Global**: EnableInAppNotifications, EnableEmailNotifications (separate control)
- **Categories**: EnableProgressUpdates, EnableCourseUpdates, EnableAssessmentUpdates, EnableCommunityUpdates, EnableSystemAlerts
- **Subcategories**: 50 Enable*/Email* pairs (LessonCompletion, VideoCompletion, CourseMilestones, etc.)
- **Case**: All PascalCase (EnableInAppNotifications, EnableLessonCompletion) - backend, frontend, API aligned
- **NULL Inheritance**: Subcategory NULL = inherits category value
- **Time format**: SQL Server TIME type, HTML5 HH:mm input
- **UPSERT logic**: Creates default record if doesn't exist, updates dynamically (all 64 fields)
- **UI**: Dedicated /settings/notifications page with 5 accordion sections (734 lines)
- ✅ **FULLY FUNCTIONAL** (Dec 29, 2025) - 3-level cascade with queue system + cron job

---

## 📊 DATA FLOW ARCHITECTURE

### 1. **Authentication Flow**
```
User Login → LoginForm
  ↓ (credentials)
authStore.login()
  ↓ (POST /api/auth/login)
Backend auth.ts → Verify credentials
  ↓ (JWT token + user data)
Zustand authStore → localStorage['auth-storage']
  ↓
All API services → Inject token in headers
  ↓
Backend authenticateToken middleware → Verify JWT
  ↓
Protected routes execute
```

**User Profile Update Flow** (added Dec 11, 2025):
```
User → ProfilePage (5 tabs)
  ↓ (edit personal info)
profileApi.updatePersonalInfo(data)
  ↓ (PUT /api/profile/personal-info)
Backend profile.ts → authenticateToken → Update Users table
  ↓ (updated user data)
authStore.updateUser(userData)
  ↓
localStorage['auth-storage'] updated
  ↓
Header avatar/name auto-updates
```

**Payment Flow** (added Dec 11, 2025):
```
User → CourseDetailPage → Click "Purchase Course - $X.XX"
  ↓ (navigate /checkout/:courseId)
CourseCheckoutPage loads course details
  ↓ (POST /api/payments/create-payment-intent)
Backend → Verify course price → Create Stripe payment intent → Save Transaction
  ↓ (clientSecret returned)
Stripe Elements → User fills payment form → Submit
  ↓ (Stripe processes payment)
Stripe redirects → /payment/success?courseId=XXX
  ↓
PaymentSuccessPage → Confetti animation 🎉
  ↓ (POST /api/payments/confirm-enrollment)
Backend → Verify completed transaction exists → Create Enrollment
  ↓ (security check: Status='completed', UserId match)
User navigates to course → Sees "Continue Learning" button
  ↓ (auto-refresh enrollment state via useEffect)
CourseDetailPage → Fetches enrollment status → Updates UI
```

**Payment Security Layer:**
```
URL: /payment/success?courseId=XXX
  ↓ (attempt to get free enrollment)
POST /api/payments/confirm-enrollment
  ↓
Backend checks: SELECT FROM Transactions WHERE UserId=X AND CourseId=Y AND Status='completed'
  ↓ (if no transaction found)
403 Forbidden + Security warning logged
  ↓ (if transaction exists)
Create enrollment (IF NOT EXISTS) ✅
```

**Avatar Upload Flow** (added Dec 11, 2025):
```
User selects image → ProfilePage
  ↓ (FormData with file)
profileApi.uploadAvatar(file)
  ↓ (POST /api/profile/avatar/upload, multipart/form-data)
Backend multer middleware → Save to uploads/images/
  ↓
sharp processing:
  ├─ Resize to 200x200
  ├─ Convert to WebP
  └─ Quality 85
  ↓ (filename: avatar_123_uuid.webp)
Update Users.AvatarUrl with full server URL
  ↓ (http://localhost:3001/uploads/images/...)
authStore.updateUser({ AvatarUrl })
  ↓
Header avatar auto-updates
```

**Notification Preferences Flow** (UPDATED Dec 29, 2025):
```
User → Header → Settings dropdown → Notifications
  ↓
Navigate to: /settings/notifications (dedicated page)
  ↓
Load: notificationPreferencesApi.getPreferences()
  ↓ (GET /api/notifications/preferences)
Backend NotificationService.getUserPreferences()
  ↓ (SELECT all 64 PascalCase fields from NotificationPreferences table)
Frontend: Extract response.data.preferences (no conversion needed)
  ├─ All fields use PascalCase: EnableInAppNotifications, EnableLessonCompletion, etc.
  ├─ QuietHoursStart → format to HH:mm (if exists)
  └─ QuietHoursEnd → format to HH:mm (if exists)
  ↓
Render NotificationSettingsPage with 5 accordion sections:
  ├─ Global toggles (2): EnableInAppNotifications, EnableEmailNotifications
  ├─ Email digest frequency selector
  ├─ Quiet hours time pickers with clear (X) buttons
  ├─ Progress Updates (8 subcategories × 2 toggles = 16 switches)
  ├─ Course Updates (10 subcategories × 2 toggles = 20 switches)
  ├─ Assessment Updates (14 subcategories × 2 toggles = 28 switches)
  ├─ Community Updates (10 subcategories × 2 toggles = 20 switches)
  └─ System Alerts (10 subcategories × 2 toggles = 20 switches)
  ↓ (user edits any of 64 fields)
Click "Save Settings"
  ↓
notificationPreferencesApi.updatePreferences(preferences)
  ↓ (PATCH /api/notifications/preferences)
Send all 64 fields as-is (PascalCase, no conversion)
  ↓
Backend NotificationService.updatePreferences()
  ├─ Check if record exists
  ├─ Create default if not (UPSERT)
  ├─ Build dynamic UPDATE query with all provided fields
  └─ Update NotificationPreferences table (all 64 columns)
  ↓
Toast: "Notification settings saved!"

✅ FULLY FUNCTIONAL (Dec 29, 2025):
├─→ 3-level cascade: Global → Category → Subcategory (NULL inheritance)
├─→ NotificationService.shouldSendNotification() enforces all levels
├─→ Quiet Hours: Queue notification in NotificationQueue table
├─→ Type Filtering: Skip if global/category/subcategory disabled
├─→ Cron Job: Runs every 5 minutes, processes queue
├─→ All 64 settings persist correctly across sessions
└─→ Real-time Socket.IO delivery after quiet hours end
```

**Notification Preferences Enforcement Architecture** (UPDATED Dec 29, 2025):
```
┌─────────────────────────────────────────────────────────────────┐
│                Hybrid Notification Control Flow                  │
└─────────────────────────────────────────────────────────────────┘

OfficeHoursService / InterventionService / Other Services
  ↓
NotificationService.createNotificationWithControls(params)
  ├─ category: 'progress' | 'course' | 'assessment' | 'community' | 'system'
  ├─ subcategory: 'LessonCompletion' | 'VideoCompletion' | 'LiveSessions' | etc.
  └─ type: 'in-app' | 'email' | 'both'
  ↓
getUserPreferences(userId) → Get all 64 fields
  ↓
shouldSendNotification(preferences, category, subcategory, type)
  ├─ Level 1: Check global toggle (EnableInAppNotifications or EnableEmailNotifications)
  ├─ Level 2: Check category toggle (e.g., EnableProgressUpdates)
  ├─ Level 3: Check subcategory toggle (e.g., EnableLessonCompletion)
  └─ NULL subcategory inherits category value (3-level cascade)
  ↓
┌──────────────────┐
│ Preference Check │
└──────────────────┘
  ↓
shouldSendNotification(type, preferences)?
  ├─ No → Return '' (notification blocked)
  └─ Yes → Continue
       ↓
isInQuietHours(preferences)?
  ├─ Yes → queueNotification(params)
  │         ↓
  │    INSERT INTO NotificationQueue
  │    Status='queued', QueuedAt=NOW()
  │         ↓
  │    Return queueId
  └─ No → Create directly
            ↓
       INSERT INTO Notifications
            ↓
       Emit Socket.IO event
            ↓
       Return notificationId

┌──────────────────────────────────────────────────────────────────┐
│                   Cron Job Processing (Every 5 Min)               │
└──────────────────────────────────────────────────────────────────┘

Cron Scheduler (server/src/index.ts)
  ↓ (Every */5 * * * *)
processQueuedNotifications()
  ↓
SELECT * FROM NotificationQueue
WHERE Status='queued' AND ExpiresAt > GETUTCDATE()
  ↓
For each queued notification:
  ├─ getUserPreferences(userId)
  ├─ isInQuietHours(preferences)?
  │   ├─ Yes → Skip (still in quiet hours)
  │   └─ No → Deliver
  │            ↓
  │       createNotificationDirect(params)
  │            ↓
  │       INSERT INTO Notifications
  │            ↓
  │       Emit Socket.IO event
  │            ↓
  │       markQueuedAsDelivered(queueId)
  │            ↓
  │       UPDATE NotificationQueue
  │       SET Status='delivered', DeliveredAt=NOW()
  └─→ Log: "✅ Delivered queued notification"
  ↓
cleanupExpiredQueue()
  ↓
UPDATE NotificationQueue SET Status='expired'
WHERE Status='queued' AND ExpiresAt <= GETUTCDATE()
  ↓
Log: "✅ [CRON] Queue processing complete: X delivered, Y expired"

┌──────────────────────────────────────────────────────────────────┐
│                   Database Tables                                 │
└──────────────────────────────────────────────────────────────────┘

NotificationQueue (new Dec 18, 2025):
- Id, UserId, Type, Priority, Title, Message, Data
- ActionUrl, ActionText, RelatedEntityId, RelatedEntityType
- ExpiresAt, QueuedAt, DeliveredAt, Status (queued/delivered/expired)
- 3 Indexes: UserId, Status (filtered), QueuedAt

Notifications (existing):
- Final destination after preferences check passes
- Real-time delivery via Socket.IO
- Displayed in NotificationBell component

NotificationPreferences (existing):
- User's quiet hours and type toggles
- Referenced by createNotification() and processQueuedNotifications()
```

**API Endpoints Added (Dec 18, 2025):**
```
GET    /api/notifications/queue/count  - Get queued notification count
POST   /api/notifications/test          - Test notification (dev only)
```

**Notifications Center Real-time Architecture** (Dec 22, 2025):
```
┌─────────────────────────────────────────────────────────────────┐
│         Notifications Page & Bell Real-time Sync Flow            │
└─────────────────────────────────────────────────────────────────┘

User opens /notifications or clicks bell icon
  ↓
GET /api/notifications?type=X&priority=Y&limit=100&offset=0
  ↓
NotificationService.getUserNotifications(userId, includeRead, { type, priority, limit, offset })
  ↓
SELECT * FROM Notifications
WHERE UserId=@UserId AND (filters...)
ORDER BY CreatedAt DESC
OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
  ↓
Format dates: FORMAT(CreatedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z'
  ↓
Return { notifications: [...], pagination: { limit, offset, hasMore } }
  ↓
Frontend displays with client-side pagination (20 items/page)

┌──────────────────────────────────────────────────────────────────┐
│                   Socket.IO Real-time Events                      │
└──────────────────────────────────────────────────────────────────┘

Server Emits (NotificationService):
├─ notification-created  → When new notification sent to user
├─ notification-read     → When single notification marked as read
├─ notifications-read-all → When all notifications marked as read
└─ notification-deleted  → When notification is deleted

Client Listeners (NotificationBell + NotificationsPage):
├─ notification-created    → Add to list, increment count
├─ notification-read       → Update IsRead=true, decrement count
├─ notifications-read-all  → Mark all IsRead=true, count=0
└─ notification-deleted    → Remove from list, decrement count

Cross-Tab Synchronization:
User Tab A: Marks notification as read
  ↓
PATCH /api/notifications/:id/read
  ↓
NotificationService.markAsRead(id, userId)
  ↓
UPDATE Notifications SET IsRead=1, ReadAt=GETUTCDATE()
  ↓
io.to(`user-${userId}`).emit('notification-read', { notificationId })
  ↓
User Tab B: Receives socket event
  ↓
setNotifications(prev => prev.filter(n => n.Id !== notificationId))
setUnreadCount(prev => Math.max(0, prev - 1))
  ↓
Both tabs now in sync without page refresh

┌──────────────────────────────────────────────────────────────────┐
│             NotificationsPage Features (Dec 22, 2025)             │
└──────────────────────────────────────────────────────────────────┘

Filters:
├─ All/Unread toggle
├─ Type filter: progress, risk, intervention, achievement, assignment, course
└─ Priority filter: urgent, high, normal, low

Pagination:
├─ Server-side: limit=100, offset=0 (initial load)
├─ Client-side: 20 items per page with MUI Pagination
└─ Resets to page 1 when filters change

Actions:
├─ Mark individual as read → PATCH /api/notifications/:id/read
├─ Mark all as read → PATCH /api/notifications/read-all
├─ Delete notification → DELETE /api/notifications/:id
└─ Click notification → Navigate to ActionUrl (if present)

Real-time Updates:
├─ New notification appears at top instantly
├─ Read status syncs across all tabs
├─ Delete removes from all tabs
└─ No page refresh needed
```

**Date Display (Dec 22, 2025):**
```
Database (UTC):           2025-12-22T10:30:00.000Z
Server Format:            'yyyy-MM-ddTHH:mm:ss.fff' + 'Z'
Client Display:           formatDistanceToNow() → "5 minutes ago"
Timezone Conversion:      Automatic via date-fns (user's local timezone)
```

**Privacy Settings Flow** (added Dec 18, 2025):
```
User → Settings Page (/settings) → Privacy tab
  ↓
Load: settingsApi.getSettings()
  ↓ (GET /api/settings)
Backend SettingsService.getUserSettings()
  ↓ (UserSettings table: ProfileVisibility, ShowEmail, ShowProgress, AllowMessages)
Frontend: Display 4 privacy controls
  ├─ Profile Visibility: public / students / private (radio)
  ├─ Show Email: true / false (toggle)
  ├─ Show Progress: true / false (toggle)
  └─ Allow Messages: true / false (toggle)
  ↓ (user changes setting)
settingsApi.updateSettings(data)
  ↓ (PATCH /api/settings with partial update)
Backend SettingsService.updateUserSettings()
  └─→ Update UserSettings table (UPSERT if not exists)
  ↓
Toast: "Privacy settings updated"

✅ FULLY ENFORCED at API level (9 endpoints)
```

**Privacy Enforcement Architecture** (added Dec 18, 2025):
```
ANY API Request for User Data
  ↓
authenticateToken middleware → Extract viewerId
  ↓
Route handler → Get targetUserId from params/query
  ↓
SettingsService.canViewProfile(viewerId, targetUserId)
  ├─→ Query UserSettings for ProfileVisibility
  ├─→ Check visibility tier:
  │     ├─ Public → ALLOW
  │     ├─ Students → Check areStudentsTogether() → ALLOW/DENY
  │     └─ Private → Check viewerId === targetUserId → ALLOW/DENY
  ├─→ **Instructor Override Check**:
  │     ├─ Get target's enrolled courses: SELECT CourseId FROM Enrollments
  │     ├─ Check if viewer is instructor: SELECT FROM Courses WHERE InstructorId=viewerId
  │     └─ If match found → ALLOW (override privacy)
  └─→ Return: { allowed: true/false, reason: string }
  ↓
If allowed=false:
  └─→ Return 403 with error code: PROFILE_PRIVATE
  ↓
If allowed=true:
  ├─→ SettingsService.filterUserData(user, viewerId)
  │     ├─ Query ShowEmail setting
  │     ├─ **Instructor Override**: Check if viewer owns any target's courses
  │     ├─ If ShowEmail=false AND not owner AND not instructor → email = NULL
  │     └─ Return filtered user object
  └─→ Return user data

Similarly for Progress Viewing:
  ↓
SettingsService.canViewProgress(viewerId, targetUserId)
  ├─→ Query ShowProgress setting
  ├─→ **Instructor Override**: Check if viewer owns any target's courses
  ├─→ If ShowProgress=false AND not owner AND not instructor → DENY
  └─→ Return 403 with PROGRESS_PRIVATE or allow

**Instructor Override Logic** (ALL 3 privacy settings):
1. Get all courses where target is enrolled
2. Check if viewer is instructor of ANY of those courses
3. If yes → ALLOW access (override privacy)
4. If no → Apply normal privacy rules
```

**Endpoints with Privacy Enforcement**:
1. `/api/profile/user/:userId` - Profile viewing
2. `/api/profile/user/:userId/progress` - Progress viewing
3. `/api/users/instructors` - Instructor lists (email filtering)
4. `/api/analytics/course/:id` - Recent activity (email filtering)
5. `/api/presence/online` - Online users (email filtering, 2 endpoints)
6. `/api/office-hours/queue` - Office hours queue (email filtering)
7. `/api/study-groups/:id/members` - Study group members (email filtering)
8. `/api/instructor/at-risk/:courseId` - At-risk students (email filtering, instructor override)
9. `/api/instructor/low-progress/:courseId` - Low-progress students (email filtering, instructor override)
10. `/api/students` - Student management (instructor override, always shows emails to course instructors)

**Security Features**:
- Fail-closed defaults: Error → Privacy denied
- SQL injection prevention: Parameterized queries
- Authentication required: All endpoints check JWT
- Instructor verification: Query-based, not client-provided flags
- Owner bypass: Users always see their own data

**Frontend Privacy Handling**:
```
API Response with Hidden Email:
  { Id: 123, FirstName: "John", LastName: "Doe", Email: null }
  ↓
UI Rendering:
  {student.Email || 'Email hidden'}
  ↓
Conditional Actions:
  <Button disabled={!student.Email} tooltip="Student's email is hidden">
    Email Student
  </Button>
```

**Key Files**:
- `client/src/stores/authStore.ts` - Zustand store with token + user
- `client/src/pages/Auth/LoginForm.tsx` - Login UI
- `server/src/routes/auth.ts` - Auth endpoints
- `server/src/middleware/auth.ts` - JWT verification
- `server/src/services/SettingsService.ts` - Privacy enforcement logic

**Token Storage**:
```javascript
localStorage['auth-storage'] = {
  state: {
    token: "jwt...",
    user: { Id, FirstName, Email, Role, ... }
  }
}
```

**Used By**: ALL API services (coursesApi, enrollmentApi, progressApi, bookmarkApi, settingsApi, etc.)

---

### 2. **Course Browsing Flow**
```
User → CoursesPage
  ↓
coursesApi.getCourses(filters)
  ↓ (GET /api/courses?filters)
Backend courses.ts → Query database
  ↓ (courses array)
If logged in:
  ├─→ BookmarkApi.getBookmarkStatuses(courseIds) [parallel]
  └─→ enrollmentApi.getMyEnrollments() [parallel]
  ↓
Merge data → courses with isBookmarked + isEnrolled flags
  ↓
Render CourseCard components
```

**Key Files**:
- `client/src/pages/Courses/CoursesPage.tsx` - Main courses listing
- `client/src/components/Course/CourseCard.tsx` - Reusable card
- `client/src/services/coursesApi.ts` - Course API calls
- `server/src/routes/courses.ts` - Course endpoints

**Filters**:
- Search query (title/description)
- Category (programming, data_science, etc.)
- Level (Beginner, Intermediate, Advanced)
- Pagination (page, limit)

---

### 3. **Course Detail Flow**
```
User clicks course → CourseDetailPage (/courses/:courseId)
  ↓
Parallel API calls:
  ├─→ coursesApi.getCourse(courseId) - Course data
  └─→ coursesApi.getEnrollmentStatus(courseId) - Is enrolled? Is instructor?
  ↓
If enrolled (not instructor):
  └─→ progressApi.getCourseProgress(courseId) - Progress percentage
  ↓
If logged in:
  └─→ BookmarkApi.checkBookmarkStatus(courseId) - Is bookmarked?
  ↓
Render page with role-specific buttons:
  ├─ Instructor: "Manage Course" (orange)
  ├─ Enrolled Student: "Continue Learning" (purple)
  └─ Unenrolled: "Enroll Now" (purple)
```

**Key Files**:
- `client/src/pages/Course/CourseDetailPage.tsx` - Main detail page
- `client/src/components/Shared/ShareDialog.tsx` - Unified sharing (courses + certificates)
- `client/src/hooks/useShare.ts` - Share dialog state management hook
- `client/src/services/shareService.ts` - Platform sharing + URL generation
- `client/src/services/shareAnalytics.ts` - Share event tracking
- `server/src/routes/courses.ts` - getCourse endpoint
- `server/src/routes/enrollment.ts` - getEnrollmentStatus endpoint

**Enrollment Status Response**:
```typescript
{
  isEnrolled: boolean,      // Is student enrolled?
  isInstructor: boolean,    // Does user own this course?
  status: string,           // 'active' | 'completed' | 'suspended'
  enrolledAt: string,       // ISO date
  completedAt?: string      // ISO date if completed
}
```

---

### 4. **Enrollment Flow**
```
User clicks "Enroll Now" → CourseDetailPage.handleEnroll()
  ↓ (if not logged in)
navigate('/login')
  ↓ (if logged in)
enrollmentApi.enrollInCourse(courseId)
  ↓ (POST /api/enrollment/courses/:courseId/enroll)
Backend enrollment.ts:
  ├─→ Check not already enrolled
  ├─→ Check not instructor's own course
  ├─→ Check course is published
  ├─→ Create Enrollment record
  └─→ Update course EnrollmentCount
  ↓
Frontend: Update states
  ├─ setCourse({ ...course, isEnrolled: true })
  ├─ setEnrollmentStatus({ isEnrolled: true, ... })
  └─ Show success dialog with 3 actions:
      - Continue Browsing
      - View My Learning
      - Start Learning (navigate to /learning/:courseId)
```

**Key Files**:
- `client/src/services/enrollmentApi.ts` - Enrollment API
- `server/src/routes/enrollment.ts` - Enrollment endpoints (UNION ALL for instructors - Jan 19, 2026)
- Database: `Enrollments` table

**Instructor Enrollment Special Handling (Jan 19, 2026):**
- Instructors can both teach courses AND enroll as students
- GET `/api/enrollment/my-enrollments` returns UNION ALL:
  ```sql
  -- Part 1: Teaching courses (Status='teaching', TimeSpent=0)
  SELECT FROM Courses WHERE InstructorId = @userId
  
  UNION ALL
  
  -- Part 2: Student enrollments (Status='active'/'completed', TimeSpent=seconds)
  SELECT FROM Enrollments WHERE UserId = @userId
  ```
- Frontend filters: "Enrolled" badge excludes Status='teaching'
- Course cards show "Continue Learning" for enrolled, "Manage" for teaching
- Files: `server/src/routes/enrollment.ts` lines 23-100

**Important**: Enrollment creates **ONLY** Enrollment record, **NOT** UserProgress. UserProgress is created per-lesson when student accesses lesson.

---

### 5. **Bookmark Flow**
```
User clicks bookmark icon → handleBookmark()
  ↓ (if not logged in)
Return early (no action)
  ↓ (if logged in)
Check current state:
  ├─ If bookmarked: BookmarkApi.removeBookmark(courseId)
  │   ↓ (DELETE /api/bookmarks/:courseId)
  │   Backend: Delete from Bookmarks table
  │   Frontend: setIsBookmarked(false)
  │
  └─ If not bookmarked: BookmarkApi.addBookmark(courseId)
      ↓ (POST /api/bookmarks/:courseId)
      Backend: Insert into Bookmarks table
      Frontend: setIsBookmarked(true)
```

**Key Files**:
- `client/src/services/bookmarkApi.ts` - Bookmark API
- `server/src/routes/bookmarks.ts` - Bookmark endpoints
- Database: `Bookmarks` table (UserId, CourseId, Notes, BookmarkedAt)

**Used In**:
- `CourseDetailPage.tsx` - Detail page bookmark button
- `LessonDetailPage.tsx` - Lesson page bookmark button
- `CoursesPage.tsx` - Batch status checking, bookmark tab

**Batch Check**: `BookmarkApi.getBookmarkStatuses(courseIds[])` returns `{ [courseId]: true/false }`

---

### 6. **Progress Tracking Flow**
```
Student accesses lesson → LessonDetailPage
  ↓
progressApi.getCourseProgress(courseId)
  ↓ (GET /api/progress/courses/:courseId)
Backend progress.ts:
  ├─→ Query UserProgress for all lessons
  ├─→ Query CourseProgress for overall stats
  └─→ Return: lesson progress array + overall percentage
  ↓
Display progress indicators

When lesson completed:
  ↓
progressApi.markLessonComplete(lessonId, { timeSpent })
  ↓ (POST /api/progress/lessons/:lessonId/complete)
Backend progress.ts:
  ├─→ Update UserProgress (CompletedAt, TimeSpent)
  ├─→ Calculate overall course progress
  └─→ Update CourseProgress (OverallProgress, CompletedLessons)
  ↓
Frontend: Update UI with new progress
```

**Key Files**:
- `client/src/services/progressApi.ts` - Progress API
- `server/src/routes/progress.ts` - Progress endpoints
- Database: `UserProgress` (per-lesson), `CourseProgress` (per-course)

**Important**: 
- Instructors in **Preview Mode** → NO progress tracking (prevents analytics contamination)
- Students → Full progress tracking
- Check: `enrollmentStatus.isInstructor` to determine preview mode

---

### 7. **Video Lesson Flow**
```
Student plays video → VideoPlayer component
  ↓ (every 5 seconds)
videoProgressApi.updateProgress(videoLessonId, { currentTime, duration })
  ↓ (PUT /api/video-progress/:videoLessonId)
Backend video-progress.ts:
  ├─→ Update VideoProgress (CurrentTime)
  ├─→ If > 90% watched: Auto-mark lesson complete
  └─→ Track analytics events (play, pause, seek)
  ↓
Next time: Resume from saved position

When video completes:
  ↓
videoProgressApi.markComplete(videoLessonId)
  ↓ (POST /api/video-progress/:videoLessonId/complete)
Backend: Update CompletedAt + lesson progress
```

**Key Files**:
- `client/src/components/Video/VideoPlayer.tsx` - Video player
- `client/src/services/videoProgressApi.ts` - Video progress API
- `server/src/routes/video-progress.ts` - Video progress endpoints
- Database: `VideoProgress`, `VideoAnalytics`

---

### 8. **Office Hours Flow** (Real-time)
```
Instructor creates schedule → OfficeHoursInstructor
  ↓
officeHoursApi.createSchedule({ dayOfWeek, startTime, endTime })
  ↓ (POST /api/office-hours/schedules)
Backend office-hours.ts:
  ├─→ Create OfficeHours record
  └─→ Return schedule details
  ↓
Student views schedules → OfficeHoursStudent
  ↓
officeHoursApi.getAvailableSchedules()
  ↓ (GET /api/office-hours/schedules)
Backend: Return all instructor schedules
  ↓
Student joins queue:
  ↓
officeHoursApi.joinQueue(scheduleId)
  ↓ (POST /api/office-hours/queue)
Backend OfficeHoursService.joinQueue():
  ├─→ Create OfficeHoursQueue record (GUID ID)
  ├─→ Calculate position in queue
  ├─→ Create notification for instructor
  └─→ Socket.IO emit('queue-updated') to instructor room
  ↓
Instructor sees queue update (real-time):
  ↓
useOfficeHoursSocket → onQueueUpdated callback
  ↓
Refresh queue display (no toast, silent update)
  ↓
Instructor admits student:
  ↓
officeHoursApi.admitStudent(entryId)
  ↓ (PUT /api/office-hours/queue/:id/admit)
Backend OfficeHoursService.admitStudent():
  ├─→ Update status to 'admitted', set AdmittedAt timestamp
  ├─→ Create notification for student
  └─→ Socket.IO emit('office-hours-admitted') to student room
  ↓
Instructor completes session:
  ↓
officeHoursApi.completeSession(entryId)
  ↓ (POST /api/office-hours/queue/:queueId/complete)
Backend OfficeHoursService.completeSession():
  ├─→ Update status to 'completed', set CompletedAt timestamp
  ├─→ Calculate session duration (CompletedAt - AdmittedAt)
  ├─→ Create notification with duration: "Duration: X minute(s)."
  ├─→ Type: 'course', Category: 'community', Subcategory: 'OfficeHours'
  ├─→ Socket.IO emit('office-hours-completed') to student room
  └─→ Socket.IO emit('queue-updated') to instructor room
Backend OfficeHoursService.admitStudent():
  ├─→ Update queue entry status to 'admitted'
  ├─→ Set AdmittedAt timestamp (UTC with 'Z')
  ├─→ Create notification for student
  └─→ Socket.IO emit('admitted') to student room
  ↓
Student receives notification (real-time):
  ↓
useOfficeHoursSocket → onAdmitted callback
  ↓
Bell notification appears (no toast)
  ↓
Refresh queue status
  ↓
Instructor completes session:
  ↓
officeHoursApi.completeSession(entryId)
  ↓ (PUT /api/office-hours/queue/:id/complete)
Backend OfficeHoursService.completeSession():
  ├─→ Update queue entry status to 'completed'
  ├─→ Set CompletedAt timestamp (UTC with 'Z')
  ├─→ Create notification for student
  └─→ Socket.IO emit('session-completed') to student room
  ↓
Student receives completion notification (real-time)
```

**Key Files**:
- `client/src/pages/OfficeHours/OfficeHoursInstructor.tsx` - Instructor UI
- `client/src/pages/OfficeHours/OfficeHoursStudent.tsx` - Student UI
- `client/src/hooks/useOfficeHoursSocket.ts` - Socket.IO events
- `client/src/services/officeHoursApi.ts` - Office Hours API
- `server/src/routes/office-hours.ts` - Office Hours endpoints
- `server/src/services/OfficeHoursService.ts` - Business logic
- `server/src/services/NotificationService.ts` - Notification integration
- Database: `OfficeHours`, `OfficeHoursQueue`, `Notifications`

**Socket.IO Rooms**:
- `user-${userId}` - Individual user notifications
- `office-hours-${instructorId}` - Instructor's queue updates

**Notification Strategy**:
- User actions (join queue) → Toast + Bell notification
- Server events (admitted, completed) → Bell notification only (no toast)
- Prevents duplicate UI feedback

**Timestamp Handling**:
- All timestamps stored in UTC in database
- Backend returns timestamps with 'Z' suffix (ISO 8601)
- Frontend displays relative time ("a few seconds ago")

---

### 9. **Study Groups Flow** (Real-time with Invitations - January 21, 2026)
```
User creates study group → StudyGroupsPage
  ↓
studyGroupsApi.createGroup({ name, courseId, description })
  ↓ (POST /api/study-groups)
Backend studyGroups.ts:
  ├─→ Create StudyGroup record
  ├─→ Auto-add creator as member
  └─→ Return group details
  ↓
User searches for users to invite:
  ↓
usersApi.searchUsers(query)
  ↓ (GET /api/users/search?query={searchQuery})
Backend users.ts:
  ├─→ Query Users table (FirstName, LastName, Username, Email)
  ├─→ Filter: IsActive = 1 AND Id != currentUserId
  ├─→ Min 2 chars required, prevents self-invite
  └─→ Return user array (Id, FirstName, LastName, Username, Email)
  ↓
User sends invitation via InviteUserModal:
  ↓
studyGroupsApi.inviteUser(groupId, userId)
  ↓ (POST /api/study-groups/:groupId/invite)
Backend studyGroups.ts:
  ├─→ Validate membership (only members can invite)
  ├─→ Prevent self-invite (backend check)
  ├─→ Create notification for invitee
  │   ├─ Type: 'course', Category: 'community'
  │   ├─ Subcategory: 'GroupInvites'
  │   ├─ Priority: 'normal'
  │   ├─ Title: "Study Group Invitation"
  │   ├─ Message: "You've been invited to join \"{groupName}\""
  │   ├─ ActionUrl: '/study-groups'
  │   └─ ActionText: 'View Invitation'
  ├─→ Socket.IO emit('study-group-invitation') to invitee
  └─→ Return success message with invitee name
  ↓
Invitee receives notification (real-time):
  ↓
Notification bell updates → Navigate to /study-groups
  ↓
User joins study group:
  ↓
studyGroupsApi.joinGroup(groupId)
  ↓ (POST /api/study-groups/:groupId/join)
Backend StudyGroupsService.joinGroup():
  ├─→ Add user to StudyGroupMembers
  ├─→ Query all existing members (excluding new joiner)
  ├─→ Get new member's display name
  ├─→ For each existing member:
  │   ├─ Create notification
  │   │   ├─ Type: 'course', Category: 'community'
  │   │   ├─ Subcategory: 'GroupActivity'
  │   │   ├─ Priority: 'normal'
  │   │   ├─ Title: "New Study Group Member"
  │   │   ├─ Message: "{newMemberName} joined \"{groupName}\""
  │   │   ├─ ActionUrl: '/study-groups'
  │   │   └─ ActionText: 'View Group'
  │   └─ Socket.IO emit('study-group-member-joined')
  └─→ Log: "✅ Sent N member-joined notifications for group X"
  ↓
All existing members receive notification (real-time)
```

**Key Files**:
- `client/src/pages/StudyGroups/StudyGroupsPage.tsx` - Main study groups page with search
- `client/src/components/StudyGroups/InviteUserModal.tsx` - User invitation modal (268 lines)
- `client/src/components/StudyGroups/StudyGroupCard.tsx` - Group card with invite button
- `client/src/services/studyGroupsApi.ts` - Study Groups API
- `client/src/services/usersApi.ts` - User search API
- `server/src/routes/studyGroups.ts` - Study group endpoints (invite + member-joined)
- `server/src/routes/users.ts` - User search endpoint
- `server/src/services/NotificationService.ts` - Notification integration
- Database: `StudyGroups`, `StudyGroupMembers`, `NotificationPreferences`

**Socket.IO Events**:
- `study-group-invitation` - Sent to invitee when invited
- `study-group-member-joined` - Sent to all members when someone joins

**Notification Subcategories** (NotificationPreferences):
- **GroupInvites** (EnableGroupInvites, EmailGroupInvites) - Receiving study group invitations
- **GroupActivity** (EnableGroupActivity, EmailGroupActivity) - Member join/leave notifications

**Search Features**:
- 300ms debounced search on StudyGroupsPage (auto-search like courses page)
- 500ms debounced user search in InviteUserModal
- Minimum 2 characters required for user search
- Context-aware empty states (search vs tab view)
- Loading indicators during API calls

**Security Features**:
- Self-invite prevention (backend + frontend filtering)
- IsActive = 1 user filtering (excludes deleted accounts)
- Authentication required (authenticateToken middleware)
- Membership validation (only members can invite)
- SQL injection prevention (parameterized queries)

**Edge Cases Handled**:
- Empty search results
- API errors with toast notifications
- Duplicate invite attempts
- Modal state cleanup on close
- Non-blocking notification failures (join operation succeeds even if notifications fail)

---

### 10. **Presence System Flow** (Real-time)
```
User logs in → Socket connects
  ↓
socketService.connect() with JWT token
  ↓
Backend sockets.ts → 'connection' event
  ↓
PresenceService.setUserOnline(userId):
  ├─→ ensureUserPresence(userId) - Create record if doesn't exist (default: 'online')
  ├─→ Check existing status - if 'away', 'busy', or 'offline', preserve it
  ├─→ Otherwise, set Status = 'online', LastSeenAt = GETUTCDATE()
  └─→ Socket.IO broadcast('presence-changed') to all users
  ↓
All connected users update UI
  ↓
User changes status to 'away':
  ↓
PresenceStatusSelector → updateStatus('away')
  ↓
usePresence hook:
  ├─→ presenceApi.updateStatus('away')
  │   ↓ (PUT /api/presence/status)
  │   Backend PresenceService.updatePresence():
  │   ├─→ Update Status = 'away', UpdatedAt = GETUTCDATE()
  │   └─→ Socket.IO broadcast('presence-changed')
  │
  └─→ Socket emit('update-presence', { status: 'away' })
  ↓
Frontend receives 'presence-updated' event:
  ↓
setCurrentStatus('away') → UI updates immediately
  ↓
Automatic heartbeat (every 60 seconds):
  ↓
usePresence hook → sendHeartbeat()
  ↓
presenceApi.sendHeartbeat() + Socket emit('presence-heartbeat')
  ↓ (POST /api/presence/heartbeat)
Backend PresenceService.updateLastSeen():
  ├─→ MERGE statement (UPDATE if exists, INSERT if new)
  └─→ Set LastSeenAt = GETUTCDATE()
  ↓
User closes browser/tab:
  ↓
Socket.IO 'disconnect' event
  ↓
Backend preserves status (away/busy remain):
  ├─→ Update LastSeenAt = GETUTCDATE()
  └─→ Keep existing status (don't set offline)
  ↓
Inactivity checker (every 2 minutes):
  ↓
PresenceService.checkInactiveUsers():
  ├─→ Find users with LastSeenAt > 5 minutes ago
  ├─→ Set Status = 'offline' for inactive users
  └─→ Socket.IO broadcast('presence-changed') for each
  ↓
User refreshes page:
  ↓
PresencePage loads → usePresence hook initializes
  ↓
useEffect on mount:
  ├─→ presenceApi.getMyPresence() - Fetch actual status from server
  ├─→ setCurrentStatus(presence.Status) - Display correct status
  └─→ setIsLoadingStatus(false)
  ↓
Status badge and online list show consistent status (bug fixed!)
```

**Key Files**:
- `client/src/pages/Presence/PresencePage.tsx` - Main presence UI
- `client/src/hooks/usePresence.ts` - Status management + Socket.IO
- `client/src/components/Presence/OnlineIndicator.tsx` - Status badge
- `client/src/components/Presence/UserPresenceBadge.tsx` - Avatar + badge
- `client/src/components/Presence/OnlineUsersList.tsx` - Online users list
- `client/src/components/Presence/PresenceStatusSelector.tsx` - Status dropdown
- `client/src/services/presenceApi.ts` - Presence API methods
- `server/src/routes/presence.ts` - Presence endpoints
- `server/src/services/PresenceService.ts` - Business logic with Socket.IO
- `server/src/sockets.ts` - Socket connection handlers
- Database: `UserPresence` (UserId, Status, LastSeenAt, Activity)

**Socket.IO Events**:
- `presence-changed` - Broadcast to all when user status changes
- `presence-updated` - Personal confirmation after status update
- `update-presence` - Client emits to change status
- `presence-heartbeat` - Client emits to update last seen
- `update-activity` - Client emits to update activity string

**Presence Statuses**:
- `online` (green) - Active and available
- `away` (orange) - Temporarily unavailable
- `busy` (red) - Do not disturb mode
- `offline` (gray) - User offline or inactive > 5 minutes

**Critical Features**:
- **Status persistence through refresh** - Fetches actual status from server on mount
- **Automatic heartbeat** - Every 60 seconds to prevent false offline
- **Status preservation on disconnect** - Keeps away/busy status, not reset to offline
- **Inactivity detection** - Marks offline after 5 minutes of no heartbeat
- **Real-time updates** - All users see status changes instantly via Socket.IO

**Database Configuration**:
- `useUTC: true` in DatabaseService.ts (CRITICAL!)
- All timestamps use GETUTCDATE() in SQL queries
- Frontend uses standard Date API for ISO UTC parsing
- Display uses relative time with auto-timezone conversion

**Bug Fix (Dec 4, 2025)**:
- Issue: Status badge showed 'online' after refresh despite actual status being 'away'
- Cause: usePresence hook defaulted to 'online' on mount instead of fetching from server
- Fix: Added presenceApi.getMyPresence() call on mount to fetch actual status
- Result: Status now persists correctly through page refreshes

**Critical Bug Fixes (Jan 12, 2026)**:
1. **Logout Not Clearing Presence**
   - Issue: Users remained visible as "online" after logging out
   - Cause: Logout endpoint didn't update presence database
   - Fix: `/api/auth/logout` now calls `PresenceService.setUserOffline(userId)`
   - Files: [auth.ts](server/src/routes/auth.ts), [PresenceService.ts](server/src/services/PresenceService.ts)

2. **Concurrent Logout Prevention**
   - Issue: Multiple logout calls could occur simultaneously (double-click, token refresh failure)
   - Fix: Added `isLoggingOut` guard flag in authStore
   - Implementation: Check guard → set flag → API call → clear flag
   - Files: [authStore.ts](client/src/stores/authStore.ts)

3. **Socket Emit After Disconnect Errors**
   - Issue: Components tried to emit socket events after disconnection → errors
   - Fix: All socket emit calls now check `socketService.isConnected()` before emitting
   - Files: [socketService.ts](client/src/services/socketService.ts), [usePresence.ts](client/src/hooks/usePresence.ts), 
     [useStudyGroupSocket.ts](client/src/hooks/useStudyGroupSocket.ts), [useOfficeHoursSocket.ts](client/src/hooks/useOfficeHoursSocket.ts),
     [useLiveSessionSocket.ts](client/src/hooks/useLiveSessionSocket.ts)

4. **"Appear Offline" Status Not Persisting**
   - Issue: User sets status to "offline" → refresh page → status changed to "online"
   - Cause: `PresenceService.setUserOnline()` only preserved "away" and "busy", not "offline"
   - Fix: Now preserves all user-selected statuses including "offline" on socket reconnect
   - Implementation: `if (existing.Status === 'away' || 'busy' || 'offline') { preserve }`
   - Files: [PresenceService.ts](server/src/services/PresenceService.ts#L258-L289)

**Logout Flow Architecture (Jan 12, 2026)**:
```
User clicks logout → logout() async function
  ↓
isLoggingOut guard check (prevent duplicates)
  ↓
Set isLoggingOut = true
  ↓
Call /api/auth/logout with 5s timeout (AbortController)
  ↓ (POST /api/auth/logout, Authorization: Bearer token)
Backend auth.ts:
  ├─→ Extract userId from JWT
  ├─→ PresenceService.setUserOffline(userId)
  │   ├─→ UPDATE UserPresence SET Status='offline', UpdatedAt=GETUTCDATE()
  │   └─→ Socket.IO broadcast('presence-changed', { userId, status: 'offline' })
  └─→ Return success
  ↓
Clear auth state (isAuthenticated = false, token = null, isLoggingOut = false)
  ↓
App.tsx useEffect cleanup detects isAuthenticated change
  ↓
socketService.disconnect():
  ├─→ socket.disconnect() - Close WebSocket connection
  ├─→ this.socket = null
  └─→ Clear all event listeners
  ↓
Server 'disconnect' event handler:
  ├─→ User already offline in DB (from logout endpoint)
  └─→ Update LastSeenAt = GETUTCDATE()
  ↓
User redirected to /login
  ↓
All components unmount cleanly
```

**Edge Cases Handled**:
- ✅ Multiple concurrent logout calls (isLoggingOut guard)
- ✅ Logout during token refresh (guard prevents race condition)
- ✅ Token refresh failure calling logout (guard prevents infinite loops)
- ✅ Socket connecting during logout (proper cleanup order)
- ✅ Components using socket after logout (isConnected checks)
- ✅ API timeout (5s timeout, continues logout anyway)
- ✅ Browser tab close (socket disconnect + inactivity checker)

**Last Updated**: January 12, 2026 - Production ready

---

## 🗂️ SERVICE LAYER ARCHITECTURE

### API Service Pattern
All API services follow this structure:

```typescript
// 1. Axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:3001'
});

// 2. Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const token = JSON.parse(authStorage)?.state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 3. Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 4. Service class with methods
class MyApi {
  async getSomething(): Promise<Data> {
    const response = await api.get('/endpoint');
    return response.data;
  }
}

export const myApi = new MyApi();
```

### API Services List

| Service | File | Purpose | Key Methods |
|---------|------|---------|-------------|
| **coursesApi** | `coursesApi.ts` | Course CRUD, search, filters | getCourses, getCourse, getEnrollmentStatus |
| **enrollmentApi** | `enrollmentApi.ts` | Enrollment management | enrollInCourse, getMyEnrollments, unenrollFromCourse |
| **progressApi** | `progressApi.ts` | Progress tracking | getCourseProgress, markLessonComplete, updateLessonProgress |
| **bookmarkApi** | `bookmarkApi.ts` | Bookmark management | addBookmark, removeBookmark, checkBookmarkStatus, getBookmarks |
| **videoProgressApi** | `videoProgressApi.ts` | Video progress | updateProgress, markComplete, getProgress |
| **assessmentApi** | `assessmentApi.ts` | Assessments | getAssessments, submitAssessment, getResults |
| **chatApi** | `chatApi.ts` | AI tutoring | createSession, sendMessage, getSessions |
| **analyticsApi** | `analyticsApi.ts` | Analytics | getCourseAnalytics, getStudentAnalytics |
| **instructorApi** | `instructorApi.ts` | Instructor features | createCourse, updateCourse, getStudents |
| **accountDeletionApi** | `accountDeletionApi.ts` | Account deletion | deleteAccount (Jan 19, 2026) |

### Backend Service Layer

| Service | File | Purpose | Key Methods |
|---------|------|---------|-------------|
| **AccountDeletionService** | `AccountDeletionService.ts` | Account deletion orchestration | deleteAccount, archiveAllCourses, transferCourses, softDeleteCourses |
| **NotificationService** | `NotificationService.ts` | Notification creation/delivery | createNotificationWithControls, shouldSendNotification |
| **EmailService** | `EmailService.ts` | Email sending | sendVerificationEmail, sendWelcomeEmail, sendPasswordChangeNotification |
| **StripeService** | `StripeService.ts` | Payment processing | createPaymentIntent, createCheckoutSession |
| **OfficeHoursService** | `OfficeHoursService.ts` | Office hours management | createSession, joinQueue, completeSession |
| **PresenceService** | `PresenceService.ts` | Real-time user presence | trackUserActivity, getUserPresence |

**Account Deletion Architecture (Jan 18-19, 2026):**
```
Frontend (SettingsPage.tsx)
  ↓
InstructorDeletionDialog → User selects course action
  ├─ Archive All Courses
  ├─ Transfer All Courses (select instructor)
  └─ Force Delete All Courses
  ↓
Password Confirmation Required
  ↓
accountDeletionApi.deleteAccount({ instructorAction, transferToInstructorId, password })
  ↓
POST /api/account-deletion/delete
  ├─ authenticateToken (verify user)
  ├─ Verify password with bcrypt.compare()
  ├─ Begin SQL transaction
  ├─ AccountDeletionService.deleteAccount()
  │   ├─ If instructorAction === 'archive'
  │   │   └─ UPDATE Courses SET Status='archived' WHERE InstructorId=@userId
  │   ├─ If instructorAction === 'transfer'
  │   │   ├─ UPDATE Courses SET InstructorId=@newInstructorId
  │   │   └─ INSERT INTO CourseOwnershipHistory (logs transfer)
  │   ├─ If instructorAction === 'forceDelete'
  │   │   └─ UPDATE Courses SET Status='deleted', InstructorId=NULL
  │   ├─ UPDATE Users SET Status='deleted', DeletedAt=GETUTCDATE()
  │   └─ INSERT INTO AccountDeletionLog (audit trail)
  ├─ COMMIT transaction
  └─ Return success
  ↓
Frontend: Navigate to login, show success message
```

**Orphaned Course Handling:**
- Orphaned courses: InstructorId=NULL with Status='deleted'
- All 6 public catalog endpoints filter with `INNER JOIN Users u ON c.InstructorId = u.Id`
- Prevents deleted instructor courses from appearing in search/stats
- Files: `server/src/routes/courses.ts` lines 71, 82, 149, 255, 291, 333

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Role-Based Access Control

**3 Roles**:
1. **Student** - Can enroll, learn, track progress
2. **Instructor** - Can create courses, view analytics, manage students
3. **Admin** - Full system access (not fully implemented)

### Access Checks

**Backend Middleware**:
```typescript
authenticateToken(req, res, next) - Verify JWT
roleCheck(['instructor', 'admin'])(req, res, next) - Check roles
```

**Frontend Guards**:
```typescript
ProtectedRoute - Requires login
user?.Role === 'instructor' - Instructor-only features
enrollmentStatus.isInstructor - Course ownership check
```

### Common Access Patterns

**Course Detail Page**:
```typescript
if (enrollmentStatus?.isInstructor) {
  // Show "Manage Course" button
} else if (course.isEnrolled) {
  // Show "Continue Learning" button
} else {
  // Show "Enroll Now" button
}
```

**Instructor Preview Mode**:
```typescript
const isInstructorPreview = enrollmentStatus?.isInstructor;
if (isInstructorPreview) {
  // NO progress tracking
  // NO completion buttons
  // Show "Preview Mode" badge
}
```

---

## 🗄️ DATABASE SCHEMA OVERVIEW

### Core Tables

**Users**
- Id, FirstName, LastName, Email, PasswordHash
- Role ('student' | 'instructor' | 'admin')
- EmailVerified, IsActive, Status ('active' | 'deleted' - Jan 19, 2026), CreatedAt, DeletedAt

**Courses**
- Id, Title, Description, InstructorId (FK → Users, nullable for orphaned - Jan 19, 2026)
- Category, Level, Duration, Price, Rating
- Thumbnail, IsPublished, Status ('draft' | 'published' | 'archived' | 'deleted' - Jan 19, 2026), EnrollmentCount

**Lessons**
- Id, CourseId (FK → Courses)
- Title, Description, Content, OrderIndex
- Type ('video' | 'text' | 'quiz' | 'assignment')

**Enrollments**
- Id, UserId (FK → Users), CourseId (FK → Courses)
- Status ('active' | 'completed' | 'suspended' | 'teaching' - virtual in UNION query Jan 19, 2026)
- EnrolledAt, CompletedAt

**UserProgress** (per-lesson)
- Id, UserId, CourseId, LessonId (FK → Lessons)
- ProgressPercentage, Status, CompletedAt
- TimeSpent, NotesJson, LastAccessedAt
- **UNIQUE(UserId, CourseId, LessonId)**

**CourseProgress** (per-course)
- Id, UserId, CourseId
- OverallProgress, CompletedLessons (JSON array)
- TimeSpent, LastAccessedAt

**Bookmarks**
- Id, UserId (FK → Users), CourseId (FK → Courses)
- Notes, BookmarkedAt
- **UNIQUE(UserId, CourseId)**

**VideoLessons**
- Id, LessonId (FK → Lessons)
- VideoUrl, Duration, Quality, Thumbnail
- TranscriptUrl, Subtitles

**VideoProgress**
- Id, UserId, VideoLessonId (FK → VideoLessons)
- CurrentTime, Duration, CompletedAt
- PlaybackSpeed, LastWatchedAt

**CourseOwnershipHistory** (Added Jan 18, 2026)
- Id, CourseId (FK → Courses), PreviousInstructorId, NewInstructorId (FK → Users)
- TransferredAt, Reason ('account_deletion' | 'manual_transfer')

**AccountDeletionLog** (Added Jan 18, 2026)
- Id, UserId (FK → Users), InstructorAction ('archive' | 'transfer' | 'forceDelete' | NULL)
- TransferredToInstructorId (FK → Users, nullable), DeletedAt

**Orphaned Course Pattern (Jan 19, 2026):**
- Courses with InstructorId=NULL and Status='deleted' are "orphaned"
- Public catalog endpoints filter with `INNER JOIN Users u ON c.InstructorId = u.Id`
- Ensures deleted instructor courses don't appear in search/stats
- Student enrollments preserved for historical access

---

## 📁 FRONTEND STRUCTURE

### Page Components (Entry Points)

```
pages/
├── Auth/
│   ├── LoginForm.tsx - Login page
│   ├── RegisterForm.tsx - Registration
│   └── ForgotPasswordForm.tsx - Password reset
├── Courses/
│   ├── CoursesPage.tsx - Course catalog (3 tabs: All, Enrolled, Bookmarked)
│   └── CourseDetail.tsx - Old detail page (merged into CourseDetailPage)
├── Course/
│   ├── CourseDetailPage.tsx - Unified course detail (preview + enrolled)
│   └── LessonDetailPage.tsx - Individual lesson view
├── Learning/
│   └── MyLearningPage.tsx - Student learning dashboard
├── Instructor/
│   ├── InstructorDashboard.tsx - Instructor home
│   ├── CourseCreationForm.tsx - Create/edit courses
│   └── LessonEditor.tsx - Create/edit lessons
├── Dashboard/
│   └── DashboardPage.tsx - Student dashboard
└── Profile/
    ├── ProfilePage.tsx - User profile
    └── TransactionsPage.tsx - Purchase history
```

### Reusable Components

```
components/
├── Course/
│   └── CourseCard.tsx - Course preview card (SHARED by all pages)
├── Shared/
│   └── ShareDialog.tsx - Unified social media sharing (courses + certificates)
├── Navigation/
│   ├── HeaderV5.tsx - Modern navigation header with mega-menu dropdowns
│   ├── MegaMenuDropdown.tsx - Desktop dropdown menus with icons/descriptions
│   ├── MobileBottomNav.tsx - Fixed bottom navigation for mobile (64px)
│   ├── MobileNavDrawer.tsx - Full-screen mobile navigation drawer
│   ├── PageHeader.tsx - Page-specific header component
│   └── index.ts - Barrel exports
├── Layout/
│   └── DashboardLayout.tsx - Dashboard wrapper
├── Video/
│   ├── VideoPlayer.tsx - Video player with progress
│   └── VideoTranscript.tsx - Interactive transcript
└── Auth/
    ├── ProtectedRoute.tsx - Auth guard
    └── TokenExpirationWarning.tsx - Session warning
```

**Navigation Config** (Centralized - January 31, 2026):
```
config/
└── navigation.tsx - All navigation items, groups, and role filtering
types/
└── navigation.ts - TypeScript interfaces for navigation system
```

**Hooks**:
```
hooks/
└── useShare.ts - Share dialog state management (unified for courses + certificates)
```

**Services**:
```
services/
├── shareService.ts - Platform sharing + URL generation
└── shareAnalytics.ts - Share event tracking and analytics
```

---

## 🔄 STATE MANAGEMENT

### Zustand Store (Global)

**authStore** (`stores/authStore.ts`)
```typescript
{
  token: string | null,
  user: User | null,
  login: (email, password) => Promise<void>,
  logout: () => void,
  refreshToken: () => Promise<void>
}
```

**Persisted in**: `localStorage['auth-storage']`

**Used by**: All components needing auth state

### React State (Local)

**Component-level state examples**:
```typescript
// CourseDetailPage
const [course, setCourse] = useState<CourseDetails | null>(null);
const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
const [isBookmarked, setIsBookmarked] = useState(false);
const [loading, setLoading] = useState(true);

// CoursesPage
const [allCourses, setAllCourses] = useState<Course[]>([]);
const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
const [bookmarkedCourses, setBookmarkedCourses] = useState<Course[]>([]);
```

---

## 🔌 SOCKET.IO INTEGRATION

### Overview
Socket.io provides real-time bidirectional communication between clients and server for instant updates, live chat, and collaborative features.

**Server Setup**: `server/src/index.ts`
```typescript
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

// Initialize handlers
setupSocketHandlers(io);

// NotificationService with Socket.io
const notificationService = new NotificationService(io);
```

### Authentication Flow

**Connection with JWT** (`server/src/sockets.ts`):
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication failed'));
    
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.join(`user-${decoded.userId}`);
    
    next();
  });
});
```

**Client Connection** (`client/src/services/socketService.ts`):
```typescript
connect() {
  const token = authStore.getState().token;
  
  this.socket = io('http://localhost:3001', {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  
  this.setupListeners();
}
```

### Real-time Notifications Flow (Updated Jan 14, 2026)

**ARCHITECTURE REFACTORED - Centralized Pattern:**

```
Backend Event → Socket.IO → App.tsx Listener → Zustand Store → Components
```

**Key Changes:**
1. ✅ **Zustand Store** - Single source of truth (`client/src/stores/notificationStore.ts`)
2. ✅ **Centralized Listeners** - App.tsx registers all socket listeners once (lines 104-203)
3. ✅ **No Component Listeners** - NotificationBell & NotificationsPage removed socket code
4. ✅ **Optimistic Updates** - API call + immediate store update for instant feedback
5. ✅ **Cross-Tab Sync** - Socket events update all tabs simultaneously
6. ✅ **Toast Notifications** - Priority-based (urgent/high: 5s, normal/low: 3s)

**Notification Store State:**
```typescript
{
  notifications: Notification[],
  unreadCount: number,
  queuedCount: number,
  addNotification: (notification) => void,      // Idempotent (duplicate check)
  removeNotification: (id) => void,
  markAsRead: (id) => void,                     // Idempotent (wasUnread check)
  markAllAsRead: () => void,
  setNotifications: (notifications) => void,
  setUnreadCount: (count) => void,
  setQueuedCount: (count) => void
}
```

**Socket Events (Registered in App.tsx):**
```typescript
// Line 104-173: setupNotificationListeners()
socket.on('notification-created', (notification) => {
  addNotification(notification);
  
  // Toast notification with priority-based duration
  const duration = ['urgent', 'high'].includes(notification.Priority) ? 5000 : 3000;
  toast.info(notification.Title, { 
    description: notification.Message,
    duration,
    action: notification.ActionUrl ? { label: 'View', onClick: navigate } : undefined
  });
});

socket.on('notification-read', (notificationId) => {
  markAsRead(notificationId);
});

socket.on('notifications-read-all', () => {
  markAllAsRead();
});

socket.on('notification-deleted', (notificationId) => {
  removeNotification(notificationId);
});
```

**Component Usage:**
```typescript
// NotificationBell.tsx
const { notifications, unreadCount, queuedCount } = useNotificationStore();
const unreadNotifications = useMemo(() => 
  notifications.filter(n => !n.IsRead).slice(0, 5), 
  [notifications]
);

// NotificationsPage.tsx
const { notifications, setNotifications, markAsRead } = useNotificationStore();
// No socket listeners, just reads from store
```

**Flow Examples:**

**New Notification:**
```
Backend creates notification → Socket.IO emits 'notification-created'
  ↓
App.tsx receives event → addNotification(notification)
  ↓
Store updates → notifications array + unreadCount incremented
  ↓
Toast notification shows (priority-based duration)
  ↓
All components using store rerender (NotificationBell, NotificationsPage)
```

**Mark as Read (Same Tab):**
```
User clicks notification → API call to /notifications/:id/read
  ↓
markAsRead(id) called immediately (optimistic update)
  ↓
Store updates → notification.IsRead = true, unreadCount decremented
  ↓
UI updates instantly
  ↓
Backend processes → Socket emits 'notification-read' to all tabs
  ↓
App.tsx receives → markAsRead(id) again
  ↓
Store action is idempotent (checks wasUnread) → no double-decrement
```

**Cross-Tab Synchronization:**
```
Tab A: User clicks mark all read
  ↓
Tab A: API call + markAllAsRead() optimistic update
  ↓
Backend: Socket emits 'notifications-read-all' to all connected clients
  ↓
Tab B: App.tsx receives event → markAllAsRead()
  ↓
Tab B: Store updates → All notifications marked read
  ↓
Tab B: Components rerender with updated state
```

**Benefits:**
- ✅ No race conditions (single listener registration)
- ✅ No duplicate events (off/on pattern in socketService)
- ✅ Optimistic UI updates (instant feedback)
- ✅ Cross-tab sync (automatic via socket events)
- ✅ Memory efficient (proper cleanup on unmount)
- ✅ Type-safe (TypeScript throughout)
- ✅ Maintainable (centralized logic)

---

### Real-time Notifications Flow (Legacy Documentation)

**Backend Emission** (`server/src/services/NotificationService.ts`):
```typescript
async createNotification(data: CreateNotificationData) {
  // Save to database
  const notification = await db.insertNotification(data);
  
  // Emit via Socket.io to user's room
  this.io.to(`user-${data.userId}`).emit('notification', {
    id: notification.Id,
    type: notification.Type,
    title: notification.Title,
    message: notification.Message,
    priority: notification.Priority,
    createdAt: notification.CreatedAt
  });
  
  return notification;
}
```

**Frontend Listener** (`client/src/components/Notifications/NotificationBell.tsx`):
```typescript
useEffect(() => {
  socketService.connect();
  
  socketService.onNotification((notification) => {
    // Update state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast for urgent notifications
    if (notification.priority === 'urgent') {
      toast.warning(notification.title, {
        description: notification.message
      });
    }
  });
  
  return () => socketService.disconnect();
}, []);
```

### Live Chat Flow

**Room Management** (`server/src/sockets.ts`):
```typescript
socket.on('join-room', async (data: { roomId: string }) => {
  // Verify user has access to room
  const hasAccess = await verifyRoomAccess(socket.userId, data.roomId);
  if (!hasAccess) return socket.emit('error', 'Access denied');
  
  socket.join(`room-${data.roomId}`);
  
  // Notify others
  io.to(`room-${data.roomId}`).emit('user-joined', {
    userId: socket.userId,
    email: socket.userEmail
  });
});

socket.on('chat-message', async (data) => {
  // Save message to database
  const message = await db.insertChatMessage({
    roomId: data.roomId,
    senderId: socket.userId,
    message: data.message
  });
  
  // Broadcast to room
  io.to(`room-${data.roomId}`).emit('new-message', {
    messageId: message.Id,
    senderId: socket.userId,
    senderName: socket.userEmail,
    message: data.message,
    timestamp: message.CreatedAt
  });
});
```

**Client Integration** (`client/src/pages/Chat/Chat.tsx`):
```typescript
useEffect(() => {
  socketService.joinRoom(roomId);
  
  socketService.onMessage((message) => {
    setMessages(prev => [...prev, message]);
  });
  
  return () => socketService.leaveRoom(roomId);
}, [roomId]);

const sendMessage = (text: string) => {
  socketService.sendMessage(roomId, text);
};
```

### Typing Indicators

**Backend** (`server/src/sockets.ts`):
```typescript
socket.on('typing-start', (data: { roomId: string }) => {
  socket.to(`room-${data.roomId}`).emit('user-typing', {
    userId: socket.userId,
    email: socket.userEmail
  });
});

socket.on('typing-stop', (data: { roomId: string }) => {
  socket.to(`room-${data.roomId}`).emit('user-stopped-typing', {
    userId: socket.userId
  });
});
```

### Event Summary

**Server Events** (emit to clients):
- `notification` - New notification created
- `notification-read` - Notification marked as read (sync across devices)
- `new-message` - New chat message
- `user-joined` - User joined chat room
- `user-left` - User left chat room
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing

**Client Events** (emit to server):
- `join-room` - Join chat room
- `leave-room` - Leave chat room
- `chat-message` - Send chat message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator

### Connection Management

**Reconnection Logic**:
```typescript
socket.on('disconnect', () => {
  console.log('Socket disconnected, will auto-reconnect');
});

socket.on('connect', () => {
  console.log('Socket connected/reconnected');
  // Rejoin rooms if needed
});
```

**Cleanup**:
```typescript
useEffect(() => {
  // Setup
  connectSocket();
  
  return () => {
    // Cleanup
    socket.off('notification');
    socket.off('new-message');
    socket.disconnect();
  };
}, []);
```

### Used For
- ✅ **Real-time Notifications** - Instant notification delivery
- ✅ **Live Chat** - AI tutoring sessions with real-time messaging
- ✅ **Typing Indicators** - Show when users are typing
- ✅ **Instructor Interventions** - At-risk student alerts
- ✅ **Live Sessions** - Collaborative learning sessions
- ✅ **Study Groups** - Student collaboration spaces
- ✅ **Office Hours** - Queue management with real-time updates
- ✅ **Presence System** - Online/offline/away/busy status tracking

---

## 🎯 COMMON PATTERNS & CONVENTIONS

### 1. **API Error Handling**
```typescript
try {
  const result = await api.someMethod();
  // Handle success
} catch (error: any) {
  console.error('Operation failed:', error);
  // Parse error message
  try {
    const errorData = JSON.parse(error.message);
    if (errorData.code === 'SPECIFIC_ERROR') {
      // Handle specific error
    }
  } catch {
    // Generic error handling
    setError(error.message || 'Operation failed');
  }
}
```

### 2. **Loading States**
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getData();
      setData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false); // ALWAYS in finally
    }
  };
  loadData();
}, [dependencies]);

if (loading) return <CircularProgress />;
if (error) return <Alert severity="error">{error}</Alert>;
return <DataDisplay data={data} />;
```

### 3. **Parallel API Calls**
```typescript
// Good - Parallel requests
const [courseData, enrollmentData, bookmarkData] = await Promise.all([
  coursesApi.getCourse(courseId),
  coursesApi.getEnrollmentStatus(courseId),
  BookmarkApi.checkBookmarkStatus(courseId)
]);

// Bad - Sequential requests (slower)
const courseData = await coursesApi.getCourse(courseId);
const enrollmentData = await coursesApi.getEnrollmentStatus(courseId);
const bookmarkData = await BookmarkApi.checkBookmarkStatus(courseId);
```

### 4. **Authentication Checks**
```typescript
// Before sensitive operations
if (!user) {
  navigate('/login');
  return;
}

// API call will automatically include token
const result = await api.protectedOperation();
```

### 5. **Role-Based Rendering**
```typescript
// Check user role
{user?.Role === 'instructor' && (
  <Button onClick={handleManage}>Manage Course</Button>
)}

// Check enrollment status
{enrollmentStatus?.isInstructor ? (
  <Button>Manage Course</Button>
) : course.isEnrolled ? (
  <Button>Continue Learning</Button>
) : (
  <Button onClick={handleEnroll}>Enroll Now</Button>
)}
```

---

## 🚨 CRITICAL RULES

### 1. **NEVER Change Port Numbers**
- Backend: Always 3001
- Frontend: Always 5173
- CORS configured for these exact ports
- Changing ports breaks authentication

### 2. **Database Column Names**
- Use PascalCase in database: `FirstName`, `LastName`, `UserId`
- Check schema.sql before querying
- Use grep_search to find all usages before removing columns

### 3. **Instructor Preview Mode**
- NEVER track progress when `enrollmentStatus.isInstructor === true`
- No lesson completion
- No video progress
- No course progress updates
- Show "Preview Mode" badge

### 4. **Enrollment vs UserProgress**
- Enrollment: Created when user enrolls (1 record per course)
- UserProgress: Created per-lesson when accessed (many records per course)
- NEVER create UserProgress during enrollment

### 5. **Authentication Token**
- Stored as JSON in `localStorage['auth-storage']`
- Access: `JSON.parse(localStorage.getItem('auth-storage')).state.token`
- Auto-injected by interceptors in API services
- Never store in plain `localStorage['token']`

---

## 📚 QUICK REFERENCE

### Finding Component Dependencies
```bash
# Find all files using a component
grep -r "ComponentName" client/src

# Find all API calls to an endpoint
grep -r "/api/endpoint" client/src/services
```

### Common Issues & Solutions

**Issue**: Bookmark not persisting
- **Check**: API call being made?
- **Check**: User logged in?
- **Check**: Backend route working?
- **Check**: Database Bookmarks table exists?

**Issue**: Enrollment button showing wrong state
- **Check**: `enrollmentStatus.isInstructor` value
- **Check**: `course.isEnrolled` value
- **Check**: API returning correct data?

**Issue**: Progress not saving
- **Check**: Instructor preview mode? (should not save)
- **Check**: UserProgress record exists?
- **Check**: API call in network tab?

---

**This architecture document should be updated when:**
- New API services added
- New data flows created
- Major components refactored
- Database schema changes

**Next**: See `COMPONENT_REGISTRY.md` for detailed component documentation.
