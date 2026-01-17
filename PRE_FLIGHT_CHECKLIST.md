# Pre-Flight Checklist - Before Making Any Code Changes

**Purpose**: Systematic checklist to follow before implementing changes  
**Goal**: Reduce errors, missing considerations, and broken functionality

---

## 🎯 USE THIS CHECKLIST EVERY TIME BEFORE:
- Fixing a bug
- Adding a feature
- Modifying existing code
- Refactoring components

---

## ✅ PHASE 1: RESEARCH & PLANNING (Before Writing Code)

### 1.1 Understand the Request
- [ ] I clearly understand what needs to be changed/added/fixed
- [ ] I know the expected behavior after the change
- [ ] I've identified the specific files that need modification
- [ ] If unclear, I've asked clarifying questions

### 1.2 Find All Related Code
- [ ] Used `grep_search` to find ALL files using this component/function/API
- [ ] Checked `COMPONENT_REGISTRY.md` for component dependencies
- [ ] Checked `ARCHITECTURE.md` for data flow understanding
- [ ] Identified all pages that use this component

**Recent Additions to Check:**
- [x] **Instructor Course Management Unification** - Page merge + Level normalization (Jan 14, 2026) ✅
  - Merged CourseEditPage and LessonManagementPage into single 4-tab interface
  - Tab system: Course Details | Lesson Details | Assessments | Settings
  - Added PUT /api/instructor/courses/:id endpoint with validation
  - Fixed level field normalization (8 files modified: 5 backend, 3 frontend)
  - Backend normalizes level to lowercase in all GET responses
  - Backend validates and lowercases level in POST/PUT operations
  - Frontend initializes with course.level?.toLowerCase() for safety
  - Updated navigation to use query parameters (?courseId=X)
  - Legacy route /instructor/lessons/:id redirects to tab 1
  - Fixed toast error rendering (proper string extraction from error objects)
  - Added 'expert' level support (beginner, intermediate, advanced, expert)
  - Fixed category validation (10 valid categories)
  - Status: All data flows verified, zero TypeScript errors, backward compatible
- [x] **Timestamp Auto-Update** - 6 components (Jan 12, 2026) ✅
  - Office Hours (QueueDisplay), Notifications (Page + Bell), Chat, AI Tutoring, My Learning
  - 60-second timer pattern: `useState(Date.now())` + `setInterval(60000)`
  - Auto-updates "X minutes ago" displays without page refresh
  - Memory leak prevention: All timers have `clearInterval` cleanup
  - Pattern: State variable triggers re-render → `formatDistanceToNow` recalculates
  - Date handling: UTC in DB, date-fns auto-converts to local time
  - No breaking changes: Purely additive (adds timer, no logic changes)
- [x] **Notification Triggers** - 16/31 ACTIVE (Jan 17, 2026) ✅
  - Progress: Lesson completion, Video completion, Course completion
  - Course Management: Enrollment, New lessons, Course published
  - Live Sessions: Created, Updated, Deleted
  - Assessments: Created, Submitted, Graded
  - Community: Office Hours completed with duration (Jan 17)
  - System: Payment receipt, Refund confirmation, Password changed (Jan 17)
  - Socket.io real-time updates: Notification bell updates instantly
  - Implementation pattern: Get io from req.app.get('io'), create NotificationService(io)
  - Error handling: Non-blocking try-catch prevents feature failures
  - 15 triggers remaining: Due dates, study groups, direct messages, etc.
  - Reference: NOTIFICATION_TRIGGERS_IMPLEMENTATION_PLAN.md
- [x] Email Notification System - PHASES 1-3 COMPLETE (Dec 28, 2025) ✅
  - Realtime email delivery with Gmail SMTP
  - Daily digest (8 AM UTC) and weekly digest (Monday 8 AM UTC)
  - Email tracking (opens, clicks) and analytics
  - One-click unsubscribe with token management
