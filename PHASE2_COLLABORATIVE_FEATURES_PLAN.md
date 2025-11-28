# Phase 2: Collaborative Features Implementation Plan

**Created**: November 28, 2025  
**Status**: Planning Phase  
**Estimated Duration**: 2-3 weeks  
**Prerequisites**: ✅ Phase 1 Complete (Socket.io infrastructure ready)

---

## 📋 OVERVIEW

### Objective
Enable real-time collaborative learning experiences with live sessions, presence awareness, and interactive features for instructor-led and peer-to-peer learning.

### Key Features
1. **Live Study Sessions** - Instructor-led scheduled sessions
2. **Virtual Office Hours** - One-on-one or small group support
3. **Presence System** - Online/offline status and activity tracking
4. **Study Groups** - Peer collaboration spaces
5. **Real-time Q&A** - Interactive chat during sessions

---

## 🎯 USE CASES & USER STORIES

### Use Case 1: Live Instructor-Led Sessions

**As an instructor, I want to:**
- Create scheduled live sessions for my courses
- Set session capacity limits (max attendees)
- Share session links with enrolled students
- See who joined/left the session in real-time
- Conduct live Q&A via chat
- Record sessions for later viewing (optional)
- End sessions and save attendance records

**As a student, I want to:**
- See upcoming live sessions in my dashboard
- Join live sessions with one click
- See who else is attending
- Ask questions via live chat
- Get notifications when sessions are about to start
- Access session recordings after class

**Acceptance Criteria:**
- [ ] Instructor can create/edit/delete sessions
- [ ] Students see sessions in calendar view
- [ ] Join button works 5 minutes before scheduled time
- [ ] Real-time participant list updates
- [ ] Chat messages appear instantly (<1 second)
- [ ] Attendance tracked in database
- [ ] Session status updates (scheduled → active → ended)

---

### Use Case 2: Virtual Office Hours

**As an instructor, I want to:**
- Set regular office hours schedule (weekly recurring)
- Enable drop-in or queue-based access
- See waiting students in a queue
- Admit students one-by-one or in groups
- Have private conversations with students
- Share resources/links during office hours

**As a student, I want to:**
- See instructor availability schedule
- Join office hours when instructor is available
- Wait in queue if instructor is busy
- Get notified when it's my turn
- Have private chat with instructor
- Receive help and guidance in real-time

**Acceptance Criteria:**
- [ ] Instructors can set recurring schedules
- [ ] Queue system shows wait position
- [ ] Students get notifications when admitted
- [ ] Private chat rooms created automatically
- [ ] Session timeout after inactivity
- [ ] Office hours appear in instructor dashboard

---

### Use Case 3: Presence & Activity System

**As a user, I want to:**
- See which friends/classmates are online
- Know when someone is in a live session
- Show my current activity (studying course X, taking quiz, etc.)
- Set my status (available, busy, do not disturb)
- See when someone was last active
- Get desktop notifications when friends come online (optional)

**Acceptance Criteria:**
- [ ] Online/offline status badge on avatars
- [ ] Last seen timestamp when offline
- [ ] Activity indicator (in session, viewing course, etc.)
- [ ] Manual status override (busy, away, etc.)
- [ ] Presence updates within 30 seconds
- [ ] Privacy settings to hide activity

---

### Use Case 4: Peer Study Groups

**As a student, I want to:**
- Create study groups for specific courses
- Invite classmates to my study group
- Schedule group study sessions
- Have persistent group chat
- Share notes and resources
- See when group members are active

**Acceptance Criteria:**
- [ ] Students can create/join multiple groups
- [ ] Group chat persists between sessions
- [ ] Group members see online status
- [ ] Group sessions can be scheduled
- [ ] File sharing in groups (future)
- [ ] Group analytics for activity

---

## 🗄️ DATABASE SCHEMA ANALYSIS

### Existing Tables (Already Created) ✅

