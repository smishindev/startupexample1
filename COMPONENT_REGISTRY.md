# Mishin Learn Platform - Component Registry

**Last Updated**: February 23, 2026 - Mobile Optimization Phase 3 Complete 📱  
**Purpose**: Quick reference for all major components, their dependencies, and relationships

---

## 📱 Responsive Component Library (Added February 21, 2026)

**Path**: `client/src/components/Responsive/`  
**Purpose**: Reusable, theme-aware wrappers that encapsulate all mobile-optimization patterns. Every page should use these instead of raw MUI primitives.

### Constants (`constants.ts`)
Single source of truth for layout dimensions:
```typescript
BOTTOM_NAV_HEIGHT = 64      // MobileBottomNav height (px)
BOTTOM_NAV_PADDING = 10     // MUI spacing units of pb on mobile (= 80px)
HEADER_HEIGHT_MOBILE = 56   // AppBar height xs-sm (px)
HEADER_HEIGHT_DESKTOP = 64  // AppBar height md+ (px)
PAGE_PADDING_X = { xs: 2, sm: 3, md: 4 }  // Horizontal page padding
PAGE_MARGIN_Y = 4           // Vertical page margin (MUI units)
SIDEBAR_WIDTH = 280         // Permanent sidebar (px)
```

### `useResponsive` Hook
```typescript
const { isMobile, isTablet, isDesktop, isSmallMobile } = useResponsive();
// isMobile     = breakpoints.down('md')           (< 900px)
// isSmallMobile = breakpoints.down('sm')          (< 600px)
// isTablet      = breakpoints.between('md', 'lg')
// isDesktop     = breakpoints.up('lg')
```

### `PageContainer`
**Path**: `Responsive/PageContainer.tsx`  
**Purpose**: Replaces raw `<Container maxWidth="xl">` on every authenticated page. Adds `px: PAGE_PADDING_X` and `pb: { xs: BOTTOM_NAV_PADDING, md: 0 }` automatically via `sx={[baseStyles, ...consumerSx]}` (MUI array form).  
**Props**: `maxWidth`, `disableBottomPad`, `sx`, standard Container props  
**Usage**: `<PageContainer> ... </PageContainer>`

> ⚠️ **CRITICAL — `py` vs `pt` rule**:  
> Consumer `py:` in `sx` expands to both `paddingTop` AND `paddingBottom`, silently overriding the base `pb: { xs: 10, md: 0 }` for MobileBottomNav clearance. Any bottom content (pagination, save buttons, last cards) becomes hidden behind the 64px nav bar on mobile.  
> **Rule**: Always use `pt:` (not `py:`) in authenticated page consumer sx.  
> **Exception**: `disableBottomPad` pages (public/guest — no MobileBottomNav renders) may use `py:` safely.

### `PageTitle`
**Path**: `Responsive/PageTitle.tsx`  
**Purpose**: `<Typography variant="h4">` that scales to `h5` on mobile with responsive `fontSize`. Optional `subtitle` prop.  
**Props**: `subtitle`, `sx`, standard Typography props  
**Usage**: `<PageTitle subtitle="Subtext here">Page Heading</PageTitle>`

### `ResponsiveDialog`
**Path**: `Responsive/ResponsiveDialog.tsx`  
**Purpose**: MUI `<Dialog>` that automatically sets `fullScreen` on mobile (no manual `isMobile` check per dialog needed).  
**Props**: `title`, `actions`, `fullScreenBreakpoint` (default `'sm'`), standard Dialog props  
**Usage**: `<ResponsiveDialog open={open} onClose={onClose} title="Edit">...</ResponsiveDialog>`

### `ResponsivePaper`
**Path**: `Responsive/ResponsivePaper.tsx`  
**Purpose**: `<Paper>` with responsive padding `{ xs: 2, sm: 3, md: 4 }` applied by default.  
**Props**: `padding` override, `sx`, standard Paper props

### `ResponsiveStack`
**Path**: `Responsive/ResponsiveStack.tsx`  
**Purpose**: `<Stack>` that switches `direction` from `'column'` (mobile) to `'row'` (desktop) at a configurable breakpoint.  
**Props**: `breakpoint` (default `'sm'`), standard Stack props  
**Usage**: `<ResponsiveStack spacing={2}><Button/><Button/></ResponsiveStack>`

### `index.ts` — Barrel Export
```typescript
import { PageContainer, PageTitle, useResponsive, ResponsiveDialog,
         ResponsivePaper, ResponsiveStack, BOTTOM_NAV_HEIGHT, ... } from '../../components/Responsive';
```

