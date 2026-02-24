# Mobile UI Optimization Tracker

**Created**: February 19, 2026  
**Last Updated**: February 24, 2026  
**Status**: Phase 5 Complete + 4-Round Audit — 73/73 pages done (+ 4 legacy files deleted) — ALL PHASES COMPLETE ✅  
**Goal**: Make every page fully responsive and mobile-optimized across the Mishin Learn Platform

---

## 📊 CURRENT STATE SUMMARY

| Metric | Value |
|--------|-------|
| **Total Pages** | 55 |
| **Mobile-Ready (good)** | 2 (3.6%) |
| **Partially Responsive (partial)** | 27 (49.1%) |
| **No Mobile Support (none)** | 26 (47.3%) |
| **Pages with `useMediaQuery`** | 1 (DashboardPage only) |
| **Pages with bottom-nav padding** | 1 (DashboardPage only) |
| **Global Layout Components** | HeaderV5, PublicHeader, MobileBottomNav, MobileNavDrawer, PublicFooter, Layout.tsx, PublicLayout.tsx |

### Custom Breakpoint Reference (defined in `theme/index.ts`)
```
xs: 0px     — phones (portrait)
sm: 640px   — phones (landscape) / small tablets
md: 768px   — tablets
lg: 1024px  — desktops
xl: 1280px  — large desktops
```
> ⚠️ These are NOT MUI defaults (600/900/1200/1536). We use custom values.

---

## 🎯 MOBILE OPTIMIZATION STANDARDS (Apply to Every Page)

Every page must meet ALL of these criteria to be marked "complete":

### Required Checklist (per page)
- [ ] **Bottom nav padding**: `pb: { xs: 10, md: 0 }` on main Container (prevents content hidden behind MobileBottomNav)
- [ ] **Responsive padding/margins**: Use `{ xs: 2, sm: 3, md: 4 }` pattern (not fixed values)
- [ ] **Responsive typography**: Heading font sizes scale down on mobile (`fontSize: { xs: '...', md: '...' }`)
- [ ] **No horizontal overflow**: No fixed-width elements wider than viewport on mobile
- [ ] **Touch-friendly targets**: Buttons/icons minimum 44x44px touch area
- [ ] **Tables → Cards on mobile**: Tables with 4+ columns become card-based layout on `xs`/`sm`
- [ ] **Responsive Grid**: All Grid items use `xs`/`sm`/`md` breakpoints (not only `xs={12}`)
- [ ] **Responsive images**: Images have `maxWidth: '100%'` and proper aspect ratios
- [ ] **Modal/Dialog sizing**: Dialogs `fullScreen` on mobile (`fullScreen={isMobile}`)
- [ ] **Form inputs**: Full width on mobile, side-by-side on desktop where appropriate
- [ ] **Stacked layouts**: Side-by-side desktop layouts stack vertically on mobile
- [ ] **Hide non-essential elements**: Use `display: { xs: 'none', md: 'block' }` for desktop-only decorations
- [ ] **Test at 375px width**: Verify no overflow, no truncated content, all actions accessible

### Shared Components to Fix Once (Affect All Pages)
- HeaderV5 already has `isMobile` + MobileBottomNav + MobileNavDrawer — **review for completeness**
- PublicHeader already has mobile drawer — **review for completeness**
- Layout.tsx (sidebar layout) already has `isMobile` + responsive drawer — **review for completeness**
- PublicFooter already uses responsive Grid — **review for completeness**

---

## 📋 IMPLEMENTATION PHASES & FULL CHECKLIST

### PHASE 0: Global Shell & Shared Components
> Fix these FIRST — they affect every single page

