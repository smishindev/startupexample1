/**
 * Type Definitions for Database Models
 * Improves type safety across the application
 */

// ===================================
// Export System Types
// ===================================

export interface PendingExportRequest {
  Id: string;
  UserId: string;
  Status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  RequestedAt: Date;
  CompletedAt: Date | null;
  ExpiresAt: Date | null;
  FilePath: string | null;
  FileName: string | null;
  FileSize: number | null;
  DownloadCount: number;
  LastDownloadedAt: Date | null;
  ErrorMessage: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface UserInfo {
  Id: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Username: string;
}

// ===================================
// Socket Event Types
// ===================================

export interface SocketUser {
  id: string;
  userId: string;
  userEmail: string;
  userRole: string;
}

export interface ChatJoinData {
  roomId: string;
}

export interface ChatTypingData {
  roomId: string;
}

export interface LiveSessionJoinData {
  sessionId: string;
}

export interface SessionMessageData {
  sessionId: string;
  content: string;
  messageType?: 'text' | 'question' | 'poll';
}

export interface PresenceUpdateData {
  status: 'online' | 'offline' | 'away' | 'busy';
  activity?: string;
}

export interface ActivityUpdateData {
  activity: string;
}

export interface StudyGroupData {
  groupId: string;
}

export interface OfficeHoursData {
  instructorId: string;
}

export interface OfficeHoursQueueData {
  instructorId: string;
  queueId: string;
}

export interface CommentSubscribeData {
  entityType: string;
  entityId: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}

// ===================================
// Study Group Types
// ===================================

export interface StudyGroupWithMembership {
  Id: string;
  Name: string;
  Description: string | null;
  CourseId: string | null;
  CourseName: string | null;
  CreatedBy: string;
  CreatorName: string;
  IsActive: boolean;
  MemberCount: number;
  CreatedAt: Date;
  // Membership info
  IsMember: boolean;
  Role?: 'admin' | 'member';
  JoinedAt?: Date;
}

export interface StudyGroupMembershipInfo {
  GroupId: string;
  Role: 'admin' | 'member';
}

// ===================================
// Notification Helper Types
// ===================================

export interface UpcomingAssessment {
  assessmentId: string;
  assessmentTitle: string;
  lessonId: string;
  courseId: string;
  courseName: string;
  userId: string;
  userName: string;
  userEmail: string;
  dueDate: Date;
  hasSubmission: boolean;
}

export interface WeeklyActivitySummary {
  userId: string;
  userName: string;
  userEmail: string;
  lessonsCompleted: number;
  videosWatched: number;
  assessmentsSubmitted: number;
  totalTimeSpent: number;
  coursesActive: number;
}

export interface UpcomingLiveSession {
  sessionId: string;
  sessionTitle: string;
  scheduledAt: Date;
  courseId: string;
  courseName: string;
  instructorName: string;
  enrolledStudents: Array<{
    userId: string;
    userName: string;
    userEmail: string;
  }>;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  daysSinceLastActivity: number;
  completionRate: number;
  avgAssessmentScore: number | null;
  lastActivityType: string | null;
  lastActivityDate: Date | null;
}

// ===================================
// Live Session Types
// ===================================

export interface LiveSessionMaterial {
  title: string;
  url: string;
  type: string;
}

export interface LiveSessionDB {
  Id: string;
  Title: string;
  Description: string;
  InstructorId: string;
  CourseId: string | null;
  ScheduledAt: Date;
  StartedAt: Date | null;
  EndedAt: Date | null;
  Duration: number;
  Capacity: number;
  Status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  StreamUrl: string | null;
  RecordingUrl: string | null;
  Materials: string | null; // JSON string
  CreatedAt: Date;
  UpdatedAt: Date;
}

// ===================================
// User Presence Types
// ===================================

export interface UserPresenceDB {
  UserId: string;
  Status: 'online' | 'offline' | 'away' | 'busy';
  Activity: string | null;
  LastSeenAt: Date;
  UpdatedAt: Date;
}

// ===================================
// Settings Types
// ===================================

export interface UserSettings {
  Id: string;
  UserId: string;
  ProfileVisibility: 'public' | 'private' | 'friends';
  ShowEmail: boolean;
  ShowProgress: boolean;
  AllowMessages: boolean;
  Theme: 'light' | 'dark' | 'auto';
  Language: 'en' | 'es' | 'fr' | 'de' | 'zh';
  FontSize: 'small' | 'medium' | 'large';
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface FilteredUser {
  Id: string;
  Username: string;
  FirstName?: string;
  LastName?: string;
  Email?: string | null;
  Avatar: string | null;
  Role: string;
  LearningStyle?: string;
  CreatedAt?: Date;
  // Progress data if allowed
  enrollmentCount?: number;
  completedCourses?: number;
  averageProgress?: number;
}

// ===================================
// Transaction Types (Stripe)
// ===================================

export interface Transaction {
  Id: string;
  UserId: string;
  CourseId: string;
  Amount: number;
  Currency: string;
  Status: 'pending' | 'completed' | 'failed' | 'refunded';
  StripePaymentIntentId: string | null;
  StripeChargeId: string | null;
  PaymentMethod: string;
  RefundReason: string | null;
  RefundedAt: Date | null;
  CompletedAt: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
  // Joined data
  CourseName?: string;
  InstructorName?: string;
}

// ===================================
// Office Hours Types
// ===================================

export interface OfficeHoursQueueEntry {
  Id: string;
  InstructorId: string;
  StudentId: string;
  StudentName: string;
  StudentEmail: string;
  Position: number;
  Question: string | null;
  Status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  JoinedAt: Date;
  StartedAt: Date | null;
  CompletedAt: Date | null;
  WaitTime: number | null;
  Duration: number | null;
}

// ===================================
// Notification Types
// ===================================

export interface NotificationRecord {
  Id: string;
  UserId: string;
  Type: string;
  Priority: 'low' | 'normal' | 'high' | 'urgent';
  Title: string;
  Message: string;
  Link: string | null;
  IsRead: boolean;
  ReadAt: Date | null;
  CreatedAt: Date;
}

// ===================================
// Intervention Details
// ===================================

export interface InterventionCheckDetails {
  atRiskStudents: number;
  lowProgress: number;
  assessmentDeadlines: number;
  achievements: number;
}