**Pages currently using Responsive library** (Phase 1 + Phase 2 — 22 pages):
- **Phase 1 (9)**: `LandingPage.tsx`, `Login.tsx`, `Register.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `EmailVerificationPage.tsx`, `CoursesPage.tsx`, `CourseDetailPage.tsx`, `DashboardPage.tsx`
- **Phase 2 (12)**: `MyLearningPage.tsx`, `LessonDetailPage.tsx`, `NotificationsPage.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx`, `NotificationSettingsPage.tsx`, `StudentProgressPage.tsx`, `StudentAssessmentDashboard.tsx`, `AssessmentTakingPage.tsx`, `MyCertificatesPage.tsx`, `CertificatePage.tsx`, `PublicCertificatePage.tsx`
- **Phase 2 component**: `StudentProgressDashboard.tsx` (wrapped by StudentProgressPage)

---

## 🎨 Theme System (Added February 21, 2026)

**Path**: `client/src/theme/`  
**Purpose**: Single source of truth for all design values. Centralises colors, shadows, and border-radius tokens to prevent hardcoding across 2,500+ `sx` props and protect against painful MUI version upgrades.

### `index.ts` — Main Theme File
**Path**: `client/src/theme/index.ts`  
**Exports**: `theme` (named + default), `mishinColors` (raw palette), `SxProps`, `Theme`

- Single `createTheme()` call (merged old separate `augmentedTheme` — it was defined but never imported by `main.tsx`)
- `shape.borderRadius = 12` — ORIGINAL pre-existing value, NOT changed by token work
- Custom breakpoints: `xs:0 / sm:640 / md:768 / lg:1024 / xl:1280` (Tailwind-aligned, also original)
- **Extended palette shades**: All 5 palettes (`primary`, `secondary`, `success`, `warning`, `error`) have 50-900 shades
- **Component overrides**: MuiButton, MuiCard, MuiTextField, MuiChip, MuiAppBar, MuiDrawer, MuiListItemButton, MuiTab, MuiTabs (all use `baseRadius` variable)

**`theme.custom` token namespaces**:

| Namespace | Tokens | `sx` Usage |
|-----------|--------|------------|
| `custom.colors` | `gold`, `onlineGreen`, `muted`, `mutedDark`, `border`, `surfaceHover`, `overlay`, `brandPrimary` | `sx={{ color: (t) => t.custom.colors.gold }}` |
| `custom.shadows` | `soft`, `card`, `cardHover`, `dialog`, `image`, `focusPrimary`, `focusSuccess`, `large`, `none` | `sx={{ boxShadow: (t) => t.custom.shadows.card }}` |
| `custom.radii` | `none`(0), `sm`(6), `md`(12), `card`(16), `chip`(20), `lg`(24), `full`('50%') | See critical rules below |

**Critical borderRadius rules**:
- Number tokens MUST be stringified: `sx={{ borderRadius: (t) => \`${t.custom.radii.card}px\` }}` — otherwise MUI multiplies by `shape.borderRadius` (12) ⇒ `16×12 = 192px`!
- `full` is the **only exception** — it is already the string `'50%'`: use `(t) => t.custom.radii.full` directly (adding `px` would produce `'50%px'`)

**Colors outside `sx`** (Toaster, chart libraries, third-party components):
```tsx
import { mishinColors } from '../../theme';
mishinColors.primary[500]  // '#6366f1'
mishinColors.success[500]  // '#22c55e'
```

### `tokens.ts` — Reusable `sx` Fragments
**Path**: `client/src/theme/tokens.ts`  
18 reusable `SxProps<Theme>` objects — spread into any component's `sx` prop.

| Group | Fragment Names |
|-------|----------------|
| Surfaces | `cardSx`, `elevatedPaperSx`, `flatSurfaceSx` |
| Text overflow | `truncateSx`, `lineClamp2Sx`, `lineClamp3Sx` |
| Flex layout | `centeredFlexSx`, `spacedRowSx`, `inlineRowSx` |
| Interactivity | `clickableSx`, `focusRingSx` |
| Media | `responsiveImageSx`, `avatarSx` |
| Miscellaneous | `statusDotSx`, `badgeSx`, `scrollRowSx`, `glassSx`, `srOnlySx` |

```tsx
import { cardSx, truncateSx, centeredFlexSx } from '../../theme/tokens';
<Paper sx={{ ...cardSx }}>
  <Typography sx={{ ...truncateSx }}>Long text</Typography>
</Paper>
```

**Note**: `tokens.ts` is not yet imported by any page component — tokens are ready to use as Phase 2+ pages are mobile-optimized.

---

## 🔽 CourseSelector — Reusable Course Dropdown (Added February 19, 2026)

### CourseSelector
**Path**: `client/src/components/Common/CourseSelector.tsx` (406 lines)  
**Purpose**: Single reusable dropdown that replaced 9 independent course-select implementations across the platform

**Features**:
- MUI Autocomplete with IntersectionObserver + scroll-based lazy rendering
- Client-side type-to-search across the full course list
- Single-select and multi-select (chips) modes
- Optional synthetic "All Courses" first option (`allOption` prop)
- Helper text: `"X of Y courses loaded — type to search or scroll for more"` when list exceeds `initialDisplayCount`
- Accepts both PascalCase (`{Id, Title}`) and camelCase (`{id, title}`) course objects
- Custom `renderCourseOption` override for rich item rendering
- Custom `renderTag` override for multi-select chip rendering
- `excludeIds` prop to remove specific courses from options
- Lazy rendering: renders `initialDisplayCount` items initially, loads `loadMoreCount` more per scroll

**Props**:
```typescript
interface CourseSelectorProps {
  courses: any[];                          // PascalCase or camelCase — auto-normalised
  value: string | string[] | null;         // Selected course id(s)
  onChange: (value: any) => void;          // Fires with new id or id[]
  multiple?: boolean;                      // Multi-select mode (default: false)
  disabled?: boolean;
  required?: boolean;                      // Prevents clearing (disableClearable)
  allOption?: { value: string; label: string }; // Synthetic first option
  excludeIds?: string[];                   // Course IDs to hide
  label?: string;
  placeholder?: string;                   // Default: 'Search courses...'
  size?: 'small' | 'medium';
  showHelperText?: boolean;               // Default: true
  sx?: SxProps<Theme>;
  fullWidth?: boolean;                    // Default: true
  testId?: string;
  inputTestId?: string;
  renderCourseOption?: (props, option, state) => ReactNode;
  renderTag?: (option, index, getTagProps) => ReactNode;
  initialDisplayCount?: number;           // Default: 50
  loadMoreCount?: number;                 // Default: 12
}
```

**Usage**:
```tsx
import { CourseSelector } from '../../components/Common/CourseSelector';

// Basic single-select with "All Courses" option
<CourseSelector
  courses={courses}
  value={selectedCourseId}
  onChange={(id: string) => setSelectedCourseId(id)}
  allOption={{ value: '', label: 'All Courses' }}
  size="small"
  testId="my-course-select"
/>

// Multi-select
<CourseSelector
  courses={courses}
  value={selectedIds}
  onChange={(ids: string[]) => setSelectedIds(ids)}
  multiple
/>
```

**`showHelperText` Rules**:
- Default `true` — always show if there are more courses than `initialDisplayCount`
- Set `showHelperText={false}` only for compact modals where vertical space is limited
- Currently `false` only in: `CreateSessionModal`, `CreateGroupModal`, `CourseSettingsEditor` (prerequisites)
- Currently `false` also in: `StudentManagement` (near search bar — compact filter context)

**Data Fetching Convention**:
- Pages must fetch ALL courses (not default `limit=12`) when populating CourseSelector
- Use `instructorApi.getCoursesForDropdown()` (instructor side) — fetches with `limit=10000`
- Use `enrollmentApi.getMyEnrollments(1, 10000)` (student side)
- Use `coursesApi.getEnrolledCourses()` (student Tutoring page — `limit=10000`)

**Pages using CourseSelector** (10 instances):
1. `CourseAnalyticsDashboard.tsx` — `allOption: 'All Courses Overview'`
2. `VideoAnalyticsPage.tsx` — required, no allOption (needs specific course for per-lesson data)
3. `StudentManagement.tsx` — `allOption: 'All Courses'`, `showHelperText={false}` (filter bar)
4. `StudyGroupsPage.tsx` — `allOption: 'All Study Groups'`
5. `Tutoring.tsx` — `allOption: 'All Courses'` with custom `renderCourseOption`
6. `InstructorSessionsList.tsx` — `allOption: 'All Courses'`
7. `StudentSessionsList.tsx` — `allOption: 'All Courses'`
8. `CreateSessionModal.tsx` — modal, no allOption
9. `CreateGroupModal.tsx` — modal, no allOption
10. `CourseSettingsEditor.tsx` — prerequisites modal, `excludeIds` to hide current course

---

## ⭐ Course Ratings & Reviews System (Added February 15, 2026)

### RatingService (Backend)
**Path**: `server/src/services/RatingService.ts` (288 lines)  
**Purpose**: Complete CRUD operations for course ratings and reviews

**Features**:
- **Submit Rating**: Upsert (insert or update) with automatic recalculation
- **Get User Rating**: Fetch student's own rating for a course
- **Get Rating Summary**: Average, count, and distribution (1-5 star breakdown)
- **Get Course Ratings**: Paginated reviews with sorting (newest, oldest, highest, lowest)
- **Delete Rating**: Soft delete with recalculation
- **Validation**: `canUserRate()` checks enrollment status and prevents instructor self-rating
- **Recalculation**: Atomic denormalization to `Courses.Rating` and `Courses.RatingCount`

**Key Methods**:
```typescript
async submitRating(userId, courseId, rating, reviewText?): Promise<{ rating, isNew }>
  - Upserts rating (MERGE statement)
  - Returns isNew flag for notification logic
  - Calls recalculateRating() after success

async getUserRating(userId, courseId): Promise<rating | null>
  - Returns user's own rating or null

async getRatingSummary(courseId): Promise<RatingSummary>
  - Returns { averageRating, totalRatings, distribution: { 1: count, 2: count, ... } }

async getCourseRatings(courseId, { page, limit, sort }): Promise<PaginatedRatings>
  - Sort options: newest, oldest, highest, lowest
  - Returns { ratings[], pagination }

async deleteRating(userId, courseId): Promise<void>
  - Deletes rating and recalculates course average

async canUserRate(userId, courseId): Promise<{ canRate, reason? }>
  - Checks: not instructor, enrolled (active/completed status)

async recalculateRating(courseId): Promise<void>
  - Atomic UPDATE: SET Rating = AVG(rating), RatingCount = COUNT(*)
```

**Database Interaction**:
- `CourseRatings` table: Id, CourseId FK, UserId FK, Rating (1-5), ReviewText (max 2000), CreatedAt, UpdatedAt
- `Courses` table: Rating (DECIMAL 3,2), RatingCount (INT) — denormalized for performance
- UNIQUE INDEX on (CourseId, UserId) prevents duplicate ratings

### Rating API Routes (Backend)
**Path**: `server/src/routes/ratings.ts` (193 lines)  
**Purpose**: REST API endpoints for rating operations

**Endpoints**:
```typescript
GET    /api/ratings/courses/:id/summary      - Public, returns RatingSummary
GET    /api/ratings/courses/:id/ratings      - Public, paginated reviews
GET    /api/ratings/courses/:id/my-rating    - Auth, user's own rating
POST   /api/ratings/courses/:id              - Auth, submit/update rating
DELETE /api/ratings/courses/:id              - Auth, delete own rating
GET    /api/ratings/instructor/summary       - Auth + instructor role, aggregate stats
```

**Real-time Integration**:
- After successful submit/update/delete: `CourseEventService.emitCourseUpdated(courseId, ['rating'])`
- Broadcasts to `course-{courseId}` + `courses-catalog` rooms
- Frontend hooks refetch data automatically

**Notification Integration**:
- **New Rating**: Title "New Course Rating", Priority "normal"
  - Message: "{student} rated \"{course}\" {rating}/5 stars{+ left a review}"
- **Updated Rating**: Title "Course Rating Updated", Priority "low"
  - Message: "{student} updated their rating for \"{course}\" to {rating}/5 stars"
- ActionUrl: `/courses/{courseId}#reviews`
- **Preference Control**: Settings → Notifications → Course Updates → Course Ratings toggle
  - Respects instructor's in-app and email preferences (\`EnableCourseRatings\`, \`EmailCourseRatings\`)

### ratingApi (Frontend Service)
**Path**: `client/src/services/ratingApi.ts` (127 lines)  
**Purpose**: Frontend API service for rating operations with typed responses

**Types**:
```typescript
interface CourseRating {
  Id: string;
  CourseId: string;
  UserId: string;
  Rating: number;
  ReviewText: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  FirstName: string;
  LastName: string;
}

interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  distribution: { [key: string]: number };
}

interface PaginatedRatings {
  ratings: CourseRating[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

**Methods**:
```typescript
getRatingSummary(courseId): Promise<RatingSummary>
getCourseRatings(courseId, { page, limit, sort }): Promise<PaginatedRatings>
getMyRating(courseId): Promise<CourseRating | null>
submitRating(courseId, { rating, reviewText }): Promise<{ success, message, rating, isNew }>
deleteRating(courseId): Promise<void>
```

### RatingSubmitForm
**Path**: `client/src/components/Rating/RatingSubmitForm.tsx` (199 lines)  
**Purpose**: Star rating form with display/edit modes and external edit trigger

**Props**:
```typescript
interface RatingSubmitFormProps {
  courseId: string;
  existingRating: CourseRating | null;
  onRatingSubmitted: () => void;
  onRatingDeleted: () => void;
  editTrigger?: number;  // Increment to externally trigger edit mode
}
```

**Features**:
- **Display Mode**: Shows existing rating with Edit/Delete buttons (3-dots menu pattern)
- **Edit Mode**: Star selector + review text field (2000 char limit with counter)
- **External Edit Trigger**: `editTrigger` prop increments → useEffect syncs form state from `existingRating` → switches to edit mode
- **Validation**: Rating 1-5 required, review text optional
- **Loading States**: Submit and delete spinners
- **Toast Notifications**: Success/error feedback

**Usage**:
```tsx
// CourseDetailPage
const [editTrigger, setEditTrigger] = useState(0);

<RatingSubmitForm 
  courseId={courseId}
  existingRating={userRating}
  onRatingSubmitted={handleRatingSubmitted}
  onRatingDeleted={handleRatingSubmitted}
  editTrigger={editTrigger}  // Incremented by "Edit Review" button
/>
```

**Bug Fix (Feb 15)**: Added state sync in `editTrigger` useEffect to prevent stale form values when `existingRating` prop changes.

### RatingSummaryCard
**Path**: `client/src/components/Rating/RatingSummaryCard.tsx` (~120 lines)  
**Purpose**: Display average rating and distribution

**Props**:
```typescript
interface RatingSummaryCardProps {
  summary: RatingSummary;
}
```

**Features**:
- Large average rating with gold stars
- Total rating count
- Distribution bars (5 stars → 1 star) with percentages and counts
- Zero state handling

### ReviewCard
**Path**: `client/src/components/Rating/ReviewCard.tsx` (91 lines)  
**Purpose**: Individual review display with owner actions

**Props**:
```typescript
interface ReviewCardProps {
  review: CourseRating;
  currentUserId?: string;
  onEdit?: () => void;  // Called when owner clicks "Edit Review"
}
```

**Features**:
- User name + avatar
- Star rating display
- Review text
- Relative timestamp ("X days ago")
- 3-dots menu (Edit for owner only)
- `onEdit` callback triggers parent to scroll to form and increment `editTrigger`

### ReviewsList
**Path**: `client/src/components/Rating/ReviewsList.tsx` (130 lines)  
**Purpose**: Paginated list of reviews with sorting

**Props**:
```typescript
interface ReviewsListProps {
  courseId: string;
  refreshKey?: number;  // Increment to refetch
  onEditClick?: () => void;  // Passed to ReviewCard for edit action
}
```

**Features**:
- Sort dropdown (Newest, Oldest, Highest Rating, Lowest Rating)
- Pagination controls
- Loading states (skeleton + spinner)
- Empty state ("No reviews yet")
- Auto-refetch on `refreshKey` change (e.g., after rating submitted or real-time update)

**Real-time Integration**:
```tsx
// CourseDetailPage
<ReviewsList 
  courseId={courseId} 
  refreshKey={reviewsRefreshKey + realtimeRefetchCounter}  // Refetch on real-time course updates
  onEditClick={() => {
    setEditTrigger(prev => prev + 1);
    // Scroll to form...
  }}
/>
```

### CourseDetailPage - Ratings Section
**Path**: `client/src/pages/Course/CourseDetailPage.tsx`  
**Integration**: Reviews section at bottom of course detail page

**Features**:
- `#reviews` hash navigation support (scrolls to reviews section)
- Rating summary card
- Rating submit form (only for enrolled non-instructor users)
- Reviews list with pagination
- **Real-time Updates**: 
  - `realtimeRefetchCounter` state incremented by `useCourseRealtimeUpdates` hook
  - Rating summary useEffect depends on `[courseId, reviewsRefreshKey, realtimeRefetchCounter, user]`
  - ReviewsList `refreshKey` = `reviewsRefreshKey + realtimeRefetchCounter`
  - When instructor edits course OR student submits rating → real-time refetch
- **Edit Trigger**: `editTrigger` state wired to ReviewCard's `onEdit` → scrolls to form + increments trigger

```tsx
// Rating summary useEffect (refetches on real-time updates)
useEffect(() => {
  if (!courseId) return;
  ratingApi.getRatingSummary(courseId).then(setRatingSummary);
  if (user) {
    ratingApi.getMyRating(courseId).then(setUserRating);
  }
}, [courseId, reviewsRefreshKey, realtimeRefetchCounter, user]);

// Real-time hook
useCourseRealtimeUpdates(courseId, useCallback(() => {
  setRealtimeRefetchCounter(prev => prev + 1);
}, []));
```

### CoursesPage & MyLearningPage - Rating Display
**Purpose**: Show course ratings on catalog and My Learning cards

**CoursesPage.tsx**:
- Rating display below course title on catalog cards
- Gold stars + numeric average + count in parentheses
- Conditional render when `RatingCount > 0`

**MyLearningPage.tsx**:
- Rating display between instructor name and level/category chips
- Same visual pattern as CoursesPage
- **Real-time Updates (Feb 15)**: Added `useCatalogRealtimeUpdates` hook
  - Listens to `course:updated` event
  - Refetches enrollments when ratings change
  - Instructor's My Learning page now updates instantly when students rate their courses

```tsx
// MyLearningPage - Real-time updates
useCatalogRealtimeUpdates(useCallback(() => {
  loadEnrollments();
}, [page]));
```

### useCatalogRealtimeUpdates Hook (Enhanced Feb 15)
**Path**: `client/src/hooks/useCatalogRealtimeUpdates.ts` (119 lines)  
**Enhancement**: Added `course:updated` event listener for rating changes

**Events Listened**:
- `course:catalog-changed` — Course published/unpublished/deleted
- `course:enrollment-changed` — Enrollment count changed
- `course:updated` — **NEW**: Course data changed (lessons, metadata, **ratings**)

**Real-time Flow**:
1. Student submits/updates/deletes rating
2. Server: `ratings.ts` → `CourseEventService.emitCourseUpdated(courseId, ['rating'])`
3. Socket.IO broadcasts to `courses-catalog` room (all authenticated users)
4. Frontend: `useCatalogRealtimeUpdates` receives `course:updated` event
5. Triggers `onUpdate()` callback → refetch data
6. MyLearningPage, InstructorDashboard, CoursesPage all update automatically

```typescript
interface CourseUpdatedData {
  courseId: string;
  fields: string[];  // e.g., ['rating'], ['lessons'], ['metadata', 'thumbnail']
  timestamp: string;
}

const handleCourseUpdated = (data: CourseUpdatedData) => {
  console.log('[useCatalogRealtimeUpdates] Course updated:', data.courseId, data.fields);
  triggerUpdate();  // 500ms debounced refetch
};

socket.on('course:updated', handleCourseUpdated);
```

---

## 🔄 Real-time Course Update Hooks (Added February 13, 2026)

### useCourseRealtimeUpdates
**Path**: `client/src/hooks/useCourseRealtimeUpdates.ts` (112 lines)  
**Purpose**: Listen for real-time course data changes and trigger page refresh

**Features**:
- Listens to Socket.IO events: `course:updated`, `course:enrollment-changed`
- Filters events by `courseId` (only triggers for current course)
- 300ms client-side debounce (batches rapid server events)
- Reconnection-safe: Uses `socketService.onConnect()`/`offConnect()` pattern
- Memory-leak-safe: Complete cleanup on unmount (listeners + debounce timer)
- Stale closure prevention: `onUpdateRef.current` always calls latest callback

**Usage**:
```tsx
import { useCourseRealtimeUpdates } from '../hooks/useCourseRealtimeUpdates';

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [realtimeRefetchCounter, setRealtimeRefetchCounter] = useState(0);
  
  // Hook increments counter → triggers fetchCourse useEffect
  useCourseRealtimeUpdates(courseId, useCallback(() => {
    setRealtimeRefetchCounter(prev => prev + 1);
  }, []));
  
  useEffect(() => {
    fetchCourse(); // Re-runs when realtimeRefetchCounter changes
  }, [courseId, user, realtimeRefetchCounter]);
};
```

**Architecture**:
```typescript
const onUpdateRef = useRef(onUpdate);           // Stable reference to callback
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
const listenersRef = useRef({ ... });           // Track handlers for cleanup

const setupListeners = () => {
  removeListeners();                            // Prevent duplicates on reconnect
  const handleCourseUpdated = (data) => {
    if (data.courseId === courseId) {           // Filter by courseId
      triggerUpdate();                          // Debounced
    }
  };
  socket.on('course:updated', handleCourseUpdated);
  socket.on('course:enrollment-changed', handleEnrollmentChanged);
  listenersRef.current = { handleCourseUpdated, handleEnrollmentChanged };
};

socketService.onConnect(setupListeners);        // Survives reconnections

return () => {
  socketService.offConnect(setupListeners);     // Remove reconnect handler
  removeListeners();                            // Remove socket listeners
  clearTimeout(debounceTimerRef.current);       // Clear pending debounce
};
```

### useCatalogRealtimeUpdates
**Path**: `client/src/hooks/useCatalogRealtimeUpdates.ts` (104 lines)  
**Purpose**: Listen for catalog-level changes and trigger page refresh

**Features**:
- Listens to: `course:catalog-changed`, `course:enrollment-changed`
- No courseId filter (all catalog events trigger refresh)
- 500ms client-side debounce (heavier than course hook)
- Same reconnection-safe + memory-leak-safe patterns as course hook

**Usage**:
```tsx
import { useCatalogRealtimeUpdates } from '../hooks/useCatalogRealtimeUpdates';

const CoursesPage = () => {
  useCatalogRealtimeUpdates(() => {
    loadCourses(true);      // true = "search-loading" (lighter spinner)
    loadCategories();
    loadLevels();
    loadOverallStats();
  });
};
```

### CourseEventService (Backend)
**Path**: `server/src/services/CourseEventService.ts` (212 lines)  
**Purpose**: Centralized real-time event broadcaster for all course changes

**Features**:
- **Singleton Pattern**: Private constructor, getInstance()
- **500ms Server Debounce**: Batches rapid mutations per course
- **3 Event Types**:
  - `course:updated`: Metadata or lessons changed
  - `course:catalog-changed`: Catalog visibility changes (publish, unpublish, delete)
  - `course:enrollment-changed`: Enrollment count changed
- **Room Strategy**: Emits to `course-{courseId}` + `courses-catalog` (chained .to() deduplicates)
- **Graceful Shutdown**: `destroy()` flushes pending debounced events
- **Dynamic Room Join**: `joinUserToCourseRoom()` uses fetchSockets() to join all user's sockets

**Usage Pattern** (ALL route handlers follow this):
```typescript
import { CourseEventService } from '../services/CourseEventService';

router.put('/courses/:id', async (req, res) => {
  // 1. Perform DB operation
  await db.execute('UPDATE Courses SET Title = @title WHERE Id = @id');
  
  // 2. Send HTTP response FIRST
  res.json({ success: true, message: 'Course updated' });
  
  // 3. Emit socket event AFTER response (isolated try-catch)
  try {
    const courseEventService = CourseEventService.getInstance();
    courseEventService.emitCourseUpdated(courseId, ['title']);
  } catch (emitError) {
    console.error('[Instructor] Failed to emit course update:', emitError);
  }
});
```

**Why This Pattern?**
- Emit AFTER res.json() prevents "Cannot set headers after they are sent" crashes
- Isolated try-catch prevents emit failures from crashing routes
- Isolated try-catch prevents Stripe webhook retries on socket failures

**Emit Sites (18 total across 7 files):**
- instructor.ts: 3 sites (course update, publish, enrollment approval)
- lessons.ts: 4 sites (create, update, delete, reorder)
- enrollment.ts: 4 sites (free course activation, re-enrollment, reactivation, new enrollment)
- students.ts: 1 site (enrollment status change)
- payments.ts: 1 site (payment confirmation)
- StripeService.ts: 3 sites (webhook handlers)
- CourseManagementService.ts: 2 sites (archive loop, delete loop)

**Dependencies**:
- Socket.IO instance set via `CourseEventService.setSocketIO(io)` in index.ts
- Logger for structured logging

---

## 📜 Terms of Service, Privacy Policy & Refund Policy (Added February 14, 2026)

### TermsConsentBanner
**Path**: `client/src/components/Legal/TermsConsentBanner.tsx` (250 lines)  
**Purpose**: Full-screen overlay that blocks app usage until user accepts latest TOS + Privacy Policy

**Features**:
- Checks acceptance status via `GET /api/terms/status` on mount
- Shows overlay with links to TOS and Privacy Policy pages
- Accept button calls `POST /api/terms/accept` with version IDs
- Skips display on legal pages (`/terms`, `/privacy`, `/refund-policy`) and public routes (`/login`, `/register`, `/landing`)
- Only shown to authenticated users who haven't accepted latest versions
- Refreshes terms data from `GET /api/terms/current` for version IDs

**State Management**:
```typescript
const [needsAcceptance, setNeedsAcceptance] = useState(false);
const [termsData, setTermsData] = useState<CurrentTermsResponse | null>(null);
const [loading, setLoading] = useState(true);
const [accepting, setAccepting] = useState(false);
```

**Dependencies**:
- `termsApi.getTermsStatus()` — Check acceptance status
- `termsApi.getCurrentTerms()` — Get current document versions
- `termsApi.acceptTerms()` — Record acceptance
- `useAuthStore` — Check authentication state
- `useLocation` — Detect current route for legal page bypass

**Status**: ✅ Production-ready

---

### TermsOfServicePage
**Path**: `client/src/pages/Legal/TermsOfServicePage.tsx` (178 lines)  
**Route**: `/terms`  
**Purpose**: Public page displaying current Terms of Service from database

**Features**:
- Fetches TOS via `getCurrentTerms()` API
- Renders HTML content with `dangerouslySetInnerHTML`
- Version and effective date display
- Cross-links to Privacy Policy and Refund Policy in footer
- Loading spinner and error states
- Gavel icon header with purple gradient

**Dependencies**: `termsApi.getCurrentTerms()`

**Status**: ✅ Production-ready

---

### PrivacyPolicyPage
**Path**: `client/src/pages/Legal/PrivacyPolicyPage.tsx` (178 lines)  
**Route**: `/privacy`  
**Purpose**: Public page displaying current Privacy Policy from database

**Features**:
- Same pattern as TermsOfServicePage
- Shield icon header
- Cross-links to TOS and Refund Policy

**Dependencies**: `termsApi.getCurrentTerms()`

**Status**: ✅ Production-ready

---

### RefundPolicyPage
**Path**: `client/src/pages/Legal/RefundPolicyPage.tsx` (~195 lines)  
**Route**: `/refund-policy`  
**Purpose**: Public page displaying current Refund Policy from database (informational, no acceptance required)

**Features**:
- Same database-driven pattern as TOS and Privacy pages
- AccountBalance icon header
- Cross-links to TOS and Privacy Policy
- **No acceptance required** — purely informational

**Dependencies**: `termsApi.getCurrentTerms()`

**Status**: ✅ Production-ready

---

### termsApi (Frontend Service)
**Path**: `client/src/services/termsApi.ts` (75 lines)  
**Endpoint Base**: `/api/terms`

**Methods**:
- `getCurrentTerms()` — GET /api/terms/current → `{ termsOfService, privacyPolicy, refundPolicy }`
- `getTermsStatus()` — GET /api/terms/status → `{ hasAccepted, termsAccepted, privacyAccepted }`
- `acceptTerms(termsVersionId, privacyVersionId)` — POST /api/terms/accept
- `getDocumentVersion(type, version)` — GET /api/terms/:documentType/:version

**Types**:
```typescript
type DocumentType = 'terms_of_service' | 'privacy_policy' | 'refund_policy';

interface TermsVersion {
  Id: string; DocumentType: DocumentType; Version: string;
  Content: string; EffectiveDate: string; IsActive: boolean;
}

interface CurrentTermsResponse {
  termsOfService: TermsVersion | null;
  privacyPolicy: TermsVersion | null;
  refundPolicy: TermsVersion | null;
}
```

**Used By**: TermsConsentBanner, TermsOfServicePage, PrivacyPolicyPage, RefundPolicyPage, RegisterForm

**Status**: ✅ Production-ready

---

### Terms Backend Routes
**Path**: `server/src/routes/terms.ts` (207 lines)  
**Endpoints**: 4 routes (2 public, 2 authenticated)

**Routes**:
1. `GET /api/terms/current` (public) — Get all active legal documents
2. `GET /api/terms/status` (authenticated) — Check user's acceptance status
3. `POST /api/terms/accept` (authenticated) — Record acceptance of TOS + Privacy Policy
4. `GET /api/terms/:documentType/:version` (public) — Get specific document version

**Middleware Integration**:
- `requireTermsAcceptance` in `server/src/middleware/auth.ts` checks acceptance
- Only requires acceptance of `terms_of_service` and `privacy_policy` (NOT `refund_policy`)
- Returns `needsTermsAcceptance: true` flag when terms outdated

**Database Tables**:
- `TermsVersions`: DocumentType CHECK ('terms_of_service','privacy_policy','refund_policy'), Version, Content (NVARCHAR MAX), EffectiveDate, IsActive
- `UserTermsAcceptance`: UserId FK, TermsVersionId FK, AcceptedAt, IpAddress, UserAgent
- Unique filtered index: `IX_TermsVersions_DocumentType_IsActive` ensures one active version per type

**Status**: ✅ Production-ready

---

---

## 🎓 Course Prerequisites & Settings Components (Added Feb 7, 2026, Updated Feb 12, 2026)

### CourseSettingsEditor
**Path**: `client/src/components/Instructor/CourseSettingsEditor.tsx` (568 lines)  
**Purpose**: Instructor UI for managing course prerequisites, learning outcomes, enrollment controls, certificate settings, and visibility/preview features

**Features**:
1. **Prerequisites Management**
   - Multi-select Autocomplete for choosing prerequisite courses
   - Filters current course from selection (prevents self-reference)
   - Loads published courses only
   - Visual Chip components with delete functionality
   - React key prop best practices (extracted from spread)
   - "Clear All" button (always visible, disabled when empty)

2. **Learning Outcomes Management**
   - Dynamic list with add/remove buttons
   - 200 character limit per outcome (inline validation)
   - Empty outcome prevention
   - Automatic cleanup of empty entries
   - "Clear All" button (always visible, disabled when empty)
   - Compact "Add" button (size="small", 80px width)

3. **Enrollment Controls (Phase 2)**
   - Maximum Enrollment with clear "x" button
   - Enrollment Open Date (datetime-local) with clear "x" button
   - Enrollment Close Date (datetime-local) with clear "x" button
   - Requires Approval toggle switch
   - Visual summary alert showing active controls
   - All clear buttons use InputAdornment with IconButton

4. **Certificate Settings (Phase 3 - Added Feb 11, 2026)**
   - Toggle switch to enable/disable certificate issuance
   - Optional custom certificate title field (200 char limit with counter)
   - Visual template selector with 4 card options:
     - **Classic**: Navy blue (#1a237e) with serif font
     - **Modern**: Teal (#00838f) with sans-serif
     - **Elegant**: Purple (#4a148c) with script font
     - **Minimal**: Gray (#37474f) minimalist design
   - Selected card has 3px primary border, unselected have 1px gray
   - Each card displays template color, name, and description

5. **Advanced Visibility (Phase 4 - Added Feb 12, 2026)**
   - **Visibility Radio Buttons**:
     - Public: Visible in catalog and search results (default)
     - Unlisted: Hidden from catalog, accessible via direct link only
     - Icons: PublicIcon for public, LinkIcon for unlisted
     - Descriptions explain behavior to instructors
   - **Direct Link Display** (unlisted + published courses only):
     - Shows full course URL with copy button
     - Alert with info severity
     - Only displayed when visibility='unlisted' AND status='published'
   - **Preview Token Management**:
     - Generate preview token button (if no token exists)
     - Preview URL display with copy button (if token exists)
     - Regenerate token button with confirmation dialog
     - Warning: Regeneration invalidates old preview links
     - Preview URLs: `/courses/{id}/preview/{token}`
     - Used for sharing draft courses before publication

6. **Form Management**
   - Change detection (dirty state tracking) - includes visibility and previewToken fields
   - Save/Cancel buttons with confirmation
   - Toast notifications (success/error)
   - Loading states during save

**Component Structure**:
```tsx
<Box>
  {/* Prerequisites Section */}
  <Autocomplete
    multiple
    options={availableCourses}
    renderInput={...}
    renderTags={...}
  />
  <Button onClick={() => setPrerequisites([])} disabled={empty}>Clear All</Button>
  
  {/* Learning Outcomes Section */}
  <TextField value={newOutcome} />
  <Button onClick={handleAddOutcome} size="small">Add</Button>
  <Button onClick={() => setLearningOutcomes([])} disabled={empty}>Clear All</Button>
  <List>...</List>
  
  {/* Enrollment Controls Section */}
  <TextField label="Maximum Enrollment" type="number" 
    InputProps={{ endAdornment: <IconButton onClick={clear}><ClearIcon /></IconButton> }} />
  <TextField label="Enrollment Open Date" type="datetime-local"
    InputProps={{ endAdornment: <IconButton onClick={clear}><ClearIcon /></IconButton> }} />
  <TextField label="Enrollment Close Date" type="datetime-local"
    InputProps={{ endAdornment: <IconButton onClick={clear}><ClearIcon /></IconButton> }} />
  <Switch checked={requiresApproval} />
  <Alert>Active controls summary</Alert>
  
  <Button onClick={handleSave}>Save</Button>
  <Button onClick={handleCancel}>Cancel</Button>
</Box>
```
    value={prerequisites}
    onChange={handlePrerequisitesChange}
    renderTags={(value, getTagProps) => {
      // Extracts key prop to avoid React warning
      const { key, ...tagProps } = getTagProps({ index });
      return <Chip key={key} {...tagProps} />;
    }}
  />
  
  {/* Learning Outcomes Section */}
  {learningOutcomes.map((outcome, index) => (
    <TextField
      value={outcome}
      onChange={(e) => handleOutcomeChange(index, e.target.value)}
      helperText={`${outcome.length}/200`}
      inputProps={{ maxLength: 200 }}
    />
  ))}
  
  {/* Action Buttons */}
  <Button onClick={handleSave}>Save Changes</Button>
  <Button onClick={handleCancel}>Cancel</Button>
</Box>
```

**Props**:
- `courseId: string` - Current course ID for loading data

**Dependencies**:
- Material-UI: Autocomplete, TextField, Chip, Button, Box, Typography
- Services: `instructorApi.getInstructorCourses()`, `instructorApi.updateCourse()`
- React: useState, useEffect

**API Calls**:
- GET `/api/instructor/courses?status=published` - Load available prerequisites
- PUT `/api/instructor/courses/:id` - Save prerequisites, learning outcomes, enrollment controls, certificate settings, and visibility
- POST `/api/instructor/courses/:id/preview-token` - Generate new preview token (UUID)

**State Management**:
```typescript
const [prerequisites, setPrerequisites] = useState<InstructorCourse[]>([]);
const [learningOutcomes, setLearningOutcomes] = useState<string[]>(['']);
const [availableCourses, setAvailableCourses] = useState<InstructorCourse[]>([]);
const [certificateEnabled, setCertificateEnabled] = useState<boolean>(true);
const [certificateTitle, setCertificateTitle] = useState<string>('');
const [certificateTemplate, setCertificateTemplate] = useState<string>('classic');
const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
const [previewToken, setPreviewToken] = useState<string | null>(null);
const [hasChanges, setHasChanges] = useState(false);
const [saving, setSaving] = useState(false);
const [generatingToken, setGeneratingToken] = useState(false);
```

**Validation Rules**:
- Prerequisites: Must be array of valid course objects
- Learning Outcomes: Max 200 chars each, no empty strings
- Cannot select current course as prerequisite
- Only published courses available as prerequisites
- Certificate Title: Max 200 characters, optional (nullable)
- Certificate Template: Must be one of: classic, modern, elegant, minimal
- Visibility: Must be 'public' or 'unlisted'
- Preview Token: UUID format (generated server-side)

**Used By**:
- `CourseEditPage.tsx` (Settings tab - index 3)

**Status**: ✅ Production-ready

---

### CourseDetailPage - Prerequisites Display
**Path**: `client/src/pages/Course/CourseDetailPage.tsx` (updated lines 255-850)  
**Purpose**: Student view of course prerequisites with completion tracking

**Prerequisites Section Features**:
1. **Three UI States**
   - **Not Logged In**: Info alert with login link
   - **Prerequisites Incomplete**: Warning alert with missing course list
   - **Prerequisites Complete**: Success alert with completed course list

2. **Completion Indicators**
   - ✅ Green checkmark: Course completed
   - ⏳ Clock icon: Course in progress (with percentage)
   - ❌ Red X: Not enrolled

3. **Enrollment Control**
   - Disables enrollment button when prerequisites not met
   - Shows clear warning message
   - Links to prerequisite courses

**Component Structure**:
```tsx
{prerequisites.length > 0 && (
  <Paper>
    <Typography variant="h6">Prerequisites</Typography>
    {!isAuthenticated ? (
      <Alert severity="info">
        Please log in to see your prerequisite status
      </Alert>
    ) : canEnroll ? (
      <Alert severity="success">
        ✅ All prerequisites completed
      </Alert>
    ) : (
      <Alert severity="warning">
        Complete these courses before enrolling:
        <List>
          {prerequisites.map(prereq => (
            <ListItem>
              {prereq.isCompleted ? '✅' : prereq.progress > 0 ? '⏳' : '❌'}
              {prereq.title} {prereq.progress > 0 && `(${prereq.progress}%)`}
            </ListItem>
          ))}
        </List>
      </Alert>
    )}
  </Paper>
)}
```

**API Integration**:
- GET `/api/courses/:id/check-prerequisites` - Loads prerequisite status
- Returns: `{ canEnroll: boolean, prerequisites: [...], missingPrerequisites: [...] }`

**Status**: ✅ Production-ready

---

## 📘 TypeScript Type System (Updated Feb 7, 2026)

### Central Type Definitions
**Path**: `server/src/types/database.ts` (327 lines)  
**Purpose**: Centralized TypeScript interfaces for all services

**Type Categories**:

1. **User & Authentication Types** (Lines 1-50)
   - `UserInfo` - Core user profile data
   - `FilteredUser` - Privacy-aware user data (Email?: string | null, CreatedAt?: Date)
   - `JwtPayload` - JWT token structure
   - `PendingExportRequest` - Data export requests

2. **Study Group Types** (Lines 51-120)
   - `StudyGroupWithMembership` - Group data with user membership status
   - `StudyGroupMembershipInfo` - User role in groups

3. **Live Sessions & Office Hours** (Lines 121-180)
   - `LiveSession` - Live session metadata
   - `LiveSessionMaterial` - Session attachments and resources
   - `OfficeHoursSchedule` - Instructor availability
   - `OfficeHoursQueueEntry` - Student queue management

4. **Socket.IO Event Types** (Lines 181-220)
   - `ChatJoinData` - Chat room join events
   - `LiveSessionJoinData` - Session join events
   - `SessionMessageData` - Real-time messages
   - `PresenceUpdateData` - User presence status
   - `ActivityUpdateData` - Activity tracking
   - `StudyGroupData` - Study group events
   - `OfficeHoursData` - Office hours notifications
   - `CommentSubscribeData` - Comment subscription events

5. **Transaction & Payment Types** (Lines 240-270)
   - `Transaction` - Payment records
   - Invoice and billing types

6. **Notification & Intervention Types** (Lines 290-327)
   - `NotificationRecord` - Notification data structure
   - `InterventionCheckDetails` - At-risk student detection results
     - Fields: atRiskStudents, lowProgress, assessmentDeadlines, achievements

**Type Safety Coverage**: 85% (remaining 'any' types are intentional for SQL row mappings)

**Recent Fixes (Feb 7, 2026)**:
- Fixed FilteredUser duplicate definition conflict
- Added Email?: string | null (was Email?: string)
- Added CreatedAt?: Date property
- Fixed InterventionCheckDetails field names

**Usage Pattern**:
```typescript
import { UserInfo, FilteredUser, Transaction } from '../types/database';

function processUser(user: UserInfo): FilteredUser {
  // TypeScript IntelliSense and compile-time checking
}
```

**Dependencies**: None (pure type definitions)
**Status**: ✅ Production-ready, 0 TypeScript errors

---

## 📦 Data Export System Components (Added Feb 6, 2026)

### DataExportService
**Path**: `server/src/services/DataExportService.ts` (812 lines)  
**Purpose**: Core data export service - collects user data and generates ZIP files

**Public Methods**:
1. `createExportRequest(userId)` - Create new export request with rate limiting (3 per 24h)
2. `getExportRequest(requestId, userId)` - Get export by ID with ownership verification
3. `getLatestExportRequest(userId)` - Get user's most recent export request
4. `incrementDownloadCount(requestId)` - Track download metrics
5. `generateExport(userId, requestId)` - Main export generation logic
6. `cleanupExpiredExports()` - Delete expired exports (7 days old)

**Private Methods**:
- `checkDiskSpace()` - Verify 1GB minimum free space (Windows PowerShell)
- `collectUserData(userId)` - Execute 22 database queries across 20+ tables
- `createZipExport(data, outputPath)` - Generate ZIP with archiver library
- `convertToCSV(data)` - Convert JSON arrays to CSV format
- `generateReadme(profile)` - Create README.txt with GDPR info

**Data Collection (20+ Tables)**:
- Profile: Users, UserSettings, NotificationPreferences
- Learning: Enrollments, CourseProgress, UserProgress, VideoProgress, AssessmentSubmissions, Certificates, LearningActivities
- Community: Comments, CommentLikes, ChatRooms, ChatMessages, StudyGroups
- AI: TutoringSessions, TutoringMessages
- Transactions: Transactions, Invoices
- Activity: Bookmarks, Notifications, LiveSessionAttendees

**Resource Limits**:
- Max export size: 500MB
- Min disk space: 1GB
- Expiry: 7 days
- Rate limit: 3 requests per 24 hours

**Dependencies**:
- DatabaseService.getInstance() - Database connection pool
- archiver - ZIP file creation
- fs, path - File system operations
- child_process - PowerShell disk space check

**Error Handling**:
- Disk space validation before starting
- Size validation after compression
- Partial file cleanup on failure
- Database status tracking (pending/processing/completed/failed/expired)

**Status**: ✅ Production-ready

---

### ExportJobProcessor
**Path**: `server/src/services/ExportJobProcessor.ts` (313 lines)  
**Purpose**: Background job processor for async export generation

**Architecture**: Singleton pattern (prevents concurrent processing)

**Public Methods**:
1. `getInstance()` - Get singleton instance
2. `processPendingExports()` - Main cron job handler (every minute)

**Processing Flow**:
1. Check `isProcessing` flag (concurrency control)
2. Query pending requests from database
3. For each request:
   - Generate export via DataExportService
   - Get user info (email, name)
   - Send HTML email notification with download link
4. Update status to completed/failed

**Email Template**:
- Beautiful HTML with gradient header
- File metadata (name, size, expiry)
- Download button linking to settings page
- 7-day expiry warning
- GDPR compliance information

**Cron Integration**:
- Registered in NotificationScheduler.ts
- Schedule: `* * * * *` (every minute)
- Cleanup: Daily at 3 AM UTC

**Dependencies**:
- DataExportService - Export generation
- EmailService - Email delivery (default export)
- DatabaseService - Database operations

**Concurrency Control**:
- Singleton instance persists across cron runs
- `isProcessing` flag prevents overlapping jobs
- Safe for high-frequency cron execution

**Status**: ✅ Production-ready

---

### Data Export UI (SettingsPage)
**Path**: `client/src/pages/Settings/SettingsPage.tsx`  
**Purpose**: User interface for data export feature

**Export State Management**:
```typescript
const [exportStatus, setExportStatus] = useState<any>(null);
const [exportLoading, setExportLoading] = useState(false);
```

**Status Polling**:
- Auto-polls every 10 seconds when pending/processing
- Uses React useCallback for stable reference
- Integrates Page Visibility API (pauses when tab hidden)
- Proper cleanup on unmount

**UI States (5 variants)**:
1. **No Request**: Shows "Request Data Export" button
2. **Pending**: Shows spinner + "Your export is being queued"
3. **Processing**: Shows spinner + "Generating your data export"
4. **Completed**: Shows download button + file metadata (name, size, downloads, expiry)
5. **Failed**: Shows error message + "Try Again" button
6. **Expired**: Shows "expired" status + request new button

**Actions**:
- `handleExportData()` - Request new export
- `handleDownloadExport()` - Download ZIP file
- `loadExportStatus()` - Check current status

**Error Handling**:
- Rate limit (429): "Maximum 3 export requests per 24 hours"
- Expired (410): "Export has expired. Please request a new export"
- Generic errors: "Failed to request data export"

**Dependencies**:
- settingsApi.requestDataExport()
- settingsApi.getExportStatus()
- settingsApi.downloadExport(requestId)

**Status**: ✅ Production-ready

---

### settingsApi - Data Export Methods
**Path**: `client/src/services/settingsApi.ts`

**New Exports**:
1. `requestDataExport()` - POST /api/settings/export-data
2. `getExportStatus()` - GET /api/settings/export-data/status
3. `downloadExport(requestId)` - GET /api/settings/export-data/download/:requestId

**Download Handling**:
- Uses responseType: 'blob'
- Extracts filename from Content-Disposition header
- Creates temporary download link
- Auto-clicks and cleans up
- Default filename: 'mishin-learn-export.zip'

---

### DataExportRequests Database Table
**Path**: `database/schema.sql` (lines 1110-1131)

**Schema**:
```sql
CREATE TABLE dbo.DataExportRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
    Status NVARCHAR(20) CHECK (Status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    RequestedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    ExpiresAt DATETIME2 NULL,
    FilePath NVARCHAR(500) NULL,
    FileName NVARCHAR(255) NULL,
    FileSize BIGINT NULL,
    DownloadCount INT NOT NULL DEFAULT 0,
    LastDownloadedAt DATETIME2 NULL,
    ErrorMessage NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

**Indexes (3)**:
1. `IX_DataExportRequests_UserId` - User's export history
2. `IX_DataExportRequests_Status` - Pending/processing lookup (filtered)
3. `IX_DataExportRequests_ExpiresAt` - Cleanup job (filtered)

**Lifecycle**:
- Created: Status='pending', RequestedAt=now
- Processing: Status='processing'
- Completed: Status='completed', ExpiresAt=now+7days, FilePath/FileName/FileSize set
- Failed: Status='failed', ErrorMessage set
- Expired: Status='expired' (cleanup job updates)

---

## 💬 Chat System Components (Added Feb 5, 2026)

### Chat (Main Page)
**Path**: `client/src/pages/Chat/Chat.tsx`  
**Purpose**: Real-time messaging interface with conversation management

**Features**:
- Direct messaging between users
- Conversation list with unread badges
- Real-time message delivery via Socket.IO
- Conversation soft-delete with automatic restoration
- User search for starting new conversations
- Typing indicators and read receipts
- URL parameter support (?roomId=X)
- Auto-updating timestamps (60-second interval)

**State**:
- `rooms` - List of conversations with unread counts
- `selectedRoom` - Currently active conversation
- `messages` - Messages for selected room
- `typingUsers` - Set of user IDs currently typing

**Socket.IO Events**:
- Listens: `chat:message`, `chat:user-typing`, `chat:read`, `chat:error`, `chat:conversation-restored`
- Emits: `chat:join-room`, `chat:leave-room`, `chat:typing-start`, `chat:typing-stop`

**API Calls**:
- `chatApi.getRooms()` - Fetch conversations
- `chatApi.getMessages(roomId)` - Fetch messages with pagination
- `chatApi.sendMessage(roomId, data)` - Send message
- `chatApi.markAsRead(roomId)` - Mark messages read
- `chatApi.deleteRoom(roomId)` - Delete conversation (soft)

**Dependencies**:
- `socketService` - Socket.IO client wrapper
- `chatApi` - REST API client
- `useAuthStore` - Current user context
- Material-UI components

**Key Behaviors**:
- Merges restored conversations with API data (race condition protection)
- Auto-selects first room if none selected
- Preserves room selection across reloads
- Cleans up Socket.IO listeners on unmount
- Clears typing timeout on unmount (memory leak prevention)

**Status**: ✅ Production-ready

---

### UserSearchDialog
**Path**: `client/src/components/Chat/UserSearchDialog.tsx`  
**Purpose**: Search and select users to start new conversations

**Props**:
- `open: boolean` - Dialog visibility
- `onClose: () => void` - Close handler
- `onSelectUser: (userId: string) => void` - User selection callback

**Features**:
- Debounced search (300ms delay)
- Minimum 2 characters to trigger search
- Displays user FirstName, LastName, Email
- Avatar with initials
- Loading spinner during search
- Empty state and error handling
- Auto-clears on close

**API**:
- `GET /api/users/search?q={query}&limit=20`
- Handles both `response.data.users` and `response.data` formats

**Dependencies**:
- axios with auth interceptor
- `useAuthStore` for token
- Material-UI Dialog components

**Status**: ✅ Production-ready

---

### chatApi Service
**Path**: `client/src/services/chatApi.ts`  
**Purpose**: REST API client for chat operations

**Methods**:
1. `getRooms()` - Fetch user's active conversations
2. `getMessages(roomId, options?)` - Fetch messages with pagination
3. `sendMessage(roomId, data)` - Send message to room
4. `createDirectRoom(recipientId)` - Create/reactivate DM room
5. `markAsRead(roomId)` - Mark all messages read
6. `deleteRoom(roomId)` - Delete conversation (soft)

**Types**:
- `ChatRoom` - Conversation metadata with unread count
- `ChatMessage` - Message with user info
- `SendMessageRequest` - Message creation payload

**Status**: ✅ Production-ready

---

### ChatService (Backend)
**Path**: `server/src/services/ChatService.ts`  
**Purpose**: Complete chat business logic with conversation lifecycle management

**Key Methods**:
- `getUserRooms(userId)` - Get active conversations (filters IsActive=1)
- `getRoomMessages(roomId, userId, options)` - Paginated messages
- `sendMessage(roomId, userId, content, type, replyTo)` - Send + auto-reactivate
- `createDirectMessageRoom(user1Id, user2Id)` - Create/reactivate DM
- `markMessagesAsRead(roomId, userId)` - Update LastReadAt
- `leaveRoom(roomId, userId)` - Soft delete (IsActive=0)

**Reactivation Logic** (Bug #23-26 fixes):
1. Track inactive participants BEFORE reactivation
2. Reactivate all inactive participants (SET IsActive=1)
3. Check privacy settings AFTER reactivation
4. Send message and emit Socket.IO events
5. Notify previously inactive users (excluding sender) with `chat:conversation-restored`

**Dependencies**:
- DatabaseService - SQL queries
- SettingsService - Privacy enforcement
- NotificationService - Offline notifications
- Socket.IO - Real-time events

**Status**: ✅ Production-ready

---

## 💬 Comments System Components (Added Jan 25, Updated Jan 29, 2026)

### CommentsSection
**Path**: `client/src/components/Shared/CommentsSection.tsx`  
**Purpose**: Container component for displaying and managing comments on any entity

**Props**:
- `entityType: string` - Type of entity ('lesson', 'course', 'assignment', etc.)
- `entityId: string` - ID of the entity
- `allowComments: boolean` - Whether comments are enabled for this entity
- `title?: string` - Optional section title (default: "Discussion")

**Features**:
- Uses useComments hook for state management
- Loading spinner while fetching
- Error message display
- Empty state: "No comments yet. Be the first to comment!"
- Disabled state: "Comments are disabled for this item."
- Refresh button in header
- **No count badge** (removed Jan 29, 2026 for simplicity)
- New comment input at top
- Flat list of comments with nested replies
- React StrictMode compatible

**Dependencies**:
- `useComments` hook - State + Socket.IO integration (handlersRef pattern)
- `CommentInput` - New comment form
- `CommentItem` - Individual comment display
- Material-UI components

**Bug Fixes (Jan 29, 2026)**:
- Fixed React StrictMode double-subscription via handlersRef
- Removed totalCount display to eliminate synchronization issues
- Atomic state updates prevent race conditions

**Status**: ✅ Production-ready

---

### CommentItem
**Path**: `client/src/components/Shared/CommentItem.tsx`  
**Purpose**: Display single comment with actions (edit, delete, like, reply)

**Props**:
- `comment: Comment` - Comment data with user info
- `onEdit: (commentId, content) => void` - Edit handler
- `onDelete: (commentId) => void` - Delete handler
- `onLike: (commentId) => void` - Like handler
- `onReply: (parentId, content) => void` - Reply handler
- `currentUserId: string` - Current user ID for permissions
- `depth?: number` - Threading depth (default 0, max 1)

**Features**:
- User avatar with firstName + lastName
- Instructor badge (graduation cap icon)
- Edit button (5-min window, owner only)
- Delete button (owner or moderator)
- Like button with count (heart icon)
- Reply button (shows input below)
- Relative timestamp (e.g., "2 hours ago")
- Edit mode: Shows CommentInput pre-filled
- Reply mode: Shows CommentInput indented
- Recursive rendering for one level of replies
- "Edited" indicator if IsEdited=true
- Test IDs on all interactive elements

**Dependencies**:
- `CommentInput` - Edit/reply form
- `useAuthStore` - Current user role
- `date-fns` - formatDistanceToNow
- Material-UI components

**Status**: ✅ Production-ready

---

### CommentInput
**Path**: `client/src/components/Shared/CommentInput.tsx`  
**Purpose**: Reusable text input for creating/editing comments

**Props**:
- `value: string` - Controlled input value
- `onChange: (value: string) => void` - Change handler
- `onSubmit: () => void` - Submit handler
- `onCancel?: () => void` - Cancel handler (optional)
- `placeholder?: string` - Input placeholder
- `disabled?: boolean` - Disabled state
- `maxLength?: number` - Character limit (default 5000)

**Features**:
- Multiline TextField (4 rows)
- Character counter: "{current} / {max}"
- Keyboard shortcut: Ctrl/Cmd+Enter to submit
- Cancel button (if onCancel provided)
- Submit button (disabled when empty/over limit)
- Loading state during submission
- Character limit visual warning (red counter)

**Dependencies**:
- Material-UI components (TextField, Stack, Button, Typography)

**Status**: ✅ Production-ready

---

### useComments Hook
**Path**: `client/src/hooks/useComments.ts`  
**Purpose**: React hook for comments state management and real-time updates

**Parameters**:
- `entityType: string` - Type of entity
- `entityId: string` - ID of entity
- `initialPage?: number` - Starting page (default 1)
- `initialLimit?: number` - Page size (default 20)

**Returns**:
- `comments: Comment[]` - Array of comments (top-level + nested replies)
- `loading: boolean` - Loading state
- `error: string | null` - Error message
- `hasMore: boolean` - More pages available
- `totalCount: number` - Total comment count
- `createComment: (content, parentId?) => Promise<void>` - Create comment/reply
- `updateComment: (commentId, content) => Promise<void>` - Edit comment
- `deleteComment: (commentId) => Promise<void>` - Delete comment
- `toggleLike: (commentId) => Promise<void>` - Like/unlike
- `loadMore: () => Promise<void>` - Load next page
- `refresh: () => Promise<void>` - Reload all comments

**Features**:
- Auto-fetches on mount
- Auto-subscribes to Socket.IO room on mount
- Auto-unsubscribes on unmount
- Real-time event handlers:
  - `comment:created` - Adds new comment to list
  - `comment:updated` - Updates existing comment
  - `comment:deleted` - Marks comment as deleted
  - `comment:liked` - Updates like count
- Optimistic updates (UI updates before server confirms)
- Pagination support
- Error handling with user-friendly messages
- Automatic cleanup of Socket.IO listeners

**Dependencies**:
- `commentApi` - API client
- `socketService` - Socket.IO connection
- `Comment` type - TypeScript interface

**Status**: ✅ Production-ready

---

### CommentService (Backend)
**Path**: `server/src/services/CommentService.ts`  
**Purpose**: Business logic for comments CRUD operations

**Key Methods**:
- `createComment(params)` - Create comment with validation
- `getComments(entityType, entityId, userId, options)` - Fetch with threading
- `updateComment(commentId, userId, content)` - Edit (5-min window)
- `deleteComment(commentId, userId, userRole)` - Soft delete
- `toggleLike(commentId, userId)` - Add/remove like
- `canAccessComments(userId, entityType, entityId)` - Enrollment check
- `areCommentsAllowed(entityType, entityId)` - Permission check
- `getModeratorId(entityType, entityId)` - Get instructor ID

**Features**:
- Enrollment-based access control
- Soft delete with IsDeleted flag
- Denormalized counters (LikesCount, RepliesCount)
- One-level reply threading
- 5-minute edit window enforcement
- Moderator override for delete
- Socket.IO event emission
- Notification trigger for replies
- Character limit validation (5000)
- Trim whitespace from content

**Dependencies**:
- `DatabaseService` - SQL Server queries
- `NotificationService` - Reply notifications
- `Socket.IO Server` - Real-time updates

**Status**: ✅ Production-ready

---

### Comment API Routes
**Path**: `server/src/routes/comments.ts`  
**Endpoints**: 5 RESTful routes with authentication

**Routes**:
1. `GET /api/comments/:entityType/:entityId` - Get all comments
   - Query params: page, limit, sort
   - Returns: { comments, totalCount, pagination }
2. `POST /api/comments` - Create comment
   - Body: { entityType, entityId, content, parentCommentId? }
   - Returns: Comment object
3. `PUT /api/comments/:commentId` - Update comment
   - Body: { content }
   - Returns: Updated Comment object
4. `DELETE /api/comments/:commentId` - Delete comment
   - Returns: { success: true }
5. `POST /api/comments/:commentId/like` - Toggle like
   - Returns: { liked: boolean, likesCount: number }

**Validation**:
- Entity type must be: lesson, course, assignment, study_group, announcement
- Content required and non-empty
- Content max 5000 characters
- Owner or moderator required for delete
- Owner only for edit (within 5 minutes)

**Status**: ✅ Production-ready

---

## ⏰ Notification Scheduler Services

### NotificationScheduler
**Path**: `server/src/services/NotificationScheduler.ts`  
**Purpose**: Manages cron jobs for scheduled notification triggers with centralized job registration

**Key Methods**:
- `initializeScheduler(io: Server)` - Initialize all cron jobs on server startup
- `sendAssessmentDueReminders()` - Daily cron job handler (9 AM UTC)
- `triggerAssessmentDueReminders()` - Manual trigger for testing (exported)
- `sendWeeklyProgressSummaries()` - Weekly cron job handler (Monday 8 AM UTC)
- `triggerWeeklyProgressSummaries()` - Manual trigger for testing (exported)
- `sendLiveSessionReminders()` - Every 15 minutes cron job handler
- `triggerLiveSessionReminders()` - Manual trigger for testing (exported)

**Cron Jobs Registered**:
- **Assessment Due Reminders**: `'0 9 * * *'` (Daily at 9:00 AM UTC)
  - Checks for assessments due in 2 days
  - Sends notifications to students without completed submissions
  - Non-blocking error handling per notification
  - Returns: `{ success: boolean, message: string, count: number }`
- **Weekly Progress Summary**: `'0 8 * * 1'` (Monday at 8:00 AM UTC)
  - Aggregates past 7 days activity for all students
  - Metrics: lessons completed, videos watched, assessments submitted, time spent, active courses
  - Sends notification only to students with activity
  - Multi-line message format with emojis (✅📚🎥📝⏱️)
  - Returns: `{ success: boolean, message: string, count: number }`
- **Live Session Starting Soon**: `'*/15 * * * *'` (Every 15 minutes)
  - Checks for sessions starting in 55-65 minutes (±5 buffer around 60)
  - Sends urgent notifications to all enrolled students
  - Duplicate prevention: LEFT JOIN checks past 2 hours
  - Only targets Status='scheduled' sessions
  - Message format: '"[Title]" starts in 1 hour ([Formatted Time])'
  - Returns: `{ success: boolean, count: number, sessions: number, message: string }`

**Features**:
- Double initialization protection (returns early if already initialized)
- Console logging for cron registration: "Assessment Due Reminders: Daily at 9:00 AM UTC"
- Error handling with success/failure counters
- Socket.io integration for real-time notifications

**Dependencies**:
- `node-cron` - Cron job scheduling
- `NotificationService` - Create and send notifications
- `NotificationHelpers` - SQL query helpers
- `date-fns` - Date formatting
- `Socket.io` - Real-time updates

**Status**: ✅ Production-ready (February 4, 2026)

---

### NotificationHelpers
**Path**: `server/src/services/NotificationHelpers.ts`  
**Purpose**: Reusable SQL query helpers for notification trigger logic

**Key Methods**:
- `getUpcomingAssessmentsDue(daysAhead: number)` - Find assessments due in N days
  - Complex JOIN query: Assessments → Lessons → Courses → Enrollments → Users
  - Filters: `DueDate IS NOT NULL`, `DATEDIFF(day, GETUTCDATE(), a.DueDate) = @daysAhead`
  - Excludes students with completed submissions (LEFT JOIN AssessmentSubmissions)
- `getUpcomingLiveSessions(minutesAhead: number)` - Find live sessions starting in N minutes (Feb 4, 2026)
  - Complex JOIN query: LiveSessions → Courses → Enrollments → Users
  - Time window: `BETWEEN DATEADD(MINUTE, @minutesAhead - 5, ...) AND DATEADD(MINUTE, @minutesAhead + 5, ...)`
  - Duplicate prevention: LEFT JOIN Notifications excludes recent notifications (past 2 hours)
  - Filters: `Status = 'scheduled'`, `Status IN ('active', 'completed')` enrollments
  - Returns: `LiveSessionStartingSoonInfo[]` with session + student details
  - Returns: AssessmentId, Title, DueDate, Type, LessonId, CourseId, CourseTitle, UserId, StudentName, Email
- `getWeeklyActivitySummaries()` - Aggregate 7-day activity for all users
  - Complex multi-subquery: UserProgress (lessons), VideoProgress (videos), AssessmentSubmissions
  - Calculates: LessonsCompleted, VideosWatched, AssessmentsSubmitted, TotalTimeSpent, ActiveCourses
  - Filters: Only users with activity in past 7 days (HAVING clause)
  - Bug Fix (line 217): `vp.IsCompleted = 1` (was IsComplete)
  - Returns: UserId, UserName, Email, plus 5 activity metrics
- `getInstructorId(courseId: string)` - Get course instructor
- `getUserName(userId: string)` - Get user display name
- `getCourseProgress(userId: string, courseId: string)` - Get student progress
- `getEnrolledStudents(courseId: string)` - Get all enrolled students
- And 3 more helper functions...

**Features**:
- SQL injection protection (parameterized queries)
- Proper error handling with try-catch
- TypeScript interfaces for return types
- Reusable across multiple notification triggers

**Dependencies**:
- `mssql` - SQL Server database access
- `db` - Database connection pool

**Status**: ✅ Production-ready with 9 helper functions (January 21, 2026)

---

## 👥 Study Group Notification Features

### User Search Endpoint
**Path**: `server/src/routes/users.ts`  
**Endpoint**: `GET /api/users/search`  
**Status**: ✅ Production-ready (January 21, 2026)

**Purpose**: Search for users by name, username, or email to invite to study groups

**Query Parameters**:
- `q` (required): Search query, min 2 characters
- `limit` (optional): Max results, default 10

**Features**:
- Excludes current user from results (prevents self-invite)
- Filters active users only (`IsActive = 1`)
- SQL injection protected (parameterized queries)
- LIKE search on: FirstName, LastName, Username, Email
- Returns: Id, FirstName, LastName, Username, Email

**Security**:
- Authentication required
- Cannot see inactive users
- Cannot see self in results

---

### Study Group Invitation
**Path**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/invite`  
**Status**: ✅ Production-ready (January 21, 2026)

**Purpose**: Sends invitation notification to a user to join a study group

**Request Body**:
```typescript
{
  userId: string  // ID of user to invite
}
```

**Validation**:
- Requester must be a member of the group
- Target user must exist and be active
- Target user must not already be a member
- Group must exist and be active

**Notification Details**:
- **Type**: `course`
- **Category**: `community`
- **Subcategory**: `GroupInvites`
- **Priority**: `normal`
- **Title**: "Study Group Invitation"
- **Message**: "{inviterName} invited you to join \"{groupName}\""
- **Action URL**: `/study-groups`
- **Action Text**: "View Group"

**Implementation Features**:
- Fetches inviter's display name (FirstName LastName or Username)
- Non-blocking error handling (doesn't fail request if notification fails)
- Uses `NotificationService.createNotificationWithControls()` for preference checking
- Real-time Socket.IO updates via NotificationService

**Response**:
```typescript
{
  message: "Invitation sent successfully",
  invitedUser: {
    id: string,
    name: string
  }
}
```

---

### InviteUserModal
**Path**: `client/src/components/StudyGroups/InviteUserModal.tsx`  
**Status**: ✅ Production-ready (January 21, 2026)

**Purpose**: Modal component for inviting users to study groups with debounced search

**Implementation Details**:
- 500ms debounced search with minimum 2 characters
- Excludes current user from search results (backend filtering)
- Filters active users only (IsActive = 1)
- Individual invite buttons per user
- Loading states with circular progress indicators
- Toast notifications for success/error feedback
- Cleans state on modal close via handleClose()

**State Management**:
```typescript
interface State {
  searchQuery: string;           // Current search input
  users: SearchedUser[];         // Search results array
  loading: boolean;              // API loading state
  error: string | null;          // Error message
  inviting: Record<string, boolean>; // Per-user invite states
  selectedUser: string | null;   // Currently selected user ID
}
```

**API Integration**:
- Endpoint: `GET /api/users/search?query={searchQuery}`
- Returns: Array of { Id, FirstName, LastName, Username, Email }
- Invite Endpoint: `POST /api/study-groups/:groupId/invite` with { userId }

**UI Components**:
- **Dialog**: MUI Dialog with 600px max width
- **Search Field**: TextField with debounced onChange, search icon, loading indicator
- **User List**: Scrollable list with avatars, names, usernames
- **Invite Button**: Per-user button with loading state during invite
- **Empty States**: "Type at least 2 characters" or "No users found"

**Test IDs**:
- `invite-user-modal` - Main dialog container
- `invite-user-search-input` - Search text field
- `invite-button-{userId}` - Individual invite buttons

**Security Features**:
- Backend prevents self-invite (server-side validation)
- Backend excludes inactive users from search
- Authentication required via authenticateToken middleware

**Edge Cases Handled**:
- Empty search query (min 2 chars enforced)
- No results found (helpful message)
- API errors (toast notification + error state)
- Duplicate invites prevented (button disabled during invite)
- Modal state cleanup on close

---

### Study Group Member Joined Notifications
**Path**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/join`  
**Status**: ✅ Production-ready (January 21, 2026)

**Purpose**: Notifies all existing group members when a new member joins

**Implementation Details**:
- After successful join, queries all existing members (excluding new joiner)
- Creates notification for each existing member
- Fetches new member's display name for personalized messages
- Non-blocking error handling (doesn't fail join if notifications fail)
- Logs success count: "✅ Sent N member-joined notifications for group X"

**Notification Details**:
- **Type**: `course`
- **Category**: `community`
- **Subcategory**: `GroupActivity`
- **Priority**: `normal`
- **Title**: "New Study Group Member"
- **Message**: "{newMemberName} joined \"{groupName}\""
- **Action URL**: `/study-groups`
- **Action Text**: "View Group"

**Socket.IO Events**:
- Emits: `study-group-member-joined` to all connected clients
- Payload: `{ groupId, userId, userName }`
- Real-time notification bell updates via NotificationService

**Database Queries**:
```sql
-- Get group details
SELECT Id, Name FROM StudyGroups WHERE Id = @groupId

-- Get new member name
SELECT FirstName, LastName, Username FROM Users WHERE Id = @userId

-- Get all existing members (excluding new joiner)
SELECT UserId FROM StudyGroupMembers 
WHERE GroupId = @groupId AND UserId != @newUserId
```

**Features**:
- Respects user notification preferences (hybrid control system)
- Supports email delivery (realtime/daily/weekly digest)
- Quiet hours aware (via NotificationService)
- Privacy-aware (uses display name from user profile)

---

### StudyGroupDetailPage
**Path**: `client/src/pages/StudyGroups/StudyGroupDetailPage.tsx`  
**Route**: `/study-groups/:groupId`  
**Status**: ✅ Production-ready (February 2, 2026)

**Purpose**: Full study group details with member management interface

**Features**:
- Group information display (name, description, course link)
- Member count and admin status indicators
- GroupMembersList component integration
- Real-time socket updates (6 event types)
- User-specific redirects (removed/leaving/deleted)
- Breadcrumb navigation (Home → Study Groups → Group Name)
- Admin permission checks
- Automatic data refresh on member changes

**Socket Events Handled**:
- `member-joined` - Refreshes member list if same group
- `member-left` - Redirects if self, else refreshes
- `member-promoted` - Refreshes to update admin status
- `member-removed` - Redirects if self, else refreshes
- `group-deleted` - Redirects to list page with message

**Dependencies**:
- `useStudyGroupSocket` - Real-time event handling with callbacksRef pattern
- `GroupMembersList` - Member list with admin actions
- `getGroupById` - API call for group details
- `useAuthStore` - Current user info
- Material-UI components

**Key Logic**:
```typescript
// Socket room management with stable callbacks
useEffect(() => {
  if (groupId) {
    joinStudyGroup(groupId);
    return () => leaveStudyGroup(groupId);
  }
}, [groupId, joinStudyGroup, leaveStudyGroup]);

// User-specific redirects
onMemberRemoved: (data) => {
  if (data.groupId === groupId && data.userId === user?.id) {
    navigate('/study-groups', { 
      state: { message: 'You have been removed from this group' }
    });
  } else {
    loadGroup();
  }
}
```

---

### GroupMembersList (Enhanced)
**Path**: `client/src/components/StudyGroups/GroupMembersList.tsx`  
**Status**: ✅ Enhanced with full admin capabilities (February 2, 2026)

**Purpose**: Display group members with admin management actions

**Features** (Enhanced February 2, 2026):
- Member list sorted (admins first, then by join date)
- Admin badges and role indicators
- User avatars with role-based colors
- "You" indicator for current user
- Email display (if available)
- Relative join timestamps
- Admin actions (promote, remove) for non-self members
- Confirmation dialogs for destructive actions
- Toast feedback for all operations
- Disabled state during operations
- Test IDs for all interactive elements

**Admin Actions** (New):
- **Promote to Admin**: IconButton with PromoteIcon (only for regular members)
- **Remove Member**: IconButton with RemoveIcon (for all non-self members)
- Actions hidden if `!isAdmin || isCurrentUser` (prevents self-management)

**Props**:
- `groupId: string` - Group ID for API calls
- `isAdmin: boolean` - Current user is admin
- `currentUserId: string` - Current user ID
- `onMemberUpdate?: () => void` - Optional callback after updates

**API Methods**:
- `getGroupMembers(groupId)` - Fetch members
- `promoteMember(groupId, userId)` - Promote to admin (sends notification)
- `removeMember(groupId, userId)` - Remove from group (sends notification)

**Member Promotion Notification**:
- Type: 'course', Priority: 'normal'
- Category: 'community', Subcategory: 'GroupActivity'
- Title: "Study Group Promotion"
- Message: "You've been promoted to admin in \"{groupName}\". You can now manage members and settings."
- Action URL: `/study-groups/{groupId}`
- Respects EnableGroupActivity and EmailGroupActivity preferences

---

## 🎓 Instructor Course Management

### CourseEditPage
**Path**: `client/src/pages/Instructor/CourseEditPage.tsx`  
**Purpose**: Unified course management interface with 4-tab system

**Navigation**: 
- Primary: `/instructor/edit/:courseId`
- With Tab: `/instructor/edit/:courseId?tab=1`
- Legacy: `/instructor/lessons/:courseId` → Redirects to tab 1

**Tabs**:
1. **Course Details** (Tab 0) - CourseDetailsEditor component
   - Edit title, description, category, level, price
   - Upload/change thumbnail image
   - Real-time validation with error messages
   - Auto-saves to backend on form submit

2. **Lesson Details** (Tab 1) - CurriculumBuilder component
   - Manage course curriculum structure
   - Add/edit/delete lessons
   - Reorder lessons with drag & drop
   - Set lesson duration and requirements

3. **Assessments** (Tab 2) - Placeholder for future assessment management

4. **Settings** (Tab 3) - Placeholder for course settings

**Services Used**:
- `instructorApi.getCourses()` - Fetch instructor's courses
- `instructorApi.updateCourse(id, data)` - Save course changes

**Features**:
- URL state management (tab parameter persists in URL)
- Breadcrumb navigation back to dashboard
- Real-time lesson count display
- Course status indicator (draft/published)
- Toast notifications for save success/failure

**Status**: ✅ Production-ready (January 14, 2026)

---

### CourseDetailsEditor
**Path**: `client/src/pages/Instructor/CourseDetailsEditor.tsx`  
**Purpose**: Form component for editing course metadata

**Features**:
- Category dropdown (10 options: Programming, Data Science, Design, etc.)
- Level dropdown (4 options: beginner, intermediate, advanced, expert)
- Price input with validation (min: 0)
- Thumbnail upload with preview (max 5MB, image types only)
- Real-time validation:
  - Title: min 5 characters
  - Description: min 20 characters
  - Category: required selection
- **Level Normalization**: Initializes with `course.level?.toLowerCase()` to handle backend data
- **Error Handling**: Extracts string messages from error objects for toast display

**API Endpoint**: `PUT /api/instructor/courses/:id`

**Status**: ✅ Production-ready with level normalization fix

---

## 🏢 Office Hours Services

### OfficeHoursService
**Path**: `server/src/services/OfficeHoursService.ts`  
**Purpose**: Manages office hours schedules, queue, and session lifecycle with real-time notifications

**Key Methods**:
- `createSchedule()` - Create office hours schedule for instructor
- `joinQueue()` - Student joins office hours queue
- `admitStudent()` - Instructor admits student from queue
- `completeSession()` - Complete session with duration tracking and notification
- `cancelQueueEntry()` - Cancel a queue entry

**Notification Integration** (January 17, 2026):
- **Session Completed**: Enhanced with duration calculation
  - Calculates session time from AdmittedAt to CompletedAt timestamps
  - Sends notification with duration: "Duration: X minute(s)."
  - Type: 'course', Category: 'community', Subcategory: 'OfficeHours'
  - Non-blocking try-catch ensures session completion succeeds even if notification fails
- **Queue Join**: Notifies instructor when student joins queue
- **Student Admitted**: Notifies student when admitted to session

**Socket.IO Events**:
- `office-hours-completed` - Emitted to student when session ends
- `queue-updated` - Emitted to instructor when queue changes
- `office-hours-admitted` - Emitted to student when admitted

**Dependencies**:
- `DatabaseService` - SQL queries for schedules and queue
- `NotificationService` - Persistent notifications with user preferences
- `Socket.IO Server` - Real-time event broadcasting

**Error Handling**:
- Non-blocking notifications (session operations never fail due to notification errors)
- Comprehensive logging for debugging
- Graceful degradation (missing timestamps handled safely)

**Status**: ✅ Production-ready with enhanced session completion notification

---

### InstructorDashboard
**Path**: `client/src/pages/Instructor/InstructorDashboard.tsx`  
**Purpose**: Main instructor dashboard with course cards

**Navigation Updates** (January 14, 2026):
- **Edit Course**: → `/instructor/edit/:courseId`
- **Analytics**: → `/instructor/analytics?courseId=:id` (query param)
- **Students**: → `/instructor/students?courseId=:id` (query param)

**Features**:
- Course filtering (All/Published/Draft/Archived)
- Course search by title
- Pagination (12 courses per page)
- Real-time stats display (students, lessons, revenue, rating)
- Level badges with color coding (beginner=green, intermediate=orange, advanced=red, expert=dark red)
- Status indicators (draft/published/archived)
- **Pending Enrollment Approvals** section (Feb 14, 2026):
  - Displays up to 4 pending enrollments with approve/reject quick actions
  - Real-time updates via `useCatalogRealtimeUpdates` hook
  - Relative timestamps ("3 minutes ago") auto-refresh every 60 seconds
- **Real-time Updates** (Feb 14, 2026):
  - Pending approvals count updates instantly when students request enrollment
  - Stats refresh silently when enrollment status changes

**Status**: ✅ Production-ready

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
**Purpose**: AI-powered tutoring sessions with multiple models and course context

**Key Features**:
- ✅ **Auto-Updating Timestamps** (Jan 12, 2026) - Session "Updated X ago" and message times update automatically
- ✅ **Smart Course Dropdown** (Feb 3, 2026) - Shows enrolled courses for context-aware AI responses
  - Hybrid dropdown: "General Question" + user's enrolled courses
  - Auto-fills courseId, subject, title when course selected
  - Shows course level, category, title with School icon (🏫)
  - Empty state: "You're not enrolled in any courses yet"
- ✅ **AI Response Notifications** (Feb 3, 2026) - Sends notification when AI tutor answers question
  - Notification type: 'community', category: 'community', subcategory: 'AITutoring'
  - Respects EnableAITutoring and EmailAITutoring preferences
  - Message: "Your AI tutor answered your question about \"{title}\""
  - Action URL: `/tutoring?session={sessionId}` with "View Response" button
  - Email subject: "👥 Community Update" with purple gradient
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

**Status**: ✅ Production-ready with smart dropdown and notifications

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

### CourseAnalyticsDashboard
**Path**: `client/src/pages/Instructor/CourseAnalyticsDashboard.tsx` (~852 lines)  
**Route**: `/instructor/analytics` (+ `?courseId=:id` query param for per-course view)  
**Purpose**: Instructor analytics hub — three views: Dashboard Overview, Course Performance Overview, and Per-Course Detail  
**Last Updated**: February 18, 2026 — Full audit (68 fixes), CoursePerformanceTable replacing card grid

**Views (3 sub-components inside the file):**

1. **DashboardView** — Multi-course overview metrics (total students, enrollments, revenue, average progress, top courses)
2. **CoursePerformanceTable** — Sortable/searchable/paginated table of all instructor courses *(NEW — Feb 18, 2026)*
3. **CourseView** — Single-course deep-dive (student list, completion funnel, lesson analytics)

**Services Used**:
- `analyticsApi.getCourseAnalytics(courseId)` — Per-course detail
- `analyticsApi.getInstructorCoursePerformance()` — All courses overview  
- `assessmentAnalyticsApi.getOverview(courseId)` — Assessment metrics  
- Both services now have full auth + 401 interceptors and Content-Type headers

**State Management**:
- `useAuthStore()` — Instructor identity + token
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
- **Sort**: 5 columns — Course Title (string), Students Enrolled (num), Avg Progress % (num), Completed (num), Avg Time Spent (num)
- **Default sort**: Enrolled Students descending
- **Search**: Filter by course title with real-time counter chip `{filtered} of {total}`
- **Pagination**: MUI `TablePagination` with [10, 25, 50, 100] options, `showFirstButton`, `showLastButton`
- **Progress bars**: Inline `LinearProgress` — green ≥70%, orange ≥40%, red <40%
- **Empty search state**: "No courses match '{query}'" row spanning all columns
- **Zero data state**: Informational empty message instead of table

**Sort Keys**:
```typescript
type SortKey = 'Title' | 'enrolledStudents' | 'avgProgress' | 'completedStudents' | 'avgTimeSpent';
```

**Key Implementation Patterns**:
```typescript
// Non-mutating sorted array (CRITICAL — direct .sort() mutates state)
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
- Replaced: `coursePerformance.map(...)` inside `<Grid container spacing={2}>` — rendered ~3000 DOM nodes at once
- Backend: `GET /api/analytics/instructor/course-performance` — returns all courses, no pagination needed on backend because table handles it client-side

**Used By**:
- `DashboardView` renders `<CoursePerformanceTable coursePerformance={coursePerformance} />`
- Route: `/instructor/analytics`

**Status**: ✅ Production-ready (February 18, 2026)

---

## 🧩 REUSABLE COMPONENTS

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
  
  // Enrollment Status (Feb 10-11, 2026) ⭐ UPDATED
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
- `formatCategory(category)` - Snake_case → Title Case
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
- **Enrollment Status Chips** (Feb 10-11, 2026) ⭐ UPDATED:
  - "Pending Approval" (orange, HourglassEmpty icon)
  - "Suspended" (red, Block icon)
  - "Cancelled" (gray, Block icon) ← Feb 11: Added icon
  - "Rejected" (red, Block icon) ← Feb 11: Added icon
  - Chips appear based on `enrollmentStatus` prop
  - Prevents "Enroll Now" button from showing for blocked enrollments
  - Visual consistency: All blocked status chips use Block icon

**Enrollment Controls (Phase 2)** ✅:
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
**Status**: ✅ Production-ready (January 24, 2026)

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

## 🔍 Search Autocomplete System (Added February 17, 2026)

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
- **DOM prop warning**: `variant` prop forwarded to InputBase → DOM. Fixed by renaming to `searchVariant` with `shouldForwardProp`.
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
- DashboardPage (shown below Header, above content)

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

## 🗑️ Account Deletion Components (Added Jan 18-19, 2026)

### SettingsPage (Updated)
**Path**: `client/src/pages/Settings/SettingsPage.tsx` (664 lines)  
**Purpose**: User settings with account deletion functionality

**New Features**:
- Privacy & Security tab with red "Delete My Account" button
- Instructor-specific deletion flow with course management
- Password confirmation before deletion execution
- Transaction-safe deletion with rollback

**Account Deletion Flow**:
1. User clicks "Delete My Account" → Opens InstructorDeletionDialog (if instructor) or ConfirmationDialog (if student)
2. Instructor selects course action: Archive All / Transfer All / Force Delete
3. If Transfer: Opens CourseTransferDialog to select target instructor
4. Password confirmation dialog (always required)
5. Backend executes: Course action → Soft delete user → Audit log
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

**Status**: ✅ Production-ready with transaction safety

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

**Status**: ✅ Production-ready

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
- ~~DOM nesting warning (`<p>` inside `<p>`)~~ ✅ FIXED - ListItemText secondary now plain string
- ~~Immediate API call on selection~~ ✅ FIXED - Delayed until password confirmation

**Status**: ✅ Production-ready

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

**Status**: ✅ Production-ready

---

### ShareService
**Path**: `client/src/services/shareService.ts`  
**Purpose**: Central service for all sharing operations across platforms  
**Status**: ✅ Production-ready (January 24, 2026)

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

**Status**: ✅ 328 lines, fully implemented with certificate support

---

### ShareAnalytics
**Path**: `client/src/services/shareAnalytics.ts`  
**Purpose**: Analytics tracking for share events (courses and certificates)  
**Status**: ✅ Production-ready (January 24, 2026)

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
     - Transactions → Invoices (CASCADE)
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
  - CourseProgress.UserId → ON DELETE CASCADE
  - Invoices.TransactionId → ON DELETE CASCADE
  - EmailTrackingEvents.UserId → ON DELETE CASCADE
  - EmailUnsubscribeTokens.UserId → ON DELETE CASCADE
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

**Status**: ✅ Production-ready with comprehensive error handling

---

### ShareService
**Path**: `client/src/services/shareService.ts`  
**Purpose**: Central service for all sharing operations across platforms  
**Status**: ✅ Production-ready (January 24, 2026)

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

**Status**: ✅ 328 lines, fully implemented with certificate support

---

### ShareAnalytics
**Path**: `client/src/services/shareAnalytics.ts`  
**Purpose**: Analytics tracking for share events (courses and certificates)  
**Status**: ✅ Production-ready (January 24, 2026)

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

**Status**: ✅ Production-ready

---
