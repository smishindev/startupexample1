# Mishin Learn Platform - System Architecture

**Last Updated**: December 2, 2025  
**Purpose**: Understanding system components, data flows, and dependencies

---

## 🏗️ SYSTEM OVERVIEW

### Tech Stack
```
Frontend: React 18 + TypeScript + Material-UI + Vite
Backend: Node.js + Express + TypeScript
Database: SQL Server (SQLEXPRESS)
Real-time: Socket.io
State: Zustand (auth), React state (components)
```

### Server Ports
- **Backend API**: `http://localhost:3001`
- **Frontend Dev**: `http://localhost:5173`
- **NEVER CHANGE THESE** - CORS configured for these exact ports

---

## 📊 DATA FLOW ARCHITECTURE

### 1. **Authentication Flow**
```
User Login → LoginForm
  ↓ (credentials)
authStore.login()
  ↓ (POST /api/auth/login)
Backend auth.ts → Verify credentials
  ↓ (JWT token + user data)
Zustand authStore → localStorage['auth-storage']
  ↓
All API services → Inject token in headers
  ↓
Backend authenticateToken middleware → Verify JWT
  ↓
Protected routes execute
```

**Key Files**:
- `client/src/stores/authStore.ts` - Zustand store with token + user
- `client/src/pages/Auth/LoginForm.tsx` - Login UI
- `server/src/routes/auth.ts` - Auth endpoints
- `server/src/middleware/auth.ts` - JWT verification

**Token Storage**:
```javascript
localStorage['auth-storage'] = {
  state: {
    token: "jwt...",
    user: { Id, FirstName, Email, Role, ... }
  }
}
```

**Used By**: ALL API services (coursesApi, enrollmentApi, progressApi, bookmarkApi, etc.)

---

### 2. **Course Browsing Flow**
```
User → CoursesPage
  ↓
coursesApi.getCourses(filters)
  ↓ (GET /api/courses?filters)
Backend courses.ts → Query database
  ↓ (courses array)
If logged in:
  ├─→ BookmarkApi.getBookmarkStatuses(courseIds) [parallel]
  └─→ enrollmentApi.getMyEnrollments() [parallel]
  ↓
Merge data → courses with isBookmarked + isEnrolled flags
  ↓
Render CourseCard components
```

**Key Files**:
- `client/src/pages/Courses/CoursesPage.tsx` - Main courses listing
- `client/src/components/Course/CourseCard.tsx` - Reusable card
- `client/src/services/coursesApi.ts` - Course API calls
- `server/src/routes/courses.ts` - Course endpoints

**Filters**:
- Search query (title/description)
- Category (programming, data_science, etc.)
- Level (Beginner, Intermediate, Advanced)
- Pagination (page, limit)

---

### 3. **Course Detail Flow**
```
User clicks course → CourseDetailPage (/courses/:courseId)
  ↓
Parallel API calls:
  ├─→ coursesApi.getCourse(courseId) - Course data
  └─→ coursesApi.getEnrollmentStatus(courseId) - Is enrolled? Is instructor?
  ↓
If enrolled (not instructor):
  └─→ progressApi.getCourseProgress(courseId) - Progress percentage
  ↓
If logged in:
  └─→ BookmarkApi.checkBookmarkStatus(courseId) - Is bookmarked?
  ↓
Render page with role-specific buttons:
  ├─ Instructor: "Manage Course" (orange)
  ├─ Enrolled Student: "Continue Learning" (purple)
  └─ Unenrolled: "Enroll Now" (purple)
```

**Key Files**:
- `client/src/pages/Course/CourseDetailPage.tsx` - Main detail page
- `client/src/components/Course/ShareDialog.tsx` - Social sharing
- `server/src/routes/courses.ts` - getCourse endpoint
- `server/src/routes/enrollment.ts` - getEnrollmentStatus endpoint

**Enrollment Status Response**:
```typescript
{
  isEnrolled: boolean,      // Is student enrolled?
  isInstructor: boolean,    // Does user own this course?
  status: string,           // 'active' | 'completed' | 'suspended'
  enrolledAt: string,       // ISO date
  completedAt?: string      // ISO date if completed
}
```

---

