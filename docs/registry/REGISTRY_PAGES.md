# Component Registry - Page Components

> **Split from COMPONENT_REGISTRY.md** - For features, see [REGISTRY_FEATURES.md](REGISTRY_FEATURES.md) | For shared components/services, see [REGISTRY_COMPONENTS.md](REGISTRY_COMPONENTS.md) | [Index](../../COMPONENT_REGISTRY.md)

---

## ðŸŽ“ Live Sessions Components

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

**Status**: âœ… Production-ready (hardened January 7, 2026)

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
- âœ… **Auto-Updating Timestamps** (Jan 12, 2026) - 60-second timer updates "Joined X ago" / "Admitted X ago" automatically
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

**Status**: âœ… Production-ready with auto-updating timestamps

---

## ðŸ”” Notifications Components

### NotificationsPage
**Path**: `client/src/pages/Notifications/NotificationsPage.tsx`  
**Purpose**: Full-page notification center with filtering and pagination

**Architecture** (Refactored Jan 14, 2026):
- âœ… **Centralized State** - Reads from Zustand store
- âœ… **No Socket Listeners** - Removed ~100 lines of duplicate socket code
- âœ… **Optimistic Updates** - All actions update store immediately
- âœ… **Real-time Sync** - Updates via App.tsx socket listeners
- âœ… **Auto-Updating Timestamps** - 60-second intervals

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
- `notification-created` â†’ Store updated â†’ Page rerenders
- `notification-read` â†’ Store updated â†’ Page rerenders
- `notifications-read-all` â†’ Store updated â†’ Page rerenders
- `notification-deleted` â†’ Store updated â†’ Page rerenders

**Status**: âœ… Complete, fully refactored (Jan 14, 2026)

---

#### NotificationBell
**Path**: `client/src/components/Notifications/NotificationBell.tsx`  
**Purpose**: Header notification dropdown with badge count

**Architecture** (Refactored Jan 14, 2026):
- âœ… **Centralized State** - Reads from Zustand store (no local notification state)
- âœ… **Computed Values** - Uses `useMemo` to filter unread from store
- âœ… **No Socket Listeners** - All listeners centralized in App.tsx
- âœ… **Optimistic Updates** - API call + immediate store update
- âœ… **Auto-Updating Timestamps** - Refreshes every 60s

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

**Status**: âœ… Production-ready, fully refactored (Jan 14, 2026)

---

## ðŸ’¬ Chat Components

### Chat
**Path**: `client/src/pages/Chat/Chat.tsx`  
**Purpose**: Real-time chat with rooms and direct messages

**Key Features**:
- âœ… **Auto-Updating Timestamps** (Jan 12, 2026) - Message times and room "last message" times update every 60 seconds
- Room list with last message preview
- Message history with infinite scroll
- Typing indicators
- Real-time message delivery

**Status**: âœ… Production-ready with auto-updating timestamps

---

## ðŸ¤– AI Tutoring Components

### Tutoring
**Path**: `client/src/pages/Tutoring/Tutoring.tsx`  
**Purpose**: AI-powered tutoring sessions with multiple models and course context

**Key Features**:
- âœ… **Auto-Updating Timestamps** (Jan 12, 2026) - Session "Updated X ago" and message times update automatically
- âœ… **Smart Course Dropdown** (Feb 3, 2026) - Shows enrolled courses for context-aware AI responses
  - Hybrid dropdown: "General Question" + user's enrolled courses
  - Auto-fills courseId, subject, title when course selected
  - Shows course level, category, title with School icon (ðŸ«)
  - Empty state: "You're not enrolled in any courses yet"
- âœ… **AI Response Notifications** (Feb 3, 2026) - Sends notification when AI tutor answers question
  - Notification type: 'community', category: 'community', subcategory: 'AITutoring'
  - Respects EnableAITutoring and EmailAITutoring preferences
  - Message: "Your AI tutor answered your question about \"{title}\""
  - Action URL: `/tutoring?session={sessionId}` with "View Response" button
  - Email subject: "ðŸ‘¥ Community Update" with purple gradient