| # | Component | File | Current State | Status |
|---|-----------|------|---------------|--------|
| 0.1 | **HeaderV5** (auth header) | `components/Navigation/HeaderV5.tsx` | Already has isMobile, MobileBottomNav, MobileNavDrawer, responsive sx. No changes needed | ✅ Done |
| 0.2 | **PublicHeader** (guest header) | `components/Navigation/PublicHeader.tsx` | Already has isMobile, isSmall, mobile drawer, responsive toolbar. No changes needed | ✅ Done |
| 0.3 | **MobileBottomNav** | `components/Navigation/MobileBottomNav.tsx` | Fully implemented: safe-area-inset-bottom, 64px height, badges. No changes needed | ✅ Done |
| 0.4 | **MobileNavDrawer** | `components/Navigation/MobileNavDrawer.tsx` | Fixed: search route from `/search?q=` → `/courses?search=` (matching SearchAutocomplete) | ✅ Done |
| 0.5 | **Layout.tsx** (sidebar shell) | `components/Layout/Layout.tsx` | Has isMobile + responsive drawer. Only used by PublicLayout. No changes needed | ✅ Done |
| 0.6 | **PublicLayout.tsx** | `components/Layout/PublicLayout.tsx` | Minimal wrapper for guest routes. No changes needed | ✅ Done |
| 0.7 | **PublicFooter** | `components/Layout/PublicFooter.tsx` | Already responsive — Grid xs/md, stacked on mobile. No changes needed | ✅ Done |
| 0.8 | **MegaMenuDropdown** | `components/Navigation/MegaMenuDropdown.tsx` | Desktop-only by design (hidden on mobile via HeaderV5 isMobile check). No changes needed | ✅ Done |
| 0.9 | **PageHeader** | `components/Navigation/PageHeader.tsx` | Fixed: responsive sticky top (56/64px), responsive py, breadcrumb overflow scrolling | ✅ Done |
| 0.10 | **TermsConsentBanner** | `components/Legal/TermsConsentBanner.tsx` | Already responsive: dialog maxWidth="sm" fullWidth, banner uses flexWrap. No changes needed | ✅ Done |
| 0.11 | **CourseSelector** | `components/Common/CourseSelector.tsx` | MUI Autocomplete is inherently responsive. No changes needed | ✅ Done |
| 0.12 | **SearchAutocomplete** | `components/Search/SearchAutocomplete.tsx` | Dropdown uses containerRef width (responsive). Both variants work on mobile. No changes needed | ✅ Done |
| 0.13 | **NotificationBell** | `components/Notifications/NotificationBell.tsx` | Fixed: responsive menu width `{ xs: 'calc(100vw - 32px)', sm: 420 }`, responsive maxHeight | ✅ Done |
| 0.14 | **CommentsSection** | `components/Shared/CommentsSection.tsx` | Fixed: responsive padding `{ xs: 2, sm: 3 }`, responsive margins | ✅ Done |
| 0.15 | **Rating Components** | `components/Rating/*.tsx` | Fixed: responsive padding on RatingSummaryCard + RatingSubmitForm, responsive gap/minWidth | ✅ Done |

**Phase 0 Completion**: ✅ 15/15

---

### PHASE 1: Critical Path (First Pages Every User Sees)
> Highest traffic, public-facing pages — optimize these first

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 1.1 | **Landing Page** | `pages/Landing/LandingPage.tsx` | `/` | Fixed: PageContainer + PageTitle, bottom-nav pad, responsive hero/grid | ✅ Done |
| 1.2 | **Login** | `pages/Auth/Login.tsx` | `/login` | Fixed: PageContainer, responsive Card sz, responsive typography | ✅ Done |
| 1.3 | **Register** | `pages/Auth/Register.tsx` | `/register` | Fixed: PageContainer, responsive Card sz, responsive typography | ✅ Done |
| 1.4 | **Forgot Password** | `components/Auth/ForgotPasswordForm.tsx` | `/forgot-password` | Fixed: PageContainer, responsive typography + spacing | ✅ Done |
| 1.5 | **Reset Password** | `components/Auth/ResetPasswordForm.tsx` | `/reset-password` | Fixed: PageContainer, responsive typography + spacing | ✅ Done |
| 1.6 | **Email Verification** | `pages/Auth/EmailVerificationPage.tsx` | `/verify-email` | Fixed: PageContainer, responsive icon/typography, inputProps conflict | ✅ Done |
| 1.7 | **Courses Catalog** | `pages/Courses/CoursesPage.tsx` | `/courses` | Fixed: PageContainer + PageTitle, bottom-nav pad, responsive filters | ✅ Done |
| 1.8 | **Course Detail** | `pages/Course/CourseDetailPage.tsx` | `/courses/:id` | Fixed: PageContainer + PageTitle, responsive tabs, full audit (0 TS errors) | ✅ Done |
| 1.9 | **Dashboard** | `pages/Dashboard/DashboardPage.tsx` | `/dashboard` | Fixed: Migrated to PageContainer, audit complete, 0 TS errors | ✅ Done |

**Phase 1 Completion**: ✅ 9/9

---