```sql
-- Live Sessions
CREATE TABLE dbo.LiveSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    InstructorId UNIQUEIDENTIFIER NOT NULL,
    CourseId UNIQUEIDENTIFIER NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    ScheduledStartTime DATETIME2 NOT NULL,
    ScheduledEndTime DATETIME2 NOT NULL,
    ActualStartTime DATETIME2 NULL,
    ActualEndTime DATETIME2 NULL,
    MaxAttendees INT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'scheduled',
    RecordingUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Live Session Attendees
CREATE TABLE dbo.LiveSessionAttendees (
    SessionId UNIQUEIDENTIFIER NOT NULL,
    StudentId UNIQUEIDENTIFIER NOT NULL,
    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LeftAt DATETIME2 NULL,
    PRIMARY KEY (SessionId, StudentId)
);

-- Chat Rooms (working for AI tutoring)
CREATE TABLE dbo.ChatRooms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(20) NOT NULL,
    ParticipantsJson NVARCHAR(MAX) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Messages (working)
CREATE TABLE dbo.ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL,
    SenderId UNIQUEIDENTIFIER NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    MessageType NVARCHAR(20) NOT NULL DEFAULT 'text',
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
```

### New Tables Needed

```sql
-- User Presence Tracking
CREATE TABLE dbo.UserPresence (
    UserId UNIQUEIDENTIFIER PRIMARY KEY,
    Status NVARCHAR(20) NOT NULL DEFAULT 'offline', -- online, offline, away, busy
    Activity NVARCHAR(100) NULL, -- "Viewing Course: JavaScript", "In Live Session", etc.
    LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Study Groups
CREATE TABLE dbo.StudyGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CourseId UNIQUEIDENTIFIER NULL, -- optional: group specific to a course
    CreatedBy UNIQUEIDENTIFIER NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    MaxMembers INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Study Group Members
CREATE TABLE dbo.StudyGroupMembers (
    GroupId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member
    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    PRIMARY KEY (GroupId, UserId)
);

-- Office Hours Schedules
CREATE TABLE dbo.OfficeHours (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    InstructorId UNIQUEIDENTIFIER NOT NULL,
    DayOfWeek INT NOT NULL, -- 0 = Sunday, 6 = Saturday
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Office Hours Queue
CREATE TABLE dbo.OfficeHoursQueue (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    InstructorId UNIQUEIDENTIFIER NOT NULL,
    StudentId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, admitted, completed, cancelled
    Question NVARCHAR(500) NULL,
    JoinedQueueAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    AdmittedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL
);
```

---

## 🏗️ ARCHITECTURE DESIGN

### Backend Components

#### 1. Socket.io Event Handlers (extend `server/src/sockets.ts`)

```typescript
// Live Session Events
socket.on('join-live-session', async (data: { sessionId: string }) => {
  // Verify session exists and is active
  // Check user enrollment/permission
  // Add to LiveSessionAttendees
  // Join socket room: `session-${sessionId}`
  // Broadcast to room: 'user-joined'
});

socket.on('leave-live-session', async (data: { sessionId: string }) => {
  // Update LeftAt timestamp
  // Leave socket room
  // Broadcast: 'user-left'
});

socket.on('session-message', async (data: { sessionId: string, message: string }) => {
  // Save to ChatMessages with RoomId = sessionId
  // Broadcast to session room: 'new-message'
});

// Presence Events
socket.on('update-presence', async (data: { status: string, activity?: string }) => {
  // Update UserPresence table
  // Broadcast to friends/connections: 'presence-updated'
});

socket.on('typing-in-session', (data: { sessionId: string }) => {
  // Broadcast to session: 'user-typing'
});

// Office Hours Events
socket.on('join-office-hours-queue', async (data: { instructorId: string, question?: string }) => {
  // Add to OfficeHoursQueue
  // Emit to instructor: 'student-joined-queue'
});

socket.on('admit-student', async (data: { queueId: string }) => {
  // Create private chat room
  // Update queue status to 'admitted'
  // Emit to student: 'admitted-to-office-hours'
});
```

#### 2. REST API Routes

**Live Sessions API** (`server/src/routes/liveSessions.ts`):
```typescript
POST   /api/live-sessions              // Create session
GET    /api/live-sessions              // List sessions (filtered by role)
GET    /api/live-sessions/:id          // Get session details
PUT    /api/live-sessions/:id          // Update session
DELETE /api/live-sessions/:id          // Cancel session
POST   /api/live-sessions/:id/start    // Start session (instructor)
POST   /api/live-sessions/:id/end      // End session (instructor)
GET    /api/live-sessions/:id/attendees // Get attendee list
```

