# Component Registry — Feature Implementation Details

> **Split from COMPONENT_REGISTRY.md** — For pages, see [REGISTRY_PAGES.md](REGISTRY_PAGES.md) | For shared components/services, see [REGISTRY_COMPONENTS.md](REGISTRY_COMPONENTS.md) | [Index](../../COMPONENT_REGISTRY.md)

---

**Last Updated**: February 24, 2026 - Mobile Optimization Phases 6–18 Complete — 129 Sub-Component Items Fixed 📱  
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

**Pages currently using Responsive library** (All Phases 1–5 — 69 active pages):
- **Phase 1 (9)**: `LandingPage.tsx`, `Login.tsx`, `Register.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `EmailVerificationPage.tsx`, `CoursesPage.tsx`, `CourseDetailPage.tsx`, `DashboardPage.tsx`
- **Phase 2 (12)**: `MyLearningPage.tsx`, `LessonDetailPage.tsx`, `NotificationsPage.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx`, `NotificationSettingsPage.tsx`, `StudentProgressPage.tsx`, `StudentAssessmentDashboard.tsx`, `AssessmentTakingPage.tsx`, `MyCertificatesPage.tsx`, `CertificatePage.tsx`, `PublicCertificatePage.tsx`
- **Phase 2 component**: `StudentProgressDashboard.tsx` (wrapped by StudentProgressPage)
- **Phase 3 (7)**: `Chat.tsx`, `LiveSessionsPage.tsx`, `StudyGroupsPage.tsx`, `StudyGroupDetailPage.tsx`, `OfficeHoursPage.tsx`, `Tutoring.tsx`, `PresencePage.tsx`
- **Phase 4 (19)**: `InstructorDashboard.tsx`, `CourseCreationForm.tsx`, `CourseEditPage.tsx`, `CourseDetailsEditor.tsx`, `CurriculumBuilder.tsx`, `LessonEditor.tsx`, `CourseSettingsEditor.tsx`, `StudentManagement.tsx`, `AnalyticsHubPage.tsx`, `CourseAnalyticsDashboard.tsx`, `VideoAnalyticsPage.tsx`, `EnhancedAssessmentAnalyticsDashboard.tsx`, `InstructorStudentAnalytics.tsx`, `InterventionDashboard.tsx`, `AssessmentManagementPage.tsx`, `CourseAssessmentManagementPage.tsx`, `AssessmentCreationPage.tsx`, `AssessmentEditPage.tsx`, `AssessmentViewPage.tsx`
- **Phase 5 (6)**: `CourseCheckoutPage.tsx`, `PaymentSuccessPage.tsx`, `TransactionsPage.tsx`, `TermsOfServicePage.tsx`, `PrivacyPolicyPage.tsx`, `RefundPolicyPage.tsx`
- **Note**: 4 legacy dead-code pages (`Analytics.tsx`, `Courses.tsx`, `Lesson.tsx`, `Profile.tsx`) were deleted in Phase 5 (Feb 24, 2026) — confirmed 0 imports, superseded by newer implementations
- **Phases 6–18 (sub-components)**: No new pages added. 129 items fixed across existing pages/components — see `MOBILE_OPTIMIZATION_TRACKER.md` for full log. Key patterns: all Dialogs `fullScreen={isMobile}`, all TableContainers `overflowX:auto`, FABs/Snackbars `bottom:{xs:88,md:24}`, chip rows `flexWrap+gap`, iOS MuiInputBase fontSize, ListItemSecondaryAction responsive `pr`, Pagination responsive size, AccordionSummary `minWidth:0`, Stack `spacing→gap` when flexWrap, no hardcoded `@media` (use MUI sx objects), all `<Tabs>` `variant="scrollable" scrollButtons="auto"`

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
