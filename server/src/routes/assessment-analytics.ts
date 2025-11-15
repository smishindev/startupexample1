import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { AuthRequest, authenticateToken, authorize } from '../middleware/auth';

const router = Router();
const db = DatabaseService.getInstance();

// GET /api/assessment-analytics/instructor/overview - Cross-assessment analytics overview
router.get('/instructor/overview', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const instructorId = req.user!.userId;

    // Get instructor's courses to filter assessments
    const instructorCourses = await db.query(`
      SELECT Id FROM dbo.Courses WHERE InstructorId = @instructorId AND IsPublished = 1
    `, { instructorId });

    if (instructorCourses.length === 0) {
      return res.json({
        overview: {
          totalAssessments: 0,
          totalSubmissions: 0,
          overallPassRate: 0,
          averageScore: 0,
          totalActiveStudents: 0,
          assessmentsThisMonth: 0
        },
        assessmentTypes: [],
        performanceTrends: [],
        topPerformingAssessments: [],
        strugglingAreas: []
      });
    }

    const courseIds = instructorCourses.map(c => c.Id);
    const courseIdsList = courseIds.map(id => `'${id}'`).join(',');

    // Overall assessment statistics
    const overviewStats = await db.query(`
      SELECT 
        COUNT(DISTINCT a.Id) as totalAssessments,
        COUNT(DISTINCT s.Id) as totalSubmissions,
        COUNT(DISTINCT s.UserId) as totalActiveStudents,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as averageScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as overallPassRate,
        COUNT(CASE WHEN a.CreatedAt >= DATEADD(month, -1, GETUTCDATE()) THEN 1 END) as assessmentsThisMonth
      FROM dbo.Assessments a
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND s.IsPreview = 0
      LEFT JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE l.CourseId IN (${courseIdsList})
    `);

    // Assessment types breakdown
    const assessmentTypes = await db.query(`
      SELECT 
        a.Type,
        COUNT(DISTINCT a.Id) as count,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as passRate,
        COUNT(DISTINCT s.UserId) as activeStudents
      FROM dbo.Assessments a
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND s.IsPreview = 0
      LEFT JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE l.CourseId IN (${courseIdsList})
      GROUP BY a.Type
      ORDER BY count DESC
    `);

    // Performance trends over last 6 months
    const performanceTrends = await db.query(`
      SELECT 
        FORMAT(s.CompletedAt, 'yyyy-MM') as month,
        COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) as submissions,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as passRate
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      WHERE l.CourseId IN (${courseIdsList})
        AND s.CompletedAt >= DATEADD(month, -6, GETUTCDATE())
        AND s.Status = 'completed'
      GROUP BY FORMAT(s.CompletedAt, 'yyyy-MM')
      ORDER BY month DESC
    `);

    // Top performing assessments
    const topPerformingAssessments = await db.query(`
      SELECT TOP 5
        a.Id,
        a.Title,
        a.Type,
        c.Title as courseTitle,
        COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) as submissions,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as passRate
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND s.IsPreview = 0
      WHERE c.Id IN (${courseIdsList})
      GROUP BY a.Id, a.Title, a.Type, c.Title
      HAVING COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) >= 3
      ORDER BY passRate DESC, avgScore DESC
    `);

    // Struggling areas (low-performing assessments)
    const strugglingAreas = await db.query(`
      SELECT TOP 5
        a.Id,
        a.Title,
        a.Type,
        c.Title as courseTitle,
        COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) as submissions,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as passRate,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score < a.PassingScore THEN 1 END) as failedAttempts
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND s.IsPreview = 0
      WHERE c.Id IN (${courseIdsList})
      GROUP BY a.Id, a.Title, a.Type, c.Title
      HAVING COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) >= 3
      ORDER BY passRate ASC, failedAttempts DESC
    `);

    const overview = overviewStats[0] || {
      totalAssessments: 0,
      totalSubmissions: 0,
      overallPassRate: 0,
      averageScore: 0,
      totalActiveStudents: 0,
      assessmentsThisMonth: 0
    };

    res.json({
      overview: {
        totalAssessments: overview.totalAssessments || 0,
        totalSubmissions: overview.totalSubmissions || 0,
        overallPassRate: Math.round(overview.overallPassRate || 0),
        averageScore: Math.round(overview.averageScore || 0),
        totalActiveStudents: overview.totalActiveStudents || 0,
        assessmentsThisMonth: overview.assessmentsThisMonth || 0
      },
      assessmentTypes: assessmentTypes.map(type => ({
        ...type,
        avgScore: Math.round(type.avgScore || 0),
        passRate: Math.round(type.passRate || 0)
      })),
      performanceTrends: performanceTrends.map(trend => ({
        ...trend,
        avgScore: Math.round(trend.avgScore || 0),
        passRate: Math.round(trend.passRate || 0)
      })),
      topPerformingAssessments: topPerformingAssessments.map(assessment => ({
        ...assessment,
        avgScore: Math.round(assessment.avgScore || 0),
        passRate: Math.round(assessment.passRate || 0)
      })),
      strugglingAreas: strugglingAreas.map(area => ({
        ...area,
        avgScore: Math.round(area.avgScore || 0),
        passRate: Math.round(area.passRate || 0)
      }))
    });

  } catch (error) {
    console.error('Error fetching cross-assessment analytics:', error);
    res.status(500).json({ error: 'Failed to fetch assessment analytics overview' });
  }
});

