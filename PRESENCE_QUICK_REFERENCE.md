# Presence System - Quick Reference

**Status:** Production Ready ✅  
**Date:** December 3, 2025

---

## For Developers

### Import Components

```typescript
// Components
import OnlineIndicator from './components/Presence/OnlineIndicator';
import UserPresenceBadge from './components/Presence/UserPresenceBadge';
import OnlineUsersList from './components/Presence/OnlineUsersList';
import PresenceStatusSelector from './components/Presence/PresenceStatusSelector';
import OnlineUsersWidget from './components/Presence/OnlineUsersWidget';

// Hook
import { usePresence } from './hooks/usePresence';

// API
import { presenceApi } from './services/presenceApi';

// Types
import { PresenceStatus, UserPresence, OnlineUser } from './types/presence';
```

---

## Quick Usage Examples

### 1. Show Online Indicator Next to User Name

```tsx
<Box display="flex" alignItems="center" gap={1}>
  <OnlineIndicator status={user.Status} />
  <Typography>{user.FirstName} {user.LastName}</Typography>
</Box>
```

### 2. Avatar with Presence Badge

```tsx
<UserPresenceBadge
  avatarUrl={user.Avatar}
  firstName={user.FirstName}
  lastName={user.LastName}
  status={user.Status}
  lastSeenAt={user.LastSeenAt}
  size={40}
/>
```

### 3. Status Selector

```tsx
const { currentStatus, updateStatus } = usePresence();

<PresenceStatusSelector
  currentStatus={currentStatus}
  onStatusChange={(status) => updateStatus(status)}
/>
```

### 4. Online Users List

```tsx
// All online users
<OnlineUsersList limit={50} />

// Course-specific
<OnlineUsersList courseId="abc-123" title="Online in This Course" />
```

### 5. Dashboard Widget

```tsx
<OnlineUsersWidget />
```

### 6. Use Presence Hook

```tsx
const { currentStatus, updateStatus, updateActivity, sendHeartbeat } = usePresence({
  autoHeartbeat: true,
  heartbeatInterval: 60000,
  onUserOnline: (data) => console.log('User online:', data),
  onUserOffline: (data) => console.log('User offline:', data),
});

// Update status
await updateStatus('away', 'Taking a break');

// Update activity only
await updateActivity('Viewing Course: React Advanced');

// Manual heartbeat
await sendHeartbeat();
```

---

## Integration Checklist

### Add to Study Groups
```tsx
// In GroupMembersList.tsx
import UserPresenceBadge from '../Presence/UserPresenceBadge';

// Replace Avatar with:
<UserPresenceBadge
  avatarUrl={member.Avatar}
  firstName={member.FirstName}
  lastName={member.LastName}
  status={member.Status || 'offline'}
  size={40}
/>
```

### Add to Live Sessions
```tsx
// In LiveSessionCard.tsx or SessionAttendees.tsx
<UserPresenceBadge
  avatarUrl={attendee.Avatar}
  firstName={attendee.FirstName}
  lastName={attendee.LastName}
  status={attendee.Status || 'offline'}
  size={32}
/>
```

### Add to Office Hours
```tsx
// In QueueDisplay.tsx
<UserPresenceBadge
  avatarUrl={entry.StudentAvatar}
  firstName={entry.StudentFirstName}
  lastName={entry.StudentLastName}
  status={entry.Status || 'offline'}
  size={40}
/>
```

### Add to Dashboard
```tsx
// In Dashboard.tsx or DashboardLayout.tsx
import OnlineUsersWidget from '../components/Presence/OnlineUsersWidget';

<Grid item xs={12} md={4}>
  <OnlineUsersWidget />
</Grid>
```

---

## API Quick Reference

```typescript
// Get all online users
const { users, count } = await presenceApi.getOnlineUsers(50);

// Get online users in a course
const { users } = await presenceApi.getOnlineUsersInCourse(courseId);

// Get specific user's presence
const presence = await presenceApi.getUserPresence(userId);

// Get presence for multiple users
const { presences } = await presenceApi.getBulkPresence([userId1, userId2]);

// Update your status
await presenceApi.updateStatus('away', 'In a meeting');

// Update activity
await presenceApi.updateActivity('Studying React Hooks');

// Send heartbeat
await presenceApi.sendHeartbeat();
```

---

## Socket.IO Events

### Listen for:
```typescript
socket.on('user-online', (data) => { /* user came online */ });
socket.on('user-offline', (data) => { /* user went offline */ });
socket.on('presence-changed', (data) => { /* status changed */ });
socket.on('presence-updated', (data) => { /* your status updated */ });
```

### Emit:
```typescript
socket.emit('update-presence', { status: 'away', activity: 'Studying' });
socket.emit('presence-heartbeat');
socket.emit('update-activity', { activity: 'Watching video' });
```

---

## Status Colors

- **Online** → `#44b700` (Green) with pulse animation
- **Away** → `#ffa500` (Orange)
- **Busy** → `#ff0000` (Red)
- **Offline** → `#9e9e9e` (Gray)

---

## Common Patterns

### Fetch presence for list of users
```typescript
const userIds = users.map(u => u.UserId);
const { presences } = await presenceApi.getBulkPresence(userIds);

// Map presence to users
const usersWithPresence = users.map(user => ({
  ...user,
  Status: presences.find(p => p.UserId === user.UserId)?.Status || 'offline'
}));
```

### Auto-refresh online status
```typescript
useEffect(() => {
  const loadPresence = async () => {
    const { presences } = await presenceApi.getBulkPresence(userIds);
    setUserPresence(presences);
  };
  
  loadPresence();
  const interval = setInterval(loadPresence, 30000); // 30 seconds
  
  return () => clearInterval(interval);
}, [userIds]);
```

### Show last seen for offline users
```typescript
{user.Status === 'offline' && user.LastSeenAt && (
  <Typography variant="caption" color="text.secondary">
    Last seen {formatDistanceToNow(new Date(user.LastSeenAt), { addSuffix: true })}
  </Typography>
)}
```

---

## Troubleshooting

### Presence not updating?
1. Check Socket.IO connection: `socketService.getSocket()`
2. Verify JWT token in localStorage
3. Check browser console for errors
4. Ensure backend presence routes are running

### Heartbeat not working?
1. Check `autoHeartbeat` is `true` in `usePresence`
2. Verify `heartbeatInterval` setting
3. Check network tab for `/api/presence/heartbeat` requests

### Status stuck on offline?
1. User may have closed browser (offline)
2. Check `LastSeenAt` timestamp
3. Backend sets offline after inactivity

---

## Files Reference

**Types:** `client/src/types/presence.ts`  
**API:** `client/src/services/presenceApi.ts`  
**Hook:** `client/src/hooks/usePresence.ts`  
**Components:** `client/src/components/Presence/`  
**Page:** `client/src/pages/Presence/PresencePage.tsx`

---

**For detailed implementation, see:** `PHASE2_WEEK2_DAY4_COMPLETE.md`
