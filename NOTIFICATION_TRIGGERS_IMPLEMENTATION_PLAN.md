# Notification Triggers - Full Implementation Plan

**Created**: December 28, 2025  
**Last Updated**: February 5, 2026  
**Status**: Complete (31/31 Implemented + Hybrid Controls Design)  
**Goal**: Integrate automatic notification creation throughout the application with granular user controls

---

## 📊 QUICK STATUS

| Category | Completed | Total | Progress |
|----------|-----------|-------|----------|
| **Progress Updates** | 3/3 | 3 | 100% ✅ |
| **Course Updates** | 8/7 | 7 | 114% ✅ |
| **Community Updates** | 8/9 | 9 | 89% 🔄 |
| **Assessment Updates** | 4/4 | 4 | 100% ✅ |
| **System Alerts** | 8/8 | 8 | 100% ✅ |
| **TOTAL** | **31/31** | **31** | **100%** 🎉 |

**Latest Addition**: Direct Message Notifications - Chat System Rebuild (Community, February 5, 2026) 💬

---

## 🎛️ HYBRID NOTIFICATION CONTROL SYSTEM

### **Architecture Overview**

**User Experience Philosophy:**
- Users can control **in-app notifications** and **email notifications** independently
- **Category-level toggles** provide broad control (5 main categories)
- **Subcategory toggles** provide granular control for common notification types
- **Global master toggles** for one-click disable of all notifications

### **Control Hierarchy**

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL CONTROLS (Master Toggles)                           │
├─────────────────────────────────────────────────────────────┤
│  • Enable In-App Notifications (Bell icon)                  │
│  • Enable Email Notifications (Email delivery)              │
│  • Email Digest Frequency (realtime/daily/weekly/none)      │
│  • Quiet Hours (affects both in-app and email)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CATEGORY CONTROLS (5 Main Categories)                      │
├─────────────────────────────────────────────────────────────┤
│  1. Progress Updates                                         │
│  2. Course Updates                                           │
│  3. Community Updates                                        │
│  4. Assessment Updates                                       │
│  5. System Alerts                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SUBCATEGORY CONTROLS (Granular - Optional)                 │
├─────────────────────────────────────────────────────────────┤
│  Progress Updates ▼                                          │
│    → Lesson Completion (in-app ☑ | email ☑)                │
│    → Video Completion (in-app ☑ | email ☐)                 │
│    → Course Milestones (in-app ☑ | email ☑)                │
│                                                              │
│  Course Updates ▼                                            │
│    → New Lessons (in-app ☑ | email ☑)                      │
│    → Live Sessions (in-app ☑ | email ☑)                    │
│    → Instructor Announcements (in-app ☑ | email ☑)         │
│                                                              │
│  Community Updates ▼                                         │
│    → Comments & Replies (in-app ☑ | email ☐)               │
│    → Mentions (in-app ☑ | email ☑)                         │
│    → Group Activity (in-app ☑ | email ☐)                   │
│                                                              │
│  Assessment Updates ▼                                        │
│    → Assessment Graded (in-app ☑ | email ☑)                │
│    → Due Date Reminders (in-app ☑ | email ☑)               │
│    → Feedback Received (in-app ☑ | email ☑)                │
└─────────────────────────────────────────────────────────────┘
```

### **Logic Flow**

```typescript
When creating notification:
1. Check Global → EnableInAppNotifications? 
   → NO: Skip in-app notification
   → YES: Continue
   
2. Check Category → EnableProgressUpdates?
   → NO: Skip notification
   → YES: Continue
   
3. Check Subcategory (if exists) → EnableLessonCompletion?
   → NO: Skip notification
   → YES: Create in-app notification
   
4. Check Email Global → EnableEmailNotifications?
   → NO: Skip email
   → YES: Continue
   
5. Check Email Subcategory (if exists) → EmailLessonCompletion?
   → NO: Skip email
   → YES: Send email based on digest frequency
```

---

## 📧 EMAIL NOTIFICATION TRIGGERS - USER REFERENCE

### **What Triggers Emails?**

Users receive email notifications (based on their preferences) when these events occur:

#### ✅ **All Implemented (31 triggers)** 🎉
1. **Lesson Completed** - Student completes any lesson → Email to student + instructor (at milestones)
2. **Video Completed** - Student finishes watching video → Email to student (January 8, 2026)
3. **Live Session Created** - Instructor schedules session → Email to all enrolled students
4. **Live Session Updated** - Instructor edits session → Notification to all enrolled students (January 6, 2026)
5. **Live Session Deleted** - Instructor deletes session → Notification to all enrolled students (January 6, 2026)
6. **Live Session Cancelled** - Instructor cancels session → Notification to all enrolled students (January 6, 2026)
7. **Live Session Starting Soon** - Cron job checks every 15 minutes for sessions starting in 1 hour → Email to all enrolled students (February 4, 2026) ⏰
8. **Course Enrollment** - Student enrolls in course → Email to student + instructor (January 11, 2026)
9. **New Lesson Created** - Instructor adds lesson → Email to all enrolled students (active + completed) (January 11, 2026)
10. **Course Published** - Instructor publishes course → Email to all enrolled students (active + completed) (January 11, 2026)
11. **Assessment Created** - Instructor creates assessment → Email to all enrolled students (January 12, 2026)
12. **Assessment Submitted** - Student submits assessment → Confirmation to student + instructor alert (January 12, 2026)
13. **Assessment Graded** - Instructor grades submission → Email to student with score/feedback (January 12, 2026)
14. **Course Completion** - Student reaches 100% progress → Congratulations with certificate link (January 15, 2026) 🎉
15. **Payment Receipt** - Payment successfully processed → Notification with transaction details (January 15, 2026) 💳
16. **Refund Confirmation** - Refund processed → Notification with refund amount and timeline (January 15, 2026) 💰
17. **Password Changed** - User changes password → Security alert notification (January 17, 2026) 🔒
18. **Office Hours Completed** - Session ends → Summary notification with duration (January 17, 2026) 🕒
19. **Assessment Due Date Reminders** - Cron job checks daily for assessments due in 2 days → Email to students without submissions (January 20, 2026) ⏰
20. **Weekly Progress Summary** - Cron job sends weekly activity summary every Monday → Email to all active students with activity in past 7 days (January 21, 2026) 📊
21. **Study Group Invitation** - Member invites user to join group → Notification to invited user (January 21, 2026) 👥
22. **Study Group Member Joined** - User joins study group → Notification to all existing members (January 21, 2026) 👥
23. **Study Group Role Promotion** - Member promoted to admin → Notification to promoted member (February 2, 2026) 👥
24. **New Comment on Course/Lesson** - Student posts top-level comment → Notification to all enrolled participants + instructor (excludes author) (January 31, 2026) 💬
25. **AI Tutoring Response** - AI tutor answers user question → Notification with session link (February 3, 2026) 🤖
26. **Account Deletion Request** - Admin submits deletion request → Email & in-app notifications to user (February 4, 2026) 🚨
27. **At-Risk Student Detection** - Cron job detects struggling students → Notification to instructor (February 4, 2026) ⏰
28. **Comment Reply** - User replies to comment → Notification to parent comment author (January 31, 2026) 💬
29. **Study Group Message** - Member posts in study group → Notification to all members (January 21, 2026) 👥
30. **Direct Message Received** - User receives direct message → Notification to offline recipient (February 5, 2026) 💬
31. **Instructor Direct Message** - Instructor sends direct message → Notification to student (February 5, 2026) 💬

**Email Delivery Options** (Profile → Preferences):
- **Real-time**: Immediate email for each event
- **Daily Digest**: One summary email per day (8 AM)
- **Weekly Digest**: One summary email per week (Monday 8 AM)
- **None**: In-app notifications only

**Unsubscribe**: Click unsubscribe link in any email (can re-enable in profile)

---

## 📋 EXECUTIVE SUMMARY

**Current State:**
- ✅ Twenty-nine notification triggers implemented (Lesson, Video, Live Sessions x4, Course Management x3, Assessments x4, Course Completion, Payment x2, Password Changed, Office Hours, Study Groups x3, New Comments, AI Tutoring, At-Risk Detection, Live Session Reminders, Account Deletion)
- ✅ **Automated Testing**: Comprehensive Playwright test suite for comment notifications (11 tests, 100% coverage)
- ❌ 2 additional notification triggers NOT implemented

**What's Missing:**
Direct message notifications (2 triggers)

**Estimated Effort:** 2-3 hours remaining for final triggers
---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Student Progress Notifications (3-4 hours)
**Priority: HIGH** - Most common user actions

### Phase 2: Instructor & Course Management (4-5 hours)
**Priority: MEDIUM** - Administrative actions

### Phase 3: Community & Collaboration (2-3 hours)
**Priority: LOW** - Social features

---

## 📊 COMPLETE NOTIFICATION CATALOG

**Total Triggers Identified: 31**
- Phase 1 (Student Progress): 5 triggers
- Phase 2 (Course Management): 11 triggers  
- Phase 3 (Community): 10 triggers
- Infrastructure: 5 scheduled jobs

**Implementation Status:**
- ✅ **ALL IMPLEMENTED**: 31 triggers (100% complete) 🎉
  - Lesson Completion (Student + Instructor notifications) - December 29, 2025
  - Video Completion (Student notification) - January 8, 2026
  - Live Session Created (Student notifications) - Pre-existing
  - Live Session Updated (Student notifications) - January 6, 2026
  - Live Session Deleted (Student notifications) - January 6, 2026
  - Live Session Cancelled (Student notifications) - January 6, 2026
  - Course Enrollment (Student + Instructor notifications) - January 11, 2026
  - New Lesson Created (All enrolled students) - January 11, 2026
  - Course Published (All enrolled students) - January 11, 2026
  - Assessment Created (All enrolled students) - January 12, 2026
  - Assessment Submitted (Student confirmation + Instructor alert) - January 12, 2026
  - Assessment Graded (Student with score/feedback) - January 12, 2026
  - Course Completion (Student certificate + congratulations) - January 15, 2026
  - Payment Receipt (Student confirmation) - January 15, 2026
  - Refund Confirmation (Student notification) - January 15, 2026
  - Password Changed (Security alert) - January 17, 2026
  - Office Hours Queue Join (Instructor notification) - Pre-existing
  - Office Hours Completed (Session summary with duration) - January 17, 2026
  - Assessment Due Date Reminders (Cron job - daily at 9 AM UTC) - January 20, 2026
  - Weekly Progress Summary (Cron job - Monday 8 AM UTC) - January 21, 2026
  - Study Group Invitation (Invitation notification) - January 21, 2026
  - Study Group Member Joined (Member join notification) - January 21, 2026
  - New Comment on Course/Lesson (All course participants) - January 31, 2026
  - Study Group Role Promotion (Promoted member notification) - February 2, 2026
  - AI Tutoring Response (Student notification) - February 3, 2026
  - Live Session Starting Soon (Cron job - every 15 min) - February 4, 2026
  - At-Risk Student Detection (Cron job - Monday 10 AM UTC) - February 4, 2026
  - **Account Deletion** (Admin in-app + email notifications) - February 4, 2026 🚨
  - **Direct Message Received** (Offline message notification) - February 5, 2026 💬
  - **Instructor Direct Message** (Student notification) - February 5, 2026 💬
- ✅ **All Triggers Implemented**: 31/31 (100%) 🎉

---

## 📑 SECTION 1: STUDENT PROGRESS NOTIFICATIONS

### 1.1 Lesson Completion
**File**: `server/src/routes/progress.ts`  
**Endpoint**: `POST /api/progress/lessons/:lessonId/complete`  
**Line**: ~260

**Triggers:**
- ✅ **Student**: Progress achievement notification
- ✅ **Instructor**: Course progress update (configurable threshold)

**Notification Details:**
```typescript
// To Student
type: 'progress'
priority: 'normal'
title: 'Lesson Completed!'
message: 'Great work! You completed "{lessonTitle}" in {courseTitle}. Progress: {courseProgress}%'
actionUrl: '/courses/{courseId}'
actionText: 'Continue Learning'

