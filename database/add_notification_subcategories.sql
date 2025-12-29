-- Add Notification Subcategories Migration
-- Created: December 29, 2025
-- Purpose: Add hybrid notification control system with category + subcategory toggles

USE [startUp1]
GO

PRINT '========================================';
PRINT '🔔 Adding Notification Subcategories';
PRINT 'Started: ' + CONVERT(NVARCHAR(30), GETDATE(), 121);
PRINT '========================================';

-- ========================================
-- STEP 1: Add Global In-App Toggle
-- ========================================

IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') 
    AND name = 'EnableInAppNotifications'
)
BEGIN
    ALTER TABLE dbo.NotificationPreferences
    ADD EnableInAppNotifications BIT NOT NULL DEFAULT 1;
    
    PRINT '✅ Added EnableInAppNotifications column';
END
ELSE
BEGIN
    PRINT 'ℹ️  EnableInAppNotifications column already exists';
END
GO

-- ========================================
-- STEP 2: Rename Category Columns for Clarity
-- ========================================

-- Rename EnableProgressNotifications → EnableProgressUpdates
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableProgressNotifications')
BEGIN
    EXEC sp_rename 'dbo.NotificationPreferences.EnableProgressNotifications', 'EnableProgressUpdates', 'COLUMN';
    PRINT '✅ Renamed EnableProgressNotifications → EnableProgressUpdates';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableProgressUpdates')
BEGIN
    ALTER TABLE dbo.NotificationPreferences ADD EnableProgressUpdates BIT NOT NULL DEFAULT 1;
    PRINT '✅ Added EnableProgressUpdates column';
END
ELSE
BEGIN
    PRINT 'ℹ️  EnableProgressUpdates already exists';
END
GO

-- Rename EnableAssignmentReminders → EnableAssessmentUpdates
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableAssignmentReminders')
BEGIN
    EXEC sp_rename 'dbo.NotificationPreferences.EnableAssignmentReminders', 'EnableAssessmentUpdates', 'COLUMN';
    PRINT '✅ Renamed EnableAssignmentReminders → EnableAssessmentUpdates';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableAssessmentUpdates')
BEGIN
    ALTER TABLE dbo.NotificationPreferences ADD EnableAssessmentUpdates BIT NOT NULL DEFAULT 1;
    PRINT '✅ Added EnableAssessmentUpdates column';
END
ELSE
BEGIN
    PRINT 'ℹ️  EnableAssessmentUpdates already exists';
END
GO

-- Rename EnableAchievementNotifications → EnableCommunityUpdates
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableAchievementNotifications')
BEGIN
    EXEC sp_rename 'dbo.NotificationPreferences.EnableAchievementNotifications', 'EnableCommunityUpdates', 'COLUMN';
    PRINT '✅ Renamed EnableAchievementNotifications → EnableCommunityUpdates';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableCommunityUpdates')
BEGIN
    ALTER TABLE dbo.NotificationPreferences ADD EnableCommunityUpdates BIT NOT NULL DEFAULT 1;
    PRINT '✅ Added EnableCommunityUpdates column';
END
ELSE
BEGIN
    PRINT 'ℹ️  EnableCommunityUpdates already exists';
END
GO

-- Rename EnableRiskAlerts → EnableSystemAlerts
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableRiskAlerts')
BEGIN
    EXEC sp_rename 'dbo.NotificationPreferences.EnableRiskAlerts', 'EnableSystemAlerts', 'COLUMN';
    PRINT '✅ Renamed EnableRiskAlerts → EnableSystemAlerts';
END
ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = 'EnableSystemAlerts')
BEGIN
    ALTER TABLE dbo.NotificationPreferences ADD EnableSystemAlerts BIT NOT NULL DEFAULT 1;
    PRINT '✅ Added EnableSystemAlerts column';
END
ELSE
BEGIN
    PRINT 'ℹ️  EnableSystemAlerts already exists';
END
GO

-- ========================================
-- STEP 3: Add Progress Updates Subcategories
-- ========================================

PRINT '';
PRINT '📊 Adding Progress Updates Subcategories...';

DECLARE @ProgressColumns TABLE (ColumnName NVARCHAR(100));
INSERT INTO @ProgressColumns VALUES 
    ('EnableLessonCompletion'),
    ('EnableVideoCompletion'),
    ('EnableCourseMilestones'),
    ('EnableProgressSummary'),
    ('EmailLessonCompletion'),
    ('EmailVideoCompletion'),
    ('EmailCourseMilestones'),
    ('EmailProgressSummary');

DECLARE @ProgressCol NVARCHAR(100);
DECLARE progress_cursor CURSOR FOR SELECT ColumnName FROM @ProgressColumns;
OPEN progress_cursor;
FETCH NEXT FROM progress_cursor INTO @ProgressCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = @ProgressCol)
    BEGIN
        DECLARE @ProgressSQL NVARCHAR(MAX) = 'ALTER TABLE dbo.NotificationPreferences ADD ' + @ProgressCol + ' BIT NULL';
        EXEC sp_executesql @ProgressSQL;
        PRINT '  ✅ Added ' + @ProgressCol;
    END
    FETCH NEXT FROM progress_cursor INTO @ProgressCol;
