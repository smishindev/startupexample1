-- Add Notifications Tables to startUp1 Database
-- Date: October 24, 2025
-- Purpose: Add real-time notification system tables

USE [startUp1]
GO

-- Check and create Notifications table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    PRINT 'Creating Notifications table...'
    
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
    
    -- Create indexes for Notifications
    CREATE NONCLUSTERED INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
    CREATE NONCLUSTERED INDEX IX_Notifications_IsRead ON dbo.Notifications(IsRead);
    CREATE NONCLUSTERED INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt DESC);
    CREATE NONCLUSTERED INDEX IX_Notifications_Type ON dbo.Notifications(Type);
    CREATE NONCLUSTERED INDEX IX_Notifications_Priority ON dbo.Notifications(Priority);
    
    PRINT '✅ Notifications table created successfully'
END
ELSE
BEGIN
    PRINT '⚠️  Notifications table already exists, skipping...'
END
GO

-- Check and create NotificationPreferences table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NotificationPreferences]') AND type in (N'U'))
BEGIN
    PRINT 'Creating NotificationPreferences table...'
    
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
    
    -- Create index for NotificationPreferences
    CREATE NONCLUSTERED INDEX IX_NotificationPreferences_UserId ON dbo.NotificationPreferences(UserId);
    
    PRINT '✅ NotificationPreferences table created successfully'
END
ELSE
BEGIN
    PRINT '⚠️  NotificationPreferences table already exists, skipping...'
END
GO

PRINT ''
PRINT '========================================='
PRINT '✅ Notification system tables setup complete!'
PRINT '========================================='
PRINT 'Tables added:'
PRINT '  • Notifications - Store all user notifications'
PRINT '  • NotificationPreferences - User notification settings'
PRINT ''
PRINT '🚀 Real-time notification system is ready!'
GO
