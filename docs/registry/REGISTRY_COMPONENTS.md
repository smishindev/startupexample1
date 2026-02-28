# Component Registry - Shared Components, Services, Hooks & Utilities

> **Split from COMPONENT_REGISTRY.md** - For features, see [REGISTRY_FEATURES.md](REGISTRY_FEATURES.md) | For pages, see [REGISTRY_PAGES.md](REGISTRY_PAGES.md) | [Index](../../COMPONENT_REGISTRY.md)

---

## ðŸ§© REUSABLE COMPONENTS

### CourseCard (CRITICAL - SHARED)
**Path**: `client/src/components/Course/CourseCard.tsx` (835 lines)  
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
  currentUserId?: string; // To detect instructor ownership
  isEnrolling?: boolean; // Disable button during enrollment
}

interface Course {
  // Core fields
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  rating: number;
  enrolledStudents: number;
  
  // Enrollment Controls (Phase 2)
  maxEnrollment?: number | null;
  enrollmentOpenDate?: string | null;
  enrollmentCloseDate?: string | null;
  
  // Enrollment Status (Feb 10-11, 2026) â­ UPDATED
  isEnrolled?: boolean;
  enrollmentStatus?: 'active' | 'completed' | 'pending' | 'approved' | 'suspended' | 'cancelled' | 'rejected' | null;
  
