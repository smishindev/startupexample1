# Mishin Learn Platform - Component Registry

**Last Updated**: November 22, 2025  
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
