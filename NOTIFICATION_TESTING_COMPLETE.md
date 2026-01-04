# Complete Notification System Testing Plan

**Date:** December 31, 2025  
**Critical Bug Fixed:** `createNotificationWithControls()` now checks BOTH in-app AND email separately

---

## **Bug That Was Fixed:**

**Problem:** When global in-app notifications were disabled but email was enabled, **ZERO notifications were sent** (not even emails).

**Root Cause:** `createNotificationWithControls()` checked in-app preferences first, and if disabled, returned empty string immediately without checking email preferences.

**Fix:**
```typescript
// OLD (BROKEN):
if (!this.shouldSendNotification(checkParams, preferences)) {
  return ''; // Blocked everything!
}

// NEW (FIXED):
const shouldSendInApp = this.shouldSendNotification(checkParams, preferences);
const shouldSendEmail = this.shouldSendNotification({ ...checkParams, checkEmail: true }, preferences);

if (!shouldSendInApp && !shouldSendEmail) {
  return ''; // Only block if BOTH disabled
}
```

---

## **Complete Testing Matrix**

### **Test Setup Requirements:**

1. **Create test users:**
   - Student account (for receiving notifications)
   - Instructor account (for receiving instructor notifications)

2. **Create test course:**
   - Enroll student
   - Create lessons with assessments
   - Set up progress tracking

3. **Access notification settings:**
   - Navigate to `/settings/notifications`
   - Configure different scenarios

---

## **Test Cases - Complete Coverage**

### **GROUP 1: Global Toggle Tests**

#### **Test 1.1: Both Global Toggles ON**
**Setup:**
- Enable In-App Notifications: ON
- Enable Email Notifications: ON
- All categories: Inherit (NULL)

**Actions:**
1. Complete a lesson
2. Reach 50% progress
3. Complete course (100%)

**Expected Results:**
- ✅ In-app notification appears in bell
- ✅ Email sent (realtime or queued based on frequency)
- ✅ Socket.io real-time notification received

**Verification:**
```sql
SELECT * FROM Notifications WHERE UserId = '<student-id>' ORDER BY CreatedAt DESC
```

---

#### **Test 1.2: In-App OFF, Email ON** ⚠️ **CRITICAL TEST**
**Setup:**
- Enable In-App Notifications: OFF
- Enable Email Notifications: ON
- Email Digest Frequency: Realtime
- All categories: Inherit (NULL)

**Actions:**
1. Complete a lesson
2. Reach 50% progress
3. Complete course (100%)

**Expected Results:**
- ❌ NO in-app notification in bell
- ✅ Email sent immediately
- ❌ NO Socket.io event emitted

**Verification:**
```sql
-- Notification should still be created in DB (for email tracking)
SELECT * FROM Notifications WHERE UserId = '<student-id>' ORDER BY CreatedAt DESC

-- Check email logs
SELECT * FROM EmailLogs WHERE UserId = '<student-id>' ORDER BY SentAt DESC
```

---

#### **Test 1.3: In-App ON, Email OFF**
**Setup:**
- Enable In-App Notifications: ON
- Enable Email Notifications: OFF
- All categories: Inherit (NULL)

**Actions:**
1. Complete a lesson
2. Reach 50% progress

**Expected Results:**
- ✅ In-app notification appears in bell
- ❌ NO email sent
- ✅ Socket.io event emitted

---

#### **Test 1.4: Both Global Toggles OFF**
**Setup:**
- Enable In-App Notifications: OFF
- Enable Email Notifications: OFF

**Actions:**
1. Complete a lesson
2. Reach 50% progress

**Expected Results:**
- ❌ NO in-app notification
- ❌ NO email sent
- ❌ NO notification created in database

**Verification:**
```javascript
// Check backend logs for:
console.log(`📵 Notification completely blocked for user ${userId} - both in-app and email disabled`);
```

---

### **GROUP 2: Category-Level Tests**

#### **Test 2.1: Category OFF, Subcategories Inherit (NULL)**
**Setup:**
- Enable In-App Notifications: ON
- Enable Progress Updates: OFF
- Lesson Completion: NULL (Inherit)

**Actions:**
1. Complete a lesson