  // Other fields...
}
```

**Used By** (CRITICAL - Changes affect all these):
- `CoursesPage` - Main course listing
- `MyLearningPage` - Student's enrolled courses
- `Dashboard` - Recent courses widget
- Any page showing course cards

**Utilities Used**:
- `getCategoryGradient(category)` - Category-based gradient for thumbnail
- `formatCategory(category)` - Snake_case â†’ Title Case
- `getLevelColor(level, theme)` - Level badge color

**Key Features**:
- Category gradient on thumbnail (if no custom thumbnail)
- Formatted category badge
- Colored level badge (green/orange/red)
- Price or "FREE" display
- Rating with star icon
- Enrollment count (with "X/Y enrolled" when capacity set)
- Bookmark button (optional)
- Enroll button (optional, with enrollment controls)
- **Enrollment Status Chips** (Feb 10-11, 2026) â­ UPDATED:
  - "Pending Approval" (orange, HourglassEmpty icon)
  - "Suspended" (red, Block icon)
  - "Cancelled" (gray, Block icon) â† Feb 11: Added icon
  - "Rejected" (red, Block icon) â† Feb 11: Added icon
  - Chips appear based on `enrollmentStatus` prop
  - Prevents "Enroll Now" button from showing for blocked enrollments
  - Visual consistency: All blocked status chips use Block icon

**Enrollment Controls (Phase 2)** âœ…:
- Date awareness: checks `enrollmentOpenDate` and `enrollmentCloseDate`
- Capacity check: shows "X/Y enrolled" when `maxEnrollment` is set
- Visual chips:
  - "Full" (red) - when at capacity
  - "Closed" (orange) - when enrollment period has ended
  - "Not Open" (blue) - when enrollment period hasn't started
- Button states:
  - "Enrolling..." - during enrollment request
  - "Course Full" - when at capacity (disabled)
  - "Enrollment Closed" - when past close date (disabled)
  - "Not Yet Open" - when before open date (disabled)
  - "Enroll Now" - when available (enabled)
- Disabled button wrapped in `<span onClick={stopPropagation}>` to prevent card navigation
- Instructor's own courses show "Manage" button instead

**Common Issues**:
- **Gradient not showing**: Check `getCategoryGradient()` function in `courseHelpers.ts`
- **Category showing snake_case**: Check `formatCategory()` call
- **Level badge wrong color**: Check `getLevelColor()` function
- **Duplicate badges**: Should have category on thumbnail, level in info section only
- **Disabled button navigates**: Ensure `stopPropagation` wrapper is present
- **Enrollment dates not working**: Verify `enrollmentOpenDate`/`enrollmentCloseDate` passed from parent

**WARNING**: This component is used in 4+ places. Changes here affect multiple pages!

---

### ShareDialog (UNIFIED)
**Path**: `client/src/components/Shared/ShareDialog.tsx`  
**Purpose**: Generic reusable sharing modal for both courses and certificates
**Status**: âœ… Production-ready (January 24, 2026)

**Props**:
```typescript
interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareData: { url: string; title: string; text: string };
  contentType: 'course' | 'certificate';
  contentId: string;
  preview?: React.ReactNode; // Optional visual preview
  metadata?: { // For analytics tracking
    title?: string;
    category?: string;
    level?: string;
    price?: number;
    studentName?: string;
    completionDate?: string;
    verificationCode?: string;
  };
}
```

**Services Used**:
- `ShareService` - Social media URL generation, native share, analytics tracking
- `ShareAnalytics` - Event tracking for courses and certificates
- Clipboard API - Copy link functionality
- Navigator.share() - Native share on supported platforms

**Used By**:
- `CourseDetailPage.tsx` - Course detail share (via useShare hook)
- `CourseDetail.tsx` - Course preview share (via useShare hook)
- `CoursesPage.tsx` - Course catalog share (direct)
- `CertificatePage.tsx` - Student certificate share (via useShare hook)
- `PublicCertificatePage.tsx` - Public certificate share (via useShare hook)
- `MyCertificatesPage.tsx` - Certificate list share (via useShare hook)

**Social Platforms**:
- Native Share (if supported by browser - Windows/mobile)
- Copy Link (works everywhere)
- Twitter/X
- Facebook
- LinkedIn
- WhatsApp
- Email

**Features**:
- **Unified System**: Single component for all content types
- **Native Share**: Uses browser's native share UI when available
- **Success Feedback**: "Shared successfully!" snackbar for native share
- **Analytics Tracking**: Separate tracking for courses vs certificates
- **Visual Previews**: Optional preview component (course thumbnail, certificate details)
- **Smart Validation**: Only shows native share if data.url and data.title exist
- **Error Handling**: Silent failure for user cancellation, error messages for failures

**Common Issues**:
- **Browser message "couldn't show all ways to share"**: This is normal - share still worked, just limited targets available
- **Social links not opening**: Check ShareService URL generation
- **Analytics showing undefined**: Ensure metadata passed correctly (see useShare hook usage)
- **Native share not available**: Browser doesn't support it - other platforms still work

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

**Status**: âœ… Complete (January 6, 2026) - Full edit functionality with notifications

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

## ðŸ” Search Autocomplete System (Added February 17, 2026)

### SearchAutocomplete
**Path**: `client/src/components/Search/SearchAutocomplete.tsx` (551 lines)  
**Purpose**: Reusable Udemy-style live search dropdown with debounced API calls, keyboard navigation, and highlighted matching text

**Features**:
- **Two Variants**: `header` (compact for navigation bars) and `hero` (larger for landing page)
- **Debounced Search**: 300ms delay prevents excessive API calls
- **Keyboard Navigation**: Arrow keys, Enter, Escape fully supported
- **Highlighted Matches**: Query text highlighted in bold primary color
- **Loading States**: Spinner and "Searching courses..." message
- **Empty State**: "No courses found" with helpful suggestion text
- **Race Condition Guard**: Request ID counter prevents stale results
- **Debounce Cleanup**: Clears pending searches on navigation
- **Modulo-by-Zero Guard**: Arrow keys work correctly in empty/loading states

**Props**:
```typescript
interface SearchAutocompleteProps {
  variant: 'header' | 'hero';          // Visual style
  placeholder?: string;                 // Input placeholder text
  onSubmit?: (query: string) => void;   // Custom submit handler (default: navigate to /courses?search=...)
  testIdPrefix?: string;                // Test ID prefix for all elements
  showButton?: boolean;                 // Show "Search" button (hero variant only)
}
```

**Styled Components**:
- `SearchContainer` - Main wrapper with variant-specific styles and focus states
- `SearchInputWrapper` - Flex container for icon, input, spinner, button
- `StyledInput` - Custom InputBase with `shouldForwardProp` to prevent `searchVariant` DOM warning
- `ResultItem` - Course result row with hover and keyboard focus styles

**State Management**:
```typescript
const [query, setQuery] = useState('');
const [results, setResults] = useState<Course[]>([]);
const [loading, setLoading] = useState(false);
const [isOpen, setIsOpen] = useState(false);
const [focusedIndex, setFocusedIndex] = useState(-1);
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const requestIdRef = useRef(0);  // Prevents race conditions
```

**Key Handlers**:
- `handleInputChange` - Debounces search, opens dropdown at 2+ chars
- `handleSubmit` - Navigates to /courses?search=... or calls onSubmit prop
- `handleResultClick` - Navigates to /courses/:id
- `handleViewAll` - Navigates to /courses?search=...
- `handleKeyDown` - Arrow keys cycle focus, Enter selects, Escape closes
- `handleClickAway` - Closes dropdown when clicking outside

**Helper Functions**:
```typescript
function highlightMatch(text: string, query: string): React.ReactNode
  // Splits text by regex, highlights matching parts
  // Uses separate regex without 'g' flag for .test() to prevent lastIndex drift