### 4. **Enrollment Flow**
```
User clicks "Enroll Now" → CourseDetailPage.handleEnroll()
  ↓ (if not logged in)
navigate('/login')
  ↓ (if logged in)
enrollmentApi.enrollInCourse(courseId)
  ↓ (POST /api/enrollment/courses/:courseId/enroll)
Backend enrollment.ts:
  ├─→ Check not already enrolled
  ├─→ Check not instructor's own course
  ├─→ Check course is published
  ├─→ Create Enrollment record
  └─→ Update course EnrollmentCount
  ↓
Frontend: Update states
  ├─ setCourse({ ...course, isEnrolled: true })
  ├─ setEnrollmentStatus({ isEnrolled: true, ... })
  └─ Show success dialog with 3 actions:
      - Continue Browsing
      - View My Learning
      - Start Learning (navigate to /learning/:courseId)
```

**Key Files**:
- `client/src/services/enrollmentApi.ts` - Enrollment API
- `server/src/routes/enrollment.ts` - Enrollment endpoints
- Database: `Enrollments` table

**Important**: Enrollment creates **ONLY** Enrollment record, **NOT** UserProgress. UserProgress is created per-lesson when student accesses lesson.

---

### 5. **Bookmark Flow**
```
User clicks bookmark icon → handleBookmark()
  ↓ (if not logged in)
Return early (no action)
  ↓ (if logged in)
Check current state:
  ├─ If bookmarked: BookmarkApi.removeBookmark(courseId)
  │   ↓ (DELETE /api/bookmarks/:courseId)
  │   Backend: Delete from Bookmarks table
  │   Frontend: setIsBookmarked(false)
  │
  └─ If not bookmarked: BookmarkApi.addBookmark(courseId)
      ↓ (POST /api/bookmarks/:courseId)
      Backend: Insert into Bookmarks table
      Frontend: setIsBookmarked(true)
```

**Key Files**:
- `client/src/services/bookmarkApi.ts` - Bookmark API
- `server/src/routes/bookmarks.ts` - Bookmark endpoints
- Database: `Bookmarks` table (UserId, CourseId, Notes, BookmarkedAt)

**Used In**:
- `CourseDetailPage.tsx` - Detail page bookmark button
- `LessonDetailPage.tsx` - Lesson page bookmark button
- `CoursesPage.tsx` - Batch status checking, bookmark tab

**Batch Check**: `BookmarkApi.getBookmarkStatuses(courseIds[])` returns `{ [courseId]: true/false }`

---

### 6. **Progress Tracking Flow**
```
Student accesses lesson → LessonDetailPage
  ↓
progressApi.getCourseProgress(courseId)
  ↓ (GET /api/progress/courses/:courseId)
Backend progress.ts:
  ├─→ Query UserProgress for all lessons
  ├─→ Query CourseProgress for overall stats
  └─→ Return: lesson progress array + overall percentage
  ↓
Display progress indicators

When lesson completed:
  ↓
progressApi.markLessonComplete(lessonId, { timeSpent })
  ↓ (POST /api/progress/lessons/:lessonId/complete)
Backend progress.ts:
  ├─→ Update UserProgress (CompletedAt, TimeSpent)
  ├─→ Calculate overall course progress
  └─→ Update CourseProgress (OverallProgress, CompletedLessons)
  ↓
Frontend: Update UI with new progress
```

**Key Files**:
- `client/src/services/progressApi.ts` - Progress API
- `server/src/routes/progress.ts` - Progress endpoints
- Database: `UserProgress` (per-lesson), `CourseProgress` (per-course)

**Important**: 
- Instructors in **Preview Mode** → NO progress tracking (prevents analytics contamination)
- Students → Full progress tracking
- Check: `enrollmentStatus.isInstructor` to determine preview mode

---

### 7. **Video Lesson Flow**
```
Student plays video → VideoPlayer component
  ↓ (every 5 seconds)
videoProgressApi.updateProgress(videoLessonId, { currentTime, duration })
  ↓ (PUT /api/video-progress/:videoLessonId)
Backend video-progress.ts:
  ├─→ Update VideoProgress (CurrentTime)
  ├─→ If > 90% watched: Auto-mark lesson complete
  └─→ Track analytics events (play, pause, seek)
  ↓
Next time: Resume from saved position

When video completes:
  ↓
videoProgressApi.markComplete(videoLessonId)
  ↓ (POST /api/video-progress/:videoLessonId/complete)
Backend: Update CompletedAt + lesson progress
```

