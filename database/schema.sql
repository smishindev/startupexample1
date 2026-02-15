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
IF OBJECT_ID('dbo.ChatMessageReadStatus', 'U') IS NOT NULL DROP TABLE dbo.ChatMessageReadStatus;
IF OBJECT_ID('dbo.ChatParticipants', 'U') IS NOT NULL DROP TABLE dbo.ChatParticipants;
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
-- Email & Notification Tables (drop before Notifications due to FK)
IF OBJECT_ID('dbo.EmailDigests', 'U') IS NOT NULL DROP TABLE dbo.EmailDigests;
IF OBJECT_ID('dbo.EmailTrackingEvents', 'U') IS NOT NULL DROP TABLE dbo.EmailTrackingEvents;
IF OBJECT_ID('dbo.EmailUnsubscribeTokens', 'U') IS NOT NULL DROP TABLE dbo.EmailUnsubscribeTokens;
IF OBJECT_ID('dbo.NotificationQueue', 'U') IS NOT NULL DROP TABLE dbo.NotificationQueue;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.Bookmarks', 'U') IS NOT NULL DROP TABLE dbo.Bookmarks;
-- Course Ratings Table
IF OBJECT_ID('dbo.CourseRatings', 'U') IS NOT NULL DROP TABLE dbo.CourseRatings;
-- Comments System Tables
IF OBJECT_ID('dbo.CommentLikes', 'U') IS NOT NULL DROP TABLE dbo.CommentLikes;
IF OBJECT_ID('dbo.Comments', 'U') IS NOT NULL DROP TABLE dbo.Comments;
-- Certificate Tables
IF OBJECT_ID('dbo.Certificates', 'U') IS NOT NULL DROP TABLE dbo.Certificates;
-- Payment System Tables
IF OBJECT_ID('dbo.Invoices', 'U') IS NOT NULL DROP TABLE dbo.Invoices;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DROP TABLE dbo.Transactions;
-- GDPR & Account Management Tables
IF OBJECT_ID('dbo.DataExportRequests', 'U') IS NOT NULL DROP TABLE dbo.DataExportRequests;
IF OBJECT_ID('dbo.AccountDeletionLog', 'U') IS NOT NULL DROP TABLE dbo.AccountDeletionLog;
IF OBJECT_ID('dbo.CourseOwnershipHistory', 'U') IS NOT NULL DROP TABLE dbo.CourseOwnershipHistory;
-- Collaborative Features Tables
IF OBJECT_ID('dbo.StudyGroupMembers', 'U') IS NOT NULL DROP TABLE dbo.StudyGroupMembers;
IF OBJECT_ID('dbo.StudyGroups', 'U') IS NOT NULL DROP TABLE dbo.StudyGroups;
IF OBJECT_ID('dbo.OfficeHoursQueue', 'U') IS NOT NULL DROP TABLE dbo.OfficeHoursQueue;
IF OBJECT_ID('dbo.OfficeHours', 'U') IS NOT NULL DROP TABLE dbo.OfficeHours;
IF OBJECT_ID('dbo.UserPresence', 'U') IS NOT NULL DROP TABLE dbo.UserPresence;
IF OBJECT_ID('dbo.UserSettings', 'U') IS NOT NULL DROP TABLE dbo.UserSettings;
-- Core Assessment Tables
IF OBJECT_ID('dbo.AssessmentSubmissions', 'U') IS NOT NULL DROP TABLE dbo.AssessmentSubmissions;
IF OBJECT_ID('dbo.Questions', 'U') IS NOT NULL DROP TABLE dbo.Questions;
IF OBJECT_ID('dbo.Assessments', 'U') IS NOT NULL DROP TABLE dbo.Assessments;
IF OBJECT_ID('dbo.Resources', 'U') IS NOT NULL DROP TABLE dbo.Resources;
IF OBJECT_ID('dbo.UserProgress', 'U') IS NOT NULL DROP TABLE dbo.UserProgress;
IF OBJECT_ID('dbo.Enrollments', 'U') IS NOT NULL DROP TABLE dbo.Enrollments;
IF OBJECT_ID('dbo.Lessons', 'U') IS NOT NULL DROP TABLE dbo.Lessons;
IF OBJECT_ID('dbo.Courses', 'U') IS NOT NULL DROP TABLE dbo.Courses;
-- Terms & Privacy Tables (drop before Users due to FK dependency)
IF OBJECT_ID('dbo.UserTermsAcceptance', 'U') IS NOT NULL DROP TABLE dbo.UserTermsAcceptance;
IF OBJECT_ID('dbo.TermsVersions', 'U') IS NOT NULL DROP TABLE dbo.TermsVersions;
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
    RatingCount INT NOT NULL DEFAULT 0, -- Denormalized count of ratings/reviews
    EnrollmentCount INT NOT NULL DEFAULT 0,
    Prerequisites NVARCHAR(MAX) NULL, -- JSON array of prerequisite course IDs (e.g., ["uuid1", "uuid2"])
    LearningOutcomes NVARCHAR(MAX) NULL, -- JSON array of learning outcome strings (e.g., ["Understand React", "Build apps"])
    -- Enrollment Controls (Phase 2 - Feb 8, 2026)
    MaxEnrollment INT NULL, -- NULL = unlimited, > 0 = capacity limit
    EnrollmentOpenDate DATETIME2 NULL, -- NULL = always open, set date = enrollment opens at this time
    EnrollmentCloseDate DATETIME2 NULL, -- NULL = never closes, set date = enrollment closes at this time
    RequiresApproval BIT NOT NULL DEFAULT 0, -- 0 = auto-enroll, 1 = requires manual instructor approval
    -- Certificate Settings (Phase 3 - Feb 11, 2026)
    CertificateEnabled BIT NOT NULL DEFAULT 1, -- 1 = issue certificates on completion, 0 = no certificates
    CertificateTitle NVARCHAR(200) NULL, -- NULL = use course title on certificate
    CertificateTemplate NVARCHAR(50) NOT NULL DEFAULT 'classic' CHECK (CertificateTemplate IN ('classic', 'modern', 'elegant', 'minimal')),
    -- Advanced Visibility (Phase 4 - Feb 12, 2026)
    Visibility NVARCHAR(20) NOT NULL DEFAULT 'public' CHECK (Visibility IN ('public', 'unlisted')), -- public = in catalog, unlisted = only via direct link
    PreviewToken UNIQUEIDENTIFIER NULL, -- Shareable token for previewing draft/unpublished courses
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
    Status NVARCHAR(20) NOT NULL DEFAULT 'active' CHECK (Status IN ('pending', 'approved', 'active', 'completed', 'suspended', 'cancelled', 'rejected')),
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
    IsActive BIT NOT NULL DEFAULT 1,
    LastMessageAt DATETIME2 NULL,
    LastMessagePreview NVARCHAR(200) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Messages Table
