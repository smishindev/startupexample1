-- Mishin Learn Platform Database Schema
-- SQL Server Database: startUp1

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'startUp1')
BEGIN
    CREATE DATABASE [startUp1];
    PRINT '✅ Database [startUp1] created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ Database [startUp1] already exists';
END
GO

USE [startUp1]
GO

-- Drop tables if they exist (for fresh setup)
IF OBJECT_ID('dbo.VideoProgress', 'U') IS NOT NULL DROP TABLE dbo.VideoProgress;
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
-- Comments System Tables
IF OBJECT_ID('dbo.CommentLikes', 'U') IS NOT NULL DROP TABLE dbo.CommentLikes;
IF OBJECT_ID('dbo.Comments', 'U') IS NOT NULL DROP TABLE dbo.Comments;
-- Certificate Tables
IF OBJECT_ID('dbo.Certificates', 'U') IS NOT NULL DROP TABLE dbo.Certificates;
-- Payment System Tables
IF OBJECT_ID('dbo.Invoices', 'U') IS NOT NULL DROP TABLE dbo.Invoices;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DROP TABLE dbo.Transactions;
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
    EmailVerificationCode NVARCHAR(10) NULL, -- Email verification code (6-digit)
    EmailVerificationExpiry DATETIME2 NULL, -- Expiry time for email verification (24 hours)
    PasswordResetToken NVARCHAR(10) NULL, -- For password reset functionality
    PasswordResetExpiry DATETIME2 NULL, -- Expiry time for reset token
    -- Billing Address Fields
    BillingStreetAddress NVARCHAR(255) NULL,
    BillingCity NVARCHAR(100) NULL,
    BillingState NVARCHAR(100) NULL,
    BillingPostalCode NVARCHAR(20) NULL,
    BillingCountry NVARCHAR(100) NULL,
    -- Stripe Integration
    StripeCustomerId NVARCHAR(255) NULL,
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
    InstructorId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    Category NVARCHAR(30) NOT NULL CHECK (Category IN ('programming', 'data_science', 'design', 'business', 'marketing', 'language', 'mathematics', 'science', 'arts', 'other')),
    Level NVARCHAR(20) NOT NULL CHECK (Level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    Duration INT NOT NULL DEFAULT 0, -- in minutes
    Price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    Rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    EnrollmentCount INT NOT NULL DEFAULT 0,
    Prerequisites NVARCHAR(MAX) NULL, -- JSON array
    LearningOutcomes NVARCHAR(MAX) NULL, -- JSON array
    Tags NVARCHAR(MAX) NULL, -- JSON array
    IsPublished BIT NOT NULL DEFAULT 0, -- Kept for backward compatibility
    Status NVARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (Status IN ('draft', 'published', 'archived', 'deleted')),
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    EnrolledAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (Status IN ('active', 'completed', 'suspended', 'cancelled')),
    UNIQUE(UserId, CourseId)
);