// To Instructor (only at milestones: 25%, 50%, 75%, 100%)
type: 'progress'
priority: 'normal'
title: 'Student Progress Milestone'
message: '{studentName} reached {milestone}% completion in "{courseTitle}"'
actionUrl: '/instructor/students/{studentId}'
actionText: 'View Progress'
```

**Implementation:**
```typescript
// After updateCourseProgress(userId, courseId)
import { NotificationService } from '../services/NotificationService';

// Get updated progress
const courseProgress = await getCourseProgress(userId, courseId);

// Notify student
await NotificationService.createNotification({
  userId,
  type: 'progress',
  priority: 'normal',
  title: 'Lesson Completed!',
  message: `Great work! You completed "${lesson[0].Title}". Course progress: ${courseProgress}%`,
  actionUrl: `/courses/${courseId}`,
  actionText: 'Continue Learning'
});

// Notify instructor at milestones
if ([25, 50, 75, 100].includes(Math.floor(courseProgress))) {
  const instructorId = await getInstructorId(courseId);
  const studentName = await getUserName(userId);
  
  await NotificationService.createNotification({
    userId: instructorId,
    type: 'progress',
    priority: 'normal',
    title: 'Student Progress Milestone',
    message: `${studentName} reached ${Math.floor(courseProgress)}% in this course`,
    actionUrl: `/instructor/students/${userId}`,
    actionText: 'View Progress'
  });
}
```

---

### 1.2 Video Lesson Completion
**File**: `server/src/routes/videoProgress.ts`  
**Endpoint**: `POST /api/video-progress/:videoLessonId/complete`  
**Line**: ~246

**Status**: ✅ **IMPLEMENTED** - January 8, 2026

**Triggers:**
- ✅ **Student**: Video completion notification

**Notification Details:**
```typescript
type: 'progress'
priority: 'low'
title: 'Video Completed!'
message: 'You finished watching the video in "{lessonTitle}". Duration: {durationMinutes} minutes'
actionUrl: '/courses/{courseId}/lessons/{lessonId}'
actionText: 'Continue to Next Lesson'
category: 'progress'
subcategory: 'VideoCompletion'
```

**Implementation:**
```typescript
// After marking video complete and analytics tracking
const io = req.app.get('io');
const notificationService = new NotificationService(io);

await notificationService.createNotificationWithControls(
  {
    userId: userId!,
    type: 'progress',
    priority: 'low',
    title: 'Video Completed!',
    message: `You finished watching the video in "${lessonTitle}". Duration: ${durationMinutes} minutes`,
    actionUrl: `/courses/${courseId}/lessons/${lessonId}`,
    actionText: 'Continue to Next Lesson'
  },
  {
    category: 'progress',
    subcategory: 'VideoCompletion'
  }
);
```

---

### 1.3 Course Enrollment
**File**: `server/src/routes/enrollment.ts`  
**Endpoint**: `POST /api/courses/:courseId/enroll`  
**Line**: ~260, ~390

**Status**: ✅ **IMPLEMENTED** - January 11, 2026

**Triggers:**
- ✅ **Student**: Welcome notification
- ✅ **Instructor**: New enrollment notification

**Notification Details:**
```typescript
// To Student
type: 'course'
priority: 'high'
title: 'Welcome to {courseTitle}!'
message: 'You're now enrolled! Start with the first lesson and track your progress.'
actionUrl: '/courses/{courseId}'
actionText: 'Start Learning'
category: 'course'
subcategory: 'CourseEnrollment'

// To Instructor
type: 'course'
priority: 'normal'
title: 'New Student Enrolled'
message: '{studentName} enrolled in "{courseTitle}"'
actionUrl: '/instructor/courses/{courseId}/students'
actionText: 'View Students'
category: 'course'
subcategory: 'CourseEnrollment'
```

**Implementation:**
```typescript
// After enrollment creation
const io = req.app.get('io');
const notificationService = new NotificationService(io);

// Notify student
await notificationService.createNotificationWithControls(
  {
    userId: userId!,
    type: 'course',
    priority: 'high',
    title: `Welcome to ${course[0].Title}!`,
    message: `You're now enrolled! Start with the first lesson and track your progress.`,
    actionUrl: `/courses/${courseId}`,
    actionText: 'Start Learning'
  },
  { category: 'course', subcategory: 'CourseEnrollment' }
);

// Notify instructor
await notificationService.createNotificationWithControls(
  {
    userId: instructorId,
    type: 'course',
    priority: 'normal',
    title: 'New Student Enrolled',
    message: `${studentName} enrolled in "${course[0].Title}"`,
    actionUrl: `/instructor/courses/${courseId}/students`,
    actionText: 'View Students'
  },
  { category: 'course', subcategory: 'CourseEnrollment' }
);
```

**Important Note:** Also handles re-enrollment after cancellation with appropriate messaging.

---

### 1.4 Assessment Submission
**File**: `server/src/routes/assessments.ts`  
**Endpoint**: `POST /api/assessments/submissions/:submissionId/submit`  
**Line**: ~960

**Status**: ✅ **IMPLEMENTED** - January 12, 2026

**Triggers:**
- ✅ **Student**: Submission confirmation with score
- ✅ **Instructor**: New submission alert (for essay/code types or failed attempts)

**Notification Details:**
```typescript
// To Student
type: 'assignment'
priority: 'normal'
title: 'Assessment Submitted'
message: 'Your "{assessmentTitle}" submission was received. You\'ll be notified when graded.'
actionUrl: '/courses/{courseId}/assessments/{assessmentId}'
actionText: 'View Submission'

// To Instructor
type: 'assignment'
priority: 'high'
title: 'New Submission to Grade'
message: '{studentName} submitted "{assessmentTitle}". {pendingCount} total pending.'
actionUrl: '/instructor/assessments/{assessmentId}/submissions'
actionText: 'Grade Now'
```

---

### 1.5 Assessment Grading
**File**: `server/src/routes/assessments.ts`  
**Endpoint**: `PATCH /api/assessments/submissions/:submissionId/grade` (NEW ENDPOINT CREATED)
**Line**: ~1083

**Status**: ✅ **IMPLEMENTED** - January 12, 2026

**Triggers:**
- ✅ **Student**: Grade received notification with score and feedback

**Notification Details:**
```typescript
type: 'progress'
priority: 'high'
title: 'Assessment Graded!'
message: 'You scored {score}% on "{assessmentTitle}". {feedback}'
actionUrl: '/courses/{courseId}/assessments/{assessmentId}'
actionText: 'View Feedback'
```

---

## 📚 PHASE 2: INSTRUCTOR & COURSE MANAGEMENT

### 2.1 New Lesson Created
**File**: `server/src/routes/lessons.ts`  
**Endpoint**: `POST /api/lessons` (Line ~263)

**Status**: ✅ **IMPLEMENTED** - January 11, 2026

**Triggers:**
- ✅ **All enrolled students (active + completed)**: New content notification

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'New Lesson Available!'
message: 'New lesson added to "{courseTitle}": {lessonTitle}'
actionUrl: '/courses/{courseId}'
actionText: 'Check it Out'
category: 'course'
subcategory: 'NewLessons'
```

