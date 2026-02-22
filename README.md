# Mishin Learn - Smart Learning Platform

🎓 **AI-Powered Adaptive Learning Platform**

An innovative EdTech startup providing personalized learning experiences through AI tutoring, adaptive content delivery, and comprehensive progress analytics.

**Last Major Update**: February 22, 2026 - Mobile Optimization Phase 2 Complete 📱  
**Code Quality**: Grade A (95/100) - 85% type safety, 70% logging coverage, 0 TypeScript errors

## 🚀 Features

### Core Learning Platform
- **Adaptive Learning Engine** - Personalized learning paths based on individual progress
- **AI Tutoring System** - Interactive AI assistant providing real-time help and guidance  
- **Smart Content Delivery** - Dynamic course content adapted to learning style
- **Progress Analytics** - Detailed insights and performance tracking
- **Assessment System** - Adaptive testing and skill evaluation
- **Search Autocomplete** - Udemy-style live search dropdown with debouncing, keyboard navigation, and highlighted matches (February 17, 2026) 🔍
  - **Intelligent Debouncing**: 300ms delay prevents server overload, minimum 2 characters
  - **Keyboard Navigation**: Arrow Up/Down cycle results, Enter selects, Escape closes
  - **Visual Highlights**: Query text highlighted in bold primary color for quick scanning
  - **Loading States**: Spinner with "Searching courses..." while loading
  - **Empty States**: "No courses found" with helpful suggestions
  - **Race Guard**: Request ID counter prevents out-of-order API responses from overwriting newer results
  - **Reusable Component**: Two variants (header: compact for nav bars, hero: larger for landing page with button)
  - **Universal Integration**: PublicHeader (guest), HeaderV5 (authenticated), LandingPage hero
  - **Bug Fixes**: Regex global flag drift, DOM prop warnings, modulo-by-zero crashes, stale debounce cleanup
- **Mobile Optimization Phase 2** - All 12 core student pages fully mobile-optimized; 5-round exhaustive audit (February 22, 2026) 📱
  - **Pages (12)**: MyLearningPage, LessonDetailPage, NotificationsPage, ProfilePage, SettingsPage, NotificationSettingsPage, StudentProgressPage, StudentAssessmentDashboard, AssessmentTakingPage, MyCertificatesPage, CertificatePage, PublicCertificatePage
  - **Systemic Bug Fixed**: Consumer `py:` in PageContainer sx silently overrides base `pb:{xs:10,md:0}` (MobileBottomNav clearance) — replaced all 15 instances of `py` with `pt` across 8 files
  - **Other Fixes**: ProfilePage Tabs scrollable variant; SettingsPage `theme`/`muiTheme` naming collision; hardcoded hex/rgba → `alpha()`+palette tokens; CertificatePage severity split; `disableBottomPad` consistency on public pages
  - **Progress**: 37/73 pages done (50.7%) — Phase 0 (15/15) + Phase 1 (9/9) + Phase 2 (12/12 + 1 N/A) complete
- **Mobile Optimization Phase 1** - Responsive wrapper library + all 9 critical-path pages fully mobile-optimized (February 21, 2026) 📱
  - **Responsive Library**: `PageContainer`, `PageTitle`, `ResponsiveDialog`, `ResponsivePaper`, `ResponsiveStack`, `useResponsive`, layout `constants` — 8 files, single source of truth for all mobile patterns
  - **Phase 1 Pages**: LandingPage, Login, Register, ForgotPassword, ResetPassword, EmailVerification, CoursesPage, CourseDetailPage, DashboardPage — all with bottom-nav padding, responsive typography, responsive spacing
  - **Auth Bug Fix**: `<Link component="button">` inside `<form>` submits by default — fixed with `type="button"` on all nav-links in LoginForm and RegisterForm
  - **Logout Hardening**: `logout()` now clears auth state immediately (before server call); all nav handlers `await logout()`; all 401 interceptors unified to use `useAuthStore.getState().logout()`; App.tsx stale-state guard added
  - **Progress**: 24/73 pages done (32.9%) — Phase 0 (15/15) + Phase 1 (9/9) complete
