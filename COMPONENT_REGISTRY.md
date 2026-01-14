# Mishin Learn Platform - Component Registry

**Last Updated**: January 14, 2026 - Notification System Architecture Refactored  
**Purpose**: Quick reference for all major components, their dependencies, and relationships

---

## 📖 HOW TO USE THIS REGISTRY

**When modifying a component:**
1. Find the component in this registry
2. Check "Services Used" - these API calls might be affected
3. Check "Related Components" - these might break if you change this component
4. Check "Used By" - these pages/components depend on this one
5. Review "Common Issues" for known problems

---

## 🎓 Live Sessions Components

### InstructorSessionsList
**Path**: `client/src/components/LiveSessions/InstructorSessionsList.tsx`  
**Purpose**: Instructor dashboard for managing live sessions

**Services Used**:
- `liveSessionsApi.getInstructorSessions()` - Fetch instructor's sessions
- `liveSessionsApi.startSession(id)` - Start a scheduled session
- `liveSessionsApi.endSession(id)` - End a live session
- `liveSessionsApi.cancelSession(id)` - Cancel a scheduled session
- `liveSessionsApi.deleteSession(id)` - Delete session
- `liveSessionsApi.updateSession(id, data)` - Update session (via EditSessionModal)

**Socket.IO Events**:
- Listens: `session-created`, `session-started`, `session-ended`, `session-cancelled`, `session-updated`, `session-deleted`, `attendee-joined`, `attendee-left`
- Real-time updates for all session state changes and attendee activity
- Multi-device synchronization (changes from one tab appear in all tabs)

**Features**:
- Tab filters: All, Upcoming, Live, Past
- Real-time attendee count with join/leave notifications
- Start/End/Cancel/Edit/Delete actions
- Toast notifications for all events with user names
- Edit modal with auto-populated form data
- Delete confirmation dialog

**Status**: ✅ Production-ready (hardened January 7, 2026)

---

### StudentSessionsList
**Path**: `client/src/components/LiveSessions/StudentSessionsList.tsx`  
**Purpose**: Student view for browsing and joining live sessions

**Services Used**:
- `liveSessionsApi.getCourseSessions(courseId)` - Fetch sessions for enrolled courses
- `liveSessionsApi.joinSession(id)` - Join a live session
- `liveSessionsApi.leaveSession(id)` - Leave a session
- `enrollmentApi.getMyEnrollments()` - Get student's enrolled courses

**Socket.IO Events**:

---

### QueueDisplay (Office Hours)
**Path**: `client/src/components/OfficeHours/QueueDisplay.tsx`  
**Purpose**: Display and manage office hours queue with real-time wait times

**Key Features**:
- ✅ **Auto-Updating Timestamps** (Jan 12, 2026) - 60-second timer updates "Joined X ago" / "Admitted X ago" automatically
- Real-time queue updates via Socket.IO
- Student presence status badges
- Admit/Complete/Cancel actions for instructors
- Wait time calculations with `formatDistanceToNow`

**Timestamp Implementation**:
```typescript
const [, setCurrentTime] = useState(Date.now()); // Re-render trigger
useEffect(() => {
  const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
  return () => clearInterval(interval); // Cleanup
}, []);
```

**Status**: ✅ Production-ready with auto-updating timestamps

---

## 🔔 Notifications Components

### NotificationsPage
**Path**: `client/src/pages/Notifications/NotificationsPage.tsx`  
**Purpose**: Full-page notification center with filtering and pagination

**Architecture** (Refactored Jan 14, 2026):
- ✅ **Centralized State** - Reads from Zustand store
- ✅ **No Socket Listeners** - Removed ~100 lines of duplicate socket code
- ✅ **Optimistic Updates** - All actions update store immediately
- ✅ **Real-time Sync** - Updates via App.tsx socket listeners
- ✅ **Auto-Updating Timestamps** - 60-second intervals

**Features**:
- View all notifications with filtering
- Mark individual/all as read
- Delete notifications
- Filter by type (progress, risk, achievement, etc.)
- Filter by priority (urgent, high, normal, low)
- Filter by status (all/unread)
- Pagination (20 per page)
- Click-to-navigate for notifications with ActionUrl
- Real-time cross-tab synchronization

**State Management**:
```tsx
const { notifications, setNotifications, removeNotification, 
        markAsRead, markAllAsRead } = useNotificationStore();
```

**No Socket Events** - All handled centrally in App.tsx:
- `notification-created` → Store updated → Page rerenders
- `notification-read` → Store updated → Page rerenders
- `notifications-read-all` → Store updated → Page rerenders
- `notification-deleted` → Store updated → Page rerenders

**Status**: ✅ Complete, fully refactored (Jan 14, 2026)

---

#### NotificationBell
**Path**: `client/src/components/Notifications/NotificationBell.tsx`  
**Purpose**: Header notification dropdown with badge count

**Architecture** (Refactored Jan 14, 2026):
- ✅ **Centralized State** - Reads from Zustand store (no local notification state)
- ✅ **Computed Values** - Uses `useMemo` to filter unread from store
- ✅ **No Socket Listeners** - All listeners centralized in App.tsx
- ✅ **Optimistic Updates** - API call + immediate store update
- ✅ **Auto-Updating Timestamps** - Refreshes every 60s

**Key Features**:
- Unread count badge (red)
- Queued count badge (blue, during quiet hours)
- Recent 5 unread notifications preview
- Click to navigate or mark as read
- Real-time sync across tabs via socket events
- Toast notifications disabled in bell (handled by App.tsx)

**State Management**:
```tsx
const { notifications, unreadCount, queuedCount } = useNotificationStore();
const unreadNotifications = useMemo(() => 
  notifications.filter(n => !n.IsRead).slice(0, 5), 
  [notifications]
);
```

**Status**: ✅ Production-ready, fully refactored (Jan 14, 2026)

---

## 💬 Chat Components

### Chat
**Path**: `client/src/pages/Chat/Chat.tsx`  
**Purpose**: Real-time chat with rooms and direct messages

**Key Features**:
- ✅ **Auto-Updating Timestamps** (Jan 12, 2026) - Message times and room "last message" times update every 60 seconds
- Room list with last message preview
- Message history with infinite scroll
- Typing indicators
- Real-time message delivery

**Status**: ✅ Production-ready with auto-updating timestamps

---

## 🤖 AI Tutoring Components

### Tutoring
**Path**: `client/src/pages/Tutoring/Tutoring.tsx`  
**Purpose**: AI-powered tutoring sessions with multiple models

**Key Features**:
- ✅ **Auto-Updating Timestamps** (Jan 12, 2026) - Session "Updated X ago" and message times update automatically
- Session management (create, select, delete)
- Message history with AI responses
- Model selection (GPT-4, GPT-4 Mini, GPT-3.5)
- Suggestions and recommendations

**Status**: ✅ Production-ready with auto-updating timestamps

---

## 🎓 Learning Components

### MyLearningPage
**Path**: `client/src/pages/Learning/MyLearningPage.tsx`  
**Purpose**: Student dashboard showing enrolled courses

**Key Features**:
- ✅ **Auto-Updating Timestamps** (Jan 12, 2026) - "Last accessed X ago" updates every 60 seconds
- Course progress tracking
- Pagination (20 per page)
- Course continuation
- Bookmark integration

**Status**: ✅ Production-ready with auto-updating timestamps

---
- Listens: `session-created`, `session-started`, `session-ended`, `session-cancelled`, `session-updated`, `session-deleted`, `attendee-joined`, `attendee-left`
- Real-time session status updates, capacity changes, and deletions
- Refetches on `session-created` to show new sessions

**Features**:
- Course filter dropdown (all enrolled courses)
- Tab filters: All, Upcoming, Live, Past
- Real-time attendee count and capacity updates
- Join/Leave buttons with instant feedback
- Session cards with all metadata (instructor, schedule, materials)
- Toast notifications for all events

**Status**: ✅ Production-ready (hardened January 7, 2026)

---

### LiveSessionCard
**Path**: `client/src/components/LiveSessions/LiveSessionCard.tsx`  
**Purpose**: Reusable session card component with role-based actions

**Props**:
- `session: LiveSession` - Session data
- `role: 'instructor' | 'student'` - User role
- Action callbacks: `onJoin`, `onLeave`, `onStart`, `onEnd`, `onEdit`, `onCancel`, `onDelete`

**Features**:
- Status badges (Scheduled, Live, Ended, Cancelled) with colors
- Attendee count with capacity (e.g., "15 / 50")
- Course title chip (if available)
- Instructor name with avatar
- Formatted date/time with timezone
- Duration display
- Materials link (if available)
- Stream URL button (when live)
- Conditional actions based on role and session status

**Status**: ✅ Production-ready

---

### EditSessionModal
**Path**: `client/src/components/LiveSessions/EditSessionModal.tsx`  
**Purpose**: Modal form for editing scheduled live sessions

**Services Used**:
- `liveSessionsApi.getSession(id)` - Fetch session data (auto-loads on open)
- `liveSessionsApi.updateSession(id, data)` - Submit updates
- `coursesApi.getCourses()` - Lazy-load course options