- [x] **Real-time Notification System Refactoring** - COMPLETE (Jan 14, 2026) ✅
  - Centralized Zustand store for all notification state
  - Single socket listener registration in App.tsx (lines 104-203)
  - Removed ~100+ lines of duplicate socket code from components
  - Optimistic UI updates with cross-tab sync
  - Idempotent store actions (safe to call multiple times)
  - Priority-based toast notifications (urgent/high: 5s, normal/low: 3s)
  - Fixed 13 critical bugs including race conditions and memory leaks
  - Pattern: Backend → Socket Event → App.tsx → Store → Components
  - Beautiful HTML templates with type-specific styling
- [x] Email Verification System - PRODUCTION READY (Dec 27, 2025) ✅
  - EmailVerificationPage: Standalone /verify-email page with 6-digit code input
  - EmailVerificationBanner: Dashboard warning banner for unverified users
  - Profile badge: Clickable verification status in profile Personal Info tab
  - Registration dialog: Post-registration verification prompt
  - Gmail SMTP: Nodemailer integration with s.mishin.dev@gmail.com
  - 6-digit codes: 24-hour expiry, one-time use
  - 4 API endpoints: /send, /verify, /resend, /status
  - Real-time updates: authStore.updateEmailVerified() syncs state
  - Resend cooldown: 60-second timer prevents spam
  - Database: EmailVerificationCode + EmailVerificationExpiry columns
  - Files created: 3 (verificationApi, EmailVerificationPage, EmailVerificationBanner)
  - Files modified: 5 (authStore, App, DashboardLayout, ProfilePage, RegisterForm)
- [x] Notifications Center - PRODUCTION READY (Dec 22, 2025) ✅
  - NotificationsPage: Full-page notification management with pagination
  - NotificationBell: Enhanced with queued count badge and real-time sync
  - Server-side filtering: type, priority, limit, offset
  - Client-side pagination: 20 items/page with MUI Pagination
  - Real-time updates: 4 socket events (created, read, read-all, deleted)
  - Click-to-navigate: ActionUrl navigation on notification click
  - Settings shortcut: Button linking to /settings
  - Text wrapping: Fixed overflow for long messages
  - Date handling: UTC storage, ISO format, local display (formatDistanceToNow)
  - Cross-tab synchronization: Delete/read syncs across all tabs
  - Files modified: 6 (NotificationService, notifications routes, notificationApi, socketService, NotificationBell, NotificationsPage)
- [x] Bookmark System - PRODUCTION READY (Dec 18, 2025) ✅
  - CourseDetailPage: Snackbar feedback for bookmark actions
  - CoursesPage: Snackbar feedback for all CourseCards
  - Authentication check: Warning toast for logged-out users
  - Success toasts: "Course bookmarked successfully" / "Bookmark removed successfully"
  - Error handling: Failed API calls show error toast
  - Database: Bookmarks table with 3 indexes already existed
  - Backend API: 6 endpoints already functional (no changes needed)
  - Files modified: 2 (CourseDetailPage.tsx, CoursesPage.tsx)
  - Implementation time: ~15 minutes
- [x] Notification Preferences - Hybrid 3-Level Control System (Dec 29, 2025) ✅
  - **Database**: 64 columns (2 global, 5 categories, 50 subcategories) + migration applied
  - **Backend**: NotificationService updated with 3-level cascade enforcement
  - **Frontend**: Dedicated /settings/notifications page (734 lines, professional MUI design)
  - **Navigation**: Header → Settings dropdown → Notifications
  - **Global Controls**: EnableInAppNotifications, EnableEmailNotifications (separate)
  - **Category Controls**: Progress, Course, Assessment, Community, System (5 accordions)
  - **Subcategory Controls**: 50+ individual in-app/email toggle pairs
  - **NULL Inheritance**: Subcategory NULL inherits from category toggle
  - **Quiet Hours**: Time pickers with clear (X) buttons, queueing system
  - **Cron Job**: Processes queue every 5 minutes
  - **Persistence**: All 64 settings save correctly and persist across sessions
  - **API Fixed**: Interface updated from 13 to 73 fields, PascalCase aligned
  - **Zero Errors**: No TypeScript errors, no React warnings, no console errors
  - **Files**: 8 modified (NotificationService, NotificationSettingsPage, API, Header, ProfilePage, schema.sql)
  - **Duration**: ~6 hours implementation + bug fixes
