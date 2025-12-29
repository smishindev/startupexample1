# Notification Triggers - Full Implementation Plan

**Created**: December 28, 2025  
**Last Updated**: December 29, 2025  
**Status**: In Progress (2/31 Complete)  
**Goal**: Integrate automatic notification creation throughout the application

---

## 📧 EMAIL NOTIFICATION TRIGGERS - USER REFERENCE

### **What Triggers Emails?**

Users receive email notifications (based on their preferences) when these events occur:

#### ✅ **Currently Active (2 triggers)**
1. **Lesson Completed** - Student completes any lesson → Email to student + instructor (at milestones)
2. **Live Session Created** - Instructor schedules session → Email to all enrolled students

#### 🔄 **Coming Soon (29 triggers)**
- Course enrollments, video completions, assessment submissions
- Grading notifications, new content alerts
- Payment receipts, refund confirmations
- Study group invitations, office hours scheduling
- Daily/weekly progress summaries

**Email Delivery Options** (Profile → Preferences):
- **Real-time**: Immediate email for each event
- **Daily Digest**: One summary email per day (8 AM)
- **Weekly Digest**: One summary email per week (Monday 8 AM)
- **None**: In-app notifications only

**Unsubscribe**: Click unsubscribe link in any email (can re-enable in profile)

---

## 📋 EXECUTIVE SUMMARY

**Current State:**
- ✅ Email delivery infrastructure complete (Phases 1-3)
- ✅ Notification preferences UI complete
- ✅ Email tracking and analytics complete
- ✅ Two notification triggers implemented (Lesson Completion, Live Session Created)
- ❌ 29 additional notification triggers NOT implemented

**What's Missing:**
Event hooks that create notifications when users perform actions (enrollment, grading, course creation, etc.)

**Estimated Effort:** 18-20 hours (3 phases remaining)

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
- ✅ **Implemented & Working**: 2 triggers
  - Lesson Completion (Student + Instructor notifications)
  - Live Session Created
- ⏳ **Pending**: 29 triggers

---

## 📊 PHASE 1: STUDENT PROGRESS NOTIFICATIONS

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

**Triggers:**
- ✅ **Student**: Video completion notification

**Notification Details:**
```typescript
type: 'progress'
priority: 'low'
title: 'Video Completed!'
message: 'You finished watching "{videoTitle}". Duration: {duration} minutes'
actionUrl: '/courses/{courseId}/lessons/{lessonId}'
actionText: 'Continue to Next Lesson'
```

---

### 1.3 Course Enrollment
**File**: `server/src/routes/enrollment.ts`  
**Endpoint**: `POST /api/courses/:courseId/enroll`  
**Line**: ~135

**Triggers:**
- ✅ **Student**: Welcome notification
- ✅ **Instructor**: New enrollment notification

**Notification Details:**
```typescript
// To Student
type: 'course'
priority: 'high'
title: 'Welcome to {courseTitle}!'
message: 'You\'re now enrolled! Start with the first lesson and track your progress.'
actionUrl: '/courses/{courseId}'
actionText: 'Start Learning'

// To Instructor
type: 'course'
priority: 'normal'
title: 'New Student Enrolled'
message: '{studentName} enrolled in "{courseTitle}"'
actionUrl: '/instructor/courses/{courseId}/students'
actionText: 'View Students'
```

---

### 1.4 Assessment Submission
**File**: `server/src/routes/assessments.ts`  
**Endpoint**: `POST /api/assessments/submissions/:submissionId/submit`  
**Line**: ~816

**Triggers:**
- ✅ **Student**: Submission confirmation
- ✅ **Instructor**: New submission to grade

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
**Endpoint**: `PATCH /api/assessments/submissions/:submissionId/grade` (needs creation)

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

## 📚 PHASE 2: INSTRUCTOR & COURSE MANAGEMENT

### 2.1 New Lesson Created
**File**: `server/src/routes/lessons.ts`  
**Endpoint**: `POST /api/lessons` (Line ~144)

