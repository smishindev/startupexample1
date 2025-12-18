# Privacy Settings Enforcement - Comprehensive Implementation Plan

**Created**: December 17, 2025  
**Status**: Planning Phase  
**Priority**: HIGH - Complete Settings System  
**Estimated Time**: 3-4 hours total

---

## 📋 EXECUTIVE SUMMARY

The Settings Page UI is complete and functional - users can configure privacy preferences. However, these settings are **stored only** and **not enforced system-wide**. This implementation plan covers all areas where privacy settings must be enforced.

---

## 🎯 SCOPE & OBJECTIVES

### What We're Implementing

1. ✅ **Profile Visibility Enforcement** - Control who can view user profiles (public/students/private)
2. ✅ **Show Email Enforcement** - Hide/show email in profile and API responses
3. ✅ **Show Progress Enforcement** - Hide/show learning progress in dashboard and stats
4. ✅ **Allow Messages Enforcement** - Enable/disable direct messaging

### Success Criteria

- ✅ All privacy settings respected across entire platform
- ✅ Settings checked in all relevant API endpoints
- ✅ Frontend UI respects user preferences
- ✅ No data leakage through any endpoint
- ✅ Zero TypeScript errors
- ✅ Comprehensive testing completed

---

## 📊 RESEARCH FINDINGS

### Current Settings Storage

**Database Table**: `UserSettings`
```sql
CREATE TABLE dbo.UserSettings (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    
    -- Privacy Settings (STORED BUT NOT ENFORCED)
    ProfileVisibility NVARCHAR(20) DEFAULT 'public' CHECK (ProfileVisibility IN ('public', 'students', 'private')),
    ShowEmail BIT DEFAULT 0,
    ShowProgress BIT DEFAULT 1,
    AllowMessages BIT DEFAULT 1,
    
    -- Appearance Settings
    Theme NVARCHAR(20) DEFAULT 'light',
    Language NVARCHAR(10) DEFAULT 'en',
    FontSize NVARCHAR(10) DEFAULT 'medium'
)
```

**API Endpoint**: `GET/PATCH /api/settings`  
**Service**: `SettingsService.ts`  
**Status**: ✅ Storage working, ⚠️ enforcement missing

---

## 🔍 AFFECTED AREAS - COMPLETE SYSTEM MAP

### 1️⃣ PROFILE VISIBILITY (`ProfileVisibility`)

**Values**: `'public'` | `'students'` | `'private'`

**Logic**:
- **public**: Anyone can view profile
- **students**: Only enrolled students in same courses can view
- **private**: Only user themselves can view (block all external access)

#### Backend Endpoints to Modify (5 files)

**Critical - Profile Data Exposure**:
1. ✅ `server/src/routes/profile.ts`
   - `GET /api/profile/:userId` - NEW endpoint needed to view other users' profiles
   - Currently only has `GET /api/profile` (own profile)
   - **ACTION**: Create new endpoint with visibility checks

2. ✅ `server/src/routes/users.ts`
   - `GET /api/users/instructors` - Shows instructor list with emails
   - **ACTION**: Apply visibility filter, respect ShowEmail setting

3. ✅ `server/src/routes/presence.ts`
   - `GET /api/presence/online` - Shows online users with names/avatars
   - `GET /api/presence/course/:courseId` - Shows online users in course
   - **ACTION**: Filter by ProfileVisibility (only show public/students for that course)

4. ✅ `server/src/routes/studyGroups.ts`
   - Shows member lists with user details
   - **ACTION**: Apply visibility checks for group members

5. ✅ `server/src/routes/officeHours.ts`
   - Shows student info in queue (name, email)
   - **ACTION**: Respect visibility settings for student data

#### Frontend Pages Affected (4 pages)

1. ✅ `client/src/pages/Profile/ProfilePage.tsx`
   - Currently shows own profile only
   - **ACTION**: Add ability to view other profiles with visibility checks

2. ✅ `client/src/components/Presence/OnlineUsersList.tsx`
   - Shows online users list
   - **ACTION**: Respect filtered results from backend

3. ✅ `client/src/components/StudyGroups/GroupMembersList.tsx`
   - Shows group member details
   - **ACTION**: Handle restricted profiles gracefully

4. ✅ `client/src/components/OfficeHours/QueueDisplay.tsx`
   - Shows student info in queue
   - **ACTION**: Show limited info for private profiles

---

### 2️⃣ SHOW EMAIL (`ShowEmail`)

**Values**: `true` | `false`

