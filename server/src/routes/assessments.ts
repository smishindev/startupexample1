import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';
import { adaptiveAssessmentService } from '../services/AdaptiveAssessmentService';

const router = express.Router();

// Assessment Types
interface Assessment {
  id?: string;
  lessonId: string;
  title: string;
  type: 'quiz' | 'test' | 'assignment' | 'project' | 'practical';
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  isAdaptive: boolean;
}

interface Question {
  id?: string;
  assessmentId: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'code' | 'drag_drop' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
  difficulty: number;
  tags?: string[];
  adaptiveWeight?: number;
  orderIndex: number;
}

interface AssessmentSubmission {
  id?: string;
  userId: string;
  assessmentId: string;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  timeSpent: number;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  feedback?: Record<string, any>;
}

// GET /api/assessments/lesson/:lessonId - Get all assessments for a lesson
router.get('/lesson/:lessonId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const db = DatabaseService.getInstance();

    const assessments = await db.query(`
      SELECT 
        a.*,
        COUNT(q.Id) as QuestionCount
      FROM dbo.Assessments a
      LEFT JOIN dbo.Questions q ON a.Id = q.AssessmentId
      WHERE a.LessonId = @lessonId
      GROUP BY a.Id, a.LessonId, a.Title, a.Type, a.PassingScore, a.MaxAttempts, a.TimeLimit, a.IsAdaptive, a.CreatedAt, a.UpdatedAt
      ORDER BY a.CreatedAt
    `, { lessonId });

    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// GET /api/assessments/:assessmentId - Get assessment details with questions
router.get('/:assessmentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Get assessment details
    const assessment = await db.query(`
      SELECT * FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Get questions (without correct answers for students)
    const questions = await db.query(`
      SELECT 
        Id, Type, Question, Options, Explanation, Difficulty, Tags, OrderIndex
        ${req.user?.role === 'instructor' ? ', CorrectAnswer, AdaptiveWeight' : ''}
      FROM dbo.Questions 
      WHERE AssessmentId = @assessmentId 
      ORDER BY OrderIndex, CreatedAt
    `, { assessmentId });

    // Parse JSON fields
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.Options ? JSON.parse(q.Options) : null,
      tags: q.Tags ? JSON.parse(q.Tags) : [],
      correctAnswer: req.user?.role === 'instructor' ? q.CorrectAnswer : undefined
    }));

    // Get user's previous attempts if student
    let userSubmissions = [];
    if (req.user?.role === 'student') {
      userSubmissions = await db.query(`
        SELECT Id, Score, MaxScore, AttemptNumber, Status, StartedAt, CompletedAt, TimeSpent
        FROM dbo.AssessmentSubmissions 
        WHERE UserId = @userId AND AssessmentId = @assessmentId
        ORDER BY AttemptNumber DESC
      `, { userId, assessmentId });
    }

    res.json({
      ...assessment[0],
      questions: parsedQuestions,
      userSubmissions: userSubmissions
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// POST /api/assessments - Create new assessment (Instructors only)
router.post('/', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId, title, type, passingScore, maxAttempts, timeLimit, isAdaptive, questions } = req.body;
    const db = DatabaseService.getInstance();

    // Validate required fields
    if (!lessonId || !title || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const assessmentId = uuidv4();

    // Create assessment
    await db.query(`
      INSERT INTO dbo.Assessments (Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive)
      VALUES (@id, @lessonId, @title, @type, @passingScore, @maxAttempts, @timeLimit, @isAdaptive)
    `, {
      id: assessmentId,
      lessonId,
      title,
      type,
      passingScore: passingScore || 70,
      maxAttempts: maxAttempts || 3,
      timeLimit: timeLimit || null,
      isAdaptive: isAdaptive || false
    });

    // Create questions if provided
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionId = uuidv4();

        await db.query(`
          INSERT INTO dbo.Questions (
            Id, AssessmentId, Type, Question, Options, CorrectAnswer, 
            Explanation, Difficulty, Tags, AdaptiveWeight, OrderIndex
          )
          VALUES (
            @id, @assessmentId, @type, @question, @options, @correctAnswer,
            @explanation, @difficulty, @tags, @adaptiveWeight, @orderIndex
          )
        `, {
          id: questionId,
          assessmentId,
          type: question.type,
          question: question.question,
          options: question.options ? JSON.stringify(question.options) : null,
          correctAnswer: JSON.stringify(question.correctAnswer),
          explanation: question.explanation || null,
          difficulty: question.difficulty || 5,
          tags: question.tags ? JSON.stringify(question.tags) : null,
          adaptiveWeight: question.adaptiveWeight || null,
          orderIndex: i
        });
      }
    }

    // Fetch the created assessment with questions
    const createdAssessment = await db.query(`
      SELECT * FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    res.status(201).json(createdAssessment[0]);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// POST /api/assessments/:assessmentId/start - Start assessment attempt
router.post('/:assessmentId/start', authenticateToken, checkRole(['student']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Check if assessment exists
    const assessment = await db.query(`
      SELECT * FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Check previous attempts
    const previousAttempts = await db.query(`
      SELECT COUNT(*) as attemptCount FROM dbo.AssessmentSubmissions 
      WHERE UserId = @userId AND AssessmentId = @assessmentId
    `, { userId, assessmentId });

    const attemptCount = previousAttempts[0].attemptCount;
    if (attemptCount >= assessment[0].MaxAttempts) {
      return res.status(400).json({ error: 'Maximum attempts exceeded' });
    }

    // Check for existing in-progress attempt
    const inProgress = await db.query(`
      SELECT Id FROM dbo.AssessmentSubmissions 
      WHERE UserId = @userId AND AssessmentId = @assessmentId AND Status = 'in_progress'
    `, { userId, assessmentId });

    if (inProgress.length > 0) {
      return res.json({ submissionId: inProgress[0].Id, message: 'Assessment already in progress' });
    }

    // Create new submission
    const submissionId = uuidv4();
    await db.query(`
      INSERT INTO dbo.AssessmentSubmissions (
        Id, UserId, AssessmentId, Answers, Score, MaxScore, 
        AttemptNumber, Status, StartedAt
      )
      VALUES (
        @id, @userId, @assessmentId, '{}', 0, 100,
        @attemptNumber, 'in_progress', GETUTCDATE()
      )
    `, {
      id: submissionId,
      userId,
      assessmentId,
      attemptNumber: attemptCount + 1
    });

    res.json({ submissionId, attemptNumber: attemptCount + 1 });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// POST /api/assessments/submissions/:submissionId/submit - Submit assessment answers
router.post('/submissions/:submissionId/submit', authenticateToken, checkRole(['student']), async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { answers } = req.body;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Get submission details with assessment info
    const submission = await db.query(`
      SELECT s.*, a.PassingScore, a.TimeLimit, a.IsAdaptive, l.CourseId
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE s.Id = @submissionId AND s.UserId = @userId
    `, { submissionId, userId });

    if (submission.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission[0].Status !== 'in_progress') {
      return res.status(400).json({ error: 'Submission is not in progress' });
    }

    // Calculate time spent
    const timeSpent = Math.floor((Date.now() - new Date(submission[0].StartedAt).getTime()) / (1000 * 60));

    // Get questions with correct answers
    const questions = await db.query(`
      SELECT Id, Type, CorrectAnswer, Difficulty
      FROM dbo.Questions 
      WHERE AssessmentId = @assessmentId 
      ORDER BY OrderIndex
    `, { assessmentId: submission[0].AssessmentId });

    // Use adaptive scoring if assessment is adaptive
    if (submission[0].IsAdaptive) {
      try {
        const adaptiveScoring = await adaptiveAssessmentService.calculateAdaptiveScore(
          submission[0].AssessmentId,
          userId!,
          answers,
          timeSpent
        );

        const finalScore = Math.round(adaptiveScoring.finalScore);

        // Update submission with adaptive scoring
        await db.query(`
          UPDATE dbo.AssessmentSubmissions 
          SET 
            Answers = @answers,
            Score = @score,
            MaxScore = @maxScore,
            TimeSpent = @timeSpent,
            Status = 'completed',
            CompletedAt = GETUTCDATE(),
            Feedback = @feedback
          WHERE Id = @submissionId
        `, {
          submissionId,
          answers: JSON.stringify(answers),
          score: finalScore,
          maxScore: 100,
          timeSpent,
          feedback: JSON.stringify({
            adaptiveScoring,
            recommendations: await adaptiveAssessmentService.generateLearningRecommendations(
              userId!,
              submission[0].AssessmentId,
              adaptiveScoring
            )
          })
        });

        // Update user skill profile
        await adaptiveAssessmentService.updateUserSkillProfile(
          userId!,
          submission[0].CourseId || '',
          adaptiveScoring.skillUpdates
        );

        return res.json({
          score: finalScore,
          maxScore: 100,
          passed: finalScore >= submission[0].PassingScore,
          timeSpent,
          adaptiveScoring,
          recommendations: await adaptiveAssessmentService.generateLearningRecommendations(
            userId!,
            submission[0].AssessmentId,
            adaptiveScoring
          )
        });
      } catch (adaptiveError) {
        console.error('Adaptive scoring failed, falling back to basic scoring:', adaptiveError);
        // Fall through to basic scoring
      }
    }

    // Basic scoring logic (fallback or for non-adaptive assessments)
    let totalScore = 0;
    let maxScore = questions.length * 100; // 100 points per question
    const feedback: Record<string, any> = {};

    for (const question of questions) {
      const userAnswer = answers[question.Id];
      const correctAnswer = JSON.parse(question.CorrectAnswer);
      
      let isCorrect = false;
      
      // Simple scoring logic (can be enhanced)
      if (question.Type === 'multiple_choice' || question.Type === 'true_false') {
        isCorrect = userAnswer === correctAnswer;
      } else if (question.Type === 'short_answer') {
        isCorrect = userAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
      }
      // Add more scoring logic for other question types

      if (isCorrect) {
        totalScore += 100;
      }

      feedback[question.Id] = {
        userAnswer,
        correctAnswer,
        isCorrect,
        score: isCorrect ? 100 : 0
      };
    }

    const finalScore = Math.round((totalScore / maxScore) * 100);

    // Update submission
    await db.query(`
      UPDATE dbo.AssessmentSubmissions 
      SET 
        Answers = @answers,
        Score = @score,
        MaxScore = @maxScore,
        TimeSpent = @timeSpent,
        Status = 'completed',
        CompletedAt = GETUTCDATE(),
        Feedback = @feedback
      WHERE Id = @submissionId
    `, {
      submissionId,
      answers: JSON.stringify(answers),
      score: finalScore,
      maxScore: 100,
      timeSpent,
      feedback: JSON.stringify(feedback)
    });

    // Update user progress if passed
    if (finalScore >= submission[0].PassingScore) {
      // Update lesson progress logic here
      // This would integrate with existing progress tracking
    }

    res.json({
      score: finalScore,
      maxScore: 100,
      passed: finalScore >= submission[0].PassingScore,
      timeSpent,
      feedback
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// GET /api/assessments/submissions/:submissionId/results - Get submission results
router.get('/submissions/:submissionId/results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    const submission = await db.query(`
      SELECT 
        s.*,
        a.Title as AssessmentTitle,
        a.PassingScore
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      WHERE s.Id = @submissionId AND (s.UserId = @userId OR @userRole = 'instructor')
    `, { submissionId, userId, userRole: req.user?.role });

    if (submission.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const result = submission[0];
    result.Answers = JSON.parse(result.Answers);
    result.Feedback = result.Feedback ? JSON.parse(result.Feedback) : {};

    res.json(result);
  } catch (error) {
    console.error('Error fetching submission results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// PUT /api/assessments/:assessmentId - Update assessment (Instructors only)
router.put('/:assessmentId', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { title, type, passingScore, maxAttempts, timeLimit, isAdaptive } = req.body;
    const db = DatabaseService.getInstance();

    await db.query(`
      UPDATE dbo.Assessments 
      SET 
        Title = @title,
        Type = @type,
        PassingScore = @passingScore,
        MaxAttempts = @maxAttempts,
        TimeLimit = @timeLimit,
        IsAdaptive = @isAdaptive,
        UpdatedAt = GETUTCDATE()
      WHERE Id = @assessmentId
    `, {
      assessmentId,
      title,
      type,
      passingScore,
      maxAttempts,
      timeLimit,
      isAdaptive
    });

    const updatedAssessment = await db.query(`
      SELECT * FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    res.json(updatedAssessment[0]);
  } catch (error) {
    console.error('Error updating assessment:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// DELETE /api/assessments/:assessmentId - Delete assessment (Instructors only)
router.delete('/:assessmentId', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const db = DatabaseService.getInstance();

    // Delete questions and submissions (cascade should handle this, but being explicit)
    await db.query(`DELETE FROM dbo.Questions WHERE AssessmentId = @assessmentId`, { assessmentId });
    await db.query(`DELETE FROM dbo.AssessmentSubmissions WHERE AssessmentId = @assessmentId`, { assessmentId });
    await db.query(`DELETE FROM dbo.Assessments WHERE Id = @assessmentId`, { assessmentId });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

export default router;