function escapeRegex(str: string): string
  // Escapes special regex characters in user input
```

**API Integration**:
- `coursesApi.searchCourses(query, 6)` - Fetches up to 6 matching courses
- Uses `Course` interface from `client/src/services/coursesApi.ts`
- Displays: Thumbnail, Title, Instructor name, Rating, Price/Free chip

**Integration Sites (4 locations)**:
1. **PublicHeader.tsx** - Guest header (desktop + mobile drawer)
2. **HeaderV5.tsx** - Authenticated header (desktop + mobile expand/collapse)
3. **LandingPage.tsx** - Hero section with `showButton` and custom `onSubmit`
4. **Mobile Drawer** - Both headers include in mobile navigation

**Common Issues Fixed**:
- **Regex global flag bug**: `.test()` with 'g' flag alternates true/false due to lastIndex state. Fixed by using separate regex objects.
- **DOM prop warning**: `variant` prop forwarded to InputBase â†’ DOM. Fixed by renaming to `searchVariant` with `shouldForwardProp`.
- **Race condition**: Out-of-order API responses could overwrite newer results. Fixed with `requestIdRef` counter.
- **Arrow key crash**: Modulo by zero when `totalItems = 0`. Fixed with `if (totalItems > 0)` guard.
- **Stale debounce**: Pending search fires after navigation. Fixed by clearing `debounceRef` in submit/result/viewAll handlers.

**Test IDs**:
- `{testIdPrefix}-input` - Search input field
- `{testIdPrefix}-button` - Search button (hero variant)
- `{testIdPrefix}-dropdown` - Dropdown Paper container
- `{testIdPrefix}-result-{index}` - Individual result items
- `{testIdPrefix}-view-all` - "View all results" link

---

### HeaderV5 (Navigation System)
**Path**: `client/src/components/Navigation/HeaderV5.tsx`  
**Purpose**: Modern navigation header with mega-menu dropdowns, mobile-optimized layout, and live search autocomplete

**Architecture** (Refactored January 31, 2026):
- **Desktop**: Mega-menu dropdowns for grouped navigation (Learn, Collaborate, Tools, Instructor)
- **Mobile**: Bottom navigation bar + full-screen drawer
- **Centralized Config**: `client/src/config/navigation.tsx` - All nav items defined in one place
- **Type Definitions**: `client/src/types/navigation.ts` - TypeScript interfaces

**Related Components**:
- `MegaMenuDropdown.tsx` - Desktop dropdown menus with icons and descriptions
- `MobileBottomNav.tsx` - Fixed bottom navigation for mobile (64px height)
- `MobileNavDrawer.tsx` - Full-screen mobile navigation drawer

**Components Used**:
- `SearchAutocomplete` - Live search dropdown (variant="header", desktop + mobile)
- `MegaMenuDropdown` - Desktop dropdown menus
- `MobileBottomNav` - Fixed bottom navigation for mobile
- `MobileNavDrawer` - Full-screen mobile drawer
- `NotificationBell` - Notification bell with badge
- `PresenceStatusSelector` - Online status selector (desktop only)

**Services Used**:
- `useAuthStore()` - User authentication state and logout
- `useNotificationStore()` - Notification badge count

**Removed Legacy Code** (February 17, 2026):
- Removed static search input (`Search`, `SearchIconWrapper`, `StyledInputBase` styled components)
- Removed `searchQuery` state and `handleSearch` handler
- Fixed bug: Old search navigated to non-existent `/search?q=...` route
- Now uses `SearchAutocomplete` which correctly navigates to `/courses?search=...`

**Navigation Groups** (Role-based):
- **Learn**: Courses, My Learning, Smart Progress
- **Collaborate**: Live Sessions, Study Groups, Office Hours
- **Tools**: AI Tutoring, Chat, Online Users
- **Instructor** (role-restricted): Instructor Dashboard, Analytics Hub

**Profile Menu Items**:
- Profile, My Certificates, Transactions, Notifications, Settings, Logout

**Test IDs** (Backwards Compatible):
- `header-nav-*` - Desktop nav items
- `header-mobile-*` - Mobile drawer items
- `header-profile-menu-*` - Profile dropdown items
- `mobile-nav-*` - Mobile bottom nav items

**Common Issues**:
- **Menu not showing for role**: Check `filterByRole()` in navigation.tsx
- **Logout not working**: Check `authStore.logout()` call
- **Mobile nav not showing**: Only renders when `user` is authenticated

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

## ðŸŽ£ CUSTOM HOOKS

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

## ðŸ”Œ API SERVICE CLASSES

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

## ðŸ› ï¸ UTILITY FUNCTIONS

### courseHelpers.ts
**Path**: `client/src/utils/courseHelpers.ts`  
**Purpose**: Shared utilities for course card styling

**Functions**:
```typescript
formatCategory(category?: string): string
// 'data_science' â†’ 'Data Science'