**Logic**: If `false`, exclude email from ALL API responses (except own profile)

#### Backend Endpoints to Modify (8 files)

**Every endpoint returning user data must check this**:

1. ✅ `server/src/routes/profile.ts`
   - `GET /api/profile/:userId` - Conditionally exclude Email field
   
2. ✅ `server/src/routes/users.ts`
   - `GET /api/users/instructors` - Conditionally exclude Email

3. ✅ `server/src/routes/auth.ts`
   - `GET /api/auth/me` - Keep Email (own profile)
   - `GET /api/auth/verify` - Keep Email (own profile)

4. ✅ `server/src/routes/analytics.ts`
   - `GET /api/analytics/courses/:courseId` - Recent activity shows emails
   - **ACTION**: Exclude email if ShowEmail = false

5. ✅ `server/src/routes/instructor.ts`
   - Student lists may show emails
   - **ACTION**: Apply ShowEmail filter

6. ✅ `server/src/routes/officeHours.ts`
   - Queue shows student emails
   - **ACTION**: Conditionally hide emails

7. ✅ `server/src/routes/studyGroups.ts`
   - Member lists show emails
   - **ACTION**: Conditionally hide emails

8. ✅ `server/src/routes/presence.ts`
   - Online users may show emails
   - **ACTION**: Exclude emails if setting is false

#### Implementation Pattern

**Helper Function** (create in `SettingsService.ts`):
```typescript
async getUserWithPrivacySettings(userId: string, viewerId: string) {
  // Fetch user + settings
  // Apply ShowEmail filter
  // Apply ProfileVisibility filter
  // Return filtered user object
}
```

---

### 3️⃣ SHOW PROGRESS (`ShowProgress`)

**Values**: `true` | `false`

**Logic**: If `false`, hide all progress data from other users

#### Backend Endpoints to Modify (5 files)

**Progress Data Exposure**:

1. ✅ `server/src/routes/dashboard.ts`
   - `GET /api/dashboard/stats` - Shows user statistics
   - **ACTION**: Only show stats if ShowProgress = true OR viewing own profile

2. ✅ `server/src/routes/analytics.ts`
   - `GET /api/analytics/courses/:courseId` - Shows student progress in course
   - **ACTION**: Filter progress data based on ShowProgress setting
   - Instructors may need override (course management)

3. ✅ `server/src/routes/progress.ts`
   - `GET /api/progress/:courseId` - Get course progress
   - **ACTION**: Check if requesting user is course instructor (allow) or respect ShowProgress

4. ✅ `server/src/routes/student-progress.ts`
   - Shows detailed progress data
   - **ACTION**: Enforce ShowProgress setting

5. ✅ `server/src/routes/instructor.ts`
   - Instructor dashboard shows student progress
   - **ACTION**: Instructors get override (need to track students), but respect in public views

#### Frontend Pages Affected (3 pages)

1. ✅ `client/src/pages/Dashboard/Dashboard.tsx`
   - Shows progress stats
   - **ACTION**: Handle case where progress is hidden

2. ✅ `client/src/components/Progress/StudentProgressDashboard.tsx`
   - Shows detailed progress
   - **ACTION**: Respect backend filtering

3. ✅ `client/src/pages/Profile/ProfilePage.tsx`
   - Account Info tab shows progress stats
   - **ACTION**: Hide if viewing another user's profile

#### Special Cases

**Instructor Override**:
- Instructors viewing their course analytics MUST see student progress (course management)
- ShowProgress only applies to PUBLIC views (other students, non-course-related views)

---

### 4️⃣ ALLOW MESSAGES (`AllowMessages`)

**Values**: `true` | `false`

**Logic**: If `false`, prevent direct messages from other users

#### Backend Endpoints to Modify (2 files)

**⚠️ CURRENT STATUS**: Chat system is **DISABLED** (501 Not Implemented)

**Chat Infrastructure**:
1. ✅ `server/src/routes/chat.ts`
   - Currently all endpoints return 501
   - **ACTION**: When chat is re-enabled, add AllowMessages check before:
     - Creating chat rooms
     - Sending messages
     - Adding users to rooms

2. ✅ `server/src/sockets.ts`
   - Socket.IO chat handlers
   - **ACTION**: Add AllowMessages check in:
     - `send-chat-message` event
     - `create-chat-room` event

#### Implementation Pattern

**Middleware Function** (create in `SettingsService.ts`):
```typescript
async canReceiveMessages(userId: string): Promise<boolean> {
  const settings = await getUserSettings(userId);
  return settings.AllowMessages;
}
```

