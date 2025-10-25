-- Mishin Learn Platform Database Schema - Production Version
-- SQL Server Database: startUp1
-- NO SAMPLE DATA - Production Ready

USE [startUp1]
GO

PRINT '🔄 Starting database recreation...';
PRINT '⚠️  This will DROP all existing tables. Ensure you have a backup!';
PRINT '';

-- Drop tables if they exist (for fresh setup)
-- Video System
IF OBJECT_ID('dbo.VideoAnalytics', 'U') IS NOT NULL DROP TABLE dbo.VideoAnalytics;
IF OBJECT_ID('dbo.VideoProgress', 'U') IS NOT NULL DROP TABLE dbo.VideoProgress;
IF OBJECT_ID('dbo.VideoLessons', 'U') IS NOT NULL DROP TABLE dbo.VideoLessons;
-- File System
IF OBJECT_ID('dbo.FileUploads', 'U') IS NOT NULL DROP TABLE dbo.FileUploads;
-- Notification System
IF OBJECT_ID('dbo.NotificationPreferences', 'U') IS NOT NULL DROP TABLE dbo.NotificationPreferences;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
-- Tutoring/Chat System
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

PRINT '✅ Old tables dropped';
PRINT '';

-- ========================================
-- CORE TABLES
-- ========================================

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
    PreferencesJson NVARCHAR(MAX) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    EmailVerified BIT NOT NULL DEFAULT 0,
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
    Category NVARCHAR(30) NOT NULL CHECK (Category IN ('programming', 'data_science', 'design', 'business', 'language', 'mathematics', 'science', 'arts', 'other')),
    Level NVARCHAR(20) NOT NULL CHECK (Level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    Duration INT NOT NULL DEFAULT 0,
    Price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    EnrollmentCount INT NOT NULL DEFAULT 0,
    Prerequisites NVARCHAR(MAX) NULL,
    LearningOutcomes NVARCHAR(MAX) NULL,
    Tags NVARCHAR(MAX) NULL,
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
    ContentJson NVARCHAR(MAX) NOT NULL,
    OrderIndex INT NOT NULL,
    Duration INT NOT NULL DEFAULT 0,
    IsRequired BIT NOT NULL DEFAULT 1,
    Prerequisites NVARCHAR(MAX) NULL,
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
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    Status NVARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (Status IN ('not_started', 'in_progress', 'completed')),
    ProgressPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    LastAccessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    TimeSpent INT NOT NULL DEFAULT 0,
    NotesJson NVARCHAR(MAX) NULL,
    UNIQUE(UserId, LessonId)
);

-- Resources Table
CREATE TABLE dbo.Resources (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('document', 'video', 'link', 'code', 'other')),
    Title NVARCHAR(200) NOT NULL,
    URL NVARCHAR(1000) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    OrderIndex INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- ASSESSMENT SYSTEM
-- ========================================

-- Assessments Table
CREATE TABLE dbo.Assessments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('quiz', 'test', 'assignment', 'practical')),
    Difficulty NVARCHAR(20) NOT NULL CHECK (Difficulty IN ('easy', 'medium', 'hard')),
    TimeLimit INT NULL,
    PassingScore DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    MaxAttempts INT NULL,
    IsAdaptive BIT NOT NULL DEFAULT 0,
    IsPublished BIT NOT NULL DEFAULT 0,
    IsPreview BIT NOT NULL DEFAULT 0,
    OrderIndex INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Questions Table
CREATE TABLE dbo.Questions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    AssessmentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Assessments(Id) ON DELETE CASCADE,
    QuestionText NVARCHAR(MAX) NOT NULL,
    QuestionType NVARCHAR(20) NOT NULL CHECK (QuestionType IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'code', 'drag_drop', 'fill_blank')),
    Options NVARCHAR(MAX) NULL,
    CorrectAnswer NVARCHAR(MAX) NOT NULL,
    Explanation NVARCHAR(MAX) NULL,
    Points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    Difficulty NVARCHAR(20) NULL CHECK (Difficulty IN ('easy', 'medium', 'hard')),
    OrderIndex INT NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Assessment Submissions Table