**Key Files**:
- `client/src/components/Video/VideoPlayer.tsx` - Video player
- `client/src/services/videoProgressApi.ts` - Video progress API
- `server/src/routes/video-progress.ts` - Video progress endpoints
- Database: `VideoProgress`, `VideoAnalytics`

---

### 8. **Office Hours Flow** (Real-time)
```
Instructor creates schedule → OfficeHoursInstructor
  ↓
officeHoursApi.createSchedule({ dayOfWeek, startTime, endTime })
  ↓ (POST /api/office-hours/schedules)
Backend office-hours.ts:
  ├─→ Create OfficeHours record
  └─→ Return schedule details
  ↓
Student views schedules → OfficeHoursStudent
  ↓
officeHoursApi.getAvailableSchedules()
  ↓ (GET /api/office-hours/schedules)
Backend: Return all instructor schedules
  ↓
Student joins queue:
  ↓
officeHoursApi.joinQueue(scheduleId)
  ↓ (POST /api/office-hours/queue)
Backend OfficeHoursService.joinQueue():
  ├─→ Create OfficeHoursQueue record (GUID ID)
  ├─→ Calculate position in queue
  ├─→ Create notification for instructor
  └─→ Socket.IO emit('queue-updated') to instructor room
  ↓
Instructor sees queue update (real-time):
  ↓
useOfficeHoursSocket → onQueueUpdated callback
  ↓
Refresh queue display (no toast, silent update)
  ↓
Instructor admits student:
  ↓
officeHoursApi.admitStudent(entryId)
  ↓ (PUT /api/office-hours/queue/:id/admit)
Backend OfficeHoursService.admitStudent():
  ├─→ Update queue entry status to 'admitted'
  ├─→ Set AdmittedAt timestamp (UTC with 'Z')
  ├─→ Create notification for student
  └─→ Socket.IO emit('admitted') to student room
  ↓
Student receives notification (real-time):
  ↓
useOfficeHoursSocket → onAdmitted callback
  ↓
Bell notification appears (no toast)
  ↓
Refresh queue status
  ↓
Instructor completes session:
  ↓
officeHoursApi.completeSession(entryId)
  ↓ (PUT /api/office-hours/queue/:id/complete)
Backend OfficeHoursService.completeSession():
  ├─→ Update queue entry status to 'completed'
  ├─→ Set CompletedAt timestamp (UTC with 'Z')
  ├─→ Create notification for student
  └─→ Socket.IO emit('session-completed') to student room
  ↓
Student receives completion notification (real-time)
```

**Key Files**:
- `client/src/pages/OfficeHours/OfficeHoursInstructor.tsx` - Instructor UI
- `client/src/pages/OfficeHours/OfficeHoursStudent.tsx` - Student UI
- `client/src/hooks/useOfficeHoursSocket.ts` - Socket.IO events
- `client/src/services/officeHoursApi.ts` - Office Hours API
- `server/src/routes/office-hours.ts` - Office Hours endpoints
- `server/src/services/OfficeHoursService.ts` - Business logic
- `server/src/services/NotificationService.ts` - Notification integration
- Database: `OfficeHours`, `OfficeHoursQueue`, `Notifications`

**Socket.IO Rooms**:
- `user-${userId}` - Individual user notifications
- `office-hours-${instructorId}` - Instructor's queue updates

**Notification Strategy**:
- User actions (join queue) → Toast + Bell notification
- Server events (admitted, completed) → Bell notification only (no toast)
- Prevents duplicate UI feedback

**Timestamp Handling**:
- All timestamps stored in UTC in database
- Backend returns timestamps with 'Z' suffix (ISO 8601)
- Frontend displays relative time ("a few seconds ago")

---

