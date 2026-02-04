import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

/**
 * Helper functions for notification triggers
 * Used by NotificationScheduler and various routes
 */

export interface AssessmentDueInfo {
  assessmentId: string;
  assessmentTitle: string;
  dueDate: Date;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface WeeklyActivitySummary {
  userId: string;
  userName: string;
  lessonsCompleted: number;
  videosWatched: number;
  assessmentsSubmitted: number;
  totalTimeSpent: number; // in minutes
  coursesActive: number;
  startDate: Date;
  endDate: Date;
}

export interface LiveSessionStartingSoonInfo {
  sessionId: string;
  sessionTitle: string;
  scheduledAt: Date;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Get instructor ID for a given course
 */
export async function getInstructorId(courseId: string): Promise<string | null> {
  try {
    const db = DatabaseService.getInstance();
    const result = await db.query(`
      SELECT InstructorId 
      FROM dbo.Courses 
      WHERE Id = @courseId
    `, { courseId });
    
    return result[0]?.InstructorId || null;
  } catch (error) {
    logger.error('Error getting instructor ID:', error);
    return null;
  }
}

/**
 * Get user's full name by user ID
 */
export async function getUserName(userId: string): Promise<string> {
  try {
    const db = DatabaseService.getInstance();
    const result = await db.query(`
      SELECT FirstName, LastName 
      FROM dbo.Users 
      WHERE Id = @userId
    `, { userId });
    
    if (result[0]) {
      return `${result[0].FirstName} ${result[0].LastName}`;
    }
    return 'User';
  } catch (error) {
    logger.error('Error getting user name:', error);
    return 'User';
  }
}

/**
 * Get course progress percentage for a user
 */
export async function getCourseProgress(userId: string, courseId: string): Promise<number> {
  try {
    const db = DatabaseService.getInstance();
    
    // Get total lessons in course
    const totalLessons = await db.query(`
      SELECT COUNT(*) as Total 
      FROM dbo.Lessons 
      WHERE CourseId = @courseId
    `, { courseId });
    
    const total = totalLessons[0]?.Total || 0;
    if (total === 0) return 0;
    
    // Get completed lessons
    const completedLessons = await db.query(`
      SELECT COUNT(*) as Completed 
      FROM dbo.UserProgress 
      WHERE UserId = @userId 
        AND CourseId = @courseId 
        AND Status = 'completed'
    `, { userId, courseId });
    
    const completed = completedLessons[0]?.Completed || 0;
    return Math.round((completed / total) * 100);
  } catch (error) {
    logger.error('Error getting course progress:', error);
    return 0;
  }
}

/**
 * Get assessments due in N days that haven't been submitted
 */
export async function getUpcomingAssessmentsDue(daysAhead: number): Promise<AssessmentDueInfo[]> {
  try {
    const db = DatabaseService.getInstance();
    
    const results = await db.query(`
      SELECT 
        a.Id as AssessmentId,
        a.Title as AssessmentTitle,
        a.DueDate,
        l.CourseId,
        c.Title as CourseTitle,
        l.Id as LessonId,
        e.UserId,
        u.FirstName + ' ' + u.LastName as UserName,
        u.Email as UserEmail
      FROM dbo.Assessments a
      INNER JOIN dbo.Lessons l ON a.LessonId = l.Id
      INNER JOIN dbo.Courses c ON l.CourseId = c.Id
      INNER JOIN dbo.Enrollments e ON e.CourseId = c.Id AND e.Status = 'active'
      INNER JOIN dbo.Users u ON e.UserId = u.Id
      LEFT JOIN dbo.AssessmentSubmissions sub ON sub.AssessmentId = a.Id 
        AND sub.UserId = e.UserId 
        AND sub.Status = 'completed'
      WHERE a.DueDate IS NOT NULL
        AND a.DueDate BETWEEN GETUTCDATE() AND DATEADD(DAY, @daysAhead, GETUTCDATE())
        AND sub.Id IS NULL
      ORDER BY a.DueDate, u.FirstName, u.LastName
    `, { daysAhead });
    
    return results.map((row: any) => ({
      assessmentId: row.AssessmentId,
      assessmentTitle: row.AssessmentTitle,
      dueDate: row.DueDate,
      courseId: row.CourseId,
      courseTitle: row.CourseTitle,
      lessonId: row.LessonId,
      userId: row.UserId,
      userName: row.UserName,
      userEmail: row.UserEmail
    }));
  } catch (error) {
    logger.error('Error getting upcoming assessments due:', error);
    return [];
  }
}

/**
 * Get all enrolled students for a course
 */
export async function getEnrolledStudents(courseId: string): Promise<Array<{ userId: string; userName: string; email: string }>> {
  try {
    const db = DatabaseService.getInstance();
    
    const results = await db.query(`
      SELECT 
        u.Id as UserId,
        u.FirstName + ' ' + u.LastName as UserName,
        u.Email
      FROM dbo.Enrollments e
      INNER JOIN dbo.Users u ON e.UserId = u.Id
      WHERE e.CourseId = @courseId 
        AND e.Status IN ('active', 'completed')
      ORDER BY u.FirstName, u.LastName
    `, { courseId });
    
    return results.map((row: any) => ({
      userId: row.UserId,
      userName: row.UserName,
      email: row.Email
    }));
  } catch (error) {
    logger.error('Error getting enrolled students:', error);
    return [];
  }
}

/**
 * Get weekly activity summary for all active users
 */
export async function getWeeklyActivitySummaries(): Promise<WeeklyActivitySummary[]> {
  try {
    const db = DatabaseService.getInstance();
    
    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const results = await db.query(`
      SELECT 
        u.Id as UserId,
        u.FirstName + ' ' + u.LastName as UserName,
        
        -- Lessons completed this week
        (SELECT COUNT(*) 
         FROM dbo.UserProgress up 
         WHERE up.UserId = u.Id 
           AND up.Status = 'completed'
           AND up.CompletedAt >= @startDate 
           AND up.CompletedAt < @endDate
        ) as LessonsCompleted,
        
        -- Videos watched this week
        (SELECT COUNT(*) 
         FROM dbo.VideoProgress vp 
         WHERE vp.UserId = u.Id 
           AND vp.IsCompleted = 1
           AND vp.CompletedAt >= @startDate 
           AND vp.CompletedAt < @endDate
        ) as VideosWatched,
        
        -- Assessments submitted this week
        (SELECT COUNT(*) 
         FROM dbo.AssessmentSubmissions asm 
         WHERE asm.UserId = u.Id 
           AND asm.Status = 'completed'
           AND asm.CompletedAt >= @startDate 
           AND asm.CompletedAt < @endDate
        ) as AssessmentsSubmitted,
        
        -- Total time spent this week (sum from UserProgress)
        ISNULL((SELECT SUM(up.TimeSpent) 
                FROM dbo.UserProgress up 
                WHERE up.UserId = u.Id 
                  AND up.LastAccessedAt >= @startDate 
                  AND up.LastAccessedAt < @endDate
               ), 0) as TotalTimeSpent,
        
        -- Active courses (courses with activity this week)
        (SELECT COUNT(DISTINCT up.CourseId) 
         FROM dbo.UserProgress up 
         WHERE up.UserId = u.Id 
           AND up.LastAccessedAt >= @startDate 
           AND up.LastAccessedAt < @endDate
        ) as CoursesActive
        
      FROM dbo.Users u
      INNER JOIN dbo.Enrollments e ON u.Id = e.UserId AND e.Status = 'active'
      WHERE u.Role = 'student'
        AND u.IsActive = 1
      GROUP BY u.Id, u.FirstName, u.LastName
      HAVING (
        -- Only include users with some activity
        (SELECT COUNT(*) FROM dbo.UserProgress up WHERE up.UserId = u.Id AND up.LastAccessedAt >= @startDate) > 0
        OR
        (SELECT COUNT(*) FROM dbo.VideoProgress vp WHERE vp.UserId = u.Id AND vp.CompletedAt >= @startDate) > 0
        OR
        (SELECT COUNT(*) FROM dbo.AssessmentSubmissions asm WHERE asm.UserId = u.Id AND asm.CompletedAt >= @startDate) > 0
      )
      ORDER BY u.FirstName, u.LastName
    `, { startDate, endDate });
    
    return results.map((row: any) => ({
      userId: row.UserId,
      userName: row.UserName,
      lessonsCompleted: row.LessonsCompleted || 0,
      videosWatched: row.VideosWatched || 0,
      assessmentsSubmitted: row.AssessmentsSubmitted || 0,
      totalTimeSpent: row.TotalTimeSpent || 0,
      coursesActive: row.CoursesActive || 0,
      startDate,
      endDate
    }));
  } catch (error) {
    logger.error('Error getting weekly activity summaries:', error);
    return [];
  }
}

/**
 * Get pending submission count for an assessment
 */
export async function getPendingSubmissionCount(assessmentId: string): Promise<number> {
  try {
    const db = DatabaseService.getInstance();
    
    const result = await db.query(`
      SELECT COUNT(*) as Count
      FROM dbo.AssessmentSubmissions
      WHERE AssessmentId = @assessmentId
        AND Status = 'in_progress'
    `, { assessmentId });
    
    return result[0]?.Count || 0;
  } catch (error) {
    logger.error('Error getting pending submission count:', error);
    return 0;
  }
}

/**
 * Check if user is currently online
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const db = DatabaseService.getInstance();
    
    const result = await db.query(`
      SELECT Status
      FROM dbo.UserPresence
      WHERE UserId = @userId
    `, { userId });
    
    return result[0]?.Status === 'online';
  } catch (error) {
    logger.error('Error checking user online status:', error);
    return false;
  }
}

/**
 * Get live sessions starting within N minutes that haven't been notified yet
 * Returns list of enrolled students for each upcoming session
 */
export async function getUpcomingLiveSessions(minutesAhead: number): Promise<LiveSessionStartingSoonInfo[]> {
  try {
    const db = DatabaseService.getInstance();
    
    const results = await db.query(`
      SELECT 
        ls.Id as SessionId,
        ls.Title as SessionTitle,
        ls.ScheduledAt,
        ls.CourseId,
        c.Title as CourseTitle,
        ls.InstructorId,
        e.UserId,
        u.FirstName + ' ' + u.LastName as UserName,
        u.Email as UserEmail
      FROM dbo.LiveSessions ls
      INNER JOIN dbo.Courses c ON ls.CourseId = c.Id
      INNER JOIN dbo.Enrollments e ON e.CourseId = c.Id 
        AND e.Status IN ('active', 'completed')
      INNER JOIN dbo.Users u ON e.UserId = u.Id
      LEFT JOIN dbo.Notifications n ON n.UserId = e.UserId 
        AND n.RelatedEntityType = 'live-session'
        AND n.RelatedEntityId = ls.Id
        AND n.Message LIKE '%starting in%'
        AND n.CreatedAt > DATEADD(HOUR, -2, GETUTCDATE())
      WHERE ls.Status = 'scheduled'
        AND ls.ScheduledAt BETWEEN 
          DATEADD(MINUTE, @minutesAhead - 5, GETUTCDATE()) 
          AND DATEADD(MINUTE, @minutesAhead + 5, GETUTCDATE())
        AND n.Id IS NULL
      ORDER BY ls.ScheduledAt, u.FirstName, u.LastName
    `, { minutesAhead });
    
    return results.map((row: any) => ({
      sessionId: row.SessionId,
      sessionTitle: row.SessionTitle,
      scheduledAt: row.ScheduledAt,
      courseId: row.CourseId,
      courseTitle: row.CourseTitle,
      instructorId: row.InstructorId,
      userId: row.UserId,
      userName: row.UserName,
      userEmail: row.UserEmail
    }));
  } catch (error) {
    logger.error('Error getting upcoming live sessions:', error);
    return [];
  }
}