**Features**:
- Auto-fetches and pre-populates all fields when opened
- Form validation (title, description, schedule, capacity ≥1, duration ≥1)
- DateTimePicker for scheduling
- Autocomplete for course selection (lazy-loaded, searchable)
- Capacity cannot be reduced below current attendee count (backend validation)
- Materials input (JSON string)
- Success/error toast notifications
- Only works for scheduled sessions

**Status**: ✅ Production-ready

---

### CreateSessionModal
**Path**: `client/src/components/LiveSessions/CreateSessionModal.tsx`  
**Purpose**: Modal form for creating new live sessions

**Services Used**:
- `liveSessionsApi.createSession(data)` - Create new session
- `coursesApi.getCourses()` - Lazy-load course options (50 initial, +12 on scroll, search up to 100)

**Features**:
- Form validation (all required fields)
- DateTimePicker for scheduling (must be future date)
- Autocomplete for course selection (lazy-loaded with infinite scroll)
- IIFE pattern ensures selected course always in options list
- Default capacity: 50, default duration: 60 minutes
- Materials input (optional JSON string)
- Success/error toast notifications
- Sends notifications to all enrolled students (respects preferences)

**Status**: ✅ Production-ready

---

### useLiveSessionSocket Hook
**Path**: `client/src/hooks/useLiveSessionSocket.ts`  
**Purpose**: React hook for Socket.IO event handling

**Socket Events Supported**:
- `session-created` → `onSessionCreated(data)`
- `session-started` → `onSessionStarted(data)`
- `session-ended` → `onSessionEnded(data)`
- `session-cancelled` → `onSessionCancelled(data)`
- `session-updated` → `onSessionUpdated(data)`
- `session-deleted` → `onSessionDeleted(data)`
- `attendee-joined` → `onAttendeeJoined(data)`
- `attendee-left` → `onAttendeeLeft(data)`

**Usage**:
```typescript
useLiveSessionSocket({
  onSessionStarted: (data) => {
    // Update UI for started session
  },
  onAttendeeJoined: (data) => {
    // Show toast: `${data.userName} joined`
  }
});
```

**Status**: ✅ Production-ready

---

## 🎯 PAGES (Entry Point Components)

### Authentication Pages

#### EmailVerificationPage
**Path**: `client/src/pages/Auth/EmailVerificationPage.tsx`  
**Route**: `/verify-email`  
**Purpose**: Standalone page for email verification with 6-digit code input

**Services Used**:
- `verificationApi.verifyCode(code)` - Validate verification code
- `verificationApi.resendVerificationCode()` - Request new code
- `authStore.updateEmailVerified(true)` - Update user state after verification

**Features**:
- Beautiful gradient purple background with glassmorphism
- 6-digit code input (numeric only, auto-format)
- Verify button with loading state
- Resend code button with 60-second cooldown timer
- Success/error messages with toast notifications
- Auto-redirect to dashboard after successful verification (2s delay)
- Auto-redirect if already verified (no duplicate toast)
- Tips section: check spam folder, 24h expiry, resend anytime
- Back to Dashboard button

**State Management**:
- `code: string` - 6-digit verification code
- `isVerifying: boolean` - Verification in progress
- `isResending: boolean` - Resend in progress
- `error: string | null` - Error message
- `success: boolean` - Verification succeeded
- `resendCooldown: number` - Countdown timer (60 seconds)

**User Flow**:
1. Enter 6-digit code from email
2. Click "Verify Email" or press Enter
3. On success: Toast message + welcome email + redirect
4. On error: Show error message, allow retry
5. Click "Resend Code": New code sent, timer starts

**Status**: ✅ Complete (Dec 27, 2025)

---

### Notification Pages

#### NotificationsPage
**Path**: `client/src/pages/Notifications/NotificationsPage.tsx`  
**Route**: `/notifications`  
**Purpose**: Full-featured notifications management center with filters and pagination

**Services Used**:
- `notificationApi.getNotifications(includeRead, { type, priority, limit, offset })` - Fetch notifications with filters
- `notificationApi.markAsRead(id)` - Mark single notification as read
- `notificationApi.markAllAsRead()` - Mark all notifications as read
- `notificationApi.deleteNotification(id)` - Delete notification
- `socketService` - Real-time notification updates

**Features**:
- HeaderV4 navigation
- All/Unread toggle filter
- Type filter (progress, risk, intervention, achievement, assignment, course)
- Priority filter (urgent, high, normal, low)
- Pagination (20 items per page)
- Individual mark read and delete actions
- Mark all read button
- Settings/Preferences shortcut button
- Click-to-navigate for notifications with ActionUrl
- Real-time cross-tab synchronization via Socket.IO

**Socket Events**:
- Listens: `notification-created`, `notification-read`, `notifications-read-all`, `notification-deleted`
- Auto-updates list when events received from other tabs/devices

**State Management**:
- `items: Notification[]` - All notifications
- `loading: boolean` - Loading state
- `show: 'all' | 'unread'` - View filter
- `typeFilter: string` - Type filter
- `priorityFilter: string` - Priority filter
- `page: number` - Current pagination page

**Status**: ✅ Complete (Dec 22, 2025)

---

### Payment & Checkout Pages

#### CourseCheckoutPage
**Path**: `client/src/pages/Payment/CourseCheckoutPage.tsx`  
**Route**: `/checkout/:courseId`  
**Purpose**: Stripe Elements checkout flow for course purchases

**Services Used**:
- `coursesApi.getCourse()` - Fetch course details
- `paymentApi.createPaymentIntent()` - Create Stripe payment intent
- Stripe Elements - Payment form UI

**Features**:
- HeaderV4 navigation
- Course summary with thumbnail and price
- Stripe PaymentElement integration
- Loading states and error handling
- Secure payment processing
- **React Strict Mode Protection (Dec 17, 2025)**: useRef with courseId tracking prevents duplicate payment intent creation

**Implementation Details**:
- `initializingCourseRef` stores courseId (not boolean) to prevent React 18 Strict Mode double-execution
- Effect checks if already initializing same courseId before creating payment intent
- Database constraint prevents duplicate pending transactions at backend

**Status**: ✅ Fully functional with Phase 6 duplicate prevention complete

---

#### PaymentSuccessPage
**Path**: `client/src/pages/Payment/PaymentSuccessPage.tsx`  
**Route**: `/payment/success?courseId=XXX`  
**Purpose**: Post-payment celebration and enrollment confirmation

**Services Used**:
- `coursesApi.getCourse()` - Fetch enrolled course
- `paymentApi.confirmEnrollment()` - Verify payment and create enrollment

**Features**:
- 🎉 Confetti animation (5 seconds, 500 pieces)
- Gradient celebration theme with glassmorphism
- Social sharing (Twitter, Facebook, LinkedIn)
- CTAs: "Start Learning Now", "View Receipt", "Go to Dashboard"
- Email confirmation notice
- "What's Next?" tips
- 30-day money-back guarantee notice
- **Security**: Validates completed payment before enrollment

**Status**: ✅ Complete with Phase 2.3 enhancements

---

### TransactionsPage
**Path**: `client/src/pages/Profile/TransactionsPage.tsx`  
**Route**: `/transactions`  
**Purpose**: Display user's transaction history with payment details, refund requests, and invoice downloads

**Services Used**:
- `paymentApi.getUserTransactions()` - Fetch all transactions for user
- `paymentApi.requestRefund(data)` - Submit refund request
- `paymentApi.downloadInvoice(invoiceId)` - Download invoice PDF (Dec 14, 2025)
- `paymentApi.testCompleteTransaction(paymentIntentId)` - DEV ONLY: Complete test payment (Dec 14, 2025)

**Database Tables**:
- `Transactions` - Payment transaction records with Stripe IDs
- `Invoices` - Invoice records linked to transactions
- `Courses` - Course details (Title, Thumbnail)

**State Management**:
- Local state:
  - `transactions: Transaction[]` - List of all transactions
  - `loading: boolean` - Loading state
  - `error: string | null` - Error message
  - `refundDialog` - Refund dialog state
  - `refundReason: string` - Refund reason text
  - `refundProcessing: boolean` - Refund submission state

**Components Used**:
- `<HeaderV4 />` - Navigation header
- `<Table />` - Transaction data table
- `<Chip />` - Status badges (pending, completed, failed, refunded)
- `<Dialog />` - Refund request dialog

**Features**:
- Transaction table with course details, amounts, status, dates
- Enhanced refund dialog with policy display and progress bar (Phase 4 - Dec 15, 2025)
- Refund eligibility check (30 days) with visual countdown
- Refund amount calculator and display
- Smart button states (disabled with tooltips for ineligible)
- Invoice download links with secure blob handling
- Test Complete button for pending transactions (DEV ONLY - simulates webhook)
- Refresh button to reload transactions
- Status chips with tooltips: pending (orange), completed (green), failed (red), refunded (gray)
- Download icon for completed invoices with PDF generation