### 9. **Presence System Flow** (Real-time)
```
User logs in → Socket connects
  ↓
socketService.connect() with JWT token
  ↓
Backend sockets.ts → 'connection' event
  ↓
PresenceService.setUserOnline(userId):
  ├─→ ensureUserPresence(userId) - Create record if doesn't exist
  ├─→ Update Status = 'online', LastSeenAt = GETUTCDATE()
  └─→ Socket.IO broadcast('presence-changed') to all users
  ↓
All connected users update UI
  ↓
User changes status to 'away':
  ↓
PresenceStatusSelector → updateStatus('away')
  ↓
usePresence hook:
  ├─→ presenceApi.updateStatus('away')
  │   ↓ (PUT /api/presence/status)
  │   Backend PresenceService.updatePresence():
  │   ├─→ Update Status = 'away', UpdatedAt = GETUTCDATE()
  │   └─→ Socket.IO broadcast('presence-changed')
  │
  └─→ Socket emit('update-presence', { status: 'away' })
  ↓
Frontend receives 'presence-updated' event:
  ↓
setCurrentStatus('away') → UI updates immediately
  ↓
Automatic heartbeat (every 60 seconds):
  ↓
usePresence hook → sendHeartbeat()
  ↓
presenceApi.sendHeartbeat() + Socket emit('presence-heartbeat')
  ↓ (POST /api/presence/heartbeat)
Backend PresenceService.updateLastSeen():
  ├─→ MERGE statement (UPDATE if exists, INSERT if new)
  └─→ Set LastSeenAt = GETUTCDATE()
  ↓
User closes browser/tab:
  ↓
Socket.IO 'disconnect' event
  ↓
Backend preserves status (away/busy remain):
  ├─→ Update LastSeenAt = GETUTCDATE()
  └─→ Keep existing status (don't set offline)
  ↓
Inactivity checker (every 2 minutes):
  ↓
PresenceService.checkInactiveUsers():
  ├─→ Find users with LastSeenAt > 5 minutes ago
  ├─→ Set Status = 'offline' for inactive users
  └─→ Socket.IO broadcast('presence-changed') for each
  ↓
User refreshes page:
  ↓
PresencePage loads → usePresence hook initializes
  ↓
useEffect on mount:
  ├─→ presenceApi.getMyPresence() - Fetch actual status from server
  ├─→ setCurrentStatus(presence.Status) - Display correct status
  └─→ setIsLoadingStatus(false)
  ↓
Status badge and online list show consistent status (bug fixed!)
```

**Key Files**:
- `client/src/pages/Presence/PresencePage.tsx` - Main presence UI
- `client/src/hooks/usePresence.ts` - Status management + Socket.IO
- `client/src/components/Presence/OnlineIndicator.tsx` - Status badge
- `client/src/components/Presence/UserPresenceBadge.tsx` - Avatar + badge
- `client/src/components/Presence/OnlineUsersList.tsx` - Online users list
- `client/src/components/Presence/PresenceStatusSelector.tsx` - Status dropdown
- `client/src/services/presenceApi.ts` - Presence API methods
- `server/src/routes/presence.ts` - Presence endpoints
- `server/src/services/PresenceService.ts` - Business logic with Socket.IO
- `server/src/sockets.ts` - Socket connection handlers
- Database: `UserPresence` (UserId, Status, LastSeenAt, Activity)

**Socket.IO Events**:
- `presence-changed` - Broadcast to all when user status changes
- `presence-updated` - Personal confirmation after status update
- `update-presence` - Client emits to change status
- `presence-heartbeat` - Client emits to update last seen
- `update-activity` - Client emits to update activity string

**Presence Statuses**:
- `online` (green) - Active and available
- `away` (orange) - Temporarily unavailable
- `busy` (red) - Do not disturb mode
- `offline` (gray) - User offline or inactive > 5 minutes

**Critical Features**:
- **Status persistence through refresh** - Fetches actual status from server on mount
- **Automatic heartbeat** - Every 60 seconds to prevent false offline
- **Status preservation on disconnect** - Keeps away/busy status, not reset to offline
- **Inactivity detection** - Marks offline after 5 minutes of no heartbeat
- **Real-time updates** - All users see status changes instantly via Socket.IO

**Database Configuration**:
- `useUTC: true` in DatabaseService.ts (CRITICAL!)
- All timestamps use GETUTCDATE() in SQL queries
- Frontend uses standard Date API for ISO UTC parsing
- Display uses relative time with auto-timezone conversion