**Implementation:**
```typescript
// After lesson creation
const io = req.app.get('io');
const notificationService = new NotificationService(io);

// Get enrolled students (active AND completed)
const enrolledStudents = await db.query(`
  SELECT DISTINCT UserId FROM dbo.Enrollments 
  WHERE CourseId = @courseId AND Status IN ('active', 'completed')
`, { courseId });

// Notify each enrolled student
for (const student of enrolledStudents) {
  await notificationService.createNotificationWithControls(
    {
      userId: student.UserId,
      type: 'course',
      priority: 'normal',
      title: 'New Lesson Available!',
      message: `New lesson added to "${courseTitle}": ${title}`,
      actionUrl: `/courses/${courseId}`,
      actionText: 'Check it Out'
    },
    { category: 'course', subcategory: 'NewLessons' }
  );
}
```

**Important Note:** Query includes both `'active'` and `'completed'` enrollments because students who completed the course should still receive notifications about new content.

---

### 2.2 Course Published
**File**: `server/src/routes/instructor.ts`  
**Endpoint**: `POST /api/instructor/courses/:id/publish` (Line ~365)

**Status**: ✅ **IMPLEMENTED** - January 11, 2026

**Triggers:**
- ✅ **Enrolled students (active + completed)**: Course published notification

**Notification Details:**
```typescript
type: 'course'
priority: 'high'
title: 'Course Now Available'
message: '"{courseTitle}" is now published and ready to start'
actionUrl: '/courses/{courseId}'
actionText: 'Start Learning'
category: 'course'
subcategory: 'CoursePublished'
```

**Implementation:**
```typescript
// After publishing course
const io = req.app.get('io');
const notificationService = new NotificationService(io);

// Get enrolled students (active AND completed)
const enrolledStudents = await db.query(`
  SELECT DISTINCT UserId FROM dbo.Enrollments 
  WHERE CourseId = @courseId AND Status IN ('active', 'completed')
`, { courseId });

// Notify each enrolled student
for (const student of enrolledStudents) {
  await notificationService.createNotificationWithControls(
    {
      userId: student.UserId,
      type: 'course',
      priority: 'high',
      title: 'Course Now Available',
      message: `"${courseTitle}" is now published and ready to start`,
      actionUrl: `/courses/${courseId}`,
      actionText: 'Start Learning'
    },
    { category: 'course', subcategory: 'CoursePublished' }
  );
}
```

**Important Note:** Query includes both `'active'` and `'completed'` enrollments to notify all students who have access to the course.

---

### 2.3 Assessment Created
**File**: `server/src/routes/assessments.ts`  
**Endpoint**: `POST /api/assessments` (Line ~524)

**Triggers:**
- ✅ **Enrolled students**: New assessment notification

**Notification Details:**
```typescript
type: 'assignment'
priority: 'high'
title: 'New Assessment Available'
message: 'New assessment "{assessmentTitle}" in "{courseTitle}". Due: {dueDate}'
actionUrl: '/courses/{courseId}/assessments/{assessmentId}'
actionText: 'View Assessment'
```

---

### 2.4 Assessment Graded
**File**: `server/src/routes/assessments.ts`  
**Endpoint**: Create `PATCH /api/assessments/submissions/:submissionId/grade`

**Triggers:**
- ✅ **Student**: Grade received notification

**Notification Details:**
```typescript
type: 'progress'
priority: 'high'
title: 'Assessment Graded!'
message: 'You scored {score}% on "{assessmentTitle}". {feedback}'
actionUrl: '/courses/{courseId}/assessments/{assessmentId}'
actionText: 'View Feedback'
```

---

### 2.5 Payment Successful
**File**: `server/src/routes/payments.ts`  
**Webhook handler**: `handlePaymentIntentSucceeded` (Line ~240)

**Triggers:**
- ✅ **Student**: Purchase confirmation notification

**Notification Details:**
```typescript
type: 'course'
priority: 'high'
title: 'Course Purchase Successful!'
message: 'Welcome to "{courseTitle}"! You\'re now enrolled and ready to start learning'
actionUrl: '/courses/{courseId}'
actionText: 'Start Learning'
```

**Implementation Note:** Email already sent via `sendPurchaseConfirmationEmail()`, add in-app notification.

---

### 2.6 Refund Processed
**File**: `server/src/routes/payments.ts`  
**Endpoint**: `POST /api/payments/request-refund` (Line ~515)

**Triggers:**
- ✅ **Student**: Refund confirmation notification
- ✅ **Admin**: Refund request notification

**Notification Details:**
```typescript
// To Student
type: 'course'
priority: 'normal'
title: 'Refund Processed'
message: 'Your refund for "{courseTitle}" has been processed. Amount: ${amount}'
actionUrl: '/transactions'
actionText: 'View Transactions'

// To Admin
type: 'course'
priority: 'high'
title: 'Refund Request'
message: '{studentName} requested refund for "{courseTitle}". Amount: ${amount}'
actionUrl: '/admin/refunds'
actionText: 'Review Request'
```

---

### 2.7 Assignment Due Date Approaching
**File**: `server/src/services/NotificationScheduler.ts` (NEW SERVICE)  
**Trigger**: Cron job (daily at 9 AM UTC)

**Logic:**
```typescript
// Find all assignments due in 2 days
SELECT a.Id, a.Title, a.DueDate, e.UserId, c.Title as CourseTitle
FROM Assessments a
JOIN Courses c ON a.CourseId = c.Id
JOIN Enrollments e ON e.CourseId = c.Id
LEFT JOIN AssessmentSubmissions sub ON sub.AssessmentId = a.Id AND sub.UserId = e.UserId
WHERE a.DueDate BETWEEN GETUTCDATE() AND DATEADD(day, 2, GETUTCDATE())
  AND sub.Id IS NULL  -- Not yet submitted

// Create notification for each student
type: 'assignment'
priority: 'urgent'
title: 'Assignment Due Soon!'
message: '"{assessmentTitle}" is due in 2 days ({dueDate})'
actionUrl: '/courses/{courseId}/assessments/{assessmentId}'
actionText: 'Work on Assignment'
```

---

### 2.8 At-Risk Student Detection ✅ **IMPLEMENTED** (February 4, 2026)
**Files**: 
- `server/src/services/NotificationHelpers.ts` (getAtRiskStudents function)
- `server/src/services/NotificationScheduler.ts` (cron job + trigger)
- `server/src/routes/instructor.ts` (test endpoint)
- `database/schema.sql` (EnableRiskAlerts, EmailRiskAlerts columns)
- `client/src/pages/Settings/NotificationSettingsPage.tsx` (UI toggle)

**Trigger**: Cron job (weekly on Monday at 10 AM UTC)

**Detection Criteria:**
- Risk level: medium, high, or critical (from StudentRiskAssessment table)
- Inactive for 7+ days (no lesson progress) OR critical risk level
- Only published courses with active students
- 7-day duplicate prevention window

**Implementation:**
```typescript
// Complex SQL query with JOINs on StudentRiskAssessment, Users, Courses, CourseProgress
// Groups students by instructor+course to avoid spam
// Sends ONE notification per instructor per course with risk breakdown

// To Instructor ONLY (students not notified)
type: 'intervention'
priority: 'urgent' (if critical students) | 'high' (otherwise)
title: '⚠️ At-Risk Student Alert'
message: '3 students need attention in "JavaScript Fundamentals" (1 critical, 2 high)'
actionUrl: '/instructor/interventions?tab=at-risk&courseId={courseId}'
actionText: 'Review Students'
category: 'system'
subcategory: 'RiskAlerts'
```

**Testing**: 
- 17 Playwright tests (all passed)
- Manual test endpoint: `POST /api/instructor/test-at-risk-detection`
- Settings UI: System Alerts → At-Risk Student Alerts

---

### 2.9 Course Completion
**File**: `server/src/routes/progress.ts`  
**Method**: `POST /api/progress/lessons/:lessonId/complete`  
**Line**: ~370-394 (100% milestone check)

**Status**: ✅ **IMPLEMENTED** - January 15, 2026

**Triggers:**
- ✅ **Student**: Certificate earned + Course completion congratulations
- ✅ **Instructor**: Student Progress Milestone at 100%

**Notification Details:**
```typescript
// To Student (Certificate)
type: 'achievement'
priority: 'high'
title: '🎓 Certificate Earned!'
message: 'Congratulations! Your certificate for "{courseTitle}" is ready. Download it now!'
actionUrl: '/certificate/{verificationCode}'
actionText: 'Download Certificate'
category: 'system'
subcategory: 'Certificates'

// To Student (Completion)
type: 'progress'
priority: 'high'
title: '🎉 Congratulations! Course Completed!'
message: 'You\'ve completed "{courseTitle}"! Great achievement!'
actionUrl: '/courses/{courseId}'
actionText: 'View Course'
category: 'progress'
subcategory: 'CourseCompletion'

// To Instructor
type: 'progress'
priority: 'normal'
title: 'Student Progress Milestone'
message: '{studentName} reached 100% completion in "{courseTitle}"'
actionUrl: '/instructor/students'
actionText: 'View Students'
category: 'progress'
subcategory: 'CourseMilestones'
```

