-- Mishin Learn Platform Database Schema
-- SQL Server Database: startUp1

USE [startUp1]
GO

-- Drop tables if they exist (for fresh setup)
IF OBJECT_ID('dbo.VideoAnalytics', 'U') IS NOT NULL DROP TABLE dbo.VideoAnalytics;
IF OBJECT_ID('dbo.VideoProgress', 'U') IS NOT NULL DROP TABLE dbo.VideoProgress;
IF OBJECT_ID('dbo.VideoLessons', 'U') IS NOT NULL DROP TABLE dbo.VideoLessons;
IF OBJECT_ID('dbo.FileUploads', 'U') IS NOT NULL DROP TABLE dbo.FileUploads;
IF OBJECT_ID('dbo.TutoringMessages', 'U') IS NOT NULL DROP TABLE dbo.TutoringMessages;
IF OBJECT_ID('dbo.TutoringSessions', 'U') IS NOT NULL DROP TABLE dbo.TutoringSessions;
IF OBJECT_ID('dbo.ChatMessages', 'U') IS NOT NULL DROP TABLE dbo.ChatMessages;
IF OBJECT_ID('dbo.ChatRooms', 'U') IS NOT NULL DROP TABLE dbo.ChatRooms;
IF OBJECT_ID('dbo.LiveSessionAttendees', 'U') IS NOT NULL DROP TABLE dbo.LiveSessionAttendees;
IF OBJECT_ID('dbo.LiveSessions', 'U') IS NOT NULL DROP TABLE dbo.LiveSessions;
-- Student Progress Integration Tables (drop in dependency order)
IF OBJECT_ID('dbo.PeerComparison', 'U') IS NOT NULL DROP TABLE dbo.PeerComparison;
IF OBJECT_ID('dbo.StudentRiskAssessment', 'U') IS NOT NULL DROP TABLE dbo.StudentRiskAssessment;
IF OBJECT_ID('dbo.StudentRecommendations', 'U') IS NOT NULL DROP TABLE dbo.StudentRecommendations;
IF OBJECT_ID('dbo.LearningActivities', 'U') IS NOT NULL DROP TABLE dbo.LearningActivities;
IF OBJECT_ID('dbo.CourseProgress', 'U') IS NOT NULL DROP TABLE dbo.CourseProgress;
IF OBJECT_ID('dbo.NotificationPreferences', 'U') IS NOT NULL DROP TABLE dbo.NotificationPreferences;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.Bookmarks', 'U') IS NOT NULL DROP TABLE dbo.Bookmarks;
-- Core Assessment Tables
IF OBJECT_ID('dbo.AssessmentSubmissions', 'U') IS NOT NULL DROP TABLE dbo.AssessmentSubmissions;
IF OBJECT_ID('dbo.Questions', 'U') IS NOT NULL DROP TABLE dbo.Questions;
IF OBJECT_ID('dbo.Assessments', 'U') IS NOT NULL DROP TABLE dbo.Assessments;
IF OBJECT_ID('dbo.Resources', 'U') IS NOT NULL DROP TABLE dbo.Resources;
IF OBJECT_ID('dbo.UserProgress', 'U') IS NOT NULL DROP TABLE dbo.UserProgress;
IF OBJECT_ID('dbo.Enrollments', 'U') IS NOT NULL DROP TABLE dbo.Enrollments;
IF OBJECT_ID('dbo.Lessons', 'U') IS NOT NULL DROP TABLE dbo.Lessons;
IF OBJECT_ID('dbo.Courses', 'U') IS NOT NULL DROP TABLE dbo.Courses;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;

-- Users Table
CREATE TABLE dbo.Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Avatar NVARCHAR(500) NULL,
    Role NVARCHAR(20) NOT NULL DEFAULT 'student' CHECK (Role IN ('student', 'instructor', 'admin')),
    LearningStyle NVARCHAR(20) NULL CHECK (LearningStyle IN ('visual', 'auditory', 'kinesthetic', 'reading_writing')),
    PreferencesJson NVARCHAR(MAX) NULL, -- JSON string for user preferences
    IsActive BIT NOT NULL DEFAULT 1,
    EmailVerified BIT NOT NULL DEFAULT 0,
    PasswordResetToken NVARCHAR(10) NULL, -- For password reset functionality
    PasswordResetExpiry DATETIME2 NULL, -- Expiry time for reset token
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastLoginAt DATETIME2 NULL
);