**Expected Results:**
- ❌ NO notification (blocked by category)

---

#### **Test 2.2: Category OFF, Subcategory Explicit ON**
**Setup:**
- Enable In-App Notifications: ON
- Enable Progress Updates: OFF
- Lesson Completion: Explicitly ON (not NULL)

**Actions:**
1. Complete a lesson

**Expected Results:**
- ✅ Notification appears (explicit subcategory overrides category)

---

#### **Test 2.3: Category ON, Subcategory Explicit OFF**
**Setup:**
- Enable In-App Notifications: ON
- Enable Progress Updates: ON
- Lesson Completion: Explicitly OFF

**Actions:**
1. Complete a lesson

**Expected Results:**
- ❌ NO notification (explicit subcategory blocks)

---

### **GROUP 3: NULL Inheritance Tests**

#### **Test 3.1: Visual Indication of Inheritance**
**Setup:**
- Enable Progress Updates: ON
- Lesson Completion: NULL (Inherit)

**Expected UI:**
- Lesson Completion switch shows as faded (opacity 0.6)
- Label shows: "(Inherit: ON)"

**Actions:**
1. Toggle category OFF

**Expected UI Change:**
- Label updates to: "(Inherit: OFF)"
- Switch remains faded

---

#### **Test 3.2: Shift+Click to Reset to Inherit**
**Setup:**
- Enable Progress Updates: ON
- Lesson Completion: Explicitly ON

**Actions:**
1. Shift+Click the Lesson Completion switch

**Expected Results:**
- Switch becomes faded
- Label shows: "(Inherit: ON)"
- Database value: NULL

**Verification:**
```sql
SELECT EnableLessonCompletion FROM NotificationPreferences WHERE UserId = '<user-id>'
-- Should return: NULL
```

---

### **GROUP 4: Email Digest Frequency Tests**

#### **Test 4.1: Realtime Email**
**Setup:**
- Enable Email Notifications: ON
- Email Digest Frequency: Realtime (immediate)
- Enable Progress Updates: ON

**Actions:**
1. Complete a lesson

**Expected Results:**
- ✅ Email sent immediately
- Email contains notification details
- Check inbox within 1 minute

---

#### **Test 4.2: Daily Digest**
**Setup:**
- Enable Email Notifications: ON
- Email Digest Frequency: Daily Digest (8 AM)
- Enable Progress Updates: ON

**Actions:**
1. Complete 3 lessons throughout the day

**Expected Results:**
- ❌ NO immediate emails
- ✅ One digest email at 8 AM next day
- Digest contains all 3 notifications

---

#### **Test 4.3: Weekly Digest**
**Setup:**
- Enable Email Notifications: ON
- Email Digest Frequency: Weekly Digest (Monday 8 AM)
- Enable Progress Updates: ON

**Actions:**
1. Complete lessons throughout the week

**Expected Results:**
- ❌ NO emails during week
- ✅ One digest email on Monday 8 AM
- Digest contains all week's notifications

---

### **GROUP 5: Specific Notification Type Tests**

#### **Test 5.1: Lesson Completion**
**Setup:**
- Enable In-App: ON
- Enable Progress Updates: ON
- Lesson Completion: NULL (Inherit)

**Actions:**
1. Mark lesson as complete

**Expected Results:**
- ✅ Notification: "Lesson Completed! Great work! You completed [lesson] in [course]..."
- Type: progress
- Priority: normal
- Subcategory: LessonCompletion

---

#### **Test 5.2: Progress Milestones (25%, 50%, 75%, 100%)**
**Setup:**
- Enable In-App: ON
- Enable Progress Updates: ON
- Course Milestones: NULL (Inherit)

**Actions:**
1. Progress to 25% → Complete required lessons
2. Progress to 50% → Complete more lessons
3. Progress to 75% → Continue
4. Progress to 100% → Complete final lesson

**Expected Results:**
- ✅ 4 notifications sent to INSTRUCTOR (not student!)
  - "Student reached 25% completion in..."
  - "Student reached 50% completion in..."
  - "Student reached 75% completion in..."
  - "Student reached 100% completion in..."