**Recent Updates (Dec 15, 2025)**:
- ✅ Test Complete button with CheckCircleIcon (green outlined)
- ✅ Invoice download with ownership verification
- ✅ PDF generation: Professional invoices with Mishin Learn branding
- ✅ Automatic invoice creation on payment success
- ✅ Enhanced refund dialog with policy checklist
- ✅ Refund window progress bar (days remaining/30)
- ✅ Smart eligibility tooltips for disabled refund buttons
- ✅ Input validation: 10-500 characters for refund reason
- Status color coding
- Empty state for no transactions

**Database Migration**: `database/add_payment_tables.sql`

**Status**: ✅ Fully functional with database setup complete

---

### ProfilePage
**Path**: `client/src/pages/Profile/ProfilePage.tsx`  
**Route**: `/profile`  
**Purpose**: User profile management with 5 tabs (Personal Info, Password, Billing, Preferences, Account Info)

**Services Used**:
- `profileApi.getProfile()` - Fetch user profile data
- `profileApi.updatePersonalInfo()` - Update name, username, learning style
- `profileApi.updateBillingAddress()` - Update billing address
- `profileApi.updatePassword()` - Change password with verification
- `profileApi.updateAvatar()` - Update avatar URL
- `profileApi.uploadAvatar(file)` - Upload avatar image with multer/sharp processing
- `notificationPreferencesApi.getPreferences()` - Fetch notification settings
- `notificationPreferencesApi.updatePreferences()` - Save notification settings

**State Management**:
- `useAuthStore()` - User authentication and profile updates
- Local state:
  - `tabValue: number` - Active tab (0-4)
  - `personalInfo` - Name, username, learning style
  - `billingAddress` - 5 address fields
  - `passwords` - Current, new, confirm passwords
  - `notificationPreferences` - 13 preference fields
  - `avatarFile: File | null` - Avatar upload file
  - `avatarPreview: string | null` - Preview URL
  - `loading/saving: boolean` - Loading states

**Components Used**:
- `<HeaderV4 />` - Navigation with back button
- `<Avatar />` - User avatar with upload overlay
- `<TextField />` - Form inputs
- `<Switch />` - Toggle switches for preferences
- `<Select />` - Dropdown for email digest frequency
- `<TimePicker />` - Quiet hours time selection
- MUI Tabs, Box, Paper, Button, etc.

**Related Components**:
- Header - Profile menu navigates here
- SettingsPage - Placeholder for future settings

**Used By**:
- App.tsx route (`/profile`)
- Header profile menu

**Key Features**:
```typescript
// 5 Tabs
0: Personal Info - Name, username, learning style, avatar upload, email verification badge
1: Password - Change password with current verification
2: Billing Address - Street, city, state, postal, country
3: Preferences - Notification settings (5 toggles, email digest, quiet hours)
4: Account Info - Read-only account details, role badge, dates

// Email Verification Badge (Dec 27, 2025)
- Shows in Personal Info tab header
- "Email Verified ✓" (green) with CheckCircle icon
- "Email Not Verified" (orange) - clickable, opens /verify-email
- Delete icon on unverified badge for quick access

// Avatar Upload
- Camera button overlay on avatar
- File validation: JPEG/PNG/GIF/WebP, max 5MB
- Sharp processing: resize 200x200, WebP, quality 85
- Preview before upload
- Full server URL: http://localhost:3001/uploads/images/avatar_123_abc.webp

// Notification Preferences (HYBRID SYSTEM - FULLY FUNCTIONAL Dec 29, 2025)
- **Page**: /settings/notifications (734 lines, dedicated page)
- **Navigation**: Header → Settings dropdown → Notifications
- **Global Controls**: EnableInAppNotifications, EnableEmailNotifications toggles
- **Category Controls**: 5 accordion sections (Progress, Course, Assessment, Community, System)
- **Subcategory Controls**: 50+ individual toggles (each with in-app + email switches)
- **3-Level Cascade**: Global → Category → Subcategory with NULL inheritance
- **Quiet Hours**: Start/end time pickers with clear (X) buttons
- **Email Digest**: None, Realtime, Daily (8 AM), Weekly (Monday 8 AM)
- **Database**: 64 columns in NotificationPreferences table (all PascalCase)
- **API**: GET/PATCH /api/notifications/preferences (fully aligned)
- **Persistence**: All settings save to database and persist across sessions
- **Enforcement**: NotificationService.shouldSendNotification() enforces all 3 levels
- **Queue System**: Cron job processes queued notifications every 5 minutes
```

**Common Issues**:
- **Avatar not updating**: Check multer config and sharp processing in backend
- **Settings not persisting**: Fixed Dec 29, 2025 - Ensure API extracts response.data.preferences
- **React warnings**: Fixed Dec 29, 2025 - All switches use controlled components with getToggleValue()
- **TypeScript errors**: Fixed Dec 29, 2025 - All interfaces use identical PascalCase field names
- ~~**Notification preferences don't work**: Known limitation~~ ✅ **RESOLVED** - Fully functional 3-level system

**Last Modified**: December 29, 2025 - Hybrid notification control system with 64 columns, fixed all bugs

---

### CourseDetailPage
**Path**: `client/src/pages/Course/CourseDetailPage.tsx`  
**Route**: `/courses/:courseId` and `/courses/:courseId/preview`  
**Purpose**: Unified course detail page for all users (preview mode + enrolled mode)

**Services Used**:
- `coursesApi.getCourse(courseId)` - Fetch course data
- `coursesApi.getEnrollmentStatus(courseId)` - Check enrollment + instructor status
- `enrollmentApi.enrollInCourse(courseId)` - Enroll student
- `progressApi.getCourseProgress(courseId)` - Get progress (enrolled students only)
- `BookmarkApi.checkBookmarkStatus(courseId)` - Check if bookmarked (on load)
- `BookmarkApi.addBookmark(courseId)` - Add bookmark
- `BookmarkApi.removeBookmark(courseId)` - Remove bookmark

**State Management**:
- `useAuthStore()` - User authentication state
- Local state:
  - `course: CourseDetails | null` - Course data
  - `enrollmentStatus: any | null` - Enrollment + instructor status
  - `isBookmarked: boolean` - Bookmark state
  - `snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }` - Toast notifications
  - `loading: boolean` - Loading state
  - `error: string | null` - Error message
  - `isEnrolling: boolean` - Enrollment in progress
  - `enrollmentDialog: boolean` - Success dialog visibility
  - `shareDialogOpen: boolean` - Share dialog visibility

**Components Used**:
- `<Header />` - Navigation
- `<ShareDialog />` - Social media sharing
- MUI components (Box, Container, Button, etc.)

**Related Components**:
- `CoursesPage` - Navigates to this page
- `LessonDetailPage` - Navigated to from "Start Learning"
- `InstructorDashboard` - Preview mode for instructors

**Used By**:
- App.tsx routes (`/courses/:courseId`, `/courses/:courseId/preview`)

**Key Logic**:
```typescript
// Role-based button rendering
if (enrollmentStatus?.isInstructor) {
  // Show "Manage Course" (orange button)
} else if (course.isEnrolled) {
  // Show "Continue Learning" (purple button)
} else {
  // Show "Enroll Now" (purple button)
}

// Progress tracking only for enrolled students (not instructors)
if (enrollmentStatusData?.isEnrolled && !enrollmentStatusData?.isInstructor) {
  // Fetch progress
}

// Bookmark requires authentication
if (!user) return; // Don't call API
```

**Common Issues**:
- **Bookmark not persisting**: Check `BookmarkApi` import and API calls in `handleBookmark()`
- **Wrong button showing**: Check `enrollmentStatus.isInstructor` and `course.isEnrolled` values
- **Progress not displaying**: Check if user is enrolled student (not instructor)
- **Share dialog error**: Check `ShareDialog` component and course data mapping

**Last Modified**: Nov 22, 2025 - Fixed bookmark functionality (was TODO, now fully implemented)

---

### CoursesPage
**Path**: `client/src/pages/Courses/CoursesPage.tsx`  
**Route**: `/courses`  
**Purpose**: Course catalog with 3 tabs (All Courses, My Learning, Bookmarked)

**Services Used**:
- `coursesApi.getCourses(filters)` - Fetch courses with filters
- `enrollmentApi.getMyEnrollments()` - Get enrolled courses
- `BookmarkApi.getBookmarks(page, limit)` - Get bookmarked courses
- `BookmarkApi.getBookmarkStatuses(courseIds[])` - Batch check bookmark status
- `enrollmentApi.enrollInCourse(courseId)` - Quick enroll from card

**State Management**:
- `useAuthStore()` - User authentication
- Local state:
  - `tabValue: number` - Active tab (0=All, 1=Enrolled, 2=Bookmarked)
  - `allCourses: Course[]` - All courses list
  - `enrolledCourses: Course[]` - Enrolled courses list
  - `bookmarkedCourses: Course[]` - Bookmarked courses list
  - `loading: boolean` - Loading state
  - `searchQuery: string` - Search input
  - `selectedCategory: string` - Category filter
  - `selectedLevel: string` - Level filter
  - `sortBy: string` - Sort option

**Components Used**:
- `<CourseCard />` - Reusable course card (CRITICAL: shared component)
- `<Header />` - Navigation
- `<Filters />` - Course filters
- MUI Tabs, Grid, etc.

**Related Components**:
- `CourseDetailPage` - Navigated to on card click
- `CourseCard` - Displays each course (SHARED by multiple pages)

**Used By**:
- App.tsx route (`/courses`)
- Dashboard navigation

**Key Logic**:
```typescript
// Tab switching logic
useEffect(() => {
  if (tabValue === 0) loadCourses(); // All courses
  if (tabValue === 1) loadEnrolledCourses(); // My Learning
  if (tabValue === 2 && isAuthenticated) loadBookmarkedCourses(); // Bookmarked
}, [tabValue]);

// Parallel data loading for performance
const [bookmarkStatuses, enrolledCoursesList] = await Promise.all([
  BookmarkApi.getBookmarkStatuses(courseIds),
  enrollmentApi.getMyEnrollments()
]);

// Merge bookmark + enrollment status into courses
const coursesWithStatuses = uiCourses.map(course => ({
  ...course,
  isBookmarked: bookmarkStatuses[course.id] || false,
  isEnrolled: enrolledCourseIds.has(course.id)
}));
```

**Common Issues**:
- **Bookmarks not showing**: Check if user is authenticated
- **Enrolled tab empty**: Check `enrollmentApi.getMyEnrollments()` response
- **Duplicate courses in enrolled tab**: Check filter logic for `Status !== 'teaching'`
- **Bookmark tab not updating**: Call `loadBookmarkedCourses()` after bookmark action

**Dependencies**:
- Requires `CourseCard` component to be working
- Requires authentication for Enrolled and Bookmarked tabs

---

### LessonDetailPage (Updated Jan 14, 2026)

**Recent Fixes:**
- ✅ Fixed misleading tip: "Complete assessments to test your understanding" (not required for progression)
- ✅ Fixed "Mark as Read" appearing on completed lessons (content items not marked complete)
- ✅ Auto-marks all content complete when lesson is complete (lines 247-261)
- ✅ Added assessment confirmation dialog for auto-completion (lines 328-340)

**Lesson Completion Logic:**
1. Complete all content items (text/video/quiz) → Auto-completes lesson
2. If assessments exist → Shows confirmation dialog
3. User chooses: Take assessments OR Skip and advance
4. If auto-play enabled → Advances to next lesson after 2s

**Assessment Behavior:**
- Assessments are OPTIONAL for progression (do not block next lesson)
- Confirmation dialog appears for both manual and auto-completion paths
- Students can skip if they already understand material
- Dialog text: "Great job! You've completed all content. This lesson has X assessment(s) available. Would you like to take them now to test your understanding before moving to the next lesson?"

**Content Progress Tracking:**
- When lesson marked as complete, all content items automatically marked complete
- Prevents "Mark as Read" buttons appearing on completed lesson content
- Consistent UI state across all content types (text, video, quiz)

---

### LessonDetailPage (Legacy)
**Path**: `client/src/pages/Course/LessonDetailPage.tsx`  
**Route**: `/learning/:courseId/lessons/:lessonId`  
**Purpose**: Individual lesson view with video, content, progress tracking

**Services Used**:
- `lessonApi.getLesson(lessonId)` - Fetch lesson data
- `progressApi.getCourseProgress(courseId)` - Get lesson progress list
- `progressApi.markLessonComplete(lessonId, { timeSpent })` - Mark complete
- `videoProgressApi.updateProgress(videoLessonId, { currentTime })` - Video progress
- `BookmarkApi.checkBookmarkStatus(courseId)` - Check bookmark (course level)
- `BookmarkApi.addBookmark/removeBookmark(courseId)` - Toggle bookmark

**State Management**:
- `useAuthStore()` - User authentication
- Local state:
  - `lesson: Lesson | null` - Lesson data
  - `progress: LessonProgress[] | null` - All lesson progress
  - `currentProgress: LessonProgress | null` - Current lesson progress
  - `isCompleted: boolean` - Completion status
  - `isBookmarked: boolean` - Bookmark status
  - `loading: boolean` - Loading state

**Components Used**:
- `<VideoPlayer />` - Video playback with progress tracking
- `<VideoTranscript />` - Interactive transcript
- `<Header />` - Navigation
- MUI components

**Related Components**:
- `VideoPlayer` - Video playback component
- `CourseDetailPage` - Navigate back to course
- Previous/Next lessons in sidebar

**Used By**:
- App.tsx route (`/learning/:courseId/lessons/:lessonId`)
- CourseDetailPage "Start Learning" button

**Key Logic**:
```typescript
// Instructor preview mode detection
const isInstructorPreview = enrollmentStatus?.isInstructor;

if (isInstructorPreview) {
  // NO progress tracking
  // NO completion buttons
  // Show "Preview Mode" badge
  // Allow content viewing for QA
}

// Mark complete logic
const handleMarkComplete = async () => {
  if (isInstructorPreview) return; // Skip for instructors
  
  await progressApi.markLessonComplete(lessonId, { timeSpent });
  // Update UI
};

// Lesson completion status in sidebar
lessons.map(lesson => {
  const lessonProgress = progress?.find(p => p.LessonId === lesson.id);
  const isCompleted = !!lessonProgress?.CompletedAt;
  
  return (
    <ListItem>
      {isCompleted ? <CheckCircle color="success" /> : <RadioButtonUnchecked />}
      {lesson.Title}
    </ListItem>
  );
});
```

**Common Issues**:
- **Progress not saving**: Check if instructor preview mode (should not save)
- **Video progress not resuming**: Check `videoProgressApi.getProgress()` call
- **Completion button missing**: Check `isInstructorPreview` flag
- **Bookmark functionality**: ✅ FULLY WORKING - Snackbar feedback, authentication check, persists to database (Fixed Dec 18, 2025)

**Critical**: Instructors must NOT create progress records when previewing their own courses.

---

### InstructorDashboard
**Path**: `client/src/pages/Instructor/InstructorDashboard.tsx`  
**Route**: `/instructor/dashboard`  
**Purpose**: Instructor home with course list and analytics

**Services Used**:
- `instructorApi.getCourses()` - Get instructor's courses
- `instructorApi.getCourseStats(courseId)` - Get course statistics
- `analyticsApi.getCourseAnalytics(courseId)` - Get detailed analytics

**State Management**:
- `useAuthStore()` - User authentication
- Local state:
  - `courses: InstructorCourse[]` - Instructor's courses
  - `loading: boolean` - Loading state
  - `selectedCourse: string | null` - Selected course for details

**Components Used**:
- Local course card variant (different from shared CourseCard)
- MUI Grid, Card, etc.

**Related Components**:
- `CourseCreationForm` - Create new course
- `CourseDetailPage` - Preview course
- `LessonEditor` - Edit lessons

**Used By**:
- App.tsx route (`/instructor/dashboard`)
- Header navigation (instructors only)

**Key Logic**:
```typescript
// Show instructor's own courses only
const courses = await instructorApi.getCourses(); // Filtered by req.user.userId

// Course cards show:
- Enrollment count
- Level badge (color-coded)
- Category (formatted)
- Published status
- Actions: Edit, Preview, View Analytics
```

**Common Issues**:
- **No courses showing**: Check if user has `Role = 'instructor'`
- **Level colors not showing**: Check `getLevelColor()` utility function
- **Category not formatted**: Check `formatCategory()` utility function

---

## 🧩 REUSABLE COMPONENTS

### CourseCard (CRITICAL - SHARED)
**Path**: `client/src/components/Course/CourseCard.tsx`  
**Purpose**: Reusable course card component displayed across multiple pages

**Props**:
```typescript
interface CourseCardProps {
  course: Course; // Must include: id, title, thumbnail, price, rating, etc.
  onClick?: (courseId: string) => void;
  onEnroll?: (courseId: string) => void;
  onBookmark?: (courseId: string, isBookmarked: boolean) => void;
  showEnrollButton?: boolean;
  showBookmarkButton?: boolean;
}
```

**Used By** (CRITICAL - Changes affect all these):
- `CoursesPage` - Main course listing
- `MyLearningPage` - Student's enrolled courses
- `Dashboard` - Recent courses widget
- Any page showing course cards

**Utilities Used**:
- `getCategoryGradient(category)` - Category-based gradient for thumbnail
- `formatCategory(category)` - Snake_case → Title Case
- `getLevelColor(level, theme)` - Level badge color

**Key Features**:
- Category gradient on thumbnail (if no custom thumbnail)
- Formatted category badge
- Colored level badge (green/orange/red)
- Price or "FREE" display
- Rating with star icon
- Enrollment count
- Bookmark button (optional)
- Enroll button (optional)

**Common Issues**:
- **Gradient not showing**: Check `getCategoryGradient()` function in `courseHelpers.ts`
- **Category showing snake_case**: Check `formatCategory()` call
- **Level badge wrong color**: Check `getLevelColor()` function
- **Duplicate badges**: Should have category on thumbnail, level in info section only

**WARNING**: This component is used in 4+ places. Changes here affect multiple pages!

---

### ShareDialog
**Path**: `client/src/components/Course/ShareDialog.tsx`  
**Purpose**: Social media sharing modal with copy link and social buttons

