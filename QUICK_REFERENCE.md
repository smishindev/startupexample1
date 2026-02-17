# 🚀 Quick Reference - Development Workflow

**Last Updated**: February 17, 2026 - Search Autocomplete System 🔍

---

## 🔍 Search Autocomplete System (Added Feb 17, 2026)

**Reusable Udemy-style live search dropdown with debouncing, keyboard navigation, and highlighted matches**

### Component Usage
```tsx
import { SearchAutocomplete } from '../components/Search/SearchAutocomplete';

// Header variant (compact)
<SearchAutocomplete
  variant="header"
  placeholder="Search courses..."
  testIdPrefix="header-search"
/>

// Hero variant (larger, with button)
<SearchAutocomplete
  variant="hero"
  placeholder="What do you want to learn?"
  showButton
  onSubmit={(query) => navigate(`/courses?search=${encodeURIComponent(query)}`)}
  testIdPrefix="hero-search"
/>
```

### Props
```typescript
interface SearchAutocompleteProps {
  variant: 'header' | 'hero';          // Visual style
  placeholder?: string;                 // Input placeholder
  onSubmit?: (query: string) => void;   // Custom submit (default: navigate to /courses?search=...)
  testIdPrefix?: string;                // Test ID prefix
  showButton?: boolean;                 // Show search button (hero only)
}
```

### Features
- **Debounced Search**: 300ms delay, minimum 2 characters
- **Keyboard Navigation**: Arrow Up/Down cycle, Enter selects, Escape closes
- **Highlighted Matches**: Query text in bold primary color
- **Loading States**: Spinner + "Searching courses..." message
- **Empty State**: "No courses found" with suggestions
- **Race Guard**: Request ID counter prevents stale results
- **Cleanup**: Clears debounce on navigation/unmount

### Integration Sites
1. **PublicHeader** (guest) — Desktop + mobile drawer
2. **HeaderV5** (authenticated) — Desktop + mobile expand/collapse
3. **LandingPage** — Hero section with button and custom submit

### API Endpoint
```
GET /api/courses?search={query}&limit=6
Returns: Course[] with Id, Title, Thumbnail, Instructor, Rating, Price
```

### Bug Fixes Applied
1. **Regex global flag**: Separate regex for split (with 'g') and test (without 'g')
2. **DOM prop warning**: Renamed `variant` → `searchVariant` with `shouldForwardProp`
3. **Race condition**: Request ID counter (`requestIdRef`)
4. **Arrow key crash**: Guard modulo with `if (totalItems > 0)`
5. **Stale debounce**: Clear timer in submit/result/viewAll handlers

### Related Fixes
- **FooterCategories**: Added marketing, language, science, arts (9 total)
- **CoursesPage URL sync**: `useEffect` syncs `searchParams` → state
- **Category formatting**: `formatCategory('data_science')` → "Data Science"

---

## Course Ratings & Reviews System (Added Feb 15, 2026)

**Complete 5-star rating system with text reviews, real-time updates, and instructor notifications**

### Architecture
- **Database**: `CourseRatings` table (ratings + reviews) + denormalized `Rating`/`RatingCount` columns on `Courses`
- **Real-time**: Emits `course:updated` event with `fields: ['rating']` after rating CRUD
- **Notifications**: Instructor notified on new ratings (priority: normal) and updated ratings (priority: low)
- **Validation**: Must be enrolled (active/completed), instructors cannot rate own courses, 1 rating per student per course

### API Endpoints
```
GET    /api/ratings/courses/:id/summary      - Get rating summary (average, count, distribution)
                                              Returns: { averageRating, totalRatings, distribution }
GET    /api/ratings/courses/:id/ratings      - Get paginated reviews (public)
                                              Query: page, limit, sort (newest/oldest/highest/lowest)
                                              Returns: { ratings[], pagination }
GET    /api/ratings/courses/:id/my-rating    - Get user's own rating (auth)
                                              Returns: { rating } or null
POST   /api/ratings/courses/:id              - Submit or update rating (auth, enrolled only)
                                              Body: { rating: 1-5, reviewText?: string (max 2000) }
                                              Returns: { success, message, rating, isNew }
DELETE /api/ratings/courses/:id              - Delete own rating (auth)
GET    /api/ratings/instructor/summary       - Instructor's aggregate rating stats (auth, instructor)
```

### Frontend Components
```
RatingSubmitForm      → Star rating form with edit/delete (editTrigger prop for external edit)
RatingSummaryCard     → Average rating + distribution bars
ReviewCard            → Individual review with 3-dots menu (Edit/Delete for owner)
ReviewsList           → Paginated reviews with sort dropdown
```

### Real-time Updates
```
Server: CourseEventService.emitCourseUpdated(courseId, ['rating'])
        → Broadcast to course-{courseId} + courses-catalog rooms

Frontend: useCatalogRealtimeUpdates() listens to 'course:updated' event
          → MyLearningPage, InstructorDashboard, CoursesPage refetch
          CourseDetailPage: realtimeRefetchCounter in useEffect deps
          → Rating summary + reviews list refresh automatically
```

### Key Patterns
```typescript
// Validation: RatingService.canUserRate()
// - Must be enrolled (active/completed status)
// - Cannot be course instructor
// - Returns { canRate: boolean, reason?: string }

// Submit/Update: Returns { isNew: boolean } for notification logic
// - isNew = true  → send "New Course Rating" notification (priority: normal)
// - isNew = false → send "Course Rating Updated" notification (priority: low)
// Respects user preferences: Settings → Course Updates → Course Ratings toggle
// Uses createNotificationWithControls({ category: 'course', subcategory: 'CourseRatings' })

// Real-time: editTrigger prop mechanism
// - CourseDetailPage: editTrigger state increments on "Edit Review" click
// - RatingSubmitForm: useEffect watches editTrigger, syncs form state, switches to edit mode
```

### Database Schema
- `CourseRatings` — Id, CourseId FK, UserId FK, Rating (1-5 INT), ReviewText (NVARCHAR 2000), CreatedAt, UpdatedAt
- `Courses.Rating` — DECIMAL(3,2) average rating (e.g., 4.73)
- `Courses.RatingCount` — INT total ratings
- UNIQUE INDEX on (CourseId, UserId) prevents duplicate ratings

### Key Files
- Backend: `server/src/services/RatingService.ts` (288 lines), `server/src/routes/ratings.ts` (193 lines)
- Frontend: `client/src/services/ratingApi.ts`, `client/src/components/Rating/*` (4 components)
- Pages: CourseDetailPage.tsx, CoursesPage.tsx, MyLearningPage.tsx (all show ratings)
- Hooks: useCatalogRealtimeUpdates.ts (added `course:updated` listener for rating changes)

---

## Terms of Service, Privacy Policy & Refund Policy (Added Feb 14, 2026)

**Database-driven legal compliance system with versioned documents, user acceptance tracking, and GDPR-compliant consent**

### Architecture
- **Database-driven**: All legal documents stored in `TermsVersions` table with version tracking
- **Acceptance tracking**: `UserTermsAcceptance` table records when users accepted which version
- **Consent gate**: Registration requires explicit TOS + Privacy Policy acceptance
- **Banner enforcement**: `TermsConsentBanner` blocks app usage until latest terms accepted
- **Refund Policy**: Informational only — does NOT require user acceptance

### API Endpoints
```
GET    /api/terms/current                    - Get all active legal documents
                                              Returns: { termsOfService, privacyPolicy, refundPolicy }
GET    /api/terms/status                     - Check if user accepted latest versions
                                              Returns: { hasAccepted, termsAccepted, privacyAccepted }
POST   /api/terms/accept                     - Record user acceptance
                                              Body: { termsVersionId, privacyVersionId }
GET    /api/terms/:documentType/:version     - Get specific document version
                                              Types: terms_of_service, privacy_policy, refund_policy
```

### Frontend Routes
```
/terms              → TermsOfServicePage.tsx     (public, no auth)
/privacy            → PrivacyPolicyPage.tsx       (public, no auth)
/refund-policy      → RefundPolicyPage.tsx        (public, no auth)
```

### Key Patterns
```typescript
// Registration: checkbox required, sends termsVersionId + privacyVersionId
// Login: middleware checks acceptance, returns needsTermsAcceptance flag
// TermsConsentBanner: overlay blocks navigation until accepted (skips /terms, /privacy, /refund-policy)
// Middleware: requireTermsAcceptance only checks terms_of_service + privacy_policy (NOT refund_policy)
```

### Database Tables
- `TermsVersions` — DocumentType ('terms_of_service' | 'privacy_policy' | 'refund_policy'), Version, Content (HTML), IsActive
- `UserTermsAcceptance` — UserId, TermsVersionId, AcceptedAt, IpAddress, UserAgent

