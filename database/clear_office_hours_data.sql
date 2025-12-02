-- Clear all Office Hours data
-- This script removes all office hours schedules and queue entries
-- Use this for testing or to reset the Office Hours feature

USE startUp1;
GO

PRINT 'Starting Office Hours data cleanup...';
GO

-- First, delete queue entries (child table)
DELETE FROM dbo.OfficeHoursQueue;
PRINT CONCAT('Deleted ', @@ROWCOUNT, ' queue entries.');
GO

-- Hard delete all schedules
DELETE FROM dbo.OfficeHours;
PRINT CONCAT('Deleted ', @@ROWCOUNT, ' office hours schedules.');
GO

-- Verify cleanup
SELECT 'OfficeHoursQueue' as TableName, COUNT(*) as RemainingRecords 
FROM dbo.OfficeHoursQueue
UNION ALL
SELECT 'OfficeHours (Active)' as TableName, COUNT(*) as RemainingRecords 
FROM dbo.OfficeHours WHERE IsActive = 1;
GO

PRINT '';
PRINT '✅ Office Hours data cleanup completed successfully!';
GO
