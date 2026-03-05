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

export interface OfficeHoursScheduleRecord {
  Id: string;
  InstructorId: string;
  CourseId: string | null;
  DayOfWeek: number; // 0 = Sunday, 6 = Saturday
  StartTime: string; // HH:mm:ss
  EndTime: string;
  MeetingUrl: string | null;
  Description: string | null;
  IsActive: boolean;
  IsDeleted: boolean;
  CreatedAt: Date;
  // Joined data
  CourseName?: string;
  InstructorName?: string;
  InstructorAvatar?: string;
}

export interface OfficeHoursQueueEntry {
  Id: string;
  InstructorId: string;
  StudentId: string;
  ScheduleId: string | null;
  CourseId: string | null;
  LessonId: string | null;
  ChatRoomId: string | null;
  StudentName: string;
  StudentEmail: string;
  Position: number;
  Question: string | null;
  InstructorNotes: string | null;
  Status: 'waiting' | 'admitted' | 'completed' | 'cancelled';
  JoinedQueueAt: string;
  AdmittedAt: string | null;
  CompletedAt: string | null;
  // Joined data
  CourseName?: string;
  LessonTitle?: string;
  DayOfWeek?: number;
  StartTime?: string;
  EndTime?: string;
  MeetingUrl?: string;
}

export interface AvailableInstructorResult {
  InstructorId: string;
  InstructorName: string;
  InstructorAvatar: string | null;
  ScheduleId: string;
  CourseId: string | null;
  CourseName: string | null;
  DayOfWeek: number;
  StartTime: string;
  EndTime: string;
  MeetingUrl: string | null;
  Description: string | null;
  PresenceStatus: string;
  StudentQueueStatus: string | null;
  WaitingCount: number;
  AdmittedCount: number;
  AvgWaitTime: number | null;
}

export interface SessionHistoryRecord {
  Id: string;
  InstructorId: string;
  InstructorName: string;
  StudentId: string;
  StudentName: string;
  CourseId: string | null;
  CourseName: string | null;
  LessonId: string | null;
  LessonTitle: string | null;
  Question: string | null;
  InstructorNotes: string | null;
  ChatRoomId: string | null;
  JoinedQueueAt: string;
  AdmittedAt: string | null;
  CompletedAt: string | null;
  DurationMinutes: number | null;
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

// ===================================
// Admin Dashboard
// ===================================

export interface PlatformStats {
  totalUsers: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalRevenue: number;
  totalRefunds: number;
}

export interface GrowthDataPoint {
  date: string;
  newUsers: number;
  newEnrollments: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  refundTotal: number;
  refundCount: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'signup' | 'enrollment' | 'payment' | 'course_published' | 'refund';
  description: string;
  userName: string;
  timestamp: string;
  metadata: string | null;
}

export interface TopCourse {
  courseId: string;
  title: string;
  instructorName: string;
  enrollmentCount: number;
  revenue: number;
}

// ===================================
// Admin User Management (Phase 2)
// ===================================

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  enrollmentCount: number;
  totalSpent: number;
}

export interface AdminUserDetail extends Omit<AdminUser, 'enrollmentCount' | 'totalSpent'> {
  stats: {
    enrollmentCount: number;
    completedCourses: number;
    totalSpent: number;
    totalRefunds: number;
    coursesCreated: number;
  };
  enrollments: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    status: string;
  }>;
  recentTransactions: Array<{
    id: string;
    courseTitle: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface PaginatedUsers {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===================================
// Admin Course Management (Phase 3)
// ===================================

export interface AdminCourse {
  id: string;
  title: string;
  thumbnail: string | null;
  instructorId: string | null;
  instructorName: string;
  category: string;
  level: string;
  price: number;
  rating: number;
  ratingCount: number;
  enrollmentCount: number;
  lessonCount: number;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCourseDetail extends Omit<AdminCourse, 'lessonCount'> {
  description: string;
  instructorEmail: string;
  duration: number;
  stats: {
    lessonCount: number;
    activeStudents: number;
    completedStudents: number;
    totalRevenue: number;
    avgRating: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    orderIndex: number;
    duration: number;
  }>;
  recentEnrollments: Array<{
    userId: string;
    userName: string;
    enrolledAt: string;
    status: string;
  }>;
}

export interface PaginatedCourses {
  courses: AdminCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Admin Revenue & Transactions (Phase 4)
// ========================================

export interface AdminTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  refundAmount: number | null;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
}

export interface AdminTransactionDetail extends AdminTransaction {
  courseCategory: string;
  instructorName: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  refundReason: string | null;
  updatedAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
  } | null;
}

export interface PaginatedTransactions {
  transactions: AdminTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RevenueBreakdown {
  byCategory: Array<{ category: string; revenue: number; count: number }>;
  topInstructors: Array<{ instructorId: string; instructorName: string; revenue: number; transactionCount: number }>;
  refundSummary: { totalRefunds: number; refundCount: number; avgRefund: number };
  dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
}

// Admin Reports & System Health (Phase 5)
// ========================================

export interface SystemHealth {
  database: { status: string; timestamp: string };
  tables: Array<{ name: string; rowCount: number }>;
  recentActivity: {
    lastSignup: string | null;
    lastEnrollment: string | null;
    lastTransaction: string | null;
    lastLogin: string | null;
  };
  userSummary: {
    totalActive: number;
    totalInactive: number;
    loggedInToday: number;
    loggedInThisWeek: number;
  };
}

export interface AuditLogEntry {
  id: string;
  type: 'account_deletion' | 'course_ownership';
  description: string;
  details: string;
  timestamp: string;
}

export interface PaginatedAuditLog {
  entries: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PopularCourse {
  id: string;
  title: string;
  category: string;
  instructorName: string;
  status: string;
  enrollmentCount: number;
  rating: number;
  ratingCount: number;
  revenue: number;
  createdAt: string;
}

export interface InstructorLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  totalRevenue: number;
  avgRating: number;
  totalRatings: number;
  joinedAt: string;
}