**Usage in Chat Endpoints**:
```typescript
router.post('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  const recipientId = await getRoomRecipient(roomId);
  const canReceive = await SettingsService.canReceiveMessages(recipientId);
  
  if (!canReceive) {
    return res.status(403).json({ 
      error: 'User has disabled direct messages',
      code: 'MESSAGES_DISABLED'
    });
  }
  
  // Continue with message creation...
});
```

---

## 🛠️ IMPLEMENTATION PLAN

### Phase 1: Backend Infrastructure (1 hour)

#### Step 1.1: Create Settings Helper Service
**File**: `server/src/services/SettingsService.ts`

**Add Methods**:
```typescript
/**
 * Get user with privacy settings applied
 * @param userId - User to fetch
 * @param viewerId - User viewing the profile (or null for system)
 * @param context - Context of request ('profile', 'course', 'system')
 */
async getUserWithPrivacy(
  userId: string, 
  viewerId: string | null, 
  context: 'profile' | 'course' | 'system'
): Promise<FilteredUser>

/**
 * Check if viewer can see target user's profile
 */
async canViewProfile(
  targetUserId: string, 
  viewerId: string
): Promise<{ allowed: boolean; reason?: string }>

/**
 * Check if viewer can see target user's progress
 * @param overrideRole - 'instructor' to override for course management
 */
async canViewProgress(
  targetUserId: string, 
  viewerId: string,
  overrideRole?: string
): Promise<boolean>

/**
 * Check if user accepts direct messages
 */
async canReceiveMessages(userId: string): Promise<boolean>

/**
 * Filter user object based on privacy settings
 */
filterUserData(
  user: any, 
  settings: UserSettings, 
  isOwnProfile: boolean
): FilteredUser
```

**Enroll Check Helper**:
```typescript
/**
 * Check if two users are enrolled in same course (for 'students' visibility)
 */
async areStudentsTogether(userId1: string, userId2: string): Promise<boolean> {
  // Query Enrollments table for common courses
}
```

---

### Phase 2: Profile Visibility Enforcement (1 hour)

#### Step 2.1: Create Profile Viewing Endpoint
**File**: `server/src/routes/profile.ts`

**Add Route**:
```typescript
/**
 * GET /api/profile/user/:userId - View another user's profile
 * Returns filtered profile based on privacy settings
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const targetUserId = req.params.userId;
  const viewerId = req.user.userId;
  
  // Use new helper methods
  const canView = await SettingsService.canViewProfile(targetUserId, viewerId);
  
  if (!canView.allowed) {
    return res.status(403).json({ 
      error: 'Profile is private',
      code: 'PROFILE_PRIVATE',
      reason: canView.reason
    });
  }
  
  const user = await SettingsService.getUserWithPrivacy(
    targetUserId, 
    viewerId, 
    'profile'
  );
  
  res.json(user);
});
```

#### Step 2.2: Update User Lists with Visibility Filter
**Files to Modify**:
- `server/src/routes/users.ts` - Instructor list
- `server/src/routes/presence.ts` - Online users
- `server/src/routes/studyGroups.ts` - Group members
- `server/src/routes/officeHours.ts` - Queue display

**Pattern**:
```typescript
// Before returning user list, filter each user
const filteredUsers = await Promise.all(
  users.map(async (user) => {
    const settings = await SettingsService.getUserSettings(user.Id);
    return SettingsService.filterUserData(user, settings, false);
  })
);
```

---

### Phase 3: Show Email Enforcement (30 minutes)

#### Step 3.1: Update All User-Returning Endpoints

**Files to Modify** (8 files):
1. `server/src/routes/profile.ts` - New viewing endpoint
2. `server/src/routes/users.ts` - Instructor list
3. `server/src/routes/analytics.ts` - Student activity lists
4. `server/src/routes/instructor.ts` - Student lists
5. `server/src/routes/officeHours.ts` - Queue
6. `server/src/routes/studyGroups.ts` - Members
7. `server/src/routes/presence.ts` - Online users
8. `server/src/routes/dashboard.ts` - If any user references

**Implementation**:
```typescript
// In filterUserData method
if (!settings.ShowEmail && !isOwnProfile) {
  delete user.Email;
  // Or set to null/undefined
  user.Email = null;
}
```

---

### Phase 4: Show Progress Enforcement (1 hour)

#### Step 4.1: Add Progress Visibility Checks

