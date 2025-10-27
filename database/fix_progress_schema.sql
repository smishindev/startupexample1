-- Fix Student Progress Integration Tables Schema
-- Created: October 27, 2025
-- Purpose: Update existing tables to match the expected schema

USE startUp1;
GO

PRINT 'Starting schema fix...';
GO

-- ========================================
-- FIX COURSEPROGRESSS TABLE
-- ========================================
PRINT 'Fixing CourseProgress table...';

-- Drop existing CourseProgress table if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CourseProgress]') AND type in (N'U'))
BEGIN
    DROP TABLE dbo.CourseProgress;
    PRINT 'Dropped old CourseProgress table';
END
GO

-- Recreate CourseProgress with correct schema
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
PRINT 'CourseProgress table recreated with correct schema';
GO

-- ========================================
-- FIX LEARNINGACTIVITIES TABLE
-- ========================================
PRINT 'Fixing LearningActivities table...';

-- Drop existing LearningActivities table if it exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LearningActivities]') AND type in (N'U'))
BEGIN
    DROP TABLE dbo.LearningActivities;
    PRINT 'Dropped old LearningActivities table';
END
GO

-- Recreate LearningActivities with correct schema
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
PRINT 'LearningActivities table recreated with correct schema';
GO

-- ========================================
-- CHECK OTHER TABLES
-- ========================================
PRINT 'Checking other tables...';

-- StudentRecommendations - verify it exists
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
    PRINT 'StudentRecommendations table created';
END
ELSE
BEGIN
    PRINT 'StudentRecommendations table exists';
END
GO

-- StudentRiskAssessment - verify it exists
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
    PRINT 'StudentRiskAssessment table created';
END
ELSE
BEGIN
    PRINT 'StudentRiskAssessment table exists';
END
GO

-- PeerComparison - verify it exists
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
    PRINT 'PeerComparison table created';
END
ELSE
BEGIN
    PRINT 'PeerComparison table exists';
END
GO

-- Notifications - verify it exists with all columns
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Notifications (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        Type NVARCHAR(50) NOT NULL,
        Priority NVARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (Priority IN ('low', 'normal', 'high', 'urgent')),
        Title NVARCHAR(200) NOT NULL,
        Message NVARCHAR(MAX) NOT NULL,
        Data NVARCHAR(MAX) NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ReadAt DATETIME2 NULL,
        ExpiresAt DATETIME2 NULL,
        ActionUrl NVARCHAR(500) NULL,
        ActionText NVARCHAR(100) NULL,
        RelatedEntityId UNIQUEIDENTIFIER NULL,
        RelatedEntityType NVARCHAR(50) NULL
    );
    PRINT 'Notifications table created';
END
ELSE
BEGIN
    PRINT 'Notifications table exists';
END
GO

-- NotificationPreferences - verify it exists
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
        QuietHoursStart TIME NULL,
        QuietHoursEnd TIME NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'NotificationPreferences table created';
END
ELSE
BEGIN
    PRINT 'NotificationPreferences table exists';
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
PRINT 'Schema fix completed successfully!';
PRINT 'All tables now have the correct column structure.';
PRINT '========================================';
GO