- **Theme Token System** - Centralised design primitives in `client/src/theme/` — eliminates hardcoded colors/shadows/borderRadius across 2,500+ sx props and protects against MUI version upgrades (February 21, 2026) 🎨
  - **Extended Palette**: All 5 palettes (`primary`, `secondary`, `success`, `warning`, `error`) have 50-900 shades — `sx={{ bgcolor: 'primary.50' }}` works everywhere
  - **Custom Tokens**: `theme.custom.colors` (8 semantic colors), `theme.custom.shadows` (9 box-shadow names), `theme.custom.radii` (7 border-radius values)
  - **Reusable Fragments**: `tokens.ts` provides 18 `SxProps<Theme>` objects (`cardSx`, `truncateSx`, `centeredFlexSx`, etc.) to spread into any `sx` prop
  - **3-Round Audit**: Found and fixed critical bug (borderRadius raw numbers ×12 multiplier → 192px), shadow RGB values (wrong brand colors corrected), duplicate shadow tokens, and JSDoc exception gaps
  - **Files**: `client/src/theme/index.ts` (refactored), `client/src/theme/tokens.ts` (new), `client/src/main.tsx` (Toaster color fix)
- **CourseSelector — Reusable Course Dropdown** - Single component replaces 9 inline course dropdowns across the platform (February 19, 2026) 🔽
  - **Lazy Rendering**: Renders 50 courses initially; IntersectionObserver + scroll loads 12 more at a time
  - **Type-to-Search**: Client-side filter across full course list — no re-fetches needed
  - **Helper Text**: "X of Y courses loaded — type to search or scroll for more" shown automatically when list exceeds display count
  - **Flexible**: Single-select and multi-select (chips) modes; optional synthetic "All Courses" first option; custom option/tag renderers; `excludeIds` support
  - **Full Data**: All consumer pages updated to fetch `limit=10000` (via `getCoursesForDropdown()`); ensures dropdown always shows complete course list
  - **10 Instances**: CourseAnalytics, VideoAnalytics, StudentManagement, StudyGroups, Tutoring, InstructorSessions (new), StudentSessions, CreateSessionModal, CreateGroupModal, CourseSettingsEditor
- **Analytics Hub (Hardened)** - Full instructor analytics with exhaustive audit pass — 68 bug fixes across 23 rounds (February 18, 2026) 🔧
  - **Course Performance Table**: Replaced 1004-card grid with sortable/searchable/paginated MUI table (sort by students, progress, completions, time; 10/25/50/100 rows per page; color-coded progress bars)
  - **API Services Hardened**: Both `analyticsApi.ts` and `assessmentAnalyticsApi.ts` now have env-aware URLs, auth interceptors, 401 auto-logout, and Content-Type headers
  - **SQL Correctness**: `COUNT(DISTINCT ...)` used where LEFT JOINs would inflate aggregates; NULL-safe `ISNULL()` name concatenation; `Array.isArray()` guard after every `JSON.parse()`
  - **UI Completeness**: All dashboard views have loading state (spinner + disabled buttons), error state (alert + retry), and empty state (informational message)
  - **Privacy Enforcement**: `SettingsService.filterUserData()` applied to all at-risk and low-progress student email fields
  - **Type Safety**: Duplicate `AuthRequest` interface removed; engagement score normalization prevents div-by-zero
- **Course Ratings & Reviews** - 5-star rating system with text reviews, real-time updates, and instructor notifications (February 15, 2026) ⭐
  - **Student Feedback**: 1-5 star ratings with optional review text (max 2000 chars)
  - **Real-time Updates**: Ratings update automatically on all pages (My Learning, Catalog, Course Detail)
  - **Instructor Notifications**: Notified on new ratings (priority: normal) and updated ratings (priority: low), controllable via Settings → Notifications → Course Updates → Course Ratings
  - **Validation**: Must be enrolled, instructors cannot rate own courses, 1 rating per student
  - **Rich UI**: Rating summary cards, distribution bars, paginated reviews with sorting
  - **Edit/Delete**: Students can edit or delete their ratings with 3-dots menu
  - **Denormalized Performance**: Average rating and count stored on Courses table for fast catalog queries

