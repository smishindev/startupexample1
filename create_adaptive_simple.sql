-- Create Test Adaptive Assessment (Simple Version)
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
    1
);

-- Insert Easy Questions
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is 2 + 2?', 'multiple_choice', '["3", "4", "5", "6"]', '4', 10, GETDATE(), GETDATE(), 2, 1, '["basic_math", "addition"]');

INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'Is 5 greater than 3?', 'true_false', '["True", "False"]', 'True', 10, GETDATE(), GETDATE(), 2, 1, '["basic_math", "comparison"]');

-- Insert Medium Questions
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is 15 x 7?', 'multiple_choice', '["95", "105", "115", "125"]', '105', 15, GETDATE(), GETDATE(), 5, 1.5, '["multiplication", "intermediate"]');

INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'Solve for x: 2x + 5 = 13', 'short_answer', '[]', '4', 15, GETDATE(), GETDATE(), 6, 2, '["algebra", "equations"]');

-- Insert Hard Questions
INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'What is the derivative of x squared + 3x?', 'short_answer', '[]', '2x + 3', 20, GETDATE(), GETDATE(), 8, 3, '["calculus", "derivatives"]');

INSERT INTO Questions (Id, AssessmentId, QuestionText, QuestionType, Options, CorrectAnswer, Points, CreatedAt, UpdatedAt, Difficulty, AdaptiveWeight, Tags) VALUES
(NEWID(), @AssessmentId, 'If f(x) = x cubed - 2x squared + x - 1, what is f(2)?', 'multiple_choice', '["1", "3", "5", "7"]', '1', 20, GETDATE(), GETDATE(), 9, 3, '["functions", "advanced"]');

-- Show results
SELECT 'Assessment created successfully!' AS Message;
SELECT COUNT(*) AS TotalQuestions FROM Questions WHERE AssessmentId = @AssessmentId;