END

CLOSE progress_cursor;
DEALLOCATE progress_cursor;

-- ========================================
-- STEP 4: Add Course Updates Subcategories
-- ========================================

PRINT '';
PRINT '📚 Adding Course Updates Subcategories...';

DECLARE @CourseColumns TABLE (ColumnName NVARCHAR(100));
INSERT INTO @CourseColumns VALUES 
    ('EnableCourseEnrollment'),
    ('EnableNewLessons'),
    ('EnableLiveSessions'),
    ('EnableCoursePublished'),
    ('EnableInstructorAnnouncements'),
    ('EmailCourseEnrollment'),
    ('EmailNewLessons'),
    ('EmailLiveSessions'),
    ('EmailCoursePublished'),
    ('EmailInstructorAnnouncements');

DECLARE @CourseCol NVARCHAR(100);
DECLARE course_cursor CURSOR FOR SELECT ColumnName FROM @CourseColumns;
OPEN course_cursor;
FETCH NEXT FROM course_cursor INTO @CourseCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = @CourseCol)
    BEGIN
        DECLARE @CourseSQL NVARCHAR(MAX) = 'ALTER TABLE dbo.NotificationPreferences ADD ' + @CourseCol + ' BIT NULL';
        EXEC sp_executesql @CourseSQL;
        PRINT '  ✅ Added ' + @CourseCol;
    END
    FETCH NEXT FROM course_cursor INTO @CourseCol;
END

CLOSE course_cursor;
DEALLOCATE course_cursor;

-- ========================================
-- STEP 5: Add Assessment Updates Subcategories
-- ========================================

PRINT '';
PRINT '📝 Adding Assessment Updates Subcategories...';

DECLARE @AssessmentColumns TABLE (ColumnName NVARCHAR(100));
INSERT INTO @AssessmentColumns VALUES 
    ('EnableAssessmentSubmitted'),
    ('EnableAssessmentGraded'),
    ('EnableNewAssessment'),
    ('EnableAssessmentDue'),
    ('EnableSubmissionToGrade'),
    ('EmailAssessmentSubmitted'),
    ('EmailAssessmentGraded'),
    ('EmailNewAssessment'),
    ('EmailAssessmentDue'),
    ('EmailSubmissionToGrade');

DECLARE @AssessmentCol NVARCHAR(100);
DECLARE assessment_cursor CURSOR FOR SELECT ColumnName FROM @AssessmentColumns;
OPEN assessment_cursor;
FETCH NEXT FROM assessment_cursor INTO @AssessmentCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = @AssessmentCol)
    BEGIN
        DECLARE @AssessmentSQL NVARCHAR(MAX) = 'ALTER TABLE dbo.NotificationPreferences ADD ' + @AssessmentCol + ' BIT NULL';
        EXEC sp_executesql @AssessmentSQL;
        PRINT '  ✅ Added ' + @AssessmentCol;
    END
    FETCH NEXT FROM assessment_cursor INTO @AssessmentCol;
END

CLOSE assessment_cursor;
DEALLOCATE assessment_cursor;

-- ========================================
-- STEP 6: Add Community Updates Subcategories
-- ========================================

PRINT '';
PRINT '👥 Adding Community Updates Subcategories...';

DECLARE @CommunityColumns TABLE (ColumnName NVARCHAR(100));
INSERT INTO @CommunityColumns VALUES 
    ('EnableComments'),
    ('EnableReplies'),
    ('EnableMentions'),
    ('EnableGroupInvites'),
    ('EnableOfficeHours'),
    ('EmailComments'),
    ('EmailReplies'),
    ('EmailMentions'),
    ('EmailGroupInvites'),
    ('EmailOfficeHours');

DECLARE @CommunityCol NVARCHAR(100);
DECLARE community_cursor CURSOR FOR SELECT ColumnName FROM @CommunityColumns;
OPEN community_cursor;
FETCH NEXT FROM community_cursor INTO @CommunityCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = @CommunityCol)
    BEGIN
        DECLARE @CommunitySQL NVARCHAR(MAX) = 'ALTER TABLE dbo.NotificationPreferences ADD ' + @CommunityCol + ' BIT NULL';
        EXEC sp_executesql @CommunitySQL;
        PRINT '  ✅ Added ' + @CommunityCol;
    END
    FETCH NEXT FROM community_cursor INTO @CommunityCol;
END

CLOSE community_cursor;
DEALLOCATE community_cursor;

-- ========================================
-- STEP 7: Add System Alerts Subcategories
-- ========================================

PRINT '';
PRINT '⚙️  Adding System Alerts Subcategories...';

