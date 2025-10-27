import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = express.Router();
const dbService = DatabaseService.getInstance();

// GET /api/student-progress/analytics/me - Get current user's progress analytics
router.get('/analytics/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get basic progress data
    const basicProgressQuery = `
      SELECT 
        COUNT(DISTINCT e.CourseId) as totalCourses,
        COUNT(DISTINCT CASE WHEN cp.OverallProgress = 100 THEN e.CourseId END) as completedCourses,
        COUNT(DISTINCT CASE WHEN cp.OverallProgress > 0 AND cp.OverallProgress < 100 THEN e.CourseId END) as inProgressCourses,
        AVG(CAST(cp.OverallProgress as FLOAT)) as averageCompletion,
        SUM(CAST(cp.TimeSpent as FLOAT)) / 60.0 as totalTimeSpent
      FROM Enrollments e
      LEFT JOIN CourseProgress cp ON e.CourseId = cp.CourseId AND e.UserId = cp.UserId
      WHERE e.UserId = @userId AND e.Status = 'active'
    `;

    const basicProgress = await dbService.query(basicProgressQuery, { userId });

    // Check if user has any enrollments - if not, return empty/null to show proper empty state
    const totalCourses = basicProgress[0]?.totalCourses || 0;
    if (totalCourses === 0) {
      // No enrollments - return null to trigger empty state in UI
      return res.status(200).json(null);
    }

    // Get performance insights
    const performanceQuery = `
      SELECT 
        AVG(CAST(asub.Score as FLOAT)) as avgScore,
        COUNT(DISTINCT asub.AssessmentId) as totalAssessments,
        COUNT(DISTINCT CASE WHEN asub.Score >= a.PassingScore THEN asub.AssessmentId END) as passedAssessments,
        AVG(CASE WHEN asub.Score >= a.PassingScore THEN 1.0 ELSE 0.0 END) as passRate,
        COUNT(*) as totalAttempts
      FROM AssessmentSubmissions asub
      JOIN Assessments a ON asub.AssessmentId = a.Id
      JOIN Lessons l ON a.LessonId = l.Id
      JOIN Courses c ON l.CourseId = c.Id
      JOIN Enrollments e ON c.Id = e.CourseId
      WHERE e.UserId = @userId AND e.Status = 'active'
        AND asub.CompletedAt >= DATEADD(day, -90, GETDATE())
        AND asub.CompletedAt IS NOT NULL
    `;

    const performance = await dbService.query(performanceQuery, { userId });

    // Get recent activity trend (last 4 weeks)
    const activityQuery = `
      SELECT 
        DATEPART(week, asub.CompletedAt) as weekNumber,
        COUNT(*) as assessmentsTaken,
        AVG(CAST(asub.Score as FLOAT)) as avgScore,
        COUNT(DISTINCT l.CourseId) as activeCourses
      FROM AssessmentSubmissions asub
      JOIN Assessments a ON asub.AssessmentId = a.Id
      JOIN Lessons l ON a.LessonId = l.Id
      JOIN Enrollments e ON l.CourseId = e.CourseId
      WHERE e.UserId = @userId 
        AND asub.CompletedAt >= DATEADD(week, -4, GETDATE())
        AND asub.CompletedAt IS NOT NULL
      GROUP BY DATEPART(week, asub.CompletedAt)
      ORDER BY weekNumber DESC
    `;

    const activityTrend = await dbService.query(activityQuery, { userId });

    // Calculate performance insights
    const performanceData = performance[0] || {};
    const avgScore = performanceData.avgScore || 0;
    const passRate = performanceData.passRate || 0;
    const totalAttempts = performanceData.totalAttempts || 0;

    // Determine trends and risk factors
    let overallTrend = 'stable';
    let riskLevel = 'low';
    const riskFactors = [];
    const strugglingAreas = [];
    const strengthAreas = [];

    if (activityTrend.length >= 2) {
      const recentAvg = activityTrend.slice(0, 2).reduce((sum: number, week: any) => sum + (week.avgScore || 0), 0) / 2;
      const olderAvg = activityTrend.slice(2).reduce((sum: number, week: any) => sum + (week.avgScore || 0), 0) / Math.max(activityTrend.length - 2, 1);
      
      if (recentAvg > olderAvg + 5) overallTrend = 'improving';
      else if (recentAvg < olderAvg - 5) overallTrend = 'declining';
    }

    if (passRate < 0.6) {
      riskLevel = 'high';
      riskFactors.push('Low assessment pass rate');
      strugglingAreas.push('Assessment performance');
    } else if (passRate < 0.8) {
      riskLevel = 'medium';
      riskFactors.push('Moderate assessment struggles');
    }

    if (avgScore > 85) {
      strengthAreas.push('High academic performance');
    } else if (avgScore > 70) {
      strengthAreas.push('Consistent academic progress');
    } else {
      strugglingAreas.push('Academic performance needs attention');
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // Calculate engagement and consistency scores
    const consistencyScore = Math.min(100, (activityTrend.length / 4) * 100);
    const engagementScore = Math.min(100, totalAttempts * 10);

    // Generate learning velocity (assessments per week)
    const learningVelocity = totalAttempts / 4;

    // Generate intervention suggestions
    const suggestedInterventions = [];
    if (riskLevel === 'high') {
      suggestedInterventions.push('Schedule one-on-one tutoring session');
      suggestedInterventions.push('Review fundamental concepts');
    }
    if (passRate < 0.7) {
      suggestedInterventions.push('Focus on test-taking strategies');
    }
    if (consistencyScore < 50) {
      suggestedInterventions.push('Establish regular study schedule');
    }

    const result = {
      basicProgress: {
        totalCourses: basicProgress[0]?.totalCourses || 0,
        completedCourses: basicProgress[0]?.completedCourses || 0,
        inProgressCourses: basicProgress[0]?.inProgressCourses || 0,
        totalTimeSpent: basicProgress[0]?.totalTimeSpent || 0,
        averageCompletion: Math.round(basicProgress[0]?.averageCompletion || 0)
      },
      performanceInsights: {
        overallTrend,
        learningVelocity: Math.round(learningVelocity * 10) / 10,
        consistencyScore: Math.round(consistencyScore),
        engagementScore: Math.round(engagementScore),
        riskLevel,
        riskFactors,
        strengthAreas,
        strugglingAreas,
        suggestedInterventions
      },
      adaptivePaths: [], // Will be populated by separate endpoint
      recentRecommendations: [], // Will be populated by recommendations endpoint
      skillMap: [], // Will be populated by skills endpoint
      achievementMilestones: {
        completed: basicProgress[0]?.completedCourses || 0,
        inProgress: basicProgress[0]?.inProgressCourses || 0,
        upcoming: Math.max(0, (basicProgress[0]?.totalCourses || 0) - (basicProgress[0]?.completedCourses || 0) - (basicProgress[0]?.inProgressCourses || 0))
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Error getting student progress analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student-progress/analytics/:studentId - Get specific student's progress (instructor only)
router.get('/analytics/:studentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    const requestingUserId = req.user?.userId;
    
    // Verify instructor has access to this student
    const accessQuery = `
      SELECT DISTINCT e.UserId
      FROM Enrollments e
      JOIN Courses c ON e.CourseId = c.Id
      WHERE c.InstructorId = @instructorId AND e.UserId = @studentId
    `;
    
    const access = await dbService.query(accessQuery, { 
      instructorId: requestingUserId, 
      studentId 
    });

    if (access.length === 0) {
      return res.status(403).json({ error: 'Access denied to this student data' });
    }

    // Use similar logic as /me endpoint but for specific student
    // ... (implement similar logic with studentId instead of userId)
    
    res.json({ message: 'Student analytics for instructor view - implementation needed' });

  } catch (error) {
    console.error('Error getting student analytics for instructor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student-progress/recommendations - Get personalized recommendations
router.post('/recommendations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { courseId, assessmentResults, learningPreferences } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get student's recent performance
    const performanceQuery = `
      SELECT TOP 10
        a.Id as assessmentId,
        a.Title,
        a.Type,
        asub.Score,
        a.PassingScore,
        c.Title as courseTitle,
        c.Id as courseId,
        asub.CompletedAt,
        asub.AttemptNumber
      FROM AssessmentSubmissions asub
      JOIN Assessments a ON asub.AssessmentId = a.Id
      JOIN Lessons l ON a.LessonId = l.Id
      JOIN Courses c ON l.CourseId = c.Id
      JOIN Enrollments e ON c.Id = e.CourseId
      WHERE e.UserId = @userId
        AND asub.CompletedAt IS NOT NULL
        ${courseId ? 'AND c.Id = @courseId' : ''}
      ORDER BY asub.CompletedAt DESC
    `;

    const recentPerformance = await dbService.query(performanceQuery, 
      courseId ? { userId, courseId } : { userId }
    );

    // If no performance data exists, return empty recommendations
    if (recentPerformance.length === 0) {
      return res.json([]);
    }

    // Generate recommendations based on performance patterns
    const recommendations = [];
    let recommendationId = 1;

    // Analyze performance and generate recommendations
    for (const assessment of recentPerformance) {
      if (assessment.Score < assessment.PassingScore) {
        recommendations.push({
          id: `rec_${recommendationId++}`,
          type: 'review',
          priority: 'high',
          title: `Review ${assessment.Title}`,
          description: `You scored ${assessment.Score}% but need ${assessment.PassingScore}% to pass`,
          actionText: 'Study Content',
          courseId: assessment.courseId,
          assessmentId: assessment.assessmentId,
          estimatedTime: 30,
          reason: `Score below passing threshold (${assessment.Score}% < ${assessment.PassingScore}%)`
        });
      }
    }

    // Add skill-based recommendations
    const avgScore = recentPerformance.reduce((sum: number, a: any) => sum + a.Score, 0) / Math.max(recentPerformance.length, 1);
    
    if (avgScore < 75) {
      recommendations.push({
        id: `rec_${recommendationId++}`,
        type: 'practice',
        priority: 'high',
        title: 'Additional Practice Sessions',
        description: 'Your average score suggests you would benefit from more practice',
        actionText: 'Start Practice',
        estimatedTime: 45,
        reason: `Average assessment score is ${Math.round(avgScore)}%, indicating need for reinforcement`
      });
    }

    // Add content recommendations based on weak areas
    const weakCourses = recentPerformance
      .filter((a: any) => a.Score < 70)
      .reduce((acc: any, a: any) => {
        acc[a.courseTitle] = (acc[a.courseTitle] || 0) + 1;
        return acc;
      }, {});

    Object.entries(weakCourses).forEach(([courseTitle, count]) => {
      if ((count as number) >= 2) {
        recommendations.push({
          id: `rec_${recommendationId++}`,
          type: 'content',
          priority: 'medium',
          title: `Review ${courseTitle} Fundamentals`,
          description: `Multiple assessments below 70% in this course`,
          actionText: 'Review Course',
          estimatedTime: 60,
          reason: `${count} assessments with scores below 70% in ${courseTitle}`
        });
      }
    });

    // Add general improvement recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        id: `rec_${recommendationId++}`,
        type: 'practice',
        priority: 'low',
        title: 'Continue Your Learning Journey',
        description: 'You\'re doing well! Consider taking on more challenging content',
        actionText: 'Explore Advanced Topics',
        estimatedTime: 30,
        reason: 'Maintaining good performance, ready for advancement'
      });
    }

    res.json(recommendations);

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student-progress/track-activity - Track learning activity
router.post('/track-activity', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { type, resourceId, courseId, timeSpent, performance, engagement } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Log the learning activity (you might want to create a LearningActivities table)
    const activityQuery = `
      INSERT INTO LearningActivities (
        UserId, ActivityType, ResourceId, CourseId, 
        TimeSpent, Score, AccuracyRate, CompletionRate,
        AttentionScore, InteractionCount, CreatedAt
      ) VALUES (
        @userId, @type, @resourceId, @courseId, 
        @timeSpent, @score, @accuracy, @completionRate,
        @attentionScore, @interactionCount, GETDATE()
      )
    `;

    try {
      await dbService.query(activityQuery, {
        userId,
        type,
        resourceId,
        courseId,
        timeSpent,
        score: performance?.score || null,
        accuracy: performance?.accuracy || null,
        completionRate: performance?.completionRate || null,
        attentionScore: engagement?.attentionScore || null,
        interactionCount: engagement?.interactionCount || null
      });
    } catch (dbError) {
      // If table doesn't exist, just log and continue
      console.warn('LearningActivities table may not exist:', (dbError as Error).message);
    }

    // Generate new recommendations based on this activity if needed
    let newRecommendations = [];
    let pathUpdated = false;

    // If performance is low, generate immediate recommendations
    if (performance?.score !== undefined && performance.score < 60) {
      newRecommendations.push({
        id: `urgent_${Date.now()}`,
        type: 'review',
        priority: 'high',
        title: 'Immediate Review Needed',
        description: `Recent activity showed ${performance.score}% performance`,
        actionText: 'Review Material',
        estimatedTime: 20,
        reason: 'Low performance detected in recent activity'
      });
      pathUpdated = true;
    }

    res.json({
      activityRecorded: true,
      newRecommendations: newRecommendations.length > 0 ? newRecommendations : undefined,
      pathUpdated
    });

  } catch (error) {
    console.error('Error tracking learning activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student-progress/peer-comparison/:courseId - Get peer comparison
router.get('/peer-comparison/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's progress
    const userProgressQuery = `
      SELECT OverallProgress, TimeSpent
      FROM CourseProgress
      WHERE UserId = @userId AND CourseId = @courseId
    `;
    
    const userProgress = await dbService.query(userProgressQuery, { userId, courseId });

    // Get peer averages (anonymous)
    const peerStatsQuery = `
      SELECT 
        AVG(CAST(OverallProgress as FLOAT)) as avgProgress,
        AVG(CAST(TimeSpent as FLOAT)) as avgTimeSpent,
        COUNT(*) as totalPeers
      FROM CourseProgress cp
      JOIN Enrollments e ON cp.UserId = e.UserId AND cp.CourseId = e.CourseId
      WHERE cp.CourseId = @courseId AND e.Status = 'active' AND cp.UserId != @userId
    `;

    const peerStats = await dbService.query(peerStatsQuery, { userId, courseId });

    const userProgressData = userProgress[0];
    const peerData = peerStats[0];

    if (!userProgressData) {
      return res.status(404).json({ error: 'User progress not found for this course' });
    }

    // Calculate percentile rank
    const betterThanQuery = `
      SELECT COUNT(*) as betterThanCount
      FROM CourseProgress cp
      JOIN Enrollments e ON cp.UserId = e.UserId AND cp.CourseId = e.CourseId
      WHERE cp.CourseId = @courseId 
        AND e.Status = 'active' 
        AND cp.UserId != @userId 
        AND cp.OverallProgress < @userProgress
    `;

    const betterThan = await dbService.query(betterThanQuery, { 
      userId, 
      courseId, 
      userProgress: userProgressData.OverallProgress 
    });

    const totalPeers = peerData?.totalPeers || 0;
    const betterThanCount = betterThan[0]?.betterThanCount || 0;
    
    let percentileRank = 'N/A';
    if (totalPeers > 0) {
      const percentile = Math.round((betterThanCount / totalPeers) * 100);
      if (percentile >= 90) percentileRank = 'top 10%';
      else if (percentile >= 75) percentileRank = 'top 25%';
      else if (percentile >= 50) percentileRank = 'top 50%';
      else percentileRank = 'bottom 50%';
    }

    // Generate suggestions based on comparison
    const suggestions = [];
    const userProgressPercent = userProgressData.OverallProgress || 0;
    const avgProgress = peerData?.avgProgress || 0;
    
    if (userProgressPercent < avgProgress - 10) {
      suggestions.push('Consider dedicating more time to study sessions');
      suggestions.push('Review course materials more frequently');
    } else if (userProgressPercent > avgProgress + 10) {
      suggestions.push('You\'re ahead of the curve! Consider helping peers');
      suggestions.push('Explore advanced topics in this subject');
    } else {
      suggestions.push('You\'re keeping pace with your peers');
      suggestions.push('Stay consistent with your current study habits');
    }

    res.json({
      yourProgress: Math.round(userProgressPercent),
      averageProgress: Math.round(avgProgress),
      yourRank: percentileRank,
      averageTimeSpent: Math.round((peerData?.avgTimeSpent || 0) / 3600), // convert to hours
      yourTimeSpent: Math.round((userProgressData.TimeSpent || 0) / 3600),
      suggestions
    });

  } catch (error) {
    console.error('Error getting peer comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;