---

### 2.10 Password Changed
**File**: `server/src/routes/profile.ts`  
**Endpoint**: `PUT /api/profile/password` (Line ~330)

**Status**: ✅ **IMPLEMENTED** - January 17, 2026

**Triggers:**
- ✅ **User**: Security notification

**Notification Details:**
```typescript
type: 'intervention'  // Security-related event type
priority: 'high'
title: 'Password Changed'
message: 'Your account password was changed. If this wasn\'t you, contact support immediately.'
actionUrl: '/settings'
actionText: 'Review Security'
category: 'system'
subcategory: 'SecurityAlerts'
```

**Implementation:**
```typescript
// After password update (wrapped in try-catch to prevent failure)
try {
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);

  await notificationService.createNotificationWithControls(
    {
      userId,
      type: 'intervention',
      priority: 'high',
      title: 'Password Changed',
      message: 'Your account password was changed. If this wasn\'t you, contact support immediately.',
      actionUrl: '/settings',
      actionText: 'Review Security'
    },
    {
      category: 'system',
      subcategory: 'SecurityAlerts'
    }
  );
} catch (notificationError) {
  // Log error but don't fail the password change
  logger.error('Failed to send password change notification:', notificationError);
}
```

**Error Handling**: Notification failures are caught and logged without breaking password change functionality.

---

### 2.11 Account Deletion Request
**File**: `server/src/services/AccountDeletionService.ts`  
**Method**: `notifyAdmin()` (Line ~388)
**Endpoint**: `POST /api/settings/delete-account`

**Status**: ✅ **FULLY IMPLEMENTED** - February 4, 2026

**Triggers:**
- ✅ **Admin (In-App)**: Account deletion urgent notification
- ✅ **Admin (Email)**: Detailed email with user info and deletion context

**Notification Details:**
```typescript
// In-App Notification
type: 'intervention'
priority: 'urgent'
title: '🚨 Account Deletion'
message: 'User {userName} ({email}) deleted their {role} account at {timestamp} UTC. [Instructor stats if applicable]'
actionUrl: '/admin/users'
actionText: 'View Users'
category: 'system'
subcategory: 'SecurityAlerts'

// Email Notification
subject: '🚨 System Alert - Account Deletion'
to: All active admin users with EmailSecurityAlerts enabled
style: Purple gradient header (intervention type)
contents:
  - User details (name, email, role)
  - Deletion timestamp (UTC)
  - Instructor stats (courses, students) if applicable
  - Deletion method (direct/archive/transfer/force)
  - Action button: 'View Admin Dashboard'
  - Compliance note about audit logging
```

**Implementation Features:**
- Respects admin's `EmailSecurityAlerts` preference (inherits from `EnableSystemAlerts`)
- Sends detailed HTML email with professional styling
- Includes instructor statistics when applicable
- Shows course action taken (archive/transfer/delete)
- Non-blocking error handling
- Audit trail logged in AccountDeletionLog table
- **Test Script**: `scripts/test-account-deletion-notification.js`

**Implementation:**
```typescript
// Enhanced notifyAdmin method
async notifyAdmin(
  userId: string, 
  userEmail: string, 
  userName: string, 
  role: string,
  instructorStats?: InstructorContent | null,
  deletionMethod?: string
): Promise<void> {
  // Query admins with email preferences
  const adminResult = await request.query(`
    SELECT 
      u.Id, u.Email, u.FirstName,
      COALESCE(np.EmailSecurityAlerts, np.EnableSystemAlerts, 1) AS EmailEnabled
    FROM dbo.Users u
    LEFT JOIN dbo.NotificationPreferences np ON u.Id = np.UserId
    WHERE u.Role = 'admin' AND u.IsActive = 1
  `);

  // Build detailed message with instructor stats
  let detailedMessage = `User ${userName} (${userEmail}) deleted their ${role} account at ${timestamp} UTC.`;
  if (instructorStats?.totalCourses > 0) {
    detailedMessage += ` Instructor had ${instructorStats.totalCourses} courses...`;
  }

  // Send in-app notification to all admins
  for (const admin of adminResult.recordset) {
    await notificationService.createNotificationWithControls(
      { type: 'intervention', priority: 'urgent', ... },
      { category: 'system', subcategory: 'SecurityAlerts' }
    );

    // Send email if enabled
    if (admin.EmailEnabled) {
      await EmailService.sendEmail({
        subject: '🚨 System Alert - Account Deletion',
        html: /* Professional HTML template with user details */
      });
    }
  }
}
```

**Error Handling**: Email failures are caught and logged without blocking deletion.

**Frontend Settings**: SecurityAlerts description updated to "Password changes, account deletions, suspicious activity"

---

## 👥 PHASE 3: COMMUNITY & COLLABORATION

### 3.1 Office Hours Queue Join
**File**: `server/src/services/OfficeHoursService.ts`  
**Method**: `joinQueue()` (Line ~295)

**Status**: ✅ **IMPLEMENTED** - Pre-existing

**Triggers:**
- ✅ **Instructor**: Student joined queue

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'Office Hours - Student Joined Queue'
message: '{studentName} has joined your office hours queue: {question}'
actionUrl: '/office-hours'
actionText: 'View Queue'
category: 'community'
subcategory: 'OfficeHours'
```

---

### 3.2 Office Hours Session Completed
**File**: `server/src/services/OfficeHoursService.ts`  
**Method**: `completeSession()` (Line ~478)
**Endpoint**: `POST /api/office-hours/queue/:queueId/complete`

**Status**: ✅ **IMPLEMENTED** - January 17, 2026

**Triggers:**
- ✅ **Student**: Session summary notification with duration

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'Office Hours Session Completed'
message: 'Your office hours session with {instructorName} has ended. Duration: {duration} minutes. Thank you for joining!'
actionUrl: '/office-hours'
actionText: 'View Office Hours'
category: 'community'
subcategory: 'OfficeHours'
```

**Implementation:**
```typescript
// After completing session status update
try {
  // Calculate duration
  const admittedTime = new Date(queueEntry.AdmittedAt).getTime();
  const completedTime = new Date(queueEntry.CompletedAt).getTime();
  const durationMinutes = Math.round((completedTime - admittedTime) / (1000 * 60));
  
  await this.notificationService.createNotificationWithControls(
    {
      userId: queueEntry.StudentId,
      type: 'course',
      priority: 'normal',
      title: 'Office Hours Session Completed',
      message: `Your office hours session with ${instructorName} has ended. Duration: ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}. Thank you for joining!`,
      actionUrl: '/office-hours',
      actionText: 'View Office Hours'
    },
    {
      category: 'community',
      subcategory: 'OfficeHours'
    }
  );
} catch (notificationError) {
  console.error('Failed to send office hours completion notification:', notificationError);
}
```

**Error Handling**: Non-blocking try-catch ensures session completion succeeds even if notification fails.

---

### 3.3 Study Group Invitation
**File**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/invite` (Line ~170)

**Status**: ✅ **IMPLEMENTED** (January 21, 2026)

**Triggers:**
- ✅ **Invited user**: Receives notification when invited to join a study group

**Implementation Details:**
- Validates requester is group member
- Checks target user exists and is not already a member
- Creates notification for invited user with inviter's name
- Non-blocking error handling (doesn't fail request if notification fails)

**Notification Details:**
```typescript
type: 'course'
category: 'community'
subcategory: 'GroupInvites'
priority: 'normal'
title: 'Study Group Invitation'
message: '{inviterName} invited you to join "{groupName}"'
actionUrl: '/study-groups'
actionText: 'View Group'
relatedEntityId: groupId
relatedEntityType: 'course'
```

---

### 3.4 Study Group Member Joined
**File**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/join` (Line ~262)

**Status**: ✅ **IMPLEMENTED** (January 21, 2026)

**Triggers:**
- ✅ **Existing members**: All existing members notified when new member joins