- [x] Privacy Settings Enforcement - PRODUCTION READY (Dec 18, 2025) ✅
  - Backend: 8 privacy helper methods in SettingsService
  - Profile visibility (3 tiers: public/students/private)
  - Email privacy with instructor override
  - Progress privacy with instructor override
  - Database-level privacy enforcement
  - Frontend UI updates (13 files)
  - Comprehensive test suite (test-privacy-settings.js, 93% pass rate)
  - All TypeScript compilation errors fixed
- [x] Payment System - Phases 1-6 COMPLETE (100%) - Duplicate Prevention (Dec 17, 2025) ✅
  - Purchase button connected to checkout
  - Payment success page with confetti
  - Enrollment confirmation with payment verification
  - Auto-refresh enrollment state after payment
  - Professional invoice PDF generation with branding
  - Test Complete button for dev testing
  - Invoice download with security verification
  - **Database-level duplicate prevention with filtered unique index**
  - **Backend graceful constraint violation handling**
  - **Frontend debouncing and React Strict Mode fixes**
- [x] TransactionsPage (`/transactions`) - Payment history with invoice download (Dec 14, 2025) ✅
- [x] ProfilePage (`/profile`) - 4-tab user profile system (Personal, Password, Billing, Account - Dec 29, 2025) ✅
- [x] Settings page - Privacy, appearance, data management with backend API (Dec 11, 2025) ✅
- [x] Notification settings page - Dedicated /settings/notifications with 64 controls (Dec 29, 2025) ✅
- [x] Avatar upload system - multer + sharp processing (Dec 11, 2025) ✅

**Commands to run**:
```bash
# Find all usages of a component
grep_search(query="ComponentName", isRegexp=false, includePattern="client/src/**")

# Find all API calls to an endpoint
grep_search(query="/api/endpoint", isRegexp=false, includePattern="client/src/services/**")

# Find all usages of a function
grep_search(query="functionName", isRegexp=false, includePattern="**/*.ts*")
```

### 1.3 Check for Similar Implementations
- [ ] Checked if similar code exists elsewhere (avoid duplicates)
- [ ] Looked for existing utility functions I can reuse
- [ ] Checked if there's a shared component I should update instead

### 1.4 Review State Management
- [ ] Identified all state variables that will be affected
- [ ] Checked if Zustand store needs updating (authStore, etc.)
- [ ] Verified which components share this state

### 1.5 Check for TODOs/FIXMEs
- [ ] Searched for TODO/FIXME comments related to this code
- [ ] Decided if those TODOs should be fixed now or later
- [ ] Won't leave new TODOs without implementing them

**Command**:
```bash
grep_search(query="TODO|FIXME|BUG|HACK", isRegexp=true, includePattern="path/to/file")
```

---

## ✅ PHASE 2: IMPLEMENTATION (While Writing Code)

### 2.1 Code Quality
- [ ] Wrote code with proper TypeScript types (no `any` unless necessary)
- [ ] Added error handling (try/catch blocks)
- [ ] Added loading states where appropriate
- [ ] Added proper null/undefined checks
- [ ] Used descriptive variable names

### 2.2 API Integration
- [ ] If calling API, verified endpoint exists in backend
- [ ] Checked authentication requirements
- [ ] Added proper error handling for API calls
- [ ] Verified response data structure matches expectations

