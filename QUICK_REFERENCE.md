# 🚀 Quick Reference - Development Workflow

**Last Updated**: January 21, 2026 - Study Group Invitations Complete ✅

---

## 🎓 Instructor Course Management

**Unified Page Structure:**
- **Route**: `/instructor/edit/:courseId?tab=0`
- **4 Tabs**: Course Details | Lesson Details | Assessments | Settings
- **Legacy Route**: `/instructor/lessons/:id` → Auto-redirects to Lesson Details tab

**Course Form Fields:**
- Title (min 5 chars)
- Description (min 20 chars)  
- Category (10 options: programming, data_science, design, business, marketing, language, mathematics, science, arts, other)
- Level (4 options: beginner, intermediate, advanced, expert)
- Price (min 0)
- Thumbnail (max 5MB, images only)

**API Endpoints:**
- `GET /api/instructor/courses` - Returns courses with lowercase `level` field
- `PUT /api/instructor/courses/:id` - Update course (validates & normalizes level)
- `POST /api/instructor/courses` - Create course (validates & normalizes level)
- `GET /api/enrollment/my-enrollments` - **Instructor-aware**: Returns UNION ALL of teaching + enrolled courses
- `GET /api/courses/*` - All public catalog endpoints filter orphaned courses with `INNER JOIN Users`

**Instructor Enrollment Behavior (Fixed Jan 19, 2026):**
- Instructors can both teach courses AND enroll as students in other courses
- `/api/enrollment/my-enrollments` returns:
  - **Teaching courses**: Status='teaching', TimeSpent=0
  - **Student enrollments**: Status='active'/'completed', TimeSpent=seconds
- Frontend filters: "Enrolled" badge excludes Status='teaching'
- Course cards show "Continue Learning" for enrolled, "Manage" for teaching

**Orphaned Course Filtering (Fixed Jan 19, 2026):**
- Orphaned courses: InstructorId=NULL with Status='deleted'
- All 6 public course endpoints use `INNER JOIN Users u ON c.InstructorId = u.Id`
- Ensures category stats, level stats, and search results exclude deleted instructor courses
- Files: `server/src/routes/courses.ts` lines 71, 82, 149, 255, 291, 333

**Level Field Normalization:**
- Database: Stores lowercase (beginner, intermediate, advanced, expert)
- Backend: Normalizes all responses to lowercase
- Frontend: Expects lowercase, initializes with `.toLowerCase()`
- Validation: All inputs validated and lowercased before saving

**Navigation:**
- Dashboard → Edit: `/instructor/edit/:id`
- Dashboard → Analytics: `/instructor/analytics?courseId=:id`
- Dashboard → Students: `/instructor/students?courseId=:id`

---

## 🧪 TEST CREDENTIALS

**Instructor Account:**
```
Email: s.mishin.dev+ins1@gmail.com
Password: Aa123456
Role: Instructor
```

**Student Account 1:**
```
Email: s.mishin.dev+student1@gmail.com
Password: Aa123456
Role: Student
```

**Student Account 2:**
```
Email: s.mishin.dev+student2@gmail.com
Password: Aa123456
Role: Student
```

**Email Verification Testing (Dec 27, 2025):**
- Register new account → Receive email with 6-digit code
- Check Gmail inbox: s.mishin.dev@gmail.com
- Dialog appears: "Verify Now" or "Verify Later"
- Navigate to `/verify-email` or click banner "Verify Now"
- Enter code → Click "Verify Email"
- Welcome email sent on success
- Profile badge updates: "Email Verified ✓" (green)
- Banner disappears from dashboard
- Test resend: 60-second cooldown timer
- Test expired code: 24-hour expiry window
- Test invalid code: Error message display
- Database: `SELECT EmailVerificationCode, EmailVerificationExpiry, EmailVerified FROM Users WHERE Id=@id`