### Data Privacy & Security
- **Terms of Service & Privacy Policy** - Database-driven legal compliance with versioned documents and GDPR-compliant acceptance tracking (February 14, 2026) 📜
  - **Versioned Documents**: TOS, Privacy Policy, and Refund Policy stored in database (update without code deployment)
  - **Consent Gate**: Registration requires explicit TOS + Privacy Policy acceptance
  - **Existing User Banner**: Full-screen overlay blocks app until latest terms accepted
  - **Refund Policy**: Informational page (no acceptance required) with cross-links to TOS + Privacy
  - **GDPR Audit Trail**: IP address, user agent, and timestamp recorded with each acceptance
  - **Public Pages**: /terms, /privacy, /refund-policy accessible without authentication
- **GDPR-Compliant Data Export** - Complete user data portability with one-click export (February 6, 2026) 📦
  - **Comprehensive Data Collection**: 20+ tables (profile, enrollments, progress, certificates, transactions, chat, AI tutoring, comments, bookmarks, notifications)
  - **Multiple Formats**: JSON (complete data) + CSV (summary) + README documentation
  - **Background Processing**: Async export generation with email notification when ready
  - **Resource Management**: 500MB size limit, 1GB minimum disk space requirement
  - **Security**: 7-day expiry, rate limiting (3 per 24h), user ownership verification
  - **Export Contents**: 28 JSON files + 5 CSV files organized in 7 folders
  - **Status Tracking**: Real-time status polling (pending → processing → completed)
  - **Download Tracking**: Metrics for download count and last download time
- **Privacy Settings** - Comprehensive privacy controls (profile visibility, email, progress, messages) - VERIFIED WORKING (Jan 10, 2026) ✅
  - **ProfileVisibility**: 3-tier system (public/students/private) enforced across platform
  - **ShowEmail**: Enforced in 7 endpoints with instructor override for enrolled students
  - **ShowProgress**: Enforced with 403 errors, instructor override for enrolled students
  - **AllowMessages**: Stored (not enforced - chat system disabled)
- **Account Deletion** - Production-ready account deletion system with instructor course management and automatic CASCADE DELETE (Jan 18-19, 2026, CASCADE fixes Feb 4, 2026) ✅
  - **Archive All Courses**: Students maintain access, instructor can restore later
  - **Transfer All Courses**: Select new instructor for seamless course continuity
  - **Force Delete All Courses**: Orphan courses, students lose access
  - Password confirmation required, transaction-safe, comprehensive audit logging
  - **CASCADE DELETE**: Automatic cleanup of 25+ related tables (Transactions→Invoices, CourseProgress, EmailTrackingEvents, etc.)
  - **GDPR Compliant**: All user personal data automatically deleted
  - Instructors see teaching + enrolled courses via UNION ALL query
  - Orphaned courses filtered from public catalog (INNER JOIN Users)

### Instructor Tools
- **Unified Course Management** - Single 4-tab interface for complete course control (Jan 14, 2026) ✅
  - **Course Details**: Edit metadata (title, description, category, level, price, thumbnail)
  - **Lesson Details**: Manage curriculum and lessons
  - **Assessments**: Configure course assessments
  - **Settings**: Course prerequisites, learning outcomes, enrollment controls, certificate settings, and visibility controls (Phase 4 - Feb 12, 2026) ✅
    - **Prerequisites**: Multi-select prerequisite courses with autocomplete search
    - **Learning Outcomes**: Dynamic learning outcomes list with inline validation (200 char limit)
    - **Enrollment Controls**: Maximum enrollment capacity, enrollment date windows, manual approval requirement
    - **Certificate Settings (Phase 3)**: Enable/disable certificates, custom certificate title (200 chars), 4 visual templates (classic/modern/elegant/minimal)
    - **Advanced Visibility (Phase 4 - NEW)**: 
      - **Public/Unlisted Control**: Toggle course visibility in catalog (public) vs direct-link-only access (unlisted)
      - **Preview Links**: Generate UUID tokens to share draft/unpublished courses for early feedback
      - **Preview Mode Security**: All interactive actions (enroll, purchase, bookmark, share) blocked in preview mode
      - **Instructor Draft Access**: View own draft courses via regular URL with status banner
      - **Direct Link Sharing**: Unlisted published courses hidden from catalog but accessible via direct link
      - **Token Management**: Generate, copy, and regenerate preview tokens with invalidation warnings
    - Change detection and save confirmation
    - Visual chips with delete functionality
    - Clear "x" buttons on all input fields for easy reset
    - "Clear All" buttons for prerequisites and learning outcomes sections
  - Smart navigation with query parameters
  - Real-time validation and error handling
  - Level field normalization (beginner, intermediate, advanced, expert)
  - Category mapping (10 categories with user-friendly names)