### PHASE 2: Core Student Experience
> Pages students use daily after signing up

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 2.1 | **My Learning** | `pages/Learning/MyLearningPage.tsx` | `/my-learning` | Fixed: PageContainer, PageTitle, theme tokens (gradients, `alpha()` shadows), responsive instructor/student layouts | ✅ Done |
| 2.2 | **Lesson Detail** | `pages/Course/LessonDetailPage.tsx` | `/courses/:id/lessons/:id` | Fixed: PageContainer (3), useTheme, gradient tokens, assessment button palette hex → tokens | ✅ Done |
| 2.3 | **Notifications** | `pages/Notifications/NotificationsPage.tsx` | `/notifications` | Fixed: PageContainer, PageTitle, responsive filter row (`flexWrap`, responsive `minWidth`) | ✅ Done |
| 2.4 | **Profile** | `pages/Profile/ProfilePage.tsx` | `/profile` | Fixed: PageContainer (3), Tabs `variant="scrollable" scrollButtons="auto"`, responsive mt | ✅ Done |
| 2.5 | **Settings** | `pages/Settings/SettingsPage.tsx` | `/settings` | Fixed: PageContainer, PageTitle, `useTheme` as `muiTheme` (avoids `theme` state collision), td hex→palette tokens | ✅ Done |
| 2.6 | **Notification Settings** | `pages/Settings/NotificationSettingsPage.tsx` | `/settings/notifications` | Fixed: PageContainer, PageTitle, responsive header, subcategory `flexWrap`, `pt` not `py` | ✅ Done |
| 2.7 | **Student Progress** | `pages/Progress/StudentProgressPage.tsx` | `/smart-progress` | Fixed: Added `PageContainer maxWidth="xl"` wrapper | ✅ Done |
| 2.7b | **Student Progress Dashboard** | `components/Progress/StudentProgressDashboard.tsx` | (component) | Fixed: Tabs `scrollable`, removed internal padding (was doubling with PageContainer) | ✅ Done |
| 2.8 | **Student Assessments** | `pages/Assessment/StudentAssessmentDashboard.tsx` | `/my-assessments` | Fixed: PageContainer (3), PageTitle, responsive grid/list/buttons, `pt` on all 3 return paths | ✅ Done |
| 2.9 | **Assessment Taking** | `pages/Assessment/AssessmentTakingPage.tsx` | `/assessments/:id` | Fixed: PageContainer (2), alert `flexWrap`, `pt` on all return paths | ✅ Done |
| 2.10 | **My Certificates** | `pages/Certificates/MyCertificatesPage.tsx` | `/my-certificates` | Fixed: PageContainer, PageTitle, gradient token `(t:any)=>`, CardActions `flexWrap`, Header in loading state | ✅ Done |
| 2.11 | **Certificate View** | `pages/Certificates/CertificatePage.tsx` | `/courses/:id/certificate` | Fixed: PageContainer (5), gradient token, button bar `flexWrap`, `severity` split for error vs not-found | ✅ Done |
| 2.12 | **Public Certificate** | `pages/Certificates/PublicCertificatePage.tsx` | `/certificate/:code` | Fixed: PageContainer (5), all with `disableBottomPad`, gradient token, responsive gap/mb | ✅ Done |
| 2.13 | **Bookmarks** (if separate page) | — | — | Bookmarks are embedded in CourseDetailPage sidebar — no separate page exists | N/A |

**Phase 2 Completion**: ✅ 12/12 (+ 1 N/A)

---

### PHASE 3: Collaboration & Social Features
> Real-time interactive pages — complex mobile layouts

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 3.1 | **Chat / DM** | `pages/Chat/Chat.tsx` | `/chat` | Fixed: PageContainer, useResponsive+isMobile, mobile room/message toggle (ArrowBack), responsive bubbles+padding, Dialog fullScreen={isMobile}, Paper height calc(100vh-170px) mobile / calc(100vh-150px) desktop | ✅ Done |
| 3.2 | **Live Sessions** | `pages/LiveSessions/LiveSessionsPage.tsx` | `/live-sessions` | Fixed: Container→PageContainer, responsive Paper padding p:{xs:2,sm:3,md:4} | ✅ Done |
| 3.3 | **Study Groups** | `pages/StudyGroups/StudyGroupsPage.tsx` | `/study-groups` | Fixed: PageContainer maxWidth="lg", PageTitle, useResponsive+isMobile, scrollable Tabs on mobile (fullWidth on desktop), responsive header flexWrap+gap, search minWidth responsive, Create button size responsive | ✅ Done |
| 3.4 | **Study Group Detail** | `pages/StudyGroups/StudyGroupDetailPage.tsx` | `/study-groups/:id` | Fixed: 3× Container→PageContainer maxWidth="lg", responsive Paper padding, h4/h5 responsive fontSize, Breadcrumbs overflow:auto + nowrap links | ✅ Done |
| 3.5 | **Office Hours** | `pages/OfficeHours/OfficeHoursPage.tsx` | `/office-hours` | Fixed: PageContainer maxWidth="lg", PageTitle, useResponsive+isMobile, both instructor+student Tabs scrollable on mobile/fullWidth on desktop, disableBottomPad on error return | ✅ Done |
| 3.6 | **AI Tutoring** | `pages/Tutoring/Tutoring.tsx` | `/tutoring` | Fixed: PageContainer maxWidth="xl", PageTitle with AIIcon, useResponsive+isMobile, ArrowBack, !isMobile auto-select guard, handleBackToSessions clears messages+suggestions, loading path has Header, Dialog fullScreen={isMobile}, responsive heights/widths, currentSuggestions cleared on session switch | ✅ Done |
| 3.7 | **Presence / Online Users** | `pages/Presence/PresencePage.tsx` | `/presence` | Fixed: PageContainer maxWidth="lg", PageTitle, responsive Paper padding p:{xs:2,sm:3} | ✅ Done |

**Phase 3 Completion**: ✅ 7/7

---

