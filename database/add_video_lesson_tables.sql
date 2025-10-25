-- Mishin Learn Platform - Video Lesson System Migration
-- Adds VideoLessons, VideoProgress, and VideoAnalytics tables
-- NOTE: This assumes core tables (Lessons, Users) already exist

USE [startUp1]
GO

PRINT '🎥 Starting Video Lesson System Migration...';

-- Check if Lessons table exists (prerequisite)
IF OBJECT_ID('dbo.Lessons', 'U') IS NULL
BEGIN
    PRINT '❌ ERROR: Lessons table does not exist!';
    PRINT '⚠️  Please run the main schema.sql first to create core tables';
    PRINT '⚠️  The video lesson system requires: Users, Courses, Lessons tables';
    RAISERROR('Core tables not found. Cannot proceed with video lesson migration.', 16, 1);
    RETURN;
END

-- Check and create VideoLessons table
IF OBJECT_ID('dbo.VideoLessons', 'U') IS NULL
BEGIN
    PRINT '📝 Creating VideoLessons table...';
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
    PRINT '✅ VideoLessons table created';
END
ELSE
BEGIN
    PRINT '⚠️  VideoLessons table already exists, skipping';
END

-- Check and create VideoProgress table
IF OBJECT_ID('dbo.VideoProgress', 'U') IS NULL
BEGIN
    PRINT '📝 Creating VideoProgress table...';
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
    PRINT '✅ VideoProgress table created';
END
ELSE
BEGIN
    PRINT '⚠️  VideoProgress table already exists, skipping';
END

-- Check and create VideoAnalytics table
IF OBJECT_ID('dbo.VideoAnalytics', 'U') IS NULL
BEGIN
    PRINT '📝 Creating VideoAnalytics table...';
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
    PRINT '✅ VideoAnalytics table created';
END
ELSE
BEGIN
    PRINT '⚠️  VideoAnalytics table already exists, skipping';
END

-- Create indexes
PRINT '📝 Creating indexes...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoLessons_LessonId')
    CREATE NONCLUSTERED INDEX IX_VideoLessons_LessonId ON dbo.VideoLessons(LessonId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoProgress_UserId')
    CREATE NONCLUSTERED INDEX IX_VideoProgress_UserId ON dbo.VideoProgress(UserId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoProgress_VideoLessonId')
    CREATE NONCLUSTERED INDEX IX_VideoProgress_VideoLessonId ON dbo.VideoProgress(VideoLessonId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoProgress_IsCompleted')
    CREATE NONCLUSTERED INDEX IX_VideoProgress_IsCompleted ON dbo.VideoProgress(IsCompleted);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoAnalytics_VideoLessonId')
    CREATE NONCLUSTERED INDEX IX_VideoAnalytics_VideoLessonId ON dbo.VideoAnalytics(VideoLessonId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoAnalytics_UserId')
    CREATE NONCLUSTERED INDEX IX_VideoAnalytics_UserId ON dbo.VideoAnalytics(UserId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_VideoAnalytics_SessionId')
    CREATE NONCLUSTERED INDEX IX_VideoAnalytics_SessionId ON dbo.VideoAnalytics(SessionId);

PRINT '✅ Indexes created';

PRINT '✅ Video Lesson System Migration completed successfully!';
PRINT '🎥 Tables created: VideoLessons, VideoProgress, VideoAnalytics';
PRINT '📊 Ready for video uploads and progress tracking';