-- Courses Table
CREATE TABLE dbo.Courses (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Thumbnail NVARCHAR(500) NULL,
    InstructorId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    Category NVARCHAR(30) NOT NULL CHECK (Category IN ('programming', 'data_science', 'design', 'business', 'marketing', 'language', 'mathematics', 'science', 'arts', 'other')),
    Level NVARCHAR(20) NOT NULL CHECK (Level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    Duration INT NOT NULL DEFAULT 0, -- in minutes
    Price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    EnrollmentCount INT NOT NULL DEFAULT 0,
    Prerequisites NVARCHAR(MAX) NULL, -- JSON array
    LearningOutcomes NVARCHAR(MAX) NULL, -- JSON array
    Tags NVARCHAR(MAX) NULL, -- JSON array
    IsPublished BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Lessons Table
CREATE TABLE dbo.Lessons (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    ContentJson NVARCHAR(MAX) NOT NULL, -- JSON content object
    OrderIndex INT NOT NULL,
    Duration INT NOT NULL DEFAULT 0, -- in minutes
    IsRequired BIT NOT NULL DEFAULT 1,
    Prerequisites NVARCHAR(MAX) NULL, -- JSON array of lesson IDs
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Enrollments Table
CREATE TABLE dbo.Enrollments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    EnrolledAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (Status IN ('active', 'completed', 'suspended', 'cancelled')),
    UNIQUE(UserId, CourseId)
);

-- User Progress Table
CREATE TABLE dbo.UserProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE NO ACTION,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Status NVARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (Status IN ('not_started', 'in_progress', 'completed')),
    ProgressPercentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (ProgressPercentage >= 0 AND ProgressPercentage <= 100),
    LastAccessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    TimeSpent INT NOT NULL DEFAULT 0, -- in minutes
    NotesJson NVARCHAR(MAX) NULL, -- JSON object for user notes
    UNIQUE(UserId, CourseId, LessonId)
);

-- Resources Table
CREATE TABLE dbo.Resources (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('document', 'video', 'audio', 'link', 'download')),
    Url NVARCHAR(500) NOT NULL,
    Description NVARCHAR(500) NULL,
    OrderIndex INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Assessments Table
CREATE TABLE dbo.Assessments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('quiz', 'test', 'assignment', 'project', 'practical')),
    PassingScore INT NOT NULL DEFAULT 70,
    MaxAttempts INT NOT NULL DEFAULT 3,
    TimeLimit INT NULL, -- in minutes
    IsAdaptive BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Questions Table
CREATE TABLE dbo.Questions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    AssessmentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Assessments(Id) ON DELETE CASCADE,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'code', 'drag_drop', 'fill_blank')),
    Question NVARCHAR(MAX) NOT NULL,
    Options NVARCHAR(MAX) NULL, -- JSON array for multiple choice
    CorrectAnswer NVARCHAR(MAX) NOT NULL,
    Explanation NVARCHAR(MAX) NULL,
    Difficulty INT NOT NULL DEFAULT 5 CHECK (Difficulty >= 1 AND Difficulty <= 10),
    Tags NVARCHAR(MAX) NULL, -- JSON array
    AdaptiveWeight DECIMAL(5,2) NULL,
    OrderIndex INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Assessment Submissions Table
CREATE TABLE dbo.AssessmentSubmissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    AssessmentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Assessments(Id) ON DELETE CASCADE,
    Answers NVARCHAR(MAX) NOT NULL, -- JSON object with question IDs and answers
    Score INT NOT NULL DEFAULT 0,
    MaxScore INT NOT NULL DEFAULT 100,
    TimeSpent INT NOT NULL DEFAULT 0, -- in seconds (for precise time tracking)
    AttemptNumber INT NOT NULL DEFAULT 1,
    IsPreview BIT NOT NULL DEFAULT 0, -- 1 = preview/test attempt, 0 = real graded attempt
    Status NVARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (Status IN ('in_progress', 'completed', 'abandoned')),
    StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    Feedback NVARCHAR(MAX) NULL -- JSON object for detailed feedback
);

