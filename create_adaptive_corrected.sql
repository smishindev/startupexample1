-- Create Test Adaptive Assessment (Corrected Schema)
DECLARE @CourseId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Courses ORDER BY CreatedAt DESC);
DECLARE @LessonId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM Lessons WHERE CourseId = @CourseId ORDER BY CreatedAt DESC);
DECLARE @AssessmentId UNIQUEIDENTIFIER = NEWID();

-- Create Adaptive Assessment
INSERT INTO Assessments (
    Id, LessonId, Title, Type, PassingScore, MaxAttempts, 
    TimeLimit, IsAdaptive, CreatedAt, UpdatedAt
) VALUES (
    @AssessmentId,
    @LessonId,
    'Adaptive Math Test',
    'quiz',
    70,
    3,
    30,
    1,
    GETDATE(),
    GETDATE()
);

-- Insert Easy Questions
INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'multiple_choice', 'What is 2 + 2?', '["3", "4", "5", "6"]', '4', 2, 1, '["basic_math", "addition"]', 1, GETDATE());

INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'true_false', 'Is 5 greater than 3?', '["True", "False"]', 'True', 2, 1, '["basic_math", "comparison"]', 2, GETDATE());

-- Insert Medium Questions
INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'multiple_choice', 'What is 15 x 7?', '["95", "105", "115", "125"]', '105', 5, 1.5, '["multiplication", "intermediate"]', 3, GETDATE());

INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'short_answer', 'Solve for x: 2x + 5 = 13', '[]', '4', 6, 2, '["algebra", "equations"]', 4, GETDATE());

-- Insert Hard Questions
INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'short_answer', 'What is the derivative of x squared + 3x?', '[]', '2x + 3', 8, 3, '["calculus", "derivatives"]', 5, GETDATE());

INSERT INTO Questions (Id, AssessmentId, Type, Question, Options, CorrectAnswer, Difficulty, AdaptiveWeight, Tags, OrderIndex, CreatedAt) VALUES
(NEWID(), @AssessmentId, 'multiple_choice', 'If f(x) = x cubed - 2x squared + x - 1, what is f(2)?', '["1", "3", "5", "7"]', '1', 9, 3, '["functions", "advanced"]', 6, GETDATE());

-- Show results
SELECT 'Adaptive Assessment created successfully!' AS Message;
SELECT COUNT(*) AS TotalQuestions FROM Questions WHERE AssessmentId = @AssessmentId;
SELECT 'Assessment ID: ' + CAST(@AssessmentId AS VARCHAR(40)) AS AssessmentInfo;