**Email Service Configuration:**
- Service: Gmail SMTP (Nodemailer)
- Account: s.mishin.dev@gmail.com
- App Password: tfjubtheusandbiy
- Templates: Verification (6-digit code), Welcome (post-verification)
- See: `server/src/services/EmailService.ts`

---

## 🔔 Notification System Quick Ref (Jan 21, 2026)

**Architecture**: Backend → Socket.IO → App.tsx → Zustand Store → Components

**Files**: `notificationStore.ts`, `App.tsx` (lines 104-203), `NotificationBell.tsx`, `NotificationsPage.tsx`

**Usage**: `const { notifications, unreadCount, markAsRead } = useNotificationStore();`

**Rules**: ❌ No socket listeners in components | ✅ Use store only

**Manual Test Endpoints (Added Jan 20-21, 2026):**
```powershell
# Assessment Due Reminders (requires instructor/admin JWT token)
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3001/api/notifications/test-assessment-reminders" `
  -Method POST -Headers $headers

# Weekly Progress Summary (requires instructor/admin JWT token)
Invoke-WebRequest -Uri "http://localhost:3001/api/notifications/test-weekly-summary" `
  -Method POST -Headers $headers

# Response format:
# { "success": true, "count": 5, "message": "Sent 5 notifications" }
```

**Cron Schedules:**
- **Assessment Due Reminders**: Daily at 9:00 AM UTC (`'0 9 * * *'`)
- **Weekly Progress Summary**: Monday at 8:00 AM UTC (`'0 8 * * 1'`)
- **Email Digest**: Daily at 8:00 AM UTC (existing)
- **Email Weekly Digest**: Monday at 8:00 AM UTC (existing)
- **Notification Queue**: Every 5 minutes (quiet hours processing)

---

## 🎨 Settings & Preferences

**Profile Testing:**
- Login with either account
- Navigate to `/profile` or click profile icon in header
- Test Personal Info, Password, Billing Address, Account Info tabs
- Upload avatar (JPEG/PNG/GIF/WebP, max 5MB)
- **OLD**: Configure notification preferences from Profile → Preferences tab (REMOVED Dec 29, 2025)
- **NEW**: Access notification settings via Header → Settings dropdown → Notifications
- Navigate to dedicated page: `/settings/notifications`
- **Hybrid Notification Control (Dec 29, 2025)**: 3-level system fully functional
  - **Global toggles**: Enable In-App Notifications, Enable Email Notifications
  - **5 Categories**: Progress Updates, Course Updates, Assessment Updates, Community Updates, System Alerts
  - **50+ Subcategories**: Individual in-app/email toggles for each notification type
  - **NULL inheritance**: Subcategory NULL = inherits from category toggle
  - **Quiet hours**: Notifications queued during specified time range
  - **Email digest**: None, Realtime, Daily (8 AM), Weekly (Monday 8 AM)
  - **Cron job**: Processes queue every 5 minutes
  - **UI**: 5 expandable accordion sections, professional MUI design (734 lines)
  - **Persistence**: All 64 settings save to database and persist across sessions

**Privacy Settings Testing (Dec 18, 2025, Verified Jan 10, 2026):**
- Navigate to Settings page (`/settings`)
- Test privacy controls:
  - **Profile Visibility**: Public / Students Only / Private ✅ WORKING
  - **Show Email**: Toggle to hide/show email in lists ✅ WORKING
  - **Show Progress**: Toggle to hide/show learning progress ✅ WORKING
  - **Allow Messages**: Toggle to enable/disable messaging ⚠️ NOT ENFORCED (chat disabled)
- Test privacy enforcement:
  - Student Management: Instructors see all emails (override) ✅
  - Course Detail: "Email not public" for hidden emails ✅
  - Progress viewing: 403 error for hidden progress ✅

