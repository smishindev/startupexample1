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
   * Update a scheduled session
   */
  static async updateSession(
    sessionId: string,
    updates: {
      title?: string;
      description?: string;
      scheduledAt?: Date;
      duration?: number;
      capacity?: number;
      streamUrl?: string;
      materials?: any[];
    }
  ): Promise<LiveSession> {
    const db = DatabaseService.getInstance();

    // If capacity is being updated, check current attendee count
    if (updates.capacity !== undefined) {
      const attendeeCountResult = await (await db.getRequest())
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query(`
          SELECT COUNT(*) as CurrentAttendees 
          FROM dbo.LiveSessionAttendees 
          WHERE SessionId = @sessionId AND LeftAt IS NULL
        `);
      
      const currentAttendees = attendeeCountResult.recordset[0]?.CurrentAttendees || 0;
      if (updates.capacity < currentAttendees) {
        throw new Error(`Cannot reduce capacity to ${updates.capacity}. Current attendees: ${currentAttendees}`);
      }
    }

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const request = await db.getRequest();
    request.input('sessionId', sql.UniqueIdentifier, sessionId);

    if (updates.title !== undefined) {
      updateFields.push('Title = @title');
      request.input('title', sql.NVarChar, updates.title);
    }
    if (updates.description !== undefined) {
      updateFields.push('Description = @description');
      request.input('description', sql.NVarChar, updates.description);
    }
    if (updates.scheduledAt !== undefined) {
      updateFields.push('ScheduledAt = @scheduledAt');
      request.input('scheduledAt', sql.DateTime2, updates.scheduledAt);
    }
    if (updates.duration !== undefined) {
      updateFields.push('Duration = @duration');
      request.input('duration', sql.Int, updates.duration);
    }
    if (updates.capacity !== undefined) {
      updateFields.push('Capacity = @capacity');
      request.input('capacity', sql.Int, updates.capacity);
    }
    if (updates.streamUrl !== undefined) {
      updateFields.push('StreamUrl = @streamUrl');
      request.input('streamUrl', sql.NVarChar, updates.streamUrl);
    }
    if (updates.materials !== undefined) {
      updateFields.push('Materials = @materials');
      request.input('materials', sql.NVarChar, JSON.stringify(updates.materials));
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update UpdatedAt
    updateFields.push('UpdatedAt = GETUTCDATE()');

    const result = await request.query(`
      UPDATE dbo.LiveSessions
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.*
      WHERE Id = @sessionId AND Status = 'scheduled'
    `);

    if (result.recordset.length === 0) {
      throw new Error('Session not found or cannot be updated (must be in scheduled status)');
    }

    const session = result.recordset[0] as LiveSession;

    // Parse materials JSON if exists
    if (session.Materials) {
      session.Materials = JSON.parse(session.Materials);
    }

    // Broadcast update to course students
    if (this.io && session.CourseId) {
      this.io.to(`course-${session.CourseId}`).emit('live-session-updated', {
        sessionId: session.Id,
        title: session.Title,
        scheduledAt: session.ScheduledAt
      });
    }

    return session;
  }

  /**
   * Delete a session (only if not started)
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    // First get session details for broadcasting
    const sessionResult = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        SELECT * FROM dbo.LiveSessions
        WHERE Id = @sessionId AND Status IN ('scheduled', 'cancelled')
      `);

    if (sessionResult.recordset.length === 0) {
      throw new Error('Session not found or cannot be deleted (must be scheduled or cancelled)');
    }

    const session = sessionResult.recordset[0] as LiveSession;

    // Delete the session (CASCADE will handle attendees)
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`
        DELETE FROM dbo.LiveSessions
        WHERE Id = @sessionId AND Status IN ('scheduled', 'cancelled')
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error('Failed to delete session');
    }

    // Broadcast deletion to course students
    if (this.io && session.CourseId) {
      this.io.to(`course-${session.CourseId}`).emit('live-session-deleted', {
        sessionId: session.Id,
        title: session.Title
      });
    }
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

    // Add attendee with capacity check in single transaction
    // Using MERGE to handle upsert and capacity checking atomically
    const result = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        DECLARE @Capacity INT, @CurrentAttendees INT, @Status NVARCHAR(50), @CourseId UNIQUEIDENTIFIER, @InstructorId UNIQUEIDENTIFIER;
        
        -- Get session details with row lock to prevent race conditions
        SELECT 
          @Capacity = ls.Capacity, 
          @Status = ls.Status,
          @CourseId = ls.CourseId,
          @InstructorId = ls.InstructorId,
          @CurrentAttendees = (SELECT COUNT(*) FROM dbo.LiveSessionAttendees WHERE SessionId = ls.Id AND LeftAt IS NULL)
        FROM dbo.LiveSessions ls WITH (UPDLOCK, ROWLOCK)
        WHERE ls.Id = @sessionId AND ls.Status IN ('scheduled', 'live');
        
        -- Check if session exists and is joinable
        IF @Status IS NULL
        BEGIN
          ;THROW 50001, 'Session not found or not available for joining', 1;
        END
        
        -- Check capacity before inserting
        IF @CurrentAttendees >= @Capacity
        BEGIN
          ;THROW 50002, 'Session is at full capacity', 1;
        END
        
        -- Upsert attendee record
        MERGE dbo.LiveSessionAttendees AS target
        USING (SELECT @sessionId AS SessionId, @userId AS UserId) AS source
        ON target.SessionId = source.SessionId AND target.UserId = source.UserId
        WHEN MATCHED THEN
          UPDATE SET LeftAt = NULL
        WHEN NOT MATCHED THEN
          INSERT (SessionId, UserId) VALUES (source.SessionId, source.UserId);
        
        -- Return attendee info with session details
        SELECT lsa.*, @CourseId AS CourseId, @InstructorId AS InstructorId
        FROM dbo.LiveSessionAttendees lsa
        WHERE lsa.SessionId = @sessionId AND lsa.UserId = @userId;
      `);

    if (result.recordset.length === 0) {
      throw new Error('Failed to add attendee');
    }

    const attendee = result.recordset[0] as SessionAttendee & { CourseId: string; InstructorId: string };
    const CourseId = attendee.CourseId;
    const InstructorId = attendee.InstructorId;

    // Get user name for notifications
    const userResult = await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId`);
    
    const userName = userResult.recordset.length > 0
      ? `${userResult.recordset[0].FirstName} ${userResult.recordset[0].LastName}`
      : 'Unknown User';

    // Broadcast to session room and instructor for real-time updates
    if (this.io) {
      // Emit to session room (for anyone in the session)
      this.io.to(`session-${sessionId}`).emit('attendee-joined', {
        sessionId,
        userId,
        userName,
        joinedAt: attendee.JoinedAt
      });

      // Emit directly to instructor (they may not be in the session room)
      this.io.to(`user-${InstructorId}`).emit('attendee-joined', {
        sessionId,
        userId,
        userName,
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

    // Get session and user info for notifications
    const sessionInfo = await (await db.getRequest())
      .input('sessionId', sql.UniqueIdentifier, sessionId)
      .query(`SELECT InstructorId, Title FROM dbo.LiveSessions WHERE Id = @sessionId`);

    const userInfo = await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`SELECT FirstName, LastName FROM dbo.Users WHERE Id = @userId`);

    const userName = userInfo.recordset.length > 0
      ? `${userInfo.recordset[0].FirstName} ${userInfo.recordset[0].LastName}`
      : 'Unknown User';

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

    const leftAt = new Date();

    // Broadcast attendee left to session room and instructor
    if (this.io && sessionInfo.recordset.length > 0) {
      const instructorId = sessionInfo.recordset[0].InstructorId;
      
      // Emit to session room (for anyone in the session)
      this.io.to(`session-${sessionId}`).emit('attendee-left', {
        sessionId,
        userId,
        userName,
        leftAt
      });

      // Emit directly to instructor (they may not be in the session room)
      this.io.to(`user-${instructorId}`).emit('attendee-left', {
        sessionId,
        userId,
        userName,
        leftAt
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
   * Get upcoming sessions for a course (includes scheduled, live, and recently ended)
   */
  static async getUpcomingSessions(courseId: string, limit: number = 10): Promise<LiveSession[]> {
    const db = DatabaseService.getInstance();
    const result = await (await db.getRequest())
      .input('courseId', sql.UniqueIdentifier, courseId)
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP(@limit) ls.*, 
               ISNULL(attendeeCount.Count, 0) as AttendeeCount,
               c.Title as CourseTitle,
               CONCAT(u.FirstName, ' ', u.LastName) as InstructorName
        FROM dbo.LiveSessions ls
        LEFT JOIN (
          SELECT SessionId, COUNT(*) as Count
          FROM dbo.LiveSessionAttendees
          WHERE LeftAt IS NULL
          GROUP BY SessionId
        ) attendeeCount ON ls.Id = attendeeCount.SessionId
        LEFT JOIN dbo.Courses c ON ls.CourseId = c.Id
        LEFT JOIN dbo.Users u ON ls.InstructorId = u.Id
        WHERE ls.CourseId = @courseId 
          AND (
            (ls.Status = 'scheduled' AND ls.ScheduledAt >= GETUTCDATE()) 
            OR ls.Status = 'live'
            OR (ls.Status = 'ended' AND ls.EndedAt >= DATEADD(day, -7, GETUTCDATE()))
            OR (ls.Status = 'cancelled' AND ls.UpdatedAt >= DATEADD(day, -7, GETUTCDATE()))
          )
        ORDER BY 
          CASE 
            WHEN ls.Status = 'live' THEN 0 
            WHEN ls.Status = 'scheduled' THEN 1
            WHEN ls.Status = 'ended' THEN 2
            ELSE 3
          END,
          ls.ScheduledAt DESC
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
      SELECT ls.*, 
             ISNULL(attendeeCount.Count, 0) as AttendeeCount,
             c.Title as CourseTitle
      FROM dbo.LiveSessions ls
      LEFT JOIN (
        SELECT SessionId, COUNT(*) as Count
        FROM dbo.LiveSessionAttendees
        WHERE LeftAt IS NULL
        GROUP BY SessionId
      ) attendeeCount ON ls.Id = attendeeCount.SessionId
      LEFT JOIN dbo.Courses c ON ls.CourseId = c.Id
      WHERE ls.InstructorId = @instructorId
    `;

    if (status) {
      query += ` AND ls.Status = @status`;
    }

    query += ` ORDER BY ls.ScheduledAt DESC`;

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