**Props**:
```typescript
interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  course: Course; // Needs id, title, description, thumbnail, instructor, etc.
}
```

**Services Used**:
- `ShareService` - Social media URL generation
- Clipboard API - Copy link functionality

**Used By**:
- `CourseDetailPage` - Share button
- `CoursesPage` - Share from course cards
- Any component with share functionality

**Social Platforms**:
- Copy Link (works on localhost)
- Twitter/X
- Facebook
- LinkedIn
- WhatsApp
- Email

**Common Issues**:
- **Web Share API error on localhost**: Use ShareDialog instead of `navigator.share()`
- **Social links not opening**: Check ShareService URL generation
- **Course data missing**: Ensure all required props passed (id, title, instructor.name)

---

### EditSessionModal
**Path**: `client/src/components/LiveSessions/EditSessionModal.tsx`  
**Purpose**: Modal dialog for editing existing live sessions (instructors only)  
**Added**: January 6, 2026

**Props**:
```typescript
interface EditSessionModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  onSuccess: () => void; // Refresh parent list
}
```

**Services Used**:
- `liveSessionsApi.getSession(sessionId)` - Auto-fetch session data on open
- `liveSessionsApi.updateSession(sessionId, data)` - Save changes
- `toast` (Sonner) - Success/error notifications

**State Management**:
- Local state:
  - `title: string` - Session title
  - `description: string` - Session description  
  - `scheduledAt: Date | null` - Scheduled date/time
  - `duration: string` - Duration in minutes
  - `capacity: string` - Max attendees
  - `isPublic: boolean` - Public vs private session
  - `loading: boolean` - Form submission state
  - `fetching: boolean` - Data fetch state
  - `errors: Record<string, string>` - Validation errors

**Components Used**:
- `<Dialog />` - MUI modal
- `<DateTimePicker />` - Date/time selection
- `<TextField />` - Form inputs
- `<Switch />` - Public/private toggle
- `<LoadingButton />` - Submit with loading state

**Key Features**:
- Auto-fetches session data when modal opens (based on sessionId)
- Pre-populates all form fields with existing values
- Form validation: title required, duration 15-180 mins, capacity 1-1000, scheduledAt required
- Only scheduled sessions can be edited (enforced by backend)
- Sends notifications to enrolled students on update (respects notification preferences)
- Success toast + parent list refresh on save
- Error handling with field-specific error messages
- Prevents edit during fetch with disabled state

**Validation Rules**:
```typescript
- Title: Required, min 1 char
- Description: Optional
- Duration: Required, 15-180 minutes
- Capacity: Required, 1-1000 attendees
- Scheduled At: Required, must be future date/time
```

**Common Issues**:
- **Form not pre-populating**: Check sessionId is passed correctly
- **Date parsing errors**: Uses dayjs with fallback to current date
- **Validation not working**: Check validate() function before submit
- **Notifications not sent**: Backend creates notifications to all enrolled students automatically

**Used By**:
- `InstructorSessionsList` - Edit button on each session card

**Status**: ✅ Complete (January 6, 2026) - Full edit functionality with notifications

---

### VideoPlayer
**Path**: `client/src/components/Video/VideoPlayer.tsx`  
**Purpose**: Video player with progress tracking, analytics, and controls

**Props**:
```typescript
interface VideoPlayerProps {
  videoLessonId: string;
  videoUrl: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  skipProgressTracking?: boolean; // For instructor preview
}
```

**Services Used**:
- `videoProgressApi.updateProgress()` - Auto-save every 5 seconds
- `videoProgressApi.getProgress()` - Resume from saved position
- `videoProgressApi.markComplete()` - Mark complete at 90%+
- `videoProgressApi.trackEvent()` - Track play, pause, seek events

**Features**:
- Auto-save progress every 5 seconds
- Resume from last position
- Auto-complete at 90% watched
- Playback speed control
- Picture-in-Picture (PiP)
- Analytics event tracking
- Keyboard shortcuts

**Key Logic**:
```typescript
// Auto-save progress
useEffect(() => {
  const interval = setInterval(() => {
    if (!skipProgressTracking && isPlaying) {
      videoProgressApi.updateProgress(videoLessonId, {
        currentTime: videoRef.current.currentTime,
        duration: videoRef.current.duration
      });
    }
  }, 5000); // Every 5 seconds
  
  return () => clearInterval(interval);
}, [isPlaying, skipProgressTracking]);

// Auto-complete at 90%
if (progress >= 0.9 && !isCompleted) {
  videoProgressApi.markComplete(videoLessonId);
}
```

**Common Issues**:
- **Progress not saving**: Check `skipProgressTracking` prop (should be false)
- **Video not resuming**: Check `videoProgressApi.getProgress()` call on mount
- **Instructor preview contaminating data**: Set `skipProgressTracking={true}` for instructors

---

### Header
**Path**: `client/src/components/Navigation/Header.tsx`  
**Purpose**: Top navigation bar with menus, notifications, profile

**Services Used**:
- `useAuthStore()` - User authentication state
- `notificationApi` (if integrated) - Notification count

**State Management**:
- `useAuthStore()` - user, logout()
- Local state: menu anchors, notification panel

**Links** (Role-based):
- **All Users**: Courses, Dashboard
- **Students**: My Learning, Smart Progress
- **Instructors**: Instructor Dashboard, Create Course, Students

**Common Issues**:
- **Menu not showing correct links**: Check `user.Role` value
- **Logout not working**: Check `authStore.logout()` call
- **Navigation not working**: Check React Router Link components

---

### OfficeHoursPage (Instructor)
**Path**: `client/src/pages/OfficeHours/OfficeHoursInstructor.tsx`  
**Route**: `/office-hours` (Instructors only)  
**Purpose**: Manage office hours schedule and student queue

**Services Used**:
- `officeHoursApi.getMySchedules()` - Get instructor's schedules
- `officeHoursApi.createSchedule()` - Create new schedule
- `officeHoursApi.updateSchedule()` - Update schedule
- `officeHoursApi.deleteSchedule()` - Delete schedule
- `officeHoursApi.getQueue()` - Get current queue
- `officeHoursApi.admitStudent()` - Admit from queue
- `officeHoursApi.completeSession()` - Complete session
- `officeHoursApi.cancelQueueEntry()` - Cancel entry

**State Management**:
- Socket.IO real-time updates (`useOfficeHoursSocket` hook)
- Local state: schedules, queue, active sessions

**Socket Events Emitted**:
- `queue-updated` - When student joins/leaves queue
- `admitted` - When instructor admits student
- `session-completed` - When session completes
- `queue-cancelled` - When entry cancelled

**Components Used**:
- Schedule creation/edit dialogs
- Queue list with admit buttons
- Active sessions list

**Key Logic**:
```typescript
// Real-time queue updates
useOfficeHoursSocket((event) => {
  if (event.type === 'queue-updated') {
    refreshQueue(); // Reload queue data
  }
});

// Admit student
const handleAdmit = async (entryId: string) => {
  await officeHoursApi.admitStudent(entryId);
  // Socket.IO automatically notifies student
};
```

**Common Issues**:
- **Queue not updating**: Check Socket.IO connection and event listeners
- **Duplicate toasts**: Check useOfficeHoursSocket is only instantiated once
- **Timestamps wrong**: Verify UTC 'Z' suffix in API responses

**Last Modified**: Dec 2, 2025 - Production ready with real-time notifications

---

### OfficeHoursPage (Student)
**Path**: `client/src/pages/OfficeHours/OfficeHoursStudent.tsx`  
**Route**: `/office-hours` (Students only)  
**Purpose**: View instructor schedules and join queue

**Services Used**:
- `officeHoursApi.getAvailableSchedules()` - Get all instructor schedules
- `officeHoursApi.joinQueue()` - Join instructor's queue
- `officeHoursApi.getMyQueueStatus()` - Check current queue position
- `officeHoursApi.leaveQueue()` - Leave queue

**State Management**:
- Socket.IO real-time updates (`useOfficeHoursSocket` hook)
- Local state: schedules, queueStatus, position

**Socket Events Received**:
- `admitted` - When instructor admits this student
- `session-completed` - When session is completed
- `queue-cancelled` - When entry is cancelled
- `position-updated` - When queue position changes

**Notifications**:
- Bell notifications for admitted/completed/cancelled events
- Toast notifications only for user-initiated actions (join queue)

**Key Logic**:
```typescript
// Real-time admission notification
useOfficeHoursSocket((event) => {
  if (event.type === 'admitted') {
    // Bell notification appears automatically
    refreshQueueStatus();
  }
});

// Join queue with toast
const handleJoin = async (scheduleId: string) => {
  const result = await officeHoursApi.joinQueue(scheduleId);
  toast.success(`Joined queue at position ${result.position}`);
};
```

**Common Issues**:
- **Not receiving notifications**: Check Socket.IO connection in Network tab
- **Position not updating**: Verify real-time event listeners registered
- **Timestamps inconsistent**: Check UTC formatting on server

**Last Modified**: Dec 2, 2025 - Production ready with real-time notifications

