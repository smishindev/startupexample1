-- Migration Script: Add Missing Student Progress Integration Tables
-- Created: October 27, 2025
-- Purpose: Add CourseProgress, LearningActivities, Recommendations, and Notifications tables

USE startUp1;
GO

-- ========================================
-- STUDENT PROGRESS INTEGRATION TABLES
-- ========================================

-- Check and create CourseProgress table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CourseProgress]') AND type in (N'U'))
BEGIN
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
    PRINT 'CourseProgress table created successfully';
END
ELSE
BEGIN
    PRINT 'CourseProgress table already exists';
END
GO

-- Check and create LearningActivities table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LearningActivities]') AND type in (N'U'))
BEGIN
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
        StartTime DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        EndTime DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'LearningActivities table created successfully';
END
ELSE
BEGIN
    PRINT 'LearningActivities table already exists';
END
GO

-- Check and create StudentRecommendations table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentRecommendations]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.StudentRecommendations (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        CourseId UNIQUEIDENTIFIER NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
        Type NVARCHAR(50) NOT NULL CHECK (Type IN ('next_lesson', 'review_concept', 'practice_skill', 'take_assessment', 'watch_video', 'read_resource', 'join_discussion', 'seek_help')),
        Priority NVARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (Priority IN ('low', 'medium', 'high', 'urgent')),
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(MAX) NOT NULL,
        Reasoning NVARCHAR(MAX) NULL, -- AI explanation for the recommendation
        ResourceId UNIQUEIDENTIFIER NULL, -- ID of recommended resource (lesson, assessment, etc.)
        ResourceType NVARCHAR(50) NULL, -- 'lesson', 'assessment', 'video', 'resource'
        EstimatedTimeMinutes INT NULL,
        DifficultyLevel NVARCHAR(20) NULL CHECK (DifficultyLevel IN ('beginner', 'intermediate', 'advanced', 'expert')),
        Status NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'in_progress', 'completed', 'dismissed')),
        CompletedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ExpiresAt DATETIME2 NULL
    );
    PRINT 'StudentRecommendations table created successfully';
END
ELSE
BEGIN
    PRINT 'StudentRecommendations table already exists';
END
GO

-- Check and create StudentRiskAssessment table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentRiskAssessment]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.StudentRiskAssessment (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
        RiskLevel NVARCHAR(20) NOT NULL CHECK (RiskLevel IN ('low', 'medium', 'high', 'critical')),
        RiskFactors NVARCHAR(MAX) NULL, -- JSON array of identified risk factors
        RecommendedActions NVARCHAR(MAX) NULL, -- JSON array of recommended interventions
        CalculatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'StudentRiskAssessment table created successfully';
END
ELSE
BEGIN
    PRINT 'StudentRiskAssessment table already exists';
END
GO

-- Check and create PeerComparison table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PeerComparison]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.PeerComparison (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id),
        CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
        UserScore DECIMAL(5,2) NOT NULL,
        PeerAverageScore DECIMAL(5,2) NOT NULL,
        UserRank INT NULL,
        TotalStudents INT NOT NULL,
        Percentile DECIMAL(5,2) NULL,
        ComparisonDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'PeerComparison table created successfully';
END
ELSE
BEGIN
    PRINT 'PeerComparison table already exists';
END
GO

-- ========================================
-- NOTIFICATIONS SYSTEM TABLES
-- ========================================

-- Check and create Notifications table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
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
    PRINT 'Notifications table created successfully';
END
ELSE
BEGIN
    PRINT 'Notifications table already exists';
END
GO

-- Check and create NotificationPreferences table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NotificationPreferences]') AND type in (N'U'))
BEGIN
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
    PRINT 'NotificationPreferences table created successfully';
END
ELSE
BEGIN
    PRINT 'NotificationPreferences table already exists';
END
GO

-- Create indexes for better performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CourseProgress_UserId_CourseId')
BEGIN
    CREATE INDEX IX_CourseProgress_UserId_CourseId ON dbo.CourseProgress(UserId, CourseId);
    PRINT 'Index IX_CourseProgress_UserId_CourseId created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LearningActivities_UserId')
BEGIN
    CREATE INDEX IX_LearningActivities_UserId ON dbo.LearningActivities(UserId);
    PRINT 'Index IX_LearningActivities_UserId created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_StudentRecommendations_UserId')
BEGIN
    CREATE INDEX IX_StudentRecommendations_UserId ON dbo.StudentRecommendations(UserId);
    PRINT 'Index IX_StudentRecommendations_UserId created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Notifications_UserId')
BEGIN
    CREATE INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
    PRINT 'Index IX_Notifications_UserId created';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Migration completed successfully!';
PRINT 'All Student Progress Integration tables and Notifications tables are now available.';
PRINT '========================================';
GO
