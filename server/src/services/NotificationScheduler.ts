import cron from 'node-cron';
import { Server } from 'socket.io';
import { NotificationService } from './NotificationService';
import { getUpcomingAssessmentsDue, getWeeklyActivitySummaries, getUpcomingLiveSessions, getAtRiskStudents } from './NotificationHelpers';
import { logger } from '../utils/logger';
import { format } from 'date-fns';

/**
 * Notification Scheduler Service
 * Manages cron jobs for scheduled notifications
 */

let io: Server;
let isInitialized = false;

/**
 * Initialize the scheduler with Socket.io instance
 */
export function initializeScheduler(socketIoInstance: Server): void {
  if (isInitialized) {
    logger.warn('NotificationScheduler already initialized');
    return;
  }

  io = socketIoInstance;
  isInitialized = true;

  logger.info('🕐 NotificationScheduler initializing...');

  // Schedule: Daily at 9 AM UTC - Assessment Due Date Reminders
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Running scheduled job: Assessment Due Date Reminders');
    await sendAssessmentDueReminders();
  });

  // Schedule: Weekly on Monday at 8 AM UTC - Weekly Progress Summary
  cron.schedule('0 8 * * 1', async () => {
    logger.info('⏰ Running scheduled job: Weekly Progress Summary');
    await sendWeeklyProgressSummaries();
  });

  // Schedule: Every 15 minutes - Live Session Starting Soon
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ Running scheduled job: Live Session Starting Soon');
    await sendLiveSessionReminders();
  });

  // Schedule: Weekly on Monday at 10 AM UTC - At-Risk Student Detection
  cron.schedule('0 10 * * 1', async () => {
    logger.info('⏰ Running scheduled job: At-Risk Student Detection');
    await detectAndNotifyAtRiskStudents();
  });

  logger.info('✅ NotificationScheduler started successfully');
  logger.info('   - Assessment Due Reminders: Daily at 9:00 AM UTC');
  logger.info('   - Weekly Progress Summary: Monday at 8:00 AM UTC');
  logger.info('   - Live Session Reminders: Every 15 minutes');
  logger.info('   - At-Risk Student Alerts: Monday at 10:00 AM UTC');
}

/**
 * Send reminders for assessments due in 2 days
 */
