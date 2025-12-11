-- Add UserSettings table for storing user preferences
-- Run this migration to add settings functionality

USE [startUp1]
GO

-- Drop table if it exists
IF OBJECT_ID('dbo.UserSettings', 'U') IS NOT NULL 
    DROP TABLE dbo.UserSettings;
GO

-- UserSettings Table - Store user preferences and settings
CREATE TABLE dbo.UserSettings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE FOREIGN KEY REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    
    -- Privacy Settings
    ProfileVisibility NVARCHAR(20) NOT NULL DEFAULT 'public' CHECK (ProfileVisibility IN ('public', 'students', 'private')),
    ShowEmail BIT NOT NULL DEFAULT 0,
    ShowProgress BIT NOT NULL DEFAULT 1,
    AllowMessages BIT NOT NULL DEFAULT 1,
    
    -- Appearance Settings
    Theme NVARCHAR(20) NOT NULL DEFAULT 'light' CHECK (Theme IN ('light', 'dark', 'auto')),
    Language NVARCHAR(5) NOT NULL DEFAULT 'en' CHECK (Language IN ('en', 'es', 'fr', 'de', 'zh')),
    FontSize NVARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (FontSize IN ('small', 'medium', 'large')),
    
    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Create index on UserId for faster lookups
CREATE NONCLUSTERED INDEX IX_UserSettings_UserId ON dbo.UserSettings(UserId);

PRINT '✅ UserSettings table created successfully';
GO
