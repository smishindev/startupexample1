-- Fix Duplicate Transactions
-- Creates filtered unique index to prevent duplicate pending transactions
-- Run this after creating the database schema

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

USE [startUp1]
GO

PRINT '🔧 Creating filtered unique index to prevent duplicate pending transactions...';

-- Check if index already exists
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_Unique_Pending' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_Transactions_Unique_Pending 
    ON dbo.Transactions (UserId, CourseId) 
    WHERE Status = 'pending';
    
    PRINT '✅ Created filtered unique index: IX_Transactions_Unique_Pending';
    PRINT '   - Prevents duplicate pending transactions for same user/course combination';
    PRINT '   - Only applies to transactions with Status = ''pending''';
    PRINT '   - Multiple completed/failed transactions are allowed';
END
ELSE
BEGIN
    PRINT 'ℹ️ Index IX_Transactions_Unique_Pending already exists';
END

PRINT '';
PRINT '✅ Duplicate transaction prevention is active!';