// GET /api/assessment-analytics/student-performance/:courseId - Detailed student performance across assessments
router.get('/student-performance/:courseId', authenticateToken, authorize(['instructor']), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user!.userId;

    // Verify instructor owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @instructorId',
      { courseId, instructorId }
    );

    if (courseCheck.length === 0) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    // Get detailed student performance across all assessments in the course
    const studentPerformance = await db.query(`
      SELECT 
        u.Id as userId,
        u.FirstName + ' ' + u.LastName as studentName,
        u.Email,
        COUNT(DISTINCT a.Id) as totalAssessments,
        COUNT(DISTINCT CASE WHEN s.Status = 'completed' THEN s.AssessmentId END) as completedAssessments,
        COUNT(DISTINCT CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN s.AssessmentId END) as passedAssessments,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        SUM(CASE WHEN s.Status = 'completed' THEN s.TimeSpent ELSE 0 END) as totalTimeSpent,
        MAX(s.CompletedAt) as lastActivityAt,
        -- Progress calculation
        COUNT(DISTINCT CASE WHEN s.Status = 'completed' THEN s.AssessmentId END) * 100.0 / 
          NULLIF(COUNT(DISTINCT a.Id), 0) as progressPercentage
      FROM dbo.Users u
      JOIN dbo.Enrollments e ON u.Id = e.UserId
      JOIN dbo.Lessons l ON l.CourseId = e.CourseId
      JOIN dbo.Assessments a ON l.Id = a.LessonId
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND u.Id = s.UserId AND s.IsPreview = 0
      WHERE e.CourseId = @courseId AND e.Status = 'active' AND u.Role = 'student'
      GROUP BY u.Id, u.FirstName, u.LastName, u.Email
      ORDER BY progressPercentage DESC, avgScore DESC
    `, { courseId });

    // Get assessment difficulty analysis
    const assessmentDifficulty = await db.query(`
      SELECT 
        a.Id,
        a.Title,
        a.Type,
        COUNT(CASE WHEN s.Status = 'completed' THEN 1 END) as attempts,
        AVG(CASE WHEN s.Status = 'completed' THEN CAST(s.Score as FLOAT) END) as avgScore,
        COUNT(CASE WHEN s.Status = 'completed' AND s.Score >= a.PassingScore THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN s.Status = 'completed' THEN 1 END), 0) as passRate,
        AVG(CASE WHEN s.Status = 'completed' THEN s.AttemptNumber END) as avgAttempts,
        AVG(CASE WHEN s.Status = 'completed' THEN s.TimeSpent END) as avgTimeSpent
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      LEFT JOIN dbo.AssessmentSubmissions s ON a.Id = s.AssessmentId AND s.IsPreview = 0
      WHERE l.CourseId = @courseId
      GROUP BY a.Id, a.Title, a.Type
      ORDER BY passRate ASC
    `, { courseId });

    res.json({
      studentPerformance: studentPerformance.map(student => ({
        ...student,
        avgScore: Math.round(student.avgScore || 0),
        progressPercentage: Math.round(student.progressPercentage || 0)
      })),
      assessmentDifficulty: assessmentDifficulty.map(assessment => ({
        ...assessment,
        avgScore: Math.round(assessment.avgScore || 0),
        passRate: Math.round(assessment.passRate || 0),
        avgAttempts: Math.round(assessment.avgAttempts || 0),
        avgTimeSpent: Math.round(assessment.avgTimeSpent || 0)
      }))
    });

  } catch (error) {
    console.error('Error fetching student performance analytics:', error);
    res.status(500).json({ error: 'Failed to fetch student performance data' });
  }
});

