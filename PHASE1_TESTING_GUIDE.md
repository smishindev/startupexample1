# Phase 1 Real-time Notifications - Testing Guide

**Created**: November 27, 2025  
**Status**: Phase 1 Complete - Ready for Testing

---

## ✅ What Was Implemented

### Phase 1: Real-time Notifications Frontend Integration
- ✅ Socket.io connection on NotificationBell mount
- ✅ Real-time notification listener with instant updates
- ✅ Toast notifications for urgent/high priority alerts
- ✅ Cross-device notification-read sync
- ✅ Polling removed (was 30-second intervals)
- ✅ Sonner toast library integrated

---

## 🚀 Testing Instructions

### Prerequisites
1. Both servers must be running:
   - Backend: `http://localhost:3001`
   - Frontend: `http://localhost:5173`

2. User must be logged in (any role)

### Test Scenario 1: Real-time Notification Delivery

**Goal**: Verify notifications appear instantly (<1 second)

**Steps**:
1. Login to the platform
2. Open browser DevTools Console (F12)
3. Look for console message: `"Socket connected for notifications"`
4. Trigger a notification from backend (see below for methods)
5. **Expected**: Notification appears in NotificationBell badge instantly
6. **Expected**: Toast notification pops up (top-right corner)
7. **Expected**: Console shows: `"Received real-time notification: {...}"`

**Success Criteria**:
- ✅ Badge count updates within 1 second
- ✅ Toast appears within 1 second
- ✅ No polling API calls in Network tab

---

### Test Scenario 2: Toast Priority Levels

**Goal**: Verify different toast styles for different priorities

**Priority Levels**:
- **Urgent**: Red/orange warning toast, 5-second duration, with action button
- **High**: Warning toast, 5-second duration, with action button
- **Normal**: Blue info toast, 3-second duration
- **Low**: Blue info toast, 3-second duration

**Steps**:
1. Create notifications with different priorities (see backend methods)
2. **Expected Urgent/High**: Orange/red toast with "View" button
3. **Expected Normal/Low**: Blue info toast, auto-dismisses after 3s

---

### Test Scenario 3: Cross-device Sync

**Goal**: Verify notification-read events sync across tabs/devices

**Steps**:
1. Open platform in TWO browser tabs
2. Login with same account in both tabs
3. Trigger a notification
4. **Expected**: Both tabs show notification instantly
5. Click notification in Tab 1 (marks as read)
6. **Expected**: Notification disappears from Tab 2 automatically

**Success Criteria**:
- ✅ Both tabs receive notification simultaneously
- ✅ Marking read in one tab updates the other
- ✅ Unread count syncs across tabs

---

### Test Scenario 4: Fallback on Socket Failure

**Goal**: Verify graceful degradation if socket connection fails

**Steps**:
1. Stop backend server
2. Refresh frontend
3. **Expected**: Console shows error: `"Socket connection failed, will use REST API only"`
4. **Expected**: Historical notifications still load via REST API
5. Start backend server
6. **Expected**: Socket reconnects automatically

---

## 🔧 Backend Methods to Trigger Notifications

### Method 1: Using NotificationService Directly

**File**: `server/src/services/NotificationService.ts`

```typescript
// In any backend route/service
await notificationService.createNotification({
  userId: 'user-guid-here',
  type: 'test',
  priority: 'urgent',
  title: 'Test Notification',
  message: 'This is a test notification for real-time delivery',
  actionUrl: '/dashboard',
  actionText: 'Go to Dashboard'
});
```

### Method 2: Using REST API Endpoint

**Create a test endpoint** (temporary):

```typescript
// server/src/routes/notifications.ts

// Add this test route (remove after testing)
router.post('/test-notification', authenticateToken, async (req, res) => {
  try {
    const notification = await notificationService.createNotification({
      userId: req.user.userId,
      type: 'test',
      priority: req.body.priority || 'normal',
      title: req.body.title || 'Test Notification',
      message: req.body.message || 'Testing real-time delivery',
      actionUrl: req.body.actionUrl,
      actionText: req.body.actionText
    });
    
    res.json({ success: true, notification });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Test from frontend console**:
```javascript
fetch('http://localhost:3001/api/notifications/test-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth-storage').token}`
  },
  body: JSON.stringify({
    priority: 'urgent',
    title: 'Urgent Test!',
    message: 'This should show a warning toast',
    actionUrl: '/courses',
    actionText: 'View Courses'
  })
})
```

### Method 3: Trigger via Existing System

**At-Risk Student Notification**:
```typescript
// When a student's performance drops
await notificationService.createAtRiskNotification(studentId, courseId, riskLevel);
```

