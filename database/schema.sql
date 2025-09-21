-- Mishin Learn Platform Database Schema
-- SQL Server Database: startUp1

USE [startUp1]
GO

-- Drop tables if they exist (for fresh setup)
IF OBJECT_ID('dbo.TutoringMessages', 'U') IS NOT NULL DROP TABLE dbo.TutoringMessages;
IF OBJECT_ID('dbo.TutoringSessions', 'U') IS NOT NULL DROP TABLE dbo.TutoringSessions;
IF OBJECT_ID('dbo.ChatMessages', 'U') IS NOT NULL DROP TABLE dbo.ChatMessages;
IF OBJECT_ID('dbo.ChatRooms', 'U') IS NOT NULL DROP TABLE dbo.ChatRooms;
IF OBJECT_ID('dbo.LiveSessionAttendees', 'U') IS NOT NULL DROP TABLE dbo.LiveSessionAttendees;
IF OBJECT_ID('dbo.LiveSessions', 'U') IS NOT NULL DROP TABLE dbo.LiveSessions;
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
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    LessonId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Lessons(Id) ON DELETE NO ACTION,
    OverallProgress INT NOT NULL DEFAULT 0 CHECK (OverallProgress >= 0 AND OverallProgress <= 100),
    CompletedLessons NVARCHAR(MAX) NULL, -- JSON array of lesson IDs
    CurrentLesson UNIQUEIDENTIFIER NULL,
    TimeSpent INT NOT NULL DEFAULT 0, -- in minutes
    LastAccessedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedAt DATETIME2 NULL,
    PerformanceMetrics NVARCHAR(MAX) NULL, -- JSON object for performance data
    CertificateUrl NVARCHAR(500) NULL,
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
    TimeSpent INT NOT NULL DEFAULT 0, -- in minutes
    AttemptNumber INT NOT NULL DEFAULT 1,
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
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('course_general', 'course_qa', 'study_group', 'direct_message', 'ai_tutoring')),
    CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    CreatedBy UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
    ParticipantsJson NVARCHAR(MAX) NOT NULL, -- JSON array of user IDs
    IsActive BIT NOT NULL DEFAULT 1,
    Metadata NVARCHAR(MAX) NULL, -- JSON object for room settings
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
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
    StartedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EndedAt DATETIME2 NULL,
    Context NVARCHAR(MAX) NOT NULL, -- JSON object for session context
    Outcome NVARCHAR(MAX) NULL, -- JSON object for session outcome
    SatisfactionScore INT NULL CHECK (SatisfactionScore >= 1 AND SatisfactionScore <= 5)
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

-- Insert Sample Data
INSERT INTO dbo.Users (Id, Email, Username, FirstName, LastName, PasswordHash, Role, IsActive, EmailVerified, CreatedAt, UpdatedAt)
VALUES 
    (NEWID(), 'admin@mishinlearn.com', 'admin', 'Sergey', 'Mishin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwlAR2B9VCFxCgHKK', 'admin', 1, 1, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), 'instructor@mishinlearn.com', 'instructor1', 'John', 'Doe', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwlAR2B9VCFxCgHKK', 'instructor', 1, 1, GETUTCDATE(), GETUTCDATE()),
    (NEWID(), 'student@mishinlearn.com', 'student1', 'Jane', 'Smith', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwlAR2B9VCFxCgHKK', 'student', 1, 1, GETUTCDATE(), GETUTCDATE());

PRINT '✅ Mishin Learn Database Schema created successfully!';
PRINT '📊 Created tables: Users, Courses, Lessons, Enrollments, UserProgress, Resources, Assessments, Questions, AssessmentSubmissions, LiveSessions, LiveSessionAttendees, ChatRooms, ChatMessages, TutoringSessions, TutoringMessages';
PRINT '🔐 Sample accounts created:';
PRINT '   - Admin: admin@mishinlearn.com (password: password123)';
PRINT '   - Instructor: instructor@mishinlearn.com (password: password123)';  
PRINT '   - Student: student@mishinlearn.com (password: password123)';
PRINT '🚀 Database is ready for Mishin Learn Platform!';