**Bug Fix (Dec 4, 2025)**:
- Issue: Status badge showed 'online' after refresh despite actual status being 'away'
- Cause: usePresence hook defaulted to 'online' on mount instead of fetching from server
- Fix: Added presenceApi.getMyPresence() call on mount to fetch actual status
- Result: Status now persists correctly through page refreshes

**Last Updated**: December 2, 2025 - Production ready

---

## 🗂️ SERVICE LAYER ARCHITECTURE

### API Service Pattern
All API services follow this structure:

```typescript
// 1. Axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:3001'
});

// 2. Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const token = JSON.parse(authStorage)?.state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 3. Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - logout
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 4. Service class with methods
class MyApi {
  async getSomething(): Promise<Data> {
    const response = await api.get('/endpoint');
    return response.data;
  }
}

export const myApi = new MyApi();
```

### API Services List

| Service | File | Purpose | Key Methods |
|---------|------|---------|-------------|
| **coursesApi** | `coursesApi.ts` | Course CRUD, search, filters | getCourses, getCourse, getEnrollmentStatus |
| **enrollmentApi** | `enrollmentApi.ts` | Enrollment management | enrollInCourse, getMyEnrollments, unenrollFromCourse |
| **progressApi** | `progressApi.ts` | Progress tracking | getCourseProgress, markLessonComplete, updateLessonProgress |
| **bookmarkApi** | `bookmarkApi.ts` | Bookmark management | addBookmark, removeBookmark, checkBookmarkStatus, getBookmarks |
| **videoProgressApi** | `videoProgressApi.ts` | Video progress | updateProgress, markComplete, getProgress |
| **assessmentApi** | `assessmentApi.ts` | Assessments | getAssessments, submitAssessment, getResults |
| **chatApi** | `chatApi.ts` | AI tutoring | createSession, sendMessage, getSessions |
| **analyticsApi** | `analyticsApi.ts` | Analytics | getCourseAnalytics, getStudentAnalytics |
| **instructorApi** | `instructorApi.ts` | Instructor features | createCourse, updateCourse, getStudents |

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Role-Based Access Control

**3 Roles**:
1. **Student** - Can enroll, learn, track progress
2. **Instructor** - Can create courses, view analytics, manage students
3. **Admin** - Full system access (not fully implemented)

### Access Checks

**Backend Middleware**:
```typescript
authenticateToken(req, res, next) - Verify JWT
roleCheck(['instructor', 'admin'])(req, res, next) - Check roles
```

**Frontend Guards**:
```typescript
ProtectedRoute - Requires login
user?.Role === 'instructor' - Instructor-only features
enrollmentStatus.isInstructor - Course ownership check
```

### Common Access Patterns

**Course Detail Page**:
```typescript
if (enrollmentStatus?.isInstructor) {
  // Show "Manage Course" button
} else if (course.isEnrolled) {
  // Show "Continue Learning" button
} else {
  // Show "Enroll Now" button
}
```

**Instructor Preview Mode**:
```typescript
const isInstructorPreview = enrollmentStatus?.isInstructor;
if (isInstructorPreview) {
  // NO progress tracking
  // NO completion buttons
  // Show "Preview Mode" badge
}
```

---

## 🗄️ DATABASE SCHEMA OVERVIEW

### Core Tables

**Users**
- Id, FirstName, LastName, Email, PasswordHash
- Role ('student' | 'instructor' | 'admin')
- EmailVerified, IsActive, CreatedAt

**Courses**
- Id, Title, Description, InstructorId (FK → Users)
- Category, Level, Duration, Price, Rating
- Thumbnail, IsPublished, EnrollmentCount

**Lessons**
- Id, CourseId (FK → Courses)
- Title, Description, Content, OrderIndex
- Type ('video' | 'text' | 'quiz' | 'assignment')

**Enrollments**
- Id, UserId (FK → Users), CourseId (FK → Courses)
- Status ('active' | 'completed' | 'suspended')
- EnrolledAt, CompletedAt

**UserProgress** (per-lesson)
- Id, UserId, CourseId, LessonId (FK → Lessons)
- ProgressPercentage, Status, CompletedAt
- TimeSpent, NotesJson, LastAccessedAt
- **UNIQUE(UserId, CourseId, LessonId)**

