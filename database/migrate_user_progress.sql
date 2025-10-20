-- CRITICAL: UserProgress to CourseProgress Migration
-- This fixes compatibility issues between Student Progress Integration and existing APIs

USE [startUp1]
GO

PRINT 'Starting UserProgress to CourseProgress migration...';

-- Step 1: Migrate data from UserProgress to CourseProgress if CourseProgress exists
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CourseProgress]') AND type in (N'U'))
   AND EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserProgress]') AND type in (N'U'))
BEGIN
    PRINT 'Migrating data from UserProgress to CourseProgress...';
    
    -- Insert data that doesn't already exist in CourseProgress
    INSERT INTO dbo.CourseProgress (
        UserId, CourseId, OverallProgress, CompletedLessons, TimeSpent, 
        LastAccessedAt, CompletedAt, CreatedAt, UpdatedAt
    )
    SELECT 
        up.UserId, 
        up.CourseId, 
        up.OverallProgress, 
        up.CompletedLessons, 
        up.TimeSpent,
        up.LastAccessedAt,
        up.CompletedAt,
        COALESCE(up.StartedAt, GETUTCDATE()) as CreatedAt,
        GETUTCDATE() as UpdatedAt
    FROM dbo.UserProgress up
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.CourseProgress cp 
        WHERE cp.UserId = up.UserId AND cp.CourseId = up.CourseId
    );
    
    DECLARE @MigratedRows INT = @@ROWCOUNT;
    PRINT 'Migrated ' + CAST(@MigratedRows AS VARCHAR(10)) + ' records to CourseProgress';
    
    -- Verify migration
    DECLARE @UserProgressCount INT, @CourseProgressCount INT;
    SELECT @UserProgressCount = COUNT(*) FROM dbo.UserProgress;
    SELECT @CourseProgressCount = COUNT(*) FROM dbo.CourseProgress;
    
    PRINT 'UserProgress records: ' + CAST(@UserProgressCount AS VARCHAR(10));
    PRINT 'CourseProgress records: ' + CAST(@CourseProgressCount AS VARCHAR(10));
    
    IF @CourseProgressCount >= @UserProgressCount
    BEGIN
        PRINT '✅ Migration successful - CourseProgress has all data';
        
        -- Create a view for backward compatibility (optional)
        IF EXISTS (SELECT * FROM sys.views WHERE name = 'UserProgressView')
        BEGIN
            DROP VIEW dbo.UserProgressView;
        END
        
        EXEC sp_executesql N'
        CREATE VIEW dbo.UserProgressView AS
        SELECT 
            Id, UserId, CourseId, 
            NULL as LessonId, -- CourseProgress doesn''t have LessonId
            OverallProgress, CompletedLessons, 
            NULL as CurrentLesson, -- CourseProgress doesn''t have CurrentLesson
            TimeSpent, LastAccessedAt, 
            CreatedAt as StartedAt, -- Map CreatedAt to StartedAt
            CompletedAt,
            NULL as PerformanceMetrics, -- CourseProgress doesn''t have this
            NULL as CertificateUrl -- CourseProgress doesn''t have this
        FROM dbo.CourseProgress
        ';
        
        PRINT '✅ Created UserProgressView for backward compatibility';
    END
    ELSE
    BEGIN
        PRINT '⚠️ Warning: Migration may be incomplete';
    END
END
ELSE
BEGIN
    PRINT 'CourseProgress or UserProgress table not found - skipping migration';
END

-- Step 2: Update existing data in CourseProgress from UserProgress (sync any changes)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CourseProgress]') AND type in (N'U'))
   AND EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserProgress]') AND type in (N'U'))
BEGIN
    PRINT 'Syncing any updated data from UserProgress to CourseProgress...';
    
    UPDATE cp
    SET 
        OverallProgress = up.OverallProgress,
        CompletedLessons = up.CompletedLessons,
        TimeSpent = up.TimeSpent,
        LastAccessedAt = up.LastAccessedAt,
        UpdatedAt = GETUTCDATE()
    FROM dbo.CourseProgress cp
    INNER JOIN dbo.UserProgress up ON cp.UserId = up.UserId AND cp.CourseId = up.CourseId
    WHERE (
        cp.OverallProgress != up.OverallProgress OR
        cp.TimeSpent != up.TimeSpent OR
        cp.LastAccessedAt != up.LastAccessedAt OR
        cp.CompletedLessons != up.CompletedLessons
    );
    
    DECLARE @UpdatedRows INT = @@ROWCOUNT;
    PRINT 'Updated ' + CAST(@UpdatedRows AS VARCHAR(10)) + ' existing records in CourseProgress';
END

PRINT '✅ UserProgress to CourseProgress migration completed successfully!';
PRINT 'Note: Existing APIs should be updated to use CourseProgress table for consistency.';