### Key Files
- Backend: `server/src/routes/terms.ts`, `server/src/middleware/auth.ts` (requireTermsAcceptance)
- Frontend: `client/src/services/termsApi.ts`, `client/src/components/Legal/TermsConsentBanner.tsx`
- Pages: `client/src/pages/Legal/TermsOfServicePage.tsx`, `PrivacyPolicyPage.tsx`, `RefundPolicyPage.tsx`
- Schema: `database/schema.sql` (TermsVersions + UserTermsAcceptance tables)

---

## Real-time Course Updates (Added Feb 13, 2026)

**Automatic page refreshes when instructors edit courses — no manual refresh needed**

### Events Broadcasted
```typescript
// Server emits (CourseEventService):
'course:updated'             // Course metadata or lessons changed
'course:catalog-changed'     // Catalog-visible changes (publish, unpublish, delete)
'course:enrollment-changed'  // Enrollment count changed (includes pending approvals, approve/reject - Feb 14)

// Rooms:
`course-{courseId}`    // Enrolled students + instructors
`courses-catalog`      // All authenticated users (auto-joined on connect)
```

### Enrollment Real-time Updates (Feb 14, 2026)
**Pending approvals and status changes update instantly**
- When student requests enrollment → Instructor dashboard shows new pending approval (no refresh)
- When instructor approves/rejects → Student's course card status updates instantly
- "Requested X minutes ago" timestamps auto-refresh every 60 seconds
- 5 total emit sites in enrollment flow:
  - `POST /api/enrollment/enroll` → emits when creating pending enrollment
  - `POST /api/enrollment/re-enroll` → emits when re-enrolling from rejected/cancelled (if pending created)
  - `POST /api/instructor/courses/:id/enrollments/:enrollmentId/approve` → emits for all course types
  - `POST /api/instructor/courses/:id/enrollments/:enrollmentId/reject` → emits on rejection
  - `POST /api/courses/:id/checkout/confirm` → emits on completed payment (existing)
- Frontend: InstructorDashboard uses `useCatalogRealtimeUpdates` to refresh pending list + stats
- Frontend: CoursesPage uses `useCatalogRealtimeUpdates` to refresh enrollment statuses
- Pattern: Silent refetch on emit (loadPendingEnrollments, loadStats, loadCourses with search-loading)

### Frontend Integration
```typescript
// CourseDetailPage - Silent refetch on updates
import { useCourseRealtimeUpdates } from '../hooks/useCourseRealtimeUpdates';

useCourseRealtimeUpdates(courseId, () => {
  setRealtimeRefetchCounter(prev => prev + 1); // Triggers refetch
});

// CoursesPage - Lighter search-loading on catalog changes
import { useCatalogRealtimeUpdates } from '../hooks/useCatalogRealtimeUpdates';

useCatalogRealtimeUpdates(() => {
  loadCourses(true); // true = search-loading, not full spinner
  loadCategories();
  loadLevels();
});
```

### Debouncing Strategy
- **Server**: 500ms debounce per course (batches rapid edits)
- **CourseDetailPage**: 300ms client debounce
- **CoursesPage**: 500ms client debounce
- **Result**: 10 rapid instructor saves → 1 update event → 1 frontend refetch

### Silent Refetch Pattern
```typescript
// Shows loading spinner ONLY on initial load or course navigation
const isInitialLoad = !course || course.id !== courseId;
if (isInitialLoad) {
  setLoading(true);
}
// Real-time updates swap data silently (no spinner, preserves scroll)
```

### Backend Architecture
```typescript
// All emit sites follow this pattern:
res.json({ success: true }); // Response sent FIRST

try { // Isolated try-catch (won't crash route or trigger Stripe retry)
  CourseEventService.getInstance().emitCourseUpdated(courseId, ['title', 'description']);
} catch (e) {
  console.error('[Route] Emit failed:', e);
}
```

### Files Modified (16 files)
- **New**: CourseEventService.ts, useCourseRealtimeUpdates.ts, useCatalogRealtimeUpdates.ts
- **Backend**: sockets.ts, index.ts, instructor.ts, lessons.ts, enrollment.ts, students.ts, payments.ts, StripeService.ts, CourseManagementService.ts
- **Frontend**: socketService.ts, CourseDetailPage.tsx, CoursesPage.tsx

---

## Advanced Visibility - Phase 4 (Added Feb 12, 2026)

**Control course visibility and share preview links for draft courses**

### Quick Usage - Instructor
```typescript
// Navigate to course Settings tab
navigate(`/instructor/courses/$\{courseId\}/edit?tab=3`);

// CourseSettingsEditor visibility section:
// - Visibility radio: public (in catalog) or unlisted (direct link only)
// - Direct link display for unlisted+published courses with copy button
// - Preview token section: generate/copy/regenerate preview links

// Share preview link for draft course:
// 1. Click "Generate Preview Link" button
// 2. Copy preview URL: /courses/\{id\}/preview/\{token\}
// 3. Share with select individuals for feedback
// Preview links work for any course status (draft, published, unlisted)
```

### Visibility Options
```typescript
const VISIBILITY = \{
  public: \{
    icon: 'PublicIcon',
    label: 'Public',
    description: 'Visible in course catalog and search results'
  \},
  unlisted: \{
    icon: 'LinkIcon',
    label: 'Unlisted',
    description: 'Only accessible via direct link (hidden from catalog)'
  \}
\};

// Public courses: Appear in GET /api/courses/, counted in stats
// Unlisted courses: Hidden from catalog, accessible at /courses/\{id\} with direct link
```

### API Behavior
```
PUT /api/instructor/courses/:id
  Body: \{ visibility: 'public' | 'unlisted' \}
  Validation: Must be one of: 'public', 'unlisted'

POST /api/instructor/courses/:id/preview-token
  Generates UUID token via SQL NEWID()
  Returns: \{ token: UUID \}
  Use: Share draft courses before publication

GET /api/courses/
  WHERE Visibility = 'public' AND published = 1
   Unlisted courses NOT returned (even if published)

GET /api/courses/:id (optionalAuth middleware)
  Public: WHERE published = 1 AND Status != 'deleted'
  Instructor: WHERE (published OR (InstructorId = @userId AND Status != 'deleted'))
   NO visibility filter (unlisted accessible via direct link)
   Instructors can view own drafts via regular URL

GET /api/courses/:id/preview/:token
  WHERE PreviewToken = @token AND Status != 'deleted'
  Returns: course data + IsPreview: true, Status: string
  Works for ANY status (draft, published, unlisted)
```

### Frontend Components
```typescript
// CourseSettingsEditor - Visibility + Preview UI
interface VisibilitySettings \{
  visibility: 'public' | 'unlisted';
  previewToken: string | null;
\}

// CourseDetailPage - Preview mode detection
const \{ courseId, previewToken \} = useParams<\{ courseId: string; previewToken?: string \}>();
const isPreviewMode = !!previewToken;

// Preview mode banners:
// - Yellow warning banner: "You are viewing a preview of this course" + conditional "not yet published"
// - Blue info banner for instructors: "This course is currently **\{status\}**. Only you can see it"

// Preview mode security guards (all return early with toast):
if (isPreviewMode) \{
  handleEnroll: "Enrollment is not available in preview mode"
  handlePurchase: "Purchasing is not available in preview mode"
  handleBookmark: "Bookmarking is not available in preview mode"
  handleShare: "Sharing is not available in preview mode"
\}
```

### Routes
```typescript
<Route path="/courses/:courseId" element=\{<CourseDetailPage />\} />
<Route path="/courses/:courseId/preview/:previewToken" element=\{<CourseDetailPage />\} />
```

### Database Schema
```sql
-- Courses table (2 new columns)
Visibility NVARCHAR(20) NOT NULL DEFAULT 'public' 
  CHECK (Visibility IN ('public', 'unlisted')),
PreviewToken UNIQUEIDENTIFIER NULL
```

### Features
- **Fine-Grained Visibility**: Public (in catalog) vs Unlisted (direct link only)
- **Draft Preview Sharing**: UUID tokens for sharing unpublished courses
- **Instructor Draft Access**: View own drafts via regular URL with info banner
- **Preview Mode Security**: All interactive actions blocked (enroll, purchase, bookmark, share)
- **UUID Validation**: Invalid tokens return 404 with clear error messages
- **Token Regeneration**: Invalidates old preview links for security
- **No Stats Inflation**: Unlisted courses excluded from catalog/stats
- **optionalAuth Middleware**: Dual authenticated/anonymous access patterns

---

## � Certificate Settings - Phase 3 (Added Feb 11, 2026)

**Customize certificate issuance per course**

### Quick Usage - Instructor
```typescript
// Navigate to course Settings tab
navigate(`/instructor/courses/${courseId}/edit?tab=3`);

// CourseSettingsEditor form fields:
// - Certificate Enabled (toggle) - Enable/disable certificate issuance
// - Certificate Title (text, 200 char) - Optional custom title (defaults to course title)
// - Certificate Template (visual cards) - 4 templates: classic, modern, elegant, minimal
```

