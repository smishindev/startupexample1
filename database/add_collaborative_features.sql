-- =============================================
-- Phase 2: Collaborative Features - Database Migration
-- Created: November 28, 2025
-- Description: Adds tables for live sessions presence, office hours, and study groups
-- =============================================

USE [startUp1];
GO

-- =============================================
-- 1. User Presence Tracking
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserPresence]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.UserPresence (
        UserId UNIQUEIDENTIFIER PRIMARY KEY,
        Status NVARCHAR(20) NOT NULL DEFAULT 'offline', -- online, offline, away, busy
        Activity NVARCHAR(100) NULL, -- "Viewing Course: JavaScript", "In Live Session", etc.
        LastSeenAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_UserPresence_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT CK_UserPresence_Status CHECK (Status IN ('online', 'offline', 'away', 'busy'))
    );
    
    CREATE INDEX IX_UserPresence_Status ON dbo.UserPresence(Status);
    CREATE INDEX IX_UserPresence_UpdatedAt ON dbo.UserPresence(UpdatedAt);
    
    PRINT '✅ UserPresence table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ UserPresence table already exists';
END
GO

-- =============================================
-- 2. Study Groups
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudyGroups]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.StudyGroups (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        CourseId UNIQUEIDENTIFIER NULL, -- optional: group specific to a course
        CreatedBy UNIQUEIDENTIFIER NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        MaxMembers INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_StudyGroups_Course FOREIGN KEY (CourseId) REFERENCES dbo.Courses(Id) ON DELETE SET NULL,
        CONSTRAINT FK_StudyGroups_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(Id)
    );
    
    CREATE INDEX IX_StudyGroups_CourseId ON dbo.StudyGroups(CourseId);
    CREATE INDEX IX_StudyGroups_CreatedBy ON dbo.StudyGroups(CreatedBy);
    CREATE INDEX IX_StudyGroups_IsActive ON dbo.StudyGroups(IsActive);
    
    PRINT '✅ StudyGroups table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ StudyGroups table already exists';
END
GO

-- =============================================
-- 3. Study Group Members
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudyGroupMembers]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.StudyGroupMembers (
        GroupId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Role NVARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member
        JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        PRIMARY KEY (GroupId, UserId),
        CONSTRAINT FK_StudyGroupMembers_Group FOREIGN KEY (GroupId) REFERENCES dbo.StudyGroups(Id) ON DELETE CASCADE,
        CONSTRAINT FK_StudyGroupMembers_User FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT CK_StudyGroupMembers_Role CHECK (Role IN ('admin', 'member'))
    );
    
    CREATE INDEX IX_StudyGroupMembers_UserId ON dbo.StudyGroupMembers(UserId);
    
    PRINT '✅ StudyGroupMembers table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ StudyGroupMembers table already exists';
END
GO

-- =============================================
-- 4. Office Hours Schedules
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OfficeHours]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.OfficeHours (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        InstructorId UNIQUEIDENTIFIER NOT NULL,
        DayOfWeek INT NOT NULL, -- 0 = Sunday, 6 = Saturday
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_OfficeHours_Instructor FOREIGN KEY (InstructorId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT CK_OfficeHours_DayOfWeek CHECK (DayOfWeek BETWEEN 0 AND 6)
    );
    
    CREATE INDEX IX_OfficeHours_InstructorId ON dbo.OfficeHours(InstructorId);
    CREATE INDEX IX_OfficeHours_DayOfWeek ON dbo.OfficeHours(DayOfWeek);
    CREATE INDEX IX_OfficeHours_IsActive ON dbo.OfficeHours(IsActive);
    
    PRINT '✅ OfficeHours table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ OfficeHours table already exists';
END
GO

-- =============================================
-- 5. Office Hours Queue
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OfficeHoursQueue]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.OfficeHoursQueue (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        InstructorId UNIQUEIDENTIFIER NOT NULL,
        StudentId UNIQUEIDENTIFIER NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, admitted, completed, cancelled
        Question NVARCHAR(500) NULL,
        JoinedQueueAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        AdmittedAt DATETIME2 NULL,
        CompletedAt DATETIME2 NULL,
        CONSTRAINT FK_OfficeHoursQueue_Instructor FOREIGN KEY (InstructorId) REFERENCES dbo.Users(Id),
        CONSTRAINT FK_OfficeHoursQueue_Student FOREIGN KEY (StudentId) REFERENCES dbo.Users(Id) ON DELETE CASCADE,
        CONSTRAINT CK_OfficeHoursQueue_Status CHECK (Status IN ('waiting', 'admitted', 'completed', 'cancelled'))
    );
    
    CREATE INDEX IX_OfficeHoursQueue_InstructorId ON dbo.OfficeHoursQueue(InstructorId);
    CREATE INDEX IX_OfficeHoursQueue_StudentId ON dbo.OfficeHoursQueue(StudentId);
    CREATE INDEX IX_OfficeHoursQueue_Status ON dbo.OfficeHoursQueue(Status);
    CREATE INDEX IX_OfficeHoursQueue_JoinedAt ON dbo.OfficeHoursQueue(JoinedQueueAt);
    
    PRINT '✅ OfficeHoursQueue table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ OfficeHoursQueue table already exists';
END
GO

-- =============================================
-- Verification
-- =============================================
PRINT '';
PRINT '===========================================';
PRINT 'Phase 2 Migration Summary:';
PRINT '===========================================';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserPresence]'))
    PRINT '✅ UserPresence - EXISTS';
ELSE
    PRINT '❌ UserPresence - MISSING';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudyGroups]'))
    PRINT '✅ StudyGroups - EXISTS';
ELSE
    PRINT '❌ StudyGroups - MISSING';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[StudyGroupMembers]'))
    PRINT '✅ StudyGroupMembers - EXISTS';
ELSE
    PRINT '❌ StudyGroupMembers - MISSING';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OfficeHours]'))
    PRINT '✅ OfficeHours - EXISTS';
ELSE
    PRINT '❌ OfficeHours - MISSING';

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OfficeHoursQueue]'))
    PRINT '✅ OfficeHoursQueue - EXISTS';
ELSE
    PRINT '❌ OfficeHoursQueue - MISSING';

PRINT '===========================================';
PRINT 'Phase 2 Migration Complete!';
PRINT '===========================================';
GO
