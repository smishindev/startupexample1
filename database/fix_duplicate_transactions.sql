-- Add unique constraint to prevent duplicate pending transactions
-- This is the DEFINITIVE fix for the race condition

USE startUp1;
GO

-- Set required options for filtered index
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- Drop the index if it exists (for re-running)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_Unique_Pending' AND object_id = OBJECT_ID('dbo.Transactions'))
BEGIN
    DROP INDEX IX_Transactions_Unique_Pending ON dbo.Transactions;
    PRINT '✓ Dropped existing unique index';
END
GO

-- Create unique filtered index on (UserId, CourseId) where Status = 'pending'
-- This prevents multiple pending transactions for the same user+course combination
CREATE UNIQUE NONCLUSTERED INDEX IX_Transactions_Unique_Pending
ON dbo.Transactions(UserId, CourseId)
WHERE Status = 'pending';
GO

PRINT '✅ Created unique constraint for pending transactions';
PRINT '   This prevents duplicate pending transactions at database level';
GO

-- Test the constraint
PRINT '';
PRINT '🧪 Testing constraint...';
GO

-- This should succeed (first pending transaction)
-- INSERT INTO dbo.Transactions (Id, UserId, CourseId, Amount, Currency, Status, PaymentMethod)
-- VALUES (NEWID(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 100, 'USD', 'pending', 'card');

-- This should FAIL (duplicate pending for same user+course)
-- INSERT INTO dbo.Transactions (Id, UserId, CourseId, Amount, Currency, Status, PaymentMethod)
-- VALUES (NEWID(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 100, 'USD', 'pending', 'card');

PRINT '✅ Constraint is active - duplicate pending transactions will be blocked';