**Low Progress Notification**:
```typescript
// When student hasn't accessed course in 7 days
await notificationService.createLowProgressNotification(userId, courseId, lastAccessDays);
```

**Assessment Deadline**:
```typescript
// When assessment deadline approaching
await notificationService.createAssessmentDeadlineNotification(userId, assessmentId, daysUntilDue);
```

---

## 📊 What to Check in DevTools

### Console Messages
```
✅ "Socket connected for notifications"
✅ "Received real-time notification: {id, type, title, ...}"
✅ "Notification marked as read: <guid>"
❌ "Socket connection failed, will use REST API only" (if backend down)
```

### Network Tab
```
✅ WebSocket connection to ws://localhost:3001/socket.io/
✅ Initial GET /api/notifications (on mount)
❌ NO repeated polling requests every 30 seconds
```

### Application → LocalStorage
```
Check: localStorage['auth-storage']
Verify: Token exists for socket authentication
```

---

## 🐛 Troubleshooting

### Issue: Socket not connecting

**Symptoms**: Console shows "Socket connection failed"

**Fixes**:
1. Verify backend server running on port 3001
2. Check browser console for CORS errors
3. Verify JWT token exists in auth store
4. Check backend logs for connection attempts

### Issue: Notifications not appearing in real-time

**Symptoms**: Notifications only appear after page refresh

**Checks**:
1. Console shows "Socket connected"?
2. Network tab shows WebSocket connection?
3. Backend emitting to correct user room (`user-${userId}`)?
4. NotificationService.createNotification() called correctly?

### Issue: Toast not appearing

**Symptoms**: Badge updates but no toast

**Checks**:
1. Toaster component in App.tsx?
2. Priority set correctly (urgent/high/normal/low)?
3. Browser console errors?
4. Sonner CSS loaded?

### Issue: Duplicate notifications

**Symptoms**: Same notification appears twice

**Fixes**:
1. Check if both polling AND sockets running (polling should be removed)
2. Verify socket listeners registered only once
3. Check cleanup function in useEffect

---

## ✅ Testing Checklist

- [ ] Socket connects successfully on login
- [ ] Console shows connection message
- [ ] WebSocket visible in Network tab
- [ ] Create urgent notification → Toast appears within 1 second
- [ ] Toast has correct color (warning for urgent/high)
- [ ] Toast has action button if actionUrl provided
- [ ] Click action button → Navigates correctly
- [ ] Badge count updates instantly
- [ ] Open notification menu → Notification listed
- [ ] Click notification → Marks as read
- [ ] Badge count decrements
- [ ] Open second tab → Notification appears in both
- [ ] Mark read in Tab 1 → Disappears from Tab 2
- [ ] Stop backend → Console shows fallback message
- [ ] Start backend → Socket reconnects automatically
- [ ] Historical notifications still load on mount
- [ ] No polling requests in Network tab

---

## 📈 Performance Metrics

**Target Metrics** (Phase 1 Success Criteria):
- ✅ Notification delivery latency: <1 second
- ✅ Zero duplicate notifications
- ✅ Unread count accuracy: 100%
- ✅ Toast notifications for urgent alerts: Yes
- ✅ Graceful fallback if sockets fail: Yes

**How to Measure**:
1. **Latency**: Time between backend emit and frontend update
   - Backend: Log timestamp when emitting
   - Frontend: Log timestamp in onNotification callback
   - Calculate difference

2. **Duplicates**: Check notification IDs in state
   - All IDs should be unique
   - No repeated entries

3. **Sync Accuracy**: Cross-tab testing
   - Counts should match across tabs
   - Mark-as-read should sync instantly

---

## 🎯 Expected Results Summary

**Before Phase 1**:
- 30-second polling delay
- No real-time updates
- No toast notifications
- Manual refresh needed

**After Phase 1**:
- <1 second real-time delivery
- Instant notifications across devices
- Toast alerts for important items
- No polling overhead

---

## 📝 Notes for Future Phases

**Phase 2 Prep** (Collaborative Features):
- Same socket connection can be used
- Add session-related listeners
- Presence system will use similar patterns
- WebSocket connection reused (no additional overhead)

**Phase 3 Prep** (Enhanced Features):
- Video/voice will require WebRTC (separate from Socket.io)
- File sharing uses Socket.io for notifications
- Reactions/threading use same real-time patterns

---

**Testing prepared by**: AI Assistant  
**Phase 1 Status**: ✅ Implementation Complete - Ready for Testing  
**Next Phase**: Phase 2 (Live Sessions & Presence) - Design & Planning