**Implementation Details:**
- After successful join, queries all existing members (excluding new joiner)
- Creates notification for each existing member
- Includes new member's display name in notification message
- Non-blocking error handling (doesn't fail join if notifications fail)
- Logs success count: "Sent N member-joined notifications for group X"

**Notification Details:**
```typescript
type: 'course'
category: 'community'
subcategory: 'GroupActivity'
priority: 'normal'
title: 'New Study Group Member'
message: '{newMemberName} joined "{groupName}"'
actionUrl: '/study-groups'
actionText: 'View Group'
relatedEntityId: groupId
relatedEntityType: 'course'
```

**Socket.IO Events:**
- Emits: `study-group-member-joined` to all connected clients
- Real-time notification bell updates via NotificationService

---

### 3.5 Study Group Role Promotion
**File**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/members/:userId/promote` (Line ~472)

**Status**: ✅ **IMPLEMENTED** - February 1, 2026

**Triggers:**
- ✅ **Promoted member**: Role change notification with group details

**Implementation Details:**
- Validates requester is admin before promotion
- Fetches group name and promoted user details for personalized notification
- Creates notification with category='community', subcategory='GroupActivity'
- Non-blocking error handling (promotion succeeds even if notification fails)
- Console logging for success/error tracking
- Socket.IO broadcast: Already emits `member-promoted` event

**Notification Details:**
```typescript
type: 'achievement'
priority: 'high'
title: 'Study Group Promotion 🎉'
message: 'You\'ve been promoted to admin in "{groupName}"! You can now manage members and settings.'
actionUrl: '/study-groups'
actionText: 'View Group'
relatedEntityId: groupId
relatedEntityType: 'course'
category: 'community'
subcategory: 'GroupActivity'
```

**Implementation:**
```typescript
// After successful promotion
try {
  const io = req.app.get('io');
  const notificationService = new NotificationService(io);
  const db = DatabaseService.getInstance();

  // Fetch group name and user name for notification
  const groupQuery = await (await db.getRequest())
    .input('groupId', groupId)
    .query(`SELECT Name FROM dbo.StudyGroups WHERE Id = @groupId`);

  const userQuery = await (await db.getRequest())
    .input('userId', userId)
    .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId`);

  const groupName = groupQuery.recordset[0]?.Name || 'Study Group';
  const userName = `${userQuery.recordset[0]?.FirstName || ''} ${userQuery.recordset[0]?.LastName || ''}`.trim() || 'Member';

  await notificationService.createNotificationWithControls(
    {
      userId: userId,
      type: 'achievement',
      priority: 'high',
      title: 'Study Group Promotion 🎉',
      message: `You've been promoted to admin in "${groupName}"! You can now manage members and settings.`,
      actionUrl: '/study-groups',
      actionText: 'View Group',
      relatedEntityId: groupId,
      relatedEntityType: 'course'
    },
    {
      category: 'community',
      subcategory: 'GroupActivity'
    }
  );

  console.log(`✅ Promotion notification sent to ${userName} for group "${groupName}"`);
} catch (notificationError) {
  console.error('Failed to send promotion notification:', notificationError);
}
```

**Error Handling**: Non-blocking try-catch ensures promotion succeeds even if notification fails

---

### 3.5 Live Session Created
**File**: `server/src/routes/liveSessions.ts`  
**Endpoint**: `POST /api/live-sessions/` (Line ~17)

**Status**: ✅ **ALREADY IMPLEMENTED** - Creates notifications for enrolled students

---

### 3.6 Live Session Starting Soon
**File**: `server/src/services/NotificationScheduler.ts`  
**Trigger**: Cron job (every 15 minutes, check sessions starting in 60 min)

**Status**: ✅ **IMPLEMENTED** - February 4, 2026

**Notification Details:**
```typescript
type: 'course'
priority: 'urgent'
title: 'Live Session Starting Soon!'
message: '"{sessionTitle}" starts in 1 hour (Feb 04, 2026 3:00 PM)'
actionUrl: '/live-sessions/{sessionId}'
actionText: 'Join Session'
category: 'course'
subcategory: 'LiveSessions'
```

**Implementation:**
- Cron schedule: `'*/15 * * * *'` (every 15 minutes)
- Query window: 55-65 minutes ahead (±5 min buffer)
- Duplicate prevention: LEFT JOIN with Notifications table
- Sends to all enrolled students (active + completed enrollments)
- Manual test endpoint: `POST /api/live-sessions/test-session-reminders`
- Helper function: `getUpcomingLiveSessions(minutesAhead)` in NotificationHelpers.ts

---

### 3.7 Live Session Cancelled
**File**: `server/src/routes/liveSessions.ts`  
**Endpoint**: `POST /api/live-sessions/:sessionId/cancel` (Line ~348)

**Triggers:**
- ✅ **All participants**: Cancellation notification

**Notification Details:**
```typescript
type: 'course'
priority: 'urgent'
title: 'Live Session Cancelled'
message: '"{sessionTitle}" scheduled for {date} has been cancelled by the instructor'
actionUrl: '/live-sessions'
actionText: 'View Sessions'
```

---

### 3.8 AI Tutoring Session Response
**File**: `server/src/routes/tutoring.ts`  
**Endpoint**: `POST /api/tutoring/sessions/:sessionId/messages` (Line ~121)

**Triggers:**
- ✅ **Student**: AI tutor response received (if session inactive for 5+ min)

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'AI Tutor Response'
message: 'Your AI tutor answered your question about "{topic}"'
actionUrl: '/tutoring/sessions/{sessionId}'
actionText: 'View Response'
```

---

### 3.9 Direct Message Received ✅ IMPLEMENTED
**File**: `server/src/routes/chat.ts`  
**Endpoint**: `POST /api/chat/rooms/:roomId/messages` (Line ~76)
**Service**: `server/src/services/ChatService.ts`  
**Implementation Date**: February 5, 2026

**Triggers:**
- ✅ **Recipient**: New message notification (if offline and EnableDirectMessages = true)

**Implementation Details:**
- ChatService.sendMessageNotifications() checks all room participants
- Only notifies users NOT currently connected via Socket.IO
- Respects EnableDirectMessages and EmailDirectMessages preferences
- Uses NotificationService with community/direct-messages category

**Notification Details:**
```typescript
type: 'community'
priority: 'normal'
title: 'New Message from {senderName}'
message: '{messagePreview}' // First 50 chars
actionUrl: '/chat?roomId={roomId}'
actionText: 'View Message'
category: 'community'
subcategory: 'direct-messages'
```

---

### 3.10 Instructor Direct Message ✅ IMPLEMENTED
**File**: Unified with 3.9 - Uses same chat system
**Service**: `server/src/services/ChatService.ts`  
**Implementation Date**: February 5, 2026

**Triggers:**
- ✅ **Student**: Instructor sent message (if offline and EnableDirectMessages = true)

**Implementation Notes:**
- No separate endpoint needed - uses unified chat system
- Instructors create direct message rooms via POST /api/chat/rooms/direct
- All messages use ChatService.sendMessage() which handles notifications
- Same privacy controls apply (students can disable direct messages)

**Notification Details:**
```typescript
// Same as 3.9 - unified notification system
type: 'community'
priority: 'normal'
title: 'New Message from {instructorName}'
message: '{messagePreview}'
actionUrl: '/chat?roomId={roomId}'
actionText: 'View Message'
category: 'community'
subcategory: 'direct-messages'
```

---

## 🛠️ NEW SERVICES NEEDED

### 1. NotificationScheduler Service
**File**: `server/src/services/NotificationScheduler.ts`

**Purpose**: Background jobs for scheduled notifications

**Cron Jobs:**
- **Daily 9 AM UTC**: Assignment due reminders
- **Weekly Monday 10 AM UTC**: At-risk student detection ✅
- **Every 15 minutes**: Live session reminders

**Dependencies:**
- node-cron (already installed)
- NotificationService
- DatabaseService

---

### 2. Helper Functions
**File**: `server/src/services/NotificationHelpers.ts`