**Presence API** (`server/src/routes/presence.ts`):
```typescript
GET    /api/presence/online            // Get online users (friends/classmates)
PUT    /api/presence/status            // Update my status
GET    /api/presence/user/:userId      // Get user presence
GET    /api/presence/course/:courseId  // Get who's studying this course
```

**Office Hours API** (`server/src/routes/officeHours.ts`):
```typescript
POST   /api/office-hours/schedule      // Set schedule (instructor)
GET    /api/office-hours/instructor/:id // Get instructor schedule
POST   /api/office-hours/join-queue    // Join queue (student)
GET    /api/office-hours/queue         // Get my queue (instructor)
POST   /api/office-hours/admit/:queueId // Admit student (instructor)
```

**Study Groups API** (`server/src/routes/studyGroups.ts`):
```typescript
POST   /api/study-groups               // Create group
GET    /api/study-groups               // List my groups
GET    /api/study-groups/:id           // Get group details
PUT    /api/study-groups/:id           // Update group
POST   /api/study-groups/:id/join      // Join group
POST   /api/study-groups/:id/leave     // Leave group
GET    /api/study-groups/:id/members   // Get members
POST   /api/study-groups/:id/message   // Send message to group
```

#### 3. Services

**LiveSessionService** (`server/src/services/LiveSessionService.ts`):
- `createSession(data)` - Create new session
- `startSession(sessionId)` - Mark session as active
- `endSession(sessionId)` - Mark session as ended
- `addAttendee(sessionId, userId)` - Add to attendees
- `removeAttendee(sessionId, userId)` - Remove from attendees
- `getActiveSession(sessionId)` - Get session details
- `notifySessionStart(sessionId)` - Send notifications to enrolled students

**PresenceService** (`server/src/services/PresenceService.ts`):
- `updatePresence(userId, status, activity)` - Update user presence
- `getUserPresence(userId)` - Get user status
- `getOnlineUsers(courseId?)` - Get online users (optionally filtered by course)
- `broadcastPresenceChange(userId)` - Notify connections

---

### Frontend Components

#### Pages

**1. LiveSessionsPage** (`client/src/pages/Learning/LiveSessionsPage.tsx`)
- Calendar view of upcoming sessions
- List view with filters (my courses, all courses)
- "Join Session" buttons (enabled 5 min before start)
- Session cards showing: title, instructor, time, attendee count

**2. LiveSessionRoom** (`client/src/pages/Learning/LiveSessionRoom.tsx`)
- Main video/content area (placeholder for Phase 3 WebRTC)
- Participant list sidebar with online indicators
- Live chat panel at bottom
- "Leave Session" button
- Instructor controls: "End Session", "Mute All" (future)

**3. OfficeHoursPage** (`client/src/pages/Learning/OfficeHoursPage.tsx`)
**Student View:**
- Instructor availability schedule
- "Join Queue" button
- Queue position display
- Estimated wait time

**Instructor View:**
- Current queue with student names
- "Admit Student" buttons
- Active private sessions list
- "End Office Hours" button

**4. StudyGroupsPage** (`client/src/pages/Learning/StudyGroupsPage.tsx`)
- List of my study groups
- "Create Group" button
- Group cards showing: name, members online count, last activity
- Search for public groups to join

**5. StudyGroupRoom** (`client/src/pages/Learning/StudyGroupRoom.tsx`)
- Group info header
- Members list with presence
- Persistent chat
- Shared resources section (future)

#### Components

**1. PresenceIndicator** (`client/src/components/Presence/PresenceIndicator.tsx`)
```tsx
<PresenceIndicator 
  userId="user-id"
  showActivity={true}
  size="small" // small, medium, large
/>
```
- Green dot = online
- Gray dot = offline
- Orange dot = away/busy
- Tooltip shows: "Online - In live session"

**2. SessionCard** (`client/src/components/LiveSession/SessionCard.tsx`)
- Session thumbnail/banner
- Title, instructor, time
- Attendee avatars (first 5)
- Join/View Details buttons