---

## 🎣 CUSTOM HOOKS

### useOfficeHoursSocket
**Path**: `client/src/hooks/useOfficeHoursSocket.ts`  
**Purpose**: Socket.IO event handling for office hours real-time updates

**Events Listened**:
- `queue-updated` - Queue changed (instructor view)
- `admitted` - Student admitted (student receives notification)
- `session-completed` - Session completed (student receives notification)
- `queue-cancelled` - Entry cancelled (student receives notification)
- `position-updated` - Queue position changed

**Usage**:
```typescript
const { connected } = useOfficeHoursSocket({
  onQueueUpdated: () => refreshQueue(),
  onAdmitted: () => refreshStatus(),
  onCompleted: () => refreshStatus(),
  onCancelled: () => refreshStatus(),
});
```

**Key Features**:
- Automatic Socket.IO connection via socketService
- No duplicate toast notifications (bell handles notifications)
- Cleanup on unmount

**Common Issues**:
- **Duplicate toasts**: Ensure only ONE instance per page
- **Events not firing**: Check Socket.IO connection status
- **Memory leaks**: Verify cleanup in useEffect return

**Last Modified**: Dec 2, 2025 - Removed duplicate toasts, production ready

---

## 🔌 API SERVICE CLASSES

### coursesApi
**Path**: `client/src/services/coursesApi.ts`  
**Endpoint Base**: `/api/courses`

**Methods**:
- `getCourses(filters)` - List courses with pagination
- `getCourse(id)` - Get single course details
- `getEnrollmentStatus(courseId)` - Check enrollment + instructor status
- `getCategories()` - Get all categories with counts
- `getLevels()` - Get all levels with counts
- `getStats()` - Platform-wide course statistics

**Used By**: CoursesPage, CourseDetailPage, Dashboard

**Returns**:
```typescript
// getEnrollmentStatus
{
  isEnrolled: boolean,
  isInstructor: boolean,  // CRITICAL for preview mode
  status: string,
  enrolledAt: string,
  completedAt?: string
}
```

---

### enrollmentApi
**Path**: `client/src/services/enrollmentApi.ts`  
**Endpoint Base**: `/api/enrollment`

**Methods**:
- `enrollInCourse(courseId)` - Enroll student
- `getMyEnrollments()` - Get user's enrollments
- `getEnrollmentStatus(courseId)` - Check enrollment (deprecated, use coursesApi)
- `unenrollFromCourse(courseId)` - Unenroll student
- `getCourseStats(courseId)` - Enrollment statistics

**Used By**: CourseDetailPage, CoursesPage, MyLearningPage

**Important**: 
- Creates Enrollment record only (NOT UserProgress)
- UserProgress created per-lesson when accessed
- Check for duplicate enrollment before calling

---

### officeHoursApi
**Path**: `client/src/services/officeHoursApi.ts`  
**Endpoint Base**: `/api/office-hours`

**Methods**:
- `getMySchedules()` - Get instructor's schedules
- `getAvailableSchedules()` - Get all available schedules (students)
- `createSchedule(data)` - Create new schedule (instructor)
- `updateSchedule(id, data)` - Update schedule (instructor)
- `deleteSchedule(id)` - Delete schedule (instructor)
- `getQueue(scheduleId)` - Get queue for schedule
- `getMyQueueStatus()` - Get student's current queue position
- `joinQueue(scheduleId)` - Join instructor's queue (student)
- `leaveQueue(entryId)` - Leave queue (student)
- `admitStudent(entryId)` - Admit student from queue (instructor)
- `completeSession(entryId)` - Complete session (instructor)
- `cancelQueueEntry(entryId)` - Cancel entry (instructor)

**Used By**: OfficeHoursInstructor, OfficeHoursStudent

**Returns**:
```typescript
// getQueue
{
  id: string,
  studentId: string,
  studentName: string,
  studentEmail: string,
  position: number,
  status: 'waiting' | 'admitted' | 'completed' | 'cancelled',
  joinedAt: string, // UTC with 'Z' suffix
  admittedAt?: string,
  completedAt?: string
}

// joinQueue
{
  id: string,
  position: number,
  estimatedWaitTime: number
}
```

**Key Features**:
- All timestamps returned in UTC with 'Z' suffix
- Real-time Socket.IO notifications integrated
- GUID-based IDs (not numeric)

**Last Modified**: Dec 2, 2025 - Production ready

---

### progressApi
**Path**: `client/src/services/progressApi.ts`  
**Endpoint Base**: `/api/progress`

**Methods**:
- `getCourseProgress(courseId)` - Get lesson progress + overall percentage
- `markLessonComplete(lessonId, { timeSpent })` - Mark lesson complete
- `updateLessonProgress(lessonId, { progressPercentage })` - Update progress
- `getMyProgress()` - Get all user progress

**Used By**: LessonDetailPage, CourseDetailPage, Dashboard

**Important**:
- NEVER call for instructors viewing their own courses
- Check `isInstructorPreview` before calling
- Updates both UserProgress (per-lesson) and CourseProgress (per-course)

---

### BookmarkApi
**Path**: `client/src/services/bookmarkApi.ts`  
**Endpoint Base**: `/api/bookmarks`

**Methods**:
- `getBookmarks(page, limit)` - List user's bookmarks
- `addBookmark(courseId, notes?)` - Add bookmark
- `removeBookmark(courseId)` - Remove bookmark
- `checkBookmarkStatus(courseId)` - Check if bookmarked
- `getBookmarkStatuses(courseIds[])` - Batch check multiple courses
- `updateBookmarkNotes(courseId, notes)` - Update notes

**Used By**: CourseDetailPage, LessonDetailPage, CoursesPage

**Important**:
- Requires authentication (401 if not logged in)
- Returns `{ isBookmarked: boolean, bookmark?: { ... } }`
- Batch check for performance: `getBookmarkStatuses([id1, id2, ...])`

---

### videoProgressApi
**Path**: `client/src/services/videoProgressApi.ts`  
**Endpoint Base**: `/api/video-progress`

**Methods**:
- `getProgress(videoLessonId)` - Get saved progress
- `updateProgress(videoLessonId, { currentTime, duration })` - Save progress
- `markComplete(videoLessonId)` - Mark video complete
- `trackEvent(videoLessonId, eventType)` - Track analytics event

**Used By**: VideoPlayer, LessonDetailPage

**Important**:
- Called every 5 seconds during playback
- Auto-completes lesson at 90%+ watch
- Skip for instructor preview mode

---

## 🛠️ UTILITY FUNCTIONS

### courseHelpers.ts
**Path**: `client/src/utils/courseHelpers.ts`  
**Purpose**: Shared utilities for course card styling

**Functions**:
```typescript
formatCategory(category?: string): string
// 'data_science' → 'Data Science'

getCategoryGradient(category?: string): string
// Returns CSS gradient based on category
// Programming → Purple gradient
// Data Science → Pink-Red gradient
// Design → Blue-Cyan gradient
// etc.

getLevelColor(level: string, theme: Theme): string
// Beginner → theme.palette.success.main (green)
// Intermediate → theme.palette.warning.main (orange)
// Advanced → theme.palette.error.main (red)
```

**Used By**:
- `CourseCard` component (CRITICAL)
- `CoursesPage` - Course listing
- `InstructorDashboard` - Instructor courses
- `MyLearningPage` - Student courses

**IMPORTANT**: Changes here affect course card display across entire app!

---

### formatUtils.ts
**Path**: `client/src/utils/formatUtils.ts`  
**Purpose**: Data formatting utilities

**Functions**:
```typescript
formatCurrency(amount: number): string
// 99.99 → '$99.99'

formatDuration(minutes: number): string
// 125 → '2h 5m'

formatDate(isoString: string): string
// '2025-11-22T...' → 'Nov 22, 2025'

roundToDecimals(value: number, decimals: number): number
// 99.9999 → 99.99
```

**Used By**: Multiple components for consistent formatting

---

## 🟢 PRESENCE SYSTEM COMPONENTS (Phase 2 - Week 2 Day 4)

### PresencePage
**Path**: `client/src/pages/Presence/PresencePage.tsx`  
**Route**: `/presence`  
**Purpose**: Main page for viewing online users and managing presence status

**Services Used**:
- `presenceApi.getMyPresence()` - Get current user's presence status
- Uses `usePresence()` hook for status management and real-time updates

**State Management**:
- `usePresence()` hook - Status state and Socket.IO integration
- Local state managed by hook:
  - `currentStatus: PresenceStatus` - Current user status (online/away/busy/offline)
  - `isLoadingStatus: boolean` - Loading state while fetching initial status

**Components Used**:
- `<Header />` - Navigation
- `<PresenceStatusSelector />` - Status dropdown
- `<OnlineUsersList />` - List of online users
- MUI components (Box, Container, Grid, etc.)

**Related Components**:
- All Presence System components
- Header navigation (Online Users link)

**Used By**:
- App.tsx route (`/presence`)
- Header navigation menu