- **Course Prerequisites System** - Enforce learning paths and course dependencies (Feb 7, 2026) ✅
  - Instructors set required prerequisite courses
  - Students blocked from enrolling without completing prerequisites
  - Visual completion tracking (✅ complete, ⏳ in-progress, ❌ not enrolled)
  - Clear error messages with missing course names
  - Automatic validation filters published courses only
  - Prevents circular dependencies
- **Enrollment Controls** - Manage course capacity, timing, and approval workflow (Feb 10, 2026) ✅
  - Maximum enrollment capacity with automatic "Course Full" blocking
  - Enrollment date windows (open/close dates) with visual indicators
  - Manual approval requirement for paid/free courses (request → approve → enroll)
  - Course cards show status: "Full" (red), "Closed" (orange), "Not Yet Open" (blue)
  - Consistent enforcement across all enrollment paths (cards, detail page, checkout)
  - Paid courses with approval show "Request Enrollment" instead of immediate payment
- **Course Creation Tools** - Rich authoring environment with comprehensive validation
- **Student Management** - View enrolled students with course filtering
- **Analytics Dashboard** - Course performance metrics and insights

### Advanced Features
- **Real-time Course Updates** - Automatic page refreshes when instructors edit courses (February 13, 2026) 🔄
  - **Silent Refetch UX**: Students see updates instantly without loading spinners or scroll disruption
  - **Debouncing Strategy**: 500ms server + 300ms/500ms client debouncing batches rapid edits (10 saves → 1 refetch)
  - **Room-based Broadcasting**: Socket.IO rooms (`course-{id}`, `courses-catalog`) for efficient targeted updates
  - **Auto-Join Rooms**: Users join `courses-catalog` on connect, enrolled users join `course-{id}` rooms immediately
  - **Event Types**: `course:updated` (metadata/lessons), `course:catalog-changed` (publish/unpublish), `course:enrollment-changed` (count + status)
  - **Frontend Hooks**: `useCourseRealtimeUpdates` (detail page), `useCatalogRealtimeUpdates` (catalog page)
  - **Reconnection-Safe**: `onConnect`/`offConnect` pattern survives socket reconnections
  - **Memory-Leak-Safe**: Complete cleanup on unmount, stale closure prevention
  - **Backend Architecture**: CourseEventService singleton, 21 emit sites (all after res.json(), isolated try-catch)
  - **Enrollment Enhancements (Feb 14)**: Pending approvals, approve/reject actions update dashboards instantly, timestamps auto-refresh every 60s
  - Files: 19 total (3 new services/hooks, 16 modified routes/pages)
- **Real-time Collaboration** - Live sessions, chat, and peer learning ✅
- **Direct Messaging System** - Real-time chat with conversation management, soft delete, automatic restoration, typing indicators, read receipts, and privacy controls (February 5, 2026) 💬
  - **User Search**: Find and message any user with debounced search
  - **Privacy Integration**: Respects AllowMessages setting with enforcement
  - **Conversation Management**: Delete conversations (soft delete preserves data)
  - **Automatic Restoration**: Conversations reappear when either party messages
  - **Real-time Notifications**: Recipients instantly see restored conversations
  - **Notification Integration**: DirectMessages category with in-app + email
  - **Bug Fixes #23-26**: Restoration flow, sender reactivation, recipient notifications
- **Live Study Sessions** - Instructor-led collaborative learning with enterprise-grade reliability (race condition protection, atomic joins, multi-device sync) ✅
- **Study Groups** - Peer collaboration spaces with online member tracking and invitation system (ENHANCED Jan 21, 2026) ✅  
  - **User Invitations**: Members can invite others via debounced search modal
  - **Member Notifications**: Real-time notifications when new members join
  - **Search Optimization**: 300ms debounced auto-search (courses page pattern)
  - **Security**: Self-invite prevention, active user filtering, SQL injection protection
  - **Notification Subcategories**: GroupInvites (invitations), GroupActivity (member joins)  
