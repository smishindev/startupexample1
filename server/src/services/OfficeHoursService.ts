import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import { ChatService } from './ChatService';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import {
  OfficeHoursScheduleRecord,
  OfficeHoursQueueEntry,
  AvailableInstructorResult,
  SessionHistoryRecord
} from '../types/database';

// ===================================
// Interfaces
// ===================================

interface CreateScheduleParams {
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseId?: string;
  meetingUrl?: string;
  description?: string;
}

interface JoinQueueParams {
  instructorId: string;
  studentId: string;
  scheduleId: string;
  question?: string;
  courseId?: string;
  lessonId?: string;
}

// ===================================
// Service
// ===================================

export class OfficeHoursService {
  private static io: SocketIOServer | null = null;
  private static notificationService: NotificationService = new NotificationService();
  private static chatService: ChatService | null = null;

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
    this.notificationService.setSocketIO(io);
    this.chatService = new ChatService(io);
  }

  // ===================================
  // Schedule CRUD
  // ===================================

  /**
   * Create office hours schedule for an instructor
   */
  static async createSchedule(params: CreateScheduleParams): Promise<OfficeHoursScheduleRecord> {
    const db = DatabaseService.getInstance();

    if (params.dayOfWeek < 0 || params.dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    const startTime = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
    const endTime = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

    const request = await db.getRequest();
    request.input('instructorId', sql.UniqueIdentifier, params.instructorId);
    request.input('dayOfWeek', sql.Int, params.dayOfWeek);
    request.input('startTime', sql.VarChar(8), startTime);
    request.input('endTime', sql.VarChar(8), endTime);
    request.input('courseId', sql.UniqueIdentifier, params.courseId || null);
    request.input('meetingUrl', sql.NVarChar(500), params.meetingUrl || null);
    request.input('description', sql.NVarChar(500), params.description || null);

    const result = await request.query(`
      INSERT INTO dbo.OfficeHours (InstructorId, DayOfWeek, StartTime, EndTime, CourseId, MeetingUrl, Description)
      VALUES (@instructorId, @dayOfWeek, CAST(@startTime AS TIME), CAST(@endTime AS TIME), @courseId, @meetingUrl, @description);

      SELECT
        oh.Id, oh.InstructorId, oh.DayOfWeek,
        CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
        CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
        oh.CourseId, oh.MeetingUrl, oh.Description, oh.IsActive, oh.IsDeleted, oh.CreatedAt,
        c.Title as CourseName
      FROM dbo.OfficeHours oh
      LEFT JOIN dbo.Courses c ON oh.CourseId = c.Id
      WHERE oh.Id = (SELECT TOP 1 Id FROM dbo.OfficeHours WHERE InstructorId = @instructorId ORDER BY CreatedAt DESC)
    `);

    const schedule = result.recordset[0] as OfficeHoursScheduleRecord;

    // Broadcast to all office-hours visitors so Available Now refreshes
    if (this.io) {
      this.io.to('office-hours-lobby').emit('schedule-changed', {
        action: 'created',
        instructorId: params.instructorId,
        scheduleId: schedule.Id,
        timestamp: new Date()
      });
    }

    return schedule;
  }

  /**
   * Get office hours schedules for an instructor
   */
  static async getInstructorSchedules(instructorId: string): Promise<OfficeHoursScheduleRecord[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT
          oh.Id, oh.InstructorId, oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.CourseId, oh.MeetingUrl, oh.Description,
          oh.IsActive, oh.IsDeleted, oh.CreatedAt,
          c.Title as CourseName
        FROM dbo.OfficeHours oh
        LEFT JOIN dbo.Courses c ON oh.CourseId = c.Id
        WHERE oh.InstructorId = @instructorId
          AND oh.IsDeleted = 0
        ORDER BY oh.IsActive DESC, oh.DayOfWeek, oh.StartTime
      `);

    return result.recordset as OfficeHoursScheduleRecord[];
  }

  /**
   * Update office hours schedule
   */
  static async updateSchedule(
    scheduleId: string,
    updates: {
      DayOfWeek?: number;
      StartTime?: string;
      EndTime?: string;
      IsActive?: boolean;
      CourseId?: string | null;
      MeetingUrl?: string | null;
      Description?: string | null;
    }
  ): Promise<OfficeHoursScheduleRecord> {
    const db = DatabaseService.getInstance();

    const updateParts: string[] = [];
    const request = await db.getRequest();
    request.input('scheduleId', sql.UniqueIdentifier, scheduleId);

    if (updates.DayOfWeek !== undefined) {
      updateParts.push('DayOfWeek = @dayOfWeek');
      request.input('dayOfWeek', sql.Int, updates.DayOfWeek);
    }
    if (updates.StartTime !== undefined) {
      const startTime = updates.StartTime.length === 5 ? `${updates.StartTime}:00` : updates.StartTime;
      updateParts.push('StartTime = CAST(@startTime AS TIME)');
      request.input('startTime', sql.VarChar(8), startTime);
    }
    if (updates.EndTime !== undefined) {
      const endTime = updates.EndTime.length === 5 ? `${updates.EndTime}:00` : updates.EndTime;
      updateParts.push('EndTime = CAST(@endTime AS TIME)');
      request.input('endTime', sql.VarChar(8), endTime);
    }
    if (updates.CourseId !== undefined) {
      updateParts.push('CourseId = @courseId');
      request.input('courseId', sql.UniqueIdentifier, updates.CourseId);
    }
    if (updates.MeetingUrl !== undefined) {
      updateParts.push('MeetingUrl = @meetingUrl');
      request.input('meetingUrl', sql.NVarChar(500), updates.MeetingUrl);
    }
    if (updates.Description !== undefined) {
      updateParts.push('Description = @description');
      request.input('description', sql.NVarChar(500), updates.Description);
    }
    if (updates.IsActive !== undefined) {
      updateParts.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, updates.IsActive);

      // If deactivating, cancel pending queue entries for THIS schedule only
      if (updates.IsActive === false) {
        const scheduleResult = await (await db.getRequest())
          .input('scheduleId', sql.UniqueIdentifier, scheduleId)
          .query('SELECT InstructorId FROM dbo.OfficeHours WHERE Id = @scheduleId');

        if (scheduleResult.recordset.length > 0) {
          const instructorId = scheduleResult.recordset[0].InstructorId;
          await (await db.getRequest())
            .input('scheduleId2', sql.UniqueIdentifier, scheduleId)
            .query(`
              UPDATE dbo.OfficeHoursQueue
              SET Status = 'cancelled', CompletedAt = GETUTCDATE()
              WHERE ScheduleId = @scheduleId2
                AND Status IN ('waiting', 'admitted')
            `);

          if (this.io) {
            this.io.to(`office-hours-${instructorId}`).emit('queue-updated', {
              action: 'cleared',
              timestamp: new Date()
            });
          }
        }
      }
    }

    if (updateParts.length === 0) {
      throw new Error('No updates provided');
    }

    const query = `
      UPDATE dbo.OfficeHours SET ${updateParts.join(', ')} WHERE Id = @scheduleId;

      SELECT
        oh.Id, oh.InstructorId, oh.DayOfWeek,
        CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
        CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
        oh.CourseId, oh.MeetingUrl, oh.Description,
        oh.IsActive, oh.IsDeleted, oh.CreatedAt,
        c.Title as CourseName
      FROM dbo.OfficeHours oh
      LEFT JOIN dbo.Courses c ON oh.CourseId = c.Id
      WHERE oh.Id = @scheduleId
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new Error('Schedule not found');
    }

    const updated = result.recordset[0] as OfficeHoursScheduleRecord;

    // Broadcast schedule change to all office-hours visitors
    if (this.io) {
      this.io.to('office-hours-lobby').emit('schedule-changed', {
        action: 'updated',
        instructorId: updated.InstructorId,
        scheduleId: updated.Id,
        timestamp: new Date()
      });
    }

    return updated;
  }

  /**
   * Delete office hours schedule (soft delete - sets IsDeleted flag, keeps in DB for history)
   */
  static async deleteSchedule(scheduleId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    // First, cancel all pending queue entries for this schedule's instructor
    const scheduleResult = await (await db.getRequest())
      .input('scheduleId', sql.UniqueIdentifier, scheduleId)
      .query('SELECT InstructorId FROM dbo.OfficeHours WHERE Id = @scheduleId');
    
    if (scheduleResult.recordset.length > 0) {
      const instructorId = scheduleResult.recordset[0].InstructorId;
      
      // Cancel pending queue entries for THIS schedule only
      await (await db.getRequest())
        .input('scheduleId2', sql.UniqueIdentifier, scheduleId)
        .query(`
          UPDATE dbo.OfficeHoursQueue
          SET Status = 'cancelled', CompletedAt = GETUTCDATE()
          WHERE ScheduleId = @scheduleId2
            AND Status IN ('waiting', 'admitted')
        `);
      
      // Notify via socket
      if (this.io) {
        this.io.to(`office-hours-${instructorId}`).emit('queue-updated', {
          action: 'cleared',
          timestamp: new Date()
        });
      }
    }

    // Soft delete - mark as deleted but keep in database for history
    await (await db.getRequest())
      .input('scheduleId', sql.UniqueIdentifier, scheduleId)
      .query(`
        UPDATE dbo.OfficeHours
        SET IsDeleted = 1, IsActive = 0
        WHERE Id = @scheduleId
      `);

    // Broadcast schedule deletion to all office-hours visitors
    if (this.io) {
      const instId = scheduleResult.recordset[0]?.InstructorId;
      this.io.to('office-hours-lobby').emit('schedule-changed', {
        action: 'deleted',
        instructorId: instId,
        scheduleId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Student joins office hours queue
   */
  static async joinQueue(params: JoinQueueParams): Promise<OfficeHoursQueueEntry> {
    const db = DatabaseService.getInstance();

    // Check if student is already in queue for this instructor
    const existing = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('studentId', sql.UniqueIdentifier, params.studentId)
      .query(`
        SELECT * FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND StudentId = @studentId
          AND Status IN ('waiting', 'admitted')
      `);

    if (existing.recordset.length > 0) {
      throw new Error('Student is already in queue');
    }

    const request = await db.getRequest();
    request.input('instructorId', sql.UniqueIdentifier, params.instructorId);
    request.input('studentId', sql.UniqueIdentifier, params.studentId);
    request.input('scheduleId', sql.UniqueIdentifier, params.scheduleId);
    request.input('question', sql.NVarChar(500), params.question || null);
    // Auto-populate courseId from schedule if not explicitly provided
    let resolvedCourseId = params.courseId || null;
    if (!resolvedCourseId && params.scheduleId) {
      const scheduleResult = await (await db.getRequest())
        .input('scheduleId', sql.UniqueIdentifier, params.scheduleId)
        .query('SELECT CourseId FROM dbo.OfficeHours WHERE Id = @scheduleId');
      if (scheduleResult.recordset.length > 0 && scheduleResult.recordset[0].CourseId) {
        resolvedCourseId = scheduleResult.recordset[0].CourseId;
      }
    }

    request.input('courseId', sql.UniqueIdentifier, resolvedCourseId);
    request.input('lessonId', sql.UniqueIdentifier, params.lessonId || null);

    const insertResult = await request.query(`
      INSERT INTO dbo.OfficeHoursQueue (InstructorId, StudentId, ScheduleId, Question, CourseId, LessonId)
      OUTPUT INSERTED.Id
      VALUES (@instructorId, @studentId, @scheduleId, @question, @courseId, @lessonId)
    `);

    const queueId = insertResult.recordset[0].Id;

    // Fetch the complete record with joins
    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.Id = @queueId
      `);

    const queueEntry = result.recordset[0] as OfficeHoursQueueEntry;
    const position = await this.getQueuePosition(queueEntry.Id);

    // Get student info for notification
    const studentResult = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, params.studentId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @studentId`);
    const student = studentResult.recordset[0];
    const studentName = `${student.FirstName} ${student.LastName}`;

    // Build context-rich notification message
    let notifMessage = `${studentName} has joined your office hours queue`;
    if (queueEntry.CourseName) {
      notifMessage += ` for ${queueEntry.CourseName}`;
      if (queueEntry.LessonTitle) {
        notifMessage += ` > ${queueEntry.LessonTitle}`;
      }
    }
    if (params.question) {
      notifMessage += `: "${params.question}"`;
    } else {
      notifMessage += '.';
    }

    // Create persistent notification for instructor
    await this.notificationService.createNotificationWithControls(
      {
        userId: params.instructorId,
        type: 'course',
        priority: 'normal',
        title: 'Office Hours — Student Joined Queue',
        message: notifMessage,
        actionUrl: '/office-hours',
        actionText: 'View Queue'
      },
      { category: 'community', subcategory: 'OfficeHours' }
    );

    // Broadcast to instructor's office hours room
    if (this.io) {
      this.io.to(`office-hours-${params.instructorId}`).emit('queue-updated', {
        action: 'joined',
        queueId: queueEntry.Id,
        studentId: params.studentId,
        position,
        timestamp: queueEntry.JoinedQueueAt
      });
    }

    return queueEntry;
  }

  /**
   * Get current queue for an instructor (waiting + admitted entries)
   */
  static async getQueue(instructorId: string): Promise<OfficeHoursQueueEntry[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.InstructorId = @instructorId
          AND q.Status IN ('waiting', 'admitted')
        ORDER BY
          CASE WHEN q.Status = 'admitted' THEN 0 ELSE 1 END,
          q.JoinedQueueAt ASC
      `);

    // Add position to waiting entries
    let position = 1;
    for (const entry of result.recordset) {
      if (entry.Status === 'waiting') {
        entry.Position = position++;
      }
    }

    return result.recordset as OfficeHoursQueueEntry[];
  }

  /**
   * Get queue position for a specific entry
   */
  static async getQueuePosition(queueId: string): Promise<number> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT 
          (SELECT COUNT(*) 
           FROM dbo.OfficeHoursQueue q2 
           WHERE q2.InstructorId = q1.InstructorId 
             AND q2.Status = 'waiting'
             AND q2.JoinedQueueAt < q1.JoinedQueueAt) + 1 as Position
        FROM dbo.OfficeHoursQueue q1
        WHERE q1.Id = @queueId
      `);

    if (result.recordset.length === 0) {
      return 0;
    }

    return result.recordset[0].Position || 0;
  }

  /**
   * Instructor admits a student from queue — creates a DM chat room
   */
  static async admitStudent(instructorId: string, queueId: string): Promise<OfficeHoursQueueEntry> {
    const db = DatabaseService.getInstance();

    // Update status to admitted
    const updateResult = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET Status = 'admitted', AdmittedAt = GETUTCDATE()
        WHERE Id = @queueId
          AND InstructorId = @instructorId
          AND Status = 'waiting'
      `);

    if (updateResult.rowsAffected[0] === 0) {
      throw new Error('Queue entry not found, not in waiting state, or does not belong to you');
    }

    // Get the queue entry to find student ID
    const entryResult = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`SELECT StudentId, InstructorId FROM dbo.OfficeHoursQueue WHERE Id = @queueId`);

    const studentId = entryResult.recordset[0].StudentId;

    // Auto-create a DM chat room between instructor and student
    let chatRoomId: string | null = null;
    if (this.chatService) {
      try {
        const chatRoom = await this.chatService.createDirectMessageRoom(instructorId, studentId);
        chatRoomId = chatRoom.Id;

        // Store the chat room ID on the queue entry
        await (await db.getRequest())
          .input('queueId', sql.UniqueIdentifier, queueId)
          .input('chatRoomId', sql.UniqueIdentifier, chatRoomId)
          .query(`UPDATE dbo.OfficeHoursQueue SET ChatRoomId = @chatRoomId WHERE Id = @queueId`);

        // Send a system message to the chat room
        await this.chatService.sendMessage(
          chatRoomId,
          instructorId,
          '📋 Office hours session started. How can I help you today?',
          'system'
        );
      } catch (chatErr) {
        logger.warn('Failed to create chat room for office hours', { error: chatErr, queueId });
      }
    }

    // Fetch the complete updated record
    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found after admit');
    }

    const queueEntry = result.recordset[0] as OfficeHoursQueueEntry;

    // Get instructor name for notification
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @instructorId`);
    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Notification for student
    let admitMessage = `${instructorName} has admitted you to their office hours.`;
    if (chatRoomId) {
      admitMessage += ' A chat has been opened — you can start your conversation now.';
    }
    if (queueEntry.MeetingUrl) {
      admitMessage += ' A meeting link is also available.';
    }

    await this.notificationService.createNotificationWithControls(
      {
        userId: studentId,
        type: 'course',
        priority: 'high',
        title: 'Office Hours — You\'ve Been Admitted!',
        message: admitMessage,
        actionUrl: '/office-hours',
        actionText: 'Go to Office Hours'
      },
      { category: 'community', subcategory: 'OfficeHours' }
    );

    // Socket.IO events
    if (this.io) {
      this.io.to(`user-${studentId}`).emit('office-hours-admitted', {
        queueId: queueEntry.Id,
        instructorId,
        chatRoomId,
        meetingUrl: queueEntry.MeetingUrl || null,
        admittedAt: queueEntry.AdmittedAt
      });

      this.io.to(`office-hours-${instructorId}`).emit('queue-updated', {
        action: 'admitted',
        queueId: queueEntry.Id,
        studentId,
        chatRoomId,
        timestamp: queueEntry.AdmittedAt
      });
    }

    return queueEntry;
  }

  /**
   * Complete an office hours session with optional instructor notes
   */
  static async completeSession(
    instructorId: string,
    queueId: string,
    instructorNotes?: string
  ): Promise<OfficeHoursQueueEntry> {
    const db = DatabaseService.getInstance();

    const request = await db.getRequest();
    request.input('queueId', sql.UniqueIdentifier, queueId);
    request.input('instructorId', sql.UniqueIdentifier, instructorId);
    request.input('instructorNotes', sql.NVarChar(1000), instructorNotes || null);

    const updateResult = await request.query(`
      UPDATE dbo.OfficeHoursQueue
      SET Status = 'completed', CompletedAt = GETUTCDATE(), InstructorNotes = @instructorNotes
      WHERE Id = @queueId
        AND InstructorId = @instructorId
        AND Status = 'admitted'
    `);

    if (updateResult.rowsAffected[0] === 0) {
      throw new Error('Queue entry not found, not in admitted state, or does not belong to you');
    }

    // Fetch the complete record
    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or not admitted');
    }

    const queueEntry = result.recordset[0] as OfficeHoursQueueEntry;

    // Calculate duration
    let durationMessage = '';
    if (queueEntry.AdmittedAt && queueEntry.CompletedAt) {
      const admittedTime = new Date(queueEntry.AdmittedAt).getTime();
      const completedTime = new Date(queueEntry.CompletedAt).getTime();
      const durationMinutes = Math.round((completedTime - admittedTime) / (1000 * 60));
      durationMessage = ` Duration: ${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}.`;
    }

    // Get instructor name
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @instructorId`);
    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Notification for student
    let completionMessage = `Your office hours session with ${instructorName} has ended.${durationMessage}`;
    if (instructorNotes) {
      completionMessage += ` Instructor notes: "${instructorNotes}"`;
    }
    completionMessage += ' Thank you for joining!';

    try {
      await this.notificationService.createNotificationWithControls(
        {
          userId: queueEntry.StudentId,
          type: 'course',
          priority: 'normal',
          title: 'Office Hours Session Completed',
          message: completionMessage,
          actionUrl: '/office-hours',
          actionText: 'View Office Hours'
        },
        { category: 'community', subcategory: 'OfficeHours' }
      );
    } catch (notificationError) {
      logger.error('Failed to send office hours completion notification', { error: notificationError });
    }

    // Send system message to chat room if exists
    if (queueEntry.ChatRoomId && this.chatService) {
      try {
        let sysMsg = '✅ Office hours session completed.';
        if (instructorNotes) {
          sysMsg += ` Instructor notes: "${instructorNotes}"`;
        }
        await this.chatService.sendMessage(
          queueEntry.ChatRoomId,
          instructorId,
          sysMsg,
          'system'
        );
      } catch (err) {
        logger.warn('Failed to send completion message to chat room', { error: err });
      }
    }

    // Socket.IO events
    if (this.io) {
      this.io.to(`user-${queueEntry.StudentId}`).emit('office-hours-completed', {
        queueId: queueEntry.Id,
        instructorId,
        completedAt: queueEntry.CompletedAt,
        instructorNotes: instructorNotes || null
      });

      this.io.to(`office-hours-${instructorId}`).emit('queue-updated', {
        action: 'completed',
        queueId: queueEntry.Id,
        studentId: queueEntry.StudentId,
        timestamp: queueEntry.CompletedAt
      });
    }

    return queueEntry;
  }

  /**
   * Cancel a queue entry (caller must be the student or the instructor)
   */
  static async cancelQueueEntry(queueId: string, userId: string): Promise<OfficeHoursQueueEntry> {
    const db = DatabaseService.getInstance();

    // Ownership check: only the student or instructor may cancel
    const ownerCheck = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT Id FROM dbo.OfficeHoursQueue
        WHERE Id = @queueId
          AND (StudentId = @userId OR InstructorId = @userId)
          AND Status IN ('waiting', 'admitted')
      `);

    if (ownerCheck.recordset.length === 0) {
      throw new Error('Queue entry not found, already completed, or you do not have permission to cancel it');
    }

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET Status = 'cancelled', CompletedAt = GETUTCDATE()
        WHERE Id = @queueId AND Status IN ('waiting', 'admitted');

        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          c.Title as CourseName,
          l.Title as LessonTitle
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        WHERE q.Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or already completed');
    }

    const queueEntry = result.recordset[0] as OfficeHoursQueueEntry;

    // Get instructor name
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, queueEntry.InstructorId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @instructorId`);
    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Notification for student
    await this.notificationService.createNotificationWithControls(
      {
        userId: queueEntry.StudentId,
        type: 'course',
        priority: 'normal',
        title: 'Office Hours — Session Cancelled',
        message: `Your office hours session with ${instructorName} has been cancelled.`,
        actionUrl: '/office-hours',
        actionText: 'View Office Hours'
      },
      { category: 'community', subcategory: 'OfficeHours' }
    );

    // Socket.IO events
    if (this.io) {
      this.io.to(`office-hours-${queueEntry.InstructorId}`).emit('queue-updated', {
        action: 'cancelled',
        queueId: queueEntry.Id,
        studentId: queueEntry.StudentId,
        timestamp: new Date()
      });

      this.io.to(`user-${queueEntry.StudentId}`).emit('office-hours-cancelled', {
        queueId: queueEntry.Id,
        instructorId: queueEntry.InstructorId
      });
    }

    return queueEntry;
  }

  /**
   * Get student's active queue entry for a specific instructor
   */
  static async getStudentQueueEntry(studentId: string, instructorId: string): Promise<OfficeHoursQueueEntry | null> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, studentId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.StudentId = @studentId
          AND q.InstructorId = @instructorId
          AND q.Status IN ('waiting', 'admitted')
      `);

    if (result.recordset.length === 0) return null;
    return result.recordset[0] as OfficeHoursQueueEntry;
  }

  /**
   * Get student's active queue entry for ANY instructor (used by the page to show active session)
   */
  static async getStudentActiveSession(studentId: string): Promise<OfficeHoursQueueEntry | null> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, studentId)
      .query(`
        SELECT TOP 1
          q.Id, q.InstructorId, q.StudentId, q.ScheduleId, q.CourseId, q.LessonId,
          q.ChatRoomId, q.Question, q.InstructorNotes, q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
          c.Title as CourseName,
          l.Title as LessonTitle,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.MeetingUrl
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.InstructorId = u.Id
        LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
        LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.StudentId = @studentId
          AND q.Status IN ('waiting', 'admitted')
        ORDER BY q.JoinedQueueAt DESC
      `);

    if (result.recordset.length === 0) return null;
    return result.recordset[0] as OfficeHoursQueueEntry;
  }

  /**
   * Get queue statistics for an instructor
   */
  static async getQueueStats(instructorId: string): Promise<{
    waiting: number;
    admitted: number;
    completedToday: number;
    averageWaitTime: number | null;
  }> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT
          SUM(CASE WHEN Status = 'waiting' THEN 1 ELSE 0 END) as Waiting,
          SUM(CASE WHEN Status = 'admitted' THEN 1 ELSE 0 END) as Admitted
        FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND Status IN ('waiting', 'admitted');

        SELECT COUNT(*) as CompletedToday
        FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND Status = 'completed'
          AND CAST(CompletedAt AS DATE) = CAST(GETUTCDATE() AS DATE);

        SELECT AVG(DATEDIFF(MINUTE, JoinedQueueAt, AdmittedAt)) as AvgWaitTime
        FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND Status = 'completed'
          AND AdmittedAt IS NOT NULL
          AND JoinedQueueAt >= DATEADD(DAY, -7, GETUTCDATE());
      `);

    const sets = result.recordsets as any[];
    return {
      waiting: sets[0][0]?.Waiting || 0,
      admitted: sets[0][0]?.Admitted || 0,
      completedToday: sets[1][0]?.CompletedToday || 0,
      averageWaitTime: sets[2][0]?.AvgWaitTime || null
    };
  }

  // ===================================
  // New Methods: Available Now, Course Hours, History, Notes
  // ===================================

  /**
   * Get instructors available RIGHT NOW (schedule matches current UTC time + online)
   * Optionally filter by enrolled courses for a specific student
   */
  static async getAvailableNow(studentId?: string): Promise<AvailableInstructorResult[]> {
    const db = DatabaseService.getInstance();

    const request = await db.getRequest();

    // SQL Server DATEPART(WEEKDAY,...) is 1-based (1=Sunday) — our schema is 0-based (0=Sunday)
    let enrollmentFilter = '';
    let studentQueueSelect = 'NULL as StudentQueueStatus,';
    if (studentId) {
      request.input('studentId', sql.UniqueIdentifier, studentId);
      enrollmentFilter = `
        AND (
          oh.CourseId IS NULL
          OR oh.CourseId IN (
            SELECT CourseId FROM dbo.Enrollments
            WHERE UserId = @studentId AND Status IN ('active', 'completed')
          )
        )
      `;
      studentQueueSelect = `
        (SELECT TOP 1 q.Status FROM dbo.OfficeHoursQueue q
         WHERE q.InstructorId = oh.InstructorId
           AND q.StudentId = @studentId
           AND q.Status IN ('waiting', 'admitted')) as StudentQueueStatus,`;
    }

    const result = await request.query(`
      SELECT
        oh.InstructorId,
        CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
        u.Avatar as InstructorAvatar,
        oh.Id as ScheduleId,
        oh.CourseId,
        c.Title as CourseName,
        oh.DayOfWeek,
        CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
        CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
        oh.MeetingUrl,
        oh.Description,
        ISNULL(up.Status, 'offline') as PresenceStatus,
        ${studentQueueSelect}
        (SELECT COUNT(*) FROM dbo.OfficeHoursQueue q
         WHERE q.InstructorId = oh.InstructorId AND q.Status = 'waiting') as WaitingCount,
        (SELECT COUNT(*) FROM dbo.OfficeHoursQueue q
         WHERE q.InstructorId = oh.InstructorId AND q.Status = 'admitted') as AdmittedCount,
        (SELECT AVG(DATEDIFF(MINUTE, q2.JoinedQueueAt, q2.AdmittedAt))
         FROM dbo.OfficeHoursQueue q2
         WHERE q2.InstructorId = oh.InstructorId
           AND q2.Status = 'completed'
           AND q2.AdmittedAt IS NOT NULL
           AND q2.JoinedQueueAt >= DATEADD(DAY, -7, GETUTCDATE())) as AvgWaitTime
      FROM dbo.OfficeHours oh
      JOIN dbo.Users u ON oh.InstructorId = u.Id
      LEFT JOIN dbo.Courses c ON oh.CourseId = c.Id
      LEFT JOIN dbo.UserPresence up ON oh.InstructorId = up.UserId
      WHERE oh.IsActive = 1
        AND oh.IsDeleted = 0
        AND oh.DayOfWeek = (DATEDIFF(dd, 0, GETUTCDATE()) + 1) % 7
        AND CAST(GETUTCDATE() AS TIME) BETWEEN oh.StartTime AND oh.EndTime
        ${enrollmentFilter}
      ORDER BY
        CASE WHEN ISNULL(up.Status, 'offline') = 'online' THEN 0 ELSE 1 END,
        oh.StartTime
    `);

    return result.recordset as AvailableInstructorResult[];
  }

  /**
   * Get office hours for a specific course's instructor
   */
  static async getCourseOfficeHours(courseId: string): Promise<OfficeHoursScheduleRecord[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('courseId', sql.UniqueIdentifier, courseId)
      .query(`
        SELECT
          oh.Id, oh.InstructorId, oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime,
          oh.CourseId, oh.MeetingUrl, oh.Description,
          oh.IsActive, oh.IsDeleted, oh.CreatedAt,
          c.Title as CourseName,
          CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
          u.Avatar as InstructorAvatar
        FROM dbo.OfficeHours oh
        JOIN dbo.Courses c2 ON c2.Id = @courseId
        JOIN dbo.Users u ON oh.InstructorId = u.Id
        LEFT JOIN dbo.Courses c ON oh.CourseId = c.Id
        WHERE oh.InstructorId = c2.InstructorId
          AND oh.IsActive = 1
          AND oh.IsDeleted = 0
          AND (oh.CourseId IS NULL OR oh.CourseId = @courseId)
        ORDER BY oh.DayOfWeek, oh.StartTime
      `);

    return result.recordset as OfficeHoursScheduleRecord[];
  }

  /**
   * Get session history for a user
   */
  static async getSessionHistory(
    userId: string,
    role: 'student' | 'instructor',
    limit: number = 20
  ): Promise<SessionHistoryRecord[]> {
    const db = DatabaseService.getInstance();

    const request = await db.getRequest();
    request.input('userId', sql.UniqueIdentifier, userId);
    request.input('limit', sql.Int, limit);

    const whereClause = role === 'instructor'
      ? 'q.InstructorId = @userId'
      : 'q.StudentId = @userId';

    const result = await request.query(`
      SELECT TOP (@limit)
        q.Id,
        q.InstructorId,
        CONCAT(inst.FirstName, ' ', inst.LastName) as InstructorName,
        q.StudentId,
        CONCAT(stu.FirstName, ' ', stu.LastName) as StudentName,
        q.CourseId,
        c.Title as CourseName,
        q.LessonId,
        l.Title as LessonTitle,
        q.Question,
        q.InstructorNotes,
        q.ChatRoomId,
        FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
        FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
        FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
        CASE
          WHEN q.AdmittedAt IS NOT NULL AND q.CompletedAt IS NOT NULL
          THEN DATEDIFF(MINUTE, q.AdmittedAt, q.CompletedAt)
          ELSE NULL
        END as DurationMinutes
      FROM dbo.OfficeHoursQueue q
      JOIN dbo.Users inst ON q.InstructorId = inst.Id
      JOIN dbo.Users stu ON q.StudentId = stu.Id
      LEFT JOIN dbo.Courses c ON q.CourseId = c.Id
      LEFT JOIN dbo.Lessons l ON q.LessonId = l.Id
      WHERE ${whereClause}
        AND q.Status = 'completed'
      ORDER BY q.CompletedAt DESC
    `);

    return result.recordset as SessionHistoryRecord[];
  }

  /**
   * Add instructor notes to a completed session
   */
  static async addSessionNotes(queueId: string, instructorId: string, notes: string): Promise<void> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .input('notes', sql.NVarChar(1000), notes)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET InstructorNotes = @notes
        WHERE Id = @queueId
          AND InstructorId = @instructorId
          AND Status = 'completed'
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error('Session not found or not completed');
    }
  }

  /**
   * Get instructors for a student (only those the student is enrolled with)
   */
  static async getEnrolledInstructors(studentId: string): Promise<any[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, studentId)
      .query(`
        SELECT DISTINCT
          u.Id,
          u.FirstName,
          u.LastName,
          u.Email,
          u.Avatar,
          ISNULL(up.Status, 'offline') as PresenceStatus,
          (SELECT COUNT(DISTINCT oh.Id) FROM dbo.OfficeHours oh
           WHERE oh.InstructorId = u.Id AND oh.IsActive = 1 AND oh.IsDeleted = 0) as ScheduleCount
        FROM dbo.Users u
        JOIN dbo.Courses c ON c.InstructorId = u.Id
        JOIN dbo.Enrollments e ON e.CourseId = c.Id AND e.UserId = @studentId AND e.Status IN ('active', 'completed')
        LEFT JOIN dbo.UserPresence up ON u.Id = up.UserId
        WHERE u.Role = 'instructor'
        ORDER BY
          CASE WHEN ISNULL(up.Status, 'offline') = 'online' THEN 0 ELSE 1 END,
          u.FirstName
      `);

    return result.recordset;
  }
}
