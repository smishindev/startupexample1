-- ============================================================
-- Delete All Test Courses and Related Data
-- Removes courses with titles like "Test Course%"
-- ============================================================

USE [startUp1]
GO

-- Declare variables
DECLARE @DeletedCourses INT = 0;
DECLARE @DeletedEnrollments INT = 0;
DECLARE @DeletedTransactions INT = 0;
DECLARE @DeletedInvoices INT = 0;
DECLARE @DeletedLessons INT = 0;
DECLARE @DeletedUserProgress INT = 0;

PRINT '🗑️ Starting deletion of test courses and related data...';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    -- Get the course IDs to delete
    DECLARE @CourseIds TABLE (CourseId UNIQUEIDENTIFIER);
    
    INSERT INTO @CourseIds (CourseId)
    SELECT Id 
    FROM dbo.Courses 
    WHERE Title LIKE 'Test Course%';
    
    SET @DeletedCourses = @@ROWCOUNT;
    PRINT '📊 Found ' + CAST(@DeletedCourses AS NVARCHAR(10)) + ' test courses to delete';
    PRINT '';
    
    IF @DeletedCourses > 0
    BEGIN
        -- Delete Invoices (depends on Transactions)
        DELETE i
        FROM dbo.Invoices i
        INNER JOIN dbo.Transactions t ON i.TransactionId = t.Id
        INNER JOIN @CourseIds c ON t.CourseId = c.CourseId;
        
        SET @DeletedInvoices = @@ROWCOUNT;
        PRINT '✅ Deleted ' + CAST(@DeletedInvoices AS NVARCHAR(10)) + ' invoices';
        
        -- Delete Transactions
        DELETE t
        FROM dbo.Transactions t
        INNER JOIN @CourseIds c ON t.CourseId = c.CourseId;
        
        SET @DeletedTransactions = @@ROWCOUNT;
        PRINT '✅ Deleted ' + CAST(@DeletedTransactions AS NVARCHAR(10)) + ' transactions';
        
        -- Delete User Progress (depends on Lessons)
        DELETE up
        FROM dbo.UserProgress up
        INNER JOIN dbo.Lessons l ON up.LessonId = l.Id
        INNER JOIN @CourseIds c ON l.CourseId = c.CourseId;
        
        SET @DeletedUserProgress = @@ROWCOUNT;
        PRINT '✅ Deleted ' + CAST(@DeletedUserProgress AS NVARCHAR(10)) + ' user progress records';
        
        -- Delete Enrollments
        DELETE e
        FROM dbo.Enrollments e
        INNER JOIN @CourseIds c ON e.CourseId = c.CourseId;
        
        SET @DeletedEnrollments = @@ROWCOUNT;
        PRINT '✅ Deleted ' + CAST(@DeletedEnrollments AS NVARCHAR(10)) + ' enrollments';
        
        -- Delete Lessons (CASCADE will handle dependent records)
        DELETE l
        FROM dbo.Lessons l
        INNER JOIN @CourseIds c ON l.CourseId = c.CourseId;
        
        SET @DeletedLessons = @@ROWCOUNT;
        PRINT '✅ Deleted ' + CAST(@DeletedLessons AS NVARCHAR(10)) + ' lessons';
        
        -- Delete Courses (CASCADE will handle dependent records)
        DELETE co
        FROM dbo.Courses co
        INNER JOIN @CourseIds c ON co.Id = c.CourseId;
        
        PRINT '✅ Deleted ' + CAST(@DeletedCourses AS NVARCHAR(10)) + ' courses';
        PRINT '';
    END
    ELSE
    BEGIN
        PRINT 'ℹ️ No test courses found to delete';
        PRINT '';
    END
    
    -- Commit the transaction
    COMMIT TRANSACTION;
    
    PRINT '🎉 SUCCESS! Deletion Summary:';
    PRINT '   - Courses: ' + CAST(@DeletedCourses AS NVARCHAR(10));
    PRINT '   - Enrollments: ' + CAST(@DeletedEnrollments AS NVARCHAR(10));
    PRINT '   - Transactions: ' + CAST(@DeletedTransactions AS NVARCHAR(10));
    PRINT '   - Invoices: ' + CAST(@DeletedInvoices AS NVARCHAR(10));
    PRINT '   - Lessons: ' + CAST(@DeletedLessons AS NVARCHAR(10));
    PRINT '   - User Progress: ' + CAST(@DeletedUserProgress AS NVARCHAR(10));
    PRINT '';
    
END TRY
BEGIN CATCH
    -- Rollback on error
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    
    PRINT '';
    PRINT '❌ ERROR occurred during deletion:';
    PRINT 'Error Message: ' + ERROR_MESSAGE();
    PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
    PRINT '';
    
    -- Re-throw the error
    THROW;
END CATCH

GO

-- Verify the results
PRINT '📋 Verification - Remaining test courses:';
PRINT '';

SELECT COUNT(*) AS RemainingTestCourses
FROM dbo.Courses
WHERE Title LIKE 'Test Course%';

PRINT '';
PRINT '✅ Script execution complete!';
PRINT '';

GO