**Triggers:**
- ✅ **All enrolled students**: New content notification

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'New Lesson Available!'
message: 'New lesson added to "{courseTitle}": {lessonTitle}'
actionUrl: '/courses/{courseId}'
actionText: 'Check it Out'
```

---

### 2.2 Course Published
**File**: `server/src/routes/instructor.ts`  
**Endpoint**: `POST /api/instructor/courses/:id/publish` (Line ~328)

**Triggers:**
- ✅ **Enrolled students**: Course published notification

**Notification Details:**
```typescript
type: 'course'
priority: 'high'
title: 'Course Now Available'
message: '"{courseTitle}" is now published and ready to start'
actionUrl: '/courses/{courseId}'
actionText: 'Start Learning'
```

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

### 2.8 At-Risk Student Detection
**File**: `server/src/services/NotificationScheduler.ts` (NEW SERVICE)  
**Trigger**: Cron job (weekly on Monday at 10 AM UTC)

**Logic:**
```typescript
// Detect students with no activity in 7+ days
SELECT DISTINCT e.UserId, u.Name, c.Id as CourseId, c.Title, c.InstructorId
FROM Enrollments e
JOIN Users u ON e.UserId = u.Id
JOIN Courses c ON e.CourseId = c.Id
LEFT JOIN UserProgress up ON up.UserId = e.UserId AND up.CourseId = c.Id
WHERE e.Status = 'active'
  AND (up.LastAccessedAt IS NULL OR up.LastAccessedAt < DATEADD(day, -7, GETUTCDATE()))

// To Student
type: 'risk'
priority: 'high'
title: 'We Miss You!'
message: 'You haven\'t accessed "{courseTitle}" in 7 days. Keep up your momentum!'
actionUrl: '/courses/{courseId}'
actionText: 'Resume Learning'

// To Instructor
type: 'risk'
priority: 'high'
title: 'At-Risk Student Alert'
message: '{studentName} inactive in "{courseTitle}" for 7+ days'
actionUrl: '/instructor/students/{studentId}'
actionText: 'Send Message'
```

---

### 2.9 Course Completion
**File**: `server/src/routes/progress.ts`  
**Trigger**: When course progress reaches 100%

**Notification Details:**
```typescript
// To Student
type: 'achievement'
priority: 'high'
title: '🎉 Course Completed!'
message: 'Congratulations! You completed "{courseTitle}" with {avgScore}% average.'
actionUrl: '/courses/{courseId}/certificate'
actionText: 'Get Certificate'

