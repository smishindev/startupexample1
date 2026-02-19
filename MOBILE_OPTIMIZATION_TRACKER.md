# Mobile UI Optimization Tracker

**Created**: February 19, 2026  
**Last Updated**: February 19, 2026  
**Status**: Planning Phase — Implementation Not Started  
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

### MUI Breakpoint Reference (used throughout)
```
xs: 0px    — phones (portrait)
sm: 600px  — phones (landscape) / small tablets
md: 900px  — tablets
lg: 1200px — desktops
xl: 1536px — large desktops
```

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
| 0.1 | **HeaderV5** (auth header) | `components/Navigation/HeaderV5.tsx` | Has isMobile, MobileBottomNav, MobileNavDrawer. Review for edge cases | ⬜ Not Started |
| 0.2 | **PublicHeader** (guest header) | `components/Navigation/PublicHeader.tsx` | Has mobile drawer. Review completeness | ⬜ Not Started |
| 0.3 | **MobileBottomNav** | `components/Navigation/MobileBottomNav.tsx` | 147 lines, exists. Review touch targets & items | ⬜ Not Started |
| 0.4 | **MobileNavDrawer** | `components/Navigation/MobileNavDrawer.tsx` | 316 lines, exists. Review completeness | ⬜ Not Started |
| 0.5 | **Layout.tsx** (sidebar shell) | `components/Layout/Layout.tsx` | Has isMobile + responsive drawer. Used by some pages | ⬜ Not Started |
| 0.6 | **PublicLayout.tsx** | `components/Layout/PublicLayout.tsx` | Wraps /courses routes. Minimal — review | ⬜ Not Started |
| 0.7 | **PublicFooter** | `components/Layout/PublicFooter.tsx` | 159 lines, responsive Grid. Review stacking | ⬜ Not Started |
| 0.8 | **MegaMenuDropdown** | `components/Navigation/MegaMenuDropdown.tsx` | Desktop mega menu — review mobile behavior | ⬜ Not Started |
| 0.9 | **PageHeader** | `components/Navigation/PageHeader.tsx` | Shared page header — review responsiveness | ⬜ Not Started |
| 0.10 | **TermsConsentBanner** | `components/Legal/TermsConsentBanner.tsx` | Full-screen overlay — review mobile layout | ⬜ Not Started |
| 0.11 | **CourseSelector** | `components/Common/CourseSelector.tsx` | 406 lines, MUI Autocomplete — review mobile sizing | ⬜ Not Started |
| 0.12 | **SearchAutocomplete** | `components/Search/SearchAutocomplete.tsx` | 551 lines, two variants — review mobile dropdown | ⬜ Not Started |
| 0.13 | **NotificationBell** | `components/Notifications/NotificationBell.tsx` | Header bell icon — review mobile popover | ⬜ Not Started |
| 0.14 | **CommentsSection** | `components/Shared/CommentsSection.tsx` | Used in lessons — review mobile layout | ⬜ Not Started |
| 0.15 | **Rating Components** | `components/Rating/*.tsx` | 4 components — review mobile layout | ⬜ Not Started |

**Phase 0 Completion**: ⬜ 0/15

---

### PHASE 1: Critical Path (First Pages Every User Sees)
> Highest traffic, public-facing pages — optimize these first

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 1.1 | **Landing Page** | `pages/Landing/LandingPage.tsx` | `/` | Good — responsive Grid + sx. Needs bottom-nav pad, full audit | ⬜ Not Started |
| 1.2 | **Login** | `pages/Auth/Login.tsx` | `/login` | None — no responsive code | ⬜ Not Started |
| 1.3 | **Register** | `pages/Auth/Register.tsx` | `/register` | None — no responsive code | ⬜ Not Started |
| 1.4 | **Forgot Password** | `components/Auth/ForgotPasswordForm.tsx` | `/forgot-password` | Unknown — needs audit | ⬜ Not Started |
| 1.5 | **Reset Password** | `components/Auth/ResetPasswordForm.tsx` | `/reset-password` | Unknown — needs audit | ⬜ Not Started |
| 1.6 | **Email Verification** | `pages/Auth/EmailVerificationPage.tsx` | `/verify-email` | None — no responsive code | ⬜ Not Started |
| 1.7 | **Courses Catalog** | `pages/Courses/CoursesPage.tsx` | `/courses` | Partial — responsive Grid, no isMobile/bottom-nav | ⬜ Not Started |
| 1.8 | **Course Detail** | `pages/Course/CourseDetailPage.tsx` | `/courses/:id` | Partial — some responsive sx, needs full audit | ⬜ Not Started |
| 1.9 | **Dashboard** | `pages/Dashboard/DashboardPage.tsx` | `/dashboard` | Good — has isMobile + bottom-nav padding. Review completeness | ⬜ Not Started |