getCategoryGradient(category?: string): string
// Returns CSS gradient based on category
// Programming â†’ Purple gradient
// Data Science â†’ Pink-Red gradient
// Design â†’ Blue-Cyan gradient
// etc.

getLevelColor(level: string, theme: Theme): string
// Beginner â†’ theme.palette.success.main (green)
// Intermediate â†’ theme.palette.warning.main (orange)
// Advanced â†’ theme.palette.error.main (red)
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
// 99.99 â†’ '$99.99'

formatDuration(minutes: number): string
// 125 â†’ '2h 5m'

formatDate(isoString: string): string
// '2025-11-22T...' â†’ 'Nov 22, 2025'

roundToDecimals(value: number, decimals: number): number
// 99.9999 â†’ 99.99
```

**Used By**: Multiple components for consistent formatting

---

## ðŸŸ¢ PRESENCE SYSTEM COMPONENTS (Phase 2 - Week 2 Day 4)

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

## ðŸ”„ DATA FLOW EXAMPLES

### Enrolling in a Course
```
CourseDetailPage
  â†“ User clicks "Enroll Now"
handleEnroll() â†’ Check if logged in
  â†“ If not logged in
navigate('/login')
  â†“ If logged in
enrollmentApi.enrollInCourse(courseId)
  â†“ POST /api/enrollment/courses/:courseId/enroll
Backend enrollment.ts
  â”œâ”€ Check not already enrolled
  â”œâ”€ Check not instructor's course
  â”œâ”€ Check course is published
  â”œâ”€ Create Enrollment record (NOT UserProgress)
  â””â”€ Update course EnrollmentCount
  â†“ Response: { enrollmentId, status, enrolledAt, ... }
CourseDetailPage
  â”œâ”€ setCourse({ ...course, isEnrolled: true })
  â”œâ”€ setEnrollmentStatus({ isEnrolled: true, ... })
  â”œâ”€ setEnrollmentDialog(true) - Show success dialog
  â””â”€ Button changes to "Continue Learning"
```

### Bookmarking a Course
```
CourseDetailPage (or LessonDetailPage or CoursesPage)
  â†“ User clicks bookmark icon
handleBookmark() â†’ Check if logged in
  â†“ If not logged in
Return early
  â†“ If logged in
Check current state
  â”œâ”€ If isBookmarked: BookmarkApi.removeBookmark(courseId)
  â”‚   â†“ DELETE /api/bookmarks/:courseId
  â”‚   Backend: Delete from Bookmarks table
  â”‚   Frontend: setIsBookmarked(false)
  â”‚
  â””â”€ If not bookmarked: BookmarkApi.addBookmark(courseId)
      â†“ POST /api/bookmarks/:courseId
      Backend: Insert into Bookmarks table (check duplicate)
      Frontend: setIsBookmarked(true)