**Timestamp Auto-Update Testing (Jan 12, 2026):**
- **Office Hours**: Student joins queue → Wait 2 minutes → Timestamp updates from "less than a minute ago" to "2 minutes ago" ✅
- **Notifications**: Open notifications page → Wait 1 minute → All timestamps auto-update ✅
- **Notification Bell**: Open header dropdown → Wait 1 minute → Timestamps update without closing/reopening ✅

---

## 🗑️ Account Deletion System (Jan 18-19, 2026)

**Feature**: Instructors can delete their accounts with 3 options for managing courses

**Access**: Settings → Privacy & Security → Delete Account (red danger zone)

**Flow**:
1. Click "Delete My Account" → Shows instructor decision dialog
2. Select course action: Archive All / Transfer All / Force Delete
3. If transfer: Select target instructor from dropdown
4. Password confirmation required before execution
5. Backend executes chosen action + soft-deletes user account

**Course Management Options:**
- **Archive All**: Changes course status to 'archived' (can be restored)
- **Transfer All**: Changes InstructorId to new instructor + logs in CourseOwnershipHistory
- **Force Delete**: Soft-deletes courses (Status='deleted', InstructorId=NULL)

**Security**:
- Password verification required before any action
- All operations in transaction (rollback on error)
- Audit logging in AccountDeletionLog table
- JWT token invalidated immediately

**Files**: 
- Backend: `AccountDeletionService.ts`, `account-deletion.ts` (routes)
- Frontend: `SettingsPage.tsx`, `InstructorDeletionDialog.tsx`, `CourseTransferDialog.tsx`, `ArchiveCoursesDialog.tsx`
- Database: `CourseOwnershipHistory`, `AccountDeletionLog` tables

**Email Notifications**:
- Account deletion confirmation (to deleted user)
- Course archive notification (to enrolled students)
- Course transfer notification (to students + new instructor)
- Course deletion warning (to students losing access)
- **Note**: These emails are **always sent** (bypass notification settings)
- Security/critical emails, not part of user-controllable notification triggers

**Testing Checklist**:
- [ ] Archive flow: Verify courses become Status='archived'
- [ ] Transfer flow: Verify ownership changes + history logged
- [ ] Force delete: Verify courses become orphaned (InstructorId=NULL)
- [ ] Password validation: Wrong password rejected
- [ ] Transaction safety: Error mid-process rolls back
- [ ] Student enrollments: Preserved after instructor deletion
- [ ] Email delivery: All 4 notification types sent successfully
- **Chat**: Send message → Wait 1 minute → Message time updates automatically ✅
- **AI Tutoring**: View session list → Wait 1 minute → "Updated X ago" changes ✅
- **My Learning**: View enrolled courses → Wait 1 minute → "Last accessed X ago" updates ✅
- **Update Interval**: All components update every 60 seconds
- **Memory Leaks**: Navigate away and back → No console errors, timers cleaned up ✅
  - Email filtering: 7 endpoints enforce ShowEmail ✅
- Appearance Settings (theme/language/fontSize): ⚠️ STORED ONLY, not yet applied to UI
- Run automated tests: `node test-privacy-settings.js` (93% pass rate)

**Use these accounts for:**
- Testing role-based features
- Office Hours (instructor creates schedule, student joins queue)
- **Live Sessions** (instructor creates/edits/deletes, student joins/leaves)
  - Test race condition protection: Multiple students join simultaneously (capacity enforced)
  - Test multi-device sync: Open same session in 2 tabs, changes appear instantly
  - Test validation: Try capacity=0, duration=0, reducing capacity below attendee count
  - Test real-time: Join/leave updates, session state changes (start/end/cancel/delete)
