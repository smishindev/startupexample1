# Phase 2 Week 2 - Frontend Implementation Plan

**Date**: November 28, 2025  
**Status**: Ready to Start  
**Previous Week**: Backend COMPLETE & TESTED ✅

---

## 📋 Overview

Week 2 focuses on building the frontend user interface for Phase 2 collaborative features. All backend APIs are operational and tested, ready for frontend integration.

**Objective**: Create intuitive, responsive UI for Live Sessions, Study Groups, Office Hours, and Presence features.

---

## 🎯 Week 2 Goals

### Primary Deliverables
1. ✅ **Live Sessions UI** - Browse, create, join sessions with real-time updates
2. ✅ **Study Groups UI** - Discover, create, manage study groups
3. ✅ **Office Hours UI** - Schedule management and queue system
4. ✅ **Presence Indicators** - Show online users throughout the app
5. ✅ **Navigation Updates** - Integrate new features into app navigation

### Success Criteria
- All 4 feature areas have functional UI
- Real-time updates working via Socket.IO
- Role-based UI (student vs instructor views)
- Responsive design (mobile-friendly)
- Integration with existing auth and navigation

---

## 📦 Implementation Order

### Day 1: Live Sessions (Priority 1)
**Why First**: Most complex, core collaborative feature

#### Tasks:
1. **API Service** (`client/src/services/liveSessionsApi.ts`)
   - Create CRUD operations for sessions
   - Join/leave session methods
   - Get attendees list
   - Error handling

2. **Types** (`client/src/types/liveSession.ts`)
   - LiveSession interface
   - SessionStatus enum
   - Attendee interface

3. **Instructor Components**:
   - `LiveSessionList.tsx` - View all sessions
   - `CreateSessionModal.tsx` - Create new session
   - `SessionDetails.tsx` - View/manage session details
   - `SessionAttendees.tsx` - View attendee list

4. **Student Components**:
   - `UpcomingSessionsList.tsx` - Browse available sessions
   - `JoinSessionButton.tsx` - Join session action
   - `MySessionsList.tsx` - View enrolled sessions

5. **Pages**:
   - `/live-sessions` - Main page (role-based view)
   - `/live-sessions/:id` - Session details page

6. **Real-time Integration**:
   - Listen for `session-started`, `session-ended` events
   - Listen for `attendee-joined`, `attendee-left` events
   - Auto-update session lists

---

### Day 2: Study Groups (Priority 2)
**Why Second**: Peer collaboration, less complex than sessions

#### Tasks:
1. **API Service** (`client/src/services/studyGroupsApi.ts`)
   - CRUD for study groups
   - Join/leave group methods
   - Member management
   - Search groups

2. **Types** (`client/src/types/studyGroup.ts`)
   - StudyGroup interface
   - GroupMember interface
   - MemberRole enum

3. **Components**:
   - `StudyGroupCard.tsx` - Display group info
   - `StudyGroupList.tsx` - Browse groups
   - `CreateGroupModal.tsx` - Create new group
   - `GroupMembers.tsx` - View/manage members
   - `JoinGroupButton.tsx` - Join action

4. **Pages**:
   - `/study-groups` - Browse all groups
   - `/study-groups/:id` - Group details/chat
   - `/study-groups/my-groups` - My groups

5. **Real-time Integration**:
   - Listen for `member-joined`, `member-left` events
   - Listen for `group-updated`, `group-deleted` events
   - Auto-update member lists

---

### Day 3: Office Hours (Priority 3)
**Why Third**: Instructor-focused, queue system

#### Tasks:
1. **API Service** (`client/src/services/officeHoursApi.ts`)
   - Schedule CRUD
   - Queue operations (join, leave, admit)
   - Get queue status
   - Queue statistics

2. **Types** (`client/src/types/officeHours.ts`)
   - OfficeHoursSchedule interface
   - QueueEntry interface
   - QueueStatus enum

3. **Instructor Components**:
   - `OfficeHoursSchedule.tsx` - Manage schedules
   - `CreateScheduleModal.tsx` - Create schedule
   - `QueueManagement.tsx` - View/admit students
   - `QueueStats.tsx` - Queue statistics

4. **Student Components**:
   - `AvailableOfficeHours.tsx` - Browse schedules
   - `JoinQueueButton.tsx` - Join queue
   - `MyQueueStatus.tsx` - View queue position

5. **Pages**:
   - `/office-hours` - Main page (role-based)
   - `/office-hours/:instructorId` - Instructor's office hours

6. **Real-time Integration**:
   - Listen for `queue-updated` events
   - Listen for `office-hours-admitted` events
   - Auto-update queue positions

---

### Day 4: Presence System (Priority 4)
**Why Last**: Enhances other features, not standalone

#### Tasks:
1. **API Service** (`client/src/services/presenceApi.ts`)
   - Get online users
   - Update status
   - Heartbeat mechanism

2. **Types** (`client/src/types/presence.ts`)
   - UserPresence interface
   - PresenceStatus enum ('online', 'away', 'busy', 'offline')

3. **Components**:
   - `OnlineIndicator.tsx` - Show online status badge
   - `OnlineUsersList.tsx` - List online users
   - `PresenceStatusSelector.tsx` - Change status dropdown
   - `UserPresenceBadge.tsx` - Small presence indicator

4. **Integration Points**:
   - Add to user avatars throughout app
   - Add to chat participant lists
   - Add to study group members
   - Add to session attendees

5. **Real-time Integration**:
   - Listen for `presence-changed` events
   - Send heartbeat every 60 seconds
   - Auto-update online indicators

---

### Day 5: Navigation & Polish
**Final Integration**

