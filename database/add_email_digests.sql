-- =============================================
-- Email Digests Table Migration
-- Created: December 28, 2025
-- Purpose: Store notifications for daily/weekly email digest delivery
-- =============================================

USE startUp1;
GO

-- Drop table if exists (for clean re-runs)
IF OBJECT_ID('dbo.EmailDigests', 'U') IS NOT NULL
    DROP TABLE dbo.EmailDigests;
GO

-- Create EmailDigests table
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
    FOREIGN KEY (NotificationId) REFERENCES dbo.Notifications(Id) ON DELETE NO ACTION
);
GO

-- Create indexes for performance
CREATE NONCLUSTERED INDEX IX_EmailDigests_UserId 
    ON dbo.EmailDigests(UserId);
GO

CREATE NONCLUSTERED INDEX IX_EmailDigests_Frequency_Sent 
    ON dbo.EmailDigests(Frequency, Sent) 
    INCLUDE (ScheduledFor, UserId);
GO

CREATE NONCLUSTERED INDEX IX_EmailDigests_ScheduledFor 
    ON dbo.EmailDigests(ScheduledFor) 
    WHERE Sent = 0;
GO

-- Verify table creation
IF OBJECT_ID('dbo.EmailDigests', 'U') IS NOT NULL
    PRINT '✅ EmailDigests table created successfully';
ELSE
    PRINT '❌ Failed to create EmailDigests table';
GO

-- Display table structure
EXEC sp_help 'dbo.EmailDigests';
GO

PRINT '';
PRINT '==============================================';
PRINT 'Email Digests Migration Complete';
PRINT '==============================================';
PRINT 'Table: EmailDigests';
PRINT 'Indexes: 3 (UserId, Frequency_Sent, ScheduledFor)';
PRINT 'Foreign Keys: 2 (Users, Notifications)';
PRINT '==============================================';
GO