- Study Groups (both can create/join)
  - **Invite Users** (January 21, 2026): Members can invite others via search modal
    - Click Invite button (PersonAdd icon) on any group where you're a member
    - Search users by name/username/email (min 2 chars, 500ms debounce)
    - Self-invite prevented (you won't see yourself in results)
    - Invited users receive GroupInvites notification
    - All members notified when someone joins (GroupActivity notification)
  - **Test Invites**: ser@ser.com → Search for admin → Invite → Check admin's bell icon
  - **Test Member Joined**: Join group → All existing members get notification
- Presence System (test multi-user scenarios)
- Chat/messaging features
- **Privacy Features** (test instructor override, student-to-student blocking)
- **Notification Preferences** (test category/subcategory inheritance - Dec 29, 2025):
- Navigate to Header → Settings dropdown → Notifications (dedicated page)
- URL: `/settings/notifications`
- **Test Global Controls:**
  - Toggle "Enable In-App Notifications" OFF → All in-app notifications blocked
  - Toggle "Enable Email Notifications" OFF → All email notifications blocked
  - Change "Email Digest Frequency" → realtime/daily/weekly/never
- **Test Category Controls:**
  - Expand "Progress Updates" accordion
  - Toggle category OFF → All subcategories inherit (disabled)
  - Toggle category ON → Subcategories with NULL inherit (enabled)
- **Test Subcategory Overrides:**
  - Category: ON, Subcategory: Set to OFF → Only that subcategory disabled
  - Category: OFF, Subcategory: Set to ON → Only that subcategory enabled (override)
  - Category: ON, Subcategory: NULL → Inherits category (enabled)
- **Test Quiet Hours:**
  - Set start/end times (e.g., 22:00-08:00)
  - Trigger notification during quiet hours → Queued (not delivered)
  - Check database: `SELECT * FROM NotificationQueue WHERE Status='queued'`
  - Wait for quiet hours to end (or clear with X button)
  - Cron job delivers within 5 minutes
- **Test Persistence:**
  - Change multiple settings across all 5 categories
  - Click "Save Settings" → Toast confirmation
  - Refresh page → All settings should persist
- **Test UI:**
  - All 5 accordion sections expand/collapse correctly
  - Each subcategory shows 2 toggles: [In-App Switch] [Email Switch]
  - No React warnings in console
  - Professional MUI design with proper spacing/colors
- Trigger notification (join office hours, complete lesson)
- Verify notification queued (not delivered immediately)
- Check database: `SELECT * FROM NotificationQueue WHERE Status='queued'`
- Clear quiet hours (click X buttons) or wait for end time
- Within 5 minutes: Cron job delivers notifications
- Check bell icon: Notifications should appear
- Test type filtering: Disable "Progress Updates", complete lesson, verify no notification

**Email Notification & Trigger Testing (Dec 28-29, 2025):**
- **Active Triggers** (2/31):
  1. Lesson Completion → Student + Instructor emails
  2. Live Session Created → All enrolled students notified
- Navigate to Profile → Preferences tab
- Test delivery options:
  - **Realtime**: Complete lesson → Receive email immediately
  - **Daily Digest**: Change to daily → Check email at 8 AM UTC next day
  - **Weekly Digest**: Change to weekly → Check email Monday 8 AM UTC
- Test notification bell: Real-time updates via Socket.io (should update instantly)
- Test email tracking: Click links in email → Check analytics
- Test unsubscribe: Click unsubscribe link → Re-enable in preferences
- Check Gmail: s.mishin.dev@gmail.com
- Database verification: `SELECT * FROM Notifications WHERE UserId=X ORDER BY CreatedAt DESC LIMIT 5`
- Server logs: Look for "⏰ [CRON]" messages every 5 minutes

**Payment Testing (Dec 14-17, 2025):**
- Navigate to Transactions page (`/profile/transactions`)
- Pending transactions show green "Test Complete" button
- Click to simulate webhook completion (DEV ONLY)
- Invoice PDF generated automatically
- Download invoice with branded PDF (Mishin Learn purple theme)
- Stripe test card: 4242 4242 4242 4242, any future date, any CVC
- **Duplicate Prevention (Dec 17)**: Database constraint prevents multiple pending transactions
  - Only 1 pending transaction allowed per user+course combination
  - Frontend buttons disable during enrollment with loading states
  - Backend gracefully handles constraint violations

**Testing Duplicate Prevention:**
1. Open course checkout page
2. Click "Enroll Now" button rapidly multiple times
3. Verify: Only 1 pending transaction created (check Transactions page)
4. Database query: `SELECT * FROM Transactions WHERE Status='pending' AND UserId=@id`
5. Expected: Single row per course enrollment

**Bookmark Testing (Dec 18, 2025):**
- **CoursesPage**: All Courses, Enrolled, and Bookmarked tabs fully functional
- **CourseDetail**: Bookmark button now persists to database (previously broken)
- Test scenarios:
  1. Not logged in: Click bookmark → Shows warning toast
  2. Logged in: Click bookmark → Icon fills, success toast, persists on refresh
  3. Navigate to Bookmarked tab: Course appears in list
  4. Unbookmark from any page: Updates across all pages
  5. Database check: `SELECT * FROM Bookmarks WHERE UserId=@yourUserId`
- Features:
  - Authentication required
  - Duplicate prevention (UNIQUE constraint)
  - Real-time state updates
  - Snackbar feedback (success/error/warning)
  - Cross-page synchronization (via page refresh)

**Notifications Center Testing (Updated Jan 14, 2026):**
- **NotificationsPage** (`/notifications`): Full-page notification management
- **NotificationBell**: Enhanced dropdown with unread + queued counts
- **Architecture**: Centralized Zustand store + App.tsx socket listeners

**New Architecture:**
```
Zustand Store (client/src/stores/notificationStore.ts)
  ↓
App.tsx (lines 104-203) - Socket listeners
  ↓
Components (NotificationBell, NotificationsPage) - Read-only
```

**Test scenarios:**
  1. **Pagination**: Load 100+ notifications, verify 20 per page
  2. **Filtering**: Test All/Unread toggle, type filter (6 options), priority filter (4 options)
  3. **Real-time Sync**: Open two tabs, delete in one → removed from both
  4. **Cross-tab Updates**: Mark read in tab A → count updates in tab B (socket events)
  5. **Navigation**: Click notification with ActionUrl → navigates to target page
  6. **Queued Notifications**: Set quiet hours, trigger notification → appears in bell badge (blue)
  7. **Optimistic Updates**: Mark as read updates UI instantly (before API response)
  8. **Toast Notifications**: Urgent/high = 5s warning, normal/low = 3s info, with action buttons
  9. **No Duplicates**: Socket events are idempotent (wasUnread checks prevent double-decrement)
  10. **Auto-updating Timestamps**: "X minutes ago" updates every 60 seconds
  11. Database check: `SELECT * FROM Notifications WHERE UserId=@yourUserId ORDER BY CreatedAt DESC`
- Socket.IO events to verify:
  - `notification-created`: New notification appears instantly
  - `notification-read`: Read status syncs across tabs
  - `notifications-read-all`: All marked read syncs
  - `notification-deleted`: Delete syncs across tabs
- Features:
  - Server-side pagination (limit/offset)
  - Client-side pagination (20 items/page)
  - Type/priority filtering
  - Mark read/delete actions
  - Settings shortcut button
  - Text wrapping for long messages
  - Date display: "5 minutes ago" (relative time)

**Notification Triggers Testing (January 11, 2026):**
- **8 Active Triggers**: Test all automatic notification creation scenarios
- Test scenarios:
  1. **Course Enrollment**:
     - Enroll in a course → Student receives welcome notification
     - Instructor receives "New Student Enrolled" notification
     - Verify both in-app and email delivery (respects preferences)
  2. **New Lesson Created**:
     - Instructor creates new lesson in published course
     - All enrolled students (active + completed) receive notification
     - Verify completed students receive notifications too
  3. **Course Published**:
     - Instructor publishes draft course
     - All enrolled students receive "Course Now Available" notification
     - Verify both active and completed enrollments notified
  4. **Lesson Completion**:
     - Complete a lesson → Progress notification received
     - At 25%, 50%, 75%, 100% → Instructor receives milestone notification
  5. **Video Completion**:
     - Complete watching a video → Video completion notification
  6. **Live Session Created**:
     - Instructor creates live session → All enrolled students notified
  7. **Live Session Updated**:
     - Instructor edits session → Students notified of changes
  8. **Live Session Deleted**:
     - Instructor deletes session → Students notified of cancellation
- Database verification:
  - `SELECT * FROM Notifications WHERE Type='course' ORDER BY CreatedAt DESC`
  - `SELECT * FROM Enrollments WHERE Status IN ('active', 'completed')`
- Socket.IO verification:
  - Open browser console, watch for `notification-created` events
  - Bell icon count updates in real-time without refresh
- Email verification:
  - Check Gmail inbox: s.mishin.dev@gmail.com
  - Verify realtime/digest emails sent based on preferences
  - **Critical Bug Fixed**: Completed students now receive notifications AND can access content

**Presence & Logout Testing (January 12, 2026):**
- **Presence Page** (`/presence`): Real-time online users list with status management
- **Test Logout Cleanup**:
  1. Login as Student 1 → Navigate to Presence page
  2. Login as Instructor in different browser/incognito
  3. Instructor should see Student 1 as "online" (2 users total)
  4. Logout Student 1 → Instructor should see user count decrease to 1
  5. Verify: Student 1 no longer appears in online users list
  6. Database check: `SELECT * FROM UserPresence WHERE Status != 'offline'`
- **Test Status Persistence**:
  1. Login → Navigate to /presence
  2. Change status to "Away" → Refresh page → Should stay "Away" ✓
  3. Change status to "Busy" → Refresh page → Should stay "Busy" ✓
  4. Change status to "Offline" → Refresh page → Should stay "Offline" ✓ (FIXED Jan 12)
  5. Change status to "Online" → Refresh page → Should stay "Online" ✓
- **Test "Appear Offline" Feature**:
  1. Login and navigate to /presence
  2. Set status to "Offline" (while actually connected)
  3. Open incognito window, login as another user
  4. Verify: First user does NOT appear in online users list
  5. Refresh page in first browser → Status still "Offline"
  6. Socket connection still active (check console for heartbeat)
- **Test Concurrent Logout Prevention**:
  1. Login → Open browser console
  2. Rapidly click logout button multiple times
  3. Verify: Only 1 logout API call in Network tab (guard prevents duplicates)
  4. No errors in console
- **Test Socket Safety After Logout**:
  1. Login → Navigate to any page with socket features (Chat, Office Hours, Presence)
  2. Logout → Check console for errors
  3. Verify: No "socket is null" or "cannot read property of undefined" errors
  4. All socket emit calls safely check connection before emitting
- **Database Verification**:
  - `SELECT UserId, Status, LastSeenAt FROM UserPresence ORDER BY LastSeenAt DESC`
  - `SELECT Id, Email, EmailVerified FROM Users WHERE Email LIKE 's.mishin.dev+%'`
- **Socket.IO Events** (check browser console):
  - `presence-changed`: Status updates broadcast to all users
  - `presence-updated`: Personal confirmation after status change
  - Connection/disconnection logs show proper cleanup

---

## 📚 DOCUMENTATION FILES - WHAT TO READ WHEN

```
┌─────────────────────────────────────────────────────────────┐
│  When you need to...                  │  Read this file...   │
├─────────────────────────────────────────────────────────────┤
│  Understand HOW systems work          │  ARCHITECTURE.md     │
│  Find component dependencies          │  COMPONENT_REGISTRY  │
│  Make any code change                 │  PRE_FLIGHT_CHECKLIST│
│  See WHAT was built & when            │  PROJECT_STATUS.md   │
│  Troubleshoot common issues           │  COMPONENT_REGISTRY  │
│  Understand data flows                │  ARCHITECTURE.md     │
│  Find API endpoints                   │  ARCHITECTURE.md     │
│  Implement notification preferences   │  NOTIFICATION_PREFS  │
│  Test privacy features                │  test-privacy-*.js   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 STANDARD WORKFLOW (Every Change)

### 1️⃣ BEFORE Coding (5 minutes)
```bash
✓ Open PRE_FLIGHT_CHECKLIST.md
✓ Read Phase 1: Research & Planning
✓ Run grep_search to find all related files
✓ Check COMPONENT_REGISTRY.md for dependencies
```

### 2️⃣ WHILE Coding (Variable)
```bash
✓ Follow Phase 2: Implementation checklist
✓ Reference ARCHITECTURE.md for patterns
✓ Check COMPONENT_REGISTRY.md for examples
✓ Add proper error handling & loading states
```

### 3️⃣ AFTER Coding (10 minutes)
```bash
✓ Run get_errors() - Should be 0 errors
✓ Follow Phase 3: Verification checklist
✓ Check all related files still work
✓ Verify no TODOs left behind
```

### 4️⃣ BEFORE "Done" (5 minutes)
```bash
✓ Follow Phase 4: Documentation
✓ Follow Phase 5: Final Review
✓ Create testing checklist for user
✓ Update COMPONENT_REGISTRY if needed
```

---

## 🛠️ COMMON COMMANDS

### Find All Usages
```typescript
grep_search({
  query: "ComponentName",
  isRegexp: false,
  includePattern: "client/src/**"
})
```

### Check for TODOs
```typescript
grep_search({
  query: "TODO|FIXME|BUG",
  isRegexp: true,
  includePattern: "path/to/file.tsx"
})
```

### Check TypeScript Errors
```typescript
get_errors({
  filePaths: ["path/to/file.tsx"]
})
```

### Find API Calls
```typescript
grep_search({
  query: "/api/endpoint",
  isRegexp: false,
  includePattern: "client/src/services/**"
})
```

---

## 🚨 CRITICAL RULES (NEVER SKIP)

```
❌ NEVER change port numbers (3001 backend, 5173 frontend)
❌ NEVER track progress for instructors viewing their courses
❌ NEVER modify shared components without checking ALL usages
❌ NEVER remove database columns without checking ALL queries
❌ NEVER skip authentication checks for protected operations
```

---

## 🎯 QUICK CHECKS

### Before Modifying CourseCard (CRITICAL)
```bash
1. Check COMPONENT_REGISTRY.md → CourseCard section
2. Note: Used by 4+ pages (CoursesPage, MyLearningPage, Dashboard, etc.)
3. Grep for all usages: grep_search(query="CourseCard")
4. Test ALL pages after changes
```

### Before Changing API Response
```bash
1. Find API service file (e.g., coursesApi.ts)
2. Grep for all usages of that method
3. Check if response structure change affects consumers
4. Update TypeScript interfaces if needed
```

### Before Changing Database Query
```bash
1. Check database/schema.sql for column names (PascalCase)
2. Grep for all queries using that table
3. If column appears in 10+ files → It's a FEATURE
4. Verify new query returns expected data
```

---

## 📊 COMPONENT DEPENDENCY MAP (Quick Glance)

```
CourseDetailPage
├─ Services: coursesApi, enrollmentApi, progressApi, BookmarkApi
├─ Components: Header, ShareDialog
├─ State: authStore (Zustand)
└─ Used by: App.tsx (/courses/:courseId route)

CoursesPage
├─ Services: coursesApi, enrollmentApi, BookmarkApi
├─ Components: Header, CourseCard (SHARED!)
├─ State: authStore
└─ Used by: App.tsx (/courses route)

CourseCard (CRITICAL - SHARED)
├─ Utilities: getCategoryGradient, formatCategory, getLevelColor
├─ Used by: CoursesPage, MyLearningPage, Dashboard, etc.
└─ WARNING: Changes affect 4+ pages!

VideoPlayer
├─ Services: videoProgressApi
├─ Props: skipProgressTracking (true for instructors)
└─ Auto-saves every 5 seconds
```

---

## 🔍 TROUBLESHOOTING QUICK REFERENCE

### Bookmark Not Working
```bash
✓ Check: BookmarkApi import?
✓ Check: User logged in?
✓ Check: API call in handleBookmark()?
✓ Check: Backend route working?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Common Issues
```

### Progress Not Saving
```bash
✓ Check: Instructor preview mode? (should NOT save)
✓ Check: isInstructorPreview flag?
✓ Check: UserProgress record exists?
✓ See: ARCHITECTURE.md → Progress Tracking Flow
```

### Wrong Button Showing
```bash
✓ Check: enrollmentStatus.isInstructor value
✓ Check: course.isEnrolled value
✓ Check: API returning correct data?
✓ See: COMPONENT_REGISTRY.md → CourseDetailPage → Key Logic
```

---

## 📦 FILE STRUCTURE OVERVIEW

```
PROJECT ROOT
├─ ARCHITECTURE.md              ← System design & data flows
├─ COMPONENT_REGISTRY.md        ← Component details & dependencies
├─ PRE_FLIGHT_CHECKLIST.md      ← Development workflow checklist
├─ PROJECT_STATUS.md            ← Project history & what was built
├─ SESSION_SUMMARY_NOV_22.md    ← Latest session summary
├─ QUICK_REFERENCE.md           ← This file!
├─ client/
│  ├─ src/
│  │  ├─ pages/                 ← Page components (entry points)
│  │  ├─ components/            ← Reusable components
│  │  ├─ services/              ← API service classes
│  │  ├─ stores/                ← Zustand stores (authStore)
│  │  └─ utils/                 ← Utility functions
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ routes/                ← API endpoints
│  │  ├─ services/              ← Business logic
│  │  └─ middleware/            ← Auth, CSRF, etc.
│  └─ package.json
└─ database/
   └─ schema.sql                ← Database schema (source of truth)
```

---

## ⏱️ TIME ESTIMATES

```
┌──────────────────────────────────────────────┐
│ Activity                │ Time      │ Saves  │
├──────────────────────────────────────────────┤
│ Following checklist     │ 20-30 min │ 2-3 hr │
│ Checking dependencies   │ 5 min     │ 1 hr   │
│ Reading docs            │ 10 min    │ 30 min │
│ Proper error handling   │ 5 min     │ 1 hr   │
│ Writing tests (manual)  │ 10 min    │ 2 hr   │
└──────────────────────────────────────────────┘

Total overhead: ~1 hour per feature
Total savings: 6+ hours per feature
ROI: 6:1 time savings!
```

---

## 🎓 GOLDEN RULES

1. **Document WHILE coding**, not after
2. **Check dependencies BEFORE modifying**
3. **Test ALL related pages** after shared component changes
4. **Update docs** when code changes
5. **Follow checklist** for every change (no shortcuts!)

---

## 💡 REMEMBER

```
┌──────────────────────────────────────────────────────────┐
│ "Measure twice, cut once"                               │
│                                                          │
│ 10 minutes of research >>> 2 hours of debugging         │
│                                                          │
│ Good documentation >>> Good memory                       │
│                                                          │
│ Complete implementation >>> Quick hack                   │
└──────────────────────────────────────────────────────────┘
```

---

## 📞 QUICK HELP

**Can't find something?**
→ Use Ctrl+F in documentation files

**Component not in registry?**
→ Check ARCHITECTURE.md for patterns, then add to registry

**Breaking something?**
→ Check PRE_FLIGHT_CHECKLIST.md Phase 1.2 (find related code)

**Need pattern example?**
→ Check ARCHITECTURE.md "Common Patterns" section

**Have questions?**
→ Check COMPONENT_REGISTRY.md "Common Issues" sections

---

**Keep this file open while developing!** 📌