async function sendAssessmentDueReminders(): Promise<void> {
  try {
    if (!io) {
      logger.error('Socket.io not initialized in NotificationScheduler');
      return;
    }

    // Get assessments due in 2 days
    const upcomingAssessments = await getUpcomingAssessmentsDue(2);
    
    if (upcomingAssessments.length === 0) {
      logger.info('No assessments due in 2 days');
      return;
    }

    logger.info(`Found ${upcomingAssessments.length} assessment(s) due in 2 days`);

    const notificationService = new NotificationService(io);
    let successCount = 0;
    let failureCount = 0;

    // Send notification to each student
    for (const assessment of upcomingAssessments) {
      try {
        const dueDate = new Date(assessment.dueDate);
        const now = new Date();
        const dueDateFormatted = format(dueDate, 'MMM dd, yyyy');
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        await notificationService.createNotificationWithControls(
          {
            userId: assessment.userId,
            type: 'assignment',
            priority: 'urgent',
            title: 'Assignment Due Soon!',
            message: `"${assessment.assessmentTitle}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} (${dueDateFormatted})`,
            actionUrl: `/courses/${assessment.courseId}/lessons/${assessment.lessonId}`,
            actionText: 'Work on Assignment',
            relatedEntityId: assessment.assessmentId,
            relatedEntityType: 'assessment'
          },
          {
            category: 'assessment',
            subcategory: 'AssessmentDue'
          }
        );

        successCount++;
        
        logger.debug(`Sent due reminder to ${assessment.userName} for "${assessment.assessmentTitle}"`);
      } catch (error) {
        failureCount++;
        logger.error(`Failed to send due reminder to ${assessment.userName}:`, error);
      }
    }

    logger.info(`Assessment due reminders completed: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    logger.error('Error in sendAssessmentDueReminders:', error);
  }
}

/**
 * Manual trigger for testing (can be called from API endpoint)
 */
export async function triggerAssessmentDueReminders(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    if (!io) {
      return { success: false, count: 0, message: 'Scheduler not initialized' };
    }

    const upcomingAssessments = await getUpcomingAssessmentsDue(2);
    await sendAssessmentDueReminders();

    return {
      success: true,
      count: upcomingAssessments.length,
      message: `Sent ${upcomingAssessments.length} assessment due reminder(s)`
    };
  } catch (error) {
    logger.error('Error triggering assessment due reminders:', error);
    return {
      success: false,
      count: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send weekly progress summaries to all active students
 */
async function sendWeeklyProgressSummaries(): Promise<void> {
  try {
    if (!io) {
      logger.error('Socket.io not initialized in NotificationScheduler');
      return;
    }

    // Get weekly activity for all active students
    const summaries = await getWeeklyActivitySummaries();
    
    if (summaries.length === 0) {
      logger.info('No active students with activity in the past week');
      return;
    }

    logger.info(`Found ${summaries.length} student(s) with activity in the past week`);

    const notificationService = new NotificationService(io);
    let successCount = 0;
    let failureCount = 0;

    // Send notification to each active student
    for (const summary of summaries) {
      try {
        // Format message with activity summary
        const messageLines = [
          'Great work this week! Here\'s your learning summary:',
          '',
          `✅ ${summary.lessonsCompleted} lesson${summary.lessonsCompleted !== 1 ? 's' : ''} completed`,
          `🎥 ${summary.videosWatched} video${summary.videosWatched !== 1 ? 's' : ''} watched`,
          `📝 ${summary.assessmentsSubmitted} assessment${summary.assessmentsSubmitted !== 1 ? 's' : ''} submitted`,
          `⏱️ ${summary.totalTimeSpent} minutes of focused learning`,
          `📚 Active in ${summary.coursesActive} course${summary.coursesActive !== 1 ? 's' : ''}`
        ];

        await notificationService.createNotificationWithControls(
          {
            userId: summary.userId,
            type: 'progress',
            priority: 'normal',
            title: '📊 Your Weekly Progress Summary',
            message: messageLines.join('\n'),
            actionUrl: '/my-learning',
            actionText: 'View My Progress',
            relatedEntityId: summary.userId,
            relatedEntityType: 'student'
          },
          {
            category: 'progress',
            subcategory: 'ProgressSummary'
          }
        );

        successCount++;
        
        logger.debug(`Sent weekly summary to ${summary.userName}: ${summary.lessonsCompleted} lessons, ${summary.totalTimeSpent} min`);
      } catch (error) {
        failureCount++;
        logger.error(`Failed to send weekly summary to ${summary.userName}:`, error);
      }
    }

    logger.info(`Weekly progress summaries completed: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    logger.error('Error in sendWeeklyProgressSummaries:', error);
  }
}

/**
 * Manual trigger for testing (can be called from API endpoint)
 */
export async function triggerWeeklyProgressSummaries(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    if (!io) {
      return { success: false, count: 0, message: 'Scheduler not initialized' };
    }

    const summaries = await getWeeklyActivitySummaries();
    await sendWeeklyProgressSummaries();

    return {
      success: true,
      count: summaries.length,
      message: `Sent ${summaries.length} weekly progress summar${summaries.length !== 1 ? 'ies' : 'y'}`
    };
  } catch (error) {
    logger.error('Error triggering weekly progress summaries:', error);
    return {
      success: false,
      count: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send reminders for live sessions starting in 1 hour
 */
async function sendLiveSessionReminders(): Promise<void> {
  try {
    if (!io) {
      logger.error('Socket.io not initialized in NotificationScheduler');
      return;
    }

    // Get sessions starting in 60 minutes (±5 min buffer)
    const upcomingSessions = await getUpcomingLiveSessions(60);
    
    if (upcomingSessions.length === 0) {
      // Silent success - no logging spam
      return;
    }

    logger.info(`Found ${upcomingSessions.length} notification(s) for session(s) starting in ~1 hour`);

    const notificationService = new NotificationService(io);
    let successCount = 0;
    let failureCount = 0;

    // Group by session to get unique session count
    const sessionMap = new Map<string, typeof upcomingSessions>();
    upcomingSessions.forEach(session => {
      if (!sessionMap.has(session.sessionId)) {
        sessionMap.set(session.sessionId, []);
      }
      sessionMap.get(session.sessionId)!.push(session);
    });

    logger.info(`Sending reminders for ${sessionMap.size} session(s) to ${upcomingSessions.length} student(s)`);

    // Send notification to each student for each session
    for (const [sessionId, students] of sessionMap) {
      const session = students[0]; // Get session details
      const scheduledTime = new Date(session.scheduledAt);
      const formattedTime = format(scheduledTime, 'MMM dd, yyyy h:mm a');

      for (const student of students) {
        try {
          await notificationService.createNotificationWithControls(
            {
              userId: student.userId,
              type: 'course',
              priority: 'urgent',
              title: 'Live Session Starting Soon!',
              message: `"${session.sessionTitle}" starts in 1 hour (${formattedTime})`,
              actionUrl: `/live-sessions/${session.sessionId}`,
              actionText: 'Join Session',
              relatedEntityId: session.sessionId,
              relatedEntityType: 'live-session'
            },
            {
              category: 'course',
              subcategory: 'LiveSessions'
            }
          );

          successCount++;
          
          logger.debug(
            `Sent live session reminder to ${student.userName} for "${session.sessionTitle}"`
          );
        } catch (error) {
          failureCount++;
          logger.error(
            `Failed to send live session reminder to ${student.userName}:`, 
            error
          );
        }
      }
    }

    logger.info(
      `Live session reminders completed: ${successCount} sent, ${failureCount} failed`
    );
  } catch (error) {
    logger.error('Error in sendLiveSessionReminders:', error);
  }
}

/**
 * Manual trigger for testing (can be called from API endpoint)
 */
export async function triggerLiveSessionReminders(): Promise<{ 
  success: boolean; 
  count: number; 
  sessions: number;
  message: string 
}> {
  try {
    if (!io) {
      return { success: false, count: 0, sessions: 0, message: 'Scheduler not initialized' };
    }

    const upcomingSessions = await getUpcomingLiveSessions(60);
    const uniqueSessions = new Set(upcomingSessions.map(s => s.sessionId)).size;
    
    await sendLiveSessionReminders();

    return {
      success: true,
      count: upcomingSessions.length,
      sessions: uniqueSessions,
      message: `Sent reminders for ${uniqueSessions} upcoming session(s) to ${upcomingSessions.length} student(s)`
    };
  } catch (error) {
    logger.error('Error triggering live session reminders:', error);
    return {
      success: false,
      count: 0,
      sessions: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Detect at-risk students and notify instructors
 * Runs weekly on Monday at 10:00 AM UTC
 */
async function detectAndNotifyAtRiskStudents(): Promise<void> {
  try {
    if (!io) {
      logger.error('Socket.io not initialized in NotificationScheduler');
      return;
    }

    const atRiskStudents = await getAtRiskStudents();
    
    if (atRiskStudents.length === 0) {
      // Silent success - no at-risk students this week
      return;
    }

    logger.info(`📊 Found ${atRiskStudents.length} at-risk student(s) across courses`);

    // Group students by instructor and course
    const instructorCourseMap = new Map<string, Map<string, typeof atRiskStudents>>();
    
    for (const student of atRiskStudents) {
      if (!instructorCourseMap.has(student.instructorId)) {
        instructorCourseMap.set(student.instructorId, new Map());
      }
      const courseMap = instructorCourseMap.get(student.instructorId)!;
      
      if (!courseMap.has(student.courseId)) {
        courseMap.set(student.courseId, []);
      }
      courseMap.get(student.courseId)!.push(student);
    }

    const notificationService = new NotificationService(io);
    let successCount = 0;
    let errorCount = 0;

    // Send one notification per instructor per course
    for (const [instructorId, courseMap] of instructorCourseMap) {
      for (const [courseId, students] of courseMap) {
        try {
          const courseTitle = students[0].courseTitle;
          const studentCount = students.length;
          
          // Build risk breakdown message
          const criticalCount = students.filter(s => s.riskLevel === 'critical').length;
          const highCount = students.filter(s => s.riskLevel === 'high').length;
          const mediumCount = students.filter(s => s.riskLevel === 'medium').length;
          
          let riskBreakdown = '';
          if (criticalCount > 0) riskBreakdown += `${criticalCount} critical, `;
          if (highCount > 0) riskBreakdown += `${highCount} high, `;
          if (mediumCount > 0) riskBreakdown += `${mediumCount} medium`;
          riskBreakdown = riskBreakdown.replace(/, $/, '');

          await notificationService.createNotificationWithControls(
            {
              userId: instructorId,
              type: 'intervention',
              priority: criticalCount > 0 ? 'urgent' : 'high',
              title: '⚠️ At-Risk Student Alert',
              message: `${studentCount} student${studentCount > 1 ? 's' : ''} need${studentCount === 1 ? 's' : ''} attention in "${courseTitle}" (${riskBreakdown})`,
              actionUrl: `/instructor/interventions?tab=at-risk&courseId=${courseId}`,
              actionText: 'Review Students',
              relatedEntityId: courseId,
              relatedEntityType: 'course',
              data: JSON.stringify({ 
                studentCount,
                criticalCount,
                highCount,
                mediumCount,
                students: students.map(s => ({
                  id: s.studentId,
                  name: s.studentName,
                  riskLevel: s.riskLevel,
                  daysSinceLastActivity: s.daysSinceLastActivity
                }))
              })
            },
            {
              category: 'system',
              subcategory: 'RiskAlerts'
            }
          );

          successCount++;
        } catch (error) {
          console.error(`❌ Failed to notify instructor ${instructorId} about course ${courseId}:`, error);
          errorCount++;
        }
      }
    }

    logger.info(`✅ At-risk detection complete: ${successCount} notification(s) sent, ${errorCount} error(s)`);
    
  } catch (error) {
    logger.error('❌ At-risk student detection failed:', error);
  }
}

/**
 * Manual trigger for testing at-risk detection
 * Called from API endpoint
 */
export async function triggerAtRiskDetection(): Promise<{
  success: boolean;
  studentCount: number;
  instructorCount: number;
  courses: string[];
}> {
  try {
    if (!io) {
      return {
        success: false,
        studentCount: 0,
        instructorCount: 0,
        courses: []
      };
    }

    const atRiskStudents = await getAtRiskStudents();
    
    if (atRiskStudents.length === 0) {
      return {
        success: true,
        studentCount: 0,
        instructorCount: 0,
        courses: []
      };
    }

    await detectAndNotifyAtRiskStudents();

    const uniqueInstructors = new Set(atRiskStudents.map(s => s.instructorId));
    const uniqueCourses = [...new Set(atRiskStudents.map(s => s.courseTitle))];

    return {
      success: true,
      studentCount: atRiskStudents.length,
      instructorCount: uniqueInstructors.size,
      courses: uniqueCourses
    };
  } catch (error) {
    logger.error('Manual at-risk detection trigger failed:', error);
    throw error;
  }
}
