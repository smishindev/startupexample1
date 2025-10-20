-- Student Progress Integration Database Migration
-- Add missing tables and columns for AI-powered progress analytics

USE [startUp1]
GO

-- Create CourseProgress table for detailed course-level progress tracking
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
    PRINT 'Created CourseProgress table';
END

-- Create LearningActivities table for tracking user learning patterns
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
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    PRINT 'Created LearningActivities table';
END

-- Create StudentRecommendations table for AI recommendations
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentRecommendations]') AND type in (N'U'))
BEGIN
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
    PRINT 'Created StudentRecommendations table';
END

-- Create StudentRiskAssessment table for tracking at-risk students
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudentRiskAssessment]') AND type in (N'U'))
BEGIN
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
    PRINT 'Created StudentRiskAssessment table';
END

-- Create PeerComparison table for benchmarking student performance
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PeerComparison]') AND type in (N'U'))
BEGIN
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
    PRINT 'Created PeerComparison table';
END

-- Migrate existing UserProgress data to CourseProgress
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserProgress]') AND type in (N'U'))
   AND EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CourseProgress]') AND type in (N'U'))
BEGIN
    INSERT INTO dbo.CourseProgress (UserId, CourseId, OverallProgress, CompletedLessons, TimeSpent, LastAccessedAt, CreatedAt, UpdatedAt)
    SELECT 
        UserId, 
        CourseId, 
        OverallProgress, 
        CompletedLessons, 
        TimeSpent,
        LastAccessedAt,
        CreatedAt,
        UpdatedAt
    FROM dbo.UserProgress
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.CourseProgress cp 
        WHERE cp.UserId = UserProgress.UserId AND cp.CourseId = UserProgress.CourseId
    );
    
    PRINT 'Migrated UserProgress data to CourseProgress';
END

-- Add indexes for better performance
CREATE NONCLUSTERED INDEX IX_CourseProgress_UserId_CourseId ON dbo.CourseProgress (UserId, CourseId);
CREATE NONCLUSTERED INDEX IX_LearningActivities_UserId_CreatedAt ON dbo.LearningActivities (UserId, CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_LearningActivities_CourseId_ActivityType ON dbo.LearningActivities (CourseId, ActivityType);
CREATE NONCLUSTERED INDEX IX_StudentRecommendations_UserId_IsActive ON dbo.StudentRecommendations (UserId, IsActive);
CREATE NONCLUSTERED INDEX IX_StudentRiskAssessment_UserId_RiskLevel ON dbo.StudentRiskAssessment (UserId, RiskLevel);
CREATE NONCLUSTERED INDEX IX_PeerComparison_UserId_CourseId ON dbo.PeerComparison (UserId, CourseId);

PRINT 'Created all indexes for Student Progress Integration tables';
PRINT 'Student Progress Integration database migration completed successfully!';