- **Virtual Office Hours** - Queue-based instructor support with presence badges ✅
- **Presence System** - Real-time online/away/busy/offline status tracking with logout cleanup and "appear offline" support; new users default to 'online' for better UX (Jan 17, 2026) ✅
- **Auto-Updating Timestamps** - Relative time displays ("X minutes ago") automatically update every 60 seconds across 6 components without page refresh (Jan 12, 2026) ✅
- **Email Verification** - Secure account verification with Gmail SMTP, 6-digit codes, beautiful UI, resend with cooldown, profile badge integration ✅
- **Email Notification System** - Complete email delivery with realtime, daily, and weekly digest options, tracking, analytics, and one-click unsubscribe (Phases 1-3 Complete - 100%) ✅
  - **Active Triggers**: 29/31 implemented (93.5%) - lesson completion, course completion with certificates, live sessions x6, course management, assessments, payments, office hours queue + completion, study groups, comments, AI tutoring, at-risk detection, weekly progress, due date reminders, account deletion alerts to admins
  - **Delivery Options**: Realtime, daily digest (8 AM), weekly digest (Monday 8 AM)
  - **Email Tracking**: Open/click tracking and analytics
  - **User Control**: Customizable preferences with quiet hours and one-click unsubscribe
  - **Smart Course Dropdown**: Tutoring sessions now show user's enrolled courses for context-aware AI responses (Feb 3, 2026) ✅
- **Assessment Due Date Reminders** - Automated cron scheduler sends notifications to students for assessments due in 2 days, daily at 9 AM UTC (January 20, 2026) ⏰
- **At-Risk Student Detection** - Weekly cron job (Monday 10 AM UTC) identifies at-risk students (7+ days inactive OR critical risk level) and notifies instructors with grouped alerts, risk breakdown, and duplicate prevention (February 4, 2026) ⚠️
- **Notifications Center** - Full-page notification management with **centralized Zustand store architecture**, real-time updates, pagination, filtering (type/priority), cross-tab synchronization, optimistic UI updates, and toast notifications (REFACTORED Jan 14, 2026) ✅
  - **Architecture**: Single socket listener in App.tsx → Zustand store → Components
  - **Features**: Optimistic updates, idempotent actions, priority-based toast (urgent/high: 5s, normal/low: 3s)
  - **Bug Fixes**: Resolved 13 critical bugs including race conditions and memory leaks
- **Privacy Settings** - Comprehensive privacy controls (profile visibility, email, progress, messages) - VERIFIED WORKING (Jan 10, 2026) ✅
  - **ProfileVisibility**: 3-tier system (public/students/private) enforced across platform
  - **ShowEmail**: Enforced in 7 endpoints with instructor override for enrolled students
  - **ShowProgress**: Enforced with 403 errors, instructor override for enrolled students
  - **AllowMessages**: Stored (not enforced - chat system disabled)
- **User Profile Management** - Comprehensive profile with 5 tabs (personal info, password, billing, preferences, account info) ✅
- **Payment System** - Stripe integration with secure checkout, professional invoice PDFs, production-ready error handling, enhanced refund UI, **database-level duplicate prevention**, **transaction-based payment verification** (Phases 1-6 Complete - 100%) ✅
  - **Payment Security** (Feb 11, 2026): Instructor status changes verify completed transactions to prevent bypass scenarios
  - **Webhook Recovery**: Manual activation allowed when payment exists but webhook failed
  - **Re-activation Support**: Cancelled students who paid can be reactivated by instructor