- Session management (create, select, delete)
- Message history with AI responses
- Model selection (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Suggestions and recommendations
- **Role Mapping**: Database stores 'ai', frontend displays 'ai', OpenAI API receives 'assistant'

**State Management**:
- `enrolledCourses: Course[]` - User's enrolled courses loaded via coursesApi
- `loadEnrolledCourses()` - Fetches courses on mount
- `newSessionData.courseId` - Stores selected course ID for context

**Dependencies**:
- `tutoringApi.createSession()` - Creates session with optional courseId
- `coursesApi.getEnrolledCourses()` - NEW: Fetches enrolled courses for dropdown
- NotificationService - Sends notification after AI response (backend)

**Status**: âœ… Production-ready with smart dropdown and notifications

---

## ðŸŽ“ Learning Components

### MyLearningPage
**Path**: `client/src/pages/Learning/MyLearningPage.tsx`  
**Purpose**: Student dashboard showing enrolled courses

**Key Features**:
- âœ… **Auto-Updating Timestamps** (Jan 12, 2026) - "Last accessed X ago" updates every 60 seconds
- Course progress tracking
- Pagination (20 per page)
- Course continuation
- Bookmark integration

**Status**: âœ… Production-ready with auto-updating timestamps

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

**Status**: âœ… Production-ready (hardened January 7, 2026)

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

**Status**: âœ… Production-ready

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
- Form validation (title, description, schedule, capacity â‰¥1, duration â‰¥1)
- DateTimePicker for scheduling
- Autocomplete for course selection (lazy-loaded, searchable)
- Capacity cannot be reduced below current attendee count (backend validation)
- Materials input (JSON string)
- Success/error toast notifications
- Only works for scheduled sessions

**Status**: âœ… Production-ready

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

**Status**: âœ… Production-ready

---

### useLiveSessionSocket Hook
**Path**: `client/src/hooks/useLiveSessionSocket.ts`  
**Purpose**: React hook for Socket.IO event handling

**Socket Events Supported**:
- `session-created` â†’ `onSessionCreated(data)`
- `session-started` â†’ `onSessionStarted(data)`
- `session-ended` â†’ `onSessionEnded(data)`
- `session-cancelled` â†’ `onSessionCancelled(data)`
- `session-updated` â†’ `onSessionUpdated(data)`
- `session-deleted` â†’ `onSessionDeleted(data)`
- `attendee-joined` â†’ `onAttendeeJoined(data)`
- `attendee-left` â†’ `onAttendeeLeft(data)`

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

**Status**: âœ… Production-ready

---

## ðŸŽ¯ PAGES (Entry Point Components)

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

**Status**: âœ… Complete (Dec 27, 2025)

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
- HeaderV5 navigation with mega-menu dropdowns
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

**Status**: âœ… Complete (Dec 22, 2025)

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
- HeaderV5 navigation with mega-menu dropdowns
- Course summary with thumbnail and price
- Stripe PaymentElement integration
- Loading states and error handling
- Secure payment processing
- **React Strict Mode Protection (Dec 17, 2025)**: useRef with courseId tracking prevents duplicate payment intent creation

**Implementation Details**:
- `initializingCourseRef` stores courseId (not boolean) to prevent React 18 Strict Mode double-execution
- Effect checks if already initializing same courseId before creating payment intent
- Database constraint prevents duplicate pending transactions at backend

**Status**: âœ… Fully functional with Phase 6 duplicate prevention complete

---

#### PaymentSuccessPage
**Path**: `client/src/pages/Payment/PaymentSuccessPage.tsx`  
**Route**: `/payment/success?courseId=XXX`  
**Purpose**: Post-payment celebration and enrollment confirmation

**Services Used**:
- `coursesApi.getCourse()` - Fetch enrolled course
- `paymentApi.confirmEnrollment()` - Verify payment and create enrollment

**Features**:
- ðŸŽ‰ Confetti animation (5 seconds, 500 pieces)
- Gradient celebration theme with glassmorphism
- Social sharing (Twitter, Facebook, LinkedIn)
- CTAs: "Start Learning Now", "View Receipt", "Go to Dashboard"
- Email confirmation notice
- "What's Next?" tips
- 30-day money-back guarantee notice
- **Security**: Validates completed payment before enrollment

**Status**: âœ… Complete with Phase 2.3 enhancements

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
- `<HeaderV5 />` - Navigation header with mega-menu dropdowns
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
- âœ… Test Complete button with CheckCircleIcon (green outlined)
- âœ… Invoice download with ownership verification
- âœ… PDF generation: Professional invoices with Mishin Learn branding
- âœ… Automatic invoice creation on payment success
- âœ… Enhanced refund dialog with policy checklist
- âœ… Refund window progress bar (days remaining/30)
- âœ… Smart eligibility tooltips for disabled refund buttons
- âœ… Input validation: 10-500 characters for refund reason
- Status color coding
- Empty state for no transactions

**Database Migration**: `database/add_payment_tables.sql`

**Status**: âœ… Fully functional with database setup complete

---

### ProfilePage
**Path**: `client/src/pages/Profile/ProfilePage.tsx`  
**Route**: `/profile`  
**Purpose**: User profile management with 5 tabs (Personal Info, Password, Billing, Preferences, Account Info)

**Services Used**:
- `profileApi.getProfile()` - Fetch user profile data
- `profileApi.updatePersonalInfo()` - Update name, username, learning style
- `profileApi.updateBillingAddress()` - Update billing address
- `profileApi.updatePassword()` - Change password with verification + sends security notification (Jan 17, 2026)
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
- `<HeaderV5 />` - Navigation header with mega-menu dropdowns
- `<Avatar />` - User avatar with upload overlay
- `<TextField />` - Form inputs
- `<Switch />` - Toggle switches for preferences
- `<Select />` - Dropdown for email digest frequency
- `<TimePicker />` - Quiet hours time selection
- MUI Tabs, Box, Paper, Button, etc.

**Related Components**:
- Header - Profile menu navigates here
- SettingsPage - Privacy settings, account deletion (Jan 19, 2026)

**Used By**:
- App.tsx route (`/profile`)
- Header profile menu

**Key Features**:
```typescript
// 5 Tabs
0: Personal Info - Name, username, learning style, avatar upload, email verification badge
1: Password - Change password with current verification + security notification (Jan 17)
2: Billing Address - Street, city, state, postal, country
3: Preferences - Notification settings (5 toggles, email digest, quiet hours)
4: Account Info - Read-only account details, role badge, dates

// Email Verification Badge (Dec 27, 2025)
- Shows in Personal Info tab header
- "Email Verified âœ“" (green) with CheckCircle icon
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
- **Navigation**: Header â†’ Settings dropdown â†’ Notifications
- **Global Controls**: EnableInAppNotifications, EnableEmailNotifications toggles
- **Category Controls**: 5 accordion sections (Progress, Course, Assessment, Community, System)
- **Subcategory Controls**: 50+ individual toggles (each with in-app + email switches)
- **3-Level Cascade**: Global â†’ Category â†’ Subcategory with NULL inheritance
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
- ~~**Notification preferences don't work**: Known limitation~~ âœ… **RESOLVED** - Fully functional 3-level system

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
- âœ… Fixed misleading tip: "Complete assessments to test your understanding" (not required for progression)
- âœ… Fixed "Mark as Read" appearing on completed lessons (content items not marked complete)
- âœ… Auto-marks all content complete when lesson is complete (lines 247-261)
- âœ… Added assessment confirmation dialog for auto-completion (lines 328-340)

**Lesson Completion Logic:**
1. Complete all content items (text/video/quiz) â†’ Auto-completes lesson
2. If assessments exist â†’ Shows confirmation dialog
3. User chooses: Take assessments OR Skip and advance
4. If auto-play enabled â†’ Advances to next lesson after 2s

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
- **Bookmark functionality**: âœ… FULLY WORKING - Snackbar feedback, authentication check, persists to database (Fixed Dec 18, 2025)

**Critical**: Instructors must NOT create progress records when previewing their own courses.

---

### Lesson Content Item Renderers (Updated February 28, 2026)

**Directory**: `client/src/components/Lesson/`

These components render individual lesson content items on the student-facing LessonDetailPage. They are all routed through `ContentItem.tsx` which switches on `content.type`.

#### ContentItem (Router)
**Path**: `client/src/components/Lesson/ContentItem.tsx`  
**Purpose**: Routes to the correct renderer based on `content.type` (`video` â†’ VideoContentItem, `text` â†’ TextContentItem, `quiz` â†’ QuizContentItem). Passes all props including `content` through `{...props}`.

#### VideoContentItem
**Path**: `client/src/components/Lesson/VideoContentItem.tsx` (~225 lines)  
**Purpose**: Video content renderer with player, transcript, and progress tracking  
**Title Logic** (Feb 28, 2026): Custom title from `content.data?.title` displayed with smart fallback â€” custom title alone if no real file, custom title + `: filename` if file exists, or `Video #N: filename` as default  
**Components Used**: `VideoPlayer`, `VideoTranscript`  
**Services Used**: `videoProgressApi`

#### TextContentItem
**Path**: `client/src/components/Lesson/TextContentItem.tsx` (~100 lines)  
**Purpose**: Text/article content renderer with Markdown/HTML display  
**Title Logic** (Feb 28, 2026): Uses `content.data?.title || 'Text Content #N'` fallback

#### QuizContentItem
**Path**: `client/src/components/Lesson/QuizContentItem.tsx` (~45 lines)  
**Purpose**: Quiz placeholder content renderer  
**Title Logic** (Feb 28, 2026): Uses `content.data?.title || 'Quiz #N'` fallback

#### Custom Title Data Flow
```
Instructor sets title (LessonEditor / CourseCreationForm)
â†’ stored in item.data.title (ContentJson array)
â†’ backend stores in Lessons.ContentJson (NVARCHAR(MAX))
â†’ student renderers display custom title or auto-generated fallback
```

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
- `CourseCreationForm` - Create new course (includes optional content title field)
- `CourseDetailPage` - Preview course
- `LessonEditor` - Edit lessons (includes inline content title editing)

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

### CourseAnalyticsDashboard
**Path**: `client/src/pages/Instructor/CourseAnalyticsDashboard.tsx` (~852 lines)  
**Route**: `/instructor/analytics` (+ `?courseId=:id` query param for per-course view)  
**Purpose**: Instructor analytics hub â€” three views: Dashboard Overview, Course Performance Overview, and Per-Course Detail  
**Last Updated**: February 18, 2026 â€” Full audit (68 fixes), CoursePerformanceTable replacing card grid

**Views (3 sub-components inside the file):**

1. **DashboardView** â€” Multi-course overview metrics (total students, enrollments, revenue, average progress, top courses)
2. **CoursePerformanceTable** â€” Sortable/searchable/paginated table of all instructor courses *(NEW â€” Feb 18, 2026)*
3. **CourseView** â€” Single-course deep-dive (student list, completion funnel, lesson analytics)

**Services Used**:
- `analyticsApi.getCourseAnalytics(courseId)` â€” Per-course detail
- `analyticsApi.getInstructorCoursePerformance()` â€” All courses overview  
- `assessmentAnalyticsApi.getOverview(courseId)` â€” Assessment metrics  
- Both services now have full auth + 401 interceptors and Content-Type headers

**State Management**:
- `useAuthStore()` â€” Instructor identity + token
- Local state: `coursePerformance`, `selectedCourse`, `view`, `loading`, `error`

---

### CoursePerformanceTable (sub-component of CourseAnalyticsDashboard)
**Location**: `client/src/pages/Instructor/CourseAnalyticsDashboard.tsx` (defined before `DashboardView`)  
**Purpose**: Replaces the old 1004-card responsive grid with a fully-featured table  
**Added**: February 18, 2026

**Props**:
```typescript
interface CoursePerformanceTableProps {
  coursePerformance: CoursePerformance[];   // Array of all instructor courses with stats
  onSelectCourse: (courseId: string) => void; // Navigate to per-course view
}
```

**Features**:
- **Sort**: 5 columns â€” Course Title (string), Students Enrolled (num), Avg Progress % (num), Completed (num), Avg Time Spent (num)
- **Default sort**: Enrolled Students descending
- **Search**: Filter by course title with real-time counter chip `{filtered} of {total}`
- **Pagination**: MUI `TablePagination` with [10, 25, 50, 100] options, `showFirstButton`, `showLastButton`
- **Progress bars**: Inline `LinearProgress` â€” green â‰¥70%, orange â‰¥40%, red <40%
- **Empty search state**: "No courses match '{query}'" row spanning all columns
- **Zero data state**: Informational empty message instead of table

**Sort Keys**:
```typescript
type SortKey = 'Title' | 'enrolledStudents' | 'avgProgress' | 'completedStudents' | 'avgTimeSpent';
```

**Key Implementation Patterns**:
```typescript
// Non-mutating sorted array (CRITICAL â€” direct .sort() mutates state)
const sorted = useMemo(() => {
  const filtered = coursePerformance.filter(c =>
    c.Title.toLowerCase().includes(search.toLowerCase())
  );
  return [...filtered].sort((a, b) => {
    const factor = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'Title') return factor * a.Title.localeCompare(b.Title);
    return factor * ((a[sortKey] as number) - (b[sortKey] as number));
  });
}, [coursePerformance, search, sortKey, sortDir]);

// Reset to page 0 when search changes
useEffect(() => setPage(0), [search]);
```

**Imports Added to CourseAnalyticsDashboard.tsx**:
- MUI: `Table`, `TableBody`, `TableCell`, `TableContainer`, `TableHead`, `TableRow`, `TablePagination`, `TableSortLabel`
- MUI: `TextField`, `InputAdornment`, `SearchIcon`
- React: `useMemo`

**Related**:
- Replaced: `coursePerformance.map(...)` inside `<Grid container spacing={2}>` â€” rendered ~3000 DOM nodes at once
- Backend: `GET /api/analytics/instructor/course-performance` â€” returns all courses, no pagination needed on backend because table handles it client-side

**Used By**:
- `DashboardView` renders `<CoursePerformanceTable coursePerformance={coursePerformance} />`
- Route: `/instructor/analytics`

**Status**: âœ… Production-ready (February 18, 2026)

---

