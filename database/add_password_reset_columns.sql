-- Add password reset columns to Users table
USE [startUp1]
GO

-- Check if columns exist before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = 'PasswordResetToken')
BEGIN
    ALTER TABLE dbo.Users
    ADD PasswordResetToken NVARCHAR(10) NULL;
    PRINT 'Added PasswordResetToken column';
END
ELSE
BEGIN
    PRINT 'PasswordResetToken column already exists';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = 'PasswordResetExpiry')
BEGIN
    ALTER TABLE dbo.Users
    ADD PasswordResetExpiry DATETIME2 NULL;
    PRINT 'Added PasswordResetExpiry column';
END
ELSE
BEGIN
    PRINT 'PasswordResetExpiry column already exists';
END
GO

PRINT 'Password reset columns migration completed successfully';
