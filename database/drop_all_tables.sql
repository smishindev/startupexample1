-- Drop All Tables in startUp1 Database
-- ⚠️ WARNING: This will DELETE ALL DATA in the database!

USE [startUp1]
GO

PRINT '⚠️  WARNING: Dropping all tables - ALL DATA WILL BE LOST!';
PRINT 'Starting database cleanup...';
GO

-- Drop tables in correct order (respecting foreign key constraints)
IF OBJECT_ID('dbo.VideoAnalytics', 'U') IS NOT NULL DROP TABLE dbo.VideoAnalytics;
IF OBJECT_ID('dbo.VideoProgress', 'U') IS NOT NULL DROP TABLE dbo.VideoProgress;
IF OBJECT_ID('dbo.VideoLessons', 'U') IS NOT NULL DROP TABLE dbo.VideoLessons;
IF OBJECT_ID('dbo.FileUploads', 'U') IS NOT NULL DROP TABLE dbo.FileUploads;
IF OBJECT_ID('dbo.TutoringMessages', 'U') IS NOT NULL DROP TABLE dbo.TutoringMessages;
IF OBJECT_ID('dbo.TutoringSessions', 'U') IS NOT NULL DROP TABLE dbo.TutoringSessions;
IF OBJECT_ID('dbo.ChatMessages', 'U') IS NOT NULL DROP TABLE dbo.ChatMessages;
IF OBJECT_ID('dbo.ChatRooms', 'U') IS NOT NULL DROP TABLE dbo.ChatRooms;
IF OBJECT_ID('dbo.LiveSessionAttendees', 'U') IS NOT NULL DROP TABLE dbo.LiveSessionAttendees;
IF OBJECT_ID('dbo.LiveSessions', 'U') IS NOT NULL DROP TABLE dbo.LiveSessions;
IF OBJECT_ID('dbo.PeerComparison', 'U') IS NOT NULL DROP TABLE dbo.PeerComparison;
IF OBJECT_ID('dbo.StudentRiskAssessment', 'U') IS NOT NULL DROP TABLE dbo.StudentRiskAssessment;
IF OBJECT_ID('dbo.StudentRecommendations', 'U') IS NOT NULL DROP TABLE dbo.StudentRecommendations;
IF OBJECT_ID('dbo.LearningActivities', 'U') IS NOT NULL DROP TABLE dbo.LearningActivities;
IF OBJECT_ID('dbo.CourseProgress', 'U') IS NOT NULL DROP TABLE dbo.CourseProgress;
IF OBJECT_ID('dbo.NotificationPreferences', 'U') IS NOT NULL DROP TABLE dbo.NotificationPreferences;
IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
IF OBJECT_ID('dbo.Bookmarks', 'U') IS NOT NULL DROP TABLE dbo.Bookmarks;
IF OBJECT_ID('dbo.AssessmentSubmissions', 'U') IS NOT NULL DROP TABLE dbo.AssessmentSubmissions;
IF OBJECT_ID('dbo.Questions', 'U') IS NOT NULL DROP TABLE dbo.Questions;
IF OBJECT_ID('dbo.Assessments', 'U') IS NOT NULL DROP TABLE dbo.Assessments;
IF OBJECT_ID('dbo.Resources', 'U') IS NOT NULL DROP TABLE dbo.Resources;
IF OBJECT_ID('dbo.UserProgress', 'U') IS NOT NULL DROP TABLE dbo.UserProgress;
IF OBJECT_ID('dbo.Enrollments', 'U') IS NOT NULL DROP TABLE dbo.Enrollments;
IF OBJECT_ID('dbo.Lessons', 'U') IS NOT NULL DROP TABLE dbo.Lessons;
IF OBJECT_ID('dbo.Courses', 'U') IS NOT NULL DROP TABLE dbo.Courses;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;

PRINT '✅ All tables dropped successfully';
PRINT '💡 Run schema.sql to recreate tables';
GO