CREATE TABLE dbo.ChatMessages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatRooms(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    Content NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(20) NOT NULL DEFAULT 'text' CHECK (Type IN ('text', 'image', 'file', 'code', 'system', 'announcement')),
    ReplyTo UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.ChatMessages(Id),
    Reactions NVARCHAR(MAX) NULL, -- JSON array of reaction objects
    IsEdited BIT NOT NULL DEFAULT 0,
    IsSystemMessage BIT NOT NULL DEFAULT 0,
    AttachmentUrl NVARCHAR(500) NULL,
    AttachmentType NVARCHAR(50) NULL,
    MentionedUsers NVARCHAR(MAX) NULL, -- JSON array of userIds
    EditedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Chat Participants Junction Table
CREATE TABLE dbo.ChatParticipants (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatRooms(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    Role NVARCHAR(20) NOT NULL DEFAULT 'member' CHECK (Role IN ('owner', 'admin', 'member')),
    JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastReadAt DATETIME2 NULL,
    IsMuted BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    LeftAt DATETIME2 NULL,
    UNIQUE(RoomId, UserId)
);

-- Chat Message Read Status Table
CREATE TABLE dbo.ChatMessageReadStatus (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MessageId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.ChatMessages(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    ReadAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE(MessageId, UserId)
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
    StudentId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE NO ACTION,
    ScheduleId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.OfficeHours(Id) ON DELETE SET NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (Status IN ('waiting', 'admitted', 'completed', 'cancelled')),
    Question NVARCHAR(500) NULL,
    JoinedQueueAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    AdmittedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL
);

-- Tutoring Sessions Table
-- NOTE: LessonId uses NO ACTION to avoid multiple cascade paths from Users→TutoringSessions
-- Lesson deletion must manually check/delete tutoring sessions first
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
CREATE INDEX IX_ChatMessages_RoomId_CreatedAt ON dbo.ChatMessages(RoomId, CreatedAt DESC);

CREATE INDEX IX_ChatParticipants_RoomId ON dbo.ChatParticipants(RoomId);
CREATE INDEX IX_ChatParticipants_UserId ON dbo.ChatParticipants(UserId);
CREATE INDEX IX_ChatParticipants_Active ON dbo.ChatParticipants(IsActive) WHERE IsActive = 1;

CREATE INDEX IX_ChatMessageReadStatus_MessageId ON dbo.ChatMessageReadStatus(MessageId);
CREATE INDEX IX_ChatMessageReadStatus_UserId ON dbo.ChatMessageReadStatus(UserId);

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
--   ✅ HYBRID CONTROL SYSTEM: Global + Category (5) + Subcategory (60) toggles
--   ✅ Separate In-App and Email controls for granular user experience
--   ✅ 76 columns total: 2 identity, 5 global, 5 categories, 60 subcategories, 4 metadata
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
    EnableEnrollmentRequest BIT NULL,
    EnableEnrollmentApproved BIT NULL,
    EnableEnrollmentRejected BIT NULL,
    EnableEnrollmentSuspended BIT NULL,
    EnableEnrollmentCancelled BIT NULL,
    EmailCourseEnrollment BIT NULL,
    EmailNewLessons BIT NULL,
    EmailLiveSessions BIT NULL,
    EmailCoursePublished BIT NULL,
    EmailInstructorAnnouncements BIT NULL,
    EmailEnrollmentRequest BIT NULL,
    EmailEnrollmentApproved BIT NULL,
    EmailEnrollmentRejected BIT NULL,
    EmailEnrollmentSuspended BIT NULL,
    EmailEnrollmentCancelled BIT NULL,
    
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
    EnableDirectMessages BIT NULL,
    EnableGroupInvites BIT NULL,
    EnableGroupActivity BIT NULL,
    EnableOfficeHours BIT NULL,
    EmailComments BIT NULL,
    EmailReplies BIT NULL,
    EmailMentions BIT NULL,
    EmailDirectMessages BIT NULL,
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
-- Course Ratings & Reviews Table
-- ========================================
CREATE TABLE dbo.CourseRatings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5), -- 1-5 stars
    ReviewText NVARCHAR(2000) NULL, -- Optional written review
    IsEdited BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_CourseRatings_CourseUser UNIQUE (CourseId, UserId) -- One rating per user per course
);

-- Course Ratings Performance Indexes
CREATE INDEX IX_CourseRatings_CourseId ON dbo.CourseRatings(CourseId);
CREATE INDEX IX_CourseRatings_UserId ON dbo.CourseRatings(UserId);
CREATE NONCLUSTERED INDEX IX_CourseRatings_CourseId_CreatedAt ON dbo.CourseRatings(CourseId, CreatedAt DESC);

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
    UserId UNIQUEIDENTIFIER NOT NULL, -- No FK to avoid multiple cascade paths: Users→Comments→CommentLikes AND Users→CommentLikes
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
    FOREIGN KEY (NotificationId) REFERENCES dbo.Notifications(Id) ON DELETE CASCADE
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
-- DATA EXPORT SYSTEM (GDPR Compliance)
-- ========================================

-- Data Export Requests Table - User data export tracking
CREATE TABLE dbo.DataExportRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    Status NVARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (Status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    RequestedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    ExpiresAt DATETIME2 NULL, -- Auto-delete after 7 days
    FilePath NVARCHAR(500) NULL,
    FileName NVARCHAR(255) NULL,
    FileSize BIGINT NULL,
    DownloadCount INT NOT NULL DEFAULT 0,
    LastDownloadedAt DATETIME2 NULL,
    ErrorMessage NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Data Export Indexes
CREATE NONCLUSTERED INDEX IX_DataExportRequests_UserId ON dbo.DataExportRequests(UserId);
CREATE NONCLUSTERED INDEX IX_DataExportRequests_Status ON dbo.DataExportRequests(Status) WHERE Status IN ('pending', 'processing');
CREATE NONCLUSTERED INDEX IX_DataExportRequests_ExpiresAt ON dbo.DataExportRequests(ExpiresAt) WHERE ExpiresAt IS NOT NULL AND Status = 'completed';

-- ========================================
-- TERMS OF SERVICE & PRIVACY POLICY SYSTEM
-- ========================================

-- TermsVersions Table - Track published versions of legal documents
CREATE TABLE dbo.TermsVersions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DocumentType NVARCHAR(30) NOT NULL CHECK (DocumentType IN ('terms_of_service', 'privacy_policy', 'refund_policy')),
    Version NVARCHAR(20) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL, -- Full HTML/markdown content
    Summary NVARCHAR(MAX) NULL, -- Brief summary of changes from previous version
    EffectiveDate DATETIME2 NOT NULL,
    IsActive BIT NOT NULL DEFAULT 0, -- Only one active per DocumentType
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_TermsVersions_DocType_Version UNIQUE (DocumentType, Version)
);

-- UserTermsAcceptance Table - Track each user's consent per document version (GDPR audit trail)
CREATE TABLE dbo.UserTermsAcceptance (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    TermsVersionId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.TermsVersions(Id) ON DELETE CASCADE,
    AcceptedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IpAddress NVARCHAR(50) NULL, -- For legal audit trail
    UserAgent NVARCHAR(500) NULL, -- Browser info at time of acceptance
    CONSTRAINT UQ_UserTermsAcceptance_User_Version UNIQUE (UserId, TermsVersionId)
);

-- Terms Indexes
CREATE UNIQUE NONCLUSTERED INDEX IX_TermsVersions_DocumentType_IsActive ON dbo.TermsVersions(DocumentType) WHERE IsActive = 1;
CREATE NONCLUSTERED INDEX IX_TermsVersions_EffectiveDate ON dbo.TermsVersions(EffectiveDate DESC);
CREATE NONCLUSTERED INDEX IX_UserTermsAcceptance_UserId ON dbo.UserTermsAcceptance(UserId);
CREATE NONCLUSTERED INDEX IX_UserTermsAcceptance_TermsVersionId ON dbo.UserTermsAcceptance(TermsVersionId);
CREATE NONCLUSTERED INDEX IX_UserTermsAcceptance_AcceptedAt ON dbo.UserTermsAcceptance(AcceptedAt DESC);

-- Seed initial Terms of Service v1.0
INSERT INTO dbo.TermsVersions (DocumentType, Version, Title, Content, Summary, EffectiveDate, IsActive)
VALUES (
    'terms_of_service',
    '1.0',
    'Terms of Service',
    '<h2>Terms of Service</h2>
<p><strong>Effective Date:</strong> February 14, 2026</p>
<p><strong>Last Updated:</strong> February 14, 2026</p>

<h3>1. Acceptance of Terms</h3>
<p>By accessing or using Mishin Learn ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.</p>

<h3>2. Account Registration</h3>
<p>To use certain features, you must create an account. You agree to:</p>
<ul>
<li>Provide accurate, current, and complete information during registration</li>
<li>Maintain the security of your password and account</li>
<li>Accept responsibility for all activities under your account</li>
<li>Notify us immediately of any unauthorized use of your account</li>
</ul>
<p>You must be at least 16 years old to create an account.</p>

<h3>3. User Conduct</h3>
<p>You agree not to:</p>
<ul>
<li>Upload or share content that is unlawful, harmful, threatening, abusive, or otherwise objectionable</li>
<li>Impersonate any person or entity</li>
<li>Interfere with the proper working of the Platform</li>
<li>Attempt to gain unauthorized access to any portion of the Platform</li>
<li>Use the Platform for any illegal or unauthorized purpose</li>
<li>Share your account credentials with others</li>
</ul>

<h3>4. Content and Intellectual Property</h3>
<p><strong>Your Content:</strong> You retain ownership of content you create and upload. By uploading content, you grant Mishin Learn a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on the Platform.</p>
<p><strong>Platform Content:</strong> All Platform content, including courses, materials, and software, is owned by Mishin Learn or its content creators and is protected by intellectual property laws.</p>
<p><strong>Instructor Content:</strong> Course materials created by instructors remain the intellectual property of the respective instructors. Students may not redistribute, copy, or share course materials without explicit permission.</p>

<h3>5. Payments and Refunds</h3>
<p>Paid courses are subject to our pricing at the time of purchase. Refund requests are subject to our <a href="/refund-policy">Refund Policy</a>. We reserve the right to change prices at any time.</p>

<h3>6. Certificates</h3>
<p>Certificates of completion are issued based on course requirements set by instructors. Certificates represent completion of coursework and are not accredited academic credentials.</p>

<h3>7. Limitation of Liability</h3>
<p>The Platform is provided "as is" without warranties of any kind. Mishin Learn is not liable for:</p>
<ul>
<li>The quality, accuracy, or completeness of any course content</li>
<li>Any indirect, incidental, or consequential damages</li>
<li>Loss of data or profits arising from your use of the Platform</li>
<li>Actions or content of other users or instructors</li>
</ul>

<h3>8. Account Termination</h3>
<p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time through your account settings. Upon deletion, your personal data will be handled according to our Privacy Policy.</p>

<h3>9. Dispute Resolution</h3>
<p>Any disputes arising from these Terms shall be resolved through binding arbitration, except where prohibited by law. You agree to resolve disputes individually and waive any right to class action proceedings.</p>

<h3>10. Changes to Terms</h3>
<p>We may update these Terms from time to time. We will notify you of material changes and require re-acceptance. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>

<h3>11. Contact</h3>
<p>For questions about these Terms, contact us at <a href="mailto:support@mishinlearn.com">support@mishinlearn.com</a>.</p>',
    'Initial Terms of Service for Mishin Learn Platform.',
    '2026-02-14',
    1
);

-- Seed initial Privacy Policy v1.0
INSERT INTO dbo.TermsVersions (DocumentType, Version, Title, Content, Summary, EffectiveDate, IsActive)
VALUES (
    'privacy_policy',
    '1.0',
    'Privacy Policy',
    '<h2>Privacy Policy</h2>
<p><strong>Effective Date:</strong> February 14, 2026</p>
<p><strong>Last Updated:</strong> February 14, 2026</p>

<h3>1. Introduction</h3>
<p>Mishin Learn ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>

<h3>2. Information We Collect</h3>
<h4>2.1 Information You Provide</h4>
<ul>
<li><strong>Account Information:</strong> Name, email address, username, password, and profile details</li>
<li><strong>Payment Information:</strong> Billing address and payment method details (processed securely via Stripe)</li>
<li><strong>Learning Data:</strong> Course enrollments, progress, assessment submissions, and certificates</li>
<li><strong>Communications:</strong> Messages, comments, and chat conversations</li>
<li><strong>User Content:</strong> Course materials, assignments, and other content you upload</li>
</ul>

<h4>2.2 Information Collected Automatically</h4>
<ul>
<li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform</li>
<li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
<li><strong>Log Data:</strong> IP addresses, access times, and referring URLs</li>
<li><strong>Cookies:</strong> Session cookies for authentication and preference cookies for settings</li>
</ul>

<h3>3. How We Use Your Information</h3>
<ul>
<li>Provide, maintain, and improve the Platform</li>
<li>Process transactions and send related information</li>
<li>Personalize your learning experience through adaptive content and AI tutoring</li>
<li>Send notifications about course updates, assessments, and platform features</li>
<li>Monitor and analyze usage patterns to improve our services</li>
<li>Detect, prevent, and address technical issues and security threats</li>
<li>Comply with legal obligations</li>
</ul>

<h3>4. Data Sharing</h3>
<p>We do not sell your personal data. We may share information with:</p>
<ul>
<li><strong>Instructors:</strong> Your enrollment status, progress, and assessment results for courses you are enrolled in</li>
<li><strong>Service Providers:</strong> Third-party services that help us operate the Platform (e.g., Stripe for payments, email delivery services)</li>
<li><strong>Legal Requirements:</strong> When required by law, legal process, or government request</li>
</ul>

<h3>5. Data Security</h3>
<p>We implement appropriate technical and organizational measures to protect your data, including:</p>
<ul>
<li>Encryption of passwords using bcrypt hashing</li>
<li>JWT-based authentication with token expiration</li>
<li>HTTPS encryption for all data transmission</li>
<li>Regular security audits and monitoring</li>
</ul>

<h3>6. Your Rights (GDPR Compliance)</h3>
<p>You have the right to:</p>
<ul>
<li><strong>Access:</strong> Request a copy of your personal data (available via Data Export in Settings)</li>
<li><strong>Rectification:</strong> Update or correct your personal information</li>
<li><strong>Erasure:</strong> Delete your account and associated data (available in Settings)</li>
<li><strong>Data Portability:</strong> Export your data in a machine-readable format</li>
<li><strong>Restrict Processing:</strong> Limit how we use your data</li>
<li><strong>Withdraw Consent:</strong> Withdraw consent at any time for optional data processing</li>
</ul>

<h3>7. Data Retention</h3>
<p>We retain your personal data for as long as your account is active. Upon account deletion, personal data is permanently removed within 30 days. Anonymized analytics data may be retained for service improvement.</p>

<h3>8. Cookies</h3>
<p>We use essential cookies for authentication and session management. You can control cookie preferences through your browser settings.</p>

<h3>9. Children''s Privacy</h3>
<p>The Platform is not intended for children under 16. We do not knowingly collect personal data from children under 16. If we learn we have collected such data, we will delete it promptly.</p>

<h3>10. International Data Transfers</h3>
<p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.</p>

<h3>11. Changes to Privacy Policy</h3>
<p>We may update this Privacy Policy from time to time. We will notify you of material changes and may require re-acceptance. The "Last Updated" date at the top indicates when the policy was last revised.</p>

<h3>12. Contact Us</h3>
<p>For privacy-related questions or to exercise your rights, contact us at:</p>
<ul>
<li>Email: <a href="mailto:privacy@mishinlearn.com">privacy@mishinlearn.com</a></li>
<li>Data Protection: Use the Data Export feature in Settings for data access requests</li>
</ul>',
    'Initial Privacy Policy for Mishin Learn Platform.',
    '2026-02-14',
    1
);

-- Seed initial Refund Policy v1.0
INSERT INTO dbo.TermsVersions (DocumentType, Version, Title, Content, Summary, EffectiveDate, IsActive)
VALUES (
    'refund_policy',
    '1.0',
    'Refund Policy',
    '<h2>Refund Policy</h2>
<p><strong>Effective Date:</strong> February 14, 2026</p>
<p><strong>Last Updated:</strong> February 14, 2026</p>

<h3>1. Overview</h3>
<p>At Mishin Learn, we want you to be completely satisfied with your learning experience. This refund policy outlines the conditions under which refunds are granted.</p>

<h3>2. 30-Day Money-Back Guarantee</h3>
<p>You are eligible for a <strong>100% refund</strong> if <strong>ALL</strong> of the following conditions are met:</p>
<ul>
<li>Course purchased within the <strong>last 30 days</strong></li>
<li>Less than <strong>50% of course lessons</strong> completed</li>
<li>No course completion certificate issued</li>
<li>No violation of Terms of Service</li>
</ul>
<p><strong>What happens after approval:</strong></p>
<ul>
<li>Full refund processed within 5-10 business days</li>
<li>Immediate course access revocation</li>
<li>All progress data preserved (in case of re-enrollment)</li>
<li>Refund confirmation email sent</li>
</ul>

<h3>3. Partial Refund Policy</h3>
<h4>50-75% Course Completion</h4>
<p>If you have completed 50-75% of the course:</p>
<ul>
<li><strong>50% refund</strong> of the original purchase price</li>
<li>Available within 30 days of purchase</li>
<li>Course access revoked upon refund</li>
</ul>
<h4>75-99% Course Completion</h4>
<p>If you have completed 75-99% of the course:</p>
<ul>
<li><strong>25% refund</strong> of the original purchase price</li>
<li>Available within 30 days of purchase</li>
<li>Course access revoked upon refund</li>
</ul>
<p><strong>Note:</strong> Partial refunds acknowledge that you have benefited from significant course content.</p>

<h3>4. No Refund Conditions</h3>
<p>Refunds are <strong>NOT available</strong> under the following circumstances:</p>
<ul>
<li>More than 30 days have passed since purchase</li>
<li>Course is 100% completed (all lessons finished)</li>
<li>Course completion certificate has been issued</li>
<li>Account suspended for Terms of Service violations</li>
<li>Evidence of content downloading or unauthorized sharing</li>
<li>Abuse of refund system (multiple refund requests)</li>
<li>Promotional or discounted courses (unless legally required)</li>
</ul>

<h3>5. How to Request a Refund</h3>
<p><strong>Step 1: Submit Request</strong></p>
<ul>
<li>Log into your Mishin Learn account</li>
<li>Navigate to Profile &rarr; Purchase History</li>
<li>Click "Request Refund" next to the course</li>
<li>Select refund reason from dropdown</li>
</ul>
<p><strong>Step 2: Review Process</strong></p>
<ul>
<li>Our team reviews requests within 2-3 business days</li>
<li>You will receive an email with the decision</li>
<li>Additional information may be requested</li>
</ul>
<p><strong>Step 3: Refund Processing</strong></p>
<ul>
<li>Approved refunds processed within 5-10 business days</li>
<li>Refund appears in original payment method</li>
<li>Confirmation email sent with refund details</li>
</ul>

<h3>6. Refund Method</h3>
<ul>
<li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
<li><strong>PayPal:</strong> 3-5 business days</li>
<li><strong>Bank Transfers:</strong> 7-14 business days (regional variations)</li>
</ul>
<p><strong>Note:</strong> Processing time depends on your financial institution.</p>

<h3>7. Special Circumstances</h3>
<h4>Technical Issues</h4>
<p>If you experienced technical problems that prevented course access, contact support immediately with screenshots or error messages. An extended refund window may be granted.</p>
<h4>Course Quality Issues</h4>
<p>If course content is significantly different from the description, contains major technical errors, or the instructor becomes unavailable, we will offer a full refund regardless of completion or a free course transfer to similar content.</p>

<h3>8. Your Rights</h3>
<h4>EU Customers (GDPR)</h4>
<p>A 14-day cooling-off period applies. You have the right to cancel without reason. This right is waived if you begin accessing course content.</p>
<h4>US Customers</h4>
<p>State-specific consumer protection laws apply. Contact support for state-specific information.</p>
<h4>Other Regions</h4>
<p>Local consumer protection laws are honored. Contact support for regional policies.</p>

<h3>9. Dispute Resolution</h3>
<p>If you disagree with a refund decision:</p>
<ul>
<li><strong>Internal Appeal:</strong> Reply to the decision email within 7 days</li>
<li><strong>Management Review:</strong> Senior team reviews the appeal</li>
<li><strong>Final Decision:</strong> Communicated within 5 business days</li>
</ul>

<h3>10. Policy Updates</h3>
<p>This policy may be updated to reflect legal requirements, operational changes, or industry best practices. Users will be notified of material changes via email.</p>

<h3>11. Contact</h3>
<p>For refund questions or special requests, contact us at:</p>
<ul>
<li>Email: <a href="mailto:support@mishinlearn.com">support@mishinlearn.com</a></li>
<li>Response Time: Within 24-48 hours</li>
</ul>
<p>This refund policy is part of our <a href="/terms">Terms of Service</a> and is subject to applicable consumer protection laws, payment processor terms, and Platform Terms of Service.</p>',
    'Initial Refund Policy for Mishin Learn Platform.',
    '2026-02-14',
    1
);

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
PRINT '📦 Data Export: DataExportRequests (GDPR-compliant user data export)';
PRINT '📜 Terms & Privacy: TermsVersions, UserTermsAcceptance (legal compliance)';
PRINT '🚀 Database is ready for Mishin Learn Platform!';