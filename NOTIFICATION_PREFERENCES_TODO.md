# Notification Preferences Enforcement - TODO

**Created**: December 11, 2025  
**Status**: PENDING IMPLEMENTATION  
**Priority**: Medium (Optional Enhancement)  
**Estimated Time**: 45-60 minutes (basic enforcement only)

---

## 📋 Overview

The notification preferences UI and storage system is **fully implemented and working**. Users can configure their notification settings through the Profile page. However, these preferences are currently **stored but not enforced** - they don't actually affect which notifications are sent.

### Current State ✅
- User can configure notification preferences via `/profile` → Preferences tab
- All settings save to `NotificationPreferences` table
- 5 in-app notification toggles (Progress, Risk Alerts, Achievements, Course Updates, Assignment Reminders)
- Email notifications toggle
- Email digest frequency (none/realtime/daily/weekly)
- Quiet hours (start/end time)
- Case conversion and timezone handling working perfectly

### What's Missing ❌
- `NotificationService.createNotification()` does NOT check user preferences
- Notifications are sent regardless of user settings
- Quiet hours are not validated
- Email digest batching not implemented

---

## 🎯 Implementation Tasks

### Phase 1: Basic Enforcement (30-45 minutes)

#### Task 1.1: Modify `createNotification()` Method
**File**: `server/src/services/NotificationService.ts`

```typescript
// BEFORE (current):
async createNotification(userId: string, type: string, message: string, relatedId?: string): Promise<Notification> {
  // Creates notification without checking preferences
  const notification = await db.query(`INSERT INTO Notifications...`);
  this.io?.emit('notification-created', notification);
  return notification;
}

// AFTER (proposed):
async createNotification(userId: string, type: string, message: string, relatedId?: string): Promise<Notification | null> {
  // Step 1: Get user preferences
  const prefs = await this.getUserPreferences(userId);
  
  // Step 2: Check if notification type is enabled
  if (!this.isNotificationEnabled(type, prefs)) {
    console.log(`🔕 Notification type "${type}" disabled for user ${userId}`);
    return null; // Don't create notification
  }
  
  // Step 3: Check quiet hours
  if (this.isQuietHours(prefs)) {
    console.log(`🔕 Quiet hours active for user ${userId}`);
    return null; // Don't create notification
  }
  
  // Step 4: Create notification as usual
  const notification = await db.query(`INSERT INTO Notifications...`);
  this.io?.emit('notification-created', notification);
  return notification;
}
```

#### Task 1.2: Add Helper Methods
**File**: `server/src/services/NotificationService.ts`

```typescript
/**
 * Check if a notification type is enabled based on user preferences
 */
private isNotificationEnabled(type: string, prefs: NotificationPreferences): boolean {
  const typeMap: Record<string, keyof NotificationPreferences> = {
    'progress': 'EnableProgressNotifications',
    'risk_alert': 'EnableRiskAlerts',
    'achievement': 'EnableAchievements',
    'course_update': 'EnableCourseUpdates',
    'assignment_reminder': 'EnableAssignmentReminders',
  };
  
  const prefKey = typeMap[type];
  if (!prefKey) return true; // Unknown type, allow by default
  
  return prefs[prefKey] === true;
}

/**
 * Check if current time is within user's quiet hours
 */
private isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.QuietHoursStart || !prefs.QuietHoursEnd) {
    return false; // No quiet hours configured
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight
  
  const startTime = this.parseTimeToMinutes(prefs.QuietHoursStart);
  const endTime = this.parseTimeToMinutes(prefs.QuietHoursEnd);
  
  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  // Normal quiet hours (e.g., 08:00 - 22:00)
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Parse SQL TIME value to minutes since midnight
 */
private parseTimeToMinutes(time: Date | string): number {
  const date = typeof time === 'string' ? new Date(time) : time;
  return date.getHours() * 60 + date.getMinutes();
}
```

#### Task 1.3: Update All Notification Triggers
**Files to Check**:
- `server/src/services/OfficeHoursService.ts` - Office hours notifications
- `server/src/services/StudyGroupService.ts` - Study group notifications
- `server/src/routes/assignments.ts` - Assignment notifications
- Any other files calling `NotificationService.createNotification()`

**Change Required**:
```typescript
// BEFORE:
await NotificationService.createNotification(userId, 'progress', 'Message');

// AFTER:
const notification = await NotificationService.createNotification(userId, 'progress', 'Message');
if (!notification) {
  console.log('Notification blocked by user preferences');
}
```

#### Task 1.4: Testing Checklist
- [ ] Login as student1@gmail.com
- [ ] Go to `/profile` → Preferences tab
- [ ] Disable "Progress Updates"
- [ ] Trigger a progress notification (complete a lesson)
- [ ] Verify notification is NOT created
- [ ] Enable "Progress Updates"
- [ ] Trigger again
- [ ] Verify notification IS created
- [ ] Set quiet hours: 00:00 - 23:59 (all day)
- [ ] Trigger any notification
- [ ] Verify notification is blocked
- [ ] Disable quiet hours
- [ ] Trigger again
- [ ] Verify notification works