### Templates
```typescript
const TEMPLATES = {
  classic: { color: '#1a237e', name: 'Classic', description: 'Traditional navy blue with sharp serif font' },
  modern: { color: '#00838f', name: 'Modern', description: 'Clean teal with sans-serif typography' },
  elegant: { color: '#4a148c', name: 'Elegant', description: 'Purple with decorative script font' },
  minimal: { color: '#37474f', name: 'Minimal', description: 'Minimalist gray design' }
};
```

### API Behavior
```
PUT /api/instructor/courses/:id
  Body: { certificateEnabled, certificateTitle, certificateTemplate }
  Validation:
    - certificateEnabled: Converted to BIT (1/0)
    - certificateTitle: Max 200 characters, nullable
    - certificateTemplate: Must be one of: classic|modern|elegant|minimal

GET /api/courses/:id
  Returns: { ...course, CertificateEnabled: boolean }

Certificate Issuance Flow (progress.ts):
  - Student reaches 100% course completion
  - Query CertificateEnabled from Courses table
  - If disabled: Skip certificate issuance
  - If enabled: Issue with custom title and template
  - Always send course completion notification (outside guard)
```

### Frontend Components
```typescript
// CourseSettingsEditor - Certificate Settings UI
interface CertificateSettings {
  certificateEnabled: boolean;
  certificateTitle: string;
  certificateTemplate: 'classic' | 'modern' | 'elegant' | 'minimal';
}

// Visual template selector with 4 cards showing color previews
// Selected card has 3px primary border, others 1px gray
// Character counter shows "X/200 characters" below title field
```

### Database Schema
```sql
-- Courses table (3 new columns)
CertificateEnabled BIT NOT NULL DEFAULT 1,
CertificateTitle NVARCHAR(200) NULL,
CertificateTemplate NVARCHAR(50) NOT NULL DEFAULT 'classic' 
  CHECK (CertificateTemplate IN ('classic', 'modern', 'elegant', 'minimal'))
```

### PDF Generation
```typescript
// CertificatePdfService.ts
// - 4 template color schemes with distinct typography
// - Absolute Y positioning (no moveDown()) guarantees single-page layout
// - Custom title: courseInfo.CertificateTitle || courseInfo.Title
// - Template queried separately from database for PDF generation
```

---

## �🎯 Enrollment Controls (Added Feb 10, 2026)

**Manage course capacity, enrollment timing, and approval requirements**

### Quick Usage - Instructor
```typescript
// Navigate to course Settings tab
navigate(`/instructor/courses/${courseId}/edit?tab=3`);

// CourseSettingsEditor form fields:
// - Maximum Enrollment (number, nullable) - NULL = unlimited
// - Enrollment Open Date (datetime-local, nullable) - NULL = always open
// - Enrollment Close Date (datetime-local, nullable) - NULL = never closes
// - Requires Approval (checkbox) - Creates pending enrollments
```

### Quick Usage - Student
```typescript
// Check if enrollment is available
const course = await coursesApi.getCourse(courseId);

// Check capacity
if (course.MaxEnrollment && course.EnrollmentCount >= course.MaxEnrollment) {
  // Course is full
}

// Check dates
const now = new Date();
if (course.EnrollmentOpenDate && new Date(course.EnrollmentOpenDate) > now) {
  // Enrollment not yet open
}
if (course.EnrollmentCloseDate && new Date(course.EnrollmentCloseDate) < now) {
  // Enrollment has closed
}

// Enroll (will be blocked by backend if controls prevent it)
try {
  const result = await enrollmentApi.enrollInCourse(courseId);
  if (result.status === 'pending') {
    // Requires approval - awaiting instructor decision
  }
} catch (error) {
  // Possible errors:
  // - 403 ENROLLMENT_FULL
  // - 403 ENROLLMENT_NOT_OPEN
  // - 403 ENROLLMENT_CLOSED
}
```

### API Behavior
```
POST /api/enrollment/courses/:id/enroll
  Validation order:
    1. Instructor self-enroll check
    2. Capacity (MaxEnrollment vs EnrollmentCount)
    3. Date range (EnrollmentOpenDate, EnrollmentCloseDate)
    4. Approval+Price check:
       - If RequiresApproval AND Price > 0: creates status='pending' (approval first, pay later)
       - If Price > 0 (no approval): returns 402 PAYMENT_REQUIRED
    5. Prerequisites
    6. Existing enrollment (handles pending, approved, rejected, cancelled, completed)
    7. Approval requirement for free courses (creates status='pending')

  Enrollment statuses: pending → approved → active (paid+approval)
                       pending → active (free+approval)
                       active (no approval)

PUT /api/instructor/enrollments/:id/approve
  - Free course: sets status='active', increments EnrollmentCount
  - Paid course: sets status='approved', sends notification with checkout link
  - EnrollmentCount incremented AFTER payment for paid courses

PUT /api/students/:studentId/enrollment/:enrollmentId (Updated Feb 11, 2026)
  - SECURITY: Payment verification for paid courses
  - Queries Transactions table for completed payments
  - Blocks approved→active if no payment (400 PAYMENT_REQUIRED)
  - Allows cancelled→active if payment exists (re-activation)
  - Allows approved→active if payment exists (webhook recovery)
  - Overrides pending/cancelled/rejected→active to 'approved' if no payment
  - Returns status in response for frontend feedback

GET /api/courses/:id
  Returns: MaxEnrollment, EnrollmentCount, EnrollmentOpenDate, 
           EnrollmentCloseDate, RequiresApproval
```

### Frontend Components
```typescript
// CourseCard - Shows capacity and date status
interface Course {
  maxEnrollment?: number | null;
  enrolledStudents: number;
  enrollmentOpenDate?: string | null;
  enrollmentCloseDate?: string | null;
}

// Button states:
// "Enroll Now" (enabled)
// "Course Full" (disabled, red chip)
// "Enrollment Closed" (disabled, orange chip)
// "Not Yet Open" (disabled, blue chip)

// CourseDetailPage button priority:
// 1. Instructor → "Manage Course"
// 2. Active/Completed → "Continue Learning"
// 3. Pending → "⏳ Awaiting Instructor Approval" (disabled)
// 4. Approved + Paid → "✅ Approved — Complete Purchase" (links to checkout)
// 5. Paid + RequiresApproval → "Request Enrollment - $X"
// 6. Paid (no approval) → "Purchase Course - $X"
// 7. Free → "Enroll For Free"

// For paid courses with approval:
// Student requests → pending → instructor approves → approved → student pays → active
// No payment until approved. No access until paid.
```

### Database Schema
```sql
-- Courses table
MaxEnrollment INT NULL              -- NULL = unlimited
EnrollmentOpenDate DATETIME2 NULL   -- NULL = always open
EnrollmentCloseDate DATETIME2 NULL  -- NULL = never closes
RequiresApproval BIT NOT NULL DEFAULT 0  -- 1 = creates pending enrollments

-- Enrollments table Status values
-- 'pending'    - Awaiting instructor approval
-- 'approved'   - Approved by instructor, awaiting payment (paid courses only)
-- 'active'     - Fully enrolled with course access
-- 'completed'  - Course completed
-- 'cancelled'  - Student cancelled
-- 'rejected'   - Instructor rejected
-- 'suspended'  - Admin suspended
```

### Features
- **UI Polish**: Clear "x" buttons on all fields, "Clear All" buttons for lists
- **Visual Feedback**: Color-coded chips (Full/Closed/Not Open), disabled buttons with stopPropagation
- **Consistency**: All enrollment paths enforce controls (cards, detail page, checkout)
- **Paid Course Safety**: Approval required before payment for RequiresApproval courses
- **Error Handling**: User-friendly messages with specific error codes

---

## 🎓 Course Prerequisites & Learning Outcomes (Added Feb 7, 2026)

**Instructor workflow for setting course prerequisites and learning outcomes**

### Quick Usage - Instructor
```typescript
// Navigate to course Settings tab
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate(`/instructor/courses/${courseId}/edit?tab=3`);

// CourseSettingsEditor automatically loads
// 1. Select prerequisite courses (autocomplete)
// 2. Add learning outcomes (dynamic list)
// 3. Click Save
```

### Quick Usage - Student
```typescript
// View course with prerequisites
import { coursesApi } from '@/services/coursesApi';

// Check if student can enroll
const result = await coursesApi.checkPrerequisites(courseId);
console.log(result.canEnroll); // boolean
console.log(result.prerequisites); // Array with completion status
console.log(result.missingPrerequisites); // Array of courses to complete

// Enroll in course (will fail if prerequisites not met)
try {
  await enrollmentApi.enrollInCourse(courseId);
} catch (error) {
  // Error message: "You must complete the following prerequisite course(s) before enrolling: [course names]"
}
```

### API Endpoints
```
GET    /api/instructor/courses              - Returns prerequisites and learningOutcomes arrays
PUT    /api/instructor/courses/:id          - Accepts prerequisites and learningOutcomes
GET    /api/courses/:id/check-prerequisites - Returns ALL prerequisites with completion status
POST   /api/enrollment/courses/:id/enroll   - Validates prerequisites before enrollment (403 if not met)
```

