# Mishin Learn Platform - System Architecture

**Last Updated**: March 6, 2026 - Coupon/Discount Code System complete — `CouponService.ts` (385 lines), 6 routes at `/api/coupons`, `couponApi.ts`, `CouponManagementPage.tsx` (833 lines), `CourseCheckoutPage.tsx` refactored (2-step + coupon UI); DB schema updated (FK cascade fix); Instructor Revenue Dashboard + Admin Dashboard 5 phases also complete 💰🏢🎟️  
**Purpose**: Understanding system components, data flows, and dependencies

---

## 🏗️ SYSTEM OVERVIEW

### Tech Stack
```
Frontend: React 18 + TypeScript + Material-UI + Vite
Backend: Node.js + Express + TypeScript (Grade A - 95/100)
Database: SQL Server (SQLEXPRESS)
Real-time: Socket.io
State: Zustand (auth), React state (components)
Logging: Structured logger with metadata (70% coverage)
Type Safety: 85% (30+ interfaces in types/database.ts)
Theme System: Centralised token system (client/src/theme/) — colors, shadows, radii
```

### Theme Token System (Added Feb 21, 2026)
All design primitives are centralised in `client/src/theme/` to prevent hardcoded values across 2,500+ `sx` props.

| File | Purpose |
|------|---------|
| `client/src/theme/index.ts` | Single `createTheme()` export: extended palette (50-900 shades), `theme.custom.colors` (8), `.shadows` (9), `.radii` (7), component overrides, `mishinColors` export |
| `client/src/theme/tokens.ts` | 18 reusable `SxProps<Theme>` fragments (`cardSx`, `truncateSx`, `centeredFlexSx`, etc.) |
| `client/src/main.tsx` | `ThemeProvider` wrapping; `Toaster` uses `mishinColors` raw values (non-sx context) |