---

### Phase 2: Email Digest System (1-2 hours) - DEFERRED

#### Why Deferred?
Email digest batching requires:
- Background job system (e.g., node-cron, bull queue)
- Email template system
- Batch notification collection
- Scheduled email sending
- More complex infrastructure

#### Future Implementation Notes
When implementing email digest:
1. Create scheduled job to run based on `EmailDigestFrequency`:
   - `realtime` - Send immediately (existing behavior)
   - `daily` - Collect notifications, send at specific time (e.g., 9am)
   - `weekly` - Collect notifications, send on specific day (e.g., Monday 9am)
   - `none` - Don't send emails
2. Add `EmailSent` flag to Notifications table
3. Create email templates for digest format
4. Implement unsubscribe functionality
5. Track email delivery status

---

## 🔍 Code Locations

### Files to Modify
1. **NotificationService** (main implementation)
   - Path: `server/src/services/NotificationService.ts`
   - Line ~100-150: `createNotification()` method
   - Add: `isNotificationEnabled()` helper
   - Add: `isQuietHours()` helper
   - Add: `parseTimeToMinutes()` helper

2. **Notification Triggers** (update all callers)
   - `server/src/services/OfficeHoursService.ts`
   - `server/src/services/StudyGroupService.ts`
   - `server/src/routes/assignments.ts`
   - Search for: `NotificationService.createNotification(`

### Database Schema (already exists)
```sql
-- NotificationPreferences table (already created)
CREATE TABLE NotificationPreferences (
  Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  UserId UNIQUEIDENTIFIER NOT NULL,
  EnableProgressNotifications BIT DEFAULT 1,
  EnableRiskAlerts BIT DEFAULT 1,
  EnableAchievements BIT DEFAULT 1,
  EnableCourseUpdates BIT DEFAULT 1,
  EnableAssignmentReminders BIT DEFAULT 1,
  EnableEmailNotifications BIT DEFAULT 1,
  EmailDigestFrequency NVARCHAR(20) DEFAULT 'daily',
  QuietHoursStart TIME NULL,
  QuietHoursEnd TIME NULL,
  CreatedAt DATETIME2 DEFAULT GETDATE(),
  UpdatedAt DATETIME2 DEFAULT GETDATE(),
  FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);
```

---

## ✅ Acceptance Criteria

### Phase 1 (Basic Enforcement)
- [ ] Notifications respect type toggles (Progress, Risk Alerts, etc.)
- [ ] Quiet hours prevent notifications during specified times
- [ ] Overnight quiet hours work correctly (e.g., 22:00 - 08:00)
- [ ] Disabled notifications don't appear in bell icon or database
- [ ] Toast notifications still show for user-initiated actions
- [ ] No errors in console or server logs
- [ ] All existing notification triggers still work when enabled

### Phase 2 (Email Digest) - DEFERRED
- [ ] Daily digest emails collect 24 hours of notifications
- [ ] Weekly digest emails collect 7 days of notifications
- [ ] Realtime emails send immediately
- [ ] None option prevents all emails
- [ ] Email templates are professional and readable
- [ ] Unsubscribe links work correctly

---

## 📊 Impact Assessment

### User Experience Impact
- **Positive**: Users gain actual control over notifications (not just UI)
- **Positive**: Reduces notification fatigue
- **Positive**: Respects quiet hours for better UX
- **Neutral**: No visual changes to existing UI

### Technical Impact
- **Low Risk**: Changes are isolated to NotificationService
- **Medium Complexity**: Logic is straightforward (if/else checks)
- **High Value**: Completes the notification preferences feature
- **Breaking Changes**: None (return type change from `Promise<Notification>` to `Promise<Notification | null>` is backward compatible)

### Testing Impact
- **Manual Testing**: ~15-20 minutes
- **Automated Testing**: Consider adding unit tests for helpers
- **Regression Risk**: Low (existing behavior unchanged when all preferences enabled)

---

## 🚦 Decision: When to Implement?

### Implement Now If:
- User profile work is complete and fresh in mind
- Want to finish the notification preferences feature fully
- Have 45-60 minutes available
- Want to provide immediate user value

### Defer If:
- Other high-priority features pending
- Want to batch with other notification system improvements
- Email digest system is required (adds 1-2 hours)
- Need more time for thorough testing

### Recommendation
**Implement Phase 1 now** (45 minutes) - The context is fresh, code is simple, and it provides immediate value. Defer Phase 2 (email digest) until email infrastructure is needed for other features.

---

## 📝 Notes

- This is an **optional enhancement** - the system works without it
- Users can still configure preferences (just not enforced yet)
- No breaking changes to existing functionality
- Clear separation between Phase 1 (quick win) and Phase 2 (complex)
- All infrastructure (database, API, UI) already exists
- Only the enforcement logic is missing

---

**Status**: Ready to implement whenever priority allows  
**Next Step**: Review this document and decide on implementation timing  
**Contact**: Update PROJECT_STATUS.md when implemented