-- Live Sessions Table
CREATE TABLE dbo.LiveSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    InstructorId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE SET NULL,
    ScheduledAt DATETIME2 NOT NULL,
    StartedAt DATETIME2 NULL,
    EndedAt DATETIME2 NULL,
    Duration INT NOT NULL DEFAULT 60, -- in minutes
    Capacity INT NOT NULL DEFAULT 100,
    Status NVARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (Status IN ('scheduled', 'live', 'ended', 'cancelled')),
    StreamUrl NVARCHAR(500) NULL,
    RecordingUrl NVARCHAR(500) NULL,
    Materials NVARCHAR(MAX) NULL, -- JSON array of resource objects
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Live Session Attendees Table
CREATE TABLE dbo.LiveSessionAttendees (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.LiveSessions(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LeftAt DATETIME2 NULL,
    AttendanceMinutes INT NOT NULL DEFAULT 0,
    UNIQUE(SessionId, UserId)
);

-- Chat Rooms Table
CREATE TABLE dbo.ChatRooms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('course_general', 'course_qa', 'study_group', 'direct_message', 'ai_tutoring')),
    CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Messages Table
CREATE TABLE dbo.ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatRooms(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    Content NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(20) NOT NULL DEFAULT 'text' CHECK (Type IN ('text', 'image', 'file', 'code', 'system', 'announcement')),
    ReplyTo UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.ChatMessages(Id),
    Reactions NVARCHAR(MAX) NULL, -- JSON array of reaction objects
    IsEdited BIT NOT NULL DEFAULT 0,
    EditedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Tutoring Sessions Table
CREATE TABLE dbo.TutoringSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE SET NULL,
    LessonId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE NO ACTION,
    Title NVARCHAR(255) NOT NULL,
    Context NVARCHAR(MAX) NULL, -- JSON object for session context
    Status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (Status IN ('active', 'completed', 'cancelled')),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Tutoring Messages Table
CREATE TABLE dbo.TutoringMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.TutoringSessions(Id) ON DELETE CASCADE,
    Role NVARCHAR(10) NOT NULL CHECK (Role IN ('user', 'ai')),
    Content NVARCHAR(MAX) NOT NULL,
    Metadata NVARCHAR(MAX) NULL, -- JSON object for message metadata
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- File Uploads Table
CREATE TABLE dbo.FileUploads (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    FileName NVARCHAR(255) NOT NULL,
    FilePath NVARCHAR(500) NOT NULL,
    FileType NVARCHAR(20) NOT NULL CHECK (FileType IN ('video', 'image', 'document')),
    FileSize BIGINT NOT NULL,
    MimeType NVARCHAR(100) NULL,
    RelatedEntityType NVARCHAR(50) NULL CHECK (RelatedEntityType IN ('Course', 'Lesson')),
    RelatedEntityId UNIQUEIDENTIFIER NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Create Indexes for Performance
CREATE INDEX IX_Users_Email ON dbo.Users(Email);
CREATE INDEX IX_Users_Username ON dbo.Users(Username);
CREATE INDEX IX_Users_Role ON dbo.Users(Role);

CREATE INDEX IX_Courses_InstructorId ON dbo.Courses(InstructorId);
CREATE INDEX IX_Courses_Category ON dbo.Courses(Category);
CREATE INDEX IX_Courses_Level ON dbo.Courses(Level);
CREATE INDEX IX_Courses_IsPublished ON dbo.Courses(IsPublished);

CREATE INDEX IX_Lessons_CourseId ON dbo.Lessons(CourseId);
CREATE INDEX IX_Lessons_OrderIndex ON dbo.Lessons(OrderIndex);

CREATE INDEX IX_Enrollments_UserId ON dbo.Enrollments(UserId);
CREATE INDEX IX_Enrollments_CourseId ON dbo.Enrollments(CourseId);
CREATE INDEX IX_Enrollments_Status ON dbo.Enrollments(Status);

CREATE INDEX IX_UserProgress_UserId ON dbo.UserProgress(UserId);
CREATE INDEX IX_UserProgress_CourseId ON dbo.UserProgress(CourseId);
CREATE INDEX IX_UserProgress_LastAccessedAt ON dbo.UserProgress(LastAccessedAt);

CREATE INDEX IX_ChatMessages_RoomId ON dbo.ChatMessages(RoomId);
CREATE INDEX IX_ChatMessages_UserId ON dbo.ChatMessages(UserId);
CREATE INDEX IX_ChatMessages_CreatedAt ON dbo.ChatMessages(CreatedAt);

CREATE INDEX IX_TutoringMessages_SessionId ON dbo.TutoringMessages(SessionId);
CREATE INDEX IX_TutoringMessages_Timestamp ON dbo.TutoringMessages(Timestamp);

CREATE INDEX IX_FileUploads_UploadedBy ON dbo.FileUploads(UploadedBy);
CREATE INDEX IX_FileUploads_FileType ON dbo.FileUploads(FileType);
CREATE INDEX IX_FileUploads_RelatedEntityType ON dbo.FileUploads(RelatedEntityType);
CREATE INDEX IX_FileUploads_RelatedEntityId ON dbo.FileUploads(RelatedEntityId);
CREATE INDEX IX_FileUploads_UploadedAt ON dbo.FileUploads(UploadedAt);

-- ========================================
-- STUDENT PROGRESS INTEGRATION TABLES
-- ========================================

-- CourseProgress Table - Enhanced course-level progress tracking
CREATE TABLE dbo.CourseProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    OverallProgress INT NOT NULL DEFAULT 0 CHECK (OverallProgress >= 0 AND OverallProgress <= 100),
    CompletedLessons NVARCHAR(MAX) NULL, -- JSON array of lesson IDs
    TimeSpent INT NOT NULL DEFAULT 0, -- in minutes
    LastAccessedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, CourseId)
);

