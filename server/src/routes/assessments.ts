import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';
import { adaptiveAssessmentService } from '../services/AdaptiveAssessmentService';
import { AssessmentFeedbackService } from '../services/AssessmentFeedbackService';

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

// GET /api/assessments/lesson/:lessonId - Get all assessments for a lesson with progress
router.get('/lesson/:lessonId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const db = DatabaseService.getInstance();

    const assessments = await db.query(`
      SELECT 
        a.Id,
        a.LessonId,
        a.Title,
        a.Type,
        a.PassingScore,
        a.MaxAttempts,
        a.TimeLimit,
        a.IsAdaptive,
        a.CreatedAt,
        a.UpdatedAt,
        COUNT(q.Id) as QuestionCount
      FROM dbo.Assessments a
      LEFT JOIN dbo.Questions q ON a.Id = q.AssessmentId
      WHERE a.LessonId = @lessonId
      GROUP BY a.Id, a.LessonId, a.Title, a.Type, a.PassingScore, a.MaxAttempts, a.TimeLimit, a.IsAdaptive, a.CreatedAt, a.UpdatedAt
      ORDER BY a.CreatedAt
    `, { lessonId });

    // For students, get progress data for each assessment
    const mappedAssessments = await Promise.all(assessments.map(async (assessment: any) => {
      const baseAssessment = {
        id: assessment.Id,
        lessonId: assessment.LessonId,
        title: assessment.Title,
        type: assessment.Type,
        passingScore: assessment.PassingScore,
        maxAttempts: assessment.MaxAttempts,
        timeLimit: assessment.TimeLimit,
        isAdaptive: assessment.IsAdaptive,
        createdAt: assessment.CreatedAt,
        updatedAt: assessment.UpdatedAt,
        questionCount: assessment.QuestionCount
      };

      // Add progress data for students
      if (userRole === 'student') {
        const userSubmissions = await db.query(`
          SELECT Id, Score, MaxScore, AttemptNumber, Status, StartedAt, CompletedAt, TimeSpent
          FROM dbo.AssessmentSubmissions 
          WHERE UserId = @userId AND AssessmentId = @assessmentId AND IsPreview = 0
          ORDER BY AttemptNumber DESC
        `, { userId, assessmentId: assessment.Id });

        const bestScore = userSubmissions.length > 0 ? Math.max(...userSubmissions.map((s: any) => s.Score || 0)) : 0;
        const latestSubmission = userSubmissions.length > 0 ? userSubmissions[0] : null;
        const completedSubmissions = userSubmissions.filter((s: any) => s.Status === 'completed');
        const passed = completedSubmissions.some((s: any) => (s.Score || 0) >= assessment.PassingScore);
        const attemptsUsed = userSubmissions.filter((s: any) => s.Status !== 'abandoned').length;
        const canTakeAssessment = attemptsUsed < assessment.MaxAttempts;

        return {
          ...baseAssessment,
          userProgress: {
            bestScore,
            latestSubmission,
            totalAttempts: userSubmissions.length,
            completedAttempts: completedSubmissions.length,
            attemptsUsed,
            attemptsLeft: Math.max(0, assessment.MaxAttempts - attemptsUsed),
            passed,
            canTakeAssessment,
            status: passed ? 'passed' : 
                   (completedSubmissions.length > 0 ? 'completed' : 
                   (latestSubmission?.Status === 'in_progress' ? 'in_progress' : 'not_started'))
          }
        };
      }

      return baseAssessment;
    }));

    res.json(mappedAssessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// GET /api/assessments/my-progress - Get student's assessment progress across all courses
router.get('/my-progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const db = DatabaseService.getInstance();

    if (userRole !== 'student') {
      return res.status(403).json({ error: 'This endpoint is only available for students' });
    }

    // Get all assessments for courses the student is enrolled in
    const assessmentsWithProgress = await db.query(`
      SELECT 
        a.Id as AssessmentId,
        a.Title as AssessmentTitle,
        a.Type as AssessmentType,
        a.PassingScore,
        a.MaxAttempts,
        a.TimeLimit,
        a.IsAdaptive,
        l.Id as LessonId,
        l.Title as LessonTitle,
        c.Id as CourseId,
        c.Title as CourseTitle,
        c.ThumbnailUrl as CourseThumbnail,
        -- Get latest submission data
        (SELECT TOP 1 Score FROM dbo.AssessmentSubmissions s 
         WHERE s.UserId = @userId AND s.AssessmentId = a.Id AND s.IsPreview = 0 
         ORDER BY s.Score DESC) as BestScore,
        (SELECT TOP 1 Status FROM dbo.AssessmentSubmissions s 
         WHERE s.UserId = @userId AND s.AssessmentId = a.Id AND s.IsPreview = 0 
         ORDER BY s.AttemptNumber DESC) as LatestStatus,
        (SELECT COUNT(*) FROM dbo.AssessmentSubmissions s 
         WHERE s.UserId = @userId AND s.AssessmentId = a.Id AND s.IsPreview = 0) as TotalAttempts,
        (SELECT COUNT(*) FROM dbo.AssessmentSubmissions s 
         WHERE s.UserId = @userId AND s.AssessmentId = a.Id AND s.Status = 'completed' AND s.IsPreview = 0) as CompletedAttempts,
        (SELECT TOP 1 CompletedAt FROM dbo.AssessmentSubmissions s 
         WHERE s.UserId = @userId AND s.AssessmentId = a.Id AND s.Status = 'completed' AND s.IsPreview = 0 
         ORDER BY s.CompletedAt DESC) as LastCompletedAt
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      JOIN dbo.Enrollments e ON c.Id = e.CourseId
      WHERE e.UserId = @userId AND e.Status = 'active'
      ORDER BY c.Title, l.OrderIndex, a.CreatedAt
    `, { userId });

    // Process and format the data
    const formattedAssessments = assessmentsWithProgress.map((item: any) => {
      const bestScore = item.BestScore || 0;
      const passed = bestScore >= item.PassingScore;
      const attemptsUsed = item.TotalAttempts || 0;
      const status = passed ? 'passed' : 
                    (item.CompletedAttempts > 0 ? 'completed' : 
                    (item.LatestStatus === 'in_progress' ? 'in_progress' : 'not_started'));

      return {
        assessmentId: item.AssessmentId,
        assessmentTitle: item.AssessmentTitle,
        assessmentType: item.AssessmentType,
        passingScore: item.PassingScore,
        maxAttempts: item.MaxAttempts,
        timeLimit: item.TimeLimit,
        isAdaptive: item.IsAdaptive,
        lessonId: item.LessonId,
        lessonTitle: item.LessonTitle,
        courseId: item.CourseId,
        courseTitle: item.CourseTitle,
        courseThumbnail: item.CourseThumbnail,
        progress: {
          bestScore,
          totalAttempts: attemptsUsed,
          completedAttempts: item.CompletedAttempts || 0,
          attemptsLeft: Math.max(0, item.MaxAttempts - attemptsUsed),
          passed,
          status,
          lastCompletedAt: item.LastCompletedAt,
          canTakeAssessment: attemptsUsed < item.MaxAttempts
        }
      };
    });

    // Group by course
    const courseGroups = formattedAssessments.reduce((acc: any, assessment: any) => {
      const courseKey = assessment.courseId;
      if (!acc[courseKey]) {
        acc[courseKey] = {
          courseId: assessment.courseId,
          courseTitle: assessment.courseTitle,
          courseThumbnail: assessment.courseThumbnail,
          assessments: []
        };
      }
      acc[courseKey].assessments.push(assessment);
      return acc;
    }, {});

    res.json({
      totalAssessments: formattedAssessments.length,
      completedAssessments: formattedAssessments.filter(a => a.progress.status === 'completed' || a.progress.status === 'passed').length,
      passedAssessments: formattedAssessments.filter(a => a.progress.status === 'passed').length,
      courseGroups: Object.values(courseGroups)
    });

  } catch (error) {
    console.error('Error fetching student assessment progress:', error);
    res.status(500).json({ error: 'Failed to fetch assessment progress' });
  }
});

