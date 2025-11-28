# Phase 2 Backend API Reference
## Complete Endpoint Documentation for Testing

**Created:** November 28, 2025  
**Status:** Week 1 Backend Complete - Ready for Testing  
**Base URL:** `http://localhost:3001/api`

---

## Table of Contents

1. [Live Sessions API (10 endpoints)](#live-sessions-api)
2. [Presence API (7 endpoints)](#presence-api)
3. [Office Hours API (10 endpoints)](#office-hours-api)
4. [Study Groups API (12 endpoints)](#study-groups-api)
5. [Socket.IO Events (15+ events)](#socketio-events)
6. [Testing Scenarios](#testing-scenarios)

---

## Live Sessions API

### 1. Create Live Session
**POST** `/live-sessions`  
**Auth:** Instructor  
**Body:**
```json
{
  "title": "JavaScript Fundamentals",
  "description": "Learn the basics of JavaScript",
  "courseId": "uuid-optional",
  "scheduledAt": "2025-11-29T15:00:00Z",
  "duration": 60,
  "capacity": 50,
  "streamUrl": "https://stream.example.com",
  "materials": [{"type": "pdf", "url": "..."}]
}
```

### 2. Get Session Details
**GET** `/live-sessions/:sessionId`  
**Auth:** Private

### 3. Get Course Sessions
**GET** `/live-sessions/course/:courseId?limit=10`  
**Auth:** Private

### 4. Get Instructor Sessions
**GET** `/live-sessions/instructor/my-sessions?status=live`  
**Auth:** Instructor  
**Query Params:** `status` (scheduled|live|ended|cancelled)

### 5. Start Session
**POST** `/live-sessions/:sessionId/start`  
**Auth:** Instructor (owner only)

### 6. End Session
**POST** `/live-sessions/:sessionId/end`  
**Auth:** Instructor (owner only)  
**Body:**
```json
{
  "recordingUrl": "https://recording.example.com"
}
```

### 7. Cancel Session
**POST** `/live-sessions/:sessionId/cancel`  
**Auth:** Instructor (owner only)

### 8. Join Session
**POST** `/live-sessions/:sessionId/join`  
**Auth:** Private

### 9. Leave Session
**POST** `/live-sessions/:sessionId/leave`  
**Auth:** Private

### 10. Get Attendees
**GET** `/live-sessions/:sessionId/attendees`  
**Auth:** Private  
**Response:**
```json
{
  "attendees": [...],
  "totalCount": 25,
  "activeCount": 18
}
```

---

## Presence API

### 1. Get Online Users
**GET** `/presence/online?limit=100`  
**Auth:** Private

### 2. Get Course Online Users
**GET** `/presence/course/:courseId`  
**Auth:** Private

### 3. Get User Presence
**GET** `/presence/user/:userId`  
**Auth:** Private

### 4. Get Bulk Presence
**POST** `/presence/bulk`  
**Auth:** Private  
**Body:**
```json
{
  "userIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 5. Update Status
**PUT** `/presence/status`  
**Auth:** Private  
**Body:**
```json
{
  "status": "online",
  "activity": "Viewing Course: JavaScript"
}
```
**Valid Status:** `online`, `offline`, `away`, `busy`

### 6. Update Activity
**PUT** `/presence/activity`  
**Auth:** Private  
**Body:**
```json
{
  "activity": "In Live Session: JavaScript"
}
```

### 7. Send Heartbeat
**POST** `/presence/heartbeat`  
**Auth:** Private  
**Note:** Updates last seen timestamp

---

## Office Hours API

### 1. Create Schedule
**POST** `/office-hours/schedule`  
**Auth:** Instructor  
**Body:**
```json
{
  "dayOfWeek": 1,
  "startTime": "14:00:00",
  "endTime": "16:00:00"
}
```
**Note:** dayOfWeek: 0=Sunday, 6=Saturday

### 2. Get Instructor Schedules
**GET** `/office-hours/schedule/:instructorId`  
**Auth:** Private

### 3. Update Schedule
**PUT** `/office-hours/schedule/:scheduleId`  
**Auth:** Instructor  
**Body:**
```json
{
  "dayOfWeek": 2,
  "startTime": "15:00:00",
  "endTime": "17:00:00",
  "isActive": true
}
```

### 4. Delete Schedule
**DELETE** `/office-hours/schedule/:scheduleId`  
**Auth:** Instructor

### 5. Join Queue
**POST** `/office-hours/queue/join`  
**Auth:** Private (student)  
**Body:**
```json
{
  "instructorId": "uuid",
  "question": "Need help with arrays"
}
```

### 6. Get Queue
**GET** `/office-hours/queue/:instructorId`  
**Auth:** Private  
**Response:**
```json
{
  "queue": [...],
  "count": 5,
  "stats": {
    "waiting": 3,
    "admitted": 2,
    "averageWaitTime": 12
  }
}
```

### 7. Admit Student
**POST** `/office-hours/queue/:queueId/admit`  
**Auth:** Instructor

### 8. Complete Session
**POST** `/office-hours/queue/:queueId/complete`  
**Auth:** Instructor

### 9. Cancel Queue Entry
**POST** `/office-hours/queue/:queueId/cancel`  
**Auth:** Private

### 10. Get My Queue Status
**GET** `/office-hours/my-queue/:instructorId`  
**Auth:** Private  
**Response:**
```json
{
  "queueEntry": {...},
  "position": 3,
  "inQueue": true
}
```

---

## Study Groups API

### 1. Create Study Group
**POST** `/study-groups`  
**Auth:** Private  
**Body:**
```json
{
  "name": "JavaScript Study Group",
  "description": "Learn JS together",
  "courseId": "uuid-optional",
  "maxMembers": 20
}
```

### 2. Get Group Details
**GET** `/study-groups/:groupId`  
**Auth:** Private

### 3. Get Course Groups
**GET** `/study-groups/course/:courseId`  
**Auth:** Private

### 4. Get My Groups
**GET** `/study-groups/my/groups`  
**Auth:** Private

### 5. Join Group
**POST** `/study-groups/:groupId/join`  
**Auth:** Private

### 6. Leave Group
**POST** `/study-groups/:groupId/leave`  
**Auth:** Private

### 7. Get Members
**GET** `/study-groups/:groupId/members`  
**Auth:** Private (member only)

### 8. Promote Member
**POST** `/study-groups/:groupId/members/:userId/promote`  
**Auth:** Private (admin only)

### 9. Remove Member
**POST** `/study-groups/:groupId/members/:userId/remove`  
**Auth:** Private (admin only)

### 10. Update Group
**PUT** `/study-groups/:groupId`  
**Auth:** Private (admin only)  
**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "maxMembers": 25
}
```

### 11. Delete Group
**DELETE** `/study-groups/:groupId`  
**Auth:** Private (admin only)

### 12. Search Groups
**GET** `/study-groups/search?q=javascript&courseId=uuid`  
**Auth:** Private

---

## Socket.IO Events

### Connection Setup
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});
```

### Presence Events

**Emit:**
- `update-presence` - `{ status: 'online|away|busy', activity: 'string' }`
- `presence-heartbeat` - No payload
- `update-activity` - `{ activity: 'string' }`

**Listen:**
- `presence-changed` - `{ userId, status, activity, updatedAt }`
- `presence-updated` - `{ status, activity }`
- `activity-updated` - `{ activity }`

### Live Session Events

**Emit:**
- `join-live-session` - `{ sessionId: 'uuid' }`
- `leave-live-session` - `{ sessionId: 'uuid' }`
- `session-message` - `{ sessionId, content, messageType: 'text|question|poll' }`
- `session-typing-start` - `{ sessionId: 'uuid' }`
- `session-typing-stop` - `{ sessionId: 'uuid' }`

**Listen:**
- `joined-live-session` - `{ sessionId, message }`
- `left-live-session` - `{ sessionId }`
- `session-participant-joined` - `{ userId, sessionId, timestamp }`
- `session-participant-left` - `{ userId, sessionId, timestamp }`
- `session-new-message` - `{ id, sessionId, content, messageType, createdAt, user }`
- `session-user-typing` - `{ userId, email, sessionId }`
- `session-user-stop-typing` - `{ userId, sessionId }`
- `session-started` - `{ sessionId, startedAt, streamUrl }`
- `session-ended` - `{ sessionId, endedAt, recordingUrl }`

### Study Group Events

**Emit:**
- `join-study-group` - `{ groupId: 'uuid' }`
- `leave-study-group` - `{ groupId: 'uuid' }`

**Listen:**
- `joined-study-group` - `{ groupId }`
- `left-study-group` - `{ groupId }`
- `study-group-member-joined` - `{ userId, groupId, timestamp }`
- `study-group-member-left` - `{ userId, groupId, timestamp }`
- `study-group-created` - `{ groupId, name, courseId, createdBy }`
- `member-joined` - `{ groupId, userId, joinedAt }`
- `member-left` - `{ groupId, userId, leftAt }`
- `member-promoted` - `{ groupId, userId, role }`
- `group-updated` - `{ groupId, updates }`
- `group-deleted` - `{ groupId, deletedAt }`

### Office Hours Events

**Emit:**
- `join-office-hours-queue` - `{ instructorId, queueId }`
- `leave-office-hours-queue` - `{ instructorId, queueId }`

**Listen:**
- `joined-office-hours-queue` - `{ instructorId, queueId }`
- `left-office-hours-queue` - `{ instructorId }`
- `queue-member-joined` - `{ queueId, studentId, timestamp }`
- `queue-member-left` - `{ queueId, studentId, timestamp }`
- `queue-updated` - `{ action: 'joined|admitted|completed|cancelled', queueId, studentId, position?, timestamp }`
- `office-hours-admitted` - `{ queueId, instructorId, admittedAt }`
- `office-hours-completed` - `{ queueId, instructorId, completedAt }`
- `office-hours-cancelled` - `{ queueId, instructorId }`

---

## Testing Scenarios

### Scenario 1: Live Session Flow

1. **Instructor Creates Session**
   ```bash
   POST /api/live-sessions
   # Response: sessionId
   ```

2. **Student Gets Upcoming Sessions**
   ```bash
   GET /api/live-sessions/course/{courseId}
   # Response: List of sessions
   ```

3. **Instructor Starts Session**
   ```bash
   POST /api/live-sessions/{sessionId}/start
   # Socket broadcasts: session-started
   ```

4. **Students Join via Socket**
   ```javascript
   socket.emit('join-live-session', { sessionId });
   // Listen for: joined-live-session, session-participant-joined
   ```

5. **Students Send Messages**
   ```javascript
   socket.emit('session-message', {
     sessionId,
     content: 'Great explanation!',
     messageType: 'text'
   });
   // All participants receive: session-new-message
   ```

6. **Instructor Ends Session**
   ```bash
   POST /api/live-sessions/{sessionId}/end
   # Socket broadcasts: session-ended
   ```

### Scenario 2: Office Hours Queue

1. **Instructor Creates Schedule**
   ```bash
   POST /api/office-hours/schedule
   Body: { dayOfWeek: 1, startTime: "14:00", endTime: "16:00" }
   ```

2. **Student Joins Queue**
   ```bash
   POST /api/office-hours/queue/join
   Body: { instructorId, question: "Need help" }
   # Response: queueEntry with position
   ```

3. **Student Checks Position via Socket**
   ```javascript
   socket.emit('join-office-hours-queue', { instructorId, queueId });
   // Listen for: queue-updated
   ```

4. **Instructor Views Queue**
   ```bash
   GET /api/office-hours/queue/{instructorId}
   # Response: queue array + stats
   ```

5. **Instructor Admits Student**
   ```bash
   POST /api/office-hours/queue/{queueId}/admit
   # Socket emits: office-hours-admitted to student
   ```

6. **Instructor Completes Session**
   ```bash
   POST /api/office-hours/queue/{queueId}/complete
   # Socket emits: office-hours-completed
   ```

### Scenario 3: Study Group

1. **Student Creates Group**
   ```bash
   POST /api/study-groups
   Body: { name: "JS Study", courseId, maxMembers: 10 }
   # Creator becomes admin automatically
   ```

2. **Other Students Join**
   ```bash
   POST /api/study-groups/{groupId}/join
   # Socket broadcasts: member-joined
   ```

3. **Join Socket Room**
   ```javascript
   socket.emit('join-study-group', { groupId });
   // Listen for: study-group-member-joined
   ```

4. **Admin Promotes Member**
   ```bash
   POST /api/study-groups/{groupId}/members/{userId}/promote
   # Socket broadcasts: member-promoted
   ```

5. **Get All Members**
   ```bash
   GET /api/study-groups/{groupId}/members
   # Response: members array with roles
   ```

### Scenario 4: Presence Tracking

1. **User Connects (Automatic)**
   ```javascript
   // On socket connection, user automatically set online
   socket.on('presence-changed', (data) => {
     console.log('User presence:', data);
   });
   ```

2. **Update Status Manually**
   ```bash
   PUT /api/presence/status
   Body: { status: 'away', activity: 'Taking a break' }
   # Broadcasts to all connected clients
   ```

3. **Send Heartbeat (Keep Alive)**
   ```bash
   POST /api/presence/heartbeat
   # Updates last seen timestamp
   ```

4. **Get Online Users in Course**
   ```bash
   GET /api/presence/course/{courseId}
   # Response: Array of online users enrolled in course
   ```

5. **User Disconnects (Automatic)**
   ```javascript
   // On socket disconnect, user set offline
   // After 5 minutes of inactivity, auto-marked offline
   ```

---

## Testing Tools

### Recommended Tools
- **Thunder Client** (VS Code extension)
- **Postman**
- **Browser Console** (for Socket.IO)

### Sample Authentication Header
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Health Check
```bash
GET http://localhost:3001/health
```
Should return:
```json
{
  "status": "OK",
  "database": { "connected": true }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Database Verification

```sql
-- Check if all Phase 2 tables exist
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
  'UserPresence', 
  'StudyGroups', 
  'StudyGroupMembers', 
  'OfficeHours', 
  'OfficeHoursQueue'
);
-- Should return 5 rows

-- Check LiveSessions (existing)
SELECT COUNT(*) FROM LiveSessions;

-- Check LiveSessionAttendees (existing)
SELECT COUNT(*) FROM LiveSessionAttendees;
```

---

## Next Steps for Frontend (Week 2)

1. Create presence indicator component
2. Build live session room UI
3. Implement office hours queue interface
4. Design study group pages
5. Add real-time chat components
6. Integrate Socket.IO client hooks

**Backend is 100% ready for frontend integration!** ✅