-- LearningActivities Table - Track user learning patterns for AI analysis
CREATE TABLE dbo.LearningActivities (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    ActivityType NVARCHAR(50) NOT NULL CHECK (ActivityType IN ('assessment', 'lesson_view', 'video_watch', 'resource_download', 'discussion_post', 'quiz_attempt', 'assignment_submit')),
    ResourceId UNIQUEIDENTIFIER NULL, -- Can reference Lessons, Assessments, etc.
    TimeSpent INT NOT NULL DEFAULT 0, -- in seconds
    Score DECIMAL(5,2) NULL, -- for assessments
    AccuracyRate DECIMAL(5,2) NULL, -- percentage
    CompletionRate DECIMAL(5,2) NULL, -- percentage
    AttentionScore DECIMAL(5,2) NULL, -- AI-calculated attention score
    InteractionCount INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- StudentRecommendations Table - AI-powered personalized learning recommendations
CREATE TABLE dbo.StudentRecommendations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    RecommendationType NVARCHAR(50) NOT NULL CHECK (RecommendationType IN ('content', 'skill', 'pace', 'intervention', 'path')),
    Priority NVARCHAR(20) NOT NULL CHECK (Priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    ActionItems NVARCHAR(MAX) NULL, -- JSON array of actions
    ResourceLinks NVARCHAR(MAX) NULL, -- JSON array of links
    TargetSkills NVARCHAR(MAX) NULL, -- JSON array of skills
    EstimatedTime INT NULL, -- in minutes
    ConfidenceScore DECIMAL(5,2) NULL, -- AI confidence in recommendation
    IsActive BIT NOT NULL DEFAULT 1,
    IsCompleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL
);

-- StudentRiskAssessment Table - Early intervention system for at-risk students
CREATE TABLE dbo.StudentRiskAssessment (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    RiskLevel NVARCHAR(20) NOT NULL CHECK (RiskLevel IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
    RiskScore DECIMAL(5,2) NOT NULL DEFAULT 0, -- 0-100 scale
    RiskFactors NVARCHAR(MAX) NULL, -- JSON array of risk factors
    PredictedOutcome NVARCHAR(50) NULL,
    RecommendedInterventions NVARCHAR(MAX) NULL, -- JSON array of interventions
    LastUpdated DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- PeerComparison Table - Student performance benchmarking for motivation
CREATE TABLE dbo.PeerComparison (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    MetricType NVARCHAR(50) NOT NULL CHECK (MetricType IN ('score', 'completion_rate', 'time_spent', 'engagement')),
    UserValue DECIMAL(10,2) NOT NULL,
    PeerAverage DECIMAL(10,2) NOT NULL,
    PeerMedian DECIMAL(10,2) NOT NULL,
    Percentile INT NOT NULL CHECK (Percentile >= 0 AND Percentile <= 100),
    SampleSize INT NOT NULL DEFAULT 0,
    CalculatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Bookmarks Table - Course bookmarking system
CREATE TABLE dbo.Bookmarks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    BookmarkedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Notes NVARCHAR(500) NULL, -- Optional user notes
    UNIQUE(UserId, CourseId) -- Prevent duplicate bookmarks
);

-- Notifications Table - Real-time notification system for progress tracking and intervention alerts
CREATE TABLE dbo.Notifications (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Type NVARCHAR(50) NOT NULL, -- 'progress', 'risk', 'achievement', 'intervention', 'assignment', 'course'
    Priority NVARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (Priority IN ('low', 'normal', 'high', 'urgent')),
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    Data NVARCHAR(MAX) NULL, -- JSON data for additional context
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ReadAt DATETIME2 NULL,
    ExpiresAt DATETIME2 NULL, -- Optional expiration for temporary notifications
    ActionUrl NVARCHAR(500) NULL, -- Deep link to relevant page
    ActionText NVARCHAR(100) NULL, -- Button text for action
    RelatedEntityId UNIQUEIDENTIFIER NULL, -- Course, Lesson, Assessment ID etc
    RelatedEntityType NVARCHAR(50) NULL -- 'course', 'lesson', 'assessment', 'student'
);

-- NotificationPreferences Table - User preferences for notification delivery
CREATE TABLE dbo.NotificationPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    EnableProgressNotifications BIT NOT NULL DEFAULT 1,
    EnableRiskAlerts BIT NOT NULL DEFAULT 1,
    EnableAchievementNotifications BIT NOT NULL DEFAULT 1,
    EnableCourseUpdates BIT NOT NULL DEFAULT 1,
    EnableAssignmentReminders BIT NOT NULL DEFAULT 1,
    EnableEmailNotifications BIT NOT NULL DEFAULT 1,
    EmailDigestFrequency NVARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (EmailDigestFrequency IN ('none', 'realtime', 'daily', 'weekly')),
    QuietHoursStart TIME NULL, -- e.g., 22:00:00
    QuietHoursEnd TIME NULL, -- e.g., 08:00:00
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- VIDEO LESSON SYSTEM
-- ========================================

-- VideoLessons Table - Stores video content associated with lessons
CREATE TABLE dbo.VideoLessons (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    VideoURL NVARCHAR(1000) NOT NULL, -- Path to video file or external URL
    Duration INT NOT NULL DEFAULT 0, -- Video duration in seconds
    Thumbnail NVARCHAR(500) NULL, -- Video thumbnail/poster image
    TranscriptURL NVARCHAR(1000) NULL, -- Path to VTT/SRT transcript file
    TranscriptText NVARCHAR(MAX) NULL, -- Full transcript text for search/display
    VideoMetadata NVARCHAR(MAX) NULL, -- JSON: {quality, format, size, resolution, codec, bitrate}
    ProcessingStatus NVARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (ProcessingStatus IN ('processing', 'ready', 'failed')),
    FileSize BIGINT NULL, -- File size in bytes
    UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- VideoProgress Table - Tracks individual user progress on video lessons
CREATE TABLE dbo.VideoProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    VideoLessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.VideoLessons(Id) ON DELETE CASCADE,
    WatchedDuration INT NOT NULL DEFAULT 0, -- Total seconds watched (including rewatches)
    LastPosition INT NOT NULL DEFAULT 0, -- Last playback position in seconds
    CompletionPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- Percentage of video watched
    IsCompleted BIT NOT NULL DEFAULT 0, -- Marked complete when >= 90% watched
    PlaybackSpeed DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- User's preferred playback speed
    LastWatchedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, VideoLessonId)
);

-- VideoAnalytics Table - Detailed viewing analytics for instructors
CREATE TABLE dbo.VideoAnalytics (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    VideoLessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.VideoLessons(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    SessionId UNIQUEIDENTIFIER NOT NULL, -- Unique per viewing session
    EventType NVARCHAR(20) NOT NULL CHECK (EventType IN ('play', 'pause', 'seek', 'complete', 'speed_change', 'quality_change')),
    Timestamp INT NOT NULL, -- Position in video when event occurred (seconds)
    EventData NVARCHAR(MAX) NULL, -- JSON with additional event details
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Performance Indexes
CREATE NONCLUSTERED INDEX IX_CourseProgress_UserId_CourseId ON dbo.CourseProgress (UserId, CourseId);
CREATE NONCLUSTERED INDEX IX_LearningActivities_UserId_CreatedAt ON dbo.LearningActivities (UserId, CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_LearningActivities_CourseId_ActivityType ON dbo.LearningActivities (CourseId, ActivityType);
CREATE NONCLUSTERED INDEX IX_StudentRecommendations_UserId_IsActive ON dbo.StudentRecommendations (UserId, IsActive);
CREATE NONCLUSTERED INDEX IX_StudentRiskAssessment_UserId_RiskLevel ON dbo.StudentRiskAssessment (UserId, RiskLevel);
CREATE NONCLUSTERED INDEX IX_PeerComparison_UserId_CourseId ON dbo.PeerComparison (UserId, CourseId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_UserId ON dbo.Bookmarks(UserId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_CourseId ON dbo.Bookmarks(CourseId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_BookmarkedAt ON dbo.Bookmarks(BookmarkedAt);
CREATE NONCLUSTERED INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
CREATE NONCLUSTERED INDEX IX_Notifications_IsRead ON dbo.Notifications(IsRead);
CREATE NONCLUSTERED INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Notifications_Type ON dbo.Notifications(Type);
CREATE NONCLUSTERED INDEX IX_Notifications_Priority ON dbo.Notifications(Priority);
CREATE NONCLUSTERED INDEX IX_NotificationPreferences_UserId ON dbo.NotificationPreferences(UserId);
CREATE NONCLUSTERED INDEX IX_VideoLessons_LessonId ON dbo.VideoLessons(LessonId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_UserId ON dbo.VideoProgress(UserId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_VideoLessonId ON dbo.VideoProgress(VideoLessonId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_IsCompleted ON dbo.VideoProgress(IsCompleted);
CREATE NONCLUSTERED INDEX IX_VideoAnalytics_VideoLessonId ON dbo.VideoAnalytics(VideoLessonId);
CREATE NONCLUSTERED INDEX IX_VideoAnalytics_UserId ON dbo.VideoAnalytics(UserId);
CREATE NONCLUSTERED INDEX IX_VideoAnalytics_SessionId ON dbo.VideoAnalytics(SessionId);

-- ========================================
-- ========================================
-- SCHEMA CREATION COMPLETE
-- ========================================

PRINT '✅ Mishin Learn Database Schema created successfully!';
PRINT '📊 Core Tables: Users, Courses, Lessons, Enrollments, UserProgress, Resources, Assessments, Questions, AssessmentSubmissions';
PRINT '📊 Communication: LiveSessions, LiveSessionAttendees, ChatRooms, ChatMessages, TutoringSessions, TutoringMessages';
PRINT '🧠 AI Progress Integration: CourseProgress, LearningActivities, StudentRecommendations, StudentRiskAssessment, PeerComparison';
PRINT '📚 User Features: Bookmarks, FileUploads';
PRINT '🔔 Real-time Notifications: Notifications, NotificationPreferences';
PRINT '🎥 Video Lesson System: VideoLessons, VideoProgress, VideoAnalytics';
PRINT '🚀 Database is ready for Mishin Learn Platform!';