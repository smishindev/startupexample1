# Pre-Flight Checklist - Before Making Any Code Changes

**Purpose**: Systematic checklist to follow before implementing changes  
**Goal**: Reduce errors, missing considerations, and broken functionality  
**Last Updated**: February 24, 2026 - Mobile Optimization Phase 5 Complete 📱

---

## 💡 CODE QUALITY STANDARDS (Check Before Committing)

### TypeScript Type Safety
- [ ] Used proper types from `server/src/types/database.ts` (not 'any')
- [ ] Verified 0 TypeScript errors: `npx tsc --noEmit`
- [ ] All new interfaces added to types/database.ts (not inline)
- [ ] SQL query results properly typed (or intentionally 'any')

### Logging Standards
- [ ] Used `logger.info/warn/error` instead of `console.log`
- [ ] Added structured metadata to log statements: `logger.info('message', { userId, context })`
- [ ] Used correct import: `import { logger } from '../utils/logger'` (named export)
- [ ] Console statements only for local debugging

### Error Handling
- [ ] All catch blocks have proper error logging
- [ ] User-facing errors return meaningful messages
- [ ] Database errors don't expose SQL details to users

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
- [x] **Theme Token System** - PRODUCTION READY (Feb 21, 2026) 🎨
  - Single source of truth: `client/src/theme/index.ts` (merged from old split `theme`+`augmentedTheme`), `client/src/theme/tokens.ts`
  - **`borderRadius` in sx MUST use px strings**: `(t) => \`${t.custom.radii.card}px\`` — raw numbers get multiplied by `shape.borderRadius` (12) → `16 × 12 = 192px`!
  - **EXCEPTION**: `radii.full = '50%'` — already a string, use `(t) => t.custom.radii.full` directly (adding `px` would produce `'50%px'`)
  - **Shadow RGBs**: `focusPrimary` uses `rgba(99, 102, 241)` (#6366f1 brand), `focusSuccess` uses `rgba(34, 197, 94)` (#22c55e brand). Old `rgba(102, 126, 234)` / `rgba(76, 175, 80)` are wrong.
  - **Colors outside sx**: Use `mishinColors.primary[500]` raw values (not callbacks) for Toaster, chart libs, etc.
  - **`tokens.ts`**: 18 reusable `SxProps<Theme>` fragments — import and spread: `<Paper sx={{ ...cardSx }}>`
  - **Extended palette**: All 5 palettes have 50-900 shades → `sx={{ bgcolor: 'primary.50' }}` works
  - Files: `client/src/theme/index.ts`, `client/src/theme/tokens.ts`, `client/src/main.tsx`
- [x] **Mobile Optimization Phase 5** - PRODUCTION READY (Feb 24, 2026) 📱
  - 6 Payment/Legal pages fully mobile-optimized + 4 dead legacy pages deleted. 73/73 pages done (100%). 4 spacing audit rounds. 0 TypeScript errors.
  - **`pt` vs `mt` stacking**: PageContainer adds `mt:4` (32px). If a loading/error return also applies `pt:4/8`, the total top gap doubles to 64–96px. **Always use flat `pt:4`** on authenticated pages; early-return paths should use no `pt` at all (let `mt:4` stand alone).
  - **No responsive `pt` breakpoints**: `pt: { xs: 4, md: 8 }` inflates desktop to 96px total. Use flat `pt:4` on ALL return paths of a single page for consistency.
  - **`disableBottomPad` on legal/public pages**: TermsOfServicePage, PrivacyPolicyPage, RefundPolicyPage all have `<Header />` but NO MobileBottomNav — use `disableBottomPad` on ALL return paths including loading/error early returns.
  - **No `py:` even on legal pages**: The outer `<Box>` wrapping a legal page must not use `py:X`; that doubles top/bottom with PageContainer’s own `mt:4`/`mb:4`. Use plain `<Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>`.
  - **Table→Card on mobile**: TransactionsPage uses `isMobile ? <Stack><Card/> : <Table>` pattern. Always import `Stack`, `Card`, `CardContent` from MUI for the mobile branch.
  - **Dead code cleanup**: Before mobile-optimizing a page, verify it’s actually imported in App.tsx. If it has 0 imports and a newer replacement exists, delete it instead.
  - Files (Phase 5): `CourseCheckoutPage.tsx`, `PaymentSuccessPage.tsx`, `TransactionsPage.tsx`, `TermsOfServicePage.tsx`, `PrivacyPolicyPage.tsx`, `RefundPolicyPage.tsx`
  - Files (deleted): `pages/Analytics/Analytics.tsx`, `pages/Courses/Courses.tsx`, `pages/Lessons/Lesson.tsx`, `pages/Profile/Profile.tsx`
- [x] **Mobile Optimization Phase 4** - PRODUCTION READY (Feb 23, 2026) 📱
  - 19 Instructor pages fully mobile-optimized (Phase 4.1–4.19). 63/73 pages done (86.3%). 3-round audit — 0 errors found. 0 TypeScript errors.
  - **FAB above bottom nav**: Floating Action Buttons must use `bottom: { xs: 88, md: 24 }` — `xs:24` places FAB behind MobileBottomNav (64px bar) on mobile.
  - **Stepper on mobile**: `CourseCreationForm` pattern — `orientation={isMobile?'vertical':'horizontal'}` + `alternativeLabel={!isMobile}` (horizontal steppers need `alternativeLabel` on desktop to prevent label overflow).
  - **TabPanel padding**: Tab panel content should use `p:{xs:1,sm:2,md:3}` — not fixed padding that wastes space on narrow screens.
  - **Tabs fullWidth on desktop**: `variant={isMobile?'scrollable':'fullWidth'}` — unconditionally `fullWidth` on a page with many tabs makes them too small; unconditionally `scrollable` looks broken on desktop.
  - **Embedded components** (CourseDetailsEditor, CurriculumBuilder, LessonEditor, CourseSettingsEditor): Do NOT add PageContainer — they are rendered inside CourseEditPage’s existing PageContainer. Fix flexWrap/padding inline.
  - **Palette color props vs hex**: MUI icon components accept `color="error"` | `"primary"` | `"warning"` etc. — never use `sx={{ color: '#f44336' }}` when a semantic prop exists.
  - Files (Phase 4): All 19 Instructor pages + 4 embedded components (see MOBILE_OPTIMIZATION_TRACKER.md Phase 4 table)
- [x] **Mobile Optimization Phase 3** - PRODUCTION READY (Feb 23, 2026) 📱
  - 7 Collaboration & Social pages fully mobile-optimized (Phase 3.1–3.7). 44/73 pages done (60.3%). 8 bugs fixed across 5 audit rounds. 0 TypeScript errors.
  - **Tutoring mobile auto-select guard**: `loadSessions` must check `&& !isMobile` before auto-selecting first session — on mobile the user must pick from the list
  - **Back navigation clears state**: `handleBackToSessions` must call `setMessages([])` and `setCurrentSuggestions([])` — not just `setSelectedSession(null)`
  - **Session switch clears suggestions**: add `setCurrentSuggestions([])` in the `selectedSession` useEffect — stale suggestions from prior session persist otherwise
  - **Loading return must include `<Header />`**: all return-paths (loading, error, not-found, main) must render the header so layout remains consistent
  - **Tabs on desktop**: use `variant={isMobile?'scrollable':'fullWidth'}` — unconditionally `scrollable` makes tabs look broken on desktop (left-aligned, truncated)
  - **Chat mobile Paper height**: `calc(100vh-140px)` is too tall — use `calc(100vh-170px)` to clear MobileBottomNav (64px) + header (56px) + padding (50px)
  - **Chat fullScreen Dialog**: always `fullScreen={isMobile}` on session/room create dialogs
  - **`disableBottomPad` on all return paths**: if any authenticated return path has `disableBottomPad`, ALL return paths on that page must have it
  - **No redundant `pt:4`**: PageContainer already applies `mt:4`; adding `pt:4` on the page doubles top spacing to 64px
  - Files (Phase 3): `Chat.tsx`, `LiveSessionsPage.tsx`, `StudyGroupsPage.tsx`, `StudyGroupDetailPage.tsx`, `OfficeHoursPage.tsx`, `Tutoring.tsx`, `PresencePage.tsx`
- [x] **Mobile Optimization Phase 2** - PRODUCTION READY (Feb 22, 2026) 📱
  - 12 core student pages fully mobile-optimized (Phase 2.1–2.12). 37/73 pages done (50.7%). 0 TypeScript errors.
  - **CRITICAL — `py` vs `pt` in PageContainer consumer sx**:
    - PageContainer base includes `pb: { xs: 10, md: 0 }` for MobileBottomNav clearance
    - Consumer `py:` SILENTLY OVERRIDES that `pb` (MUI array merge; `py` expands to paddingTop + paddingBottom)
    - Bottom content (pagination, save buttons, last cards) will be hidden behind 64px nav bar on mobile!
    - ✅ **Always use `pt:` (not `py:`) on authenticated pages**
    - ✅ **Add `disableBottomPad` on public/guest pages** (where MobileBottomNav doesn't render) — then `py:` is safe
  - **`useTheme()` naming collision**: if component has a state variable named `theme`, alias the hook: `const muiTheme = useTheme()`
  - **Alert `severity`**: split conditional for "not found" vs actual API error: `severity={error === 'X not found' ? 'info' : 'error'}`
  - **Tabs on mobile**: All `<Tabs>` must have `variant="scrollable" scrollButtons="auto"` — icon+label tabs overflow without it
  - **`disableBottomPad` consistency**: ALL return paths (loading, error, main, not-found) must have `disableBottomPad` if any path has it
  - **Header on every return path**: loading spinner AND error AND main all must render `<Header />`
  - **Internal component padding**: if a component is wrapped by PageContainer in its parent, remove its own `px`/`p` to avoid double-padding
  - Files (Phase 2): `MyLearningPage.tsx`, `LessonDetailPage.tsx`, `NotificationsPage.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx`, `NotificationSettingsPage.tsx`, `StudentProgressPage.tsx`, `StudentProgressDashboard.tsx`, `StudentAssessmentDashboard.tsx`, `AssessmentTakingPage.tsx`, `MyCertificatesPage.tsx`, `CertificatePage.tsx`, `PublicCertificatePage.tsx`
- [x] **Mobile Optimization Phase 1 + Auth Bug Fixes** - PRODUCTION READY (Feb 21, 2026) 📱🔐
  - New Responsive library at `client/src/components/Responsive/` (8 files: PageContainer, PageTitle, ResponsiveDialog, ResponsivePaper, ResponsiveStack, useResponsive, constants, index)
  - **Every page** must use `PageContainer` instead of raw `<Container>` and `PageTitle` for headings
  - **`<Link component="button">`** inside a `<Box component="form">` (or any `<form>`) MUST have `type="button"` — default is `type="submit"` which submits the form!
  - **`logout()` is async** — always `await logout()` in handlers before calling `navigate()`
  - **`logout()` clears state immediately** — do NOT read `token` from store after calling logout()
  - **401 interceptors**: use `useAuthStore.getState().logout()` + skip redirect if already on `/login` (prevents infinite loops)
  - **Never** `localStorage.removeItem('auth-storage')` directly — always go through `logout()`
  - App.tsx stale-state guard: if `isAuthenticated && !token` on mount → call `logout()`
  - Files (new): `components/Responsive/` (8 files)
  - Files (modified): `LoginForm.tsx`, `RegisterForm.tsx`, `authStore.ts`, `HeaderV5.tsx`, `MobileNavDrawer.tsx`, `Layout.tsx`, `analyticsApi.ts`, `assessmentAnalyticsApi.ts`, `instructorApi.ts`, `lessonApi.ts`, `fileUploadApi.ts`, `axiosConfig.ts`, `App.tsx`, plus all 9 Phase 1 pages
- [x] **CourseSelector Reusable Dropdown** - PRODUCTION READY (Feb 19, 2026) 🔽
  - Single component (`client/src/components/Common/CourseSelector.tsx`) replacing 9 inline course dropdowns
  - **Always use `getCoursesForDropdown()`** (not `getCourses()`) when populating for dropdowns — `getCourses()` defaults to `limit=12`
  - **`showHelperText`** defaults to `true` — set `false` only in compact modals/filter bars
  - **Instructor live sessions**: `InstructorSessionsList` now has a CourseSelector above tabs (course filter)
  - **Lazy rendering**: renders first 50, loads 12 more on scroll; helper text appears when total > 50
  - Files: `CourseSelector.tsx` (new); `instructorApi.ts`, `CourseAnalyticsDashboard.tsx`, `VideoAnalyticsPage.tsx`, `StudentManagement.tsx`, `StudyGroupsPage.tsx`, `CourseSettingsEditor.tsx`, `coursesApi.ts`, `LiveSessionsPage.tsx`, `InstructorSessionsList.tsx` (modified)
- [x] **Analytics Hub Audit & Quality Pass** - PRODUCTION READY (Feb 18, 2026) 🔧
  - 68 total fixes across 23 audit rounds; 4 backend route files + 3 frontend services hardened
  - **API Services Pattern**: Env-aware URL (`VITE_API_URL`), auth interceptor (fresh token), 401 interceptor (auto-logout), `Content-Type: application/json` — all 3 analytics services must follow this
  - **SQL DISTINCT**: Use `COUNT(DISTINCT CASE WHEN ... END)` when aggregating over LEFT JOINs
  - **JSON.parse Guard**: Always `Array.isArray(parsed) ? parsed : []` after JSON.parse — valid JSON ≠ valid array type
  - **UI States**: Every analytics view requires loading (spinner + disabled buttons/selects), error (alert + retry), and empty (informational message) states
  - **Privacy**: `SettingsService.filterUserData()` on all instructor endpoints returning student data
  - **CoursePerformanceTable**: Sortable/searchable/paginated table in `CourseAnalyticsDashboard.tsx` — use `useMemo` + `[...filtered].sort()` (never `.sort()` on state directly)
  - **Non-mutating sort**: `[...arr].sort(...)` — required everywhere array state is sorted for display
  - Files: `analytics.ts`, `assessment-analytics.ts`, `videoAnalytics.ts`, `instructor.ts` (backend); `analyticsApi.ts`, `assessmentAnalyticsApi.ts`, `CourseAnalyticsDashboard.tsx` (frontend)
- [x] **Search Autocomplete System** - PRODUCTION READY (Feb 17, 2026) 🔍
  - Udemy-style live search dropdown with debounced API calls, keyboard navigation, and highlighted matches
  - Component: SearchAutocomplete.tsx (551 lines) — Two variants (header: compact, hero: larger with button)
  - Props: variant, placeholder, onSubmit, testIdPrefix, showButton
  - Features: 300ms debounce, Arrow/Enter/Escape keyboard nav, highlighted text, loading/empty states
  - Integration: PublicHeader (guest), HeaderV5 (authenticated), LandingPage hero, mobile drawers
  - API: GET /api/courses?search={query}&limit=6 (SQL LIKE on Title/Description/Tags)
  - Bug Fixes: 5 critical issues (regex global flag drift, DOM prop warning, race condition, modulo-by-zero, stale debounce)
  - Additional Fixes: Footer categories (added 5 missing), CoursesPage URL sync, formatCategory() applied in 3 locations
  - Removed: HeaderV5 old static search (navigated to non-existent /search?q=... route causing 404s)
  - State Management: query, results, loading, isOpen, focusedIndex, debounceRef, requestIdRef (race guard)
  - Test IDs: {testIdPrefix}-input, -button, -dropdown, -result-{index}, -view-all
  - TypeScript: 0 errors (client + server)
  - Files: 1 new (SearchAutocomplete.tsx), 6 modified (PublicHeader, HeaderV5, LandingPage, CoursesPage, CourseDetailPage, PublicFooter)
- [x] **Course Ratings & Reviews System** - PRODUCTION READY (Feb 15, 2026) ⭐
  - Complete 5-star rating system with text reviews (max 2000 chars)
  - Database: CourseRatings table + denormalized Rating/RatingCount on Courses
  - Backend: RatingService.ts (288 lines), ratings.ts routes (193 lines)
  - Frontend: 4 rating components (RatingSubmitForm, RatingSummaryCard, ReviewCard, ReviewsList)
  - API: 7 endpoints (summary, ratings, my-rating, submit, delete, instructor-summary)
  - Validation: Must be enrolled (active/completed), instructors cannot rate own courses
  - Real-time: Emits course:updated event with fields: ['rating'] after CRUD
  - Notifications: New ratings (priority: normal), Updated ratings (priority: low)
  - Preference Control: Settings → Notifications → Course Updates → Course Ratings toggle
  - Edit functionality: editTrigger prop syncs form state and switches to edit mode
  - Display locations: CourseDetailPage (#reviews section), CoursesPage (cards), MyLearningPage (cards)
  - Real-time updates: useCatalogRealtimeUpdates now listens to course:updated for rating changes
  - MyLearningPage refetches when ratings change (instructor sees student ratings instantly)
  - TypeScript: 0 errors (both client and server)
- [x] **Terms of Service, Privacy Policy & Refund Policy** - PRODUCTION READY (Feb 14, 2026) 📜
  - Database-driven versioned legal documents (TermsVersions + UserTermsAcceptance tables)
  - Three document types: terms_of_service, privacy_policy, refund_policy
  - Registration requires explicit TOS + Privacy Policy acceptance (checkbox + version IDs)
  - TermsConsentBanner blocks app until latest terms accepted (skips /terms, /privacy, /refund-policy)
  - requireTermsAcceptance middleware checks only TOS + Privacy (NOT refund_policy)
  - Refund Policy is informational only — no user acceptance required
  - Public API endpoints: GET /api/terms/current, GET /api/terms/status, POST /api/terms/accept
  - Frontend pages: /terms, /privacy, /refund-policy (all public, no auth required)
  - Cross-links between all three legal pages + LandingPage footer links
  - HTML content rendered via dangerouslySetInnerHTML (seed data in schema.sql)
  - Status: 0 TypeScript errors (server + client), all routes verified
  - Files: terms.ts, auth.ts (middleware), termsApi.ts, TermsConsentBanner.tsx, 3 page components, App.tsx, RegisterForm.tsx, LandingPage.tsx, schema.sql
- [x] **Real-time Course Updates - Phase 5** - PRODUCTION READY (Feb 13, 2026) 🔄
  - Automatic page refreshes when instructors edit courses (no manual refresh needed)
  - Socket.IO room-based broadcasting: `course-{courseId}` + `courses-catalog`
  - Users auto-join `courses-catalog` room on socket connect
  - Enrolled users auto-join `course-{courseId}` rooms (existing + immediate on new enrollment)
  - Backend: CourseEventService singleton with 500ms debounce batches rapid edits
  - 21 emit sites across 8 files (all after res.json() in isolated try-catch)
  - 3 event types: `course:updated`, `course:catalog-changed`, `course:enrollment-changed`
  - Frontend: useCourseRealtimeUpdates (300ms debounce), useCatalogRealtimeUpdates (500ms debounce)
  - Silent refetch UX: Shows spinner ONLY on initial load or course navigation (not on real-time updates)
  - CourseDetailPage: `isInitialLoad = !course || course.id !== courseId` (fixes stale data on navigation)
  - CoursesPage: Uses `loadCourses(true)` for lighter "search-loading" instead of full spinner
  - Reconnection-safe: `onConnect`/`offConnect` pattern survives socket reconnects
  - Memory-leak-safe: Complete cleanup on unmount (listeners + debounce timers)
  - Stale closure prevention: `onUpdateRef.current` pattern always calls latest callback
  - Bug fixes: 6 issues (emit before response, stale course on navigation, loop-wrapping try-catch)
  - **Enrollment Real-time Enhancements (Feb 14, 2026)**: Pending approvals, approve/reject actions, timestamp auto-refresh
  - 5 enrollment emit sites: 3 for pending creation (enroll + 2 re-enroll paths), 2 for approve/reject
  - InstructorDashboard: 60-second interval auto-refreshes "Requested X mins ago" timestamps
  - Files: 19 total (3 new services/hooks; 16 modified routes/pages including enrollment.ts, instructor.ts, InstructorDashboard.tsx)
  - Status: 0 TypeScript errors (server + client), all emit sites verified, comprehensive review complete
- [x] **Advanced Visibility - Phase 4** - PRODUCTION READY (Feb 12, 2026) 🔍
  - Course visibility control: Public (in catalog) vs Unlisted (direct link only)
  - Preview links for draft courses with UUID tokens
  - Instructors can share unpublished courses for feedback via preview URLs
  - Preview mode security: All interactive actions blocked (enroll, purchase, bookmark, share)
  - Instructor draft access: View own drafts via regular URL with info banner
  - Database: 2 new Courses columns (Visibility NVARCHAR(20), PreviewToken UNIQUEIDENTIFIER)
  - Backend: optionalAuth middleware, preview endpoint with UUID validation, visibility filtering
  - Frontend: CourseSettingsEditor visibility UI (radio, direct link, preview tokens), CourseDetailPage preview mode with banners + guards
  - Catalog filtering: Unlisted courses hidden from GET /courses/, excluded from stats
  - Direct access: Unlisted courses accessible at /courses/{id} with direct link
  - Preview access: All courses accessible at /courses/{id}/preview/{token}
  - Routes: App.tsx has 2 routes (regular + preview with token)
  - ShareService: Generates public URLs (no /preview suffix)
  - Files: 12 modified (schema.sql, auth.ts, courses.ts, instructor.ts, enrollment.ts, InterventionService.ts, instructorApi.ts, coursesApi.ts, CourseSettingsEditor.tsx, CourseDetailPage.tsx, App.tsx, shareService.ts)
  - Security Review: 18 issues fixed (preview token leaks, interactive action guards, UUID validation, deleted course protection)
  - Status: 0 TypeScript errors, all edge cases tested, comprehensive security review complete
- [x] **Certificate Settings - Phase 3** - PRODUCTION READY (Feb 11, 2026) 🎓
  - Instructors can enable/disable certificates per course
  - Optional custom certificate title (200 char limit)
  - 4 visual templates: classic (navy blue), modern (teal), elegant (purple), minimal (gray)
  - Database: 3 new Courses columns (CertificateEnabled BIT, CertificateTitle NVARCHAR(200), CertificateTemplate NVARCHAR(50))
  - Backend: instructor.ts GET/PUT, progress.ts guard, CertificateService custom title, CertificatePdfService absolute positioning
  - Frontend: CourseSettingsEditor full UI (toggle, title input, visual card selector)
  - PDF Generation Fix: Replaced moveDown() with absolute Y positioning to guarantee single-page layout
  - Certificate Guard: progress.ts checks CertificateEnabled before issuance at 100% completion
  - Completion notification always sent (outside guard scope)
  - Files: 9 modified (schema.sql, instructor.ts, courses.ts, progress.ts, CertificateService.ts, CertificatePdfService.ts, instructorApi.ts, coursesApi.ts, CourseSettingsEditor.tsx, CourseDetailPage.tsx)
  - Status: 0 TypeScript errors, all templates single-page, settings persist correctly
- [x] **GDPR-Compliant Data Export System** - PRODUCTION READY (Feb 6, 2026) 📦
  - Complete user data portability with async processing
  - Data collection from 20+ tables (profile, enrollments, progress, certificates, transactions, chat, AI, comments, bookmarks)
  - Export format: ZIP with 28 JSON + 5 CSV + README (34 files in 7 folders)
  - Background processing: Cron jobs (every minute for processing, daily 3 AM for cleanup)
  - Email notifications: Beautiful HTML template when export ready
  - Resource management: 500MB size limit, 1GB min disk space requirement
  - Security: 7-day expiry, rate limiting (3 per 24h), user ownership verification
  - Download tracking: Metrics for download count and last download time
  - 3 REST API endpoints: POST /export-data, GET /status, GET /download/:id
  - Database: DataExportRequests table (14 columns, 3 indexes)
  - Bug fixes (8 total): Singleton pattern, disk space check, size validation, partial file cleanup, README safety, React hooks
  - Files: DataExportService.ts (812 lines), ExportJobProcessor.ts (313 lines), SettingsPage.tsx (export UI ~200 lines)
  - Dependencies: archiver@7.0.1, @types/archiver
  - Status: 0 TypeScript errors, export tested with real user data, all bugs fixed, production-ready
  - GDPR compliance: Fulfills right to data portability, complete documentation in README.txt
- [x] **Chat System with Conversation Deletion/Restoration** - PRODUCTION READY (Feb 5, 2026) 💬
  - Real-time direct messaging between users
  - Conversation soft-delete with IsActive flag (preserves data)
  - Automatic restoration when either party sends message
  - Real-time Socket.IO notifications (chat:conversation-restored event)
  - Privacy enforcement (AllowMessages setting with 403 errors)
  - User search dialog with debounced search (300ms, min 2 chars)
  - 6 REST API endpoints + 6 Socket.IO events
  - Database: ChatRooms, ChatMessages, ChatParticipants, ChatMessageReadStatus
  - Bug #23: Recipients see restored conversations in real-time
  - Bug #24: Senders can message after deleting own conversation
  - Bug #26: "New Message" button notifies recipient
  - Files: ChatService.ts (608 lines), Chat.tsx (643 lines), UserSearchDialog.tsx (161 lines)
  - Notification integration: DirectMessages category
  - Status: 0 TypeScript errors, all scenarios tested, production-ready
- [x] **Instructor Account Deletion with Course Management** - PRODUCTION READY (Jan 18-19, 2026, CASCADE fixes Feb 4, 2026) ✅
  - Complete account deletion system with instructor-specific flow
  - 3 course management options: Archive All / Transfer All / Force Delete
  - Password confirmation required before execution (security fix)
  - Transaction-safe operations with rollback on error
  - **CASCADE DELETE Fixes** (Feb 4, 2026): 4 FK constraints updated for automatic cleanup
    - CourseProgress.UserId → CASCADE DELETE
    - Invoices.TransactionId → CASCADE DELETE (payment chain)
    - EmailTrackingEvents.UserId → CASCADE DELETE (GDPR compliance)
    - EmailUnsubscribeTokens.UserId → CASCADE DELETE (GDPR compliance)
  - Automatic cleanup of 25+ related tables (Transactions, Enrollments, Notifications, etc.)
  - GDPR-compliant: All user personal data automatically deleted
  - Audit logging in AccountDeletionLog and CourseOwnershipHistory tables
  - **Bug #34 Fixed**: Archive/transfer delayed until password confirmation (not immediate)
  - **Bug #35 Fixed**: Instructors see teaching + enrolled courses via UNION ALL query
  - **Bug #36 Fixed**: TimeSpent mismatch (teaching=0, enrolled=seconds)
  - **Bug #37 Fixed**: Pagination stability with proper timestamps (not GETUTCDATE())
  - **Bug #38 Fixed**: Missing GROUP BY columns (c.CreatedAt, c.UpdatedAt)
  - Orphaned courses (InstructorId=NULL) filtered from public catalog (INNER JOIN Users)
  - Files: AccountDeletionService.ts, SettingsPage.tsx, enrollment.ts, courses.ts
  - Status: 38 total bugs fixed, 0 TypeScript errors, comprehensive verification complete
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
- [x] **Assessment Due Date Reminders** - PRODUCTION READY (Jan 20, 2026) ⏰
  - Cron scheduler: Daily at 9:00 AM UTC (`'0 9 * * *'`)
  - NotificationScheduler.ts (130 lines) - Central cron job management
  - NotificationHelpers.ts (320 lines) - Reusable SQL query helpers
  - Database: Added DueDate DATETIME2 NULL to Assessments table
  - API: POST/PUT/GET support for dueDate, manual test trigger endpoint
  - E2E Test: test_assessment_due_reminders.py (345 lines) - ALL PASSING
  - Notification: Type=assignment, Priority=urgent, "due in 2 days" message
  - Files: NotificationScheduler.ts, NotificationHelpers.ts, schema.sql, index.ts, assessments.ts
  - Status: 9 bugs fixed, 0 TypeScript errors, comprehensive verification complete
- [x] **Weekly Progress Summary** - PRODUCTION READY (Jan 21, 2026) 📊
  - Cron scheduler: Weekly on Mondays at 8:00 AM UTC (`'0 8 * * 1'`)
  - Aggregates past 7 days activity: lessons, videos, assessments, time spent, active courses
  - NotificationScheduler.ts (240 lines) - Added second cron job
  - NotificationHelpers.ts (217 bug fix) - Fixed IsComplete → IsCompleted
  - API: POST /api/notifications/test-weekly-summary (instructor/admin only)
  - E2E Test: test_weekly_progress_summary.py (554 lines) - ALL PASSING
  - Notification: Type=progress, Priority=normal, multi-line summary with emojis
  - Files: NotificationScheduler.ts, NotificationHelpers.ts, notifications.ts
  - Status: 2 bugs fixed, 0 TypeScript errors, production-ready for Monday Jan 27
- [x] **Notification Triggers** - 20/31 ACTIVE (Jan 21, 2026) ✅
  - Progress: Lesson completion, Video completion, Course completion
  - Course Management: Enrollment, New lessons, Course published
  - Live Sessions: Created, Updated, Deleted
  - Assessments: Created, Submitted, Graded, Due Date Reminders (cron)
  - Community: Office Hours completed with duration (Jan 17), Study Group Invitations, Study Group Member Joined (Jan 21)
  - System: Payment receipt, Refund confirmation, Password changed (Jan 17)
  - Socket.io real-time updates: Notification bell updates instantly
  - Implementation pattern: Get io from req.app.get('io'), create NotificationService(io)
  - Error handling: Non-blocking try-catch prevents feature failures
  - 11 triggers remaining: Direct messages, certificates, badges, etc.
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
  - Files modified: 5 (authStore, App, DashboardPage, ProfilePage, RegisterForm)
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
- [ ] If changing shared component (CourseCard, HeaderV5, etc.), verified it won't break other pages
- [ ] If modifying navigation config (`navigation.tsx`), verified all nav items still work
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

**Enrollment Controls Testing Checklist (Feb 10, 2026):**
- [x] CourseSettingsEditor: All 4 enrollment control fields with clear "x" buttons ✅
- [x] CourseSettingsEditor: "Clear All" buttons on Prerequisites and Learning Outcomes ✅
- [x] CourseCard: Shows "X/Y enrolled" when maxEnrollment set ✅
- [x] CourseCard: Visual chips appear ("Full" red, "Closed" orange, "Not Open" blue) ✅
- [x] CourseCard: Button shows correct label (Course Full, Enrollment Closed, Not Yet Open) ✅
- [x] CourseCard: Disabled button doesn't navigate to detail page ✅
- [x] CourseDetailPage: Enrollment control data properly loaded from API ✅
- [x] CourseDetailPage: Purchase button disabled when enrollment blocked ✅
- [x] CourseDetailPage: Capacity/date alerts shown when blocked ✅
- [x] Paid course with approval: Shows "Request Enrollment" instead of "Purchase Course" ✅
- [x] Request enrollment: Creates pending enrollment, no payment charged ✅
- [x] Backend validation: All enrollment paths enforce controls (free, paid, checkout) ✅
- [x] Date validation: Past close date blocks enrollment ✅
- [x] Date validation: Future open date blocks enrollment ✅
- [x] Capacity validation: At max enrollment blocks new enrollments ✅
- [x] TypeScript compilation: No errors ✅

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
- [ ] If modifying `CourseCard`, `ShareDialog`, `HeaderV5`, or other shared components, **VERIFIED** all usages
- [ ] If modifying navigation config (`navigation.tsx`), **VERIFIED** all nav items and test IDs
- [ ] Tested or listed all pages that use the component
- [ ] ShareDialog used by: 6 pages (3 course pages, 3 certificate pages)
- [ ] HeaderV5 used by: 39+ pages (all authenticated pages)

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