```

---

## ðŸ”’ PRIVACY ENFORCEMENT (Added December 18, 2025)

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
5. If viewer owns any of target's courses â†’ ALLOW
6. Otherwise, apply normal privacy rules
```

**Security Implementation**:
- Fail-closed defaults: Error â†’ return PRIVATE/false/NULL
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
- Click bell â†’ Open popover with 5 recent notifications
- Click notification â†’ Navigate to actionUrl
- "View All" button â†’ Navigate to /notifications
- "Settings" button â†’ Navigate to /settings
- Empty state when no notifications
- Date formatting: formatDistanceToNow (e.g., "2 hours ago")

**Used By**:
- Header component (always visible in app bar)
- All authenticated pages

**Status**: âœ… Real-time updates working (Dec 29, 2025)

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
- "Verify Now" button â†’ navigate to /verify-email
- Dismiss button (X) â†’ temporarily hides banner
- Auto-shows on page reload if still unverified
- Auto-hides when emailVerified becomes true

**State Management**:
- `dismissed: boolean` - Temporary dismissal state (not persisted)

**Used By**:
- DashboardPage (shown below Header, above content)

**Display Logic**:
```typescript
// Only show if:
// 1. User exists
// 2. User NOT verified
// 3. NOT dismissed
if (!user || user.emailVerified || dismissed) return null;
```

**Status**: âœ… Complete (Dec 27, 2025)

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

## ðŸ—‘ï¸ Account Deletion Components (Added Jan 18-19, 2026)

### SettingsPage (Updated)
**Path**: `client/src/pages/Settings/SettingsPage.tsx` (664 lines)  
**Purpose**: User settings with account deletion functionality

**New Features**:
- Privacy & Security tab with red "Delete My Account" button
- Instructor-specific deletion flow with course management
- Password confirmation before deletion execution
- Transaction-safe deletion with rollback

**Account Deletion Flow**:
1. User clicks "Delete My Account" â†’ Opens InstructorDeletionDialog (if instructor) or ConfirmationDialog (if student)
2. Instructor selects course action: Archive All / Transfer All / Force Delete
3. If Transfer: Opens CourseTransferDialog to select target instructor
4. Password confirmation dialog (always required)
5. Backend executes: Course action â†’ Soft delete user â†’ Audit log
6. Success: Logout, navigate to login, show toast

**State Management**:
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [instructorAction, setInstructorAction] = useState<'archive' | 'transfer' | 'forceDelete' | null>(null);
const [transferToInstructorId, setTransferToInstructorId] = useState<number | null>(null);
const [password, setPassword] = useState('');
```

**Key Methods**:
- `handleFinalDeletion()` - Calls accountDeletionApi.deleteAccount() with all parameters
- `handleArchiveComplete()` - Sets instructorAction='archive'
- `handleTransferComplete(instructorId)` - Sets instructorAction='transfer' and stores instructorId
- **Bug Fix (Jan 19)**: Archive/transfer no longer execute immediately, delayed until password confirmation

**Services Used**:
- `accountDeletionApi.deleteAccount({ instructorAction, transferToInstructorId, password })`

**Status**: âœ… Production-ready with transaction safety

---

### InstructorDeletionDialog
**Path**: `client/src/components/Settings/InstructorDeletionDialog.tsx` (155 lines)  
**Purpose**: Present course management options to instructors before account deletion

**Features**:
- 3 radio button options with clear descriptions:
  - **Archive All Courses**: "Students maintain access, you can restore later"
  - **Transfer All Courses**: "Select new instructor, maintains continuity"
  - **Force Delete All Courses**: "Permanent removal, students lose access"
- Disabled "Continue" button until selection made
- Opens CourseTransferDialog when Transfer option selected
- Clean Material-UI design with warning icons

**Props**:
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  onArchive: () => void;
  onTransfer: () => void;
  onForceDelete: () => void;
}
```

**Status**: âœ… Production-ready

---

### CourseTransferDialog
**Path**: `client/src/components/Settings/CourseTransferDialog.tsx` (221 lines)  
**Purpose**: Select target instructor for course transfer