- **Notification Preferences** - **Hybrid 3-level control system** with Global→Category→Subcategory toggles, 68 database columns (includes dedicated EnrollmentSuspended/Cancelled toggles - Feb 10, 2026), separate in-app/email controls, quiet hours, email digest options (FULLY IMPLEMENTED with dedicated /settings/notifications page - Dec 29, 2025) ✅
- **Bookmark System** - Save and organize favorite courses with cross-page synchronization (FULLY FUNCTIONAL - Dec 18, 2025) ✅
- **Avatar Upload** - Image upload with automatic processing and optimization ✅
- **Settings Page** - Privacy settings, appearance customization, account deletion, and data management (UPDATED Jan 19, 2026) ✅
  - Privacy controls fully functional and enforced system-wide
  - Appearance settings (theme/language/fontSize) stored but UI application pending
  - **Account Deletion**: Instructor-specific flow with 3 course management options
- **Account Deletion** - Production-ready account deletion system with instructor course management and automatic CASCADE DELETE (Jan 18-19, 2026, CASCADE fixes Feb 4, 2026) ✅
  - **Archive All Courses**: Students maintain access, instructor can restore later
  - **Transfer All Courses**: Select new instructor for seamless course continuity
  - **Force Delete All Courses**: Orphan courses, students lose access
  - Password confirmation required, transaction-safe, comprehensive audit logging
  - **CASCADE DELETE**: Automatic cleanup of 25+ related tables (Transactions→Invoices, CourseProgress, EmailTrackingEvents, etc.)
  - **GDPR Compliant**: All user personal data automatically deleted
  - Instructors see teaching + enrolled courses via UNION ALL query
  - Orphaned courses filtered from public catalog (INNER JOIN Users)
- **Transactions History** - Complete payment history with refund requests (DATABASE SETUP COMPLETE) ✅
- **Unified Share System** - Consistent social sharing across courses and certificates with native share support, visual previews, and analytics tracking (Jan 24, 2026) ✅
  - **7 Platforms**: Native (Windows/mobile), Copy, Twitter, Facebook, LinkedIn, WhatsApp, Email
  - **6 Pages**: All course and certificate pages use same component
  - **Analytics**: Separate tracking for courses vs certificates with full metadata
  - **User Feedback**: Success confirmation even with confusing browser messages
- **Course Creation Tools** - Rich authoring environment for educators
- **Mobile Responsive** - Seamless experience across all devices
- **Social Learning** - Community features and collaborative projects
- **Gamification** - Points, badges, and achievement systems

## 📧 Email Notification System

**Complete email delivery infrastructure with 31 notification triggers** (24 active, 7 remaining)

### Active Email Triggers
1. **Lesson Completion** - Student progress updates + instructor milestone alerts (25%, 50%, 75%, 100%)
2. **Live Session Created/Updated/Deleted/Cancelled** - Notifications sent to all enrolled students
3. **Live Session Starting Soon** - Automated cron job (every 15 min) sends reminders 1 hour before sessions start (Feb 4, 2026) ⏰
4. **AI Tutoring Response** - Student notified when AI tutor answers questions
5. **Assessment Due Date Reminders** - Automated daily cron job (9 AM UTC) sends reminders for assessments due in 2 days
6. **Weekly Progress Summary** - Automated weekly cron job (Monday 8 AM UTC) sends activity summaries to students with activity in past 7 days

### Email Delivery Options
Users can choose their preferred notification delivery in Profile → Preferences:
- **Real-time**: Immediate email for each notification
- **Daily Digest**: One summary email per day at 8 AM UTC
- **Weekly Digest**: One summary email per week (Monday 8 AM UTC)
- **In-app Only**: Notifications without emails

### Features
- ✅ Professional HTML email templates with type-specific styling
- ✅ Email tracking (opens/clicks) and analytics
- ✅ One-click unsubscribe with beautiful confirmation page
- ✅ Quiet hours support (notifications queued and sent after quiet hours end)
- ✅ Preference enforcement (respects all user settings)
- ✅ Automatic digest aggregation and scheduled delivery via cron jobs

**See [NOTIFICATION_TRIGGERS_IMPLEMENTATION_PLAN.md](NOTIFICATION_TRIGGERS_IMPLEMENTATION_PLAN.md) for complete trigger list and implementation roadmap.**

## 🔒 Privacy Features

**Complete Privacy Control System** (Implemented December 18, 2025)

Users can customize their privacy settings to control what information others can see:

### Profile Visibility
- **Public**: Anyone can view your profile
- **Students Only**: Only classmates in your courses can view
- **Private**: Only you can view your profile