CREATE TABLE dbo.AssessmentSubmissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    AssessmentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Assessments(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    Answers NVARCHAR(MAX) NOT NULL,
    Score DECIMAL(5,2) NOT NULL,
    MaxScore DECIMAL(5,2) NOT NULL,
    Passed BIT NOT NULL DEFAULT 0,
    TimeSpent INT NULL,
    AttemptNumber INT NOT NULL DEFAULT 1,
    Feedback NVARCHAR(MAX) NULL,
    AIFeedback NVARCHAR(MAX) NULL,
    CompletedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- STUDENT PROGRESS INTEGRATION SYSTEM
-- ========================================

-- Course Progress Table
CREATE TABLE dbo.CourseProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    ProgressPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    CompletedLessons INT NOT NULL DEFAULT 0,
    TotalLessons INT NOT NULL DEFAULT 0,
    CurrentStreak INT NOT NULL DEFAULT 0,
    LongestStreak INT NOT NULL DEFAULT 0,
    LastAccessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EstimatedCompletionDate DATETIME2 NULL,
    LearningVelocity DECIMAL(5,2) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, CourseId)
);

-- Learning Activities Table
CREATE TABLE dbo.LearningActivities (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    ActivityType NVARCHAR(50) NOT NULL CHECK (ActivityType IN ('lesson_completed', 'assessment_passed', 'assessment_failed', 'video_watched', 'resource_accessed', 'note_taken', 'bookmark_added', 'login', 'achievement_earned')),
    ActivityData NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Student Recommendations Table
CREATE TABLE dbo.StudentRecommendations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    RecommendationType NVARCHAR(50) NOT NULL CHECK (RecommendationType IN ('next_lesson', 'review_topic', 'take_break', 'practice_more', 'speed_up', 'slow_down', 'seek_help', 'course_suggestion')),
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (Priority IN ('low', 'medium', 'high', 'urgent')),
    RelatedCourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    RelatedLessonId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Lessons(Id),
    IsActive BIT NOT NULL DEFAULT 1,
    IsCompleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL
);

-- Student Risk Assessment Table
CREATE TABLE dbo.StudentRiskAssessment (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    RiskLevel NVARCHAR(20) NOT NULL CHECK (RiskLevel IN ('low', 'medium', 'high', 'critical')),
    RiskFactors NVARCHAR(MAX) NOT NULL,
    RecommendedActions NVARCHAR(MAX) NOT NULL,
    LastAssessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Peer Comparison Table
CREATE TABLE dbo.PeerComparison (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    UserPercentile DECIMAL(5,2) NOT NULL,
    AverageProgress DECIMAL(5,2) NOT NULL,
    TopPerformerProgress DECIMAL(5,2) NOT NULL,
    ComparisonData NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, CourseId)
);

-- ========================================
-- BOOKMARKS SYSTEM
-- ========================================

CREATE TABLE dbo.Bookmarks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Notes NVARCHAR(MAX) NULL,
    BookmarkedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, CourseId)
);

-- ========================================
-- COMMUNICATION SYSTEM
-- ========================================

-- Live Sessions Table
CREATE TABLE dbo.LiveSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    ScheduledAt DATETIME2 NOT NULL,
    Duration INT NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (Status IN ('scheduled', 'live', 'ended', 'cancelled')),
    MeetingLink NVARCHAR(500) NULL,
    RecordingLink NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Live Session Attendees Table
CREATE TABLE dbo.LiveSessionAttendees (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.LiveSessions(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    JoinedAt DATETIME2 NULL,
    LeftAt DATETIME2 NULL,
    AttendanceStatus NVARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (AttendanceStatus IN ('registered', 'attended', 'missed')),
    UNIQUE(SessionId, UserId)
);

-- Chat Rooms Table
CREATE TABLE dbo.ChatRooms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    Name NVARCHAR(200) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('course', 'direct', 'group')),
    CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Messages Table
CREATE TABLE dbo.ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatRooms(Id) ON DELETE CASCADE,
    SenderId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    Message NVARCHAR(MAX) NOT NULL,
    MessageType NVARCHAR(20) NOT NULL DEFAULT 'text' CHECK (MessageType IN ('text', 'file', 'code', 'system')),
    Metadata NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- AI TUTORING SYSTEM
-- ========================================

