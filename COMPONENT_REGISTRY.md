# Mishin Learn Platform - Component Registry

**Last Updated**: December 2, 2025  
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

## 🎯 PAGES (Entry Point Components)

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

**Status**: ✅ Fully functional with Phase 2.1 complete

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
- Refund eligibility check (30 days)
- Invoice download links with secure blob handling
- Test Complete button for pending transactions (DEV ONLY - simulates webhook)
- Refresh button to reload transactions
- Status chips: pending (orange), completed (green), failed (red), refunded (gray)
- Download icon for completed invoices with PDF generation

**Recent Updates (Dec 14, 2025)**:
- ✅ Test Complete button with CheckCircleIcon (green outlined)
- ✅ Invoice download with ownership verification
- ✅ PDF generation: Professional invoices with Mishin Learn branding
- ✅ Automatic invoice creation on payment success
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
0: Personal Info - Name, username, learning style, avatar upload
1: Password - Change password with current verification
2: Billing Address - Street, city, state, postal, country
3: Preferences - Notification settings (5 toggles, email digest, quiet hours)
4: Account Info - Read-only account details, role badge, dates

// Avatar Upload
- Camera button overlay on avatar
- File validation: JPEG/PNG/GIF/WebP, max 5MB
- Sharp processing: resize 200x200, WebP, quality 85
- Preview before upload
- Full server URL: http://localhost:3001/uploads/images/avatar_123_abc.webp

// Notification Preferences (STORAGE ONLY - NOT ENFORCED YET)
- 5 in-app notification toggles
- Email notifications toggle
- Email digest frequency (none/realtime/daily/weekly)
- Quiet hours (start/end time in HH:mm format)
- Case conversion: camelCase ↔ PascalCase
- Time format: ISO timestamp ↔ HH:mm
- Local timezone preservation
```

**Common Issues**:
- **Avatar not updating**: Check multer config and sharp processing in backend
- **Controlled input warning**: Ensure all Switch `checked` props have || false fallback
- **Time showing wrong**: Verify using getHours() not getUTCHours()
- **Preferences not saving**: Check case conversion in notificationPreferencesApi
- **Notification preferences don't work**: Known limitation - preferences are stored but not enforced in NotificationService.createNotification() (see TODO in PROJECT_STATUS.md)

**Last Modified**: December 11, 2025 - Complete profile system with notification preferences UI

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

### LessonDetailPage
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
- **Bookmark not working**: Same logic as CourseDetailPage

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

## 📝 WHEN TO UPDATE THIS REGISTRY

**Update this file when**:
- New component created
- Component dependencies change
- New API service added
- Major refactoring occurs
- Common issue discovered
- Component relationships change

**How to add a new component**:
1. Copy the template structure
2. Fill in all sections (Path, Purpose, Services Used, etc.)
3. Document key logic with code examples
4. List common issues with solutions
5. Update "Used By" and "Related Components" sections

---

**Quick Search**: Use Ctrl+F to find components by name

**See Also**: 
- `ARCHITECTURE.md` - System-level architecture
- `PRE_FLIGHT_CHECKLIST.md` - Checklist before making changes