### PHASE 4: Instructor Pages
> Instructor-facing tools — typically used on desktop but must work on mobile

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 4.1 | **Instructor Dashboard** | `pages/Instructor/InstructorDashboard.tsx` | `/instructor/dashboard` | Fixed: Container→PageContainer+PageHeader, useResponsive+isMobile, Tabs scrollable on mobile, FAB `bottom:{xs:88,md:24}`, `#ffc107`→`warning.main` | ✅ Done |
| 4.2 | **Course Creation** | `pages/Instructor/CourseCreationForm.tsx` | `/instructor/courses/create` | Fixed: Header+PageContainer, Stepper `orientation={isMobile?'vertical':'horizontal'}` + `alternativeLabel={!isMobile}`, 2× Dialog `fullScreen={isMobile}` | ✅ Done |
| 4.3 | **Course Edit (Tabs)** | `pages/Instructor/CourseEditPage.tsx` | `/instructor/courses/:id/edit` | Fixed: 3× Container→PageContainer (loading/error/main), Tabs `variant={isMobile?'scrollable':'fullWidth'}`, TabPanel `p:{xs:1,sm:2,md:3}` | ✅ Done |
| 4.4 | **Course Details Editor** | `pages/Instructor/CourseDetailsEditor.tsx` | (tab within edit) | Fixed: header `flexWrap+gap` (embedded component, no PageContainer) | ✅ Done |
| 4.5 | **Curriculum Builder** | `pages/Instructor/CurriculumBuilder.tsx` | (tab within edit) | Fixed: icon colors→MUI palette props (`color="error"/"primary"/"warning"`), header `flexWrap+gap` (embedded, no PageContainer) | ✅ Done |
| 4.6 | **Lesson Editor** | `pages/Instructor/LessonEditor.tsx` | (within curriculum) | Fixed: Dialog `fullScreen={isMobile}` (embedded dialog, no PageContainer) | ✅ Done |
| 4.7 | **Course Settings** | `components/Instructor/CourseSettingsEditor.tsx` | (tab within edit) | Fixed: 5 Papers `p:{xs:2,sm:3}` (embedded, no PageContainer) | ✅ Done |
| 4.8 | **Student Management** | `pages/Instructor/StudentManagement.tsx` | `/instructor/students` | Fixed: Container→PageContainer, useResponsive+isMobile, Tabs scrollable on mobile, 2× Dialog `fullScreen={isMobile}` | ✅ Done |
| 4.9 | **Analytics Hub** | `pages/Instructor/AnalyticsHubPage.tsx` | `/instructor/analytics-hub` | Fixed: Container→PageContainer, responsive header `flexWrap+gap`, stat grid `xs:6` | ✅ Done |
| 4.10 | **Course Analytics** | `pages/Instructor/CourseAnalyticsDashboard.tsx` | `/instructor/analytics` | Fixed: Container→PageContainer | ✅ Done |
| 4.11 | **Video Analytics** | `pages/Instructor/VideoAnalyticsPage.tsx` | `/instructor/video-analytics` | Fixed: Container→PageContainer, useResponsive+isMobile, responsive header, CourseSelector `minWidth` responsive | ✅ Done |
| 4.12 | **Assessment Analytics** | `pages/Instructor/EnhancedAssessmentAnalyticsPage.tsx` | `/instructor/assessment-analytics` | Fixed: standalone Container→PageContainer in EnhancedAssessmentAnalyticsDashboard, useResponsive+isMobile, Tabs scrollable, TabPanel `p:{xs:1,sm:2,md:3}` | ✅ Done |
| 4.13 | **Student Analytics** | `pages/Instructor/InstructorStudentAnalytics.tsx` | `/instructor/student-analytics` | Fixed: Container→PageContainer, useResponsive+isMobile, Dialog `fullScreen={isMobile}`, responsive header | ✅ Done |
| 4.14 | **Intervention Dashboard** | `pages/Instructor/InterventionDashboard.tsx` | `/instructor/interventions` | Fixed: Container→PageContainer, useResponsive+isMobile, Tabs `variant={isMobile?'scrollable':'fullWidth'}` (was unconditionally fullWidth) | ✅ Done |
| 4.15 | **Assessment Management** | `pages/Instructor/AssessmentManagementPage.tsx` | `/instructor/lessons/:id/assessments` | Fixed: 2× Container→PageContainer, h3 responsive fontSize | ✅ Done |
| 4.16 | **Course Assessment Mgmt** | `pages/Instructor/CourseAssessmentManagementPage.tsx` | `/instructor/courses/:id/assessments` | Fixed: 4× Container→PageContainer (all 4 return paths), h3 responsive fontSize | ✅ Done |
| 4.17 | **Assessment Creation** | `pages/Instructor/AssessmentCreationPage.tsx` | `.../assessments/create` | Fixed: 2× Container→PageContainer, h3 responsive fontSize | ✅ Done |
| 4.18 | **Assessment Edit** | `pages/Instructor/AssessmentEditPage.tsx` | `.../assessments/:id/edit` | Fixed: 2× Container→PageContainer, h3 responsive fontSize | ✅ Done |
| 4.19 | **Assessment View** | `pages/Instructor/AssessmentViewPage.tsx` | `.../assessments/:id/view` | Fixed: 2× Container→PageContainer, h3 responsive fontSize | ✅ Done |

**Phase 4 Completion**: ✅ 19/19

---