**Files to Modify** (5 files):
1. `server/src/routes/dashboard.ts` - Stats endpoint
2. `server/src/routes/analytics.ts` - Course analytics
3. `server/src/routes/progress.ts` - Progress data
4. `server/src/routes/student-progress.ts` - Student progress
5. `server/src/routes/instructor.ts` - Instructor views

**Implementation Pattern**:
```typescript
// Check if can view progress
const canView = await SettingsService.canViewProgress(
  targetUserId,
  viewerId,
  req.user.role === 'instructor' ? 'instructor' : undefined
);

if (!canView) {
  return res.status(403).json({ 
    error: 'Progress data is private',
    code: 'PROGRESS_PRIVATE'
  });
}
```

**Instructor Override**:
```typescript
// In course analytics - instructors can see enrolled student progress
if (req.user.role === 'instructor' && isInstructorsCourse) {
  // Allow progress view regardless of ShowProgress setting
  canViewProgress = true;
}
```

---

### Phase 5: Allow Messages Enforcement (30 minutes)

#### Step 5.1: Add Message Permission Checks

**⚠️ NOTE**: Chat is currently disabled (501). Implement when chat is re-enabled.

**Files to Modify**:
1. `server/src/routes/chat.ts` - All message endpoints
2. `server/src/sockets.ts` - Chat Socket.IO handlers

**Implementation**:
```typescript
// Before sending message
const canReceive = await SettingsService.canReceiveMessages(recipientId);

if (!canReceive) {
  return res.status(403).json({ 
    error: 'User has disabled direct messages',
    code: 'MESSAGES_DISABLED'
  });
}
```

---

### Phase 6: Frontend Updates (30 minutes)

#### Step 6.1: Handle Privacy Errors Gracefully

**Files to Update**:
1. `client/src/services/profileApi.ts` - Add new getUserProfile(userId) method
2. `client/src/pages/Profile/ProfilePage.tsx` - Handle viewing other profiles
3. `client/src/components/Presence/OnlineUsersList.tsx` - Show limited data
4. `client/src/components/StudyGroups/GroupMembersList.tsx` - Handle private profiles

**Error Handling**:
```typescript
try {
  const profile = await profileApi.getUserProfile(userId);
} catch (error) {
  if (error.code === 'PROFILE_PRIVATE') {
    toast.error('This profile is private');
    // Show limited profile card
  }
}
```

**UI for Private Profiles**:
```tsx
{user.isPrivate ? (
  <Box>
    <Avatar>{user.initials}</Avatar>
    <Typography>Private Profile</Typography>
    <Typography variant="caption" color="text.secondary">
      This user has restricted profile visibility
    </Typography>
  </Box>
) : (
  <FullProfileView user={user} />
)}
```

---

### Phase 7: Testing (30 minutes)

#### Test Scenarios

**Profile Visibility**:
- [ ] User with 'public' - Anyone can view
- [ ] User with 'students' - Only classmates can view
- [ ] User with 'private' - Nobody can view
- [ ] Own profile always visible

**Show Email**:
- [ ] Email hidden when ShowEmail = false
- [ ] Email shown when ShowEmail = true
- [ ] Own email always shown

**Show Progress**:
- [ ] Progress hidden when ShowProgress = false
- [ ] Progress shown when ShowProgress = true
- [ ] Instructors can always see enrolled students' progress
- [ ] Own progress always shown

**Allow Messages**:
- [ ] Messages blocked when AllowMessages = false
- [ ] Messages allowed when AllowMessages = true
- [ ] Error message shown when blocked

---

## 📝 FILES TO CREATE/MODIFY

### New Files (0)
- All functionality added to existing files

### Modified Files (16 backend + 5 frontend = 21 total)

**Backend Services** (1 file):
1. ✅ `server/src/services/SettingsService.ts` - Add privacy helper methods

**Backend Routes** (15 files):
2. ✅ `server/src/routes/profile.ts` - Add profile viewing endpoint
3. ✅ `server/src/routes/users.ts` - Filter instructor list
4. ✅ `server/src/routes/presence.ts` - Filter online users
5. ✅ `server/src/routes/studyGroups.ts` - Filter group members
6. ✅ `server/src/routes/officeHours.ts` - Filter queue display
7. ✅ `server/src/routes/analytics.ts` - Filter progress data
8. ✅ `server/src/routes/dashboard.ts` - Add privacy checks
9. ✅ `server/src/routes/progress.ts` - Add visibility checks
10. ✅ `server/src/routes/student-progress.ts` - Add privacy checks
11. ✅ `server/src/routes/instructor.ts` - Filter student data
12. ✅ `server/src/routes/chat.ts` - Add message permission checks (when enabled)
13. ✅ `server/src/sockets.ts` - Add Socket.IO message checks (when enabled)