### 2.3 UI/UX Considerations
- [ ] Added loading indicators (CircularProgress, Skeleton, etc.)
- [ ] Added error messages for failed operations
- [ ] Added success feedback for completed actions
- [ ] Considered mobile/responsive design
- [ ] Followed existing Material-UI patterns

### 2.4 Avoid Breaking Changes
- [ ] If changing shared component (CourseCard, Header, etc.), verified it won't break other pages
- [ ] If changing API response structure, updated all consumers
- [ ] If changing database column, checked ALL queries using that column
- [ ] If changing utility function, checked all its usages

### 2.5 Role-Based Logic
- [ ] Considered different user roles (student, instructor, admin)
- [ ] Added role checks where needed (`user?.Role === 'instructor'`)
- [ ] Handled instructor preview mode correctly (no progress tracking)
- [ ] Checked enrollment status properly (`isEnrolled`, `isInstructor`)

---

## ✅ PHASE 3: VERIFICATION (After Writing Code)

### 3.1 Compilation Check
- [ ] Ran `get_errors()` to check for TypeScript errors
- [ ] Fixed all compilation errors
- [ ] Fixed all TypeScript warnings
- [ ] No unused imports or variables

**Command**:
```bash
get_errors(filePaths=["path/to/modified/file.tsx"])
```

### 3.2 Related Files Check
- [ ] Checked all files identified in Phase 1.2 still work
- [ ] Verified shared components still function correctly
- [ ] Checked if API services need updates
- [ ] Verified utility functions haven't broken

### 3.3 Database Considerations
- [ ] If database query changed, verified column names match schema
- [ ] Checked `database/schema.sql` for correct column names
- [ ] Used PascalCase for SQL columns (FirstName, not first_name)
- [ ] If removing column reference, confirmed column is actually unused

### 3.4 Authentication & Authorization
- [ ] Verified API calls include authentication token
- [ ] Checked authorization for protected operations
- [ ] Handled 401/403 errors gracefully
- [ ] Verified unauthenticated users see appropriate UI

### 3.5 Progress Tracking
- [ ] If affecting progress, checked instructor preview mode
- [ ] Verified instructors DON'T create progress records when previewing
- [ ] Confirmed students DO create progress records
- [ ] Checked both UserProgress (per-lesson) and CourseProgress (per-course)

### 3.6 Testing Scenarios
- [ ] Thought through edge cases:
  - [ ] What if user is not logged in?
  - [ ] What if API call fails?
  - [ ] What if data is null/undefined?
  - [ ] What if user is instructor viewing their own course?
  - [ ] What if course is not published?
  - [ ] What if enrollment already exists?

---

## ✅ PHASE 4: DOCUMENTATION (Before Reporting "Done")

### 4.1 Code Comments
- [ ] Added comments for complex logic
- [ ] Documented any workarounds or known issues
- [ ] Removed TODO comments if implemented
- [ ] Added JSDoc comments for new functions

### 4.2 Update Documentation
- [ ] Updated `COMPONENT_REGISTRY.md` if component changed significantly
- [ ] Updated `ARCHITECTURE.md` if data flow changed
- [ ] Updated `PROJECT_STATUS.md` with major changes
- [ ] Created migration guide if breaking changes introduced

### 4.3 Testing Checklist
- [x] Created manual testing checklist for user ✅
- [x] Listed specific steps to test the change ✅
- [x] Included both happy path and error cases ✅
- [x] Specified what to look for (expected behavior) ✅

**Payment System Testing (Dec 11, 2025)**:
- [x] Purchase button navigation to checkout ✅
- [x] Stripe test card payment (4242 4242 4242 4242) ✅
- [x] Payment success page with confetti ✅
- [x] Enrollment auto-created after payment ✅
- [x] Security: URL manipulation prevented (payment verification) ✅
- [x] "Continue Learning" button appears after payment ✅
- [ ] Webhook testing with Stripe CLI (requires local setup)