**Features**:
- Fetches all instructors except current user
- Searchable list with instructor names, emails, course counts
- Radio button selection (single instructor only)
- Displays: Name, Email (plain string - fixed DOM nesting Jan 19), Course count
- Disabled "Confirm Transfer" until instructor selected
- **Bug Fix (Jan 19)**: No longer calls API immediately, only stores selection

**API Used**:
- `GET /api/instructor/all` - Fetch all instructors with course counts

**Props**:
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  onTransferComplete: (instructorId: number) => void;
}
```

**Common Issues Fixed**:
- ~~DOM nesting warning (`<p>` inside `<p>`)~~ âœ… FIXED - ListItemText secondary now plain string
- ~~Immediate API call on selection~~ âœ… FIXED - Delayed until password confirmation

**Status**: âœ… Production-ready

---

### ArchiveCoursesDialog
**Path**: `client/src/components/Settings/ArchiveCoursesDialog.tsx` (156 lines)  
**Purpose**: Confirm course archiving with explanation

**Features**:
- Warning dialog with clear explanation of archiving
- Info box: "Archiving will be executed when you confirm with password"
- "Archive Courses" button (confirmation only, no API call)
- Canceled state management

**Props**:
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  onArchiveComplete: () => void;
}
```

**Bug Fix (Jan 19)**:
- Removed immediate `axios.put('/api/instructor/courses/archive-all')` call
- Now only calls `onArchiveComplete()` to set state in parent
- Actual archiving happens in SettingsPage.handleFinalDeletion() after password

**Status**: âœ… Production-ready

---

### ShareService
**Path**: `client/src/services/shareService.ts`  
**Purpose**: Central service for all sharing operations across platforms  
**Status**: âœ… Production-ready (January 24, 2026)

**Key Methods**:

**URL Generation**:
```typescript
ShareService.generateCourseUrl(courseId: string): string
// Returns: http://localhost:5173/courses/${courseId}/preview

ShareService.generateCertificateUrl(verificationCode: string): string
// Returns: http://localhost:5173/certificate/${verificationCode}
```

**Platform Sharing**:
```typescript
ShareService.share({
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'email' | 'copy' | 'native',
  data: { url: string; title: string; text: string }
}): Promise<boolean>
```

**Analytics Tracking**:
```typescript
ShareService.trackShare(
  contentId: string,
  platform: string,
  contentType: 'course' | 'certificate',
  metadata?: {
    title?: string;
    category?: string; // Course only
    level?: string; // Course only
    price?: number; // Course only
    studentName?: string; // Certificate only
    completionDate?: string; // Certificate only
    verificationCode?: string; // Certificate only
  }
): void
```

**Platform Support**:
- `shareTwitter()` - Opens Twitter share dialog
- `shareFacebook()` - Opens Facebook share dialog
- `shareLinkedIn()` - Opens LinkedIn share dialog
- `shareWhatsApp()` - Opens WhatsApp share (mobile-optimized)
- `shareEmail()` - Opens email client with pre-filled content
- `shareCopy()` - Copies URL to clipboard
- `shareNative()` - Uses browser's native share UI (Windows/mobile)

**Features**:
- **Native Share Support**: Automatic detection with Navigator.canShare()
- **Validation**: Checks for required fields (url, title) before sharing
- **Error Handling**: Distinguishes between user cancellation and failures
- **Extensive Logging**: Debug logs with emoji prefixes for easy debugging
- **Analytics Integration**: Automatic event tracking via ShareAnalytics
- **Platform Info**: getPlatformInfo() returns name and icon for each platform

**Native Share Validation**:
1. Checks `navigator.share` exists
2. Validates `data.url` and `data.title` are present
3. Calls `navigator.canShare(shareData)` to verify browser support
4. Handles AbortError (user cancellation) silently
5. Logs all errors with detailed context

**Status**: âœ… 328 lines, fully implemented with certificate support

---

### ShareAnalytics
**Path**: `client/src/services/shareAnalytics.ts`  
**Purpose**: Analytics tracking for share events (courses and certificates)  
**Status**: âœ… Production-ready (January 24, 2026)

**Interface**:
```typescript
interface ShareEvent {
  contentType: 'course' | 'certificate';
  contentId: string;
  platform: string;
  userId?: string;
  timestamp: string;
  title?: string;
  // Course-specific
  courseCategory?: string;
  courseLevel?: string;
  coursePrice?: number;
  // Certificate-specific
  studentName?: string;
  completionDate?: string;
  verificationCode?: string;
}
```