**Critical rules** (3-round bug audit confirmed):
- `borderRadius` in sx: number tokens MUST use `` `${t.custom.radii.card}px` `` — raw numbers × `shape.borderRadius` (12) → `16×12=192px`
- `radii.full` = `'50%'` string — use directly without `px` suffix
- Shadow RGBs: `focusPrimary` = `rgba(99, 102, 241)` (brand #6366f1), `focusSuccess` = `rgba(34, 197, 94)` (brand #22c55e)
- Colors outside sx: use `mishinColors.primary[500]` (raw), not theme callbacks

### Server Ports
- **Backend API**: `http://localhost:3001`
- **Frontend Dev**: `http://localhost:5173`
- **NEVER CHANGE THESE** - CORS configured for these exact ports

### Payment Security (Updated Feb 11, 2026)
```
Instructor Status Change Flow:
  PUT /api/students/:studentId/enrollment/:enrollmentId
  → Payment verification for paid courses:
     1. Status-based check: suspended/completed = definitely paid
     2. Transaction check: Query Transactions table for completed payments
     3. Decision: Allow, Block (400), or Override to 'approved'
  → Prevents ALL payment bypass scenarios
  → Enables webhook failure recovery (if payment exists)
  → Dependency: Transactions table (UserId, CourseId, Status columns)
```

---

## 🔌 API ENDPOINTS

### Admin Dashboard (Added March 5, 2026)

**Route file**: `server/src/routes/admin.ts`  
**Service**: `server/src/services/AdminService.ts` (~1650 lines)  
**Auth**: All routes require `authenticateToken, authorize(['admin'])`  
**Frontend service**: `client/src/services/adminApi.ts`

```
GET  /api/admin/stats                    → Platform stats (users, courses, enrollments, revenue, activeToday)
GET  /api/admin/growth                   → 30-day daily { date, users, enrollments }
GET  /api/admin/revenue                  → totalRevenue, monthlyRevenue, avgTransaction, refundRate
GET  /api/admin/recent-activity          → Last 20 platform events
GET  /api/admin/users                    → Paginated user list (search, role, status, sortBy)
GET  /api/admin/users/:id                → User detail + stats
PATCH /api/admin/users/:id/role          → Change role
PATCH /api/admin/users/:id/status        → Activate / deactivate
POST /api/admin/users/:id/reset-password → Trigger password reset email
GET  /api/admin/courses                  → Paginated course list
GET  /api/admin/courses/:id              → Course detail + stats
PATCH /api/admin/courses/:id/status      → Change status
PATCH /api/admin/courses/:id/reassign    → Reassign instructor (logs CourseOwnershipHistory)
DELETE /api/admin/courses/:id            → Hard delete
GET  /api/admin/transactions             → Paginated transaction list
GET  /api/admin/transactions/:id         → Transaction detail
GET  /api/admin/revenue/breakdown        → Monthly + by-category + by-instructor revenue
POST /api/admin/transactions/:id/refund  → Stripe refund + DB update
GET  /api/admin/system/health            → DB connection + table [rowCount]s + user summary
GET  /api/admin/audit-log                → Paginated AccountDeletionLog + CourseOwnershipHistory
GET  /api/admin/reports/popular-courses  → Top courses by enrollment/rating/revenue
GET  /api/admin/reports/top-instructors  → Top instructors leaderboard
POST /api/admin/promote-to-instructor    → Promote user to instructor
```

**Admin Pages** (`client/src/pages/Admin/`):
```
/admin/dashboard  → AdminDashboard.tsx       (stat cards, growth chart, activity feed)
/admin/users      → AdminUserManagement.tsx  (user list, role/status change, detail dialog)
/admin/courses    → AdminCourseManagement.tsx (moderation, reassign, delete, detail dialog)
/admin/revenue    → AdminRevenueDashboard.tsx (bar+pie charts, transactions, refunds)
/admin/reports    → AdminReportsPage.tsx     (tabs: Popular, Instructors, Audit, Health)
```

**Critical SQL note**: `rowCount` is a reserved keyword in SQL Server. Use `[rowCount]` with brackets when aliasing.

### Instructor Revenue Dashboard (Added March 5, 2026)

**Route file**: `server/src/routes/instructorRevenue.ts`  
**Service**: `server/src/services/InstructorRevenueService.ts` (~280 lines)  
**Auth**: All routes require `authenticateToken, authorize(['instructor', 'admin'])`  
**Frontend service**: `client/src/services/instructorRevenueApi.ts`  
**Frontend page**: `client/src/pages/Instructor/InstructorRevenueDashboard.tsx` (~1000 lines)

```
GET /api/instructor/revenue/metrics       → totalRevenue, monthlyRevenue, avgOrderValue, refundTotal, refundCount, totalTransactions
GET /api/instructor/revenue/monthly       → 12-month bar-chart data
                                            CTE Months 0–11 + pre-filter subquery
                                            WHERE c.InstructorId = @id AND t.Status = 'completed'
GET /api/instructor/revenue/courses       → Per-course revenue, enrollment count, refund count
                                            Grouped by CourseId, WHERE c.Status != 'deleted'
GET /api/instructor/revenue/transactions  → Paginated transactions (page, limit, search, status, courseId, sortBy, sortOrder)
                                            Whitelist sort map, separate COUNT request
```

### Coupon / Discount Code System (Added March 6, 2026)

**Route file**: `server/src/routes/coupons.ts`  
**Service**: `server/src/services/CouponService.ts` (385 lines)  
**Auth**: `POST /validate` = `authenticateToken` (any user); all other routes = `authenticateToken + authorize(['instructor', 'admin'])`  
**Frontend service**: `client/src/services/couponApi.ts` (208 lines)  
**Frontend page**: `client/src/pages/Instructor/CouponManagementPage.tsx` (833 lines) at `/instructor/coupons`

```
POST /api/coupons/validate     → Validate coupon at checkout (returns discountAmount, finalPrice)
GET  /api/coupons/instructor   → Paginated instructor coupon list (page, limit, search, active)
GET  /api/coupons/:id          → Coupon detail + recent 10 usage rows
POST /api/coupons/             → Create coupon (Code regex: ^[A-Z0-9_-]{3,50}$)
PUT  /api/coupons/:id          → Update coupon (ownership-checked)
DELETE /api/coupons/:id        → Soft deactivate (sets IsActive = 0)
```

**`validateCoupon` checks (in order)**:
1. Coupon exists and `IsActive = 1`
2. Not expired (`ExpiresAt IS NULL OR ExpiresAt > GETUTCDATE()`)
3. Uses not exceeded (`MaxUses IS NULL OR UsedCount < MaxUses`)
4. Course price ≥ `MinPurchaseAmount`
5. User hasn't already used this coupon (per-user uniqueness via `CouponUsage`)
6. Coupon belongs to instructor who owns the course (scope via JOIN)

**`recordUsage`** (called from `payment_intent.succeeded` webhook):
- Atomic `INSERT CouponUsage` + `UPDATE Coupons SET UsedCount += 1` in same transaction
- Non-blocking (fire-and-forget from webhook handler)

**PI creation flow** (`payments.ts`):
- Destructures `couponCode` from body
- Calls `couponService.validateCoupon()` → returns `discountAmount`
- Server-enforced amount check: `|clientAmount - serverAmount| <= 0.02` (prevents client-side tampering)
- PI `metadata`: `couponId`, `couponCode`, `discountAmount`, `originalAmount`

**SQL pattern — search guard**:
```sql
AND (LEN(@search) <= 2 OR UPPER(c.Code) LIKE @search)
-- <= 2 (not <= 1) because empty search produces '%' + '%' = '%%' which has length 2
```

**DB schema — cascade cycle fix**:
```sql
-- Two paths from Courses to CouponUsage would trigger SQL Server error 1785:
-- Courses → Coupons (CASCADE) → CouponUsage
-- Courses → Transactions (CASCADE) → CouponUsage ← SECOND PATH
-- Solution: secondary path uses NO ACTION
CONSTRAINT FK_CouponUsage_Transaction FOREIGN KEY (TransactionId)
  REFERENCES Transactions(TransactionId) ON DELETE NO ACTION
```

**Mount order critical**: `/api/instructor/revenue` mounted **before** `/api/instructor` in `server/src/index.ts` (more-specific first — avoids prefix swallowing).

**Instructor Revenue Dashboard** (`/instructor/revenue`):
```
client/src/pages/Instructor/InstructorRevenueDashboard.tsx
  │  Stat cards (4): xs={12} sm={6} lg={3} — 1-per-row mobile
  │  Monthly Revenue: Recharts BarChart, 12 months
  │  Course Revenue: Recharts PieChart, top 10 courses
  │  Course Performance table: search + 10/page pagination
  └  Transactions table: search, status, course, sort, 20/page; mobile card ↔ desktop table
```

### Analytics Hub (Audited & Hardened Feb 18, 2026)

**4 route files, all with `authenticateToken` + instructor role guard:**

```
GET    /api/analytics/instructor/course-performance
       → All instructor courses with: enrolledStudents, avgProgress,
         completedStudents, avgTimeSpent (minutes)
       → Used by CoursePerformanceTable (sorted/searched/paginated client-side)

GET    /api/analytics/courses/:id
       → Per-course analytics: studentList, completionFunnel, lessonStats
       → SQL: COUNT DISTINCT to avoid JOIN-multiplied totals
       → Privacy: SettingsService.filterUserData() on all student email fields

GET    /api/analytics/instructor/students/:courseId/at-risk
GET    /api/instructor/at-risk/:courseId           (instructor.ts)
       → At-risk students with RiskFactors (JSON array) + RecommendedInterventions (JSON array)
       → JSON.parse result validated with Array.isArray() guard (Fix #68)
       → Privacy: filterUserData() before response

GET    /api/instructor/low-progress/:courseId      (instructor.ts)
       → Students below progress threshold
       → Privacy: filterUserData() applied

GET    /api/instructor/pending-assessments/:courseId  (instructor.ts)
       → Students with unsubmitted assessments near due date

GET    /api/assessment-analytics/overview/:courseId  (assessment-analytics.ts)
       → assessmentsThisMonth uses COUNT(DISTINCT ...) to avoid inflation from
         submissions LEFT JOIN (Fix #67)
       → Returns: totalAssessments, assessmentsThisMonth, avgScore, passRate

GET    /api/assessment-analytics/student-performance/:courseId  (assessment-analytics.ts)
GET    /api/assessment-analytics/learning-insights/:courseId    (assessment-analytics.ts)

GET    /api/video-analytics/:courseId              (videoAnalytics.ts)
       → Video engagement: avgWatchPercent, completionRate, dropOffPoints
       → Engagement score normalized to prevent div-by-zero (Fix #62)
```

**Critical SQL patterns used in these routes:**
```sql
-- Deduplicate counts inflated by LEFT JOINs
COUNT(DISTINCT CASE WHEN condition THEN col END)

-- NULL-safe name concat
ISNULL(u.FirstName,'') + ' ' + ISNULL(u.LastName,'') AS StudentName

-- UTC timestamps always
DATEADD(month, -1, GETUTCDATE())
```

**Frontend API services (both hardened Feb 18, 2026):**
- `client/src/services/analyticsApi.ts` — env-aware URL, auth + 401 interceptors, Content-Type header
- `client/src/services/assessmentAnalyticsApi.ts` — same pattern

### Course Ratings & Reviews (added Feb 15, 2026)
```
GET    /api/ratings/courses/:id/summary      - Get rating summary (public)
                                              - Returns: { averageRating, totalRatings, distribution: { 1-5: count } }
                                              - Zero state: { averageRating: 0, totalRatings: 0, distribution: {} }

GET    /api/ratings/courses/:id/ratings      - Get paginated reviews (public)
                                              - Query: page (default: 1), limit (default: 10), sort (newest/oldest/highest/lowest)
                                              - Returns: { ratings: [], pagination: { page, limit, total, pages } }
                                              - Ratings include: Id, CourseId, UserId, Rating, ReviewText, CreatedAt, UpdatedAt, FirstName, LastName

GET    /api/ratings/courses/:id/my-rating    - Get user's own rating (auth required)
                                              - Returns: rating object or null
                                              - Used to check if user already rated

POST   /api/ratings/courses/:id              - Submit or update rating (auth required, enrolled only)
                                              - Body: { rating: 1-5 (integer), reviewText?: string (max 2000 chars) }
                                              - Validation: Must be enrolled (active/completed status), cannot be instructor
                                              - Returns: { success, message, rating, isNew: boolean }
                                              - Upsert behavior: Creates or updates existing rating
                                              - **Real-time**: Emits course:updated event with fields: ['rating']
                                              - **Notification**: Sends to instructor (new: priority normal, update: priority low)

DELETE /api/ratings/courses/:id              - Delete own rating (auth required)
                                              - Validates ownership (userId matches rating's userId)
                                              - Recalculates course average and count
                                              - **Real-time**: Emits course:updated event

GET    /api/ratings/instructor/summary       - Instructor's aggregate rating stats (auth required, instructor role)
                                              - Returns aggregated stats across all instructor's courses
                                              - Returns: { totalRatings, averageRating, courseRatings: [] }
```

**Rating System Architecture (Feb 15, 2026):**
- **Database Tables**:
  - `CourseRatings` — Stores individual ratings (Id, CourseId FK, UserId FK, Rating 1-5, ReviewText max 2000, CreatedAt, UpdatedAt)
  - `Courses.Rating` — DECIMAL(3,2) denormalized average (e.g., 4.73)
  - `Courses.RatingCount` — INT denormalized count (for catalog performance)
  - UNIQUE INDEX on (CourseId, UserId) enforces 1 rating per student per course
- **Validation Logic**: `RatingService.canUserRate(userId, courseId)`
  - Must be enrolled (Enrollments.Status IN ('active', 'completed'))
  - Cannot be course instructor (Courses.InstructorId != userId)
  - Returns: { canRate: boolean, reason?: string }
- **Recalculation**: After every CRUD operation
  - Atomically updates Courses.Rating = AVG(rating), Courses.RatingCount = COUNT(*)
  - Single UPDATE query with subquery for atomicity
- **Real-time Flow**:
  1. Student submits/updates/deletes rating via POST/DELETE
  2. RatingService performs CRUD + recalculation
  3. ratings.ts emits: `CourseEventService.emitCourseUpdated(courseId, ['rating'])`
  4. Socket.IO broadcasts to `course-{courseId}` + `courses-catalog` rooms
  5. Frontend hooks (`useCatalogRealtimeUpdates`, `useCourseRealtimeUpdates`) trigger refetch
  6. MyLearningPage, InstructorDashboard, CoursesPage, CourseDetailPage update automatically
- **Notification Integration**:
  - **New Rating**: Title "New Course Rating", Priority "normal", Message "{student} rated \"{course}\" {rating}/5 stars{+ left a review}"
  - **Updated Rating**: Title "Course Rating Updated", Priority "low", Message "{student} updated their rating for \"{course}\" to {rating}/5 stars"
  - ActionUrl: `/courses/{courseId}#reviews` (hash navigation to reviews section)
  - `canUserRate()` prevents self-rating so no self-notification
  - **Preferences**: Controlled by Course Updates → Course Ratings subcategory toggle
  - Uses `createNotificationWithControls({ category: 'course', subcategory: 'CourseRatings' })`

**Frontend Components:**
- **RatingSubmitForm** (199 lines) — Display/edit modes, external edit trigger via `editTrigger` prop
- **RatingSummaryCard** (~120 lines) — Average + distribution bars
- **ReviewCard** (91 lines) — Individual review with 3-dots menu (Edit/Delete for owner)
- **ReviewsList** (130 lines) — Paginated reviews with sort dropdown, real-time `refreshKey` prop
- **Integration**: CourseDetailPage (#reviews section), CoursesPage (cards), MyLearningPage (cards)

**Real-time Updates (Feb 15):**
- **useCatalogRealtimeUpdates** enhanced with `course:updated` listener for rating changes
- **MyLearningPage** now uses `useCatalogRealtimeUpdates()` to refetch enrollments when ratings change
- **CourseDetailPage** uses `realtimeRefetchCounter` in rating useEffect deps for automatic refresh

### Terms & Legal Compliance (added Feb 14, 2026)
```
GET    /api/terms/current                    - Get all active legal documents (public)
                                              - Returns: { termsOfService, privacyPolicy, refundPolicy }
                                              - Each contains: Id, DocumentType, Version, Content (HTML),
                                                EffectiveDate, IsActive

GET    /api/terms/status                     - Check if user accepted latest versions (auth required)
                                              - Returns: { hasAccepted, termsAccepted, privacyAccepted }

POST   /api/terms/accept                     - Record user acceptance (auth required)
                                              - Body: { termsVersionId, privacyVersionId }
                                              - Records: IpAddress, UserAgent for GDPR compliance

GET    /api/terms/:documentType/:version     - Get specific document version (public)
                                              - Types: terms_of_service, privacy_policy, refund_policy
```

### Data Export (added Feb 6, 2026)
```
POST   /api/settings/export-data              - Request user data export
                                              - Rate limit: 3 requests per 24 hours
                                              - Returns: { requestId, status: 'pending' }
                                              
GET    /api/settings/export-data/status      - Get latest export request status
                                              - Returns: { requestId, status, fileName, fileSize, 
                                                          downloadCount, expiresAt, createdAt }
                                              - Statuses: pending, processing, completed, failed, expired
                                              
GET    /api/settings/export-data/download/:requestId  
                                              - Download export ZIP file
                                              - Increments download count
                                              - Verifies ownership + expiry
                                              - Returns: ZIP file with Content-Disposition header
                                              - Errors: 403 (not owner), 404 (not found), 410 (expired)
```

**GDPR Data Export System (Feb 6, 2026):**
- **Purpose**: Fulfill GDPR right to data portability
- **Processing**: Background async jobs via cron (every minute)
- **Output**: ZIP file with 28 JSON + 5 CSV + README
- **Data Scope**: 20+ tables (profile, courses, progress, certificates, messages, AI tutoring, transactions)
- **Resource Limits**: 500MB max size, 1GB min disk space
- **Expiry**: 7 days with automatic cleanup (daily 3 AM UTC)
- **Email Notification**: Beautiful HTML email when export ready
- **Security**: User ownership verification, download tracking
- **Database**: DataExportRequests table with 3 indexes

**Export Package Structure:**
```
mishin-learn-export-TIMESTAMP.zip
├── profile/ (3 files)
│   ├── personal-info.json
│   ├── settings.json
│   └── notification-preferences.json
├── learning/ (7 files)
│   ├── enrollments.json
│   ├── course-progress.json
│   ├── lesson-progress.json
│   ├── video-progress.json
│   ├── assessments.json
│   ├── certificates.json
│   └── learning-activities.json
├── community/ (5 files)
│   ├── comments.json
│   ├── comment-likes.json
│   ├── chat-rooms.json
│   ├── chat-messages.json
│   └── study-groups.json
├── ai-tutoring/ (2 files)
│   ├── sessions.json
│   └── messages.json
├── transactions/ (2 files)
│   ├── payments.json
│   └── invoices.json
├── activity/ (3 files)
│   ├── bookmarks.json
│   ├── notifications.json (last 1000)
│   └── live-sessions.json
├── csv/ (5 files)
│   ├── enrollments.csv
│   ├── course-progress.csv
│   ├── assessments.csv
│   ├── transactions.csv
│   └── certificates.csv
└── README.txt (GDPR compliance info)
```

**Rate Limiting:**
- 3 requests per 24 hours per user
- Counted from RequestedAt timestamp
- 429 Too Many Requests response with error message

**Status Flow:**
```
pending → processing → completed → expired (7 days)
                    ↘ failed (on error)
```

**Background Jobs:**
- `* * * * *` (every minute): ExportJobProcessor.processPendingExports()
- `0 3 * * *` (daily 3 AM): DataExportService.cleanupExpiredExports()

**Components:**
- Backend: DataExportService (812 lines), ExportJobProcessor (313 lines)
- Frontend: SettingsPage export UI with status polling
- Database: DataExportRequests table (14 columns, 3 indexes)

### Instructor Course Management (updated Feb 12, 2026)
```
GET    /api/instructor/courses         - Get instructor's courses with pagination
                                        - Query params: status (all/published/draft), page, limit
                                        - Returns: { courses: [], pagination: {} }
                                        - Level field: lowercase 'level'
                                        - NOW INCLUDES: Prerequisites, LearningOutcomes, Certificate settings, Visibility, PreviewToken

POST   /api/instructor/courses         - Create new course
                                        - Validates & normalizes level to lowercase
                                        - Validates & maps category to database enum
                                        - Returns: { id, message, status }

PUT    /api/instructor/courses/:id     - Update course details
                                        - Validates ownership (instructor can only edit own courses)
                                        - Dynamic updates (only changed fields)
                                        - Normalizes level to lowercase
                                        - Maps category names to database values
                                        - NOW ACCEPTS: prerequisites[], learningOutcomes[], certificateEnabled, certificateTitle, certificateTemplate, visibility
                                        - Stores prerequisites/outcomes as JSON in NVARCHAR(MAX) columns
                                        - Validates certificateTemplate (classic/modern/elegant/minimal)
                                        - Validates certificateTitle (200 char max)
                                        - Validates visibility ('public' | 'unlisted')
                                        - Returns: { message, courseId }

POST   /api/instructor/courses/:id/preview-token  - Generate preview token for draft courses
                                        - Generates UUID token via SQL NEWID()
                                        - Returns: { token: UUID }
                                        - Used for sharing draft courses before publication

GET    /api/instructor/stats           - Get instructor dashboard statistics
GET    /api/instructor/courses/:id/students - Get students enrolled in course
```

**Prerequisites & Learning Outcomes (Added Feb 7, 2026):**
- **Prerequisites Storage**: NVARCHAR(MAX) JSON array of course IDs
- **LearningOutcomes Storage**: NVARCHAR(MAX) JSON array of outcome strings
- **Validation**: Prerequisites must be published courses only
- **Format**: Backend stores JSON strings, API returns parsed arrays

**Certificate Settings (Phase 3 - Added Feb 11, 2026):**
- **CertificateEnabled**: BIT (1=enabled, 0=disabled), defaults to 1
- **CertificateTitle**: NVARCHAR(200), nullable, defaults to course title if NULL
- **CertificateTemplate**: NVARCHAR(50), CHECK constraint (classic/modern/elegant/minimal), defaults to 'classic'
- **Validation**: Backend validates template against whitelist, converts enabled to BIT
- **Format**: All courses return certificate settings in GET responses
- **PDF Generation**: CertificatePdfService uses absolute Y positioning (4 template color schemes)
- **Issuance Guard**: progress.ts checks CertificateEnabled before issuing at 100% completion

**Advanced Visibility Features (Phase 4 - Added Feb 12, 2026):**
- **Visibility**: NVARCHAR(20), CHECK constraint ('public' | 'unlisted'), defaults to 'public'
  - Public courses: Appear in catalog, searchable by all users
  - Unlisted courses: Hidden from catalog, only accessible via direct link `/courses/{id}`
  - Catalog filters by Visibility='public' to exclude unlisted courses
  - Meta endpoints (stats, categories, levels) also filter by Visibility='public'
- **PreviewToken**: UNIQUEIDENTIFIER NULL, generated via SQL NEWID()
  - Allows sharing draft/unpublished courses via `/courses/{id}/preview/{token}`
  - UUID format validation on preview endpoint
  - Used for getting feedback before publication
  - Can be regenerated (invalidates old links)
- **optionalAuth Middleware**: Parses JWT if present, doesn't reject unauthenticated requests
  - Enables dual access patterns (authenticated vs anonymous)
  - Used on GET /api/courses/:id to allow instructor access to own drafts
  - Sets req.user if valid token, otherwise undefined
- **Course Access Control**:
  - Public: Anyone can access published courses via regular URL
  - Instructors: Can view own draft courses via regular URL (WHERE InstructorId = @userId)
  - Preview Mode: Anyone with token can view draft courses via preview URL
  - Frontend blocks all interactive actions in preview mode (enroll, purchase, bookmark, share)

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

### Enrollment, Prerequisites & Controls (updated Feb 10, 2026)
```
POST   /api/enrollment/courses/:id/enroll  - Enroll in course
                                            - Validates enrollment controls (capacity, dates, approval)
                                            - Validates prerequisites before enrollment
                                            - Returns 403 ENROLLMENT_FULL if at capacity
                                            - Returns 403 ENROLLMENT_NOT_OPEN if before open date
                                            - Returns 403 ENROLLMENT_CLOSED if after close date
                                            - Returns 403 PREREQUISITES_NOT_MET if not completed
                                            - Returns 202 with status='pending' if requires approval
                                            - Error includes: { error, message, missingPrerequisites: [{ id, title }] }
                                            - Only checks published prerequisites (ignores deleted)
                                            - Returns 409 if already enrolled
                                            - Returns 402 if payment required

GET    /api/courses/:id/check-prerequisites - Check prerequisite completion status
                                            - Returns ALL prerequisites with completion status
                                            - Returns: { canEnroll, prerequisites[], missingPrerequisites[] }
                                            - Prerequisites include: id, title, progress, isCompleted
                                            - Filters published courses only
                                            - Available to authenticated users
```

**Enrollment Validation Order (Feb 10, 2026):**
```
1. Check if user is course instructor (INSTRUCTOR_SELF_ENROLL error)
2. Check enrollment capacity (MaxEnrollment vs EnrollmentCount)
   - If full → 403 ENROLLMENT_FULL
3. Check enrollment dates (EnrollmentOpenDate, EnrollmentCloseDate)
   - If before open → 403 ENROLLMENT_NOT_OPEN
   - If after close → 403 ENROLLMENT_CLOSED
4. Check course price
   - If price > 0 → 402 PAYMENT_REQUIRED (redirect to checkout)
5. Check prerequisites
   - If incomplete → 403 PREREQUISITES_NOT_MET
6. Check existing enrollment
   - If active → 409 ALREADY_ENROLLED
   - If pending → 409 ENROLLMENT_ALREADY_PENDING
   - If rejected/cancelled → Allow re-enrollment
7. Check approval requirement
   - If RequiresApproval=1 → Create status='pending', return 202
   - Else → Create status='active', return 200
```

**Prerequisite Validation Flow (Feb 7, 2026):**
```
Student clicks Enroll
  ↓
POST /api/enrollment/courses/:id/enroll
  ↓
1. Check if course has prerequisites (parse JSON from Courses.Prerequisites)
2. Query CourseProgress for each prerequisite
   - JOIN Courses ON Id = prerequisiteId
   - WHERE Status = 'published' (ignore deleted courses)
   - Calculate progress: SUM(CompletedLessons) / NULLIF(SUM(TotalLessons), 0) * 100
   - IsCompleted: progress >= 100
3. Filter incomplete prerequisites
4. If any missing:
   - Return 403 with error: "PREREQUISITES_NOT_MET"
   - Include message: "You must complete prerequisite courses before enrolling in this course"
   - Include array: missingPrerequisites [{ id, title }]
5. If all complete:
   - Proceed with enrollment
   - Return 200 with enrollment data
```

**Frontend Error Handling:**
- EnrollmentError interface includes missingPrerequisites array
- CoursesPage catches 403 and displays appropriate error messages:
  - ENROLLMENT_FULL: "This course has reached its maximum capacity"
  - ENROLLMENT_CLOSED: "The enrollment period for this course has closed"
  - ENROLLMENT_NOT_OPEN: "Enrollment for this course opens on [date]"
  - PREREQUISITES_NOT_MET: "You must complete: [course names]"
- CourseCard shows visual chips and disabled buttons for blocked enrollments
- CourseDetailPage disables purchase button when enrollment blocked
- Expected business logic errors don't spam console
- Only unexpected technical errors logged

**Paid Course Approval Workflow (Feb 10, 2026):**
- Paid courses with RequiresApproval=1 show "Request Enrollment" button
- Student clicks → POST /api/enrollment/enroll → status='pending' created (no payment)
- Instructor receives notification → approves/rejects
- If approved → student can proceed to payment (future: payment link in notification)
- Backend payment endpoints validate approval status before charging

### Public Course Endpoints with Visibility & Preview (added Feb 12, 2026)
```
GET    /api/courses/                    - Get public course catalog
                                        - Filters by: Visibility = 'public' AND published = 1
                                        - Unlisted courses NOT returned (even if published)
                                        - Returns: { courses: [], pagination: {} }
                                        - Query params: page, limit, category, level, search

GET    /api/courses/:id                - Get course by ID (uses optionalAuth middleware)
                                        - Public Access: WHERE published = 1 AND Status != 'deleted'
                                        - Instructor Access: WHERE (published OR (InstructorId = @userId AND Status != 'deleted'))
                                        - Allows instructors to view own draft courses via regular URL
                                        - Does NOT filter by visibility (unlisted courses accessible via direct link)
                                        - Strips internal fields: PreviewToken, InstructorId, PasswordHash, IsPublished, Visibility
                                        - Returns 404 for deleted courses or unpublished non-owned courses

GET    /api/courses/:id/preview/:token - Preview course with preview token
                                        - UUID validation via regex: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
                                        - WHERE PreviewToken = @token AND Status != 'deleted'
                                        - Works for ANY course status (draft, published, unlisted)
                                        - Returns course data + IsPreview: true, Status: string
                                        - Strips same internal fields as regular endpoint
                                        - Returns 404 for invalid/missing token or deleted courses
                                        - Frontend uses IsPreview flag to block interactive actions

GET    /api/courses/categories         - Get course categories with counts
                                        - Filters by: Visibility = 'public' AND published = 1
                                        - Unlisted courses excluded from category stats

GET    /api/courses/levels             - Get course levels with counts
                                        - Filters by: Visibility = 'public' AND published = 1
                                        - Unlisted courses excluded from level stats

GET    /api/courses/stats              - Get platform statistics
                                        - Filters by: Visibility = 'public' AND published = 1
                                        - Unlisted courses excluded from total course count
```

**Course Visibility Behavior:**
```
VISIBILITY='public' + published=1:
  - Appears in catalog (GET /courses)
  - Counted in stats/categories/levels
  - Accessible via direct link (/courses/{id})

VISIBILITY='unlisted' + published=1:
  - Hidden from catalog (NOT in GET /courses)
  - NOT counted in stats/categories/levels
  - Accessible ONLY via direct link (/courses/{id})
  - For sharing courses with select audiences without public listing

ANY STATUS + PreviewToken:
  - Accessible via preview URL (/courses/{id}/preview/{token})
  - Works for draft, published, public, unlisted courses
  - Frontend blocks enrollment, purchasing, bookmarking, sharing
  - Yellow banner: "You are viewing a preview of this course"
  - Conditional text: " This course is not yet published" (when status !== 'published')

UNPUBLISHED + instructor owns:
  - Accessible via regular URL (/courses/{id})
  - Blue banner: "This course is currently **{status}**. Only you (the instructor) can see it"
  - Full functionality available to instructor
```

**optionalAuth Middleware (Feb 12, 2026):**
```typescript
// Parses JWT if present, sets req.user, but doesn't reject unauthenticated requests
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Set user if valid token
    } catch {
      // Invalid token: continue without user (don't reject)
    }
  }
  next(); // Always continue, authenticated or not
}

// Used for endpoints that behave differently for authenticated vs anonymous:
// - GET /api/courses/:id - Instructors can view own drafts, others see published only
```

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

**Account Deletion Flow (Updated Feb 4, 2026):**
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
  ├─ Commit transaction or rollback on error
  └─ CASCADE DELETE automatically cleans up:
      ├─ Transactions → Invoices (CASCADE)
      ├─ CourseProgress (CASCADE)
      ├─ EmailTrackingEvents (CASCADE)
      ├─ EmailUnsubscribeTokens (CASCADE)
      ├─ UserProgress, Enrollments, Notifications (CASCADE)
      ├─ NotificationPreferences, UserSettings (CASCADE)
      ├─ UserPresence (CASCADE)
      └─ 15+ other tables (automatic cleanup)
  ↓
Frontend: Logout, navigate to login, show success message

Note: Account deletion emails are security-critical and always sent,
regardless of user notification preferences. All user data is automatically
deleted via CASCADE DELETE for GDPR compliance (Feb 4, 2026 fixes).

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

### Chat System (added Feb 5, 2026)
```
GET    /api/chat/rooms                    - Get user's active conversations (IsActive=1)
GET    /api/chat/rooms/:id/messages       - Get messages with pagination
POST   /api/chat/rooms/:id/messages       - Send message (auto-reactivates participants)
POST   /api/chat/rooms/direct             - Create or reactivate direct message room
POST   /api/chat/rooms/:id/read           - Mark messages as read (updates LastReadAt)
DELETE /api/chat/rooms/:id                - Delete conversation (soft delete, sets IsActive=0)

Socket.IO Events:
  Client → Server: chat:join-room, chat:leave-room, chat:typing-start, chat:typing-stop
  Server → Client: chat:message, chat:user-typing, chat:read, chat:error, chat:user-left, chat:conversation-restored
```

**Chat System Architecture:**
- **Real-time Messaging**: Direct messages between users with Socket.IO delivery
- **Conversation Management**: Soft delete with automatic restoration
- **Privacy Integration**: Respects AllowMessages setting with 403 enforcement
- **Database Tables**:
  - ChatRooms (Id, Name, Type, CourseId nullable, CreatedBy, LastMessageAt, LastMessagePreview, IsActive)
  - ChatMessages (Id, RoomId, UserId, Content, Type, ReplyTo nullable, IsEdited, IsSystemMessage)
  - ChatParticipants (Id, RoomId, UserId, Role, JoinedAt, LeftAt nullable, LastReadAt nullable, IsActive)
  - ChatMessageReadStatus (Id, MessageId, UserId, ReadAt)
- **Constraint Strategy**: ON DELETE NO ACTION for UserId FKs (prevents SQL Server cascade conflicts with Users table)
- **Manual Cleanup**: AccountDeletionService handles chat data deletion during account deletion
- **Indexes**: 5 total (room lookup, message lookup, participant lookup, user messages, read status)

**Conversation Deletion & Restoration (Bug Fixes #23-26):**

**Soft Delete Behavior:**
- DELETE /api/chat/rooms/:id sets ChatParticipants.IsActive = 0, preserves all data
- Preserves LastReadAt timestamp for accurate unread counts after restoration
- getUserRooms() filters by IsActive = 1 (deleted conversations don't appear)

**Automatic Restoration:**
1. **Sending Message** (sendMessage):
   - Tracks inactive participants BEFORE reactivation
   - Sets ALL participants IsActive = 1 (sender + recipients)
   - Checks privacy AFTER reactivation (prevents getDirectMessageRecipient failures)
   - Sends message and emits Socket.IO events
   - Emits `chat:conversation-restored` to previously inactive users (excluding sender)

2. **Creating Conversation** (createDirectMessageRoom):
   - Checks for existing room (includes inactive participants)
   - If exists: Tracks inactive participants, reactivates both users, notifies recipient
   - If not exists: Creates new room, checks privacy, adds both participants
   - Emits `chat:conversation-restored` to recipient if they had deleted conversation

**Real-time Restoration Flow:**
```
User A deletes conversation → User B sends message
  ↓
Backend: Query inactive participants (finds User A)
  ↓
Backend: UPDATE IsActive = 1 for all participants
  ↓
Backend: Send message + emit chat:message to room
  ↓
Backend: Emit chat:conversation-restored to user-${User A}
  ↓
Frontend: User A receives event → adds room to list
  ↓
Result: Conversation reappears for User A with unread badge
```

**Privacy Enforcement:**
- Privacy check happens AFTER participant reactivation
- Prevents "Recipient not found" errors when recipient deleted conversation
- Returns 403 error if recipient has AllowMessages = 0
- Edge case: Recipient reactivated even if privacy blocks message (acceptable UX tradeoff)

**Notification Integration:**
- DirectMessages category with in-app + email support
- Notifications sent only to offline participants (not in Socket.IO room)
- Respects EnableDirectMessages preference
- Instructor messages get "high" priority

**Frontend Components:**
- Chat.tsx (643 lines) - Main UI with real-time updates, conversation list, message view
- UserSearchDialog.tsx (161 lines) - Debounced user search (300ms, min 2 chars)
- chatApi.ts - 7 REST API methods
- socketService.ts - Generic Socket.IO wrapper (emit, on, off, once)

**Backend Services:**
- ChatService.ts (608 lines) - Complete business logic with restoration handling
- routes/chat.ts (182 lines) - REST API endpoints with authenticateToken middleware
- sockets.ts - Socket.IO event handlers for chat

**Bug Fixes:**
- **Bug #23**: Recipients didn't see restored conversations until page refresh → Fixed with chat:conversation-restored events
- **Bug #24**: Senders couldn't message after deleting own conversation → Fixed participant check to verify existence regardless of IsActive
- **Bug #26**: "New Message" button didn't notify recipient → Fixed createDirectMessageRoom to emit restoration events

**Settings Implementation Status (Verified Jan 10, 2026):****
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
- EmailVerificationBanner in DashboardPage
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

**Socket.IO Architecture (Updated February 14, 2026):**
- **Emission Pattern**: ALL socket events emit exclusively from route handlers (after res.json())
- **Service Layer**: Pure data operations, NO socket emissions (exception: CourseEventService)
- **Broadcasting**: Room-based strategy (`course-{id}`, `courses-catalog`, `user-{id}`)
- **Event Types**: 23+ unique events across features
- **Critical Fix**: Removed duplicate emissions from all service classes
- **Example**: Study Groups emits 6 events (member-joined, member-left, member-promoted, member-removed, group-created, group-deleted)
- **Pattern**: Routes get `io` instance from `req.app.get('io')`, emit after successful DB operation
- **Services**: Return data only, add comment `// Note: Socket event is emitted in the route handler, not here`
- **Course Updates**: Centralized CourseEventService with 500ms debounce batches rapid mutations
- **Rooms Auto-Join**: Users join `courses-catalog` on connect, enrolled users join `course-{courseId}` rooms
- **Enrollment Real-time (Feb 14)**: 5 emit sites for pending approvals, approve/reject actions → instant dashboard updates

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
- ✅ **Live Session Starting Soon**: Every 15 minutes cron job checks for sessions 1 hour away - Feb 4, 2026
- ✅ **Study Group Invitation**: Member invites user to join group - Jan 21, 2026
- ✅ **Study Group Member Joined**: All existing members notified when someone joins - Jan 21, 2026
- ✅ **Study Group Member Promoted**: User promoted to admin role with management permissions - Feb 2, 2026
- ✅ **AI Tutoring Response**: AI tutor sends response to user's question - Feb 3, 2026
- 🔜 **9 Remaining**: Direct messages, certificates, badges, interventions, etc.

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

### AI Tutoring (added Feb 3, 2026)
```
POST   /api/tutoring/sessions               - Create new tutoring session (with optional courseId)
GET    /api/tutoring/sessions               - Get user's tutoring sessions
GET    /api/tutoring/sessions/:id/messages  - Get messages for session
POST   /api/tutoring/sessions/:id/message   - Send message & get AI response + notification
DELETE /api/tutoring/sessions/:id           - Delete tutoring session
```

**AI Tutoring Architecture:**
- **OpenAI Integration**: GPT-4o, GPT-4o-mini, GPT-3.5-turbo models
- **Course Context**: Optional courseId links session to specific course for context-aware responses
- **Role Mapping** (CRITICAL):
  ```
  Database Storage: Role = 'user' | 'ai' (CHECK constraint)
       ↓
  Backend Context Building: 'ai' → 'assistant' (OpenAI API requirement)
       ↓
  OpenAI API: messages: [{ role: 'user' | 'assistant', content: '...' }]
       ↓
  Backend Response Storage: 'assistant' → 'ai' (database constraint)
       ↓
  Frontend Display: Checks Role === 'ai' for avatar rendering
  ```
- **Smart Course Dropdown**: Frontend shows enrolled courses for context selection
  - Hybrid dropdown: "General Question" + user's enrolled courses
  - Auto-fills courseId, subject, title when course selected
  - NEW API: `GET /api/enrollment/my-enrollments?limit=100`
- **Notification Trigger**: Sends notification after AI response
  - Type: 'community', Category: 'community', Subcategory: 'AITutoring'
  - Message: "Your AI tutor answered your question about \"{title}\""
  - Action URL: `/tutoring?session={sessionId}` with "View Response" button
  - Email subject: "👥 Community Update" with purple gradient
  - Respects EnableAITutoring and EmailAITutoring preferences
- **Database Tables**: 
  - TutoringSessions (SessionID, UserId, CourseId nullable, Subject, Model, CreatedAt, UpdatedAt)
  - TutoringMessages (MessageID, SessionID, Role 'user'|'ai', Content, Timestamp)
- **Frontend**: Tutoring.tsx with auto-updating timestamps, session management, model selection

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
- **Subcategories**: 54 Enable*/Email* pairs (LessonCompletion, VideoCompletion, CourseMilestones, EnrollmentSuspended, EnrollmentCancelled, etc.)
- **Case**: All PascalCase (EnableInAppNotifications, EnableLessonCompletion) - backend, frontend, API aligned
- **NULL Inheritance**: Subcategory NULL = inherits category value
- **Time format**: SQL Server TIME type, HTML5 HH:mm input
- **UPSERT logic**: Creates default record if doesn't exist, updates dynamically (all 68 fields)
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
  ↓ (SELECT all 68 PascalCase fields from NotificationPreferences table)
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
  ├─ Course Updates (12 subcategories × 2 toggles = 24 switches) ⭐ Updated Feb 10, 2026
  ├─ Assessment Updates (14 subcategories × 2 toggles = 28 switches)
  ├─ Community Updates (10 subcategories × 2 toggles = 20 switches)
  └─ System Alerts (10 subcategories × 2 toggles = 20 switches)
  ↓ (user edits any of 68 fields)
Click "Save Settings"
  ↓
notificationPreferencesApi.updatePreferences(preferences)
  ↓ (PATCH /api/notifications/preferences)
Send all 68 fields as-is (PascalCase, no conversion)
  ↓
Backend NotificationService.updatePreferences()
  ├─ Check if record exists
  ├─ Create default if not (UPSERT)
  ├─ Build dynamic UPDATE query with all provided fields
  └─ Update NotificationPreferences table (all 68 columns)
  ↓
Toast: "Notification settings saved!"

✅ FULLY FUNCTIONAL (Dec 29, 2025, Enhanced Feb 10, 2026):
├─→ 3-level cascade: Global → Category → Subcategory (NULL inheritance)
├─→ NotificationService.shouldSendNotification() enforces all levels
├─→ Quiet Hours: Queue notification in NotificationQueue table
├─→ Type Filtering: Skip if global/category/subcategory disabled
├─→ Cron Job: Runs every 5 minutes, processes queue
├─→ All 68 settings persist correctly across sessions
├─→ Dedicated enrollment toggles: Suspended, Cancelled (Feb 10, 2026)
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
  ├─ subcategory: 'LessonCompletion' | 'VideoCompletion' | 'LiveSessions' | 'EnrollmentSuspended' | etc.
  └─ type: 'in-app' | 'email' | 'both'
  ↓
getUserPreferences(userId) → Get all 68 fields
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
- `office-hours-lobby` - All `/office-hours` page visitors (auto-join on mount); receives `schedule-changed` broadcasts when instructor creates/updates/deletes a schedule — triggers Available Now panel refresh (Added March 3, 2026)
- `office-hours-${instructorId}` - Instructor + waiting students (queue events: `queue-updated`, `office-hours-admitted`, `office-hours-completed`, `office-hours-cancelled`)

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
| **instructorApi** | `instructorApi.ts` | Instructor features | createCourse, updateCourse, getStudents, getCourses (paginated, limit=12), **getCoursesForDropdown** (all, limit=10000) |
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

**TermsVersions (Added Feb 14, 2026)**
- Id, DocumentType ('terms_of_service' | 'privacy_policy' | 'refund_policy')
- Version, Content (NVARCHAR MAX - HTML), EffectiveDate, IsActive, CreatedAt
- Unique filtered index: One active version per DocumentType

**UserTermsAcceptance (Added Feb 14, 2026)**
- Id, UserId (FK → Users), TermsVersionId (FK → TermsVersions)
- AcceptedAt, IpAddress, UserAgent (GDPR compliance)
- Pattern: Only terms_of_service + privacy_policy require acceptance (refund_policy is informational)

---

## 📁 FRONTEND STRUCTURE

### Page Components (Entry Points)

```
pages/
├── Auth/
│   ├── LoginForm.tsx - Login page
│   ├── RegisterForm.tsx - Registration (includes TOS/Privacy acceptance)
│   └── ForgotPasswordForm.tsx - Password reset
├── Legal/
│   ├── TermsOfServicePage.tsx - Terms of Service (database-driven)
│   ├── PrivacyPolicyPage.tsx - Privacy Policy (database-driven)
│   └── RefundPolicyPage.tsx - Refund Policy (informational)
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
│   └── index.ts - Barrel exports
├── Layout/
│   ├── Layout.tsx - Main layout wrapper
│   └── PublicLayout.tsx - Public pages layout
├── Responsive/
│   ├── constants.ts - Layout dimension constants (BOTTOM_NAV_HEIGHT, HEADER_HEIGHT, PAGE_PADDING_X, etc.)
│   ├── useResponsive.ts - Hook: { isMobile, isTablet, isDesktop, isSmallMobile }
│   ├── PageContainer.tsx - Authenticated page wrapper with responsive px + bottom-nav padding
│   ├── PageTitle.tsx - Responsive h4/h5 typography for page headings
│   ├── ResponsiveDialog.tsx - Dialog with auto-fullScreen on mobile
│   ├── ResponsivePaper.tsx - Paper with responsive padding
│   ├── ResponsiveStack.tsx - Stack that switches direction at configurable breakpoint
│   └── index.ts - Barrel export
├── Dashboard/
│   ├── StatCard.tsx - Dashboard stat display card
│   ├── CourseCard.tsx - Dashboard course card with progress
│   └── AchievementBadge.tsx - Achievement display badge
├── Video/
│   ├── VideoPlayer.tsx - Video player with progress
│   └── VideoTranscript.tsx - Interactive transcript
├── Lesson/
│   ├── ContentItem.tsx - Router: delegates to Video/Text/Quiz renderer by content.type
│   ├── VideoContentItem.tsx - Video content with player, transcript, progress
│   ├── TextContentItem.tsx - Text/article content with Markdown/HTML
│   └── QuizContentItem.tsx - Quiz placeholder content
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