### Data Format
```typescript
// Backend storage (NVARCHAR(MAX) JSON)
Prerequisites: ["B58FE297-E8D0-4AD5-91F9-EAD985620C00", "A1234567-..."]  
LearningOutcomes: ["Understand React hooks", "Build full-stack apps", "Deploy to production"]

// Frontend interface
interface PrerequisiteCheck {
  canEnroll: boolean;
  prerequisites: Array<{
    id: string;
    title: string;
    progress: number;       // 0-100
    isCompleted: boolean;   // true if progress >= 100
  }>;
  missingPrerequisites: Array<{ id: string; title: string }>;
}
```

### Features
- **Validation**: Only published courses can be prerequisites (filters deleted/draft)
- **Circular Prevention**: Current course excluded from prerequisite selection
- **Completion Tracking**: Shows progress percentage for in-progress courses
- **User Experience**: Clear error messages, visual indicators (✅⏳❌), disabled enrollment button
- **Error Handling**: Expected business logic errors don't spam console

### Components
- **CourseSettingsEditor** (242 lines) - Instructor UI in Settings tab
- **CourseDetailPage** - Student view with prerequisites display
- **CoursesPage** - Enhanced error handling for enrollment

---

## 🔧 Code Quality Standards (Feb 7, 2026)

**Current Status**: Grade A (95/100)

**TypeScript Type Safety**:
```typescript
// ✅ DO: Use typed interfaces from types/database.ts
import { UserInfo, FilteredUser, Transaction } from '../types/database';

function getUser(userId: string): Promise<UserInfo> { ... }
function filterUser(user: UserInfo): FilteredUser { ... }

// ❌ DON'T: Use 'any' unless intentional
function processData(data: any) { ... } // Only for SQL row mappings
```

**Logging Standardization**:
```typescript
// ✅ DO: Use structured logger with metadata
import { logger } from '../utils/logger';

logger.info('Payment processed', { userId, amount, transactionId });
logger.error('Payment failed', { error: error.message, userId });

// ❌ DON'T: Use console.log in production code
console.log('Payment processed'); // Only for local debugging
```

**Named Export Pattern**:
```typescript
// ✅ CORRECT: Named export
import { logger } from '../utils/logger';

// ❌ WRONG: Default import (will cause errors)
import logger from '../utils/logger'; // Error!
```

**Type Coverage**: 85% (30+ interfaces)
**Logging Coverage**: 70% (critical services complete)
**TypeScript Errors**: 0

---

## 📦 Data Export System (Added Feb 6, 2026)

**GDPR-compliant user data export with async processing**

**Quick Usage**:
```typescript
// Frontend - Request export
import * as settingsApi from '@/services/settingsApi';
const result = await settingsApi.requestDataExport();
// User receives email when ready (5-10 minutes)

// Check status
const status = await settingsApi.getExportStatus();
console.log(status.status); // 'pending', 'processing', 'completed', 'failed', 'expired'

// Download
await settingsApi.downloadExport(requestId);
```

**API Endpoints**:
- `POST /api/settings/export-data` - Request export (rate limit: 3 per 24h)
- `GET /api/settings/export-data/status` - Get latest request status
- `GET /api/settings/export-data/download/:requestId` - Download ZIP file

**Features**:
- **Complete Data Collection** - 20+ tables (profile, enrollments, progress, certificates, transactions, chat, AI tutoring, comments, bookmarks, notifications)
- **Multiple Formats** - JSON (complete data) + CSV (summary) + README documentation
- **Background Processing** - Cron job processes exports every minute
- **Email Notifications** - Beautiful HTML email with download link
- **Security** - 7-day expiry, user ownership verification, download tracking
- **Resource Management** - 500MB size limit, 1GB minimum disk space requirement
- **GDPR Compliance** - Right to data portability fulfilled

**Export Contents (28 files)**:
```
profile/              - personal-info.json, settings.json, notification-preferences.json
learning/             - enrollments, progress, assessments, certificates (7 files)
community/            - comments, chat messages, study groups (5 files)
ai-tutoring/          - sessions, messages (2 files)
transactions/         - payments, invoices (2 files)
activity/             - bookmarks, notifications, live sessions (3 files)
csv/                  - 5 CSV files for spreadsheet viewing
README.txt            - Complete documentation + GDPR info
```

**Components**:
- `services/DataExportService.ts` - Data collection and ZIP generation (812 lines)
- `services/ExportJobProcessor.ts` - Background processing (313 lines)
- `pages/Settings/SettingsPage.tsx` - Export UI with status polling
- Database: `DataExportRequests` table with 3 indexes

**Background Jobs**:
- Every minute: Process pending exports
- Daily 3 AM UTC: Cleanup expired exports

**Status Flow**:
`pending` → `processing` → `completed` (or `failed`) → `expired` (after 7 days)

---

## 💬 Chat System (Added Feb 5, 2026)

**Real-time direct messaging with conversation management**

**Quick Usage**:
```typescript
// Navigate to chat page
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/chat');

// Start conversation with specific user
navigate('/chat?roomId=ROOM_ID');
```

**API Endpoints**:
- `GET /api/chat/rooms` - Get active conversations
- `GET /api/chat/rooms/:id/messages` - Get messages with pagination
- `POST /api/chat/rooms/:id/messages` - Send message
- `POST /api/chat/rooms/direct` - Create/reactivate DM room
- `POST /api/chat/rooms/:id/read` - Mark messages read
- `DELETE /api/chat/rooms/:id` - Delete conversation (soft)

**Socket.IO Events**:
```typescript
// Listen for events
socketService.on('chat:message', (message) => { /* handle */ });
socketService.on('chat:conversation-restored', (data) => { /* handle */ });
socketService.on('chat:user-typing', (data) => { /* handle */ });

// Emit events
socketService.emit('chat:join-room', roomId);
socketService.emit('chat:typing-start', roomId);
```

**Features**:
- Real-time message delivery
- Typing indicators
- Unread count badges
- Conversation soft-delete
- Automatic restoration when either party messages
- Privacy enforcement (AllowMessages setting)
- User search for starting new conversations

**Components**:
- `pages/Chat/Chat.tsx` - Main chat interface
- `components/Chat/UserSearchDialog.tsx` - User search modal
- `services/chatApi.ts` - REST API client
- `services/socketService.ts` - Socket.IO wrapper

**Database Tables**:
- ChatRooms - Conversation metadata
- ChatMessages - Message content
- ChatParticipants - User membership with IsActive flag
- ChatMessageReadStatus - Read receipts

**Bug Fixes**:
- #23: Real-time restoration notifications
- #24: Sender can message after deleting
- #26: "New Message" button notifies recipient

---

## 📧 Account Deletion Admin Notification (New - Feb 4, 2026)

**When user deletes account → Admins receive notification**

**In-App Notification:**
```typescript
Type: 'intervention'
Priority: 'urgent' (red badge)
Title: '🚨 Account Deletion'
Message: 'User {name} ({email}) deleted their {role} account at {timestamp} UTC. [Instructor stats if applicable]'
ActionUrl: '/admin/users'
Category: 'system', Subcategory: 'SecurityAlerts'
```

**Email Notification:**
- Subject: "🚨 System Alert - Account Deletion"
- Sent to: All active admins with EmailSecurityAlerts enabled
- Contains: User details, timestamp, instructor stats (if applicable), deletion method, action button
- Styling: Purple gradient header (intervention type)
- Respects: EmailSecurityAlerts preference (inherits from EnableSystemAlerts)

**Test Script**: `node scripts/test-account-deletion-notification.js`

---

## 💬 Comments System (Updated Jan 31, 2026)

**Real-time threaded comments with likes, replies, and notifications**

**Quick Usage**:
```typescript
// In any page component
import CommentsSection from '@/components/Shared/CommentsSection';

<CommentsSection
  entityType="lesson"       // or "course", "assignment", etc.
  entityId={lessonId}       // ID of the entity
  allowComments={true}      // Permission flag
  title="Discussion"        // Optional section title (no count display)
/>
```

**API Endpoints**:
- `GET /api/comments/:entityType/:entityId` - Get all comments
- `POST /api/comments` - Create comment/reply
- `PUT /api/comments/:commentId` - Update comment (5-min window)
- `DELETE /api/comments/:commentId` - Delete comment (soft delete)
- `POST /api/comments/:commentId/like` - Toggle like

**Socket.IO Events**:
- Subscribe: `comment:subscribe` → Join room `comments:entityType:entityId`
- Unsubscribe: `comment:unsubscribe` → Leave room
- Real-time: `comment:created`, `comment:updated`, `comment:deleted`, `comment:liked`

