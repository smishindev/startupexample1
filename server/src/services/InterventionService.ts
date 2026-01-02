import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import sql from 'mssql';

export interface RiskAssessment {
  UserId: string;
  CourseId: string;
  RiskLevel: 'low' | 'medium' | 'high' | 'critical';
  RiskScore: number;
  RiskFactors: string[];
  PredictedOutcome: string;
  RecommendedInterventions: string[];
}

export interface ProgressAlert {
  UserId: string;
  CourseId: string;
  CourseName: string;
  OverallProgress: number;
  LastAccessedAt: Date;
  DaysSinceAccess: number;
}

export class InterventionService {
  private dbService: DatabaseService;
  private notificationService: NotificationService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.notificationService = new NotificationService();
  }

  /**
   * Check for at-risk students and send intervention alerts
   */
  async checkAtRiskStudents(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT 
          sr.UserId,
          sr.CourseId,
          sr.RiskLevel,
          sr.RiskScore,
          sr.RiskFactors,
          sr.PredictedOutcome,
          sr.RecommendedInterventions,
          sr.LastUpdated,
          c.Title as CourseName,
          u.FirstName,
          u.LastName,
          u.Email
        FROM StudentRiskAssessment sr
        JOIN Courses c ON sr.CourseId = c.Id
        JOIN Users u ON sr.UserId = u.Id
        WHERE sr.RiskLevel IN ('high', 'critical')
          AND sr.LastUpdated > DATEADD(hour, -24, GETUTCDATE())
        ORDER BY sr.RiskScore DESC
      `);

      let notificationCount = 0;
      
      for (const record of result.recordset) {
        const riskFactors = record.RiskFactors ? JSON.parse(record.RiskFactors) : [];
        const interventions = record.RecommendedInterventions ? JSON.parse(record.RecommendedInterventions) : [];

        // Send notification to student
        const studentNotificationId = await this.notificationService.createNotificationWithControls(
          {
            userId: record.UserId,
            type: 'risk',
            priority: record.RiskLevel === 'critical' ? 'urgent' : 'high',
            title: '⚠️ Learning Progress Alert',
            message: `You're showing signs of difficulty in ${record.CourseName}. We've identified some areas where you might need support.`,
            data: {
              courseId: record.CourseId,
              courseName: record.CourseName,
              riskLevel: record.RiskLevel,
              riskScore: record.RiskScore,
              riskFactors,
              interventions
            },
            actionUrl: `/courses/${record.CourseId}/preview`,
            actionText: 'View Course',
            relatedEntityId: record.CourseId,
            relatedEntityType: 'course'
          },
          {
            category: 'progress',
            subcategory: 'ProgressSummary'
          }
        );

        if (studentNotificationId) {
          notificationCount++;
        }

        // Send notification to course instructor
        const instructorId = await this.getCourseInstructor(record.CourseId);
        if (instructorId) {
          const instructorNotificationId = await this.notificationService.createNotificationWithControls(
            {
              userId: instructorId,
              type: 'intervention',
              priority: record.RiskLevel === 'critical' ? 'urgent' : 'high',
              title: '🚨 Student Needs Intervention',
              message: `${record.FirstName} ${record.LastName} is at ${record.RiskLevel} risk in ${record.CourseName}`,
              data: {
                studentId: record.UserId,
                studentName: `${record.FirstName} ${record.LastName}`,
                studentEmail: record.Email,
                courseId: record.CourseId,
                courseName: record.CourseName,
                riskLevel: record.RiskLevel,
                riskScore: record.RiskScore,
                riskFactors,
                interventions
              },
              actionUrl: `/instructor/student-analytics?studentId=${record.UserId}&courseId=${record.CourseId}`,
              actionText: 'View Student Analytics',
              relatedEntityId: record.UserId,
              relatedEntityType: 'student'
            },
            {
              category: 'progress',
              subcategory: 'ProgressSummary'
            }
          );

          if (instructorNotificationId) {
            notificationCount++;
          }
        }
      }

      console.log(`✅ Intervention check complete: ${notificationCount} notifications sent for ${result.recordset.length} at-risk students`);
      return notificationCount;
    } catch (error) {
      console.error('❌ Error checking at-risk students:', error);
      throw error;
    }
  }

  /**
   * Check for students with low progress and send reminders
   */
  async checkLowProgressStudents(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT 
          cp.UserId,
          cp.CourseId,
          cp.OverallProgress,
          cp.LastAccessedAt,
          DATEDIFF(day, cp.LastAccessedAt, GETUTCDATE()) as DaysSinceAccess,
          c.Title as CourseName,
          e.EnrolledAt
        FROM CourseProgress cp
        JOIN Courses c ON cp.CourseId = c.Id
        JOIN Enrollments e ON cp.UserId = e.UserId AND cp.CourseId = e.CourseId
        WHERE cp.OverallProgress < 30
          AND DATEDIFF(day, cp.LastAccessedAt, GETUTCDATE()) >= 7
          AND e.Status = 'active'
          AND DATEDIFF(day, e.EnrolledAt, GETUTCDATE()) >= 7
      `);

      let notificationCount = 0;

      for (const record of result.recordset) {
        const notificationId = await this.notificationService.createNotificationWithControls(
          {
            userId: record.UserId,
            type: 'progress',
            priority: 'normal',
            title: '📚 Continue Your Learning Journey',
            message: `You haven't accessed ${record.CourseName} in ${record.DaysSinceAccess} days. You're ${record.OverallProgress}% complete - keep going!`,
            data: {
              courseId: record.CourseId,
              courseName: record.CourseName,
              progress: record.OverallProgress,
              daysSinceAccess: record.DaysSinceAccess
            },
            actionUrl: `/courses/${record.CourseId}/preview`,
            actionText: 'Resume Learning',
            relatedEntityId: record.CourseId,
            relatedEntityType: 'course',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
          },
          {
            category: 'progress',
            subcategory: 'ProgressSummary'
          }
        );

        if (notificationId) {
          notificationCount++;
        }
      }

      console.log(`✅ Low progress check complete: ${notificationCount} notifications sent`);
      return notificationCount;
    } catch (error) {
      console.error('❌ Error checking low progress students:', error);
      throw error;
    }
  }

  /**
   * Check for upcoming assessment deadlines
   */
  async checkAssessmentDeadlines(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT DISTINCT
          e.UserId,
          a.Id as AssessmentId,
          a.Title as AssessmentTitle,
          l.Title as LessonTitle,
          c.Id as CourseId,
          c.Title as CourseName,
          a.MaxAttempts,
          COALESCE(
            (SELECT COUNT(*) FROM AssessmentSubmissions 
             WHERE AssessmentId = a.Id AND UserId = e.UserId AND Status = 'completed'), 
            0
          ) as AttemptsUsed
        FROM Enrollments e
        JOIN Courses c ON e.CourseId = c.Id
        JOIN Lessons l ON l.CourseId = c.Id
        JOIN Assessments a ON a.LessonId = l.Id
        WHERE e.Status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM AssessmentSubmissions asub
            WHERE asub.AssessmentId = a.Id 
              AND asub.UserId = e.UserId 
              AND asub.Status = 'completed'
              AND asub.Score >= a.PassingScore
          )
      `);

      let notificationCount = 0;

      for (const record of result.recordset) {
        const attemptsLeft = record.MaxAttempts - record.AttemptsUsed;
        
        if (attemptsLeft > 0 && attemptsLeft <= 2) {
          const notificationId = await this.notificationService.createNotificationWithControls(
            {
              userId: record.UserId,
              type: 'assignment',
              priority: attemptsLeft === 1 ? 'high' : 'normal',
              title: '📝 Assessment Reminder',
              message: `You have ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} left for "${record.AssessmentTitle}" in ${record.CourseName}`,
              data: {
                assessmentId: record.AssessmentId,
                assessmentTitle: record.AssessmentTitle,
                lessonTitle: record.LessonTitle,
                courseId: record.CourseId,
                courseName: record.CourseName,
                attemptsLeft
              },
              actionUrl: `/assessment/${record.AssessmentId}`,
              actionText: 'Take Assessment',
              relatedEntityId: record.AssessmentId,
              relatedEntityType: 'assessment',
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Expires in 14 days
            },
            {
              category: 'assessment',
              subcategory: 'AssessmentDue'
            }
          );

          if (notificationId) {
            notificationCount++;
          }
        }
      }

      console.log(`✅ Assessment deadline check complete: ${notificationCount} notifications sent`);
      return notificationCount;
    } catch (error) {
      console.error('❌ Error checking assessment deadlines:', error);
      throw error;
    }
  }

  /**
   * Check for achievement milestones and send congratulatory notifications
   */
  async checkAchievements(): Promise<number> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request.query(`
        SELECT 
          cp.UserId,
          cp.CourseId,
          cp.OverallProgress,
          cp.CompletedAt,
          c.Title as CourseName,
          COALESCE(
            (SELECT AVG(CAST(Score as FLOAT)) FROM AssessmentSubmissions asub
             JOIN Assessments a ON asub.AssessmentId = a.Id
             JOIN Lessons l ON a.LessonId = l.Id
             WHERE l.CourseId = cp.CourseId AND asub.UserId = cp.UserId AND asub.Status = 'completed'),
            0
          ) as AvgScore
        FROM CourseProgress cp
        JOIN Courses c ON cp.CourseId = c.Id
        WHERE (
          (cp.OverallProgress = 100 AND cp.CompletedAt > DATEADD(hour, -24, GETUTCDATE()))
          OR (cp.OverallProgress = 50 AND cp.OverallProgress != 100)
        )
      `);

      let notificationCount = 0;

      for (const record of result.recordset) {
        let title = '';
        let message = '';
        let priority: 'low' | 'normal' | 'high' = 'normal';

        if (record.OverallProgress === 100) {
          title = '🎉 Course Completed!';
          message = `Congratulations! You've completed ${record.CourseName} with an average score of ${Math.round(record.AvgScore)}%`;
          priority = 'high';
        } else if (record.OverallProgress === 50) {
          title = '🎯 Halfway There!';
          message = `You're 50% through ${record.CourseName}. Keep up the great work!`;
        }

        if (title) {
          const notificationId = await this.notificationService.createNotificationWithControls(
            {
              userId: record.UserId,
              type: 'achievement',
              priority,
              title,
              message,
              data: {
                courseId: record.CourseId,
                courseName: record.CourseName,
                progress: record.OverallProgress,
                avgScore: record.AvgScore
              },
              actionUrl: `/courses/${record.CourseId}/preview`,
              actionText: 'View Course',
              relatedEntityId: record.CourseId,
              relatedEntityType: 'course'
            },
            {
              category: 'progress',
              subcategory: 'CourseMilestones'
            }
          );

          if (notificationId) {
            notificationCount++;
          }
        }
      }

      console.log(`✅ Achievement check complete: ${notificationCount} notifications sent`);
      return notificationCount;
    } catch (error) {
      console.error('❌ Error checking achievements:', error);
      throw error;
    }
  }

  /**
   * Run all intervention checks
   */
  async runAllChecks(): Promise<{ total: number; details: any }> {
    try {
      console.log('🔍 Running intervention checks...');
      
      const atRiskCount = await this.checkAtRiskStudents();
      const lowProgressCount = await this.checkLowProgressStudents();
      const deadlineCount = await this.checkAssessmentDeadlines();
      const achievementCount = await this.checkAchievements();

      const total = atRiskCount + lowProgressCount + deadlineCount + achievementCount;

      console.log(`✅ All intervention checks complete: ${total} total notifications sent`);

      return {
        total,
        details: {
          atRiskStudents: atRiskCount,
          lowProgress: lowProgressCount,
          assessmentDeadlines: deadlineCount,
          achievements: achievementCount
        }
      };
    } catch (error) {
      console.error('❌ Error running intervention checks:', error);
      throw error;
    }
  }

  /**
   * Get course instructor ID
   */
  private async getCourseInstructor(courseId: string): Promise<string | null> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('CourseId', sql.UniqueIdentifier, courseId)
        .query(`
          SELECT InstructorId
          FROM Courses
          WHERE Id = @CourseId
        `);

      return result.recordset[0]?.InstructorId || null;
    } catch (error) {
      console.error('Error fetching course instructor:', error);
      return null;
    }
  }
}