// To Instructor
type: 'achievement'
priority: 'normal'
title: 'Student Completed Course'
message: '{studentName} finished "{courseTitle}" with {avgScore}% average'
actionUrl: '/instructor/students/{studentId}'
actionText: 'View Details'
```

---

### 2.10 Password Changed
**File**: `server/src/routes/profile.ts`  
**Endpoint**: `PUT /api/profile/password` (Line ~330)

**Triggers:**
- ✅ **User**: Security notification

**Notification Details:**
```typescript
type: 'course'
priority: 'high'
title: 'Password Changed'
message: 'Your account password was changed. If this wasn\'t you, contact support immediately.'
actionUrl: '/settings'
actionText: 'Review Security'
```

---

### 2.11 Account Deletion Request
**File**: `server/src/routes/settings.ts`  
**Endpoint**: `POST /api/settings/delete-account` (Line ~123)

**Triggers:**
- ✅ **Admin**: Account deletion request

**Notification Details:**
```typescript
type: 'course'
priority: 'urgent'
title: 'Account Deletion Request'
message: '{userName} ({email}) requested account deletion'
actionUrl: '/admin/users'
actionText: 'Review Request'
```

---

## 👥 PHASE 3: COMMUNITY & COLLABORATION

### 3.1 Office Hours Queue
**File**: `server/src/routes/officeHours.ts`  
**Endpoint**: `POST /api/office-hours/queue/join` (Line ~122)

**Triggers:**
- ✅ **Instructor**: Student joined queue

**Notification Details:**
```typescript
type: 'intervention'
priority: 'urgent'
title: 'Student Joined Office Hours'
message: '{studentName} joined your queue: "{question}"'
actionUrl: '/office-hours/{sessionId}'
actionText: 'Start Session'
```

---

### 3.2 Office Hours Session Completed
**File**: `server/src/routes/officeHours.ts`  
**Endpoint**: `POST /api/office-hours/queue/:queueId/complete` (Line ~232)

**Triggers:**
- ✅ **Student**: Session summary notification

**Notification Details:**
```typescript
type: 'progress'
priority: 'normal'
title: 'Office Hours Completed'
message: 'Your office hours session with {instructorName} has ended. Duration: {duration} minutes'
actionUrl: '/office-hours/history'
actionText: 'View History'
```

---

### 3.3 Study Group Created/Joined
**File**: `server/src/routes/studyGroups.ts`  
**Endpoints**: 
- `POST /api/study-groups/` (create, Line ~15)
- `POST /api/study-groups/:groupId/join` (join, Line ~173)

**Triggers:**
- ✅ **Group members**: New member joined notification
- ✅ **New member**: Welcome to group notification

**Notification Details:**
```typescript
// When member joins
type: 'course'
priority: 'normal'
title: 'New Study Group Member'
message: '{memberName} joined "{groupName}"'
actionUrl: '/study-groups/{groupId}'
actionText: 'View Group'