**Features**:
- One-level threading (comment → reply)
- Like/unlike with optimistic updates
- Edit within 5 minutes of posting
- Soft delete (owner) + moderator override (instructor)
- Real-time sync across all connected clients
- Enrollment-based access control
- Reply notifications (EnableReplies/EmailReplies preferences)
- Character limit: 5000 chars
- Keyboard shortcut: Ctrl/Cmd+Enter to submit
- **React StrictMode compatible** (handlersRef pattern prevents duplicate subscriptions)
- **No count display** (removed Jan 29, 2026 to eliminate synchronization complexity)

**Components**:
- `CommentsSection.tsx` - Container with refresh, loading, empty states (no count display)
- `CommentItem.tsx` - Single comment with actions (recursive for replies)
- `CommentInput.tsx` - Reusable input with char counter

**Bug Fixes (Jan 29, 2026)**:
- Fixed React StrictMode double-subscription issue using handlersRef
- Implemented atomic state updates to prevent race conditions
- Removed totalCount tracking to simplify synchronization

**Database Tables**:
- `Comments` - Main comments table with EntityType/EntityId pattern
- `CommentLikes` - Many-to-many likes relationship
- 6 indexes for performance

**Notifications**:
- **Reply Notifications**: Type: 'course', Subcategory: 'Replies', Priority: 'normal'
  - ActionUrl: `/{entityType}s/{entityId}#comment-{parentId}`
  - Respects EnableReplies/EmailReplies preferences
- **New Comment Notifications** (Jan 31, 2026): Type: 'course', Subcategory: 'Comments', Priority: 'low' ⭐ NEW
  - Notifies all enrolled course participants + instructor
  - Excludes comment author (no self-notification)
  - ActionUrl: `/courses/{courseId}/lessons/{entityId}#comment-{commentId}`
  - Respects EnableComments/EmailComments preferences
  - Default: In-app ON, Email OFF
  - **Automated Tests**: `tests/test_comment_notifications.py` (11 tests, 100% coverage)

**Enrollment Notifications** (Feb 10, 2026): ⭐ **ENHANCED**
- **Enrollment Suspended**: Type: 'course', Subcategory: 'EnrollmentSuspended', Priority: 'normal'
  - Dedicated toggle (no longer shares EnrollmentRejected)
  - Respects EnableEnrollmentSuspended/EmailEnrollmentSuspended preferences
  - CourseCard shows red "Suspended" chip with Block icon
- **Enrollment Cancelled**: Type: 'course', Subcategory: 'EnrollmentCancelled', Priority: 'normal'
  - Dedicated toggle (no longer shares EnrollmentRejected)
  - Respects EnableEnrollmentCancelled/EmailEnrollmentCancelled preferences
  - CourseCard shows gray "Cancelled" chip
- **Enrollment Rejected**: Type: 'course', Subcategory: 'EnrollmentRejected', Priority: 'normal'
  - Keeps existing toggle
  - CourseCard shows red "Rejected" chip
- **Bug Fix**: Changed all enrollment notifications from `priority: 'medium'` → `'normal'`
  - Fixed in: `students.ts` (3 places), `instructor.ts` (1 place)
  - Database CHECK constraint only allows: 'low', 'normal', 'high', 'urgent'
- **Database**: 4 new columns in NotificationPreferences (EnableEnrollmentSuspended, EmailEnrollmentSuspended, EnableEnrollmentCancelled, EmailEnrollmentCancelled)
- **UI**: NotificationSettingsPage shows all 4 enrollment subcategories under "Course Updates"

---

## 🔗 Share Functionality (NEW - Jan 24, 2026)

**Unified System**: Single component + hook for all content types

**Quick Usage**:
```typescript
// In any component
import { useShare } from '@/hooks/useShare';
import ShareService from '@/services/shareService';

const { openShareDialog, ShareDialogComponent } = useShare({
  generateShareData: () => ({
    url: ShareService.generateCourseUrl(courseId),
    title: course.Title,
    text: `Check out ${course.Title} on Mishin Learn!`
  }),
  preview: <CoursePreview course={course} />,
  metadata: { title, category, level, price } // For analytics
});

// In JSX
<Button onClick={openShareDialog}>Share</Button>
{ShareDialogComponent}
```

**Files**:
- `client/src/components/Shared/ShareDialog.tsx` - Generic dialog
- `client/src/hooks/useShare.ts` - State management hook
- `client/src/services/shareService.ts` - Platform sharing + URLs
- `client/src/services/shareAnalytics.ts` - Event tracking

**Platforms**: Native (Windows/mobile), Copy, Twitter, Facebook, LinkedIn, WhatsApp, Email

**URLs**:
- Courses: `/courses/${courseId}/preview`
- Certificates: `/certificate/${verificationCode}`

---

## 🎓 Instructor Course Management

**Unified Page Structure:**
- **Route**: `/instructor/edit/:courseId?tab=0`
- **4 Tabs**: Course Details | Lesson Details | Assessments | Settings
- **Legacy Route**: `/instructor/lessons/:id` → Auto-redirects to Lesson Details tab

**Course Form Fields:**
- Title (min 5 chars)
- Description (min 20 chars)  
- Category (10 options: programming, data_science, design, business, marketing, language, mathematics, science, arts, other)
- Level (4 options: beginner, intermediate, advanced, expert)
- Price (min 0)
- Thumbnail (max 5MB, images only)

**API Endpoints:**
- `GET /api/instructor/courses` - Returns courses with lowercase `level` field
- `PUT /api/instructor/courses/:id` - Update course (validates & normalizes level)
- `POST /api/instructor/courses` - Create course (validates & normalizes level)
- `GET /api/enrollment/my-enrollments` - **Instructor-aware**: Returns UNION ALL of teaching + enrolled courses
- `GET /api/courses/*` - All public catalog endpoints filter orphaned courses with `INNER JOIN Users`

**Instructor Enrollment Behavior (Fixed Jan 19, 2026):**
- Instructors can both teach courses AND enroll as students in other courses
- `/api/enrollment/my-enrollments` returns:
  - **Teaching courses**: Status='teaching', TimeSpent=0
  - **Student enrollments**: Status='active'/'completed', TimeSpent=seconds
- Frontend filters: "Enrolled" badge excludes Status='teaching'
- Course cards show "Continue Learning" for enrolled, "Manage" for teaching

**Orphaned Course Filtering (Fixed Jan 19, 2026):**
- Orphaned courses: InstructorId=NULL with Status='deleted'
- All 6 public course endpoints use `INNER JOIN Users u ON c.InstructorId = u.Id`
- Ensures category stats, level stats, and search results exclude deleted instructor courses
- Files: `server/src/routes/courses.ts` lines 71, 82, 149, 255, 291, 333

**Level Field Normalization:**
- Database: Stores lowercase (beginner, intermediate, advanced, expert)
- Backend: Normalizes all responses to lowercase
- Frontend: Expects lowercase, initializes with `.toLowerCase()`
- Validation: All inputs validated and lowercased before saving

**Navigation:**
- Dashboard → Edit: `/instructor/edit/:id`
- Dashboard → Analytics: `/instructor/analytics?courseId=:id`
- Dashboard → Students: `/instructor/students?courseId=:id`

---

## 🧪 TEST CREDENTIALS

**Instructor Account:**
```
Email: s.mishin.dev+ins1@gmail.com
Password: Aa123456
Role: Instructor
```

**Student Account 1:**
```
Email: s.mishin.dev+student1@gmail.com
Password: Aa123456
Role: Student
```

**Student Account 2:**
```
Email: s.mishin.dev+student2@gmail.com
Password: Aa123456
Role: Student
```

**Email Verification Testing (Dec 27, 2025):**
- Register new account → Receive email with 6-digit code
- Check Gmail inbox: s.mishin.dev@gmail.com
- Dialog appears: "Verify Now" or "Verify Later"
- Navigate to `/verify-email` or click banner "Verify Now"
- Enter code → Click "Verify Email"
- Welcome email sent on success
- Profile badge updates: "Email Verified ✓" (green)
- Banner disappears from dashboard
- Test resend: 60-second cooldown timer
- Test expired code: 24-hour expiry window
- Test invalid code: Error message display
- Database: `SELECT EmailVerificationCode, EmailVerificationExpiry, EmailVerified FROM Users WHERE Id=@id`

**Email Service Configuration:**
- Service: Gmail SMTP (Nodemailer)
- Account: s.mishin.dev@gmail.com
- App Password: tfjubtheusandbiy
- Templates: Verification (6-digit code), Welcome (post-verification)
- See: `server/src/services/EmailService.ts`

---

## 🔔 Notification System Quick Ref (Jan 21, 2026)

**Architecture**: Backend → Socket.IO → App.tsx → Zustand Store → Components

**Files**: `notificationStore.ts`, `App.tsx` (lines 104-203), `NotificationBell.tsx`, `NotificationsPage.tsx`

**Usage**: `const { notifications, unreadCount, markAsRead } = useNotificationStore();`

**Rules**: ❌ No socket listeners in components | ✅ Use store only

**Manual Test Endpoints (Added Jan 20-21, 2026):**
```powershell
# Assessment Due Reminders (requires instructor/admin JWT token)
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3001/api/notifications/test-assessment-reminders" `
  -Method POST -Headers $headers