**Functions:**
```typescript
export async function getInstructorId(courseId: string): Promise<string>
export async function getUserName(userId: string): Promise<string>
export async function getCourseProgress(userId: string, courseId: string): Promise<number>
export async function getPendingSubmissionCount(assessmentId: string): Promise<number>
export async function getStudentCourses(userId: string): Promise<CourseInfo[]>
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Student Progress (HIGH PRIORITY)
- [x] 1.1 Lesson completion notifications - ✅ COMPLETE
  - [x] Add NotificationService import to progress.ts
  - [x] Create student progress notification
  - [x] Create instructor milestone notification (25%, 50%, 75%, 100%)
  - [x] Test with lesson completion
- [x] 1.2 Video lesson completion - ✅ COMPLETE (January 8, 2026)
  - [x] Add NotificationService import to videoProgress.ts
  - [x] Add notification to videoProgress.ts line ~246
  - [x] Fetch video title, lesson title, course title
  - [x] Create notification with category/subcategory
  - [x] Test video completion flow
- [ ] 1.3 Course enrollment notifications
  - [ ] Student welcome notification
  - [ ] Instructor enrollment notification
  - [ ] Test enrollment flow
- [ ] 1.4 Assessment submission
  - [ ] Student confirmation notification
  - [ ] Instructor grading notification
  - [ ] Test submission flow
- [ ] 1.5 Assessment grading
  - [ ] Create/update grading endpoint
  - [ ] Add student grade notification
  - [ ] Test grading flow

### Phase 2: Course Management (MEDIUM PRIORITY)
- [ ] 2.1 New lesson created
  - [ ] Notify enrolled students on lesson creation
  - [ ] Test content creation flow
- [ ] 2.2 Course published
  - [ ] Notify enrolled students
  - [ ] Test publish flow
- [ ] 2.3 Assessment created
  - [ ] Notify enrolled students
  - [ ] Test assessment creation
- [ ] 2.4 Assessment graded
  - [ ] Add student notification
  - [ ] Test grading flow
- [ ] 2.5 Payment successful
  - [ ] Add in-app notification (email already sent)
  - [ ] Test payment webhook
- [ ] 2.6 Refund processed
  - [ ] Student notification
  - [ ] Admin notification
  - [ ] Test refund flow
- [ ] 2.7 Assignment due date reminders
  - [ ] Create NotificationScheduler service
  - [ ] Add daily cron job for due date checks
  - [ ] Test with mock due dates
- [x] 2.8 At-risk student detection ✅ **COMPLETED** (February 4, 2026)
  - [x] Add weekly cron job to NotificationScheduler (Monday 10 AM UTC)
  - [x] Implement inactivity detection query (7+ days OR critical risk)
  - [x] Notify instructors (instructor-only, grouped by course)
  - [x] Test with 17 Playwright tests (all passed)
  - [x] Database: EnableRiskAlerts, EmailRiskAlerts columns
  - [x] Frontend: Settings UI toggle in System Alerts section
- [x] 2.9 Course completion ✅ **COMPLETED** (January 15, 2026)
  - [x] Detect 100% progress
  - [x] Create achievement notification (certificate + congratulations)
  - [x] Notify instructor
  - [x] Test completion flow
- [x] 2.10 Password changed ✅ **COMPLETED** (January 17, 2026)
  - [x] Add security notification
  - [x] Test password change
- [ ] 2.11 Account deletion request
  - [ ] Admin notification
  - [ ] Test deletion request

### Phase 3: Community Features (LOW PRIORITY)
- [x] 3.1 Office hours queue join ✅ **COMPLETED** (Pre-existing)
  - [x] Add instructor notification
  - [x] Test queue join
- [x] 3.2 Office hours completed ✅ **COMPLETED** (January 17, 2026)
  - [x] Student summary notification
  - [x] Test session completion
- [x] 3.3 Study group invitation & member joined ✅ **COMPLETED** (January 21, 2026)
  - [x] Study group invitation endpoint (POST /api/study-groups/:groupId/invite)
  - [x] Notify invited user with inviter's name
  - [x] Notify existing members when new member joins
  - [x] Test join flow with notifications
- [x] 3.4 Study group promotion ✅ **COMPLETED** (February 2, 2026)
  - [x] Notify promoted member with correct type/priority
  - [x] Full member management UI (detail page)
  - [x] Real-time socket updates (list + detail pages)
  - [x] Test promotion flow with notifications
- [x] 3.5 Live session created ✅ **COMPLETED**
  - [x] ALREADY IMPLEMENTED
- [x] 3.6 Live session starting soon ✅ **COMPLETED** (February 4, 2026)
  - [x] Add cron job (every 15 min)
  - [x] Check sessions starting in 60 min
  - [x] Notify enrolled students
  - [x] Test with mock session
- [x] 3.7 Live session cancelled ✅ **COMPLETED** (January 6, 2026)
  - [x] Notify all participants
  - [x] Test cancellation
- [x] 3.8 AI tutoring response ✅ **COMPLETED** (February 3, 2026)
  - [x] Database schema: Added EnableAITutoring, EmailAITutoring columns
  - [x] NotificationService: Updated 8 locations for new columns
  - [x] Email styling: Added 'community' type with 👥 icon and purple gradient
  - [x] Notification trigger: Sends after AI response with correct category/subcategory
  - [x] Frontend settings UI: Added toggle in Community section
  - [x] Smart course dropdown: Shows enrolled courses for context-aware tutoring
  - [x] Role mapping: Fixed 'ai' (database) vs 'assistant' (OpenAI API) inconsistency
  - [x] Type consistency: All TypeScript unions aligned across 5 files
  - [x] Non-blocking implementation with error handling
- [x] 3.9 Direct message received - ✅ IMPLEMENTED February 5, 2026
  - [x] ChatService.sendMessageNotifications() checks recipient settings
  - [x] Offline recipients get in-app + email notifications
  - [x] Respects EnableDirectMessages/EmailDirectMessages preferences
  - [x] NotificationPreferences table updated with new columns
  - [x] Chat UI shows Direct Messages toggle in Settings
- [x] 3.10 Instructor direct message - ✅ IMPLEMENTED February 5, 2026
  - [x] Same implementation as 3.9 (unified chat system)
  - [x] All direct messages respect user privacy settings
  - [x] ChatParticipants table enforces access control

### Infrastructure
- [ ] Create NotificationHelpers.ts service
  - [ ] Implement getInstructorId()
  - [ ] Implement getUserName()
  - [ ] Implement getCourseProgress()
  - [ ] Implement getPendingSubmissionCount()
  - [ ] Implement getEnrolledStudents()
  - [ ] Implement getStudentCourses()
  - [ ] Add unit tests
- [ ] Create NotificationScheduler.ts service
  - [ ] Setup cron jobs
  - [ ] Implement assignment reminders
  - [ ] Implement at-risk detection
  - [ ] Implement live session reminders
  - [ ] Add error handling and logging
- [ ] Update server/src/index.ts
  - [ ] Initialize NotificationScheduler
  - [ ] Add startup logging

### Testing
- [ ] Test all notification types with realtime emails
- [ ] Test daily digest aggregation
- [ ] Test weekly digest aggregation
- [ ] Verify tracking pixels work
- [ ] Verify unsubscribe links work
- [ ] Test user preference enforcement
- [ ] Load test with multiple users
- [ ] Check database performance

### Documentation
- [ ] Update ARCHITECTURE.md with notification triggers
- [ ] Update PROJECT_STATUS.md
- [ ] Create user guide for notification preferences
- [ ] Document cron job schedules

---

## ⚙️ CONFIGURATION OPTIONS

### Per-User Settings (Already Exists)
```typescript
EnableProgressNotifications: boolean
EnableRiskAlerts: boolean
EnableAchievementNotifications: boolean
EnableCourseUpdates: boolean
EnableAssignmentReminders: boolean
EnableEmailNotifications: boolean
EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly'
QuietHoursStart: TIME
QuietHoursEnd: TIME
```

### System-Wide Settings (Future Enhancement)
```typescript
// Add to database: SystemSettings table
NOTIFICATION_MILESTONE_THRESHOLDS: [25, 50, 75, 100]
AT_RISK_INACTIVITY_DAYS: 7
ASSIGNMENT_REMINDER_DAYS: 2
LIVE_SESSION_REMINDER_MINUTES: 30
INSTRUCTOR_BATCH_NOTIFICATIONS: true  // Group similar notifications
MAX_NOTIFICATIONS_PER_HOUR: 10  // Rate limiting
```

---

## 🚨 IMPORTANT CONSIDERATIONS

### 1. Notification Overload Prevention
- **Batch similar notifications**: Group multiple lesson completions
- **Rate limiting**: Max 10 notifications per user per hour
- **Quiet hours enforcement**: Already implemented
- **Digest preference**: Already implemented

### 2. Performance
- **Async notification creation**: Don't block API responses
- **Database indexes**: Already exist on Notifications table
- **Cron job optimization**: Query only necessary data

### 3. Privacy
- **Respect user preferences**: Already enforced
- **Unsubscribe functionality**: Already implemented
- **Email tracking opt-out**: Consider adding preference

### 4. Testing Strategy
- **Unit tests**: Test notification logic in isolation
- **Integration tests**: Test full flow (action → notification → email)
- **Load tests**: 100+ concurrent users
- **Email delivery tests**: Monitor bounce/spam rates

---

## 📈 SUCCESS METRICS

**After Full Implementation:**
- ✅ 90%+ of user actions trigger appropriate notifications
- ✅ <5% notification bounce rate
- ✅ <1% unsubscribe rate
- ✅ Instructor response time to at-risk alerts <24 hours
- ✅ Student engagement increase (measured by login frequency)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Week 1 (8 hours)
1. **Day 1-2**: Phase 1.1-1.3 (Lesson completion, enrollment) - 4 hours
2. **Day 3**: Phase 1.4-1.5 (Assessment notifications) - 2 hours
3. **Day 4**: Create NotificationHelpers service - 2 hours

### Week 2 (6 hours)
4. **Day 5-6**: Phase 2.2-2.3 (NotificationScheduler + cron jobs) - 4 hours
5. **Day 7**: Phase 2.1, 2.4 (Course content, completion) - 2 hours

### Week 3 (4 hours)
6. **Day 8**: Phase 3 (Community features) - 2 hours
7. **Day 9-10**: Testing, documentation, refinement - 2 hours

**Total Estimated Time: 20-24 hours over 2-3 weeks**

---

## 🚀 QUICK START (Minimum Viable Implementation)

**If you want notifications working TODAY (3-4 hours):**

1. **Lesson completion** (45 min)
   - Add to progress.ts line ~260
   - Student notification + instructor milestone notification
---

## 🗂️ TRIGGER-TO-CATEGORY MAPPING

### **Category 1: Progress Updates**

| Trigger | Subcategory | In-App Default | Email Default | Priority |
|---------|-------------|----------------|---------------|----------|
| Lesson Completion (Student) | `EnableLessonCompletion` | ✅ ON | ✅ ON | normal |
| Lesson Completion (Instructor Milestone) | `EnableCourseMilestones` | ✅ ON | ✅ ON | normal |
| Video Completion | `EnableVideoCompletion` | ✅ ON | ☐ OFF | low |
| Course Milestone (25%, 50%, 75%, 100%) | `EnableCourseMilestones` | ✅ ON | ✅ ON | normal |
| Weekly Progress Summary | `EnableProgressSummary` | ✅ ON | ✅ ON | low |

### **Category 2: Course Updates**

| Trigger | Subcategory | In-App Default | Email Default | Priority |
|---------|-------------|----------------|---------------|----------|
| Course Enrollment (Welcome) | `EnableCourseEnrollment` | ✅ ON | ✅ ON | high |
| Enrollment Request (to Instructor) | `EnableEnrollmentRequest` | ✅ ON | ✅ ON | normal |
| Enrollment Approved (to Student) | `EnableEnrollmentApproved` | ✅ ON | ✅ ON | high |
| Enrollment Rejected (to Student) | `EnableEnrollmentRejected` | ✅ ON | ✅ ON | normal |
| Enrollment Suspended (to Student) | `EnableEnrollmentSuspended` | ✅ ON | ✅ ON | normal |
| Enrollment Cancelled (to Student) | `EnableEnrollmentCancelled` | ✅ ON | ✅ ON | normal |
| New Lesson Created | `EnableNewLessons` | ✅ ON | ✅ ON | normal |
| Live Session Created | `EnableLiveSessions` | ✅ ON | ✅ ON | high |
| Live Session Starting Soon (15 min) | `EnableLiveSessions` | ✅ ON | ✅ ON | urgent |
| Course Published | `EnableCourseUpdates` | ✅ ON | ✅ ON | high |
| Instructor Announcement | `EnableInstructorAnnouncements` | ✅ ON | ✅ ON | normal |

### **Category 3: Assessment Updates**

| Trigger | Subcategory | In-App Default | Email Default | Priority |
|---------|-------------|----------------|---------------|----------|
| Assessment Submission Confirmation | `EnableAssessmentSubmitted` | ✅ ON | ✅ ON | normal |
| Assessment Graded | `EnableAssessmentGraded` | ✅ ON | ✅ ON | high |
| New Assessment Available | `EnableNewAssessment` | ✅ ON | ✅ ON | high |
| Assessment Due Soon (2 days) | `EnableAssessmentDue` | ✅ ON | ✅ ON | high |
| New Submission to Grade (Instructor) | `EnableSubmissionToGrade` | ✅ ON | ✅ ON | high |

### **Category 4: Community Updates**

| Trigger | Subcategory | In-App Default | Email Default | Priority |
|---------|-------------|----------------|---------------|----------|
| New Comment on Course | `EnableComments` | ✅ ON | ☐ OFF | low |
| Reply to Your Comment | `EnableReplies` | ✅ ON | ✅ ON | normal |
| Mentioned in Comment | `EnableMentions` | ✅ ON | ✅ ON | normal |
| Study Group Invitation | `EnableGroupInvites` | ✅ ON | ✅ ON | normal |
| Study Group Member Joined | `EnableGroupActivity` | ✅ ON | ✅ ON | normal |
| Office Hours Available | `EnableOfficeHours` | ✅ ON | ✅ ON | normal |

### **Category 5: System Alerts**

| Trigger | Subcategory | In-App Default | Email Default | Priority |
|---------|-------------|----------------|---------------|----------|
| Payment Successful | `EnablePaymentConfirmation` | ✅ ON | ✅ ON | high |
| Refund Processed | `EnableRefundConfirmation` | ✅ ON | ✅ ON | high |
| Certificate Earned | `EnableCertificates` | ✅ ON | ✅ ON | high |
| Account Security Alert | `EnableSecurityAlerts` | ✅ ON | ✅ ON | urgent |
| Profile Update Confirmation | `EnableProfileUpdates` | ✅ ON | ☐ OFF | low |

---

## 🗄️ DATABASE SCHEMA CHANGES

### **New Columns in NotificationPreferences Table**

```sql
-- Migration Script: add_notification_subcategories.sql