// GET /api/assessment-analytics/learning-insights/:studentId - Student learning insights and recommendations
router.get('/learning-insights/:studentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const currentUserId = req.user!.userId;
    const userRole = req.user!.role;

    // Check permissions: students can only view their own data, instructors can view their students
    if (userRole === 'student' && currentUserId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (userRole === 'instructor') {
      // Verify instructor has access to this student (through course enrollment)
      const accessCheck = await db.query(`
        SELECT COUNT(*) as hasAccess
        FROM dbo.Enrollments e
        JOIN dbo.Courses c ON e.CourseId = c.Id
        WHERE e.UserId = @studentId AND c.InstructorId = @instructorId AND e.Status = 'active'
      `, { studentId, instructorId: currentUserId });

      if (accessCheck[0].hasAccess === 0) {
        return res.status(403).json({ error: 'Access denied to this student\'s data' });
      }
    }

    // Get student's assessment performance patterns
    const performancePatterns = await db.query(`
      SELECT 
        a.Type as assessmentType,
        COUNT(*) as totalAttempts,
        AVG(CAST(s.Score as FLOAT)) as avgScore,
        COUNT(CASE WHEN s.Score >= a.PassingScore THEN 1 END) * 100.0 / COUNT(*) as passRate,
        AVG(s.TimeSpent) as avgTimeSpent,
        AVG(s.AttemptNumber) as avgAttemptsNeeded
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      WHERE s.UserId = @studentId AND s.Status = 'completed' AND s.IsPreview = 0
      GROUP BY a.Type
    `, { studentId });

    // Get recent performance trend
    const recentTrend = await db.query(`
      SELECT TOP 10
        s.Score,
        s.CompletedAt,
        a.Title as assessmentTitle,
        a.Type as assessmentType,
        CASE WHEN s.Score >= a.PassingScore THEN 1 ELSE 0 END as passed
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      WHERE s.UserId = @studentId AND s.Status = 'completed' AND s.IsPreview = 0
      ORDER BY s.CompletedAt DESC
    `, { studentId });

    // Get areas needing improvement
    const improvementAreas = await db.query(`
      SELECT 
        a.Type,
        a.Title,
        s.Score,
        a.PassingScore,
        s.AttemptNumber,
        c.Title as courseTitle
      FROM dbo.AssessmentSubmissions s
      JOIN dbo.Assessments a ON s.AssessmentId = a.Id
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE s.UserId = @studentId 
        AND s.Status = 'completed' 
        AND s.Score < a.PassingScore 
        AND s.IsPreview = 0
      ORDER BY (a.PassingScore - s.Score) DESC
    `, { studentId });

    // Generate insights and recommendations
    const insights: {
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    } = {
      strengths: [],
      weaknesses: [],
      recommendations: []
    };

    // Analyze patterns for insights
    for (const pattern of performancePatterns) {
      if (pattern.passRate >= 80) {
        insights.strengths.push(`Strong performance in ${pattern.assessmentType} assessments (${Math.round(pattern.passRate)}% pass rate)`);
      } else if (pattern.passRate < 60) {
        insights.weaknesses.push(`Needs improvement in ${pattern.assessmentType} assessments (${Math.round(pattern.passRate)}% pass rate)`);
        
        if (pattern.avgAttemptsNeeded > 2) {
          insights.recommendations.push(`Focus on preparation for ${pattern.assessmentType} assessments - average attempts needed: ${Math.round(pattern.avgAttemptsNeeded)}`);
        }
        
        if (pattern.avgTimeSpent < 10) {
          insights.recommendations.push(`Spend more time on ${pattern.assessmentType} assessments - rushing may be affecting performance`);
        }
      }
    }

    // Add specific recommendations based on improvement areas
    if (improvementAreas.length > 0) {
      const topIssue = improvementAreas[0];
      insights.recommendations.push(`Priority: Review ${topIssue.courseTitle} - ${topIssue.Title} (scored ${topIssue.Score}%, need ${topIssue.PassingScore}%)`);
    }

    res.json({
      performancePatterns: performancePatterns.map(p => ({
        ...p,
        avgScore: Math.round(p.avgScore || 0),
        passRate: Math.round(p.passRate || 0),
        avgTimeSpent: Math.round(p.avgTimeSpent || 0),
        avgAttemptsNeeded: Math.round(p.avgAttemptsNeeded || 0)
      })),
      recentTrend,
      improvementAreas,
      insights
    });

  } catch (error) {
    console.error('Error fetching learning insights:', error);
    res.status(500).json({ error: 'Failed to fetch learning insights' });
  }
});

export default router;