- Type: progress
- Priority: normal
- Subcategory: CourseMilestones

**Achievement Notifications (Separate):**
Run InterventionService.checkAchievements() to trigger:
- ✅ "🎯 Halfway There!" at 50%
- ✅ "🎉 Course Completed!" at 100%

---

#### **Test 5.3: Live Session Notifications**
**Setup:**
- Enable In-App: ON
- Enable Course Updates: ON
- Live Sessions: NULL (Inherit)

**Actions:**
1. Instructor creates new live session
2. Instructor starts session
3. Instructor ends session
4. Instructor cancels session

**Expected Results:**
- ✅ "New Live Session" notification
- ✅ "Session Starting Now" notification (urgent)
- ✅ "Session Ended" notification
- ✅ "Session Cancelled" notification (high priority)

---

#### **Test 5.4: Office Hours Notifications**
**Setup:**
- Enable In-App: ON
- Enable Community Updates: ON
- Office Hours: NULL (Inherit)

**Actions:**
1. Student joins office hours queue
2. Instructor admits student
3. Instructor completes session
4. Student cancels queue entry

**Expected Results:**
- ✅ Instructor: "Student Joined Queue"
- ✅ Student: "You've been admitted to office hours"
- ✅ Student: "Session completed"
- ✅ Student: "Session cancelled"

---

#### **Test 5.5: Risk Alert Notifications** (InterventionService)
**Setup:**
- Enable In-App: ON
- Enable Progress Updates: ON
- Progress Summary: NULL (Inherit)

**Actions:**
1. Run `InterventionService.checkAtRiskStudents()`
   - Requires: StudentRiskAssessment table with high/critical risk records

**Expected Results:**
- ✅ Student: "⚠️ Learning Progress Alert - You're showing signs of difficulty..."
- ✅ Instructor: "🚨 Student Needs Intervention - [Student] is at [risk level]..."
- Priority: urgent or high
- Subcategory: ProgressSummary

---

#### **Test 5.6: Re-engagement Notifications** (InterventionService)
**Setup:**
- Enable In-App: ON
- Enable Progress Updates: ON
- Progress Summary: NULL (Inherit)

**Actions:**
1. Don't access course for 7 days
2. Run `InterventionService.checkLowProgressStudents()`

**Expected Results:**
- ✅ "📚 Continue Your Learning Journey - You haven't accessed [course] in 7 days..."
- Priority: normal
- Subcategory: ProgressSummary

---

#### **Test 5.7: Assessment Deadline Reminders** (InterventionService)
**Setup:**
- Enable In-App: ON
- Enable Assessment Updates: ON
- Assessment Due: NULL (Inherit)

**Actions:**
1. Have assessment with 2 or fewer attempts remaining
2. Run `InterventionService.checkAssessmentDeadlines()`

**Expected Results:**
- ✅ "📝 Assessment Reminder - You have X attempts left for [assessment]..."
- Priority: high (if 1 attempt) or normal (if 2 attempts)
- Subcategory: AssessmentDue

---

#### **Test 5.8: Achievement Notifications** (InterventionService)
**Setup:**
- Enable In-App: ON
- Enable Progress Updates: ON
- Course Milestones: NULL (Inherit)

**Actions:**
1. Reach 50% progress in course
2. Run `InterventionService.checkAchievements()`
3. Complete course (100%)
4. Run `InterventionService.checkAchievements()` again

**Expected Results:**
- ✅ "🎯 Halfway There! You're 50% through [course]..."
- ✅ "🎉 Course Completed! Congratulations! You've completed [course] with average score of X%"
- Priority: high (for 100%), normal (for 50%)
- Subcategory: CourseMilestones

---

### **GROUP 6: Edge Cases**

#### **Test 6.1: Mixed In-App and Email Settings**
**Setup:**
- Enable In-App: ON
- Enable Email: ON
- Progress Updates Category: ON
- Lesson Completion In-App: OFF (explicit)
- Lesson Completion Email: ON (explicit)

**Actions:**
1. Complete a lesson

**Expected Results:**
- ❌ NO in-app notification (blocked by explicit subcategory)
- ✅ Email sent (enabled by explicit subcategory)

---