**Privacy Settings Testing Checklist (Dec 18, 2025, Verified Jan 10, 2026):**
- [x] Run automated test suite: `node test-privacy-settings.js` ✅
- [x] ShowEmail setting: Hidden from students, visible to instructors ✅
- [x] ShowProgress setting: Blocked from students, allowed for instructors ✅
- [x] ProfileVisibility: All 3 modes tested (public/students/private) ✅
- [x] Instructor override: Works for profile, email, and progress ✅
- [x] Student Management: Instructors see all emails ✅
- [x] Course Detail: "Email not public" message shown ✅
- [x] TypeScript compilation: No errors ✅
- [x] No breaking changes: All existing features working ✅
- [x] **Jan 10, 2026 Verification**: All 4 privacy settings enforcement confirmed ✅
  - [x] ProfileVisibility enforced via canViewProfile() ✅
  - [x] ShowEmail enforced in 7 endpoints (users, presence, studyGroups, officeHours, analytics, instructor, profile) ✅
  - [x] ShowProgress enforced via canViewProgress() ✅
  - [x] AllowMessages stored (not enforced - chat disabled) ⚠️
  - [x] Appearance settings (theme/language/fontSize) stored but not applied to UI ⚠️

**Notification Preferences Testing Checklist (Dec 18, 2025):**
- [x] Database: NotificationQueue table created with 3 indexes ✅
- [x] Backend: 6 queue methods added to NotificationService ✅
- [x] Cron job: Runs every 5 minutes (check server logs for "⏰ [CRON]") ✅
- [x] Quiet hours: Set 13:00-23:59, trigger notification, verify queued ✅
- [x] Database check: `SELECT * FROM NotificationQueue WHERE Status='queued'` ✅
- [x] Clear quiet hours: Click X buttons, save preferences ✅
- [x] Wait 5 minutes: Cron job delivers queued notifications ✅
- [x] Bell icon: Check notifications appear after page refresh ✅
- [x] Type filtering: Disable progress, complete lesson, verify no notification ✅
- [x] Server logs: "✅ [CRON] Queue processing complete: 3 delivered, 0 expired" ✅
- [x] TypeScript compilation: No errors ✅
- [x] No breaking changes: Existing notifications still work ✅

**Bookmark System Testing Checklist (Dec 18, 2025):**
- [x] CourseDetailPage: Bookmark button with Snackbar feedback ✅
- [x] CoursesPage: Bookmark icons on all CourseCards with Snackbar ✅
- [x] Not logged in: Click bookmark → Warning toast "Please log in" ✅
- [x] Add bookmark: Click → Icon fills, success toast, persists on refresh ✅
- [x] Remove bookmark: Click → Icon outlines, success toast ✅
- [x] Bookmarked tab: Shows all bookmarked courses ✅
- [x] Cross-page sync: Bookmark on one page reflects on others ✅
- [x] Database check: `SELECT * FROM Bookmarks WHERE UserId=@id` ✅
- [x] TypeScript compilation: No errors ✅
- [x] Backend API: All 6 endpoints working (GET, POST, DELETE, PATCH, batch) ✅

---

## ✅ PHASE 5: FINAL REVIEW (Before Submitting)

### 5.1 Self-Review
- [ ] Read through all changes line by line
- [ ] Verified no console.log left behind (or explained if needed)
- [ ] Checked for hardcoded values that should be configurable
- [ ] Ensured consistent code style with existing codebase

### 5.2 Impact Analysis
- [ ] Listed all files modified
- [ ] Explained what each change does
- [ ] Identified potential side effects
- [ ] Assessed risk level (low/medium/high)

### 5.3 Rollback Plan
- [ ] Know how to revert changes if something breaks
- [ ] Identified which files to restore
- [ ] Documented any database migrations needed

### 5.4 Summary Report
- [ ] Wrote clear summary of what was changed
- [ ] Explained why changes were necessary
- [ ] Listed what was tested (or needs testing)
- [ ] Provided testing instructions for user

