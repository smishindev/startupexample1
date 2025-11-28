import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { Server as SocketIOServer } from 'socket.io';

interface CreateSessionParams {
  title: string;
  description: string;
  instructorId: string;
  courseId?: string | null;
  scheduledAt: Date;
  duration?: number;
  capacity?: number;
  streamUrl?: string;
  materials?: any[];
}

interface LiveSession {
  Id: string;
  Title: string;
  Description: string;
  InstructorId: string;
  CourseId?: string | null;
  ScheduledAt: Date;
  StartedAt?: Date | null;
  EndedAt?: Date | null;
  Duration: number;
  Capacity: number;
  Status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  StreamUrl?: string | null;
  RecordingUrl?: string | null;
  Materials?: any;
  CreatedAt: Date;
  UpdatedAt: Date;
}

interface SessionAttendee {
  Id: string;
  SessionId: string;
  UserId: string;
  JoinedAt: Date;
  LeftAt?: Date | null;
  AttendanceMinutes: number;
}

export class LiveSessionService {
  private static io: SocketIOServer | null = null;

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a new live session
   */
  static async createSession(params: CreateSessionParams): Promise<LiveSession> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('title', sql.NVarChar, params.title)
      .input('description', sql.NVarChar, params.description)
      .input('instructorId', sql.UniqueIdentifier, params.instructorId)
      .input('courseId', sql.UniqueIdentifier, params.courseId || null)
      .input('scheduledAt', sql.DateTime2, params.scheduledAt)
      .input('duration', sql.Int, params.duration || 60)
      .input('capacity', sql.Int, params.capacity || 100)
      .input('streamUrl', sql.NVarChar, params.streamUrl || null)
      .input('materials', sql.NVarChar, params.materials ? JSON.stringify(params.materials) : null)
      .query(`
        INSERT INTO dbo.LiveSessions (
          Title, Description, InstructorId, CourseId, ScheduledAt, 
          Duration, Capacity, StreamUrl, Materials
        )
        OUTPUT INSERTED.*
        VALUES (
          @title, @description, @instructorId, @courseId, @scheduledAt,
          @duration, @capacity, @streamUrl, @materials
        )
      `);

    const session = result.recordset[0] as LiveSession;

    // Parse materials JSON if exists
    if (session.Materials) {
      session.Materials = JSON.parse(session.Materials);
    }

    // Broadcast to course students if courseId exists
    if (params.courseId && this.io) {
      this.io.to(`course-${params.courseId}`).emit('live-session-scheduled', {
        sessionId: session.Id,
        title: session.Title,
        scheduledAt: session.ScheduledAt,
        instructorId: session.InstructorId
      });
    }