**Key Logic**:
```typescript
const { currentStatus, isLoadingStatus, updateStatus } = usePresence({
  autoHeartbeat: true,
  heartbeatInterval: 60000, // 60 seconds
  onUserOnline: (data) => console.log('User online:', data),
  onUserOffline: (data) => console.log('User offline:', data),
});

// Status selector shows loading while fetching
{isLoadingStatus ? (
  <Typography>Loading...</Typography>
) : (
  <PresenceStatusSelector
    currentStatus={currentStatus}
    onStatusChange={(status) => updateStatus(status)}
  />
)}
```

**Common Issues**:
- **Status resets to 'online' after refresh**: Fixed - hook now fetches actual status from server on mount
- **Socket not connecting**: Check if user is authenticated
- **Heartbeat not working**: Check Socket.IO connection in browser DevTools

**Last Modified**: Dec 4, 2025 - Fixed status persistence issue

---

### OnlineIndicator
**Path**: `client/src/components/Presence/OnlineIndicator.tsx`  
**Purpose**: Color-coded status badge with pulse animation

**Props**:
```typescript
interface OnlineIndicatorProps {
  status: PresenceStatus; // 'online' | 'offline' | 'away' | 'busy'
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  lastSeenAt?: string; // ISO timestamp
}
```

**Status Colors**:
- Online: Green (#4caf50) with pulse animation
- Away: Orange (#ff9800)
- Busy: Red (#f44336)
- Offline: Gray (#9e9e9e)

**Used By**:
- `UserPresenceBadge` - Avatar overlay
- `OnlineUsersList` - User list items

**Key Features**:
- Pulse animation for 'online' status
- Tooltip showing status and last seen time
- Responsive sizing

---

### UserPresenceBadge
**Path**: `client/src/components/Presence/UserPresenceBadge.tsx`  
**Purpose**: Avatar with presence indicator overlay at bottom-right

**Props**:
```typescript
interface UserPresenceBadgeProps {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  status: PresenceStatus;
  lastSeenAt?: string;
  size?: number; // Avatar diameter in pixels
}
```

**Used By**:
- `OnlineUsersList`
- `OnlineUsersWidget`
- Can be used in Study Groups, Live Sessions, Office Hours (future integration)

**Key Features**:
- Automatic initials generation if no avatar
- Status badge positioned at bottom-right
- Responsive sizing with size prop

---

### OnlineUsersList
**Path**: `client/src/components/Presence/OnlineUsersList.tsx`  
**Purpose**: Card displaying list of currently online users

**Props**:
```typescript
interface OnlineUsersListProps {
  courseId?: string; // Optional: filter by course
  limit?: number; // Max users to display
  title?: string; // Card title
  compact?: boolean; // Compact layout
}
```

**Services Used**:
- `presenceApi.getOnlineUsers(limit)` - Get all online users
- `presenceApi.getOnlineUsersInCourse(courseId)` - Get course-specific users
- Uses `socketService` for real-time updates

**Socket.IO Events Listened**:
- `presence-changed` - Updates list when user status changes

**State Management**:
- Local state:
  - `users: OnlineUser[]` - List of online users
  - `loading: boolean` - Loading state
  - `error: string | null` - Error message

**Used By**:
- `PresencePage`
- Future: Dashboard, Study Groups, Live Sessions

**Key Features**:
- Real-time updates via Socket.IO
- Auto-refresh every 30 seconds
- Shows activity ("Viewing Course: X")
- Empty state for no users
- Loading and error states

---

### PresenceStatusSelector
**Path**: `client/src/components/Presence/PresenceStatusSelector.tsx`  
**Purpose**: Dropdown menu to change user presence status

**Props**:
```typescript
interface PresenceStatusSelectorProps {
  currentStatus: PresenceStatus;
  onStatusChange: (status: PresenceStatus) => void;
}
```

**Status Options**:
1. Online (green icon) - Active and available
2. Away (orange icon) - Temporarily unavailable
3. Busy (red icon) - Do not disturb
4. Offline (gray icon) - Appear offline

**Used By**:
- `PresencePage`
- Header (can be integrated)

**Key Features**:
- Icon-based status display
- Toast notification on status change
- Visual feedback for current status
- Clean Material-UI dropdown

---

### OnlineUsersWidget
**Path**: `client/src/components/Presence/OnlineUsersWidget.tsx`  
**Purpose**: Dashboard widget showing online users with avatar group

**Props**:
```typescript
interface OnlineUsersWidgetProps {
  maxAvatars?: number; // Max avatars to show (default: 6)
}
```

**Services Used**:
- `presenceApi.getOnlineUsers(limit)` - Get online users
- Uses `socketService` for real-time updates

**Used By**:
- Future: Dashboard pages
- Can be added to instructor/student dashboards

**Key Features**:
- Avatar group showing first N users
- Online count badge
- "View All" button navigates to `/presence`
- Real-time updates via Socket.IO

---

### usePresence Hook
**Path**: `client/src/hooks/usePresence.ts`  
**Purpose**: React hook for presence management with Socket.IO integration

**Options**:
```typescript
interface UsePresenceOptions {
  autoHeartbeat?: boolean; // Auto-send heartbeat (default: true)
  heartbeatInterval?: number; // Interval in ms (default: 60000)
  onUserOnline?: (data: PresenceEventData) => void;
  onUserOffline?: (data: PresenceEventData) => void;
  onUserStatusChange?: (data: PresenceEventData) => void;
}
```

**Returns**:
```typescript
return {
  currentStatus: PresenceStatus; // Current user status
  isLoadingStatus: boolean; // Loading initial status
  updateStatus: (status, activity?) => Promise<void>;
  updateActivity: (activity) => Promise<void>;
  sendHeartbeat: () => Promise<void>;
}
```

**Services Used**:
- `presenceApi.getMyPresence()` - Fetch initial status on mount
- `presenceApi.updateStatus()` - Update status
- `presenceApi.updateActivity()` - Update activity
- `presenceApi.sendHeartbeat()` - Send heartbeat
- `socketService` - Socket.IO integration

**Socket.IO Events**:
- Emits: `update-presence`, `update-activity`, `presence-heartbeat`
- Listens: `presence-changed`, `presence-updated`

**Used By**:
- `PresencePage`
- Can be used in any component needing presence features

**Key Features**:
- **Fetches actual status on mount** (fixes refresh bug)
- Automatic heartbeat system
- Real-time status updates via Socket.IO
- Stable callbacks using useRef pattern
- Automatic cleanup on unmount

**Common Issues**:
- **Status resets after refresh**: FIXED - Now fetches from server on mount
- **Heartbeat not working**: Check Socket.IO connection
- **Multiple tabs**: Each tab sends heartbeats independently (by design)

**Last Modified**: Dec 4, 2025 - Added initial status fetch to fix persistence

---

### presenceApi Service
**Path**: `client/src/services/presenceApi.ts`  
**Purpose**: API service for presence-related HTTP requests

**Methods**:
```typescript
presenceApi.getOnlineUsers(limit): Promise<OnlineUsersResponse>
presenceApi.getOnlineUsersInCourse(courseId): Promise<{users, count}>
presenceApi.getUserPresence(userId): Promise<UserPresence>
presenceApi.getMyPresence(): Promise<UserPresence | null> // NEW: Get own status
presenceApi.getBulkPresence(userIds[]): Promise<BulkPresenceResponse>
presenceApi.updateStatus(status, activity?): Promise<UserPresence>
presenceApi.updateActivity(activity): Promise<void>
presenceApi.sendHeartbeat(): Promise<void>
```

**API Endpoints Used**:
- GET `/api/presence/online` - All online users
- GET `/api/presence/course/:courseId` - Course online users
- GET `/api/presence/user/:userId` - User presence
- POST `/api/presence/bulk` - Bulk presence query
- PUT `/api/presence/status` - Update status
- PUT `/api/presence/activity` - Update activity
- POST `/api/presence/heartbeat` - Send heartbeat

**Authentication**: All requests include JWT token via axios interceptor

**Used By**:
- `usePresence` hook
- `OnlineUsersList` component
- `OnlineUsersWidget` component
- Any component needing presence data

**Last Modified**: Dec 4, 2025 - Added `getMyPresence()` method

---

## 🔄 DATA FLOW EXAMPLES

### Enrolling in a Course
```
CourseDetailPage
  ↓ User clicks "Enroll Now"
handleEnroll() → Check if logged in
  ↓ If not logged in
navigate('/login')
  ↓ If logged in
enrollmentApi.enrollInCourse(courseId)
  ↓ POST /api/enrollment/courses/:courseId/enroll
Backend enrollment.ts
  ├─ Check not already enrolled
  ├─ Check not instructor's course
  ├─ Check course is published
  ├─ Create Enrollment record (NOT UserProgress)
  └─ Update course EnrollmentCount
  ↓ Response: { enrollmentId, status, enrolledAt, ... }
CourseDetailPage
  ├─ setCourse({ ...course, isEnrolled: true })
  ├─ setEnrollmentStatus({ isEnrolled: true, ... })
  ├─ setEnrollmentDialog(true) - Show success dialog
  └─ Button changes to "Continue Learning"
```

### Bookmarking a Course
```
CourseDetailPage (or LessonDetailPage or CoursesPage)
  ↓ User clicks bookmark icon
handleBookmark() → Check if logged in
  ↓ If not logged in
Return early
  ↓ If logged in
Check current state
  ├─ If isBookmarked: BookmarkApi.removeBookmark(courseId)
  │   ↓ DELETE /api/bookmarks/:courseId
  │   Backend: Delete from Bookmarks table
  │   Frontend: setIsBookmarked(false)
  │
  └─ If not bookmarked: BookmarkApi.addBookmark(courseId)
      ↓ POST /api/bookmarks/:courseId
      Backend: Insert into Bookmarks table (check duplicate)
      Frontend: setIsBookmarked(true)
```

---

## 🔒 PRIVACY ENFORCEMENT (Added December 18, 2025)

### SettingsService (Backend)
**Path**: `server/src/services/SettingsService.ts`  
**Purpose**: Centralized privacy enforcement logic with instructor overrides

**Privacy Helper Methods**:
1. **`canViewProfile(viewerId, targetUserId)`** - 3-tier profile visibility
   - Public: Anyone can view
   - Students: Only classmates can view
   - Private: Only owner can view
   - **Instructor Override**: Instructors can view enrolled students (lines 203-223)

2. **`canViewProgress(viewerId, targetUserId)`** - Progress visibility
   - Respects ShowProgress setting
   - **Instructor Override**: Instructors can view enrolled students (lines 269-289)

3. **`getUserWithPrivacy(viewerId, targetUserId)`** - Fetch user with privacy filtering
   - Returns user data with email filtered based on ShowEmail
   - Applies ProfileVisibility checks

4. **`filterUserData(user, viewerId)`** - Email filtering
   - Returns email=NULL if ShowEmail=false
   - Exception: Owner always sees own email
   - **Instructor Override**: Instructors see enrolled students' emails

5. **`canReceiveMessages(userId)`** - Message permission check
   - Ready for chat re-enablement

6. **`areStudentsTogether(student1Id, student2Id)`** - Classmate verification
   - Checks if two students share any courses

7. **`isInstructorOfCourse(instructorId, courseId)`** - Instructor verification

8. **`isStudentEnrolledInCourse(studentId, courseId)`** - Enrollment check

**Instructor Override Logic**:
```typescript
// Example: canViewProfile with override
1. Check if viewer is instructor
2. Get target user's enrolled courses
3. Query: SELECT CourseId FROM Enrollments WHERE UserId=@targetId
4. For each courseId:
   - Check if viewer is instructor: WHERE InstructorId=@viewerId
5. If viewer owns any of target's courses → ALLOW
6. Otherwise, apply normal privacy rules
```

**Security Implementation**:
- Fail-closed defaults: Error → return PRIVATE/false/NULL
- Parameterized queries: SQL injection prevention
- Authentication required: All methods check authentication

**Used By**:
- `server/src/routes/profile.ts` - Profile viewing
- `server/src/routes/users.ts` - Instructor lists
- `server/src/routes/analytics.ts` - Course analytics
- `server/src/routes/presence.ts` - Online users
- `server/src/routes/officeHours.ts` - Office hours queue
- `server/src/routes/studyGroups.ts` - Study group members
- `server/src/routes/instructor.ts` - At-risk students

---

### Notification Components

#### NotificationBell
**Path**: `client/src/components/Notifications/NotificationBell.tsx`  
**Purpose**: Real-time notification bell icon in header with unread count badge

**Services Used**:
- `notificationsApi.getNotifications()` - Fetch initial notifications
- `socketService.connect()` - WebSocket connection
- `socketService.onNotification()` - Real-time notification events
- `socketService.disconnect()` - Cleanup on unmount

**Socket Events Listened** (Dec 29, 2025 - Real-time Updates Working):
- `notification-created` - New notification arrives, increment unread count instantly
- `notification-read` - Notification marked read, update UI
- `notification-read-all` - All marked read, clear unread count
- `notification-deleted` - Notification deleted, remove from list

**State Management**:
- `unreadCount: number` - Number of unread notifications
- `queuedCount: number` - Number of notifications in queue (quiet hours)
- `anchorEl: HTMLElement | null` - Popover anchor
- `notifications: Notification[]` - Recent notifications (limit 5 in popover)

**Components Used**:
- `<IconButton />` - Bell icon button
- `<Badge />` - Unread count badge
- `<Popover />` - Notification dropdown
- `<NotificationIcon />` - Bell icon
- `<Card />, <CardActionArea />` - Notification items

**Critical Implementation Detail** (Dec 29, 2025):
- Socket.io integration REQUIRES NotificationService on backend to have `io` instance
- Backend pattern: `const io = req.app.get('io'); const notificationService = new NotificationService(io);`
- Emits to user rooms: `io.to(\`user-${userId}\`).emit('notification-created', {...})`
- Frontend auto-joins room on connection: `socket.join(\`user-${userId}\`)`
- Real-time updates working for all notification types

**Features**:
- Red badge with unread count
- Blue badge with queued count (quiet hours)
- Click bell → Open popover with 5 recent notifications
- Click notification → Navigate to actionUrl
- "View All" button → Navigate to /notifications
- "Settings" button → Navigate to /settings
- Empty state when no notifications
- Date formatting: formatDistanceToNow (e.g., "2 hours ago")

**Used By**:
- Header component (always visible in app bar)
- All authenticated pages

**Status**: ✅ Real-time updates working (Dec 29, 2025)

---

### EmailVerificationBanner
**Path**: `client/src/components/Auth/EmailVerificationBanner.tsx`  
**Purpose**: Warning banner shown to unverified users in dashboard

**Services Used**:
- `authStore.user` - Check emailVerified status
- `navigate()` - Navigate to /verify-email

**Features**:
- MUI Alert component with warning severity
- MarkEmailRead icon
- Message: "Please verify your email address to access all features"
- "Verify Now" button → navigate to /verify-email
- Dismiss button (X) → temporarily hides banner
- Auto-shows on page reload if still unverified
- Auto-hides when emailVerified becomes true

**State Management**:
- `dismissed: boolean` - Temporary dismissal state (not persisted)

**Used By**:
- DashboardLayout (shown below Header, above content)

**Display Logic**:
```typescript
// Only show if:
// 1. User exists
// 2. User NOT verified
// 3. NOT dismissed
if (!user || user.emailVerified || dismissed) return null;
```

**Status**: ✅ Complete (Dec 27, 2025)

---

### Privacy API Endpoints
**Added**: December 18, 2025

**Profile Viewing**:
```
GET /api/profile/user/:userId
- Returns: User profile (name, avatar, learning style)
- Privacy: 3-tier visibility (public/students/private)
- Instructor Override: Can view enrolled students
- Error: 403 with code PROFILE_PRIVATE if blocked
- Excludes: Billing address (sensitive data)

GET /api/profile/user/:userId/progress
- Returns: Course progress and activity stats
- Privacy: Respects ShowProgress setting
- Instructor Override: Can view enrolled students
- Error: 403 with code PROGRESS_PRIVATE if blocked
```

**Email Filtering** (9 endpoints):
- `/api/users/instructors` - Instructor lists
- `/api/analytics/course/:id` - Recent activity
- `/api/presence/online` - Online users (2 endpoints)
- `/api/office-hours/queue` - Office hours queue
- `/api/study-groups/:id/members` - Group members
- `/api/instructor/at-risk/:courseId` - At-risk students
- `/api/instructor/low-progress/:courseId` - Low-progress students
- `/api/students` - Student management (instructor override always shows emails)

**API Error Codes**:
| Code | Status | Description |
|------|--------|-------------|
| `PROFILE_PRIVATE` | 403 | User's profile is not visible |
| `PROGRESS_PRIVATE` | 403 | User's progress is not visible |
| `MESSAGES_DISABLED` | 403 | User doesn't accept messages |

---

### Privacy Frontend Components

**settingsApi.ts** (Frontend Service)
**Path**: `client/src/services/settingsApi.ts`  
**Added Methods** (December 18, 2025):
- `getUserProfile(userId)` - View another user's profile
- `getUserProgress(userId)` - View user's progress

**Privacy Error Interceptor**:
```typescript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.data?.code === 'PROFILE_PRIVATE') {
      // Show user-friendly message
    }
    // Similar for PROGRESS_PRIVATE, MESSAGES_DISABLED
  }
);
```

**UI Components Updated** (December 18, 2025):
1. **InterventionDashboard.tsx** - Shows "Email hidden" for students with privacy enabled
2. **StudentManagement.tsx** - Shows "Email hidden" (but instructors see all emails via API)
3. **InstructorStudentAnalytics.tsx** - Handles null emails gracefully
4. **CourseDetail.tsx** - Shows "Email not public" when viewing instructors
5. **StudentQueueJoin.tsx** - Handles hidden emails in queue

**Common Patterns**:
```typescript
// Display email with privacy handling
{student.Email || 'Email hidden'}

// Check for email privacy
if (!student.Email) {
  // Show "Email hidden" message
}

// Disable action if email hidden
disabled={!student.Email}
tooltip={!student.Email ? "Student's email is hidden" : ""}
```

---