**CourseProgress** (per-course)
- Id, UserId, CourseId
- OverallProgress, CompletedLessons (JSON array)
- TimeSpent, LastAccessedAt

**Bookmarks**
- Id, UserId (FK → Users), CourseId (FK → Courses)
- Notes, BookmarkedAt
- **UNIQUE(UserId, CourseId)**

**VideoLessons**
- Id, LessonId (FK → Lessons)
- VideoUrl, Duration, Quality, Thumbnail
- TranscriptUrl, Subtitles

**VideoProgress**
- Id, UserId, VideoLessonId (FK → VideoLessons)
- CurrentTime, Duration, CompletedAt
- PlaybackSpeed, LastWatchedAt

---

## 📁 FRONTEND STRUCTURE

### Page Components (Entry Points)

```
pages/
├── Auth/
│   ├── LoginForm.tsx - Login page
│   ├── RegisterForm.tsx - Registration
│   └── ForgotPasswordForm.tsx - Password reset
├── Courses/
│   ├── CoursesPage.tsx - Course catalog (3 tabs: All, Enrolled, Bookmarked)
│   └── CourseDetail.tsx - Old detail page (merged into CourseDetailPage)
├── Course/
│   ├── CourseDetailPage.tsx - Unified course detail (preview + enrolled)
│   └── LessonDetailPage.tsx - Individual lesson view
├── Learning/
│   └── MyLearningPage.tsx - Student learning dashboard
├── Instructor/
│   ├── InstructorDashboard.tsx - Instructor home
│   ├── CourseCreationForm.tsx - Create/edit courses
│   └── LessonEditor.tsx - Create/edit lessons
├── Dashboard/
│   └── DashboardPage.tsx - Student dashboard
└── Profile/
    ├── ProfilePage.tsx - User profile
    └── TransactionsPage.tsx - Purchase history
```

### Reusable Components

```
components/
├── Course/
│   ├── CourseCard.tsx - Course preview card (SHARED by all pages)
│   └── ShareDialog.tsx - Social media sharing
├── Navigation/
│   ├── Header.tsx - Top navigation bar
│   └── Breadcrumbs.tsx - Breadcrumb trail
├── Layout/
│   └── DashboardLayout.tsx - Dashboard wrapper
├── Video/
│   ├── VideoPlayer.tsx - Video player with progress
│   └── VideoTranscript.tsx - Interactive transcript
└── Auth/
    ├── ProtectedRoute.tsx - Auth guard
    └── TokenExpirationWarning.tsx - Session warning
```

---

## 🔄 STATE MANAGEMENT

### Zustand Store (Global)

**authStore** (`stores/authStore.ts`)
```typescript
{
  token: string | null,
  user: User | null,
  login: (email, password) => Promise<void>,
  logout: () => void,
  refreshToken: () => Promise<void>
}
```

**Persisted in**: `localStorage['auth-storage']`

**Used by**: All components needing auth state

### React State (Local)

**Component-level state examples**:
```typescript
// CourseDetailPage
const [course, setCourse] = useState<CourseDetails | null>(null);
const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
const [isBookmarked, setIsBookmarked] = useState(false);
const [loading, setLoading] = useState(true);

// CoursesPage
const [allCourses, setAllCourses] = useState<Course[]>([]);
const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
const [bookmarkedCourses, setBookmarkedCourses] = useState<Course[]>([]);
```

---

## 🔌 SOCKET.IO INTEGRATION

### Overview
Socket.io provides real-time bidirectional communication between clients and server for instant updates, live chat, and collaborative features.

**Server Setup**: `server/src/index.ts`
```typescript
import { Server } from 'socket.io';

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

// Initialize handlers
setupSocketHandlers(io);

// NotificationService with Socket.io
const notificationService = new NotificationService(io);
```

### Authentication Flow