// GET /api/assessments/:assessmentId/analytics - Get assessment analytics (Instructors only)
router.get('/:assessmentId/analytics', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const db = DatabaseService.getInstance();

    // Get assessment details
    const assessment = await db.query(`
      SELECT Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive, CreatedAt, UpdatedAt
      FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Get total submissions and pass rate (excluding preview submissions)
    const submissionStats = await db.query(`
      SELECT 
        COUNT(*) as totalSubmissions,
        COUNT(CASE WHEN Status = 'completed' THEN 1 END) as completedSubmissions,
        COUNT(CASE WHEN Status = 'completed' AND Score >= @passingScore THEN 1 END) as passedSubmissions,
        AVG(CASE WHEN Status = 'completed' THEN CAST(Score as FLOAT) END) as averageScore,
        AVG(CASE WHEN Status = 'completed' THEN CAST(TimeSpent as FLOAT) END) as averageTimeSpent,
        MIN(CASE WHEN Status = 'completed' THEN Score END) as minScore,
        MAX(CASE WHEN Status = 'completed' THEN Score END) as maxScore
      FROM dbo.AssessmentSubmissions 
      WHERE AssessmentId = @assessmentId AND IsPreview = 0
    `, { assessmentId, passingScore: assessment[0].PassingScore });

    const stats = submissionStats[0];
    const passRate = stats.completedSubmissions > 0 ? 
      (stats.passedSubmissions / stats.completedSubmissions) * 100 : 0;

    // Get score distribution
    const scoreDistribution = await db.query(`
      SELECT 
        CASE 
          WHEN Score >= 90 THEN '90-100'
          WHEN Score >= 80 THEN '80-89'
          WHEN Score >= 70 THEN '70-79'
          WHEN Score >= 60 THEN '60-69'
          WHEN Score >= 50 THEN '50-59'
          ELSE '0-49'
        END as scoreRange,
        COUNT(*) as count
      FROM dbo.AssessmentSubmissions 
      WHERE AssessmentId = @assessmentId AND Status = 'completed' AND IsPreview = 0
      GROUP BY 
        CASE 
          WHEN Score >= 90 THEN '90-100'
          WHEN Score >= 80 THEN '80-89'
          WHEN Score >= 70 THEN '70-79'
          WHEN Score >= 60 THEN '60-69'
          WHEN Score >= 50 THEN '50-59'
          ELSE '0-49'
        END
      ORDER BY scoreRange DESC
    `, { assessmentId });

    // Get recent submissions with student details (excluding preview submissions)
    const recentSubmissions = await db.query(`
      SELECT TOP 10
        s.Id,
        s.Score,
        s.TimeSpent,
        s.AttemptNumber,
        s.CompletedAt,
        u.FirstName + ' ' + u.LastName as StudentName,
        CASE WHEN s.Score >= @passingScore THEN 1 ELSE 0 END as Passed
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Users u ON s.UserId = u.Id
      WHERE s.AssessmentId = @assessmentId AND s.Status = 'completed' AND s.IsPreview = 0
      ORDER BY s.CompletedAt DESC
    `, { assessmentId, passingScore: assessment[0].PassingScore });

    // Get top and struggling performers (excluding preview submissions)
    const topPerformers = await db.query(`
      SELECT TOP 5
        u.FirstName + ' ' + u.LastName as StudentName,
        s.Score,
        s.AttemptNumber,
        s.TimeSpent,
        s.CompletedAt
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Users u ON s.UserId = u.Id
      WHERE s.AssessmentId = @assessmentId AND s.Status = 'completed' AND s.IsPreview = 0
      ORDER BY s.Score DESC, s.AttemptNumber ASC
    `, { assessmentId });

    const strugglingStudents = await db.query(`
      SELECT TOP 5
        u.FirstName + ' ' + u.LastName as StudentName,
        s.Score,
        s.AttemptNumber,
        s.TimeSpent,
        s.CompletedAt
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Users u ON s.UserId = u.Id
      WHERE s.AssessmentId = @assessmentId 
        AND s.Status = 'completed'
        AND s.Score < @passingScore
        AND s.IsPreview = 0
      ORDER BY s.Score ASC, s.AttemptNumber DESC
    `, { assessmentId, passingScore: assessment[0].PassingScore });

    // Get difficulty analysis by question (excluding preview submissions)
    const questionAnalysis = await db.query(`
      SELECT 
        q.Id,
        q.Question,
        q.Type,
        q.Difficulty,
        COUNT(s.Id) as totalAttempts,
        COUNT(CASE WHEN JSON_VALUE(s.Feedback, CONCAT('$."', CAST(q.Id as NVARCHAR(36)), '".isCorrect')) = 'true' THEN 1 END) as correctAnswers
      FROM dbo.Questions q
      LEFT JOIN dbo.AssessmentSubmissions s ON s.AssessmentId = q.AssessmentId 
        AND s.Status = 'completed'
        AND s.IsPreview = 0
        AND JSON_VALUE(s.Feedback, CONCAT('$."', CAST(q.Id as NVARCHAR(36)), '"')) IS NOT NULL
      WHERE q.AssessmentId = @assessmentId
      GROUP BY q.Id, q.Question, q.Type, q.Difficulty, q.OrderIndex
      ORDER BY q.OrderIndex
    `, { assessmentId });

    res.json({
      assessment: assessment[0],
      analytics: {
        totalSubmissions: stats.totalSubmissions || 0,
        completedSubmissions: stats.completedSubmissions || 0,
        passedSubmissions: stats.passedSubmissions || 0,
        passRate: parseFloat(passRate.toFixed(1)),
        averageScore: stats.averageScore ? parseFloat(stats.averageScore.toFixed(1)) : 0,
        averageTimeSpent: stats.averageTimeSpent ? parseFloat(stats.averageTimeSpent.toFixed(1)) : 0,
        minScore: stats.minScore || 0,
        maxScore: stats.maxScore || 0,
        scoreDistribution: scoreDistribution,
        recentSubmissions: recentSubmissions,
        topPerformers: topPerformers,
        strugglingStudents: strugglingStudents,
        questionAnalysis: questionAnalysis.map(q => ({
          ...q,
          successRate: q.totalAttempts > 0 ? 
            parseFloat(((q.correctAnswers / q.totalAttempts) * 100).toFixed(1)) : 0
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching assessment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch assessment analytics' });
  }
});

// GET /api/assessments/:assessmentId - Get assessment details with questions
router.get('/:assessmentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const db = DatabaseService.getInstance();

    // Get assessment details with lesson info
    const assessment = await db.query(`
      SELECT a.Id, a.LessonId, a.Title, a.Type, a.PassingScore, a.MaxAttempts, a.TimeLimit, a.IsAdaptive, a.CreatedAt, a.UpdatedAt, l.CourseId 
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE a.Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Check if student is enrolled in the course (only for students)
    if (userRole === 'student') {
      const enrollment = await db.query(`
        SELECT Id FROM dbo.Enrollments 
        WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
      `, { userId, courseId: assessment[0].CourseId });

      if (enrollment.length === 0) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    }

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
      correctAnswer: req.user?.role === 'instructor' ? 
        (q.CorrectAnswer ? JSON.parse(q.CorrectAnswer) : null) : undefined
    }));

    // Get user's previous attempts if student
    let userSubmissions: any[] = [];
    if (req.user?.role === 'student') {
      const rawSubmissions = await db.query(`
        SELECT Id, Score, MaxScore, AttemptNumber, Status, StartedAt, CompletedAt, TimeSpent
        FROM dbo.AssessmentSubmissions 
        WHERE UserId = @userId AND AssessmentId = @assessmentId
        ORDER BY AttemptNumber DESC
      `, { userId, assessmentId });
      
      // Debug: Log the TimeSpent values from database
      console.log(`[DEBUG] Assessment ${assessmentId} - Raw TimeSpent values from DB:`, 
        rawSubmissions.map(s => ({ id: s.Id, timeSpent: s.TimeSpent, attempt: s.AttemptNumber })));
      
      // Transform to match frontend interface
      userSubmissions = rawSubmissions.map((submission: any) => ({
        id: submission.Id,
        userId: userId,
        assessmentId: assessmentId,
        score: submission.Score || 0,
        maxScore: submission.MaxScore || 0,
        timeSpent: submission.TimeSpent || 0,
        attemptNumber: submission.AttemptNumber,
        status: submission.Status?.toLowerCase() || 'abandoned',
        startedAt: submission.StartedAt,
        completedAt: submission.CompletedAt,
        answers: {}, // Not needed for progress calculation
        feedback: {} // Not needed for progress calculation
      }));
    }

    const responseData = {
      id: assessment[0].Id,
      lessonId: assessment[0].LessonId,
      title: assessment[0].Title,
      type: assessment[0].Type,
      passingScore: assessment[0].PassingScore,
      maxAttempts: assessment[0].MaxAttempts,
      timeLimit: assessment[0].TimeLimit,
      isAdaptive: assessment[0].IsAdaptive,
      createdAt: assessment[0].CreatedAt,
      updatedAt: assessment[0].UpdatedAt,
      questions: parsedQuestions,
      userSubmissions: userSubmissions
    };

    // Debug: Log final response data for this specific assessment
    if (assessmentId === '372896DE-CA53-40FA-BDB4-7A486BCA1706') {
      console.log(`[DEBUG] Assessment ${assessmentId} - Final Response:`, {
        maxAttempts: responseData.maxAttempts,
        userSubmissions: responseData.userSubmissions.map(s => ({
          id: s.id,
          timeSpent: s.timeSpent,
          attemptNumber: s.attemptNumber,
          status: s.status
        }))
      });
    }

    res.json(responseData);
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
      SELECT Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive, CreatedAt, UpdatedAt
      FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    res.status(201).json(createdAssessment[0]);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// POST /api/assessments/:assessmentId/start - Start assessment attempt