DECLARE @SystemColumns TABLE (ColumnName NVARCHAR(100));
INSERT INTO @SystemColumns VALUES 
    ('EnablePaymentConfirmation'),
    ('EnableRefundConfirmation'),
    ('EnableCertificates'),
    ('EnableSecurityAlerts'),
    ('EnableProfileUpdates'),
    ('EmailPaymentConfirmation'),
    ('EmailRefundConfirmation'),
    ('EmailCertificates'),
    ('EmailSecurityAlerts'),
    ('EmailProfileUpdates');

DECLARE @SystemCol NVARCHAR(100);
DECLARE system_cursor CURSOR FOR SELECT ColumnName FROM @SystemColumns;
OPEN system_cursor;
FETCH NEXT FROM system_cursor INTO @SystemCol;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.NotificationPreferences') AND name = @SystemCol)
    BEGIN
        DECLARE @SystemSQL NVARCHAR(MAX) = 'ALTER TABLE dbo.NotificationPreferences ADD ' + @SystemCol + ' BIT NULL';
        EXEC sp_executesql @SystemSQL;
        PRINT '  ✅ Added ' + @SystemCol;
    END
    FETCH NEXT FROM system_cursor INTO @SystemCol;
END

CLOSE system_cursor;
DEALLOCATE system_cursor;

-- ========================================
-- STEP 8: Verify Migration
-- ========================================

PRINT '';
PRINT '========================================';
PRINT '🔍 Verifying Migration...';
PRINT '========================================';

DECLARE @TotalColumns INT;
SELECT @TotalColumns = COUNT(*) 
FROM sys.columns 
WHERE object_id = OBJECT_ID('dbo.NotificationPreferences');

PRINT 'Total columns in NotificationPreferences: ' + CAST(@TotalColumns AS NVARCHAR(10));

-- Count subcategory columns
DECLARE @SubcategoryCount INT;
SELECT @SubcategoryCount = COUNT(*) 
FROM sys.columns 
WHERE object_id = OBJECT_ID('dbo.NotificationPreferences')
AND (name LIKE 'Enable%' OR name LIKE 'Email%')
AND name NOT IN ('EnableEmailNotifications', 'EnableInAppNotifications');

PRINT 'Subcategory columns added: ' + CAST(@SubcategoryCount AS NVARCHAR(10));

-- List all new columns
PRINT '';
PRINT 'New columns added:';
SELECT '  • ' + name as ColumnName
FROM sys.columns 
WHERE object_id = OBJECT_ID('dbo.NotificationPreferences')
AND name IN (
    'EnableInAppNotifications',
    'EnableProgressUpdates', 'EnableAssessmentUpdates', 'EnableCommunityUpdates', 'EnableSystemAlerts',
    'EnableLessonCompletion', 'EnableVideoCompletion', 'EnableCourseMilestones', 'EnableProgressSummary',
    'EmailLessonCompletion', 'EmailVideoCompletion', 'EmailCourseMilestones', 'EmailProgressSummary',
    'EnableCourseEnrollment', 'EnableNewLessons', 'EnableLiveSessions', 'EnableCoursePublished', 'EnableInstructorAnnouncements',
    'EmailCourseEnrollment', 'EmailNewLessons', 'EmailLiveSessions', 'EmailCoursePublished', 'EmailInstructorAnnouncements',
    'EnableAssessmentSubmitted', 'EnableAssessmentGraded', 'EnableNewAssessment', 'EnableAssessmentDue', 'EnableSubmissionToGrade',
    'EmailAssessmentSubmitted', 'EmailAssessmentGraded', 'EmailNewAssessment', 'EmailAssessmentDue', 'EmailSubmissionToGrade',
    'EnableComments', 'EnableReplies', 'EnableMentions', 'EnableGroupInvites', 'EnableOfficeHours',
    'EmailComments', 'EmailReplies', 'EmailMentions', 'EmailGroupInvites', 'EmailOfficeHours',
    'EnablePaymentConfirmation', 'EnableRefundConfirmation', 'EnableCertificates', 'EnableSecurityAlerts', 'EnableProfileUpdates',
    'EmailPaymentConfirmation', 'EmailRefundConfirmation', 'EmailCertificates', 'EmailSecurityAlerts', 'EmailProfileUpdates'
)
ORDER BY name;

PRINT '';
PRINT '========================================';
PRINT '✅ Migration Completed Successfully!';
PRINT 'Finished: ' + CONVERT(NVARCHAR(30), GETDATE(), 121);
PRINT '========================================';
PRINT '';
PRINT '📝 NOTES:';
PRINT '  • NULL values = inherit from category toggle';
PRINT '  • 0 = explicitly disabled';
PRINT '  • 1 = explicitly enabled';
PRINT '  • EnableInAppNotifications = master toggle for notification bell';
PRINT '  • EnableEmailNotifications = master toggle for emails (existing)';
PRINT '';
PRINT '🚀 Next Steps:';
PRINT '  1. Update NotificationService.shouldSendNotification() method';
PRINT '  2. Create NotificationSettingsPage.tsx component';
PRINT '  3. Update API endpoints to handle new fields';
PRINT '  4. Test hybrid control system';

GO