#### Tasks:
1. **Navigation Updates**:
   - Add "Live Sessions" menu item
   - Add "Study Groups" menu item
   - Add "Office Hours" menu item
   - Add online users count to header

2. **Dashboard Widgets**:
   - "Upcoming Sessions" widget
   - "My Study Groups" widget
   - "Office Hours Status" widget (for students in queue)

3. **Polish**:
   - Loading states for all components
   - Error handling with user-friendly messages
   - Empty states ("No sessions scheduled")
   - Skeleton loaders
   - Toast notifications

4. **Testing**:
   - Test all features with student account
   - Test all features with instructor account
   - Test real-time updates with multiple browsers
   - Test responsive design (mobile, tablet, desktop)

---

## 🛠️ Technical Stack

### Frontend Technologies
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand (already in use)
- **UI Components**: Material-UI (already in use)
- **Real-time**: Socket.IO Client (already configured)
- **HTTP Client**: Fetch API with auth interceptor

### Code Patterns to Follow
1. **API Services**: Centralized in `client/src/services/`
2. **Types**: Dedicated type files in `client/src/types/`
3. **Components**: Feature-based folders in `client/src/components/`
4. **Pages**: Route-based pages in `client/src/pages/`
5. **Error Handling**: Consistent error boundaries and toast notifications

---

## 📐 Design Guidelines

### UI Consistency
- Follow existing Material-UI theme
- Use consistent spacing (8px grid)
- Match existing color scheme
- Reuse common components (buttons, cards, modals)

### Responsive Design
- Mobile-first approach
- Breakpoints: xs (0), sm (600), md (900), lg (1200), xl (1536)
- Stack cards vertically on mobile
- Hide secondary info on small screens

### User Experience
- Clear call-to-action buttons
- Immediate visual feedback on actions
- Real-time updates without page refresh
- Loading states during API calls
- Error messages with recovery options

---

## 🔌 Socket.IO Integration Pattern

### Event Listeners Setup
```typescript
// In component useEffect
useEffect(() => {
  const socket = io('http://localhost:3001');
  
  // Listen for events
  socket.on('session-started', handleSessionStarted);
  socket.on('attendee-joined', handleAttendeeJoined);
  
  // Cleanup
  return () => {
    socket.off('session-started', handleSessionStarted);
    socket.off('attendee-joined', handleAttendeeJoined);
  };
}, []);
```

### Event Emitters
```typescript
// Emit events
socket.emit('join-live-session', { sessionId });
socket.emit('leave-live-session', { sessionId });
```

---

## 🎨 Component Structure Example

### Live Session Card Component
```
<Card>
  <CardHeader>
    <Title>{session.title}</Title>
    <StatusBadge status={session.status} />
  </CardHeader>
  
  <CardContent>
    <SessionInfo>
      <InstructorInfo instructor={session.instructor} />
      <DateTime scheduledAt={session.scheduledAt} />
      <Capacity current={attendeesCount} max={session.capacity} />
    </SessionInfo>
    
    {session.description && (
      <Description>{session.description}</Description>
    )}
  </CardContent>
  
  <CardActions>
    {canJoin && <JoinButton onClick={handleJoin} />}
    {isInstructor && <ManageButton onClick={handleManage} />}
  </CardActions>
</Card>
```

---

## 🧪 Testing Checklist

### Functional Testing
- [ ] Students can browse and join sessions
- [ ] Instructors can create and manage sessions
- [ ] Students can create and join study groups
- [ ] Admins can manage group members
- [ ] Students can join office hours queue
- [ ] Instructors can admit students from queue
- [ ] Presence status updates in real-time
- [ ] Online indicators show throughout app

### Real-time Testing
- [ ] Session updates appear without refresh
- [ ] Attendee count updates live
- [ ] Queue positions update automatically
- [ ] Presence status changes instantly
- [ ] Notifications appear for events

### Cross-Role Testing
- [ ] Student view shows correct features
- [ ] Instructor view shows management options
- [ ] Role-restricted features are hidden
- [ ] Permissions enforced on actions

### UI/UX Testing
- [ ] Responsive on mobile devices
- [ ] Loading states appear during API calls
- [ ] Error messages are clear and helpful
- [ ] Empty states guide users
- [ ] Forms validate inputs

---

## 📊 Progress Tracking

### Day 1: Live Sessions
- [ ] API service created
- [ ] Types defined
- [ ] Instructor components done
- [ ] Student components done
- [ ] Pages created
- [ ] Real-time integration working

### Day 2: Study Groups
- [ ] API service created
- [ ] Types defined
- [ ] Components done
- [ ] Pages created
- [ ] Real-time integration working

### Day 3: Office Hours
- [ ] API service created
- [ ] Types defined
- [ ] Instructor components done
- [ ] Student components done
- [ ] Pages created
- [ ] Real-time integration working

### Day 4: Presence System
- [ ] API service created
- [ ] Types defined
- [ ] Components done
- [ ] Integration points updated
- [ ] Real-time integration working

### Day 5: Navigation & Polish
- [ ] Navigation updated
- [ ] Dashboard widgets added
- [ ] Loading states implemented
- [ ] Error handling complete
- [ ] Testing complete

---

## 🚀 Ready to Start

**Prerequisites Met:**
- ✅ Backend APIs tested and operational (39 endpoints)
- ✅ Socket.IO server running with event handlers
- ✅ Database tables populated with test data
- ✅ Authentication system working
- ✅ Existing UI patterns established

**Starting Point**: Day 1 - Live Sessions UI

**First File to Create**: `client/src/services/liveSessionsApi.ts`

Let's build! 🎨