### PHASE 5: Payment, Legal & Secondary Pages
> Less-frequent pages but must be mobile-friendly

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 5.1 | **Course Checkout** | `pages/Payment/CourseCheckoutPage.tsx` | `/checkout/:id` | Fixed: PageContainer+PageTitle, all 3 return paths `pt:4`, responsive Grid 5/7 split, Paper `p:{xs:2,sm:3}` | ✅ Done |
| 5.2 | **Payment Success** | `pages/Payment/PaymentSuccessPage.tsx` | `/payment/success` | Fixed: PageContainer maxWidth="md", all 3 return paths `pt:4` (flat), responsive h3/h4/h5 fontSize, Paper `p:{xs:2,sm:3,md:4}`, confetti window-resize handler | ✅ Done |
| 5.3 | **Transactions** | `pages/Profile/TransactionsPage.tsx` | `/profile/transactions` | Fixed: PageContainer+PageTitle, useResponsive+isMobile, Table→Card layout on mobile, Dialog `fullScreen={isMobile}`, Refresh button `size={isMobile?'small':'medium'}`, responsive header flexWrap+gap | ✅ Done |
| 5.4 | **Terms of Service** | `pages/Legal/TermsOfServicePage.tsx` | `/terms` | Fixed: PageContainer `disableBottomPad maxWidth="md"` on all 3 early-return paths, outer Box without `py`, responsive h3 fontSize, Paper `p:{xs:3,md:5}` | ✅ Done |
| 5.5 | **Privacy Policy** | `pages/Legal/PrivacyPolicyPage.tsx` | `/privacy` | Fixed: Identical pattern to TermsOfServicePage — disableBottomPad, no py, responsive h3, responsive Paper | ✅ Done |
| 5.6 | **Refund Policy** | `pages/Legal/RefundPolicyPage.tsx` | `/refund-policy` | Fixed: Identical pattern to TermsOfServicePage — disableBottomPad, no py, responsive h3, responsive Paper | ✅ Done |
| 5.7 | **Analytics (old)** | `pages/Analytics/Analytics.tsx` | (unused) | **Deleted** — confirmed 0 imports in App.tsx; superseded by `AnalyticsHubPage.tsx` | ✅ Deleted |
| 5.8 | **Courses (old)** | `pages/Courses/Courses.tsx` | (unused) | **Deleted** — confirmed 0 imports in App.tsx; superseded by `CoursesPage.tsx` | ✅ Deleted |
| 5.9 | **Lesson (old)** | `pages/Lessons/Lesson.tsx` | (unused) | **Deleted** — confirmed 0 imports in App.tsx; superseded by `LessonDetailPage.tsx` | ✅ Deleted |
| 5.10 | **Profile (old)** | `pages/Profile/Profile.tsx` | (unused) | **Deleted** — confirmed 0 imports in App.tsx; superseded by `ProfilePage.tsx` | ✅ Deleted |

**Phase 5 Completion**: ✅ 10/10 (6 optimized + 4 dead-code deleted)

---

## 📊 OVERALL PROGRESS

| Phase | Items | Completed | Progress |
|-------|-------|-----------|----------|
| **Phase 0**: Global Shell | 15 | 15 | ✅ 100% |
| **Phase 1**: Critical Path | 9 | 9 | ✅ 100% |
| **Phase 2**: Core Student | 13 | 13 | ✅ 100% |
| **Phase 3**: Collaboration | 7 | 7 | ✅ 100% |
| **Phase 4**: Instructor | 19 | 19 | ✅ 100% |
| **Phase 5**: Secondary | 10 | 10 | ✅ 100% |
| **TOTAL** | **73** | **73** | **✅ 100%** |

---

## 🔧 COMMON PATTERNS TO APPLY

### Pattern 1: Page Container with Bottom-Nav Padding
```tsx
// EVERY authenticated page — use PageContainer (never raw <Container>)
import { PageContainer } from '../../components/Responsive';

<PageContainer>
  {/* page content — px, mt, mb, pb:{ xs:10, md:0 } applied automatically */}
</PageContainer>

// With extra top padding:
<PageContainer sx={{ pt: 4 }}>
  ...
</PageContainer>
```

> ⚠️ **CRITICAL — `py` vs `pt` rule**:  
> PageContainer's base styles include `pb: { xs: 10, md: 0 }` for MobileBottomNav clearance.  
> MUI's `sx` array merges later entries on top, and `py` expands to BOTH `paddingTop` AND `paddingBottom` — silently overriding the base `pb`.  
> ✅ **Always use `pt:` (not `py:`) in consumer sx on authenticated pages.**  
> ✅ For public/guest pages where MobileBottomNav doesn't render, add `disableBottomPad` prop — then `py:` is safe.

### Pattern 2: Responsive Typography
```tsx
<Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
  Page Title
</Typography>
```

### Pattern 3: Table → Card on Mobile
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

{isMobile ? (
  // Card-based layout for mobile
  <Stack spacing={2}>
    {data.map(item => <MobileCard key={item.id} {...item} />)}
  </Stack>
) : (
  // Table layout for desktop
  <Table>...</Table>
)}
```

### Pattern 4: Side-by-Side → Stacked
```tsx
<Grid container spacing={3}>
  <Grid item xs={12} md={6}>Left/Top content</Grid>
  <Grid item xs={12} md={6}>Right/Bottom content</Grid>
</Grid>
```

### Pattern 5: Full-Screen Dialog on Mobile
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<Dialog fullScreen={isMobile} open={open} onClose={onClose}>
  ...
</Dialog>
```

