import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
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
  question?: string;
}

export class OfficeHoursService {
  private static io: SocketIOServer | null = null;

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
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

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('dayOfWeek', sql.Int, params.dayOfWeek)
      .input('startTime', sql.Time, params.startTime)
      .input('endTime', sql.Time, params.endTime)
      .query(`
        INSERT INTO dbo.OfficeHours (InstructorId, DayOfWeek, StartTime, EndTime)
        OUTPUT INSERTED.*
        VALUES (@instructorId, @dayOfWeek, @startTime, @endTime)
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
        SELECT * FROM dbo.OfficeHours
        WHERE InstructorId = @instructorId AND IsActive = 1
        ORDER BY DayOfWeek, StartTime
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
      updateParts.push('StartTime = @startTime');
      request.input('startTime', sql.Time, updates.StartTime);
    }
    if (updates.EndTime !== undefined) {
      updateParts.push('EndTime = @endTime');
      request.input('endTime', sql.Time, updates.EndTime);
    }
    if (updates.IsActive !== undefined) {
      updateParts.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, updates.IsActive);
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
   * Delete office hours schedule (soft delete by setting IsActive = 0)
   */
  static async deleteSchedule(scheduleId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    await (await db.getRequest())
      .input('scheduleId', sql.UniqueIdentifier, scheduleId)
      .query(`
        UPDATE dbo.OfficeHours
        SET IsActive = 0
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
    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('studentId', sql.UniqueIdentifier, params.studentId)
      .input('question', sql.NVarChar, params.question || null)
      .query(`
        INSERT INTO dbo.OfficeHoursQueue (InstructorId, StudentId, Question)
        OUTPUT INSERTED.*
        VALUES (@instructorId, @studentId, @question)
      `);

    const queueEntry = result.recordset[0] as QueueEntry;

    // Get queue position
    const position = await this.getQueuePosition(queueEntry.Id);

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
  static async getQueue(instructorId: string): Promise<QueueEntry[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('instructorId', sql.UniqueIdentifier, instructorId)
      .query(`
        SELECT q.*, u.Username, u.Email, u.FirstName, u.LastName
        FROM dbo.OfficeHoursQueue q
        JOIN dbo.Users u ON q.StudentId = u.Id
        WHERE q.InstructorId = @instructorId 
          AND q.Status IN ('waiting', 'admitted')
        ORDER BY q.JoinedQueueAt ASC
      `);

    return result.recordset as QueueEntry[];
  }

  /**
   * Get queue position for a specific entry
   */
  static async getQueuePosition(queueId: string): Promise<number> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('queueId', sql.UniqueIdentifier, queueId)
      .query(`
        SELECT COUNT(*) + 1 as Position
        FROM dbo.OfficeHoursQueue q1
        JOIN dbo.OfficeHoursQueue q2 ON q1.InstructorId = q2.InstructorId
        WHERE q1.Id = @queueId
          AND q2.Status = 'waiting'
          AND q2.JoinedQueueAt < q1.JoinedQueueAt
      `);

    return result.recordset[0].Position;
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
        OUTPUT INSERTED.*
        WHERE Id = @queueId 
          AND InstructorId = @instructorId 
          AND Status = 'waiting'
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or already processed');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

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
        OUTPUT INSERTED.*
        WHERE Id = @queueId 
          AND InstructorId = @instructorId 
          AND Status = 'admitted'
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or not admitted');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

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
        OUTPUT INSERTED.*
        WHERE Id = @queueId AND Status IN ('waiting', 'admitted')
      `);

    if (result.recordset.length === 0) {
      throw new Error('Queue entry not found or already completed');
    }

    const queueEntry = result.recordset[0] as QueueEntry;

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
        SELECT * FROM dbo.OfficeHoursQueue
        WHERE StudentId = @studentId 
          AND InstructorId = @instructorId 
          AND Status IN ('waiting', 'admitted')
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
          AVG(CASE 
            WHEN Status = 'completed' AND AdmittedAt IS NOT NULL 
            THEN DATEDIFF(MINUTE, JoinedQueueAt, AdmittedAt) 
            ELSE NULL 
          END) as AvgWaitTime
        FROM dbo.OfficeHoursQueue
        WHERE InstructorId = @instructorId
          AND JoinedQueueAt >= DATEADD(DAY, -7, GETUTCDATE())
      `);

    return {
      waiting: result.recordset[0].Waiting || 0,
      admitted: result.recordset[0].Admitted || 0,
      averageWaitTime: result.recordset[0].AvgWaitTime
    };
  }
}