#### **Test 6.2: All Categories OFF, One Subcategory ON**
**Setup:**
- Enable In-App: ON
- All 5 categories: OFF
- Only Lesson Completion: Explicitly ON

**Actions:**
1. Complete a lesson
2. Reach 50% progress
3. Join live session

**Expected Results:**
- ✅ Lesson completion notification (explicit override)
- ❌ NO milestone notification (category blocks, subcategory inherits OFF)
- ❌ NO live session notification (category blocks)

---

#### **Test 6.3: Notification Expiration**
**Setup:**
- Enable In-App: ON
- Create notification with `expiresAt` = 1 hour from now

**Actions:**
1. Wait 1 hour
2. Check notifications page

**Expected Results:**
- Notification should not appear (expired)
- Query: `SELECT * FROM Notifications WHERE ExpiresAt < GETUTCDATE()`

---

#### **Test 6.4: Quiet Hours (Coming Soon)**
**Setup:**
- Enable In-App: ON
- Quiet Hours: 10 PM - 8 AM

**Actions:**
1. Complete lesson at 11 PM

**Expected Results:**
- Notification queued, not delivered immediately
- Delivered at 8 AM

---

### **GROUP 7: Save/Load Persistence**

#### **Test 7.1: Save NULL Values**
**Setup:**
1. Set Progress Updates: ON
2. Set all subcategories to Inherit (NULL) via Shift+Click

**Actions:**
1. Click Save
2. Refresh page

**Expected Results:**
- All subcategories still show as inherited (faded)
- Database: All subcategory values are NULL

**Verification:**
```sql
SELECT EnableLessonCompletion, EmailLessonCompletion, EnableVideoCompletion, EmailVideoCompletion
FROM NotificationPreferences 
WHERE UserId = '<user-id>'
-- All should be: NULL
```

---

#### **Test 7.2: Save Mixed States**
**Setup:**
1. Progress Updates: ON
2. Lesson Completion In-App: Explicitly ON
3. Lesson Completion Email: NULL (Inherit)
4. Video Completion: Explicitly OFF

**Actions:**
1. Save
2. Refresh page

**Expected Results:**
- Lesson Completion In-App: Solid ON
- Lesson Completion Email: Faded with "(Inherit: ON)"
- Video Completion: Solid OFF

---

### **GROUP 8: UI/UX Tests**

#### **Test 8.1: Access Notification Settings**
**Test all 4 access paths:**

1. **Bell Dropdown → ⚙️ Settings Icon**
   - Click bell
   - Click gear icon
   - Should go to `/settings/notifications`

2. **Bell Empty State → "Manage Preferences"**
   - Click bell (when 0 notifications)
   - Click "Manage Preferences" button
   - Should go to `/settings/notifications`

3. **Profile Menu → Notifications → Preferences Button**
   - Click profile avatar
   - Click "Notifications"
   - Goes to `/notifications` page
   - Click "Preferences" button
   - Should go to `/settings/notifications`

4. **Main Settings → Notifications Section**
   - Navigate to `/settings`
   - Click Notifications
   - Should go to `/settings/notifications`

---

#### **Test 8.2: Access Notification History**
**Test 2 access paths:**

1. **Bell Dropdown → "View All Notifications"**
   - Click bell
   - Click "View All Notifications" button (always visible)
   - Should go to `/notifications`

2. **Profile Menu → Notifications**
   - Click profile avatar
   - Click "Notifications"
   - Should go to `/notifications`

---

#### **Test 8.3: Visual Feedback**
1. **Inherit State:**
   - Faded switch (opacity 0.6)
   - Label: "(Inherit: ON/OFF)"

2. **Explicit State:**
   - Solid switch (opacity 1.0)
   - No inherit label

3. **Shift+Click:**
   - Click normally: Toggle ON ↔ OFF
   - Shift+Click: Reset to Inherit (NULL)

---

## **Automated Test Script**

