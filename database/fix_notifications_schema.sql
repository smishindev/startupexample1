-- Fix Notifications table schema
-- Date: October 27, 2025
-- Purpose: Recreate Notifications table with correct columns

USE [startUp1]
GO

PRINT 'Fixing Notifications table schema...'

-- Drop existing table (data is empty anyway)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
BEGIN
    PRINT 'Dropping old Notifications table...'
    DROP TABLE dbo.Notifications;
END
GO

-- Create Notifications table with correct schema
PRINT 'Creating Notifications table with correct schema...'

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
GO

-- Create indexes for Notifications
CREATE NONCLUSTERED INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
CREATE NONCLUSTERED INDEX IX_Notifications_IsRead ON dbo.Notifications(IsRead);
CREATE NONCLUSTERED INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt DESC);
CREATE NONCLUSTERED INDEX IX_Notifications_Type ON dbo.Notifications(Type);
CREATE NONCLUSTERED INDEX IX_Notifications_Priority ON dbo.Notifications(Priority);
GO

PRINT '✅ Notifications table recreated successfully'
GO

-- Verify new schema
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Notifications' 
ORDER BY ORDINAL_POSITION;
GO
