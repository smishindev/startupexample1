-- Verify that password reset columns exist in Users table
USE [startUp1]
GO

PRINT '============================================'
PRINT 'Checking Users table structure...'
PRINT '============================================'

-- Show all columns in Users table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users'
ORDER BY ORDINAL_POSITION;

PRINT ''
PRINT '============================================'
PRINT 'Checking for Password Reset columns...'
PRINT '============================================'

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = 'PasswordResetToken')
    PRINT '✓ PasswordResetToken column EXISTS'
ELSE
    PRINT '✗ PasswordResetToken column MISSING'

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = 'PasswordResetExpiry')
    PRINT '✓ PasswordResetExpiry column EXISTS'
ELSE
    PRINT '✗ PasswordResetExpiry column MISSING'

PRINT ''
PRINT '============================================'
PRINT 'Sample user data (first 3 rows):'
PRINT '============================================'

SELECT TOP 3
    Email,
    FirstName,
    LastName,
    Role,
    EmailVerified,
    PasswordResetToken,
    PasswordResetExpiry,
    CreatedAt
FROM dbo.Users
ORDER BY CreatedAt DESC;