**Frontend Services** (1 file):
14. ✅ `client/src/services/profileApi.ts` - Add getUserProfile method

**Frontend Components** (4 files):
15. ✅ `client/src/pages/Profile/ProfilePage.tsx` - Handle viewing others
16. ✅ `client/src/components/Presence/OnlineUsersList.tsx` - Handle limited data
17. ✅ `client/src/components/StudyGroups/GroupMembersList.tsx` - Handle private profiles
18. ✅ `client/src/components/OfficeHours/QueueDisplay.tsx` - Show limited student info

---

## 🔒 SECURITY CONSIDERATIONS

### Data Leakage Prevention

1. **Never trust frontend** - All checks on backend
2. **Default to restrictive** - If settings missing, default to private
3. **Audit all endpoints** - Every user data return must respect settings
4. **Test edge cases** - Multiple roles, missing settings, null values

### Performance Optimization

1. **Batch settings fetches** - When filtering user lists
2. **Cache settings** - Short-term cache (5 minutes) for performance
3. **Database indexes** - Ensure UserSettings.UserId has index (already exists)

---

## ⏱️ TIME ESTIMATES

**Total: 3-4 hours**

- Phase 1: Backend Infrastructure - 1 hour
- Phase 2: Profile Visibility - 1 hour
- Phase 3: Show Email - 30 minutes
- Phase 4: Show Progress - 1 hour
- Phase 5: Allow Messages - 30 minutes
- Phase 6: Frontend Updates - 30 minutes
- Phase 7: Testing - 30 minutes

---

## 📋 EMAIL VERIFICATION PRIORITY UPDATE

### Current Status
✅ **Email verification is ALREADY IMPLEMENTED** (Nov 20, 2025)
- Backend: `VerificationService.ts` with 6-digit codes
- Database: `EmailVerified` field tracking status
- SendGrid integration working
- Frontend: Verification UI complete

### When to Enforce Email Verification

**RECOMMENDED PRIORITY**: **MEDIUM** (after Privacy Settings)

**Enforce Email Verification Before**:
1. **Course Purchases** - Ensure valid email before payment
2. **Becoming Instructor** - Verify identity before content creation
3. **Publishing Courses** - Require verification to publish
4. **Payment Withdrawals** - Verify before instructor payouts

**Implementation Time**: 1-2 hours

**Steps**:
1. Add `requireEmailVerification` middleware
2. Apply to critical endpoints (payments, instructor actions)
3. Add frontend prompts for unverified users
4. Show verification status banner in header

**Low Risk to Delay**:
- Users can browse and learn without verification
- No payment/instructor features broken currently
- Can implement alongside payment flow enhancements

---

## ✅ VALIDATION CHECKLIST

Before marking complete:

**Backend**:
- [ ] All 15 backend endpoints updated
- [ ] SettingsService has privacy helper methods
- [ ] Profile viewing endpoint created
- [ ] Email filtering implemented
- [ ] Progress visibility checks added
- [ ] Message permission checks added (when chat enabled)
- [ ] Zero TypeScript errors
- [ ] All queries respect settings

**Frontend**:
- [ ] Profile viewing UI updated
- [ ] Error handling for private profiles
- [ ] Limited profile cards implemented
- [ ] Toast notifications for privacy errors
- [ ] Zero TypeScript/React errors

**Testing**:
- [ ] All 4 privacy settings tested
- [ ] Edge cases covered (null settings, missing data)
- [ ] Multiple user roles tested (student, instructor)
- [ ] Cross-browser compatibility checked

**Documentation**:
- [ ] PROJECT_STATUS.md updated with completion status
- [ ] ARCHITECTURE.md updated with privacy flow
- [ ] Any new patterns documented

---

## 🚀 READY TO IMPLEMENT?

This plan covers **ALL** areas where privacy settings need enforcement:
- ✅ Profile viewing and user lists
- ✅ Email visibility in all responses
- ✅ Progress data in dashboards and analytics  
- ✅ Direct messaging permissions (when chat enabled)
- ✅ Instructor overrides for course management
- ✅ Frontend error handling and UI updates

**Next Step**: Begin with Phase 1 (Backend Infrastructure) to create the foundation for all privacy checks.