**Methods**:
```typescript
trackShare(event: Omit<ShareEvent, 'timestamp'>): void
getShareEvents(): ShareEvent[]
getCourseShareEvents(courseId: string): ShareEvent[]
getCertificateShareEvents(certificateId: string): ShareEvent[]
getShareEventsByPlatform(platform: string): ShareEvent[]
getShareStatistics(): { totalShares, platformBreakdown, avgSharesPerCourse }
```

**Features**:
- **Content Type Tracking**: Separate tracking for courses vs certificates
- **Local Storage**: Persists events across sessions
- **Statistics**: Aggregate analytics (total shares, platform breakdown)
- **Query Methods**: Filter by course, certificate, or platform
- **Timestamp**: ISO format timestamps for all events

**Storage**:
- In-memory array for current session
- localStorage for persistence
- Console logging for debugging

**TODO**: Integration with Google Analytics / Mixpanel

---

### AccountDeletionService (Backend)
**Path**: `server/src/services/AccountDeletionService.ts` (547 lines)  
**Purpose**: Orchestrate account deletion with course management  
**Updated**: February 4, 2026 - CASCADE DELETE fixes for automatic cleanup

**Key Methods**:

1. **deleteAccount(userId, instructorAction, transferToInstructorId, password)**
   - Validates password with bcrypt
   - Begins SQL transaction
   - Routes to appropriate course action handler
   - Soft-deletes user (Status='deleted', DeletedAt=NOW())
   - Triggers CASCADE DELETE on 25+ related tables automatically:
     - Transactions â†’ Invoices (CASCADE)
     - CourseProgress, UserProgress, Enrollments (CASCADE)
     - EmailTrackingEvents, EmailUnsubscribeTokens (CASCADE)
     - Notifications, NotificationPreferences (CASCADE)
     - UserSettings, UserPresence (CASCADE)
     - And 15+ more tables
   - Logs deletion in AccountDeletionLog
   - Commits transaction or rolls back on error

2. **archiveAllCourses(userId, transaction)**
   - Updates all instructor's courses to Status='archived'
   - Preserves InstructorId for potential restoration
   - Students maintain access to archived courses

3. **transferCourses(userId, newInstructorId, transaction)**
   - Validates target instructor exists and is active
   - Updates InstructorId on all courses
   - Inserts transfer records in CourseOwnershipHistory
   - Reason='account_deletion'

4. **softDeleteCourses(userId, transaction)**
   - Updates courses to Status='deleted', InstructorId=NULL
   - Creates "orphaned" courses (no longer appear in public catalog)
   - Students can still access via direct enrollment links

**Database Tables Used**:
- `Users` - Soft delete (Status='deleted')
- `Courses` - Update Status or InstructorId
- `CourseOwnershipHistory` - Track transfers
- `AccountDeletionLog` - Audit trail

**CASCADE DELETE Pattern (Fixed Feb 4, 2026)**:
- 4 FK constraints updated for proper automatic cleanup:
  - CourseProgress.UserId â†’ ON DELETE CASCADE
  - Invoices.TransactionId â†’ ON DELETE CASCADE
  - EmailTrackingEvents.UserId â†’ ON DELETE CASCADE
  - EmailUnsubscribeTokens.UserId â†’ ON DELETE CASCADE
- GDPR-compliant: All user personal data automatically deleted
- No manual deletion code needed for CASCADE-enabled tables

**Email Notifications**:
- Sends 4 types of emails during deletion process:
  1. Account deletion confirmation (to deleted user)
  2. Course archive notification (to enrolled students)
  3. Course transfer notification (to students + new instructor)
  4. Course deletion warning (to students losing access)
- **Always sent** - Bypass notification preferences (security/critical emails)
- Not part of 31 notification triggers system (non-optional)

**Security**:
- Password verification before any action
- All operations in transaction (atomicity)
- SQL injection protection (parameterized queries)
- Authentication middleware required

**Status**: âœ… Production-ready with comprehensive error handling

---

### ShareService
**Path**: `client/src/services/shareService.ts`  
**Purpose**: Central service for all sharing operations across platforms  
**Status**: âœ… Production-ready (January 24, 2026)

