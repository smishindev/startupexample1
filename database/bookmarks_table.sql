-- Add Bookmarks Table to existing schema
-- This should be added after the existing tables

USE [startUp1]
GO

-- Drop bookmarks table if it exists
IF OBJECT_ID('dbo.Bookmarks', 'U') IS NOT NULL DROP TABLE dbo.Bookmarks;

-- Bookmarks Table
CREATE TABLE dbo.Bookmarks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    CourseId UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dbo.Courses(Id) ON DELETE CASCADE,
    BookmarkedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Notes NVARCHAR(500) NULL, -- Optional user notes
    UNIQUE(UserId, CourseId) -- Prevent duplicate bookmarks
);

-- Create index for performance
CREATE INDEX IX_Bookmarks_UserId ON dbo.Bookmarks(UserId);
CREATE INDEX IX_Bookmarks_CourseId ON dbo.Bookmarks(CourseId);
CREATE INDEX IX_Bookmarks_BookmarkedAt ON dbo.Bookmarks(BookmarkedAt);