-- Global Controls (already exist)
-- EnableEmailNotifications BIT (existing)
-- EmailDigestFrequency NVARCHAR(20) (existing)
-- QuietHoursStart/End TIME (existing)

-- Add new global toggle for in-app notifications
ALTER TABLE NotificationPreferences
ADD EnableInAppNotifications BIT NOT NULL DEFAULT 1;

-- Category Controls (5 main - already exist)
-- EnableProgressNotifications BIT (existing → rename to EnableProgressUpdates)
-- EnableCourseUpdates BIT (existing)
-- EnableAssignmentReminders BIT (existing → rename to EnableAssessmentUpdates)
-- EnableRiskAlerts BIT (existing)
-- EnableAchievementNotifications BIT (existing)

-- Rename for clarity
EXEC sp_rename 'NotificationPreferences.EnableProgressNotifications', 'EnableProgressUpdates', 'COLUMN';
EXEC sp_rename 'NotificationPreferences.EnableAssignmentReminders', 'EnableAssessmentUpdates', 'COLUMN';
EXEC sp_rename 'NotificationPreferences.EnableAchievementNotifications', 'EnableCommunityUpdates', 'COLUMN';
EXEC sp_rename 'NotificationPreferences.EnableRiskAlerts', 'EnableSystemAlerts', 'COLUMN';

-- Progress Updates Subcategories
ALTER TABLE NotificationPreferences
ADD EnableLessonCompletion BIT NULL, -- NULL = inherit from category
    EnableVideoCompletion BIT NULL,
    EnableCourseMilestones BIT NULL,
    EnableProgressSummary BIT NULL,
    -- Email-specific toggles
    EmailLessonCompletion BIT NULL,
    EmailVideoCompletion BIT NULL,
    EmailCourseMilestones BIT NULL,
    EmailProgressSummary BIT NULL;

-- Course Updates Subcategories
ALTER TABLE NotificationPreferences
ADD EnableCourseEnrollment BIT NULL,
    EnableNewLessons BIT NULL,
    EnableLiveSessions BIT NULL,
    EnableCoursePublished BIT NULL,
    EnableInstructorAnnouncements BIT NULL,
    EnableEnrollmentRequest BIT NULL,
    EnableEnrollmentApproved BIT NULL,
    EnableEnrollmentRejected BIT NULL,
    EnableEnrollmentSuspended BIT NULL,
    EnableEnrollmentCancelled BIT NULL,
    -- Email-specific toggles
    EmailCourseEnrollment BIT NULL,
    EmailNewLessons BIT NULL,
    EmailLiveSessions BIT NULL,
    EmailCoursePublished BIT NULL,
    EmailInstructorAnnouncements BIT NULL,
    EmailEnrollmentRequest BIT NULL,
    EmailEnrollmentApproved BIT NULL,
    EmailEnrollmentRejected BIT NULL,
    EmailEnrollmentSuspended BIT NULL,
    EmailEnrollmentCancelled BIT NULL;

-- Assessment Updates Subcategories
ALTER TABLE NotificationPreferences
ADD EnableAssessmentSubmitted BIT NULL,
    EnableAssessmentGraded BIT NULL,
    EnableNewAssessment BIT NULL,
    EnableAssessmentDue BIT NULL,
    EnableSubmissionToGrade BIT NULL,
    -- Email-specific toggles
    EmailAssessmentSubmitted BIT NULL,
    EmailAssessmentGraded BIT NULL,
    EmailNewAssessment BIT NULL,
    EmailAssessmentDue BIT NULL,
    EmailSubmissionToGrade BIT NULL;

-- Community Updates Subcategories
ALTER TABLE NotificationPreferences
ADD EnableComments BIT NULL,
    EnableReplies BIT NULL,
    EnableMentions BIT NULL,
    EnableGroupInvites BIT NULL,
    EnableGroupActivity BIT NULL,
    EnableOfficeHours BIT NULL,
    -- Email-specific toggles
    EmailComments BIT NULL,
    EmailReplies BIT NULL,
    EmailMentions BIT NULL,
    EmailGroupInvites BIT NULL,
    EmailGroupActivity BIT NULL,
    EmailOfficeHours BIT NULL;

-- System Alerts Subcategories
ALTER TABLE NotificationPreferences
ADD EnablePaymentConfirmation BIT NULL,
    EnableRefundConfirmation BIT NULL,
    EnableCertificates BIT NULL,
    EnableSecurityAlerts BIT NULL,
    EnableProfileUpdates BIT NULL,
    -- Email-specific toggles
    EmailPaymentConfirmation BIT NULL,
    EmailRefundConfirmation BIT NULL,
    EmailCertificates BIT NULL,
    EmailSecurityAlerts BIT NULL,
    EmailProfileUpdates BIT NULL;
```

### **Logic: NULL = Inherit from Category**

- If subcategory toggle is `NULL` → Use category toggle
- If subcategory toggle is `0` (OFF) → Disabled
- If subcategory toggle is `1` (ON) → Enabled

**Example:**
- `EnableProgressUpdates = 1` (category ON)
- `EnableLessonCompletion = NULL` → Inherits, so ON
- `EnableVideoCompletion = 0` → Explicitly OFF, overrides category

---

## 🔧 NOTIFICATIONSERVICE UPDATES

### **Updated shouldSendNotification Method**

```typescript
interface NotificationCheckParams {
  category: 'progress' | 'course' | 'assessment' | 'community' | 'system';
  subcategory?: string; // e.g., 'lesson-completion', 'video-completion'
  checkEmail?: boolean; // Check email-specific toggle
}

private shouldSendNotification(
  params: NotificationCheckParams,
  preferences: NotificationPreferences
): boolean {
  const { category, subcategory, checkEmail = false } = params;

  // 1. Check global toggle
  if (checkEmail) {
    if (!preferences.EnableEmailNotifications) return false;
  } else {
    if (!preferences.EnableInAppNotifications) return false;
  }

  // 2. Check category toggle
  let categoryEnabled = false;
  switch (category) {
    case 'progress':
      categoryEnabled = preferences.EnableProgressUpdates;
      break;
    case 'course':
      categoryEnabled = preferences.EnableCourseUpdates;
      break;
    case 'assessment':
      categoryEnabled = preferences.EnableAssessmentUpdates;
      break;
    case 'community':
      categoryEnabled = preferences.EnableCommunityUpdates;
      break;
    case 'system':
      categoryEnabled = preferences.EnableSystemAlerts;
      break;
  }

  if (!categoryEnabled) return false;

  // 3. Check subcategory toggle (if exists)
  if (subcategory) {
    const subcategoryKey = checkEmail 
      ? `Email${subcategory}` 
      : `Enable${subcategory}`;
    
    const subcategoryValue = preferences[subcategoryKey];
    
    // NULL = inherit from category, 0 = OFF, 1 = ON
    if (subcategoryValue === null || subcategoryValue === undefined) {
      return categoryEnabled; // Inherit
    }
    return subcategoryValue === 1;
  }

  return categoryEnabled;
}
```

### **Usage Example in Trigger Code**

```typescript
// In progress.ts - Lesson Completion
const io = req.app.get('io');
const notificationService = new NotificationService(io);