**3. ParticipantList** (`client/src/components/LiveSession/ParticipantList.tsx`)
- Scrollable list of attendees
- Presence indicators
- Role badges (instructor, student)
- Joined time

**4. LiveChat** (`client/src/components/LiveSession/LiveChat.tsx`)
- Reuse existing chat component from AI tutoring
- Auto-scroll to bottom
- Typing indicators
- Message timestamps

**5. OfficeHoursQueue** (`client/src/components/OfficeHours/OfficeHoursQueue.tsx`)
- Queue list with position numbers
- Student names and questions
- Wait time estimates
- Admit/Skip buttons (instructor)

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1: Backend Foundation (5 days)

**Day 1-2: Database & API Setup**
- [ ] Create database migration scripts for new tables
- [ ] Create LiveSessionService
- [ ] Create PresenceService
- [ ] Implement Live Sessions API routes (6 endpoints)

**Day 3-4: Socket.io Handlers**
- [ ] Extend sockets.ts with session events
- [ ] Implement presence update broadcasts
- [ ] Add typing indicators for sessions
- [ ] Test socket events with Postman/Thunder Client

**Day 5: Office Hours & Study Groups APIs**
- [ ] Create Office Hours API routes
- [ ] Create Study Groups API routes
- [ ] Register all new routes in index.ts
- [ ] Integration testing

### Week 2: Frontend Core Features (5 days)

**Day 1: Live Sessions UI**
- [ ] Create LiveSessionsPage with calendar view
- [ ] Create SessionCard component
- [ ] Implement session list fetching
- [ ] Add create/edit session dialog (instructor)

**Day 2: Live Session Room**
- [ ] Create LiveSessionRoom page
- [ ] Implement ParticipantList component
- [ ] Integrate LiveChat component
- [ ] Socket connection for session room

**Day 3: Presence System**
- [ ] Create PresenceIndicator component
- [ ] Implement presence updates on activity
- [ ] Add presence to user avatars across app
- [ ] Show online status in dashboards

**Day 4: Office Hours UI**
- [ ] Create OfficeHoursPage (dual view)
- [ ] Implement queue display
- [ ] Add join queue functionality
- [ ] Private chat room creation

**Day 5: Polish & Integration**
- [ ] Add routes to navigation menu
- [ ] Implement notifications for sessions
- [ ] Add session reminders (5 min before)
- [ ] Error handling and loading states

### Week 3: Study Groups & Testing (5 days)

**Day 1-2: Study Groups**
- [ ] Create StudyGroupsPage
- [ ] Create StudyGroupRoom
- [ ] Implement group creation/joining
- [ ] Group chat integration

**Day 3: End-to-End Testing**
- [ ] Multi-user session testing
- [ ] Presence system testing
- [ ] Office hours queue testing
- [ ] Cross-browser compatibility

**Day 4: Performance & Optimization**
- [ ] Load testing with 50+ concurrent users
- [ ] Optimize socket event handlers
- [ ] Add connection retry logic
- [ ] Memory leak checks

**Day 5: Documentation & Deployment**
- [ ] Update ARCHITECTURE.md
- [ ] Create user guide for instructors
- [ ] Create user guide for students
- [ ] Update PROJECT_STATUS.md

---

## 🎨 UI/UX DESIGN NOTES

### Design Principles
1. **Minimal Friction**: Join sessions with one click
2. **Clear Status**: Always show connection/presence status
3. **Instant Feedback**: Real-time updates without refresh
4. **Mobile Responsive**: Works on tablets and phones
5. **Accessibility**: Keyboard navigation, screen reader support

### Color Coding
- **Green**: Online, active session
- **Orange**: Away, upcoming session
- **Red**: Offline, ended session
- **Blue**: Informational, scheduled session
- **Gray**: Disabled, unavailable

### Notifications Strategy
- **15 minutes before**: "Session starting soon"
- **5 minutes before**: "Join now available"
- **Session started**: "Session has started, join now"
- **Admitted to office hours**: "Instructor is ready for you"

---

## 🧪 TESTING STRATEGY

### Unit Tests
- [ ] LiveSessionService methods
- [ ] PresenceService methods
- [ ] Socket event handlers
- [ ] API route validation