### Email Privacy
- **Show Email**: Display your email in user lists and profiles
- **Hide Email**: Keep your email private (shown as "Email hidden")

### Progress Privacy
- **Show Progress**: Allow others to view your learning progress
- **Hide Progress**: Keep your progress private

### Message Privacy (Ready for Chat Re-enablement)
- **Allow Messages**: Accept messages from other users
- **Block Messages**: Prevent users from messaging you

**Instructor Override**: Instructors can always view enrolled students' profiles, emails, and progress regardless of privacy settings.

**Access Settings**: Navigate to Settings page (`/settings`) to customize your privacy preferences.

**Privacy Testing**: Run `node test-privacy-settings.js` for comprehensive automated testing.

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Material-UI (MUI)** for modern UI components
- **Chart.js/Recharts** for data visualization
- **React Router** for navigation
- **Socket.io** for real-time features

### Backend
- **Node.js** with Express and TypeScript
- **SQL Server** database
- **JWT Authentication** 
- **Socket.io** for real-time communication
- **AI Integration** for tutoring capabilities

### Testing
- **pytest + Playwright** for E2E automated testing
- **597 test IDs** instrumented across 31 components (108.5% coverage)
- Comprehensive test selector map for reliable test automation
- See `TESTING_GUIDE.md` for setup and writing tests

### Database
- **SQL Server** with comprehensive schema for:
  - User management and profiles
  - Course and lesson structure
  - Progress tracking and analytics
  - AI tutoring sessions
  - Real-time chat and collaboration

## 📁 Project Structure

```
mishin-learn-platform/
├── client/          # React + TypeScript frontend
├── server/          # Node.js + Express backend
├── shared/          # Shared types and utilities
└── docs/           # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- SQL Server (localhost connection configured)
- npm or yarn

### Installation

1. **Install all dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Configure database connection**
   - Update `server/.env` with your SQL Server details
   - Default: `data source=SergeyM\\SQLEXPRESS;initial catalog=startUp1;trusted_connection=true`

4. **Run development servers**
   ```bash
   npm run dev
   ```

This will start both the client (http://localhost:5173) and server (http://localhost:3001).

## 🎯 Core Modules

### 1. Learning Dashboard
- Personalized course recommendations
- Progress overview and analytics
- Upcoming sessions and deadlines
- Achievement tracking

### 2. AI Tutoring System
- Interactive AI assistant
- Adaptive questioning
- Personalized explanations
- Learning path optimization

### 3. Course Management
- Rich course creation tools
- Interactive lesson builder
- Assessment and quiz system
- Resource management

### 4. Analytics & Insights
- Learning progress visualization
- Performance metrics
- Time tracking
- Skill development analysis

### 5. Collaboration Features
- Real-time chat and forums
- Live learning sessions
- Peer-to-peer learning
- Group projects

## 🎨 Design System

**Mishin Brand Identity**
- Modern, clean, and accessible design
- Consistent color palette and typography
- Mobile-first responsive approach
- Intuitive user experience

## 🔧 Development

### Available Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build production bundles
- `npm run start` - Start production server
- `npm run clean` - Clean build directories

### Environment Variables
See `.env.example` files in client and server directories for required configuration.

## 📊 Business Model

**Target Market**: Individual learners, students, professionals seeking skill development

**Revenue Streams**:
- Subscription-based access to premium content
- Course marketplace with revenue sharing
- Corporate training solutions
- AI tutoring premium features

## 🚀 Future Roadmap

- [ ] Mobile app development
- [ ] Advanced AI/ML features
- [ ] VR/AR learning experiences
- [ ] Enterprise solutions
- [ ] API for third-party integrations

## 📄 License & Copyright

**© 2025 Sergey Mishin. All rights reserved.**

This software is proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software is strictly prohibited without explicit written permission from the copyright holder.

- **Source Code**: Available for viewing and educational purposes only
- **Commercial Use**: Prohibited without explicit license agreement
- **Contact**: s.mishin.dev@gmail.com for licensing inquiries

For full license terms, see [LICENSE](./LICENSE) file.

---

**Built with ❤️ by Sergey Mishin** | *Empowering learners through intelligent technology*