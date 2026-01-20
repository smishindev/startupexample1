import cron from 'node-cron';
import { Server } from 'socket.io';
import { NotificationService } from './NotificationService';
import { getUpcomingAssessmentsDue } from './NotificationHelpers';
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

  logger.info('✅ NotificationScheduler started successfully');
  logger.info('   - Assessment Due Reminders: Daily at 9:00 AM UTC');
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