**Phase 1 Completion**: ⬜ 0/9

---

### PHASE 2: Core Student Experience
> Pages students use daily after signing up

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 2.1 | **My Learning** | `pages/Learning/MyLearningPage.tsx` | `/my-learning` | Partial — responsive Grid only | ⬜ Not Started |
| 2.2 | **Lesson Detail** | `pages/Course/LessonDetailPage.tsx` | `/courses/:id/lessons/:id` | Partial — some responsive sx | ⬜ Not Started |
| 2.3 | **Notifications** | `pages/Notifications/NotificationsPage.tsx` | `/notifications` | Partial — some responsive sx | ⬜ Not Started |
| 2.4 | **Profile** | `pages/Profile/ProfilePage.tsx` | `/profile` | Partial — responsive Grid | ⬜ Not Started |
| 2.5 | **Settings** | `pages/Settings/SettingsPage.tsx` | `/settings` | None — no responsive code | ⬜ Not Started |
| 2.6 | **Notification Settings** | `pages/Settings/NotificationSettingsPage.tsx` | `/settings/notifications` | Partial — xs={6} only, no multi-breakpoint | ⬜ Not Started |
| 2.7 | **Student Progress** | `pages/Progress/StudentProgressPage.tsx` | `/smart-progress` | None — no responsive code | ⬜ Not Started |
| 2.8 | **Student Assessments** | `pages/Assessment/StudentAssessmentDashboard.tsx` | `/my-assessments` | Partial — responsive Grid only | ⬜ Not Started |
| 2.9 | **Assessment Taking** | `pages/Assessment/AssessmentTakingPage.tsx` | `/assessments/:id` | None — no responsive code | ⬜ Not Started |
| 2.10 | **My Certificates** | `pages/Certificates/MyCertificatesPage.tsx` | `/my-certificates` | Partial — responsive Grid | ⬜ Not Started |
| 2.11 | **Certificate View** | `pages/Certificates/CertificatePage.tsx` | `/courses/:id/certificate` | Partial — some responsive sx | ⬜ Not Started |
| 2.12 | **Public Certificate** | `pages/Certificates/PublicCertificatePage.tsx` | `/certificate/:code` | Partial — some responsive sx | ⬜ Not Started |
| 2.13 | **Bookmarks** (if separate page) | — | — | Check if embedded in other pages | ⬜ Not Started |

**Phase 2 Completion**: ⬜ 0/13

---

### PHASE 3: Collaboration & Social Features
> Real-time interactive pages — complex mobile layouts

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 3.1 | **Chat / DM** | `pages/Chat/Chat.tsx` | `/chat` | None — 643 lines, fixed layout, NO mobile support | ⬜ Not Started |
| 3.2 | **Live Sessions** | `pages/LiveSessions/LiveSessionsPage.tsx` | `/live-sessions` | None — no responsive code | ⬜ Not Started |
| 3.3 | **Study Groups** | `pages/StudyGroups/StudyGroupsPage.tsx` | `/study-groups` | Partial — responsive Grid | ⬜ Not Started |
| 3.4 | **Study Group Detail** | `pages/StudyGroups/StudyGroupDetailPage.tsx` | `/study-groups/:id` | None — no responsive code | ⬜ Not Started |
| 3.5 | **Office Hours** | `pages/OfficeHours/OfficeHoursPage.tsx` | `/office-hours` | None — no responsive code | ⬜ Not Started |
| 3.6 | **AI Tutoring** | `pages/Tutoring/Tutoring.tsx` | `/tutoring` | Partial — responsive Grid | ⬜ Not Started |
| 3.7 | **Presence / Online Users** | `pages/Presence/PresencePage.tsx` | `/presence` | Partial — responsive Grid + sx | ⬜ Not Started |