router.post('/:assessmentId/start', authenticateToken, checkRole(['student', 'instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { isPreview = false } = req.body; // Accept preview mode flag
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Check if assessment exists
    const assessment = await db.query(`
      SELECT Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive, CreatedAt, UpdatedAt
      FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Skip attempt limit check for preview mode
    if (!isPreview) {
      // Check previous attempts (excluding preview attempts)
      const previousAttempts = await db.query(`
        SELECT COUNT(*) as attemptCount FROM dbo.AssessmentSubmissions 
        WHERE UserId = @userId AND AssessmentId = @assessmentId AND IsPreview = 0
      `, { userId, assessmentId });

      const attemptCount = previousAttempts[0].attemptCount;
      if (attemptCount >= assessment[0].MaxAttempts) {
        return res.status(400).json({ error: 'Maximum attempts exceeded' });
      }
    }

    // Check for existing in-progress attempt (including preview)
    const inProgress = await db.query(`
      SELECT Id FROM dbo.AssessmentSubmissions 
      WHERE UserId = @userId AND AssessmentId = @assessmentId AND Status = 'in_progress'
    `, { userId, assessmentId });

    if (inProgress.length > 0) {
      return res.json({ submissionId: inProgress[0].Id, message: 'Assessment already in progress' });
    }

    // Get attempt number (only count non-preview attempts)
    const attemptCount = isPreview ? 0 : await db.query(`
      SELECT COUNT(*) as attemptCount FROM dbo.AssessmentSubmissions 
      WHERE UserId = @userId AND AssessmentId = @assessmentId AND IsPreview = 0
    `, { userId, assessmentId }).then(result => result[0].attemptCount);

    // Create new submission
    const submissionId = uuidv4();
    await db.query(`
      INSERT INTO dbo.AssessmentSubmissions (
        Id, UserId, AssessmentId, Answers, Score, MaxScore, 
        AttemptNumber, Status, StartedAt, IsPreview
      )
      VALUES (
        @id, @userId, @assessmentId, '{}', 0, 100,
        @attemptNumber, 'in_progress', GETUTCDATE(), @isPreview
      )
    `, {
      id: submissionId,
      userId,
      assessmentId,
      attemptNumber: isPreview ? 0 : (attemptCount + 1),
      isPreview: isPreview ? 1 : 0
    });

    res.json({ 
      submissionId, 
      attemptNumber: isPreview ? 0 : (attemptCount + 1),
      isPreview 
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// Get next adaptive question
router.post('/:assessmentId/adaptive/next-question', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { submissionId, answeredQuestions, recentPerformance } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = DatabaseService.getInstance();

    // Verify this is an adaptive assessment
    const assessment = await db.query(`
      SELECT IsAdaptive FROM dbo.Assessments WHERE Id = @assessmentId
    `, { assessmentId });

    if (assessment.length === 0 || !assessment[0].IsAdaptive) {
      return res.status(400).json({ error: 'Not an adaptive assessment' });
    }

    // Get answered question IDs
    const answeredQuestionIds = answeredQuestions.map((q: any) => q.questionId);

    // Select next question using adaptive algorithm
    const nextQuestion = await adaptiveAssessmentService.selectAdaptiveQuestion(
      assessmentId,
      userId,
      answeredQuestionIds,
      recentPerformance
    );

    if (!nextQuestion) {
      return res.json({ question: null, completed: true });
    }

    // Get full question details
    const questionDetails = await db.query(`
      SELECT Id, Question, Type, Options, Difficulty, AdaptiveWeight, Tags
      FROM dbo.Questions 
      WHERE Id = @questionId
    `, { questionId: nextQuestion.questionId });

    if (questionDetails.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = questionDetails[0];
    
    res.json({
      question: {
        id: question.Id,
        question: question.Question,
        type: question.Type,
        options: question.Options ? JSON.parse(question.Options) : [],
        difficulty: question.Difficulty,
        adaptiveWeight: question.AdaptiveWeight,
        tags: question.Tags ? JSON.parse(question.Tags) : []
      },
      adaptiveInfo: {
        difficulty: nextQuestion.difficulty,
        reason: nextQuestion.reason
      },
      completed: false
    });
  } catch (error) {
    console.error('Error getting next adaptive question:', error);
    res.status(500).json({ error: 'Failed to get next question' });
  }
});

// Submit adaptive question answer
router.post('/:assessmentId/adaptive/submit-answer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { submissionId, questionId, answer, timeSpent } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = DatabaseService.getInstance();

    // Get question details for scoring
    const question = await db.query(`
      SELECT Id, Type, CorrectAnswer, Difficulty, AdaptiveWeight
      FROM dbo.Questions 
      WHERE Id = @questionId AND AssessmentId = @assessmentId
    `, { questionId, assessmentId });

    if (question.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Score the answer
    const correctAnswer = JSON.parse(question[0].CorrectAnswer);
    let isCorrect = false;
    
    if (question[0].Type === 'multiple_choice' || question[0].Type === 'true_false') {
      isCorrect = answer === correctAnswer;
    } else if (question[0].Type === 'short_answer') {
      isCorrect = answer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
    }

    // Store answer in submission's temporary data
    const currentSubmission = await db.query(`
      SELECT Answers FROM dbo.AssessmentSubmissions WHERE Id = @submissionId
    `, { submissionId });

    let currentAnswers: Record<string, any> = {};
    if (currentSubmission[0]?.Answers) {
      try {
        currentAnswers = JSON.parse(currentSubmission[0].Answers);
      } catch {}
    }

    currentAnswers[questionId] = answer;

    await db.query(`
      UPDATE dbo.AssessmentSubmissions 
      SET Answers = @answers, TimeSpent = @timeSpent
      WHERE Id = @submissionId
    `, { 
      submissionId, 
      answers: JSON.stringify(currentAnswers),
      timeSpent 
    });

    res.json({
      correct: isCorrect,
      correctAnswer: correctAnswer,
      difficulty: question[0].Difficulty,
      adaptiveWeight: question[0].AdaptiveWeight
    });
  } catch (error) {
    console.error('Error submitting adaptive answer:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// POST /api/assessments/submissions/:submissionId/submit - Submit assessment answers
router.post('/submissions/:submissionId/submit', authenticateToken, checkRole(['student', 'instructor']), async (req: AuthRequest, res: Response) => {
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

    // Calculate time spent in seconds
    const now = Date.now();
    const startedAt = new Date(submission[0].StartedAt).getTime();
    const timeSpent = Math.floor((now - startedAt) / 1000);
    
    // Debug: Log time calculation details
    console.log(`[DEBUG Time Calculation] Submission ${submissionId}:`, {
      now: new Date(now).toISOString(),
      startedAt: submission[0].StartedAt,
      startedAtParsed: new Date(startedAt).toISOString(),
      differenceMs: now - startedAt,
      timeSpentSeconds: timeSpent
    });

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

    // Transform to consistent lowercase format for frontend
    const transformedResult = {
      ...result,
      id: result.Id,
      assessmentId: result.AssessmentId,
      userId: result.UserId,
      score: result.Score,
      maxScore: result.MaxScore,
      attemptNumber: result.AttemptNumber,
      status: result.Status?.toLowerCase(),
      timeSpent: result.TimeSpent || 0, // Convert to lowercase
      startedAt: result.StartedAt,
      completedAt: result.CompletedAt,
      answers: result.Answers,
      feedback: result.Feedback,
      assessmentTitle: result.AssessmentTitle,
      passingScore: result.PassingScore
    };

    res.json(transformedResult);
  } catch (error) {
    console.error('Error fetching submission results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// PUT /api/assessments/:assessmentId - Update assessment (Instructors only)
router.put('/:assessmentId', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { title, type, passingScore, maxAttempts, timeLimit, isAdaptive, questions } = req.body;
    const db = DatabaseService.getInstance();

    // Update assessment properties
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

    // Update questions if provided
    if (questions && questions.length > 0) {
      // Delete existing questions
      await db.query(`DELETE FROM dbo.Questions WHERE AssessmentId = @assessmentId`, { assessmentId });

      // Insert updated questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        // Use existing ID if it's a real database ID, otherwise generate new UUID
        const questionId = (question.id && !question.id.startsWith('temp-')) ? question.id : uuidv4();

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

    const updatedAssessment = await db.query(`
      SELECT Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive, CreatedAt, UpdatedAt
      FROM dbo.Assessments WHERE Id = @assessmentId
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

// GET /api/assessments/:assessmentId/submissions - Get all submissions for assessment (Instructors only)
router.get('/:assessmentId/submissions', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { page = 1, limit = 50, status = 'all' } = req.query;
    const db = DatabaseService.getInstance();

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let statusFilter = '';
    if (status !== 'all') {
      statusFilter = 'AND s.Status = @status';
    }

    const submissions = await db.query(`
      SELECT 
        s.Id,
        s.Score,
        s.MaxScore,
        s.TimeSpent,
        s.AttemptNumber,
        s.Status,
        s.StartedAt,
        s.CompletedAt,
        u.FirstName + ' ' + u.LastName as StudentName,
        u.Email as StudentEmail,
        u.Id as StudentId
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Users u ON s.UserId = u.Id
      WHERE s.AssessmentId = @assessmentId ${statusFilter}
      ORDER BY s.CompletedAt DESC, s.StartedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `, { 
      assessmentId, 
      status: status !== 'all' ? status : undefined,
      offset, 
      limit: parseInt(limit as string) 
    });

    // Get total count for pagination
    const totalCount = await db.query(`
      SELECT COUNT(*) as total
      FROM dbo.AssessmentSubmissions s
      WHERE s.AssessmentId = @assessmentId ${statusFilter}
    `, { 
      assessmentId,
      status: status !== 'all' ? status : undefined
    });

    res.json({
      submissions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching assessment submissions:', error);
    res.status(500).json({ error: 'Failed to fetch assessment submissions' });
  }
});

// GET /api/assessments/submissions/:submissionId/ai-feedback - Get AI-powered feedback for assessment submission
router.get('/submissions/:submissionId/ai-feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Verify submission belongs to user or user is instructor
    const submission = await db.query(`
      SELECT TOP 1 s.*, a.Id as AssessmentId, a.Title, l.CourseId,
             c.InstructorId
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE s.Id = @submissionId
    `, { submissionId });

    if (submission.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionData = submission[0];
    
    // Fix assessmentId if it's an array (take the first value)
    const assessmentId = Array.isArray(submissionData.AssessmentId) 
      ? submissionData.AssessmentId[0] 
      : submissionData.AssessmentId;
    
    // Debug logging
    console.log('Submission data for AI feedback:', {
      submissionId,
      userId: submissionData.UserId,
      assessmentId: assessmentId,
      title: submissionData.Title,
      originalAssessmentId: submissionData.AssessmentId
    });
    
    // Check permission: student can see their own submissions, instructors can see all in their courses
    if (submissionData.UserId !== userId && submissionData.InstructorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate assessmentId
    if (!assessmentId) {
      return res.status(400).json({ 
        error: 'Invalid assessment data',
        details: 'AssessmentId is missing from submission data'
      });
    }

    // Generate AI feedback
    const feedbackService = new AssessmentFeedbackService();
    const aiFeedback = await feedbackService.generateAssessmentFeedback(
      submissionId,
      submissionData.UserId,
      assessmentId
    );

    res.json({
      submissionId,
      assessmentTitle: submissionData.Title,
      aiFeedback,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI feedback:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/assessments/submissions/:submissionId/request-ai-insights - Request additional AI insights
router.post('/submissions/:submissionId/request-ai-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { focusArea, specificQuestion } = req.body;
    const userId = req.user?.userId;
    const db = DatabaseService.getInstance();

    // Verify submission access
    const submission = await db.query(`
      SELECT s.*, a.Id as AssessmentId, a.Title, l.CourseId,
             c.InstructorId
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE s.Id = @submissionId
    `, { submissionId });

    if (submission.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionData = submission[0];
    
    if (submissionData.UserId !== userId && submissionData.InstructorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate focused AI insights based on user request
    const feedbackService = new AssessmentFeedbackService();
    
    // This could be extended to provide more targeted insights
    const insights = await feedbackService.generateAssessmentFeedback(
      submissionId,
      submissionData.UserId,
      submissionData.AssessmentId
    );

    res.json({
      submissionId,
      focusArea,
      specificQuestion,
      insights: {
        personalizedAdvice: insights.motivationalMessage,
        nextSteps: insights.overallAnalysis.nextSteps,
        studyPlan: insights.overallAnalysis.studyPlan,
        performanceInsights: insights.performanceInsights
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;