    return session;
  }

  /**
   * Start a live session
   */
  static async startSession(sessionId: string): Promise<LiveSession> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        UPDATE dbo.LiveSessions
        SET Status = 'live', StartedAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE Id = @sessionId AND Status = 'scheduled'
      `);

    if (result.recordset.length === 0) {
      throw new Error('Session not found or not in scheduled status');
    }

    const session = result.recordset[0] as LiveSession;

    // Parse materials JSON if exists
    if (session.Materials) {
      session.Materials = JSON.parse(session.Materials);
    }

    // Broadcast session start to all attendees
    if (this.io) {
      this.io.to(`session-${sessionId}`).emit('session-started', {
        sessionId: session.Id,
        startedAt: session.StartedAt,
        streamUrl: session.StreamUrl
      });

      // Also notify course students
      if (session.CourseId) {
        this.io.to(`course-${session.CourseId}`).emit('live-session-started', {
          sessionId: session.Id,
          title: session.Title,
          startedAt: session.StartedAt
        });
      }
    }

    return session;
  }

  /**
   * End a live session
   */
  static async endSession(sessionId: string, recordingUrl?: string): Promise<LiveSession> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .input('recordingUrl', sql.NVarChar, recordingUrl || null)
      .query(`
        UPDATE dbo.LiveSessions
        SET Status = 'ended', EndedAt = GETUTCDATE(), RecordingUrl = @recordingUrl, UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE Id = @sessionId AND Status = 'live'
      `);

    if (result.recordset.length === 0) {
      throw new Error('Session not found or not in live status');
    }

    const session = result.recordset[0] as LiveSession;

    // Parse materials JSON if exists
    if (session.Materials) {
      session.Materials = JSON.parse(session.Materials);
    }

    // Update all active attendees' LeftAt timestamp
    await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        UPDATE dbo.LiveSessionAttendees
        SET LeftAt = GETUTCDATE()
        WHERE SessionId = @sessionId AND LeftAt IS NULL
      `);

    // Broadcast session end
    if (this.io) {
      this.io.to(`session-${sessionId}`).emit('session-ended', {
        sessionId: session.Id,
        endedAt: session.EndedAt,
        recordingUrl: session.RecordingUrl
      });
    }

    return session;
  }

  /**
   * Cancel a scheduled session
   */
  static async cancelSession(sessionId: string): Promise<LiveSession> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        UPDATE dbo.LiveSessions
        SET Status = 'cancelled', UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE Id = @sessionId AND Status = 'scheduled'
      `);

    if (result.recordset.length === 0) {
      throw new Error('Session not found or not in scheduled status');
    }

    const session = result.recordset[0] as LiveSession;

    // Broadcast cancellation
    if (this.io && session.CourseId) {
      this.io.to(`course-${session.CourseId}`).emit('live-session-cancelled', {
        sessionId: session.Id,
        title: session.Title
      });
    }

    return session;
  }

  /**
   * Add an attendee to a live session
   */
  static async addAttendee(sessionId: string, userId: string): Promise<SessionAttendee> {
    const db = DatabaseService.getInstance();

    // Check session capacity
    const capacityCheck = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT ls.Capacity, COUNT(lsa.Id) as CurrentAttendees
        FROM dbo.LiveSessions ls
        LEFT JOIN dbo.LiveSessionAttendees lsa ON ls.Id = lsa.SessionId AND lsa.LeftAt IS NULL
        WHERE ls.Id = @sessionId AND ls.Status = 'live'
        GROUP BY ls.Capacity
      `);

    if (capacityCheck.recordset.length === 0) {
      throw new Error('Session not found or not live');
    }

    const { Capacity, CurrentAttendees } = capacityCheck.recordset[0];
    if (CurrentAttendees >= Capacity) {
      throw new Error('Session is at full capacity');
    }

    // Add attendee (or update if already exists)
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.LiveSessionAttendees WHERE SessionId = @sessionId AND UserId = @userId)
        BEGIN
          UPDATE dbo.LiveSessionAttendees
          SET LeftAt = NULL
          OUTPUT INSERTED.*
          WHERE SessionId = @sessionId AND UserId = @userId
        END
        ELSE
        BEGIN
          INSERT INTO dbo.LiveSessionAttendees (SessionId, UserId)
          OUTPUT INSERTED.*
          VALUES (@sessionId, @userId)
        END
      `);

    const attendee = result.recordset[0] as SessionAttendee;

    // Broadcast new attendee to session
    if (this.io) {
      this.io.to(`session-${sessionId}`).emit('attendee-joined', {
        sessionId,
        userId,
        joinedAt: attendee.JoinedAt
      });
    }

    return attendee;
  }

  /**
   * Remove an attendee from a live session
   */
  static async removeAttendee(sessionId: string, userId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    // Calculate attendance minutes and update LeftAt
    await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE dbo.LiveSessionAttendees
        SET 
          LeftAt = GETUTCDATE(),
          AttendanceMinutes = DATEDIFF(MINUTE, JoinedAt, GETUTCDATE())
        WHERE SessionId = @sessionId AND UserId = @userId AND LeftAt IS NULL
      `);

    // Broadcast attendee left
    if (this.io) {
      this.io.to(`session-${sessionId}`).emit('attendee-left', {
        sessionId,
        userId,
        leftAt: new Date()
      });
    }
  }

  /**
   * Get session by ID with full details
   */
  static async getSessionById(sessionId: string): Promise<LiveSession | null> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT * FROM dbo.LiveSessions
        WHERE Id = @sessionId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const session = result.recordset[0] as LiveSession;

    // Parse materials JSON if exists
    if (session.Materials) {
      session.Materials = JSON.parse(session.Materials);
    }

    return session;
  }

  /**
   * Get all attendees for a session
   */
  static async getSessionAttendees(sessionId: string): Promise<SessionAttendee[]> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT lsa.*, u.Username, u.Email
        FROM dbo.LiveSessionAttendees lsa
        JOIN dbo.Users u ON lsa.UserId = u.Id
        WHERE lsa.SessionId = @sessionId
        ORDER BY lsa.JoinedAt ASC
      `);

    return result.recordset as SessionAttendee[];
  }

  /**
   * Get current active attendees count
   */
  static async getActiveAttendeesCount(sessionId: string): Promise<number> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT COUNT(*) as Count
        FROM dbo.LiveSessionAttendees
        WHERE SessionId = @sessionId AND LeftAt IS NULL
      `);

    return result.recordset[0].Count;
  }

  /**
   * Get upcoming sessions for a course
   */
  static async getUpcomingSessions(courseId: string, limit: number = 10): Promise<LiveSession[]> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('courseId', sql.UniqueIdentifier, courseId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP(@limit) *
        FROM dbo.LiveSessions
        WHERE CourseId = @courseId 
          AND Status IN ('scheduled', 'live')
          AND ScheduledAt >= GETUTCDATE()
        ORDER BY ScheduledAt ASC
      `);

    return result.recordset.map((session: any) => {
      if (session.Materials) {
        session.Materials = JSON.parse(session.Materials);
      }
      return session as LiveSession;
    });
  }

  /**
   * Get sessions by instructor
   */
  static async getInstructorSessions(
    instructorId: string, 
    status?: 'scheduled' | 'live' | 'ended' | 'cancelled'
  ): Promise<LiveSession[]> {
    const db = DatabaseService.getInstance();
    let query = `
      SELECT *
      FROM dbo.LiveSessions
      WHERE InstructorId = @instructorId
    `;

    if (status) {
      query += ` AND Status = @status`;
    }

    query += ` ORDER BY ScheduledAt DESC`;

    const request = await db.getRequest();
    request.input('instructorId', sql.UniqueIdentifier, instructorId);

    if (status) {
      request.input('status', sql.NVarChar, status);
    }

    const result = await request.query(query);

    return result.recordset.map((session: any) => {
      if (session.Materials) {
        session.Materials = JSON.parse(session.Materials);
      }
      return session as LiveSession;
    });
  }
}