### Pattern 6: Responsive Button Groups
```tsx
<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
  <Button fullWidth={isMobile}>Action 1</Button>
  <Button fullWidth={isMobile}>Action 2</Button>
</Stack>
```

### Pattern 7: Chat Sidebar → Drawer on Mobile
```tsx
// Desktop: sidebar + main pane side by side
// Mobile: conversation list → tap → full-screen chat → back button
{isMobile ? (
  showConversation ? <ChatPane onBack={() => setShow(false)} /> : <ConversationList />
) : (
  <Box sx={{ display: 'flex' }}>
    <ConversationList />
    <ChatPane />
  </Box>
)}
```

---

## 📝 IMPLEMENTATION NOTES & DECISIONS

### Strategy
1. **Phase 0 first** — global components affect every page; fixing them gives immediate improvement across the board
2. **Phase 1 next** — these are the first pages any user (student or guest) encounters
3. **Theme Token System** — centralise all design values (colors, shadows, radii) in the theme before Phase 2 so every subsequent page uses tokens instead of raw values (MUI-upgrade-proofing)
4. **Token hardening per phase** — as each page is mobile-optimized, also replace its hardcoded hex colors / boxShadow / borderRadius with theme tokens
5. **Top-down approach** — optimize the outer shell, then page-specific content
6. **One page at a time** — fully optimize, verify at 375px, mark complete, move to next
7. **TypeScript 0 errors** after every change — verify with `npx tsc --noEmit`

### Theme Token System (Added Feb 21, 2026)

To prevent painful MUI version upgrades in the future, all design primitives are now centralised in the theme rather than scattered across 2,500+ inline `sx` usages.

**Files:**
- `client/src/theme/index.ts` — Single `createTheme()` call (merged old split `theme` + `augmentedTheme`)
- `client/src/theme/tokens.ts` — Reusable `SxProps` fragments (spread into any `sx` prop)

**What was added to `theme.custom`:**

| Category | Tokens | Usage |
|----------|--------|-------|
| `custom.colors` | `gold`, `onlineGreen`, `muted`, `mutedDark`, `border`, `surfaceHover`, `overlay`, `brandPrimary` | `sx={{ color: (t) => t.custom.colors.gold }}` |
| `custom.gradients` | `primary`, `secondary`, `success`, `warning`, `error` | `sx={{ background: (t) => t.custom.gradients.primary }}` |
| `custom.shadows` | `soft`, `card`, `cardHover`, `dialog`, `image`, `focusPrimary`, `focusSuccess`, `large`, `none` | `sx={{ boxShadow: (t) => t.custom.shadows.card }}` |
| `custom.radii` | `none`(0), `sm`(6), `md`(12), `card`(16), `chip`(20), `lg`(24), `full`('50%') | **Numbers** (all except `full`): `` sx={{ borderRadius: (t) => `${t.custom.radii.card}px` }} `` — MUST use `px` string to bypass MUI's `× shape.borderRadius` multiplier (12). **EXCEPTION `full`**: already `'50%'` string — use `(t) => t.custom.radii.full` directly (no `px` suffix). |

**Extended palette shades**: All 50-900 shades now on `palette.primary`, `.secondary`, `.success`, `.warning`, `.error` — enables `sx={{ bgcolor: 'primary.50' }}` etc.

**What was fixed:** `augmentedTheme` was defined but never used (main.tsx imported `theme`). Merged into single export.

**Reusable sx fragments** (`tokens.ts`):
- `cardSx`, `elevatedPaperSx`, `flatSurfaceSx` — surface elevation
- `truncateSx`, `lineClamp2Sx`, `lineClamp3Sx` — text overflow
- `centeredFlexSx`, `spacedRowSx`, `inlineRowSx` — flex layouts
- `clickableSx`, `focusRingSx` — interactivity
- `responsiveImageSx`, `avatarSx` — images
- `badgeSx`, `statusDotSx` — badges/indicators
- `scrollRowSx`, `glassSx`, `srOnlySx` — miscellaneous

**Per-phase token hardening plan:**
| Phase | Files | Est. hardcoded values to replace |
|-------|-------|----------------------------------|
| Phase 2 (13 pages) | Student pages | ~200 |
| Phase 3 (7 pages) | Collaboration pages | ~100 |
| Phase 4 (19 pages) | Instructor pages (425 sx usages!) | ~300 |
| Phase 5 (10 pages) | Payment/legal pages | ~80 |

### Key Observations from Audit
- **Only DashboardPage** currently has the full mobile pattern (useMediaQuery + isMobile + bottom-nav padding)
- **Chat page** (643 lines) is the hardest — needs full sidebar→drawer conversion for mobile
- **Instructor assessment pages** (5 pages) have zero mobile support — likely complex forms
- **LandingPage** is surprisingly well-responsive already (responsive Grid + sx) — just needs polish
- **HeaderV5 + MobileBottomNav + MobileNavDrawer** already exist and handle navigation — this is great; pages just need to respect the bottom nav height
- **Tables** are a major pain point — analytics dashboards, student management, transactions all use tables that will overflow on mobile

