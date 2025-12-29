-- =============================================
-- Email Analytics Tables Migration
-- Created: December 28, 2025
-- Purpose: Track email opens, clicks, bounces, and unsubscribe preferences
-- =============================================

USE startUp1;
GO

-- =============================================
-- 1. Email Tracking Events Table
-- =============================================

IF OBJECT_ID('dbo.EmailTrackingEvents', 'U') IS NOT NULL
    DROP TABLE dbo.EmailTrackingEvents;
GO

CREATE TABLE dbo.EmailTrackingEvents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    EmailType NVARCHAR(50) NOT NULL, -- 'notification', 'digest', 'verification', etc.
    EventType NVARCHAR(20) NOT NULL CHECK (EventType IN ('sent', 'opened', 'clicked', 'bounced', 'failed')),
    NotificationId UNIQUEIDENTIFIER NULL, -- For notification emails
    DigestId UNIQUEIDENTIFIER NULL, -- For digest emails
    TrackingToken NVARCHAR(255) NOT NULL UNIQUE,
    ClickedUrl NVARCHAR(2000) NULL, -- For click events
    BounceReason NVARCHAR(1000) NULL, -- For bounce events
    UserAgent NVARCHAR(500) NULL,
    IpAddress NVARCHAR(50) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION
);
GO

-- Indexes for EmailTrackingEvents
CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_UserId 
    ON dbo.EmailTrackingEvents(UserId);
GO

CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_TrackingToken 
    ON dbo.EmailTrackingEvents(TrackingToken);
GO

CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_EventType_CreatedAt 
    ON dbo.EmailTrackingEvents(EventType, CreatedAt DESC);
GO

CREATE NONCLUSTERED INDEX IX_EmailTrackingEvents_NotificationId 
    ON dbo.EmailTrackingEvents(NotificationId) 
    WHERE NotificationId IS NOT NULL;
GO

-- =============================================
-- 2. Email Unsubscribe Tokens Table
-- =============================================

IF OBJECT_ID('dbo.EmailUnsubscribeTokens', 'U') IS NOT NULL
    DROP TABLE dbo.EmailUnsubscribeTokens;
GO

CREATE TABLE dbo.EmailUnsubscribeTokens (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    Token NVARCHAR(255) NOT NULL UNIQUE,
    EmailType NVARCHAR(50) NULL, -- NULL = all emails, or specific type
    ExpiresAt DATETIME2 NULL, -- NULL = never expires (for permanent unsubscribe links)
    UsedAt DATETIME2 NULL, -- When the token was used
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION
);
GO

-- Indexes for EmailUnsubscribeTokens
CREATE NONCLUSTERED INDEX IX_EmailUnsubscribeTokens_Token 
    ON dbo.EmailUnsubscribeTokens(Token);
GO

CREATE NONCLUSTERED INDEX IX_EmailUnsubscribeTokens_UserId 
    ON dbo.EmailUnsubscribeTokens(UserId);
GO

-- =============================================
-- 3. Update NotificationPreferences with unsubscribe tracking
-- =============================================

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') 
    AND name = 'UnsubscribedAt'
)
BEGIN
    ALTER TABLE dbo.NotificationPreferences
    ADD UnsubscribedAt DATETIME2 NULL;
    
    PRINT '✅ Added UnsubscribedAt column to NotificationPreferences';
END
ELSE
BEGIN
    PRINT '⚠️ UnsubscribedAt column already exists in NotificationPreferences';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') 
    AND name = 'UnsubscribeReason'
)
BEGIN
    ALTER TABLE dbo.NotificationPreferences
    ADD UnsubscribeReason NVARCHAR(500) NULL;
    
    PRINT '✅ Added UnsubscribeReason column to NotificationPreferences';
END
ELSE
BEGIN
    PRINT '⚠️ UnsubscribeReason column already exists in NotificationPreferences';
END
GO

-- =============================================
-- Verification
-- =============================================

IF OBJECT_ID('dbo.EmailTrackingEvents', 'U') IS NOT NULL
    PRINT '✅ EmailTrackingEvents table created successfully';
ELSE
    PRINT '❌ Failed to create EmailTrackingEvents table';
GO

IF OBJECT_ID('dbo.EmailUnsubscribeTokens', 'U') IS NOT NULL
    PRINT '✅ EmailUnsubscribeTokens table created successfully';
ELSE
    PRINT '❌ Failed to create EmailUnsubscribeTokens table';
GO

-- =============================================
-- Display table structures
-- =============================================

EXEC sp_help 'dbo.EmailTrackingEvents';
GO

EXEC sp_help 'dbo.EmailUnsubscribeTokens';
GO

-- =============================================
-- Summary
-- =============================================

PRINT '';
PRINT '==============================================';
PRINT 'Email Analytics Migration Complete';
PRINT '==============================================';
PRINT 'Tables Created:';
PRINT '  1. EmailTrackingEvents (5 event types)';
PRINT '  2. EmailUnsubscribeTokens (one-click unsubscribe)';
PRINT 'Columns Added:';
PRINT '  - NotificationPreferences.UnsubscribedAt';
PRINT '  - NotificationPreferences.UnsubscribeReason';
PRINT 'Indexes Created: 6 performance indexes';
PRINT '==============================================';
GO
