-- Create Database User Script
-- Run this AFTER creating database and executing schema.sql
-- This script is idempotent - safe to run multiple times

USE [master]
GO

PRINT '🔐 Creating SQL Server login and database user...';
PRINT '';

-- Step 1: Create SQL Server Login (if not exists)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'mishin_learn_user')
BEGIN
    CREATE LOGIN [mishin_learn_user] WITH PASSWORD = 'MishinLearn2024!';
    PRINT '✅ Created SQL Server login: mishin_learn_user';
END
ELSE
BEGIN
    PRINT '⚠️ Login already exists: mishin_learn_user';
END

PRINT '';

-- Step 2: Switch to application database
USE [startUp1]
GO

PRINT '📂 Switched to database: startUp1';
PRINT '';

-- Step 3: Create Database User (if not exists)
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'mishin_learn_user')
BEGIN
    CREATE USER [mishin_learn_user] FOR LOGIN [mishin_learn_user];
    PRINT '✅ Created database user: mishin_learn_user';
END
ELSE
BEGIN
    PRINT '⚠️ Database user already exists: mishin_learn_user';
END

-- Step 4: Grant db_owner role
IF IS_ROLEMEMBER('db_owner', 'mishin_learn_user') = 0
BEGIN
    ALTER ROLE db_owner ADD MEMBER [mishin_learn_user];
    PRINT '✅ Granted db_owner role to mishin_learn_user';
END
ELSE
BEGIN
    PRINT '⚠️ User already has db_owner role';
END

PRINT '';
PRINT '🎉 Database user setup complete!';
PRINT '📊 User: mishin_learn_user';
PRINT '🔑 Role: db_owner';
PRINT '💡 You can now start the application server';

GO