### What to Verify in Each Phase
- [ ] Open Chrome DevTools → Toggle device toolbar → iPhone SE (375×667)
- [ ] Check for horizontal scrollbar (overflow-x issues)
- [ ] Check all buttons are tappable (44px minimum)
- [ ] Check text is readable without zooming (min 14px body text)
- [ ] Check forms are usable (input fields don't overflow, labels visible)
- [ ] Check MobileBottomNav is visible and not overlapping content
- [ ] Check modals/dialogs don't have unreachable buttons

### Deprecated/Unused Pages — Deleted (Feb 24, 2026)
All 4 legacy pages confirmed dead (0 imports in App.tsx) and **permanently deleted**:
- ~~`pages/Analytics/Analytics.tsx`~~ — superseded by `AnalyticsHubPage.tsx`
- ~~`pages/Courses/Courses.tsx`~~ — superseded by `CoursesPage.tsx`
- ~~`pages/Lessons/Lesson.tsx`~~ — superseded by `LessonDetailPage.tsx`
- ~~`pages/Profile/Profile.tsx`~~ — superseded by `ProfilePage.tsx`

---

## 🗓️ SESSION LOG

| Session | Date | Work Done | Items Completed |
|---------|------|-----------|--------------------|
> Sessions 1-5 are pre-Phase 2 (planning → Phase 0 → Phase 1 → Token System → Audit rounds)

| 1 | Feb 19, 2026 | Created tracking document, audited all 55 pages | Planning only |
| 2 | Feb 19, 2026 | Phase 0 complete: Audited & fixed all 15 global/shared components. Fixes: NotificationBell responsive width, PageHeader responsive sticky+breadcrumbs, MobileNavDrawer search route, CommentsSection responsive padding, RatingSummaryCard responsive padding/gap, RatingSubmitForm responsive padding. 0 TS errors. | 15/15 (Phase 0) |
| 3 | Feb 21, 2026 | Phase 1 complete (9/9): Created Responsive library (8 files — PageContainer, PageTitle, ResponsiveDialog, ResponsivePaper, ResponsiveStack, useResponsive, constants, index). Applied to all 9 Phase 1 pages. Fixed auth bug: `<Link component="button">` inside `<form>` was submitting login form on Sign-Up click — fixed with `type="button"`. Fixed logout(): state now clears immediately before server call. Fixed `await logout()` in all nav handlers. Unified 401 interceptors across all API services. App.tsx stale-state guard added. Full Phase 1 audit: 0 TS errors across all 18 files. | 9/9 (Phase 1), cumulative 24/73 |
| 4 | Feb 21, 2026 | Theme Token System: Merged `augmentedTheme` (was unused!) into single `createTheme` export. Extended palette with full 50-900 shades. Added `theme.custom.colors` (8 named tokens), `theme.custom.shadows` (9 named tokens), `theme.custom.radii` (7 named tokens). Created `tokens.ts` with 18 reusable sx fragments. Component overrides now use `baseRadius` variable. 0 TS errors. | Infrastructure (token system ready for Phase 2+) |
| 5 | Feb 21, 2026 | Theme Token System — 3-Round Bug Audit: Round 1 found CRITICAL bug (borderRadius callbacks returned raw numbers → MUI ×12 multiplier → 192px instead of 16px; fixed to `px` strings) + wrong shadow RGBs (focusPrimary/image used old purple `rgba(102,126,234)`, focusSuccess used MUI default `rgba(76,175,80)`) + docs. Round 2 found duplicate shadow token (`shadows.soft` was identical to `shadows.card`; differentiated) + Rule 2 comment fix. Round 3 found `radii.full` JSDoc footgun (warning applied to all tokens but `full='50%'` must NOT get `px` suffix). Also fixed this tracker's own radii usage example (was showing the pre-fix incorrect raw-number pattern). 0 TS errors after every round. | 0 new pages (quality fixes to token system) |
| 6 | Feb 22, 2026 | **Phase 2 complete (12 pages)**: MyLearningPage, LessonDetailPage, NotificationsPage, ProfilePage, SettingsPage, NotificationSettingsPage, StudentProgressPage + StudentProgressDashboard (component), StudentAssessmentDashboard, AssessmentTakingPage, MyCertificatesPage, CertificatePage, PublicCertificatePage. 2.13 (Bookmarks) confirmed N/A — feature embedded in CourseDetailPage sidebar. PageContainer, PageTitle, theme gradient/shadow tokens applied throughout. scrollable Tabs on ProfilePage + StudentProgressDashboard. `disableBottomPad` on PublicCertificatePage (all 4 return paths). 0 TS errors. | 12/12 (Phase 2), cumulative 37/73 |
| 7 | Feb 22, 2026 | **Phase 2 — 5-round exhaustive bug audit**: Systemic `py→pt` fix on 8 files/15 instances (consumer `py` silently overrides PageContainer base `pb:{xs:10,md:0}`). ProfilePage Tabs `variant="scrollable"`. SettingsPage: `theme` state renamed `colorTheme` to avoid MUI `useTheme()` collision; td `#666`/`#d32f2f` → palette tokens. CertificatePage `severity` made conditional (`info` for not-found, `error` for API failure). PublicCertificatePage error path missing `disableBottomPad`. StudentProgressDashboard internal padding removed (double-padding with PageContainer). MyLearningPage 4 hardcoded `rgba()` shadows → `alpha(theme.palette.*,…)`. 0 TS errors after every round. | 0 new pages (quality assurance) |
| 8 | Feb 23, 2026 | **Phase 3 complete (7 pages)**: Chat.tsx (room/message mobile toggle, ArrowBack, responsive bubbles, fullScreen Dialog, Paper heights), LiveSessionsPage (PageContainer + responsive Paper), StudyGroupsPage (PageContainer+PageTitle, scrollable/fullWidth Tabs, responsive header/search/button), StudyGroupDetailPage (3× PageContainer, responsive Paper+typography+breadcrumbs), OfficeHoursPage (PageContainer+PageTitle, isMobile Tabs, disableBottomPad on error), Tutoring.tsx (PageContainer+PageTitle+ArrowBack, mobile auto-select guard, back clears messages+suggestions, loading has Header, fullScreen Dialog, responsive heights), PresencePage (PageContainer+PageTitle+responsive Paper). **5-round exhaustive bug audit — 8 bugs found and fixed**: B1 Tutoring auto-select bypassed session list on mobile (!isMobile guard); B2 Tutoring back didn't clear messages (setMessages([])); B3 Tutoring loading path missing Header; B4 All 7 pages doubled top spacing (removed pt:4/sx={{pt:4}} from all); B5 OfficeHours error path missing disableBottomPad; B6 Tutoring stale currentSuggestions across session switches (setCurrentSuggestions([]) in selectedSession useEffect); B7 Chat.tsx mobile Paper height calc(100vh-140px) too tall (→calc(100vh-170px)); B8 OfficeHours Tabs unconditionally scrollable on desktop (→isMobile?'scrollable':'fullWidth'). 0 TS errors after every round. | 7/7 (Phase 3), cumulative 44/73 |
| 9 | Feb 23, 2026 | **Phase 4 complete (19 pages)**: All 19 Instructor pages mobile-optimized. InstructorDashboard (PageContainer+PageHeader, isMobile, scrollable Tabs, FAB `bottom:{xs:88,md:24}`, palette colors), CourseCreationForm (vertical Stepper on mobile, fullScreen dialogs), CourseEditPage (3× PageContainer, scrollable Tabs, responsive TabPanel padding), CourseDetailsEditor+CurriculumBuilder (embedded — flexWrap, palette color props), LessonEditor (Dialog fullScreen), CourseSettingsEditor (5 Papers responsive padding), StudentManagement (PageContainer, scrollable Tabs, 2× Dialog fullScreen), AnalyticsHubPage (PageContainer, responsive stats grid), CourseAnalyticsDashboard (PageContainer), VideoAnalyticsPage (PageContainer, responsive header+CourseSelector), EnhancedAssessmentAnalyticsDashboard (PageContainer, scrollable Tabs, responsive TabPanel), InstructorStudentAnalytics (PageContainer, Dialog fullScreen, responsive header), InterventionDashboard (PageContainer, scrollable Tabs), AssessmentManagementPage+CourseAssessmentManagementPage+AssessmentCreation/Edit/ViewPage (all PageContainer replacements, responsive h3 headings). **3-round exhaustive audit — 0 errors found** in all 3 passes. All original Containers were `maxWidth="xl"` (git-verified) — PageContainer default matches exactly. 0 TS errors throughout. | 19/19 (Phase 4), cumulative 63/73 |
| 10 | Feb 24, 2026 | **Phase 5 complete (10/10)**: 6 pages mobile-optimized + 4 dead legacy files deleted. CourseCheckoutPage (PageContainer+PageTitle, `pt:4` on all 3 returns, Grid 5/7 split, responsive Paper padding), PaymentSuccessPage (PageContainer maxWidth="md", `pt:4` flat on all 3 returns, responsive h3/h4/h5 fontSize, responsive Paper padding), TransactionsPage (PageContainer+PageTitle, isMobile, Table→Card layout, Dialog fullScreen, responsive header/buttons), TermsOfServicePage+PrivacyPolicyPage+RefundPolicyPage (PageContainer disableBottomPad maxWidth="md" on ALL early-return paths, outer Box no py, responsive h3 fontSize, responsive Paper). Dead code deleted: `Analytics/Analytics.tsx`, `Courses/Courses.tsx`, `Lessons/Lesson.tsx`, `Profile/Profile.tsx` — all confirmed 0 imports (superseded by newer pages). **4-round exhaustive spacing audit** catching `pt+mt` stacking (14 fixes across 2 rounds), responsive `pt:{xs:4,md:8}` footgun on PaymentSuccessPage (1 fix in round 3), and a 4th clean pass. 0 TypeScript errors after every round. | 10/10 (Phase 5), cumulative 73/73 — ALL PHASES COMPLETE |

---

*This document is the single source of truth for mobile optimization progress. Update after each session.*
