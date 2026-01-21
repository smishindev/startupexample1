import cron from 'node-cron';
import { Server } from 'socket.io';
import { NotificationService } from './NotificationService';
import { getUpcomingAssessmentsDue, getWeeklyActivitySummaries } from './NotificationHelpers';
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

  logger.info('✅ NotificationScheduler started successfully');
  logger.info('   - Assessment Due Reminders: Daily at 9:00 AM UTC');
  logger.info('   - Weekly Progress Summary: Monday at 8:00 AM UTC');
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