**Phase 3 Completion**: ⬜ 0/7

---

### PHASE 4: Instructor Pages
> Instructor-facing tools — typically used on desktop but must work on mobile

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 4.1 | **Instructor Dashboard** | `pages/Instructor/InstructorDashboard.tsx` | `/instructor/dashboard` | Partial — responsive Grid, no isMobile | ⬜ Not Started |
| 4.2 | **Course Creation** | `pages/Instructor/CourseCreationForm.tsx` | `/instructor/courses/create` | Partial — responsive Grid | ⬜ Not Started |
| 4.3 | **Course Edit (Tabs)** | `pages/Instructor/CourseEditPage.tsx` | `/instructor/courses/:id/edit` | None — no responsive code | ⬜ Not Started |
| 4.4 | **Course Details Editor** | `pages/Instructor/CourseDetailsEditor.tsx` | (tab within edit) | Partial — responsive Grid | ⬜ Not Started |
| 4.5 | **Curriculum Builder** | `pages/Instructor/CurriculumBuilder.tsx` | (tab within edit) | None — no responsive code | ⬜ Not Started |
| 4.6 | **Lesson Editor** | `pages/Instructor/LessonEditor.tsx` | (within curriculum) | None — no responsive code | ⬜ Not Started |
| 4.7 | **Course Settings** | `components/Instructor/CourseSettingsEditor.tsx` | (tab within edit) | Unknown — needs audit | ⬜ Not Started |
| 4.8 | **Student Management** | `pages/Instructor/StudentManagement.tsx` | `/instructor/students` | Partial — responsive Grid | ⬜ Not Started |
| 4.9 | **Analytics Hub** | `pages/Instructor/AnalyticsHubPage.tsx` | `/instructor/analytics-hub` | Partial — responsive Grid | ⬜ Not Started |
| 4.10 | **Course Analytics** | `pages/Instructor/CourseAnalyticsDashboard.tsx` | `/instructor/analytics` | Partial — responsive Grid | ⬜ Not Started |
| 4.11 | **Video Analytics** | `pages/Instructor/VideoAnalyticsPage.tsx` | `/instructor/video-analytics` | Partial — responsive Grid | ⬜ Not Started |
| 4.12 | **Assessment Analytics** | `pages/Instructor/EnhancedAssessmentAnalyticsPage.tsx` | `/instructor/assessment-analytics` | None — no responsive code | ⬜ Not Started |
| 4.13 | **Student Analytics** | `pages/Instructor/InstructorStudentAnalytics.tsx` | `/instructor/student-analytics` | Partial — responsive Grid | ⬜ Not Started |
| 4.14 | **Intervention Dashboard** | `pages/Instructor/InterventionDashboard.tsx` | `/instructor/interventions` | Partial — responsive Grid | ⬜ Not Started |
| 4.15 | **Assessment Management** | `pages/Instructor/AssessmentManagementPage.tsx` | `/instructor/lessons/:id/assessments` | None — no responsive code | ⬜ Not Started |
| 4.16 | **Course Assessment Mgmt** | `pages/Instructor/CourseAssessmentManagementPage.tsx` | `/instructor/courses/:id/assessments` | Partial — responsive Grid | ⬜ Not Started |
| 4.17 | **Assessment Creation** | `pages/Instructor/AssessmentCreationPage.tsx` | `.../assessments/create` | None — no responsive code | ⬜ Not Started |
| 4.18 | **Assessment Edit** | `pages/Instructor/AssessmentEditPage.tsx` | `.../assessments/:id/edit` | None — no responsive code | ⬜ Not Started |
| 4.19 | **Assessment View** | `pages/Instructor/AssessmentViewPage.tsx` | `.../assessments/:id/view` | None — no responsive code | ⬜ Not Started |