# Weekly Progress Summary (requires instructor/admin JWT token)
Invoke-WebRequest -Uri "http://localhost:3001/api/notifications/test-weekly-summary" `
  -Method POST -Headers $headers

# Response format:
# { "success": true, "count": 5, "message": "Sent 5 notifications" }
```

**Cron Schedules:**
- **Assessment Due Reminders**: Daily at 9:00 AM UTC (`'0 9 * * *'`)
- **Weekly Progress Summary**: Monday at 8:00 AM UTC (`'0 8 * * 1'`)
- **Live Session Starting Soon**: Every 15 minutes (`'*/15 * * * *'`) - Checks for sessions 55-65 min away
- **Email Digest**: Daily at 8:00 AM UTC (existing)
- **Email Weekly Digest**: Monday at 8:00 AM UTC (existing)
- **Notification Queue**: Every 5 minutes (quiet hours processing)

---

## 🎨 Settings & Preferences

**Profile Testing:**
- Login with either account
- Navigate to `/profile` or click profile icon in header
- Test Personal Info, Password, Billing Address, Account Info tabs
- Upload avatar (JPEG/PNG/GIF/WebP, max 5MB)
- **OLD**: Configure notification preferences from Profile → Preferences tab (REMOVED Dec 29, 2025)
- **NEW**: Access notification settings via Header → Settings dropdown → Notifications
- Navigate to dedicated page: `/settings/notifications`
- **Hybrid Notification Control (Dec 29, 2025)**: 3-level system fully functional
  - **Global toggles**: Enable In-App Notifications, Enable Email Notifications
  - **5 Categories**: Progress Updates, Course Updates, Assessment Updates, Community Updates, System Alerts
  - **50+ Subcategories**: Individual in-app/email toggles for each notification type
  - **NULL inheritance**: Subcategory NULL = inherits from category toggle
  - **Quiet hours**: Notifications queued during specified time range
  - **Email digest**: None, Realtime, Daily (8 AM), Weekly (Monday 8 AM)
  - **Cron job**: Processes queue every 5 minutes
  - **UI**: 5 expandable accordion sections, professional MUI design (734 lines)
  - **Persistence**: All 64 settings save to database and persist across sessions

**Privacy Settings Testing (Dec 18, 2025, Verified Jan 10, 2026):**
- Navigate to Settings page (`/settings`)
- Test privacy controls:
  - **Profile Visibility**: Public / Students Only / Private ✅ WORKING
  - **Show Email**: Toggle to hide/show email in lists ✅ WORKING
  - **Show Progress**: Toggle to hide/show learning progress ✅ WORKING
  - **Allow Messages**: Toggle to enable/disable messaging ⚠️ NOT ENFORCED (chat disabled)
- Test privacy enforcement:
  - Student Management: Instructors see all emails (override) ✅
  - Course Detail: "Email not public" for hidden emails ✅
  - Progress viewing: 403 error for hidden progress ✅

**Timestamp Auto-Update Testing (Jan 12, 2026):**
- **Office Hours**: Student joins queue → Wait 2 minutes → Timestamp updates from "less than a minute ago" to "2 minutes ago" ✅
- **Notifications**: Open notifications page → Wait 1 minute → All timestamps auto-update ✅
- **Notification Bell**: Open header dropdown → Wait 1 minute → Timestamps update without closing/reopening ✅

---

## 🗑️ Account Deletion System (Jan 18-19, 2026)

**Feature**: Instructors can delete their accounts with 3 options for managing courses

**Access**: Settings → Privacy & Security → Delete Account (red danger zone)

**Flow**:
1. Click "Delete My Account" → Shows instructor decision dialog
2. Select course action: Archive All / Transfer All / Force Delete
3. If transfer: Select target instructor from dropdown
4. Password confirmation required before execution
5. Backend executes chosen action + soft-deletes user account

**Course Management Options:**
- **Archive All**: Changes course status to 'archived' (can be restored)
- **Transfer All**: Changes InstructorId to new instructor + logs in CourseOwnershipHistory
- **Force Delete**: Soft-deletes courses (Status='deleted', InstructorId=NULL)

**Security**:
- Password verification required before any action
- All operations in transaction (rollback on error)
- Audit logging in AccountDeletionLog table
- JWT token invalidated immediately

**Files**: 
- Backend: `AccountDeletionService.ts`, `account-deletion.ts` (routes)
- Frontend: `SettingsPage.tsx`, `InstructorDeletionDialog.tsx`, `CourseTransferDialog.tsx`, `ArchiveCoursesDialog.tsx`
- Database: `CourseOwnershipHistory`, `AccountDeletionLog` tables

**Email Notifications**:
- Account deletion confirmation (to deleted user)
- Course archive notification (to enrolled students)
- Course transfer notification (to students + new instructor)
- Course deletion warning (to students losing access)
- **Note**: These emails are **always sent** (bypass notification settings)
- Security/critical emails, not part of user-controllable notification triggers

**Testing Checklist**:
- [ ] Archive flow: Verify courses become Status='archived'
- [ ] Transfer flow: Verify ownership changes + history logged
- [ ] Force delete: Verify courses become orphaned (InstructorId=NULL)
- [ ] Password validation: Wrong password rejected
- [ ] Transaction safety: Error mid-process rolls back
- [ ] Student enrollments: Preserved after instructor deletion
- [ ] Email delivery: All 4 notification types sent successfully
- **Chat**: Send message → Wait 1 minute → Message time updates automatically ✅
- **AI Tutoring**: View session list → Wait 1 minute → "Updated X ago" changes ✅
- **My Learning**: View enrolled courses → Wait 1 minute → "Last accessed X ago" updates ✅
- **Update Interval**: All components update every 60 seconds
- **Memory Leaks**: Navigate away and back → No console errors, timers cleaned up ✅
  - Email filtering: 7 endpoints enforce ShowEmail ✅
- Appearance Settings (theme/language/fontSize): ⚠️ STORED ONLY, not yet applied to UI
- Run automated tests: `node test-privacy-settings.js` (93% pass rate)

**Use these accounts for:**
- Testing role-based features
- Office Hours (instructor creates schedule, student joins queue)
- **Live Sessions** (instructor creates/edits/deletes, student joins/leaves)
  - Test race condition protection: Multiple students join simultaneously (capacity enforced)
  - Test multi-device sync: Open same session in 2 tabs, changes appear instantly
  - Test validation: Try capacity=0, duration=0, reducing capacity below attendee count
  - Test real-time: Join/leave updates, session state changes (start/end/cancel/delete)
