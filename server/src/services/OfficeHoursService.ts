import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import { Server as SocketIOServer } from 'socket.io';

interface OfficeHoursSchedule {
  Id: string;
  InstructorId: string;
  DayOfWeek: number; // 0 = Sunday, 6 = Saturday
  StartTime: string; // HH:mm:ss format
  EndTime: string;
  IsActive: boolean;
  CreatedAt: Date;
}

interface CreateScheduleParams {
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface QueueEntry {
  Id: string;
  InstructorId: string;
  StudentId: string;
  Status: 'waiting' | 'admitted' | 'completed' | 'cancelled';
  Question?: string;
  JoinedQueueAt: Date;
  AdmittedAt?: Date;
  CompletedAt?: Date;
}

interface JoinQueueParams {
  instructorId: string;
  studentId: string;
  scheduleId: string;
  question?: string;
}

export class OfficeHoursService {
  private static io: SocketIOServer | null = null;
  private static notificationService: NotificationService = new NotificationService();

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
    this.notificationService.setSocketIO(io);
  }

  /**
   * Create office hours schedule for an instructor
   */
  static async createSchedule(params: CreateScheduleParams): Promise<OfficeHoursSchedule> {
    const db = DatabaseService.getInstance();

    // Validate day of week
    if (params.dayOfWeek < 0 || params.dayOfWeek > 6) {
      throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    // Ensure time format is HH:mm:ss
    const startTime = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
    const endTime = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('dayOfWeek', sql.Int, params.dayOfWeek)
      .input('startTime', sql.VarChar(8), startTime)
      .input('endTime', sql.VarChar(8), endTime)
      .query(`
        INSERT INTO dbo.OfficeHours (InstructorId, DayOfWeek, StartTime, EndTime)
        OUTPUT INSERTED.*
        VALUES (@instructorId, @dayOfWeek, CAST(@startTime AS TIME), CAST(@endTime AS TIME))
      `);

    return result.recordset[0] as OfficeHoursSchedule;
  }

  /**
   * Get office hours schedules for an instructor
   */
  static async getInstructorSchedules(instructorId: string): Promise<OfficeHoursSchedule[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT 
          Id,
          InstructorId,
          DayOfWeek,
          CONVERT(VARCHAR(8), StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), EndTime, 108) as EndTime,
          IsActive,
          CreatedAt
        FROM dbo.OfficeHours
        WHERE InstructorId = @instructorId
          AND IsDeleted = 0
        ORDER BY IsActive DESC, DayOfWeek, StartTime
      `);

    return result.recordset as OfficeHoursSchedule[];
  }

  /**
   * Update office hours schedule
   */
  static async updateSchedule(
    scheduleId: string,
    updates: Partial<Pick<OfficeHoursSchedule, 'DayOfWeek' | 'StartTime' | 'EndTime' | 'IsActive'>>
  ): Promise<OfficeHoursSchedule> {
    const db = DatabaseService.getInstance();

    let query = 'UPDATE dbo.OfficeHours SET ';
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
    if (updates.IsActive !== undefined) {
      updateParts.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, updates.IsActive);
      
      // If deactivating (IsActive = false), cancel all pending queue entries
      if (updates.IsActive === false) {
        const scheduleResult = await (await db.getRequest())
          .input('scheduleId', sql.UniqueIdentifier, scheduleId)
          .query('SELECT InstructorId FROM dbo.OfficeHours WHERE Id = @scheduleId');
        
        if (scheduleResult.recordset.length > 0) {
          const instructorId = scheduleResult.recordset[0].InstructorId;
          
          // Cancel all pending queue entries for this instructor
          await (await db.getRequest())
            .input('instructorId', sql.UniqueIdentifier, instructorId)
            .query(`
              UPDATE dbo.OfficeHoursQueue
              SET Status = 'cancelled', CompletedAt = GETUTCDATE()
              WHERE InstructorId = @instructorId
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
      }
    }

    if (updateParts.length === 0) {
      throw new Error('No updates provided');
    }

    query += updateParts.join(', ') + ' OUTPUT INSERTED.* WHERE Id = @scheduleId';

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new Error('Schedule not found');
    }

    return result.recordset[0] as OfficeHoursSchedule;
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
      
      // Cancel all pending queue entries
      await (await db.getRequest())
        .input('instructorId', sql.UniqueIdentifier, instructorId)
        .query(`
          UPDATE dbo.OfficeHoursQueue
          SET Status = 'cancelled', CompletedAt = GETUTCDATE()
          WHERE InstructorId = @instructorId
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
  }

  /**
   * Student joins office hours queue
   */
  static async joinQueue(params: JoinQueueParams): Promise<QueueEntry> {
    const db = DatabaseService.getInstance();

    // Check if student is already in queue
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

    // Add to queue
    const insertResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('studentId', sql.UniqueIdentifier, params.studentId)
      .input('scheduleId', sql.UniqueIdentifier, params.scheduleId)
      .input('question', sql.NVarChar, params.question || null)
      .query(`
        INSERT INTO dbo.OfficeHoursQueue (InstructorId, StudentId, ScheduleId, Question)
        OUTPUT INSERTED.Id
        VALUES (@instructorId, @studentId, @scheduleId, @question)
      `);

    const queueId = insertResult.recordset[0].Id;

    // Fetch the complete record with formatted timestamps
    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT 
          Id, InstructorId, StudentId, ScheduleId, Question, Status,
          FORMAT(JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt
        FROM dbo.OfficeHoursQueue
        WHERE Id = @queueId
      `);

    const queueEntry = result.recordset[0] as QueueEntry;

    // Get queue position
    const position = await this.getQueuePosition(queueEntry.Id);

    // Get student info for notification
    const studentResult = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, params.studentId)
      .query(`
        SELECT FirstName, LastName 
        FROM dbo.Users 
        WHERE Id = @studentId
      `);

    const student = studentResult.recordset[0];
    const studentName = `${student.FirstName} ${student.LastName}`;

    // Create persistent notification for instructor
    await this.notificationService.createNotification({
      userId: params.instructorId,
      type: 'course',
      priority: 'normal',
      title: 'Office Hours - Student Joined Queue',
      message: `${studentName} has joined your office hours queue${params.question ? ': ' + params.question : '.'}`,
      actionUrl: '/office-hours',
      actionText: 'View Queue'
    });

    // Broadcast to instructor
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
   * Get current queue for an instructor
   */
  static async getQueue(instructorId: string): Promise<any[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT 
          q.Id,
          q.InstructorId,
          q.StudentId,
          q.ScheduleId,
          q.Question,
          q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          CONCAT(u.FirstName, ' ', u.LastName) as StudentName,
          u.Email as StudentEmail,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.InstructorId = @instructorId 
          AND q.Status IN ('waiting', 'admitted')
        ORDER BY q.JoinedQueueAt ASC
      `);

    // Add position to each entry
    const queue = result.recordset;
    let position = 1;
    for (const entry of queue) {
      if (entry.Status === 'waiting') {
        entry.Position = position++;
      }
    }

    return queue;
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
   * Instructor admits next student from queue
   */
  static async admitStudent(instructorId: string, queueId: string): Promise<QueueEntry> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET Status = 'admitted', AdmittedAt = GETUTCDATE()
        WHERE Id = @queueId 
          AND InstructorId = @instructorId 
          AND Status = 'waiting';

        SELECT 
          Id, InstructorId, StudentId, ScheduleId, Question, Status,
          FORMAT(JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt
        FROM dbo.OfficeHoursQueue
        WHERE Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or already processed');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

    // Get instructor info for notification
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT FirstName, LastName 
        FROM dbo.Users 
        WHERE Id = @instructorId
      `);

    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Create persistent notification for student
    await this.notificationService.createNotification({
      userId: queueEntry.StudentId,
      type: 'course',
      priority: 'high',
      title: 'Office Hours - Admitted',
      message: `${instructorName} has admitted you to their office hours. Please join the session.`,
      actionUrl: '/office-hours',
      actionText: 'View Office Hours'
    });

    // Notify student they've been admitted
    if (this.io) {
      this.io.to(`user-${queueEntry.StudentId}`).emit('office-hours-admitted', {
        queueId: queueEntry.Id,
        instructorId,
        admittedAt: queueEntry.AdmittedAt
      });

      // Notify instructor's office hours room
      this.io.to(`office-hours-${instructorId}`).emit('queue-updated', {
        action: 'admitted',
        queueId: queueEntry.Id,
        studentId: queueEntry.StudentId,
        timestamp: queueEntry.AdmittedAt
      });
    }

    return queueEntry;
  }

  /**
   * Complete an office hours session
   */
  static async completeSession(instructorId: string, queueId: string): Promise<QueueEntry> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET Status = 'completed', CompletedAt = GETUTCDATE()
        WHERE Id = @queueId 
          AND InstructorId = @instructorId 
          AND Status = 'admitted';

        SELECT 
          Id, InstructorId, StudentId, ScheduleId, Question, Status,
          FORMAT(JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt
        FROM dbo.OfficeHoursQueue
        WHERE Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or not admitted');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

    // Get instructor info for notification
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT FirstName, LastName 
        FROM dbo.Users 
        WHERE Id = @instructorId
      `);

    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Create persistent notification for student
    await this.notificationService.createNotification({
      userId: queueEntry.StudentId,
      type: 'course',
      priority: 'normal',
      title: 'Office Hours - Session Complete',
      message: `Your office hours session with ${instructorName} has been completed.`,
      actionUrl: '/office-hours',
      actionText: 'View Office Hours'
    });

    // Notify student session is complete
    if (this.io) {
      this.io.to(`user-${queueEntry.StudentId}`).emit('office-hours-completed', {
        queueId: queueEntry.Id,
        instructorId,
        completedAt: queueEntry.CompletedAt
      });

      // Update queue for instructor
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
   * Cancel a queue entry (by student or instructor)
   */
  static async cancelQueueEntry(queueId: string): Promise<QueueEntry> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        UPDATE dbo.OfficeHoursQueue
        SET Status = 'cancelled', CompletedAt = GETUTCDATE()
        WHERE Id = @queueId AND Status IN ('waiting', 'admitted');

        SELECT 
          Id, InstructorId, StudentId, ScheduleId, Question, Status,
          FORMAT(JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt
        FROM dbo.OfficeHoursQueue
        WHERE Id = @queueId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or already completed');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

    // Get instructor info for notification
    const instructorResult = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, queueEntry.InstructorId)
      .query(`
        SELECT FirstName, LastName 
        FROM dbo.Users 
        WHERE Id = @instructorId
      `);

    const instructor = instructorResult.recordset[0];
    const instructorName = `${instructor.FirstName} ${instructor.LastName}`;

    // Create persistent notification for student
    await this.notificationService.createNotification({
      userId: queueEntry.StudentId,
      type: 'course',
      priority: 'normal',
      title: 'Office Hours - Session Cancelled',
      message: `Your office hours session with ${instructorName} has been cancelled.`,
      actionUrl: '/office-hours',
      actionText: 'View Office Hours'
    });

    // Broadcast cancellation
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
   * Get student's queue entry for a specific instructor
   */
  static async getStudentQueueEntry(studentId: string, instructorId: string): Promise<QueueEntry | null> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('studentId', sql.UniqueIdentifier, studentId)
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT 
          q.Id,
          q.InstructorId,
          q.StudentId,
          q.ScheduleId,
          q.Question,
          q.Status,
          FORMAT(q.JoinedQueueAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as JoinedQueueAt,
          FORMAT(q.AdmittedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as AdmittedAt,
          FORMAT(q.CompletedAt, 'yyyy-MM-ddTHH:mm:ss.fff') + 'Z' as CompletedAt,
          oh.DayOfWeek,
          CONVERT(VARCHAR(8), oh.StartTime, 108) as StartTime,
          CONVERT(VARCHAR(8), oh.EndTime, 108) as EndTime
        FROM dbo.OfficeHoursQueue q
        LEFT JOIN dbo.OfficeHours oh ON q.ScheduleId = oh.Id
        WHERE q.StudentId = @studentId 
          AND q.InstructorId = @instructorId 
          AND q.Status IN ('waiting', 'admitted')
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as QueueEntry;
  }

  /**
   * Get queue statistics for an instructor
   */
  static async getQueueStats(instructorId: string): Promise<{
    waiting: number;
    admitted: number;
    averageWaitTime: number | null;
  }> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT 
          SUM(CASE WHEN Status = 'waiting' THEN 1 ELSE 0 END) as Waiting,
          SUM(CASE WHEN Status = 'admitted' THEN 1 ELSE 0 END) as Admitted,
          (SELECT AVG(DATEDIFF(MINUTE, JoinedQueueAt, AdmittedAt))
           FROM dbo.OfficeHoursQueue
           WHERE InstructorId = @instructorId
             AND Status = 'completed'
             AND AdmittedAt IS NOT NULL
             AND JoinedQueueAt >= DATEADD(DAY, -7, GETUTCDATE())) as AvgWaitTime
        FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND Status IN ('waiting', 'admitted')
      `);

    return {
      waiting: result.recordset[0].Waiting || 0,
      admitted: result.recordset[0].Admitted || 0,
      averageWaitTime: result.recordset[0].AvgWaitTime
    };
  }
}
