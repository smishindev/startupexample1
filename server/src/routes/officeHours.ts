import { Router } from 'express';
import { OfficeHoursService } from '../services/OfficeHoursService';
import { SettingsService } from '../services/SettingsService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { checkRole } from '../middleware/roleCheck';

const router = Router();
const settingsService = new SettingsService();

/**
 * @route   POST /api/office-hours/schedule
 * @desc    Create office hours schedule (instructor only)
 * @access  Private (instructor)
 */
router.post('/schedule', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { dayOfWeek, startTime, endTime, courseId, meetingUrl, description } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Day of week, start time, and end time are required' 
      });
    }

    const schedule = await OfficeHoursService.createSchedule({
      instructorId: req.user!.userId,
      dayOfWeek,
      startTime,
      endTime,
      courseId,
      meetingUrl,
      description
    });

    res.status(201).json({ 
      message: 'Office hours schedule created', 
      schedule 
    });
  } catch (error) {
    console.error('Error creating office hours schedule:', error);
    res.status(500).json({ 
      message: 'Failed to create schedule', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/office-hours/schedule/:instructorId
 * @desc    Get instructor's office hours schedules
 * @access  Private
 */
router.get('/schedule/:instructorId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { instructorId } = req.params;

    const schedules = await OfficeHoursService.getInstructorSchedules(instructorId);

    res.json({ schedules, count: schedules.length });
  } catch (error) {
    console.error('Error fetching office hours schedules:', error);
    res.status(500).json({ 
      message: 'Failed to fetch schedules', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   PUT /api/office-hours/schedule/:scheduleId
 * @desc    Update office hours schedule (instructor only)
 * @access  Private (instructor)
 */
router.put('/schedule/:scheduleId', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { scheduleId } = req.params;
    const { dayOfWeek, startTime, endTime, isActive, courseId, meetingUrl, description } = req.body;

    const schedule = await OfficeHoursService.updateSchedule(scheduleId, {
      DayOfWeek: dayOfWeek,
      StartTime: startTime,
      EndTime: endTime,
      IsActive: isActive,
      CourseId: courseId,
      MeetingUrl: meetingUrl,
      Description: description
    });

    res.json({ 
      message: 'Schedule updated successfully', 
      schedule 
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      message: 'Failed to update schedule', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   DELETE /api/office-hours/schedule/:scheduleId
 * @desc    Delete office hours schedule (instructor only)
 * @access  Private (instructor)
 */
router.delete('/schedule/:scheduleId', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { scheduleId } = req.params;

    await OfficeHoursService.deleteSchedule(scheduleId);

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      message: 'Failed to delete schedule', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/office-hours/queue/join
 * @desc    Join office hours queue (student)
 * @access  Private
 */
router.post('/queue/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { instructorId, scheduleId, question, courseId, lessonId } = req.body;

    if (!instructorId) {
      return res.status(400).json({ message: 'Instructor ID is required' });
    }

    if (!scheduleId) {
      return res.status(400).json({ message: 'Schedule ID is required' });
    }

    const queueEntry = await OfficeHoursService.joinQueue({
      instructorId,
      studentId: req.user!.userId,
      scheduleId,
      question,
      courseId,
      lessonId
    });

    const position = await OfficeHoursService.getQueuePosition(queueEntry.Id);

    res.status(201).json({ 
      message: 'Joined office hours queue', 
      queueEntry,
      position
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ 
      message: 'Failed to join queue', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/office-hours/queue/:instructorId
 * @desc    Get current queue for instructor
 * @access  Private
 */
router.get('/queue/:instructorId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { instructorId } = req.params;

    const queue = await OfficeHoursService.getQueue(instructorId);
    const stats = await OfficeHoursService.getQueueStats(instructorId);

    // Apply privacy filtering (instructors can see enrolled students)
    const filteredQueue = await Promise.all(
      queue.map(async (entry: any) => {
        try {
          if (entry.StudentId) {
            const settings = await settingsService.getUserSettings(entry.StudentId);
            // Instructor viewing their office hours queue - respect email privacy
            return {
              ...entry,
              StudentEmail: settings?.ShowEmail ? entry.StudentEmail : null
            };
          }
          return entry;
        } catch (error) {
          console.error(`Error filtering queue entry:`, error);
          return { ...entry, StudentEmail: null };
        }
      })
    );

    res.json({ 
      queue: filteredQueue, 
      count: filteredQueue.length,
      stats
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ 
      message: 'Failed to fetch queue', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/office-hours/queue/:queueId/admit
 * @desc    Admit student from queue (instructor only)
 * @access  Private (instructor)
 */
router.post('/queue/:queueId/admit', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { queueId } = req.params;

    const queueEntry = await OfficeHoursService.admitStudent(req.user!.userId, queueId);

    res.json({ 
      message: 'Student admitted to office hours', 
      queueEntry 
    });
  } catch (error) {
    console.error('Error admitting student:', error);
    res.status(500).json({ 
      message: 'Failed to admit student', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/office-hours/queue/:queueId/complete
 * @desc    Complete office hours session (instructor only)
 * @access  Private (instructor)
 */
router.post('/queue/:queueId/complete', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { queueId } = req.params;
    const { instructorNotes } = req.body;

    const queueEntry = await OfficeHoursService.completeSession(req.user!.userId, queueId, instructorNotes);

    res.json({ 
      message: 'Office hours session completed', 
      queueEntry 
    });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ 
      message: 'Failed to complete session', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/office-hours/queue/:queueId/cancel
 * @desc    Cancel queue entry
 * @access  Private
 */
router.post('/queue/:queueId/cancel', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { queueId } = req.params;

    const queueEntry = await OfficeHoursService.cancelQueueEntry(queueId, req.user!.userId);

    res.json({ 
      message: 'Queue entry cancelled', 
      queueEntry 
    });
  } catch (error) {
    console.error('Error cancelling queue entry:', error);
    res.status(500).json({ 
      message: 'Failed to cancel queue entry', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/office-hours/my-queue/:instructorId
 * @desc    Get student's current queue entry for an instructor
 * @access  Private
 */
router.get('/my-queue/:instructorId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { instructorId } = req.params;

    const queueEntry = await OfficeHoursService.getStudentQueueEntry(
      req.user!.userId,
      instructorId
    );

    if (!queueEntry) {
      return res.json({ queueEntry: null, inQueue: false });
    }

    const position = await OfficeHoursService.getQueuePosition(queueEntry.Id);

    res.json({ 
      queueEntry, 
      position,
      inQueue: true 
    });
  } catch (error) {
    console.error('Error fetching queue entry:', error);
    res.status(500).json({ 
      message: 'Failed to fetch queue entry', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/office-hours/my-session
 * @desc    Get student's active session for ANY instructor
 * @access  Private
 */
router.get('/my-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const queueEntry = await OfficeHoursService.getStudentActiveSession(req.user!.userId);

    if (!queueEntry) {
      return res.json({ queueEntry: null, inQueue: false });
    }

    const position = queueEntry.Status === 'waiting'
      ? await OfficeHoursService.getQueuePosition(queueEntry.Id)
      : 0;

    res.json({ queueEntry, position, inQueue: true });
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({
      message: 'Failed to fetch active session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/office-hours/available-now
 * @desc    Get instructors with office hours right now
 * @access  Private
 */
router.get('/available-now', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const instructors = await OfficeHoursService.getAvailableNow(req.user!.userId);
    res.json({ instructors, count: instructors.length });
  } catch (error) {
    console.error('Error fetching available instructors:', error);
    res.status(500).json({
      message: 'Failed to fetch available instructors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/office-hours/course/:courseId
 * @desc    Get office hours for a specific course's instructor
 * @access  Private
 */
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;
    const schedules = await OfficeHoursService.getCourseOfficeHours(courseId);
    res.json({ schedules, count: schedules.length });
  } catch (error) {
    console.error('Error fetching course office hours:', error);
    res.status(500).json({
      message: 'Failed to fetch course office hours',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/office-hours/history
 * @desc    Get session history for the authenticated user
 * @access  Private
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const role = (req.user!.role === 'instructor') ? 'instructor' : 'student';
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await OfficeHoursService.getSessionHistory(req.user!.userId, role, limit);
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({
      message: 'Failed to fetch session history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/office-hours/session/:queueId/notes
 * @desc    Add instructor notes to a completed session
 * @access  Private (instructor)
 */
router.post('/session/:queueId/notes', authenticateToken, checkRole(['instructor']), async (req: AuthRequest, res) => {
  try {
    const { queueId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ message: 'Notes content is required' });
    }

    await OfficeHoursService.addSessionNotes(queueId, req.user!.userId, notes);
    res.json({ message: 'Session notes saved' });
  } catch (error) {
    console.error('Error saving session notes:', error);
    res.status(500).json({
      message: 'Failed to save session notes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/office-hours/instructors
 * @desc    Get enrolled instructors for the authenticated student
 * @access  Private
 */
router.get('/instructors', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const instructors = await OfficeHoursService.getEnrolledInstructors(req.user!.userId);
    res.json({ instructors, count: instructors.length });
  } catch (error) {
    console.error('Error fetching enrolled instructors:', error);
    res.status(500).json({
      message: 'Failed to fetch instructors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