**Phase 4 Completion**: ⬜ 0/19

---

### PHASE 5: Payment, Legal & Secondary Pages
> Less-frequent pages but must be mobile-friendly

| # | Page | File | Route | Current State | Status |
|---|------|------|-------|---------------|--------|
| 5.1 | **Course Checkout** | `pages/Payment/CourseCheckoutPage.tsx` | `/checkout/:id` | Partial — responsive Grid | ⬜ Not Started |
| 5.2 | **Payment Success** | `pages/Payment/PaymentSuccessPage.tsx` | `/payment/success` | None — no responsive code | ⬜ Not Started |
| 5.3 | **Transactions** | `pages/Profile/TransactionsPage.tsx` | `/transactions` | None — no responsive code | ⬜ Not Started |
| 5.4 | **Terms of Service** | `pages/Legal/TermsOfServicePage.tsx` | `/terms` | Partial — some responsive sx | ⬜ Not Started |
| 5.5 | **Privacy Policy** | `pages/Legal/PrivacyPolicyPage.tsx` | `/privacy` | Partial — some responsive sx | ⬜ Not Started |
| 5.6 | **Refund Policy** | `pages/Legal/RefundPolicyPage.tsx` | `/refund-policy` | Partial — some responsive sx | ⬜ Not Started |
| 5.7 | **Analytics (old)** | `pages/Analytics/Analytics.tsx` | (if used) | None — verify if still used | ⬜ Not Started |
| 5.8 | **Courses (old)** | `pages/Courses/Courses.tsx` | (if used) | None — verify if still used | ⬜ Not Started |
| 5.9 | **Lesson (old)** | `pages/Lessons/Lesson.tsx` | (if used) | None — verify if still used | ⬜ Not Started |
| 5.10 | **Profile (old)** | `pages/Profile/Profile.tsx` | (if used) | None — verify if still used | ⬜ Not Started |

**Phase 5 Completion**: ⬜ 0/10

---

## 📊 OVERALL PROGRESS

| Phase | Items | Completed | Progress |
|-------|-------|-----------|----------|
| **Phase 0**: Global Shell | 15 | 0 | ⬜ 0% |
| **Phase 1**: Critical Path | 9 | 0 | ⬜ 0% |
| **Phase 2**: Core Student | 13 | 0 | ⬜ 0% |
| **Phase 3**: Collaboration | 7 | 0 | ⬜ 0% |
| **Phase 4**: Instructor | 19 | 0 | ⬜ 0% |
| **Phase 5**: Secondary | 10 | 0 | ⬜ 0% |
| **TOTAL** | **73** | **0** | **⬜ 0%** |

---

## 🔧 COMMON PATTERNS TO APPLY

### Pattern 1: Page Container with Bottom-Nav Padding
```tsx
// EVERY authenticated page needs this
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

<Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3 }, pb: { xs: 10, md: 0 } }}>
  {/* Page content */}
</Container>
```

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
3. **Top-down approach** — optimize the outer shell, then page-specific content
4. **One page at a time** — fully optimize, verify at 375px, mark complete, move to next
5. **TypeScript 0 errors** after every change — verify with `npx tsc --noEmit`

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

### Deprecated/Unused Pages to Investigate
The following pages may be unused (old versions superseded by newer implementations):
- `pages/Analytics/Analytics.tsx` — possibly replaced by AnalyticsHubPage
- `pages/Courses/Courses.tsx` — possibly replaced by CoursesPage
- `pages/Lessons/Lesson.tsx` — possibly replaced by LessonDetailPage
- `pages/Profile/Profile.tsx` — possibly replaced by ProfilePage

**Action**: Verify if these are still routed in App.tsx. If not, skip optimization.

---

## 🗓️ SESSION LOG

| Session | Date | Work Done | Items Completed |
|---------|------|-----------|-----------------|
| 1 | Feb 19, 2026 | Created tracking document, audited all 55 pages | Planning only |
| 2 | — | — | — |
| 3 | — | — | — |

---

*This document is the single source of truth for mobile optimization progress. Update after each session.*