// To new member
type: 'course'
priority: 'normal'
title: 'Welcome to Study Group'
message: 'You joined "{groupName}". {memberCount} members'
actionUrl: '/study-groups/{groupId}'
actionText: 'View Group'
```

---

### 3.4 Study Group Role Promotion
**File**: `server/src/routes/studyGroups.ts`  
**Endpoint**: `POST /api/study-groups/:groupId/members/:userId/promote` (Line ~281)

**Triggers:**
- ✅ **Promoted member**: Role change notification

**Notification Details:**
```typescript
type: 'achievement'
priority: 'high'
title: 'Study Group Promotion'
message: 'You\'ve been promoted to moderator in "{groupName}"'
actionUrl: '/study-groups/{groupId}'
actionText: 'View Group'
```

---

### 3.5 Live Session Created
**File**: `server/src/routes/liveSessions.ts`  
**Endpoint**: `POST /api/live-sessions/` (Line ~17)

**Status**: ✅ **ALREADY IMPLEMENTED** - Creates notifications for enrolled students

---

### 3.6 Live Session Starting Soon
**File**: `server/src/services/NotificationScheduler.ts` (NEW SERVICE)  
**Trigger**: Cron job (every 15 minutes, check sessions starting in 30 min)

**Notification Details:**
```typescript
type: 'course'
priority: 'urgent'
title: 'Live Session Starting Soon'
message: '"{sessionTitle}" starts in 30 minutes'
actionUrl: '/live-sessions/{sessionId}'
actionText: 'Join Session'
```

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

### 3.9 Direct Message Received
**File**: `server/src/routes/chat.ts`  
**Endpoint**: `POST /api/chat/rooms/:roomId/messages` (Line ~43)

**Triggers:**
- ✅ **Recipient**: New message notification (if offline)

**Notification Details:**
```typescript
type: 'course'
priority: 'normal'
title: 'New Message from {senderName}'
message: '{messagePreview}'
actionUrl: '/chat/{roomId}'
actionText: 'View Message'
```

---

### 3.10 Instructor Direct Message
**File**: `server/src/routes/students.ts`  
**Endpoint**: `POST /api/students/message` (Line ~262)

**Triggers:**
- ✅ **Student**: Instructor sent message

**Notification Details:**
```typescript
type: 'intervention'
priority: 'high'
title: 'Message from Instructor'
message: '{instructorName}: {messagePreview}'
actionUrl: '/messages'
actionText: 'Read Message'
```

---

## 🛠️ NEW SERVICES NEEDED

### 1. NotificationScheduler Service
**File**: `server/src/services/NotificationScheduler.ts`

**Purpose**: Background jobs for scheduled notifications

**Cron Jobs:**
- **Daily 9 AM UTC**: Assignment due reminders
- **Weekly Monday 10 AM UTC**: At-risk student detection
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
- [ ] 1.1 Lesson completion notifications
  - [ ] Add NotificationService import to progress.ts
  - [ ] Create student progress notification
  - [ ] Create instructor milestone notification (25%, 50%, 75%, 100%)
  - [ ] Test with lesson completion
- [ ] 1.2 Video lesson completion
  - [ ] Add notification to videoProgress.ts
  - [ ] Test video completion flow
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
- [ ] 2.8 At-risk student detection
  - [ ] Add weekly cron job to NotificationScheduler
  - [ ] Implement inactivity detection query
  - [ ] Notify students and instructors
  - [ ] Test with mock data
- [ ] 2.9 Course completion
  - [ ] Detect 100% progress
  - [ ] Create achievement notification
  - [ ] Notify instructor
  - [ ] Test completion flow
- [ ] 2.10 Password changed
  - [ ] Add security notification
  - [ ] Test password change
- [ ] 2.11 Account deletion request
  - [ ] Admin notification
  - [ ] Test deletion request

### Phase 3: Community Features (LOW PRIORITY)
- [ ] 3.1 Office hours queue join
  - [ ] Add instructor notification
  - [ ] Test queue join
- [ ] 3.2 Office hours completed
  - [ ] Student summary notification
  - [ ] Test session completion
- [ ] 3.3 Study group joined
  - [ ] Notify existing members
  - [ ] Welcome notification to new member
  - [ ] Test join flow
- [ ] 3.4 Study group promotion
  - [ ] Notify promoted member
  - [ ] Test promotion
- [ ] 3.5 Live session created
  - [ ] ✅ ALREADY IMPLEMENTED
- [ ] 3.6 Live session starting soon
  - [ ] Add cron job (every 15 min)
  - [ ] Check sessions starting in 30 min
  - [ ] Notify enrolled students
  - [ ] Test with mock session
- [ ] 3.7 Live session cancelled
  - [ ] Notify all participants
  - [ ] Test cancellation
- [ ] 3.8 AI tutoring response
  - [ ] Add notification for inactive sessions
  - [ ] Test tutoring flow
- [ ] 3.9 Direct message received
  - [ ] Notify offline recipients
  - [ ] Test chat messages
- [ ] 3.10 Instructor direct message
  - [ ] Student notification
  - [ ] Test messaging

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
   
2. **Course enrollment** (30 min)
   - Add to enrollment.ts line ~135
   - Student welcome + instructor notification
   
3. **Assessment submission** (45 min)
   - Add to assessments.ts line ~816
   - Student confirmation + instructor grading notification
   
4. **New lesson created** (30 min)
   - Add to lessons.ts line ~144
   - Notify all enrolled students
   
5. **Payment successful** (30 min)
   - Add to payments.ts webhook handler
   - In-app notification (email already sent)

6. **Testing** (30 min)
   - Set email to realtime
   - Complete lesson, enroll, submit
   - Check email inbox and in-app notifications

**This gives you 80% of user value with 25% of the effort.**

---

## 📞 QUESTIONS TO RESOLVE

Before implementation, decide:

1. **Instructor milestone notifications**: Which thresholds? (25%, 50%, 75%, 100%)
2. **At-risk threshold**: 7 days inactive? 14 days?
3. **Assignment reminders**: 2 days before? Also 1 day before?
4. **Batch notifications**: Group similar events? (e.g., "3 students completed lessons")
5. **Rate limiting**: Max notifications per hour per user?
6. **Email tracking opt-out**: Add preference toggle?

---

**Ready to implement? Start with Phase 1.1 (Lesson Completion)**
