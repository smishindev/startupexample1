-- ========================================
-- NOTIFICATION QUEUE TABLE
-- ========================================
-- Purpose: Queue notifications during quiet hours for later delivery
-- Created: December 18, 2025
-- Part of: Notification Preferences Enforcement

USE startUp1;
GO

-- Check if table exists
IF OBJECT_ID('dbo.NotificationQueue', 'U') IS NOT NULL
BEGIN
    PRINT '⚠️ NotificationQueue table already exists - skipping creation';
END
ELSE
BEGIN
    -- Create NotificationQueue table
    CREATE TABLE dbo.NotificationQueue (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        
        -- Notification Details (same as Notifications table)
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

    -- Indexes for efficient queries
    CREATE NONCLUSTERED INDEX IX_NotificationQueue_UserId ON dbo.NotificationQueue(UserId);
    CREATE NONCLUSTERED INDEX IX_NotificationQueue_Status ON dbo.NotificationQueue(Status) WHERE Status='queued';
    CREATE NONCLUSTERED INDEX IX_NotificationQueue_QueuedAt ON dbo.NotificationQueue(QueuedAt);

    PRINT '✅ NotificationQueue table created successfully';
    PRINT '📊 Indexes created: IX_NotificationQueue_UserId, IX_NotificationQueue_Status, IX_NotificationQueue_QueuedAt';
END
GO

-- Verify table creation
IF OBJECT_ID('dbo.NotificationQueue', 'U') IS NOT NULL
BEGIN
    PRINT '✅ Verification successful - NotificationQueue table exists';
    
    -- Show table structure
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'NotificationQueue'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT '❌ ERROR: NotificationQueue table was not created';
END
GO