```javascript
// Run this in browser console on /settings/notifications page

async function testNotificationSettings() {
  const results = [];
  
  // Test 1: Disable in-app, enable email
  console.log('🧪 Test 1: In-App OFF, Email ON');
  await fetch('/api/notifications/preferences', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      EnableInAppNotifications: false,
      EnableEmailNotifications: true,
      EmailDigestFrequency: 'realtime',
      EnableProgressUpdates: true,
      EnableLessonCompletion: null, // Inherit
      EmailLessonCompletion: null   // Inherit
    })
  });
  
  // Trigger lesson completion (need backend call)
  console.log('Complete a lesson now and check:');
  console.log('- NO in-app notification in bell');
  console.log('- Email should arrive');
  
  results.push({ test: 'In-App OFF, Email ON', status: 'manual_verify' });
  
  // Test 2: Both enabled
  console.log('🧪 Test 2: Both ON');
  await fetch('/api/notifications/preferences', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      EnableInAppNotifications: true,
      EnableEmailNotifications: true
    })
  });
  
  console.log('Complete a lesson now and check:');
  console.log('- In-app notification appears');
  console.log('- Email also sent');
  
  results.push({ test: 'Both ON', status: 'manual_verify' });
  
  return results;
}

// Run tests
testNotificationSettings();
```

---

## **Backend Verification Commands**

### **Check Notifications Created:**
```sql
-- All notifications for user
SELECT TOP 10 * FROM Notifications 
WHERE UserId = '<user-id>' 
ORDER BY CreatedAt DESC

-- Check if in-app and email handling is correct
SELECT 
  Id, Type, Priority, Title, 
  CASE WHEN IsRead = 1 THEN 'Read' ELSE 'Unread' END as Status,
  CreatedAt
FROM Notifications
WHERE UserId = '<user-id>'
ORDER BY CreatedAt DESC
```

### **Check User Preferences:**
```sql
SELECT 
  EnableInAppNotifications,
  EnableEmailNotifications,
  EmailDigestFrequency,
  EnableProgressUpdates,
  EnableLessonCompletion,
  EmailLessonCompletion,
  EnableCourseMilestones,
  EmailCourseMilestones
FROM NotificationPreferences
WHERE UserId = '<user-id>'
```

### **Check Email Logs:**
```sql
SELECT TOP 10 * FROM EmailLogs
WHERE UserId = '<user-id>'
ORDER BY SentAt DESC
```

### **Backend Console Logs to Watch For:**

**Success:**
```
✅ Notification allowed for user [id] - InApp: true, Email: true
✅ Notification created: [id] for user [id]
🔔 Socket.io event emitted to user-[id]
📧 Sending realtime email to user [id]
```

**Blocked:**
```
📵 Notification completely blocked for user [id] - both in-app and email disabled
```

**Partial:**
```
✅ Notification allowed for user [id] - InApp: false, Email: true
📧 Sending realtime email to user [id]
```

---

## **Critical Path Testing (Priority)**

**Run these tests first to verify the critical bug fix:**

1. ✅ **Test 1.2** - In-App OFF, Email ON (the bug that was reported)
2. ✅ **Test 1.1** - Both ON (baseline)
3. ✅ **Test 1.4** - Both OFF (should block everything)
4. ✅ **Test 2.2** - Explicit subcategory overrides category
5. ✅ **Test 5.2** - Progress milestones (the 50% and 100% test case)

---

## **Final Checklist Before Marking Complete:**

- [ ] Test 1.2 passes (In-App OFF, Email ON sends email)
- [ ] Test 5.2 passes (50% and 100% milestones trigger notifications)
- [ ] Test 3.2 passes (Shift+Click resets to NULL)
- [ ] Test 7.1 passes (NULL values persist after save/refresh)
- [ ] Test 8.1 passes (All 4 access paths to settings work)
- [ ] No TypeScript compilation errors
- [ ] Backend logs show correct "InApp: false, Email: true" messages
- [ ] Email actually received in inbox

---

## **Status: READY FOR TESTING**

The critical bug has been fixed. The notification system now:
- ✅ Checks in-app and email preferences SEPARATELY
- ✅ Creates notification if EITHER is enabled
- ✅ Only sends in-app if in-app enabled
- ✅ Only sends email if email enabled
- ✅ Respects NULL inheritance properly
- ✅ Has comprehensive access paths for settings and history

**Next Step:** Run the critical path tests to verify the fix works end-to-end.