-- Tutoring Sessions Table
CREATE TABLE dbo.TutoringSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    LessonId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Lessons(Id),
    Title NVARCHAR(200) NOT NULL,
    Context NVARCHAR(MAX) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (Status IN ('active', 'closed')),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Tutoring Messages Table
CREATE TABLE dbo.TutoringMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SessionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.TutoringSessions(Id) ON DELETE CASCADE,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('user', 'assistant', 'system')),
    Content NVARCHAR(MAX) NOT NULL,
    Metadata NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- FILE UPLOAD SYSTEM
-- ========================================

CREATE TABLE dbo.FileUploads (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    FileName NVARCHAR(255) NOT NULL,
    FilePath NVARCHAR(1000) NOT NULL,
    FileType NVARCHAR(50) NOT NULL,
    FileSize BIGINT NOT NULL,
    MimeType NVARCHAR(100) NULL,
    RelatedEntityType NVARCHAR(50) NULL,
    RelatedEntityId UNIQUEIDENTIFIER NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- NOTIFICATION SYSTEM
-- ========================================

-- Notifications Table
CREATE TABLE dbo.Notifications (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('progress_milestone', 'at_risk_alert', 'achievement', 'course_update', 'assignment_reminder', 'assessment_graded', 'new_message', 'system')),
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (Priority IN ('low', 'medium', 'high', 'urgent')),
    IsRead BIT NOT NULL DEFAULT 0,
    ActionUrl NVARCHAR(500) NULL,
    Metadata NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ReadAt DATETIME2 NULL
);

-- NotificationPreferences Table
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
    QuietHoursStart TIME NULL,
    QuietHoursEnd TIME NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- VIDEO LESSON SYSTEM
-- ========================================

-- VideoLessons Table
CREATE TABLE dbo.VideoLessons (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    LessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE CASCADE,
    VideoURL NVARCHAR(1000) NOT NULL,
    Duration INT NOT NULL DEFAULT 0,
    Thumbnail NVARCHAR(500) NULL,
    TranscriptURL NVARCHAR(1000) NULL,
    TranscriptText NVARCHAR(MAX) NULL,
    VideoMetadata NVARCHAR(MAX) NULL,
    ProcessingStatus NVARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (ProcessingStatus IN ('processing', 'ready', 'failed')),
    FileSize BIGINT NULL,
    UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- VideoProgress Table
CREATE TABLE dbo.VideoProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    VideoLessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.VideoLessons(Id) ON DELETE CASCADE,
    WatchedDuration INT NOT NULL DEFAULT 0,
    LastPosition INT NOT NULL DEFAULT 0,
    CompletionPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    IsCompleted BIT NOT NULL DEFAULT 0,
    PlaybackSpeed DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    LastWatchedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(UserId, VideoLessonId)
);

-- VideoAnalytics Table
CREATE TABLE dbo.VideoAnalytics (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    VideoLessonId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.VideoLessons(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    SessionId UNIQUEIDENTIFIER NOT NULL,
    EventType NVARCHAR(20) NOT NULL CHECK (EventType IN ('play', 'pause', 'seek', 'complete', 'speed_change', 'quality_change')),
    Timestamp INT NOT NULL,
    EventData NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================

PRINT '📝 Creating indexes...';

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

PRINT '';
PRINT '✅ Mishin Learn Database Schema created successfully!';
PRINT '📊 Core Tables: Users, Courses, Lessons, Enrollments, UserProgress, Resources, Assessments, Questions, AssessmentSubmissions';
PRINT '📊 Communication: LiveSessions, LiveSessionAttendees, ChatRooms, ChatMessages, TutoringSessions, TutoringMessages';
PRINT '🧠 AI Progress Integration: CourseProgress, LearningActivities, StudentRecommendations, StudentRiskAssessment, PeerComparison';
PRINT '📚 User Features: Bookmarks, FileUploads';
PRINT '🔔 Real-time Notifications: Notifications, NotificationPreferences';
PRINT '🎥 Video Lesson System: VideoLessons, VideoProgress, VideoAnalytics';
PRINT '';
PRINT '⚠️  NO SAMPLE DATA INSERTED - Production Ready';
PRINT '🚀 Database is ready for Mishin Learn Platform!';