**Connection with JWT** (`server/src/sockets.ts`):
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication failed'));
    
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.join(`user-${decoded.userId}`);
    
    next();
  });
});
```

**Client Connection** (`client/src/services/socketService.ts`):
```typescript
connect() {
  const token = authStore.getState().token;
  
  this.socket = io('http://localhost:3001', {
    auth: { token },
    transports: ['websocket', 'polling']
  });
  
  this.setupListeners();
}
```

### Real-time Notifications Flow

**Backend Emission** (`server/src/services/NotificationService.ts`):
```typescript
async createNotification(data: CreateNotificationData) {
  // Save to database
  const notification = await db.insertNotification(data);
  
  // Emit via Socket.io to user's room
  this.io.to(`user-${data.userId}`).emit('notification', {
    id: notification.Id,
    type: notification.Type,
    title: notification.Title,
    message: notification.Message,
    priority: notification.Priority,
    createdAt: notification.CreatedAt
  });
  
  return notification;
}
```

**Frontend Listener** (`client/src/components/Notifications/NotificationBell.tsx`):
```typescript
useEffect(() => {
  socketService.connect();
  
  socketService.onNotification((notification) => {
    // Update state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast for urgent notifications
    if (notification.priority === 'urgent') {
      toast.warning(notification.title, {
        description: notification.message
      });
    }
  });
  
  return () => socketService.disconnect();
}, []);
```

### Live Chat Flow

**Room Management** (`server/src/sockets.ts`):
```typescript
socket.on('join-room', async (data: { roomId: string }) => {
  // Verify user has access to room
  const hasAccess = await verifyRoomAccess(socket.userId, data.roomId);
  if (!hasAccess) return socket.emit('error', 'Access denied');
  
  socket.join(`room-${data.roomId}`);
  
  // Notify others
  io.to(`room-${data.roomId}`).emit('user-joined', {
    userId: socket.userId,
    email: socket.userEmail
  });
});

socket.on('chat-message', async (data) => {
  // Save message to database
  const message = await db.insertChatMessage({
    roomId: data.roomId,
    senderId: socket.userId,
    message: data.message
  });
  
  // Broadcast to room
  io.to(`room-${data.roomId}`).emit('new-message', {
    messageId: message.Id,
    senderId: socket.userId,
    senderName: socket.userEmail,
    message: data.message,
    timestamp: message.CreatedAt
  });
});
```

**Client Integration** (`client/src/pages/Chat/Chat.tsx`):
```typescript
useEffect(() => {
  socketService.joinRoom(roomId);
  
  socketService.onMessage((message) => {
    setMessages(prev => [...prev, message]);
  });
  
  return () => socketService.leaveRoom(roomId);
}, [roomId]);

const sendMessage = (text: string) => {
  socketService.sendMessage(roomId, text);
};
```

### Typing Indicators

**Backend** (`server/src/sockets.ts`):
```typescript
socket.on('typing-start', (data: { roomId: string }) => {
  socket.to(`room-${data.roomId}`).emit('user-typing', {
    userId: socket.userId,
    email: socket.userEmail
  });
});

socket.on('typing-stop', (data: { roomId: string }) => {
  socket.to(`room-${data.roomId}`).emit('user-stopped-typing', {
    userId: socket.userId
  });
});
```

### Event Summary

**Server Events** (emit to clients):
- `notification` - New notification created
- `notification-read` - Notification marked as read (sync across devices)
- `new-message` - New chat message
- `user-joined` - User joined chat room
- `user-left` - User left chat room
- `user-typing` - User started typing
- `user-stopped-typing` - User stopped typing

**Client Events** (emit to server):
- `join-room` - Join chat room
- `leave-room` - Leave chat room
- `chat-message` - Send chat message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator

### Connection Management

**Reconnection Logic**:
```typescript
socket.on('disconnect', () => {
  console.log('Socket disconnected, will auto-reconnect');
});

