-- Create Test Adaptive Assessment
-- Run this script to quickly create an adaptive assessment for testing

DECLARE @CourseId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Courses ORDER BY CreatedAt DESC);
DECLARE @LessonId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Lessons WHERE CourseId = @CourseId ORDER BY CreatedAt DESC);
DECLARE @AssessmentId UNIQUEIDENTIFIER = NEWID();

-- Create Adaptive Assessment
INSERT INTO Assessments (
    Id, LessonId, Title, Description, Type, PassingScore, MaxAttempts, 
    TimeLimit, Instructions, CreatedAt, UpdatedAt, IsAdaptive
) VALUES (
    @AssessmentId,
    @LessonId,
    'Adaptive Math Test',
    'This is a test adaptive assessment that adjusts difficulty based on your performance.',
    'quiz',
    70,
    3,
    30,
    'Answer each question to the best of your ability. The system will adjust question difficulty based on your performance.',
    GETDATE(),
    GETDATE(),
    1  -- This makes it adaptive
);

-- Insert Easy Questions (Difficulty 2-3)
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is 2 + 2?', 'multiple_choice', '["3", "4", "5", "6"]', '4', 10, GETDATE(), GETDATE(), 2, 1, '["basic_math", "addition"]'),
(NEWID(), @AssessmentId, 'Is 5 greater than 3?', 'true_false', '["True", "False"]', 'True', 10, GETDATE(), GETDATE(), 2, 1, '["basic_math", "comparison"]'),
(NEWID(), @AssessmentId, 'What is 3 × 2?', 'multiple_choice', '["5", "6", "7", "8"]', '6', 10, GETDATE(), GETDATE(), 3, 1, '["basic_math", "multiplication"]');

-- Insert Medium Questions (Difficulty 5-6)
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is 15 × 7?', 'multiple_choice', '["95", "105", "115", "125"]', '105', 15, GETDATE(), GETDATE(), 5, 1.5, '["multiplication", "intermediate"]'),
(NEWID(), @AssessmentId, 'Solve for x: 2x + 5 = 13', 'short_answer', '[]', '4', 15, GETDATE(), GETDATE(), 6, 2, '["algebra", "equations"]'),
(NEWID(), @AssessmentId, 'What is 25% of 80?', 'multiple_choice', '["15", "20", "25", "30"]', '20', 15, GETDATE(), GETDATE(), 5, 1.5, '["percentage", "intermediate"]');

-- Insert Hard Questions (Difficulty 8-9)
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is the derivative of x² + 3x?', 'short_answer', '[]', '2x + 3', 20, GETDATE(), GETDATE(), 8, 3, '["calculus", "derivatives"]'),
(NEWID(), @AssessmentId, 'If f(x) = x³ - 2x² + x - 1, what is f(2)?', 'multiple_choice', '["1", "3", "5", "7"]', '1', 20, GETDATE(), GETDATE(), 9, 3, '["functions", "advanced"]'),
(NEWID(), @AssessmentId, 'Solve: ∫(2x + 1)dx', 'short_answer', '[]', 'x² + x + C', 20, GETDATE(), GETDATE(), 9, 3, '["calculus", "integration"]');

-- Insert Very Hard Questions (Difficulty 10)
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'Find the limit: lim(x→0) [sin(x)/x]', 'multiple_choice', '["0", "1", "∞", "undefined"]', '1', 25, GETDATE(), GETDATE(), 10, 4, '["calculus", "limits", "expert"]);

-- Display created assessment info
SELECT 
    'Assessment created successfully!' AS Message,
    @AssessmentId AS AssessmentId,
    'Adaptive Math Test' AS Title,
    COUNT(*) AS TotalQuestions
FROM Questions 
WHERE AssessmentId = @AssessmentId;

-- Show all questions with their difficulty levels
SELECT 
    QuestionText,
    QuestionType,
    Difficulty,
    AdaptiveWeight,
    Points,
    Tags
FROM Questions 
WHERE AssessmentId = @AssessmentId
ORDER BY Difficulty;

PRINT 'Adaptive assessment created! Navigate to the course and look for "Adaptive Math Test"'
PRINT 'Assessment ID: ' + CAST(@AssessmentId AS VARCHAR(36))