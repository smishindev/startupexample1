-- SQL Script to Create Test Adaptive Assessment
-- Run this in your SQL Server database to quickly create test data

-- First, get a lesson ID (replace with an actual lesson ID from your database)
DECLARE @LessonId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM dbo.Lessons);
DECLARE @AssessmentId UNIQUEIDENTIFIER = NEWID();

-- Create the adaptive assessment
INSERT INTO dbo.Assessments (Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive)
VALUES (@AssessmentId, @LessonId, 'Adaptive Math Test', 'quiz', 70, 3, 30, 1);

-- Add test questions with varying difficulties
INSERT INTO dbo.Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Explanation, Difficulty, Tags, AdaptiveWeight, OrderIndex)
VALUES 
-- Easy Questions (Difficulty 2-3)
(NEWID(), @AssessmentId, 'multiple_choice', 'What is 2 + 2?', 
 '["3", "4", "5", "6"]', '"4"', 'Basic addition', 2, '["basic_math", "addition"]', 1, 1),

(NEWID(), @AssessmentId, 'true_false', 'Is 5 greater than 3?', 
 '["True", "False"]', 'true', 'Basic comparison', 2, '["basic_math", "comparison"]', 1, 2),

(NEWID(), @AssessmentId, 'multiple_choice', 'What is 10 - 3?', 
 '["6", "7", "8", "9"]', '"7"', 'Basic subtraction', 3, '["basic_math", "subtraction"]', 1, 3),

-- Medium Questions (Difficulty 5-6)
(NEWID(), @AssessmentId, 'multiple_choice', 'What is 15 × 7?', 
 '["95", "105", "115", "125"]', '"105"', 'Intermediate multiplication', 5, '["multiplication", "intermediate"]', 1.5, 4),

(NEWID(), @AssessmentId, 'short_answer', 'Solve for x: 2x + 5 = 13', 
 '[]', '"4"', 'Basic algebra', 6, '["algebra", "equations"]', 2, 5),

(NEWID(), @AssessmentId, 'multiple_choice', 'What is 25% of 80?', 
 '["15", "20", "25", "30"]', '"20"', 'Percentage calculation', 5, '["percentages", "intermediate"]', 1.5, 6),

-- Hard Questions (Difficulty 8-9)
(NEWID(), @AssessmentId, 'short_answer', 'What is the derivative of x² + 3x?', 
 '[]', '"2x + 3"', 'Basic calculus derivative', 8, '["calculus", "derivatives"]', 3, 7),

(NEWID(), @AssessmentId, 'multiple_choice', 'If f(x) = x³ - 2x² + x - 1, what is f(2)?', 
 '["1", "3", "5", "7"]', '"1"', 'Function evaluation', 9, '["functions", "advanced"]', 3, 8),

(NEWID(), @AssessmentId, 'short_answer', 'Solve: ∫(2x + 1)dx', 
 '[]', '"x² + x + C"', 'Basic integration', 9, '["calculus", "integration"]', 3, 9),

-- Very Hard Questions (Difficulty 10)
(NEWID(), @AssessmentId, 'short_answer', 'Find the limit: lim(x→0) (sin(x)/x)', 
 '[]', '"1"', 'Advanced calculus limit', 10, '["calculus", "limits", "advanced"]', 4, 10);

-- Display the assessment ID for reference
SELECT 'Created Adaptive Assessment with ID: ' + CAST(@AssessmentId AS VARCHAR(36)) AS Result;
SELECT 'Assessment created in lesson: ' + CAST(@LessonId AS VARCHAR(36)) AS LessonInfo;