---

## 🚨 CRITICAL RULES (NEVER SKIP)

### Rule 1: Port Numbers
- [ ] **NEVER** changed port numbers (Backend: 3001, Frontend: 5173)
- [ ] **NEVER** suggested moving to different ports

### Rule 2: Instructor Preview Mode
- [ ] If touching progress/completion logic, **VERIFIED** instructors don't create records
- [ ] Checked `isInstructorPreview` or `enrollmentStatus.isInstructor` flag

### Rule 3: Shared Components
- [ ] If modifying `CourseCard`, `Header`, or other shared components, **VERIFIED** all usages
- [ ] Tested or listed all pages that use the component

### Rule 4: Database Columns
- [ ] **NEVER** removed column references without checking ALL usages first
- [ ] Verified column exists in `database/schema.sql`
- [ ] If column appears in 10+ files, it's a FEATURE, not a bug

### Rule 5: Privacy Enforcement (NEW - Dec 18, 2025)
- [ ] If showing user data in lists, **CHECK** if privacy settings should apply
- [ ] If adding instructor features, **VERIFY** instructor override logic
- [ ] Use `SettingsService.getUserWithPrivacy()` for user data fetching
- [ ] Use `SettingsService.canViewProfile()` for profile viewing
- [ ] Use `SettingsService.canViewProgress()` for progress viewing
- [ ] Return proper error codes: `PROFILE_PRIVATE`, `PROGRESS_PRIVATE`, `MESSAGES_DISABLED`

### Rule 5: Authentication
- [ ] **ALWAYS** checked if operation requires authentication
- [ ] Handled "not logged in" case gracefully
- [ ] Verified token in `localStorage['auth-storage']` is accessed correctly

---

## 📋 QUICK REFERENCE

### Before Changing a Component:
1. Check `COMPONENT_REGISTRY.md` → Find component → Read "Used By" section
2. Run grep_search to find all usages
3. Check each usage for potential breakage

### Before Changing an API:
1. Find API service file (e.g., `coursesApi.ts`)
2. Grep for all usages of that API method
3. Check if response structure changes affect consumers

### Before Changing Database Query:
1. Check `database/schema.sql` for column names
2. Grep for all queries using that table
3. Verify column names are PascalCase

### Before Reporting "Done":
1. Run `get_errors()` - should return 0 errors
2. Check for TODO/FIXME comments - should be 0 or documented
3. List all modified files
4. Provide testing checklist

---

## ✅ CHECKLIST COMPLETION

**Before submitting changes, verify**:
- [ ] All Phase 1 items completed (Research)
- [ ] All Phase 2 items completed (Implementation)
- [ ] All Phase 3 items completed (Verification)
- [ ] All Phase 4 items completed (Documentation)
- [ ] All Phase 5 items completed (Review)
- [ ] All Critical Rules followed

**If any item is unchecked, DO NOT proceed. Go back and complete it.**

---

## 💡 WHEN TO USE THIS CHECKLIST

**Always use for**:
- Bug fixes
- Feature additions
- Component modifications
- API changes
- Database query changes
- Refactoring

**Can skip for** (use judgment):
- Fixing typos in comments
- Updating documentation only
- Small CSS/styling tweaks
- Adding console.log for debugging

**Remember**: It's better to spend 10 extra minutes checking than 2 hours debugging later!

---

## 📊 ESTIMATED TIME

- **Phase 1 (Research)**: 5-10 minutes
- **Phase 2 (Implementation)**: Variable (depends on complexity)
- **Phase 3 (Verification)**: 5-10 minutes
- **Phase 4 (Documentation)**: 5 minutes
- **Phase 5 (Review)**: 5 minutes

**Total overhead**: ~20-30 minutes per change
**Time saved**: Hours of debugging and testing

---

**Last Updated**: November 22, 2025  
**This checklist will be followed for all future code changes.**