socket.on('connect', () => {
  console.log('Socket connected/reconnected');
  // Rejoin rooms if needed
});
```

**Cleanup**:
```typescript
useEffect(() => {
  // Setup
  connectSocket();
  
  return () => {
    // Cleanup
    socket.off('notification');
    socket.off('new-message');
    socket.disconnect();
  };
}, []);
```

### Used For
- ✅ **Real-time Notifications** - Instant notification delivery
- ✅ **Live Chat** - AI tutoring sessions with real-time messaging
- ✅ **Typing Indicators** - Show when users are typing
- ✅ **Instructor Interventions** - At-risk student alerts
- ✅ **Live Sessions** - Collaborative learning sessions
- ✅ **Study Groups** - Student collaboration spaces
- ✅ **Office Hours** - Queue management with real-time updates
- ✅ **Presence System** - Online/offline/away/busy status tracking

---

## 🎯 COMMON PATTERNS & CONVENTIONS

### 1. **API Error Handling**
```typescript
try {
  const result = await api.someMethod();
  // Handle success
} catch (error: any) {
  console.error('Operation failed:', error);
  // Parse error message
  try {
    const errorData = JSON.parse(error.message);
    if (errorData.code === 'SPECIFIC_ERROR') {
      // Handle specific error
    }
  } catch {
    // Generic error handling
    setError(error.message || 'Operation failed');
  }
}
```

### 2. **Loading States**
```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getData();
      setData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false); // ALWAYS in finally
    }
  };
  loadData();
}, [dependencies]);

if (loading) return <CircularProgress />;
if (error) return <Alert severity="error">{error}</Alert>;
return <DataDisplay data={data} />;
```

### 3. **Parallel API Calls**
```typescript
// Good - Parallel requests
const [courseData, enrollmentData, bookmarkData] = await Promise.all([
  coursesApi.getCourse(courseId),
  coursesApi.getEnrollmentStatus(courseId),
  BookmarkApi.checkBookmarkStatus(courseId)
]);

// Bad - Sequential requests (slower)
const courseData = await coursesApi.getCourse(courseId);
const enrollmentData = await coursesApi.getEnrollmentStatus(courseId);
const bookmarkData = await BookmarkApi.checkBookmarkStatus(courseId);
```

### 4. **Authentication Checks**
```typescript
// Before sensitive operations
if (!user) {
  navigate('/login');
  return;
}

// API call will automatically include token
const result = await api.protectedOperation();
```

### 5. **Role-Based Rendering**
```typescript
// Check user role
{user?.Role === 'instructor' && (
  <Button onClick={handleManage}>Manage Course</Button>
)}

// Check enrollment status
{enrollmentStatus?.isInstructor ? (
  <Button>Manage Course</Button>
) : course.isEnrolled ? (
  <Button>Continue Learning</Button>
) : (
  <Button onClick={handleEnroll}>Enroll Now</Button>
)}
```

---

## 🚨 CRITICAL RULES

### 1. **NEVER Change Port Numbers**
- Backend: Always 3001
- Frontend: Always 5173
- CORS configured for these exact ports
- Changing ports breaks authentication

### 2. **Database Column Names**
- Use PascalCase in database: `FirstName`, `LastName`, `UserId`
- Check schema.sql before querying
- Use grep_search to find all usages before removing columns

### 3. **Instructor Preview Mode**
- NEVER track progress when `enrollmentStatus.isInstructor === true`
- No lesson completion
- No video progress
- No course progress updates
- Show "Preview Mode" badge

### 4. **Enrollment vs UserProgress**
- Enrollment: Created when user enrolls (1 record per course)
- UserProgress: Created per-lesson when accessed (many records per course)
- NEVER create UserProgress during enrollment

### 5. **Authentication Token**
- Stored as JSON in `localStorage['auth-storage']`
- Access: `JSON.parse(localStorage.getItem('auth-storage')).state.token`
- Auto-injected by interceptors in API services
- Never store in plain `localStorage['token']`

---

## 📚 QUICK REFERENCE

### Finding Component Dependencies
```bash
# Find all files using a component
grep -r "ComponentName" client/src

# Find all API calls to an endpoint
grep -r "/api/endpoint" client/src/services
```

### Common Issues & Solutions

**Issue**: Bookmark not persisting
- **Check**: API call being made?
- **Check**: User logged in?
- **Check**: Backend route working?
- **Check**: Database Bookmarks table exists?

**Issue**: Enrollment button showing wrong state
- **Check**: `enrollmentStatus.isInstructor` value
- **Check**: `course.isEnrolled` value
- **Check**: API returning correct data?

**Issue**: Progress not saving
- **Check**: Instructor preview mode? (should not save)
- **Check**: UserProgress record exists?
- **Check**: API call in network tab?

---

**This architecture document should be updated when:**
- New API services added
- New data flows created
- Major components refactored
- Database schema changes

**Next**: See `COMPONENT_REGISTRY.md` for detailed component documentation.