### Integration Tests
- [ ] Create session → Join session → Send message → Leave session
- [ ] Update presence → Broadcast to connections
- [ ] Join queue → Admit student → Private chat
- [ ] Create group → Add members → Send message

### End-to-End Tests
- [ ] Full live session workflow (instructor + 3 students)
- [ ] Office hours with queue (1 instructor, 5 students)
- [ ] Study group with real-time chat
- [ ] Presence updates across tabs

### Performance Tests
- [ ] 100 users in one session
- [ ] 50 concurrent sessions
- [ ] Presence updates with 1000+ users
- [ ] Message throughput (1000 msg/min)

---

## 📊 SUCCESS METRICS

### Phase 2 Acceptance Criteria

**Technical:**
- [ ] 100+ concurrent users per session without lag
- [ ] Message latency <500ms
- [ ] Presence updates <3 seconds
- [ ] Socket connection uptime >99%
- [ ] No memory leaks after 8-hour session

**User Experience:**
- [ ] Students can join sessions with 1 click
- [ ] Instructor can see all attendees in real-time
- [ ] Chat messages appear instantly
- [ ] Presence indicators accurate
- [ ] Office hours queue works smoothly

**Business:**
- [ ] 50% of students join at least one live session
- [ ] Average session attendance: 10+ students
- [ ] Office hours utilization: 5+ students/week
- [ ] Study group creation: 10+ groups in first month

---

## 🚧 DEPENDENCIES & BLOCKERS

### Prerequisites Met ✅
- Socket.io infrastructure working
- Authentication system solid
- Database schema exists
- Chat system working (can reuse)

### Potential Blockers
- ⚠️ Video/audio not included (Phase 3)
- ⚠️ Screen sharing requires WebRTC (Phase 3)
- ⚠️ Recording requires external service (future)
- ⚠️ File uploads in chat (can defer to Phase 3)

### External Dependencies
- None for Phase 2 (all features use existing tech stack)

---

## 💡 FUTURE ENHANCEMENTS (Phase 3)

**After Phase 2 is stable:**
- Video/audio via WebRTC or Jitsi integration
- Screen sharing for instructors
- Whiteboard/collaborative canvas
- Breakout rooms in sessions
- Session recording and playback
- File uploads in chat
- Polls and quizzes during sessions
- Hand-raise feature
- Session analytics dashboard

---

## 📝 DECISION LOG

### Key Decisions Made

**1. Reuse Chat Infrastructure**
- Decision: Use existing ChatRooms/ChatMessages for sessions
- Rationale: Already working, no duplication, consistent UX
- Impact: Faster development, less code to maintain

**2. Presence Updates via Heartbeat**
- Decision: Client sends presence update every 30 seconds
- Rationale: Balance between real-time and server load
- Impact: 30-second delay acceptable for presence

**3. Office Hours Queue vs. Calendar Slots**
- Decision: Use queue system, not calendar booking
- Rationale: More flexible, spontaneous help
- Impact: Students can join anytime, less scheduling friction

**4. No Video in Phase 2**
- Decision: Defer video/audio to Phase 3
- Rationale: Complex WebRTC integration, separate project
- Impact: Phase 2 focuses on presence + chat, faster delivery

**5. Study Groups = Persistent Chat Rooms**
- Decision: Study groups are just chat rooms with members list
- Rationale: Simple, familiar UX, easy to implement
- Impact: Can expand with more features later

---

## 🎯 IMMEDIATE NEXT STEPS

**To Start Phase 2:**
1. ✅ Review and approve this plan
2. [ ] Create database migration scripts
3. [ ] Set up LiveSessionService with basic CRUD
4. [ ] Extend sockets.ts with first session event (join-session)
5. [ ] Create LiveSessionsPage with session list
6. [ ] Test with 2-3 users in development

**First Milestone** (End of Week 1):
- Backend API working for live sessions
- Socket handlers for join/leave/message
- Basic session list page in frontend
- Can create and join a test session

---

**Created by**: AI Assistant  
**Last Updated**: November 28, 2025  
**Status**: Ready for Review and Approval  
**Next Review**: After approval, start Week 1 implementation