// Check if should send in-app notification
const shouldSendInApp = await notificationService.shouldSendNotification({
  category: 'progress',
  subcategory: 'LessonCompletion',
  checkEmail: false
}, preferences);

if (shouldSendInApp) {
  await notificationService.createNotification({
    userId,
    type: 'progress',
    priority: 'normal',
    title: 'Lesson Completed!',
    message: `Great work! You completed "${lessonTitle}"`,
    actionUrl: `/courses/${courseId}`,
    actionText: 'Continue Learning'
  });
}
```

---

## 🎨 FRONTEND: DEDICATED NOTIFICATIONS SETTINGS PAGE

### **Page Structure: /settings/notifications**

```
Settings Page (Profile → Settings → Notifications Tab)
├── Global Controls Section
│   ├── Enable In-App Notifications (master toggle)
│   ├── Enable Email Notifications (master toggle)
│   ├── Email Digest Frequency (realtime/daily/weekly/none)
│   └── Quiet Hours (time range picker)
│
├── Progress Updates (Collapsible Section)
│   ├── Category Toggle: Enable All Progress Updates
│   ├── Subcategory:
│   │   ├── Lesson Completion: [In-App ☑] [Email ☑]
│   │   ├── Video Completion: [In-App ☑] [Email ☐]
│   │   ├── Course Milestones: [In-App ☑] [Email ☑]
│   │   └── Weekly Summary: [In-App ☑] [Email ☑]
│
├── Course Updates (Collapsible Section)
│   ├── Category Toggle: Enable All Course Updates
│   ├── Subcategory:
│   │   ├── Course Enrollment: [In-App ☑] [Email ☑]
│   │   ├── New Lessons: [In-App ☑] [Email ☑]
│   │   ├── Live Sessions: [In-App ☑] [Email ☑]
│   │   └── Instructor Announcements: [In-App ☑] [Email ☑]
│
├── Assessment Updates (Collapsible Section)
│   ├── Category Toggle: Enable All Assessment Updates
│   ├── Subcategory:
│   │   ├── Assessment Graded: [In-App ☑] [Email ☑]
│   │   ├── Due Date Reminders: [In-App ☑] [Email ☑]
│   │   └── New Assessment: [In-App ☑] [Email ☑]
│
├── Community Updates (Collapsible Section)
│   ├── Category Toggle: Enable All Community Updates
│   ├── Subcategory:
│   │   ├── Comments: [In-App ☑] [Email ☐]
│   │   ├── Mentions: [In-App ☑] [Email ☑]
│   │   └── Group Invites: [In-App ☑] [Email ☑]
│
└── System Alerts (Collapsible Section)
    ├── Category Toggle: Enable All System Alerts
    ├── Subcategory:
    │   ├── Payment Confirmation: [In-App ☑] [Email ☑]
    │   ├── Certificates: [In-App ☑] [Email ☑]
    │   └── Security Alerts: [In-App ☑] [Email ☑] (cannot disable)
```

### **UI Component: NotificationSettingsPage.tsx**

```typescript
// client/src/pages/Settings/NotificationSettingsPage.tsx
interface SubcategoryControl {
  name: string;
  label: string;
  inAppKey: keyof NotificationPreferences;
  emailKey: keyof NotificationPreferences;
  canDisable: boolean; // Security alerts = false
}

const PROGRESS_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'lesson-completion',
    label: 'Lesson Completion',
    inAppKey: 'EnableLessonCompletion',
    emailKey: 'EmailLessonCompletion',
    canDisable: true
  },
  {
    name: 'video-completion',
    label: 'Video Completion',
    inAppKey: 'EnableVideoCompletion',
    emailKey: 'EmailVideoCompletion',
    canDisable: true
  },
  {
    name: 'course-milestones',
    label: 'Course Milestones (25%, 50%, 75%, 100%)',
    inAppKey: 'EnableCourseMilestones',
    emailKey: 'EmailCourseMilestones',
    canDisable: true
  }
];

// Collapsible accordion with category + subcategories
<Accordion>
  <AccordionSummary>
    <Switch 
      checked={preferences.EnableProgressUpdates}
      onChange={handleCategoryToggle('EnableProgressUpdates')}
    />
    <Typography>Progress Updates</Typography>
  </AccordionSummary>
  <AccordionDetails>
    {PROGRESS_SUBCATEGORIES.map(sub => (
      <Box key={sub.name} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        <Typography sx={{ flex: 1 }}>{sub.label}</Typography>
        <FormControlLabel
          control={<Switch checked={getToggleValue(sub.inAppKey)} />}
          label="In-App"
        />
        <FormControlLabel
          control={<Switch checked={getToggleValue(sub.emailKey)} />}
          label="Email"
        />
      </Box>
    ))}
  </AccordionDetails>
</Accordion>
```

---

## 📅 IMPLEMENTATION PHASES (UPDATED)

### **Phase 0: Hybrid Control System (4-5 hours) - DO THIS FIRST**

1. **Database Migration** (1 hour)
   - Run `add_notification_subcategories.sql`
   - Add 40+ new columns to NotificationPreferences
   - Update default preferences creation logic

2. **Update NotificationService** (1.5 hours)
   - Modify `shouldSendNotification()` method
   - Add subcategory checking logic
   - Add email-specific checking logic
   - Update interface types

3. **Create Dedicated Settings Page** (2 hours)
   - Create `NotificationSettingsPage.tsx`
   - Build collapsible category sections
   - Implement in-app/email toggle pairs
   - Add route: `/settings/notifications`

4. **Update API Endpoints** (30 min)
   - Update `PATCH /api/notifications/preferences` to handle new fields
   - Update `GET /api/notifications/preferences` response

5. **Testing** (30 min)
   - Toggle category → All subcategories inherit
   - Toggle subcategory → Override category
   - Disable email for one type → In-app still works
   - Verify database updates

### **Phase 1: Student Progress Notifications (3-4 hours)**

**Note**: Now with granular controls implemented in Phase 0

2. **Course enrollment** (30 min)
   - Add to enrollment.ts line ~135
   - Student welcome + instructor notification
   - Check: `category: 'course', subcategory: 'CourseEnrollment'`
   
3. **Assessment submission** (45 min)
   - Add to assessments.ts line ~816
   - Student confirmation + instructor grading notification
   - Check: `category: 'assessment', subcategory: 'AssessmentSubmitted'`
   
4. **New lesson created** (30 min)
   - Add to lessons.ts line ~144
   - Notify all enrolled students
   - Check: `category: 'course', subcategory: 'NewLessons'`
   
5. **Payment successful** (30 min)
   - Add to payments.ts webhook handler
   - In-app notification (email already sent)
   - Check: `category: 'system', subcategory: 'PaymentConfirmation'`

6. **Testing** (30 min)
   - Set email to realtime
   - Toggle subcategories in settings
   - Complete lesson, enroll, submit
   - Check email inbox and in-app notifications
   - Verify granular controls work

**This gives you 80% of user value with full control system in place.**

---

## 📞 QUESTIONS TO RESOLVE

Before implementation, decide:

1. ✅ **Control Granularity**: Hybrid system (category + subcategory) - DECIDED
2. ✅ **In-App vs Email**: Separate controls - DECIDED
3. ✅ **UI Location**: Dedicated Settings → Notifications page - DECIDED
4. **Instructor milestone notifications**: Which thresholds? (25%, 50%, 75%, 100%) - Currently: All 4
5. **At-risk threshold**: 7 days inactive? 14 days?
6. **Assignment reminders**: 2 days before? Also 1 day before?
7. **Batch notifications**: Group similar events? (e.g., "3 students completed lessons")
8. **Rate limiting**: Max notifications per hour per user?
9. **Email tracking opt-out**: Add preference toggle?
10. **Security Alerts**: Should these be ALWAYS enabled (cannot disable)?

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### **Step 1: Hybrid Control System (Phase 0)** ← START HERE
- Database migration
- NotificationService update
- Settings page creation
- **Duration**: 4-5 hours
- **Deliverable**: Users can control all notification types granularly

### **Step 2: Apply Controls to Existing Triggers**
- Update lesson completion trigger (already implemented)
- Update live session trigger (already implemented)
- Test with real user preferences
- **Duration**: 1 hour

### **Step 3: Implement Phase 1 Triggers**
- Video completion, enrollment, assessments
- **Duration**: 3-4 hours
- **Deliverable**: 7/31 triggers complete

### **Step 4: Implement Phase 2 & 3**
- Remaining 24 triggers
- **Duration**: 8-10 hours
- **Deliverable**: All 31 triggers complete

---

**Ready to implement Phase 0 (Hybrid Control System)?**