-- User Progress Table
CREATE TABLE dbo.UserProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    DueDate DATETIME2 NULL, -- Optional due date for assignments
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    InstructorId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Users(Id),
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    CreatedBy UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Messages Table
CREATE TABLE dbo.ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatRooms(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Content NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(20) NOT NULL DEFAULT 'text' CHECK (Type IN ('text', 'image', 'file', 'code', 'system', 'announcement')),
    ReplyTo UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.ChatMessages(Id),
    Reactions NVARCHAR(MAX) NULL, -- JSON array of reaction objects
    IsEdited BIT NOT NULL DEFAULT 0,
    EditedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- =============================================
-- Phase 2: Collaborative Features Tables
-- =============================================

-- User Presence Table
-- User Presence Table - Real-time user online/offline status tracking
-- Used for: Online users page, presence indicators, activity tracking
-- Status values: 'online' (active), 'offline' (disconnected), 'away' (idle), 'busy' (do not disturb)
-- Default 'online' for better UX - new users ARE actively using platform (changed Jan 17, 2026)
CREATE TABLE dbo.UserPresence (
    UserId UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Status NVARCHAR(20) NOT NULL DEFAULT 'online' CHECK (Status IN ('online', 'offline', 'away', 'busy')),
    Activity NVARCHAR(100) NULL, -- "Viewing Course: JavaScript", "In Live Session", etc.
    LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Study Groups Table
CREATE TABLE dbo.StudyGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE SET NULL,
    CreatedBy UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    IsActive BIT NOT NULL DEFAULT 1,
    MaxMembers INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Study Group Members Table
CREATE TABLE dbo.StudyGroupMembers (
    GroupId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.StudyGroups(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Role NVARCHAR(20) NOT NULL DEFAULT 'member' CHECK (Role IN ('admin', 'member')),
    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    PRIMARY KEY (GroupId, UserId)
);

-- Office Hours Table
CREATE TABLE dbo.OfficeHours (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    InstructorId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    DayOfWeek INT NOT NULL CHECK (DayOfWeek BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Office Hours Queue Table
CREATE TABLE dbo.OfficeHoursQueue (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    InstructorId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    StudentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    ScheduleId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.OfficeHours(Id),
    Status NVARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (Status IN ('waiting', 'admitted', 'completed', 'cancelled')),
    Question NVARCHAR(500) NULL,
    JoinedQueueAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    AdmittedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL
);

-- Tutoring Sessions Table
CREATE TABLE dbo.TutoringSessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UploadedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
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
    ActionUrl NVARCHAR(500) NULL, -- Deep link to relevant page (used in NotificationsPage for click-to-navigate)
    ActionText NVARCHAR(100) NULL, -- Button text for action
    RelatedEntityId UNIQUEIDENTIFIER NULL, -- Course, Lesson, Assessment ID etc
    RelatedEntityType NVARCHAR(50) NULL -- 'course', 'lesson', 'assessment', 'student'
);
-- NOTIFICATIONS CENTER STATUS (Dec 22, 2025):
--   ✅ NotificationsPage (/notifications): Full-page management with pagination, filtering
--   ✅ NotificationBell: Enhanced dropdown with unread + queued count badges
--   ✅ Real-time updates: 4 socket events (created, read, read-all, deleted)
--   ✅ Server-side filtering: type, priority, limit, offset
--   ✅ Client pagination: 20 items/page with MUI Pagination
--   ✅ Click-to-navigate: ActionUrl navigation on notification click
--   ✅ Settings shortcut: Button linking to /settings
--   ✅ Cross-tab sync: Delete/read syncs across all tabs
--   ✅ Date handling: UTC storage, ISO format, formatDistanceToNow display

-- NotificationPreferences Table - User preferences for notification delivery
-- IMPLEMENTATION STATUS (Jan 21, 2026):
--   ✅ Database table created with 70 columns (GroupActivity added Jan 21)
--   ✅ UI fully implemented (/settings/notifications dedicated page with 734 lines)
--   ✅ API endpoints working (GET/PATCH /api/notifications/preferences)
--   ✅ Preferences FULLY ENFORCED with quiet hours queueing and type filtering
--   ✅ NotificationQueue table with cron job processing every 5 minutes
--   ✅ Quiet hours: Notifications queued during specified time range
--   ✅ HYBRID CONTROL SYSTEM: Global + Category (5) + Subcategory (54) toggles
--   ✅ Separate In-App and Email controls for granular user experience
--   ✅ 70 columns total: 2 identity, 5 global, 5 categories, 54 subcategories, 4 metadata
--   ✅ All interfaces aligned (backend/frontend/API) with PascalCase consistency
--   ✅ Settings persist correctly across sessions (bug fixed Dec 29, 2025)
--   ✅ SELECT query bugs fixed Jan 17 - all 3 queries now include new fields
CREATE TABLE dbo.NotificationPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    
    -- Global Controls
    EnableInAppNotifications BIT NOT NULL DEFAULT 1,
    EnableEmailNotifications BIT NOT NULL DEFAULT 1,
    EmailDigestFrequency NVARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (EmailDigestFrequency IN ('none', 'realtime', 'daily', 'weekly')),
    QuietHoursStart TIME NULL, -- e.g., 22:00:00
    QuietHoursEnd TIME NULL, -- e.g., 08:00:00
    
    -- Category Controls (5 main categories)
    EnableProgressUpdates BIT NOT NULL DEFAULT 1,
    EnableCourseUpdates BIT NOT NULL DEFAULT 1,
    EnableAssessmentUpdates BIT NOT NULL DEFAULT 1,
    EnableCommunityUpdates BIT NOT NULL DEFAULT 1,
    EnableSystemAlerts BIT NOT NULL DEFAULT 1,
    
    -- Progress Updates Subcategories (NULL = inherit from category)
    EnableLessonCompletion BIT NULL,
    EnableVideoCompletion BIT NULL,
    EnableCourseMilestones BIT NULL,
    EnableCourseCompletion BIT NULL,
    EnableProgressSummary BIT NULL,
    EmailLessonCompletion BIT NULL,
    EmailVideoCompletion BIT NULL,
    EmailCourseMilestones BIT NULL,
    EmailCourseCompletion BIT NULL,
    EmailProgressSummary BIT NULL,
    
    -- Course Updates Subcategories
    EnableCourseEnrollment BIT NULL,
    EnableNewLessons BIT NULL,
    EnableLiveSessions BIT NULL,
    EnableCoursePublished BIT NULL,
    EnableInstructorAnnouncements BIT NULL,
    EmailCourseEnrollment BIT NULL,
    EmailNewLessons BIT NULL,
    EmailLiveSessions BIT NULL,
    EmailCoursePublished BIT NULL,
    EmailInstructorAnnouncements BIT NULL,
    
    -- Assessment Updates Subcategories
    EnableAssessmentSubmitted BIT NULL,
    EnableAssessmentGraded BIT NULL,
    EnableNewAssessment BIT NULL,
    EnableAssessmentDue BIT NULL,
    EnableSubmissionToGrade BIT NULL,
    EmailAssessmentSubmitted BIT NULL,
    EmailAssessmentGraded BIT NULL,
    EmailNewAssessment BIT NULL,
    EmailAssessmentDue BIT NULL,
    EmailSubmissionToGrade BIT NULL,
    
    -- Community Updates Subcategories
    EnableComments BIT NULL,
    EnableReplies BIT NULL,
    EnableMentions BIT NULL,
    EnableGroupInvites BIT NULL,
    EnableGroupActivity BIT NULL,
    EnableOfficeHours BIT NULL,
    EmailComments BIT NULL,
    EmailReplies BIT NULL,
    EmailMentions BIT NULL,
    EmailGroupInvites BIT NULL,
    EmailGroupActivity BIT NULL,
    EmailOfficeHours BIT NULL,
    
    -- System Alerts Subcategories
    EnablePaymentConfirmation BIT NULL,
    EnablePaymentReceipt BIT NULL,
    EnableRefundConfirmation BIT NULL,
    EnableCertificates BIT NULL,
    EnableSecurityAlerts BIT NULL,
    EnableProfileUpdates BIT NULL,
    EmailPaymentConfirmation BIT NULL,
    EmailPaymentReceipt BIT NULL,
    EmailRefundConfirmation BIT NULL,
    EmailCertificates BIT NULL,
    EmailSecurityAlerts BIT NULL,
    EmailProfileUpdates BIT NULL,
    
    -- Learning Subcategories (AI Tutoring, etc.)
    EnableAITutoring BIT NULL,
    EmailAITutoring BIT NULL,
    
    -- System Alerts - At-Risk Students (Instructor notifications)
    EnableRiskAlerts BIT NULL,
    EmailRiskAlerts BIT NULL,
    
    -- Email Unsubscribe Tracking
    UnsubscribedAt DATETIME2 NULL,
    UnsubscribeReason NVARCHAR(500) NULL,
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ========================================
-- VIDEO PROGRESS SYSTEM
-- Multi-content progress tracking via ContentItemId
-- Tracks progress for videos, text, quizzes in Lessons.ContentJson
-- ========================================

-- VideoProgress Table - Tracks progress for ALL content types (video, text, quiz)
-- Uses ContentItemId format: {lessonId}-{type}-{index}
CREATE TABLE dbo.VideoProgress (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    ContentItemId NVARCHAR(100) NOT NULL, -- Format: {lessonId}-{type}-{index}
    WatchedDuration INT NOT NULL DEFAULT 0,
    LastPosition INT NOT NULL DEFAULT 0,
    CompletionPercentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    IsCompleted BIT NOT NULL DEFAULT 0,
    PlaybackSpeed DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    LastWatchedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_VideoProgress_ContentItem UNIQUE (UserId, ContentItemId)
);

-- Performance Indexes
CREATE NONCLUSTERED INDEX IX_CourseProgress_UserId_CourseId ON dbo.CourseProgress (UserId, CourseId);
CREATE NONCLUSTERED INDEX IX_LearningActivities_UserId_CreatedAt ON dbo.LearningActivities (UserId, CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_LearningActivities_CourseId_ActivityType ON dbo.LearningActivities (CourseId, ActivityType);
CREATE NONCLUSTERED INDEX IX_StudentRecommendations_UserId_IsActive ON dbo.StudentRecommendations (UserId, IsActive);
CREATE NONCLUSTERED INDEX IX_StudentRiskAssessment_UserId_RiskLevel ON dbo.StudentRiskAssessment (UserId, RiskLevel);
CREATE NONCLUSTERED INDEX IX_StudentRiskAssessment_RiskLevel_CourseId ON dbo.StudentRiskAssessment (RiskLevel, CourseId) WHERE RiskLevel IN ('medium', 'high', 'critical');
CREATE NONCLUSTERED INDEX IX_PeerComparison_UserId_CourseId ON dbo.PeerComparison (UserId, CourseId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_UserId ON dbo.Bookmarks(UserId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_CourseId ON dbo.Bookmarks(CourseId);
CREATE NONCLUSTERED INDEX IX_Bookmarks_BookmarkedAt ON dbo.Bookmarks(BookmarkedAt);

-- ========================================
-- Comments System Tables (Generic for any entity)
-- ========================================
-- Comments Table (entity-agnostic: lessons, courses, assignments, study_groups, announcements)
CREATE TABLE dbo.Comments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    
    -- Entity linking (flexible for lessons, courses, assignments, study groups, etc.)
    EntityType NVARCHAR(50) NOT NULL CHECK (EntityType IN ('lesson', 'course', 'assignment', 'study_group', 'announcement')),
    EntityId UNIQUEIDENTIFIER NOT NULL,
    
    -- Content
    Content NVARCHAR(MAX) NOT NULL,
    
    -- Threading support (NULL = top-level comment, non-NULL = reply)
    ParentCommentId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Comments(Id) ON DELETE NO ACTION,
    
    -- Metrics (denormalized for performance)
    LikesCount INT NOT NULL DEFAULT 0,
    RepliesCount INT NOT NULL DEFAULT 0,
    
    -- Status flags
    IsEdited BIT NOT NULL DEFAULT 0,
    IsDeleted BIT NOT NULL DEFAULT 0, -- Soft delete to preserve thread integrity
    DeletedAt DATETIME2 NULL,
    DeletedBy UNIQUEIDENTIFIER NULL, -- Who deleted (user/instructor/admin)
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EditedAt DATETIME2 NULL
);

-- Comment Likes Table (who liked what)
CREATE TABLE dbo.CommentLikes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CommentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Comments(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL, -- No FK to avoid cascade path conflicts (Comments already cascades from Users)
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    -- Prevent duplicate likes
    CONSTRAINT UQ_CommentLikes_CommentUser UNIQUE (CommentId, UserId)
);

-- Comments System Performance Indexes
-- Primary query: Get all comments for an entity
CREATE NONCLUSTERED INDEX IX_Comments_EntityType_EntityId_CreatedAt 
ON dbo.Comments (EntityType, EntityId, CreatedAt DESC)
WHERE IsDeleted = 0;

-- Query: Get comments by user
CREATE NONCLUSTERED INDEX IX_Comments_UserId 
ON dbo.Comments (UserId)
INCLUDE (EntityType, EntityId, CreatedAt);

-- Query: Get replies for a comment
CREATE NONCLUSTERED INDEX IX_Comments_ParentCommentId 
ON dbo.Comments (ParentCommentId, CreatedAt DESC)
WHERE ParentCommentId IS NOT NULL AND IsDeleted = 0;

-- Query: Find soft-deleted comments (for moderation/recovery)
CREATE NONCLUSTERED INDEX IX_Comments_IsDeleted_DeletedAt 
ON dbo.Comments (IsDeleted, DeletedAt DESC)
WHERE IsDeleted = 1;

-- Query: Get likes by user (to check if user liked a comment)
CREATE NONCLUSTERED INDEX IX_CommentLikes_UserId 
ON dbo.CommentLikes (UserId, CommentId);

-- Query: Get likes for a comment
CREATE NONCLUSTERED INDEX IX_CommentLikes_CommentId 
ON dbo.CommentLikes (CommentId, CreatedAt DESC);

CREATE NONCLUSTERED INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
CREATE NONCLUSTERED INDEX IX_Notifications_IsRead ON dbo.Notifications(IsRead);
CREATE NONCLUSTERED INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Notifications_Type ON dbo.Notifications(Type);
CREATE NONCLUSTERED INDEX IX_Notifications_Priority ON dbo.Notifications(Priority);
CREATE NONCLUSTERED INDEX IX_NotificationPreferences_UserId ON dbo.NotificationPreferences(UserId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_UserId ON dbo.VideoProgress(UserId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_ContentItemId ON dbo.VideoProgress(ContentItemId);
CREATE NONCLUSTERED INDEX IX_VideoProgress_IsCompleted ON dbo.VideoProgress(IsCompleted);

-- ========================================
-- USER SETTINGS TABLE
-- ========================================

-- UserSettings Table
CREATE TABLE dbo.UserSettings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    
    -- Privacy Settings
    ProfileVisibility NVARCHAR(20) NOT NULL DEFAULT 'public' CHECK (ProfileVisibility IN ('public', 'private', 'friends')),
    ShowEmail BIT NOT NULL DEFAULT 1,
    ShowProgress BIT NOT NULL DEFAULT 1,
    AllowMessages BIT NOT NULL DEFAULT 1,
    
    -- Appearance Settings
    Theme NVARCHAR(20) NOT NULL DEFAULT 'light' CHECK (Theme IN ('light', 'dark', 'auto')),
    Language NVARCHAR(10) NOT NULL DEFAULT 'en' CHECK (Language IN ('en', 'es', 'fr', 'de', 'zh')),
    FontSize NVARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (FontSize IN ('small', 'medium', 'large')),
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- UserSettings Indexes
CREATE NONCLUSTERED INDEX IX_UserSettings_UserId ON dbo.UserSettings(UserId);

-- ========================================
-- NOTIFICATION QUEUE TABLE
-- ========================================

-- NotificationQueue Table (for quiet hours delivery)
CREATE TABLE dbo.NotificationQueue (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    
    -- Notification Details (same structure as Notifications table)
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('progress', 'risk', 'achievement', 'intervention', 'assignment', 'course')),
    Priority NVARCHAR(20) NOT NULL CHECK (Priority IN ('low', 'normal', 'high', 'urgent')),
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    Data NVARCHAR(MAX) NULL,
    ActionUrl NVARCHAR(500) NULL,
    ActionText NVARCHAR(100) NULL,
    RelatedEntityId UNIQUEIDENTIFIER NULL,
    RelatedEntityType NVARCHAR(50) NULL CHECK (RelatedEntityType IN ('course', 'lesson', 'assessment', 'student') OR RelatedEntityType IS NULL),
    ExpiresAt DATETIME2 NULL,
    
    -- Queue Management
    QueuedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    DeliveredAt DATETIME2 NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (Status IN ('queued', 'delivered', 'expired')),
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- NotificationQueue Indexes
CREATE NONCLUSTERED INDEX IX_NotificationQueue_UserId ON dbo.NotificationQueue(UserId);
CREATE NONCLUSTERED INDEX IX_NotificationQueue_Status ON dbo.NotificationQueue(Status) WHERE Status='queued';
CREATE NONCLUSTERED INDEX IX_NotificationQueue_QueuedAt ON dbo.NotificationQueue(QueuedAt);

-- EmailDigests Table (for daily/weekly digest delivery)
CREATE TABLE dbo.EmailDigests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    NotificationId UNIQUEIDENTIFIER NOT NULL,
    Frequency NVARCHAR(20) NOT NULL CHECK (Frequency IN ('daily', 'weekly')),
    ScheduledFor DATETIME2 NOT NULL,
    Sent BIT NOT NULL DEFAULT 0,
    SentAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    FOREIGN KEY (NotificationId) REFERENCES dbo.Notifications(Id) ON DELETE NO ACTION
);

-- EmailDigests Indexes
CREATE NONCLUSTERED INDEX IX_EmailDigests_UserId ON dbo.EmailDigests(UserId);
CREATE NONCLUSTERED INDEX IX_EmailDigests_Frequency_Sent ON dbo.EmailDigests(Frequency, Sent) INCLUDE (ScheduledFor, UserId);
CREATE NONCLUSTERED INDEX IX_EmailDigests_ScheduledFor ON dbo.EmailDigests(ScheduledFor) WHERE Sent = 0;

-- Email Tracking and Analytics Tables
CREATE TABLE dbo.EmailTrackingEvents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    EmailType NVARCHAR(50) NOT NULL,
    EventType NVARCHAR(20) NOT NULL CHECK (EventType IN ('sent', 'opened', 'clicked', 'bounced', 'failed')),
    NotificationId UNIQUEIDENTIFIER NULL,
    DigestId UNIQUEIDENTIFIER NULL,
    TrackingToken NVARCHAR(255) NOT NULL UNIQUE,
    ClickedUrl NVARCHAR(2000) NULL,
    BounceReason NVARCHAR(1000) NULL,
    UserAgent NVARCHAR(500) NULL,
    IpAddress NVARCHAR(50) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_UserId ON dbo.EmailTrackingEvents(UserId);
CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_TrackingToken ON dbo.EmailTrackingEvents(TrackingToken);
CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_EventType_CreatedAt ON dbo.EmailTrackingEvents(EventType, CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_NotificationId ON dbo.EmailTrackingEvents(NotificationId) WHERE NotificationId IS NOT NULL;

CREATE TABLE dbo.EmailUnsubscribeTokens (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Token NVARCHAR(255) NOT NULL UNIQUE,
    EmailType NVARCHAR(50) NULL,
    ExpiresAt DATETIME2 NULL,
    UsedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX IX_EmailUnsubscribeTokens_Token ON dbo.EmailUnsubscribeTokens(Token);
CREATE NONCLUSTERED INDEX IX_EmailUnsubscribeTokens_UserId ON dbo.EmailUnsubscribeTokens(UserId);

-- ========================================
-- PAYMENT SYSTEM TABLES
-- ========================================

-- Transactions Table
CREATE TABLE dbo.Transactions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id),
    Amount DECIMAL(10,2) NOT NULL,
    Currency NVARCHAR(3) NOT NULL DEFAULT 'USD',
    Status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Stripe Integration Fields
    StripePaymentIntentId NVARCHAR(255) NULL,
    StripeChargeId NVARCHAR(255) NULL,
    StripeCustomerId NVARCHAR(255) NULL,
    
    -- Payment Details
    PaymentMethod NVARCHAR(50) NOT NULL, -- 'card', 'bank_transfer', etc.
    PaymentMethodLast4 NVARCHAR(4) NULL, -- Last 4 digits of card
    PaymentMethodBrand NVARCHAR(20) NULL, -- 'visa', 'mastercard', etc.
    
    -- Refund Information
    RefundReason NVARCHAR(MAX) NULL,
    RefundAmount DECIMAL(10,2) NULL,
    
    -- Metadata
    Metadata NVARCHAR(MAX) NULL, -- JSON for additional data
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    RefundedAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Invoices Table
CREATE TABLE dbo.Invoices (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TransactionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Transactions(Id) ON DELETE CASCADE,
    
    -- Invoice Details
    InvoiceNumber NVARCHAR(50) NOT NULL UNIQUE,
    
    -- Amounts
    Amount DECIMAL(10,2) NOT NULL,
    TaxAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    TotalAmount DECIMAL(10,2) NOT NULL,
    
    -- Currency
    Currency NVARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Billing Information (snapshot at purchase time)
    BillingName NVARCHAR(200) NULL,
    BillingEmail NVARCHAR(255) NULL,
    BillingAddress NVARCHAR(MAX) NULL, -- JSON with full address
    
    -- Tax Information
    TaxRate DECIMAL(5,2) NULL, -- Tax percentage applied
    TaxId NVARCHAR(50) NULL, -- Customer's tax ID if provided
    
    -- PDF Storage
    PdfUrl NVARCHAR(500) NULL, -- Local file path for invoice PDF
    PdfPath NVARCHAR(500) NULL, -- File system path for invoice PDFs
    PdfGeneratedAt DATETIME2 NULL,
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Payment System Indexes
CREATE NONCLUSTERED INDEX IX_Transactions_UserId ON dbo.Transactions(UserId);
CREATE NONCLUSTERED INDEX IX_Transactions_CourseId ON dbo.Transactions(CourseId);
CREATE NONCLUSTERED INDEX IX_Transactions_Status ON dbo.Transactions(Status);
CREATE NONCLUSTERED INDEX IX_Transactions_CreatedAt ON dbo.Transactions(CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Transactions_StripePaymentIntentId ON dbo.Transactions(StripePaymentIntentId);

-- ⚡ CRITICAL: Filtered unique index to prevent duplicate pending transactions
-- Allows only ONE pending transaction per user/course combination
-- Multiple completed/failed transactions are allowed
CREATE UNIQUE NONCLUSTERED INDEX IX_Transactions_Unique_Pending 
ON dbo.Transactions (UserId, CourseId) 
WHERE Status = 'pending';

CREATE NONCLUSTERED INDEX IX_Invoices_TransactionId ON dbo.Invoices(TransactionId);
CREATE NONCLUSTERED INDEX IX_Invoices_InvoiceNumber ON dbo.Invoices(InvoiceNumber);
CREATE NONCLUSTERED INDEX IX_Invoices_CreatedAt ON dbo.Invoices(CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Users_StripeCustomerId ON dbo.Users(StripeCustomerId);

-- ========================================
-- CERTIFICATES TABLE - Course Completion
-- ========================================

-- Certificates Table - Track issued certificates when students complete courses
CREATE TABLE dbo.Certificates (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    
    -- Certificate Details
    CertificateNumber NVARCHAR(50) NOT NULL UNIQUE, -- e.g., "CERT-2026-ABC123"
    
    -- Student Information (snapshot at completion time)
    StudentName NVARCHAR(200) NOT NULL,
    StudentEmail NVARCHAR(255) NOT NULL,
    
    -- Course Information (snapshot at completion time)
    CourseTitle NVARCHAR(200) NOT NULL,
    InstructorName NVARCHAR(200) NOT NULL,
    
    -- Completion Details
    CompletionDate DATETIME2 NOT NULL,
    FinalScore DECIMAL(5,2) NULL, -- Average assessment score if applicable
    TotalHoursSpent INT NOT NULL DEFAULT 0, -- in minutes
    
    -- Certificate Status
    Status NVARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (Status IN ('issued', 'revoked')),
    RevokedAt DATETIME2 NULL,
    RevokeReason NVARCHAR(500) NULL,
    
    -- PDF Generation (future feature)
    PdfPath NVARCHAR(500) NULL,
    PdfGeneratedAt DATETIME2 NULL,
    
    -- Verification
    VerificationCode NVARCHAR(100) NOT NULL UNIQUE, -- For external verification
    
    -- Timestamps
    IssuedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    UNIQUE(UserId, CourseId) -- One certificate per user per course
);

-- Certificate Indexes
CREATE NONCLUSTERED INDEX IX_Certificates_UserId ON dbo.Certificates(UserId);
CREATE NONCLUSTERED INDEX IX_Certificates_CourseId ON dbo.Certificates(CourseId);
CREATE NONCLUSTERED INDEX IX_Certificates_CertificateNumber ON dbo.Certificates(CertificateNumber);
CREATE NONCLUSTERED INDEX IX_Certificates_VerificationCode ON dbo.Certificates(VerificationCode);
CREATE NONCLUSTERED INDEX IX_Certificates_IssuedAt ON dbo.Certificates(IssuedAt DESC);

-- ========================================
-- ACCOUNT DELETION & COURSE MANAGEMENT TABLES
-- ========================================

-- Course Ownership History Table - Track course transfers and ownership changes
CREATE TABLE dbo.CourseOwnershipHistory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    FromInstructorId UNIQUEIDENTIFIER NULL, -- NULL if original creation or deletion
    ToInstructorId UNIQUEIDENTIFIER NULL, -- NULL if account deletion
    TransferReason NVARCHAR(100) NOT NULL CHECK (TransferReason IN ('manual_transfer', 'account_deletion', 'admin_action', 'ownership_change')),
    Notes NVARCHAR(500) NULL,
    TransferredAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    TransferredBy UNIQUEIDENTIFIER NULL -- Admin who approved (NULL if self-service)
);

CREATE NONCLUSTERED INDEX IX_CourseOwnershipHistory_CourseId ON dbo.CourseOwnershipHistory(CourseId);
CREATE NONCLUSTERED INDEX IX_CourseOwnershipHistory_FromInstructor ON dbo.CourseOwnershipHistory(FromInstructorId) WHERE FromInstructorId IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_CourseOwnershipHistory_ToInstructor ON dbo.CourseOwnershipHistory(ToInstructorId) WHERE ToInstructorId IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_CourseOwnershipHistory_TransferredAt ON dbo.CourseOwnershipHistory(TransferredAt DESC);

-- Account Deletion Log Table - GDPR compliance and audit trail
CREATE TABLE dbo.AccountDeletionLog (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL, -- Don't FK - user is deleted
    UserEmail NVARCHAR(255) NOT NULL,
    UserRole NVARCHAR(20) NOT NULL,
    TotalCourses INT NOT NULL DEFAULT 0,
    PublishedCourses INT NOT NULL DEFAULT 0,
    ArchivedCourses INT NOT NULL DEFAULT 0,
    TotalStudents INT NOT NULL DEFAULT 0,
    DeletionMethod NVARCHAR(50) NOT NULL CHECK (DeletionMethod IN ('direct', 'after_archive', 'after_transfer', 'force_delete')),
    DeletionReason NVARCHAR(500) NULL,
    DeletedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    DeletedBy NVARCHAR(20) NOT NULL CHECK (DeletedBy IN ('user', 'admin', 'system'))
);

CREATE NONCLUSTERED INDEX IX_AccountDeletionLog_DeletedAt ON dbo.AccountDeletionLog(DeletedAt DESC);
CREATE NONCLUSTERED INDEX IX_AccountDeletionLog_UserEmail ON dbo.AccountDeletionLog(UserEmail);
CREATE NONCLUSTERED INDEX IX_AccountDeletionLog_UserId ON dbo.AccountDeletionLog(UserId);

-- ========================================
-- ========================================
-- SCHEMA CREATION COMPLETE
-- ========================================

PRINT '✅ Mishin Learn Database Schema created successfully!';
PRINT '📊 Core Tables: Users, Courses, Lessons, Enrollments, UserProgress, Resources, Assessments, Questions, AssessmentSubmissions';
PRINT '📊 Communication: LiveSessions, LiveSessionAttendees, ChatRooms, ChatMessages, TutoringSessions, TutoringMessages';
PRINT '🧠 AI Progress Integration: CourseProgress, LearningActivities, StudentRecommendations, StudentRiskAssessment, PeerComparison';
PRINT '📚 User Features: Bookmarks, FileUploads, Certificates';
PRINT '🔔 Real-time Notifications: Notifications, NotificationPreferences';
PRINT '💬 Comments System: Comments, CommentLikes (6 performance indexes)';
PRINT '🎥 Multi-Content Progress: VideoProgress (tracks videos, text, quizzes via ContentItemId)';
PRINT '⚙️ User Settings: UserSettings (Privacy, Appearance)';
PRINT '💳 Payment System: Transactions, Invoices, Stripe Integration';
PRINT '🎓 Certificates: Track course completion certificates with verification';
PRINT '🚀 Database is ready for Mishin Learn Platform!';