**Key Methods**:

**URL Generation**:
```typescript
ShareService.generateCourseUrl(courseId: string): string
// Returns: http://localhost:5173/courses/${courseId}/preview

ShareService.generateCertificateUrl(verificationCode: string): string
// Returns: http://localhost:5173/certificate/${verificationCode}
```

**Platform Sharing**:
```typescript
ShareService.share({
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'email' | 'copy' | 'native',
  data: { url: string; title: string; text: string }
}): Promise<boolean>
```

**Analytics Tracking**:
```typescript
ShareService.trackShare(
  contentId: string,
  platform: string,
  contentType: 'course' | 'certificate',
  metadata?: {
    title?: string;
    category?: string; // Course only
    level?: string; // Course only
    price?: number; // Course only
    studentName?: string; // Certificate only
    completionDate?: string; // Certificate only
    verificationCode?: string; // Certificate only
  }
): void
```

**Platform Support**:
- `shareTwitter()` - Opens Twitter share dialog
- `shareFacebook()` - Opens Facebook share dialog
- `shareLinkedIn()` - Opens LinkedIn share dialog
- `shareWhatsApp()` - Opens WhatsApp share (mobile-optimized)
- `shareEmail()` - Opens email client with pre-filled content
- `shareCopy()` - Copies URL to clipboard
- `shareNative()` - Uses browser's native share UI (Windows/mobile)

**Features**:
- **Native Share Support**: Automatic detection with Navigator.canShare()
- **Validation**: Checks for required fields (url, title) before sharing
- **Error Handling**: Distinguishes between user cancellation and failures
- **Extensive Logging**: Debug logs with emoji prefixes for easy debugging
- **Analytics Integration**: Automatic event tracking via ShareAnalytics
- **Platform Info**: getPlatformInfo() returns name and icon for each platform

**Native Share Validation**:
1. Checks `navigator.share` exists
2. Validates `data.url` and `data.title` are present
3. Calls `navigator.canShare(shareData)` to verify browser support
4. Handles AbortError (user cancellation) silently
5. Logs all errors with detailed context

**Status**: âœ… 328 lines, fully implemented with certificate support

---

### ShareAnalytics
**Path**: `client/src/services/shareAnalytics.ts`  
**Purpose**: Analytics tracking for share events (courses and certificates)  
**Status**: âœ… Production-ready (January 24, 2026)

**Interface**:
```typescript
interface ShareEvent {
  contentType: 'course' | 'certificate';
  contentId: string;
  platform: string;
  userId?: string;
  timestamp: string;
  title?: string;
  // Course-specific
  courseCategory?: string;
  courseLevel?: string;
  coursePrice?: number;
  // Certificate-specific
  studentName?: string;
  completionDate?: string;
  verificationCode?: string;
}
```

**Methods**:
```typescript
trackShare(event: Omit<ShareEvent, 'timestamp'>): void
getShareEvents(): ShareEvent[]
getCourseShareEvents(courseId: string): ShareEvent[]
getCertificateShareEvents(certificateId: string): ShareEvent[]
getShareEventsByPlatform(platform: string): ShareEvent[]
getShareStatistics(): { totalShares, platformBreakdown, avgSharesPerCourse }
```

**Features**:
- **Content Type Tracking**: Separate tracking for courses vs certificates
- **Local Storage**: Persists events across sessions
- **Statistics**: Aggregate analytics (total shares, platform breakdown)
- **Query Methods**: Filter by course, certificate, or platform
- **Timestamp**: ISO format timestamps for all events

**Storage**:
- In-memory array for current session
- localStorage for persistence
- Console logging for debugging

**TODO**: Integration with Google Analytics / Mixpanel

---

### accountDeletionApi.ts (Frontend Service)
**Path**: `client/src/services/accountDeletionApi.ts`  
**Purpose**: API calls for account deletion

**Methods**:
```typescript
deleteAccount(data: {
  instructorAction?: 'archive' | 'transfer' | 'forceDelete';
  transferToInstructorId?: number;
  password: string;
}): Promise<{ message: string }>
```

**Endpoint**: `DELETE /api/account-deletion/delete`

**Status**: âœ… Production-ready

---