- Study Groups (both can create/join)
  - **Invite Users** (January 21, 2026): Members can invite others via search modal
    - Click Invite button (PersonAdd icon) on any group where you're a member
    - Search users by name/username/email (min 2 chars, 500ms debounce)
    - Self-invite prevented (you won't see yourself in results)
    - Invited users receive GroupInvites notification
    - All members notified when someone joins (GroupActivity notification)
  - **Test Invites**: ser@ser.com → Search for admin → Invite → Check admin's bell icon
  - **Test Member Joined**: Join group → All existing members get notification
- Presence System (test multi-user scenarios)
- Chat/messaging features
- **Privacy Features** (test instructor override, student-to-student blocking)
- **Notification Preferences** (test category/subcategory inheritance - Dec 29, 2025):
- Navigate to Header → Settings dropdown → Notifications (dedicated page)
- URL: `/settings/notifications`
- **Test Global Controls:**
  - Toggle "Enable In-App Notifications" OFF → All in-app notifications blocked
  - Toggle "Enable Email Notifications" OFF → All email notifications blocked
  - Change "Email Digest Frequency" → realtime/daily/weekly/never
- **Test Category Controls:**
  - Expand "Progress Updates" accordion
  - Toggle category OFF → All subcategories inherit (disabled)
  - Toggle category ON → Subcategories with NULL inherit (enabled)
- **Test Subcategory Overrides:**
  - Category: ON, Subcategory: Set to OFF → Only that subcategory disabled
  - Category: OFF, Subcategory: Set to ON → Only that subcategory enabled (override)
  - Category: ON, Subcategory: NULL → Inherits category (enabled)
- **Test Quiet Hours:**
  - Set start/end times (e.g., 22:00-08:00)
  - Trigger notification during quiet hours → Queued (not delivered)
  - Check database: `SELECT * FROM NotificationQueue WHERE Status='queued'`
  - Wait for quiet hours to end (or clear with X button)
  - Cron job delivers within 5 minutes
- **Test Persistence:**
  - Change multiple settings across all 5 categories
  - Click "Save Settings" → Toast confirmation
  - Refresh page → All settings should persist
- **Test UI:**
  - All 5 accordion sections expand/collapse correctly
  - Each subcategory shows 2 toggles: [In-App Switch] [Email Switch]
  - No React warnings in console
  - Professional MUI design with proper spacing/colors
- Trigger notification (join office hours, complete lesson)
- Verify notification queued (not delivered immediately)
- Check database: `SELECT * FROM NotificationQueue WHERE Status='queued'`
- Clear quiet hours (click X buttons) or wait for end time
- Within 5 minutes: Cron job delivers notifications
- Check bell icon: Notifications should appear
- Test type filtering: Disable "Progress Updates", complete lesson, verify no notification

**Email Notification & Trigger Testing (Dec 28-29, 2025):**
- **Active Triggers** (2/31):
  1. Lesson Completion → Student + Instructor emails
  2. Live Session Created → All enrolled students notified
- Navigate to Profile → Preferences tab
- Test delivery options:
  - **Realtime**: Complete lesson → Receive email immediately
  - **Daily Digest**: Change to daily → Check email at 8 AM UTC next day
  - **Weekly Digest**: Change to weekly → Check email Monday 8 AM UTC
- Test notification bell: Real-time updates via Socket.io (should update instantly)
- Test email tracking: Click links in email → Check analytics
- Test unsubscribe: Click unsubscribe link → Re-enable in preferences
- Check Gmail: s.mishin.dev@gmail.com
- Database verification: `SELECT * FROM Notifications WHERE UserId=X ORDER BY CreatedAt DESC LIMIT 5`
- Server logs: Look for "⏰ [CRON]" messages every 5 minutes

**Payment Testing (Dec 14-17, 2025):**
- Navigate to Transactions page (`/profile/transactions`)
- Pending transactions show green "Test Complete" button
- Click to simulate webhook completion (DEV ONLY)
- Invoice PDF generated automatically
- Download invoice with branded PDF (Mishin Learn purple theme)
- Stripe test card: 4242 4242 4242 4242, any future date, any CVC
- **Duplicate Prevention (Dec 17)**: Database constraint prevents multiple pending transactions
  - Only 1 pending transaction allowed per user+course combination
  - Frontend buttons disable during enrollment with loading states
  - Backend gracefully handles constraint violations

**Testing Duplicate Prevention:**
1. Open course checkout page
2. Click "Enroll Now" button rapidly multiple times
3. Verify: Only 1 pending transaction created (check Transactions page)
4. Database query: `SELECT * FROM Transactions WHERE Status='pending' AND UserId=@id`
5. Expected: Single row per course enrollment

**Bookmark Testing (Dec 18, 2025):**
- **CoursesPage**: All Courses, Enrolled, and Bookmarked tabs fully functional
- **CourseDetail**: Bookmark button now persists to database (previously broken)
- Test scenarios:
  1. Not logged in: Click bookmark → Shows warning toast
  2. Logged in: Click bookmark → Icon fills, success toast, persists on refresh
  3. Navigate to Bookmarked tab: Course appears in list
  4. Unbookmark from any page: Updates across all pages
  5. Database check: `SELECT * FROM Bookmarks WHERE UserId=@yourUserId`
- Features:
  - Authentication required
  - Duplicate prevention (UNIQUE constraint)
  - Real-time state updates
  - Snackbar feedback (success/error/warning)
  - Cross-page synchronization (via page refresh)

**Notifications Center Testing (Updated Jan 14, 2026):**
- **NotificationsPage** (`/notifications`): Full-page notification management
- **NotificationBell**: Enhanced dropdown with unread + queued counts
- **Architecture**: Centralized Zustand store + App.tsx socket listeners

**New Architecture:**
```
Zustand Store (client/src/stores/notificationStore.ts)
  ↓
App.tsx (lines 104-203) - Socket listeners
  ↓
Components (NotificationBell, NotificationsPage) - Read-only
```

**Test scenarios:**
  1. **Pagination**: Load 100+ notifications, verify 20 per page
  2. **Filtering**: Test All/Unread toggle, type filter (6 options), priority filter (4 options)
  3. **Real-time Sync**: Open two tabs, delete in one → removed from both
  4. **Cross-tab Updates**: Mark read in tab A → count updates in tab B (socket events)
  5. **Navigation**: Click notification with ActionUrl → navigates to target page
  6. **Queued Notifications**: Set quiet hours, trigger notification → appears in bell badge (blue)
  7. **Optimistic Updates**: Mark as read updates UI instantly (before API response)
  8. **Toast Notifications**: Urgent/high = 5s warning, normal/low = 3s info, with action buttons
  9. **No Duplicates**: Socket events are idempotent (wasUnread checks prevent double-decrement)
  10. **Auto-updating Timestamps**: "X minutes ago" updates every 60 seconds
  11. Database check: `SELECT * FROM Notifications WHERE UserId=@yourUserId ORDER BY CreatedAt DESC`
- Socket.IO events to verify:
  - `notification-created`: New notification appears instantly
  - `notification-read`: Read status syncs across tabs
  - `notifications-read-all`: All marked read syncs
  - `notification-deleted`: Delete syncs across tabs
- Features:
  - Server-side pagination (limit/offset)
  - Client-side pagination (20 items/page)
  - Type/priority filtering
  - Mark read/delete actions
  - Settings shortcut button
  - Text wrapping for long messages
  - Date display: "5 minutes ago" (relative time)

**Notification Triggers Testing (January 11, 2026):**
- **8 Active Triggers**: Test all automatic notification creation scenarios
- Test scenarios:
  1. **Course Enrollment**:
     - Enroll in a course → Student receives welcome notification
     - Instructor receives "New Student Enrolled" notification
     - Verify both in-app and email delivery (respects preferences)
  2. **New Lesson Created**:
     - Instructor creates new lesson in published course
     - All enrolled students (active + completed) receive notification
     - Verify completed students receive notifications too
  3. **Course Published**:
     - Instructor publishes draft course
     - All enrolled students receive "Course Now Available" notification
     - Verify both active and completed enrollments notified
  4. **Lesson Completion**:
     - Complete a lesson → Progress notification received
     - At 25%, 50%, 75%, 100% → Instructor receives milestone notification
  5. **Video Completion**:
     - Complete watching a video → Video completion notification
  6. **Live Session Created**:
     - Instructor creates live session → All enrolled students notified
  7. **Live Session Updated**:
     - Instructor edits session → Students notified of changes
  8. **Live Session Deleted**:
     - Instructor deletes session → Students notified of cancellation
- Database verification:
  - `SELECT * FROM Notifications WHERE Type='course' ORDER BY CreatedAt DESC`
  - `SELECT * FROM Enrollments WHERE Status IN ('active', 'completed')`
- Socket.IO verification:
  - Open browser console, watch for `notification-created` events
  - Bell icon count updates in real-time without refresh
- Email verification:
  - Check Gmail inbox: s.mishin.dev@gmail.com
  - Verify realtime/digest emails sent based on preferences
  - **Critical Bug Fixed**: Completed students now receive notifications AND can access content

**Presence & Logout Testing (January 12, 2026):**
- **Presence Page** (`/presence`): Real-time online users list with status management
- **Test Logout Cleanup**:
  1. Login as Student 1 → Navigate to Presence page
  2. Login as Instructor in different browser/incognito
  3. Instructor should see Student 1 as "online" (2 users total)
  4. Logout Student 1 → Instructor should see user count decrease to 1
  5. Verify: Student 1 no longer appears in online users list
  6. Database check: `SELECT * FROM UserPresence WHERE Status != 'offline'`
- **Test Status Persistence**:
  1. Login → Navigate to /presence
  2. Change status to "Away" → Refresh page → Should stay "Away" ✓
  3. Change status to "Busy" → Refresh page → Should stay "Busy" ✓
  4. Change status to "Offline" → Refresh page → Should stay "Offline" ✓ (FIXED Jan 12)
  5. Change status to "Online" → Refresh page → Should stay "Online" ✓
- **Test "Appear Offline" Feature**:
  1. Login and navigate to /presence
  2. Set status to "Offline" (while actually connected)
  3. Open incognito window, login as another user
  4. Verify: First user does NOT appear in online users list
  5. Refresh page in first browser → Status still "Offline"
  6. Socket connection still active (check console for heartbeat)
- **Test Concurrent Logout Prevention**:
  1. Login → Open browser console
  2. Rapidly click logout button multiple times
  3. Verify: Only 1 logout API call in Network tab (guard prevents duplicates)
  4. No errors in console
- **Test Socket Safety After Logout**:
  1. Login → Navigate to any page with socket features (Chat, Office Hours, Presence)
  2. Logout → Check console for errors
  3. Verify: No "socket is null" or "cannot read property of undefined" errors
  4. All socket emit calls safely check connection before emitting
- **Database Verification**:
  - `SELECT UserId, Status, LastSeenAt FROM UserPresence ORDER BY LastSeenAt DESC`
  - `SELECT Id, Email, EmailVerified FROM Users WHERE Email LIKE 's.mishin.dev+%'`
- **Socket.IO Events** (check browser console):
  - `presence-changed`: Status updates broadcast to all users
  - `presence-updated`: Personal confirmation after status change
  - Connection/disconnection logs show proper cleanup

---

## 📚 DOCUMENTATION FILES - WHAT TO READ WHEN

```
┌─────────────────────────────────────────────────────────────┐
│  When you need to...                  │  Read this file...   │
├─────────────────────────────────────────────────────────────┤
│  Understand HOW systems work          │  ARCHITECTURE.md     │
│  Find component dependencies          │  COMPONENT_REGISTRY  │
│  Make any code change                 │  PRE_FLIGHT_CHECKLIST│
│  See WHAT was built & when            │  PROJECT_STATUS.md   │
│  Troubleshoot common issues           │  COMPONENT_REGISTRY  │
│  Understand data flows                │  ARCHITECTURE.md     │
│  Find API endpoints                   │  ARCHITECTURE.md     │
│  Implement notification preferences   │  NOTIFICATION_PREFS  │
│  Understand terms/legal compliance    │  QUICK_REFERENCE.md  │
│  Test privacy features                │  test-privacy-*.js   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 STANDARD WORKFLOW (Every Change)

### 1️⃣ BEFORE Coding (5 minutes)
```bash
✓ Open PRE_FLIGHT_CHECKLIST.md
✓ Read Phase 1: Research & Planning
✓ Run grep_search to find all related files
✓ Check COMPONENT_REGISTRY.md for dependencies
```

### 2️⃣ WHILE Coding (Variable)
```bash
✓ Follow Phase 2: Implementation checklist
✓ Reference ARCHITECTURE.md for patterns
✓ Check COMPONENT_REGISTRY.md for examples
✓ Add proper error handling & loading states
```

### 3️⃣ AFTER Coding (10 minutes)
```bash
✓ Run get_errors() - Should be 0 errors
✓ Follow Phase 3: Verification checklist
✓ Check all related files still work
✓ Verify no TODOs left behind
```

### 4️⃣ BEFORE "Done" (5 minutes)
```bash
✓ Follow Phase 4: Documentation
✓ Follow Phase 5: Final Review
✓ Create testing checklist for user
✓ Update COMPONENT_REGISTRY if needed
```

---

## 🛠️ COMMON COMMANDS

### Find All Usages
```typescript
grep_search({
  query: "ComponentName",
  isRegexp: false,
  includePattern: "client/src/**"
})
```

### Check for TODOs
```typescript
grep_search({
  query: "TODO|FIXME|BUG",
  isRegexp: true,
  includePattern: "path/to/file.tsx"
})
```

### Check TypeScript Errors
```typescript
get_errors({
  filePaths: ["path/to/file.tsx"]
})
```

### Find API Calls
```typescript
grep_search({
  query: "/api/endpoint",
  isRegexp: false,
  includePattern: "client/src/services/**"
})
```

---

## 🚨 CRITICAL RULES (NEVER SKIP)

```
❌ NEVER change port numbers (3001 backend, 5173 frontend)
❌ NEVER track progress for instructors viewing their courses
❌ NEVER modify shared components without checking ALL usages
❌ NEVER remove database columns without checking ALL queries
❌ NEVER skip authentication checks for protected operations
```

---

## 🎯 QUICK CHECKS

### Before Modifying CourseCard (CRITICAL)
```bash
1. Check COMPONENT_REGISTRY.md → CourseCard section
2. Note: Used by 4+ pages (CoursesPage, MyLearningPage, Dashboard, etc.)
3. Grep for all usages: grep_search(query="CourseCard")
4. Test ALL pages after changes
```

### Before Changing API Response
```bash
1. Find API service file (e.g., coursesApi.ts)
2. Grep for all usages of that method
3. Check if response structure change affects consumers
4. Update TypeScript interfaces if needed
```

### Before Changing Database Query
```bash
1. Check database/schema.sql for column names (PascalCase)
2. Grep for all queries using that table
3. If column appears in 10+ files → It's a FEATURE
4. Verify new query returns expected data
```

---

## 📊 COMPONENT DEPENDENCY MAP (Quick Glance)

```
HeaderV5 (Navigation System - Refactored Jan 31, 2026)
├─ Config: navigation.tsx (centralized nav items)
├─ Types: navigation.ts (TypeScript interfaces)
├─ Components: MegaMenuDropdown, MobileBottomNav, MobileNavDrawer
├─ State: authStore, notificationStore
└─ Used by: All pages (39+ pages migrated from HeaderV4)

CourseDetailPage
├─ Services: coursesApi, enrollmentApi, progressApi, BookmarkApi
├─ Components: HeaderV5, ShareDialog
├─ State: authStore (Zustand)
└─ Used by: App.tsx (/courses/:courseId route)

CoursesPage
├─ Services: coursesApi, enrollmentApi, BookmarkApi
├─ Components: HeaderV5, CourseCard (SHARED!)
├─ State: authStore
└─ Used by: App.tsx (/courses route)

CourseCard (CRITICAL - SHARED)
├─ Utilities: getCategoryGradient, formatCategory, getLevelColor
├─ Used by: CoursesPage, MyLearningPage, Dashboard, etc.
└─ WARNING: Changes affect 4+ pages!

VideoPlayer
├─ Services: videoProgressApi
├─ Props: skipProgressTracking (true for instructors)
└─ Auto-saves every 5 seconds
```

---

## 🔍 TROUBLESHOOTING QUICK REFERENCE

### Bookmark Not Working
```bash
✓ Check: BookmarkApi import?
✓ Check: User logged in?
✓ Check: API call in handleBookmark()?
✓ Check: Backend route working?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Common Issues
```

### Progress Not Saving
```bash
✓ Check: Instructor preview mode? (should NOT save)
✓ Check: isInstructorPreview flag?
✓ Check: UserProgress record exists?
✓ See: ARCHITECTURE.md → Progress Tracking Flow
```

### Wrong Button Showing
```bash
✓ Check: enrollmentStatus.isInstructor value
✓ Check: course.isEnrolled value
✓ Check: API returning correct data?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Key Logic
```

---

## 📦 FILE STRUCTURE OVERVIEW

```
PROJECT ROOT
├─ ARCHITECTURE.md              ← System design & data flows
├─ COMPONENT_REGISTRY.md        ← Component details & dependencies
├─ PRE_FLIGHT_CHECKLIST.md      ← Development workflow checklist
├─ PROJECT_STATUS.md            ← Project history & what was built
├─ SESSION_SUMMARY_NOV_22.md    ← Latest session summary
├─ QUICK_REFERENCE.md           ← This file!
├─ client/
│  ├─ src/
│  │  ├─ pages/                 ← Page components (entry points)
│  │  │  └─ Legal/              ← TOS, Privacy Policy, Refund Policy pages
│  │  ├─ components/            ← Reusable components
│  │  │  └─ Legal/              ← TermsConsentBanner (acceptance overlay)
│  │  ├─ services/              ← API service classes (incl. termsApi.ts)
│  │  ├─ stores/                ← Zustand stores (authStore)
│  │  └─ utils/                 ← Utility functions
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ routes/                ← API endpoints
│  │  ├─ services/              ← Business logic
│  │  └─ middleware/            ← Auth, CSRF, etc.
│  └─ package.json
└─ database/
   └─ schema.sql                ← Database schema (source of truth)
```

---

## ⏱️ TIME ESTIMATES

```
┌──────────────────────────────────────────────┐
│ Activity                │ Time      │ Saves  │
├──────────────────────────────────────────────┤
│ Following checklist     │ 20-30 min │ 2-3 hr │
│ Checking dependencies   │ 5 min     │ 1 hr   │
│ Reading docs            │ 10 min    │ 30 min │
│ Proper error handling   │ 5 min     │ 1 hr   │
│ Writing tests (manual)  │ 10 min    │ 2 hr   │
└──────────────────────────────────────────────┘

Total overhead: ~1 hour per feature
Total savings: 6+ hours per feature
ROI: 6:1 time savings!
```

---

## 🎓 GOLDEN RULES

1. **Document WHILE coding**, not after
2. **Check dependencies BEFORE modifying**
3. **Test ALL related pages** after shared component changes
4. **Update docs** when code changes
5. **Follow checklist** for every change (no shortcuts!)

---

## 💡 REMEMBER

```
┌──────────────────────────────────────────────────────────┐
│ "Measure twice, cut once"                               │
│                                                          │
│ 10 minutes of research >>> 2 hours of debugging         │
│                                                          │
│ Good documentation >>> Good memory                       │
│                                                          │
│ Complete implementation >>> Quick hack                   │
└──────────────────────────────────────────────────────────┘
```

---

## 📞 QUICK HELP

**Can't find something?**
→ Use Ctrl+F in documentation files

**Component not in registry?**
→ Check ARCHITECTURE.md for patterns, then add to registry

**Breaking something?**
→ Check PRE_FLIGHT_CHECKLIST.md Phase 1.2 (find related code)

**Need pattern example?**
→ Check ARCHITECTURE.md "Common Patterns" section

**Have questions?**
→ Check COMPONENT_REGISTRY.md "Common Issues" sections

---

**Keep this file open while developing!** 📌
