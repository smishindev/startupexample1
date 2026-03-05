# Mishin Learn Platform - Component Registry

**Last Updated**: March 5, 2026 - Instructor Revenue Dashboard added (InstructorRevenueDashboard.tsx, instructorRevenueApi.ts, InstructorRevenueService.ts); Admin Dashboard 5 phases added (5 admin pages + adminApi.ts + AdminService.ts)
**Purpose**: Quick reference for all major components, their dependencies, and relationships

---

## 📖 HOW TO USE THIS REGISTRY

**When modifying a component:**
1. Find the component in the appropriate sub-file below
2. Check "Services Used" - these API calls might be affected
3. Check "Related Components" - these might break if you change this component
4. Check "Used By" - these pages/components depend on this one
5. Review "Common Issues" for known problems

---

## 📁 Registry Sub-Files

This registry has been split into focused sub-files for easier navigation:

### [REGISTRY_FEATURES.md](docs/registry/REGISTRY_FEATURES.md) (~2,200 lines)
Feature implementation details — multi-component features documented end-to-end:
- 📱 Responsive Component Library
- 🎨 Theme System (design tokens, reusable sx fragments)
- 🔽 CourseSelector (reusable course dropdown)
- ⭐ Course Ratings & Reviews System
- 🔄 Real-time Course Update Hooks
- 📜 Terms of Service, Privacy Policy & Refund Policy
- 🎓 Course Prerequisites & Settings Components
- 📘 TypeScript Type System
- 📦 Data Export System Components
- 💬 Chat System Components
- 💬 Comments System Components
- ⏰ Notification Scheduler Services
- 👥 Study Group Notification Features
- 🎓 Instructor Course Management
- 🏢 Office Hours Services

### [REGISTRY_PAGES.md](docs/registry/REGISTRY_PAGES.md) (~1,050 lines)
Route-level page components:
- 🎓 Live Sessions Components (InstructorSessionsList, StudentSessionsList, QueueDisplay)
- 🔔 Notifications Components (NotificationsPage)
- 💬 Chat Components (Chat page)
- 🤖 AI Tutoring Components (Tutoring page)
- 🎓 Learning Components (MyLearningPage)
- 🎯 PAGES — Entry Point Components:
  - Authentication Pages (Login, Register, ForgotPassword, etc.)
  - Notification Pages (NotificationsPage, NotificationSettingsPage)
  - Payment & Checkout Pages
  - TransactionsPage, ProfilePage
  - CourseDetailPage, CoursesPage
  - LessonDetailPage + Lesson Content Item Renderers (Feb 28, 2026)
  - InstructorDashboard, CourseAnalyticsDashboard, CoursePerformanceTable
  - **Admin Pages** (March 5, 2026): AdminDashboard, AdminUserManagement + AdminUserDetailDialog, AdminCourseManagement + AdminCourseDetailDialog, AdminRevenueDashboard, AdminReportsPage — all in `client/src/pages/Admin/`
  - **Instructor Revenue Dashboard** (March 5, 2026): `InstructorRevenueDashboard.tsx` — stat cards, monthly bar chart, course pie chart, course performance table (search+pagination), paginated transaction table (search/status/course/sort/detail dialog) — in `client/src/pages/Instructor/`

### [REGISTRY_COMPONENTS.md](docs/registry/REGISTRY_COMPONENTS.md) (~1,850 lines)
Shared components, services, hooks, and utilities:
- 🧩 Reusable Components (CourseCard, ShareDialog, EditSessionModal, VideoPlayer)
- 🔍 Search Autocomplete System
- 🎣 Custom Hooks (useOfficeHoursSocket)
- 🔌 API Service Classes (coursesApi, enrollmentApi, officeHoursApi, progressApi, BookmarkApi, videoProgressApi)
- 🛠️ Utility Functions (courseHelpers, formatUtils)
- 🟢 Presence System Components
- 🔄 Data Flow Examples
- 🔒 Privacy Enforcement
- 🗑️ Account Deletion Components
