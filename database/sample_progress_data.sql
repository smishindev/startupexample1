-- Insert sample data for Student Progress Integration testing
-- This will help test the Smart Progress dashboard with real data

USE [startUp1]
GO

-- Insert some sample CourseProgress data for existing users and courses
-- Get a sample user ID (student)
DECLARE @UserId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Users WHERE Role = 'student');
DECLARE @CourseId1 UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Courses);
DECLARE @CourseId2 UNIQUEIDENTIFIER = (SELECT Id FROM Courses WHERE Id != @CourseId1 AND Id IS NOT NULL);

-- Insert CourseProgress records if they don't exist
IF @UserId IS NOT NULL AND @CourseId1 IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM CourseProgress WHERE UserId = @UserId AND CourseId = @CourseId1)
    BEGIN
        INSERT INTO CourseProgress (UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt, UpdatedAt)
        VALUES (@UserId, @CourseId1, 75, 450, DATEADD(hour, -2, GETDATE()), DATEADD(day, -30, GETDATE()), GETDATE());
        PRINT 'Inserted CourseProgress record 1';
    END
    
    IF @CourseId2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CourseProgress WHERE UserId = @UserId AND CourseId = @CourseId2)
    BEGIN
        INSERT INTO CourseProgress (UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt, UpdatedAt)
        VALUES (@UserId, @CourseId2, 45, 280, DATEADD(day, -1, GETDATE()), DATEADD(day, -20, GETDATE()), GETDATE());
        PRINT 'Inserted CourseProgress record 2';
    END
END

-- Insert some sample LearningActivities
IF @UserId IS NOT NULL AND @CourseId1 IS NOT NULL
BEGIN
    -- Recent assessment activity
    INSERT INTO LearningActivities (UserId, CourseId, ActivityType, TimeSpent, Score, AccuracyRate, CompletionRate, AttentionScore, InteractionCount, CreatedAt)
    VALUES 
        (@UserId, @CourseId1, 'assessment', 1200, 85.5, 90.2, 100.0, 78.5, 15, DATEADD(day, -1, GETDATE())),
        (@UserId, @CourseId1, 'lesson_view', 2400, NULL, NULL, 95.0, 82.1, 8, DATEADD(day, -2, GETDATE())),
        (@UserId, @CourseId1, 'quiz_attempt', 900, 92.0, 95.5, 100.0, 88.3, 12, DATEADD(day, -3, GETDATE()));
    
    PRINT 'Inserted sample LearningActivities';
END

-- Insert sample StudentRecommendations
IF @UserId IS NOT NULL
BEGIN
    INSERT INTO StudentRecommendations (UserId, CourseId, RecommendationType, Priority, Title, Description, EstimatedTime, ConfidenceScore, IsActive, CreatedAt)
    VALUES 
        (@UserId, @CourseId1, 'content', 'high', 'Review Advanced React Patterns', 'Based on your recent assessment performance, we recommend reviewing advanced React patterns like hooks and context API.', 60, 87.5, 1, GETDATE()),
        (@UserId, @CourseId1, 'skill', 'medium', 'Practice JavaScript Fundamentals', 'Strengthen your JavaScript foundation to improve overall programming performance.', 45, 82.3, 1, GETDATE()),
        (@UserId, NULL, 'pace', 'low', 'Increase Study Frequency', 'Consider studying more frequently to maintain learning momentum.', 30, 75.0, 1, GETDATE());
    
    PRINT 'Inserted sample StudentRecommendations';
END

-- Insert sample StudentRiskAssessment
IF @UserId IS NOT NULL
BEGIN
    INSERT INTO StudentRiskAssessment (UserId, CourseId, RiskLevel, RiskScore, RiskFactors, PredictedOutcome, RecommendedInterventions, CreatedAt)
    VALUES 
        (@UserId, @CourseId1, 'low', 25.5, '["Consistent performance", "Regular engagement"]', 'Successful completion', '["Continue current pace", "Periodic check-ins"]', GETDATE()),
        (@UserId, @CourseId2, 'medium', 55.2, '["Declining performance", "Irregular study pattern"]', 'At risk of falling behind', '["Schedule tutoring session", "Create study schedule"]', GETDATE());
    
    PRINT 'Inserted sample StudentRiskAssessment';
END

-- Insert sample PeerComparison data
IF @UserId IS NOT NULL AND @CourseId1 IS NOT NULL
BEGIN
    INSERT INTO PeerComparison (UserId, CourseId, MetricType, UserValue, PeerAverage, PeerMedian, Percentile, SampleSize, CalculatedAt)
    VALUES 
        (@UserId, @CourseId1, 'score', 85.5, 78.2, 80.0, 72, 45, GETDATE()),
        (@UserId, @CourseId1, 'completion_rate', 75.0, 65.5, 68.0, 68, 45, GETDATE()),
        (@UserId, @CourseId1, 'time_spent', 450.0, 380.5, 400.0, 65, 45, GETDATE()),
        (@UserId, @CourseId1, 'engagement', 82.1, 71.8, 75.0, 70, 45, GETDATE());
    
    PRINT 'Inserted sample PeerComparison data';
END

PRINT 'Sample data insertion completed for Student Progress Integration testing!';