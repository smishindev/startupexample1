// User Management Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  learningStyle?: LearningStyle;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin'
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing'
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  courseUpdates: boolean;
  achievements: boolean;
  reminders: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  progressVisible: boolean;
  allowMessages: boolean;
}

// Authentication Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  username: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// Course Management Types
export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructorId: string;
  instructor: User;
  category: CourseCategory;
  level: CourseLevel;
  duration: number; // in minutes
  price: number;
  rating: number;
  enrollmentCount: number;
  lessons: Lesson[];
  prerequisites: string[];
  learningOutcomes: string[];
  tags: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum CourseCategory {
  PROGRAMMING = 'programming',
  DATA_SCIENCE = 'data_science',
  DESIGN = 'design',
  BUSINESS = 'business',
  LANGUAGE = 'language',
  MATHEMATICS = 'mathematics',
  SCIENCE = 'science',
  ARTS = 'arts',
  OTHER = 'other'
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: LessonContent;
  order: number;
  duration: number; // in minutes
  isRequired: boolean;
  prerequisites: string[];
  resources: Resource[];
  assessments: Assessment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonContent {
  type: ContentType;
  data: any; // Flexible content data
  metadata: ContentMetadata;
}

export enum ContentType {
  VIDEO = 'video',
  TEXT = 'text',
  INTERACTIVE = 'interactive',
  QUIZ = 'quiz',
  CODE = 'code',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

export interface ContentMetadata {
  difficulty: number; // 1-10
  estimatedTime: number; // in minutes
  adaptiveElements?: AdaptiveElement[];
}

export interface AdaptiveElement {
  trigger: string;
  action: string;
  conditions: Record<string, any>;
}

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  description?: string;
}

export enum ResourceType {
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  LINK = 'link',
  DOWNLOAD = 'download'
}

// Assessment Types
export interface Assessment {
  id: string;
  lessonId: string;
  title: string;
  type: AssessmentType;
  questions: Question[];
  passingScore: number;
  attempts: number;
  timeLimit?: number; // in minutes
  isAdaptive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AssessmentType {
  QUIZ = 'quiz',
  TEST = 'test',
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  PRACTICAL = 'practical'
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
  difficulty: number; // 1-10
  tags: string[];
  adaptiveWeight?: number;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  CODE = 'code',
  DRAG_DROP = 'drag_drop',
  FILL_BLANK = 'fill_blank'
}

// Progress Tracking Types
export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string;
  overallProgress: number; // 0-100
  completedLessons: string[];
  currentLesson?: string;
  timeSpent: number; // in minutes
  lastAccessedAt: Date;
  startedAt: Date;
  completedAt?: Date;
  certificate?: Certificate;
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  averageScore: number;
  streakDays: number;
  totalQuizzes: number;
  correctAnswers: number;
  skillLevels: Record<string, number>;
  learningVelocity: number; // lessons per day
  engagementScore: number; // 0-100
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issuedAt: Date;
  certificateUrl: string;
  verificationCode: string;
}

// AI Tutoring Types
export interface TutoringSession {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  startedAt: Date;
  endedAt?: Date;
  messages: TutoringMessage[];
  context: SessionContext;
  outcome: SessionOutcome;
}

export interface TutoringMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  confidence: number; // 0-1
  suggestedActions?: string[];
  relatedConcepts?: string[];
  difficulty?: number;
}

export interface SessionContext {
  currentTopic: string;
  userKnowledgeLevel: number; // 1-10
  strugglingConcepts: string[];
  preferredExplanationStyle: string;
  sessionGoals: string[];
}

export interface SessionOutcome {
  conceptsLearned: string[];
  improvementAreas: string[];
  recommendedNextSteps: string[];
  satisfactionScore?: number; // 1-5
}

// Analytics Types
export interface LearningAnalytics {
  userId: string;
  timeframe: AnalyticsTimeframe;
  metrics: AnalyticsMetrics;
  insights: LearningInsight[];
  recommendations: Recommendation[];
  generatedAt: Date;
}

export enum AnalyticsTimeframe {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ALL_TIME = 'all_time'
}

export interface AnalyticsMetrics {
  totalTimeSpent: number; // in minutes
  coursesStarted: number;
  coursesCompleted: number;
  lessonsCompleted: number;
  averageScore: number;
  streakDays: number;
  skillGrowth: SkillGrowth[];
  activityPattern: ActivityData[];
}

export interface SkillGrowth {
  skillName: string;
  startLevel: number;
  currentLevel: number;
  growth: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ActivityData {
  date: Date;
  timeSpent: number;
  lessonsCompleted: number;
  quizScore?: number;
}

export interface LearningInsight {
  type: InsightType;
  title: string;
  description: string;
  confidence: number; // 0-1
  actionable: boolean;
  relatedMetrics: string[];
}

export enum InsightType {
  PERFORMANCE = 'performance',
  BEHAVIOR = 'behavior',
  PREFERENCE = 'preference',
  RECOMMENDATION = 'recommendation',
  WARNING = 'warning',
  ACHIEVEMENT = 'achievement'
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  courseId?: string;
  lessonId?: string;
  estimatedTime?: number;
  reasoning: string;
}

export enum RecommendationType {
  COURSE = 'course',
  LESSON = 'lesson',
  PRACTICE = 'practice',
  REVIEW = 'review',
  SKILL_BUILDING = 'skill_building',
  TIME_MANAGEMENT = 'time_management'
}

// Real-time Communication Types
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: User;
  content: string;
  type: MessageType;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  replyTo?: string;
  reactions: Reaction[];
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  CODE = 'code',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement'
}

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: RoomType;
  courseId?: string;
  participants: string[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  metadata: RoomMetadata;
}

export enum RoomType {
  COURSE_GENERAL = 'course_general',
  COURSE_QA = 'course_qa',
  STUDY_GROUP = 'study_group',
  DIRECT_MESSAGE = 'direct_message',
  AI_TUTORING = 'ai_tutoring'
}

export interface RoomMetadata {
  description?: string;
  rules?: string[];
  isModerated: boolean;
  allowFileSharing: boolean;
  maxParticipants?: number;
}

// Live Session Types
export interface LiveSession {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  courseId?: string;
  scheduledAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // in minutes
  capacity: number;
  attendees: string[];
  status: SessionStatus;
  streamUrl?: string;
  recordingUrl?: string;
  materials: Resource[];
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Utility Types
export interface SearchFilters {
  category?: CourseCategory;
  level?: CourseLevel;
  priceRange?: [number, number];
  rating?: number;
  duration?: [number, number];
  tags?: string[];
  instructor?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Event Types for Real-time Updates
export interface SocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  userId?: string;
}

export type ProgressUpdateEvent = SocketEvent<{
  courseId: string;
  lessonId: string;
  progress: number;
}>;

export type NewMessageEvent = SocketEvent<ChatMessage>;

export type LiveSessionEvent = SocketEvent<{
  sessionId: string;
  status: SessionStatus;
  attendeeCount: number;
}>;

// Constants
export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_PAGINATION_LIMIT = 100;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours