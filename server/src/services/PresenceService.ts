import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { Server as SocketIOServer } from 'socket.io';

export interface UserPresence {
  UserId: string;
  Status: 'online' | 'offline' | 'away' | 'busy';
  Activity?: string | null;
  LastSeenAt: Date;
  UpdatedAt: Date;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  activity?: string;
}

export class PresenceService {
  private static io: SocketIOServer | null = null;
  private static presenceCheckInterval: NodeJS.Timeout | null = null;
  private static readonly OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
    
    // Start automatic offline detection
    this.startPresenceMonitoring();
  }

  /**
   * Start monitoring for inactive users
   */
  private static startPresenceMonitoring(): void {
    // Check every 2 minutes for inactive users
    if (this.presenceCheckInterval) {
      clearInterval(this.presenceCheckInterval);
    }

    this.presenceCheckInterval = setInterval(async () => {
      try {
        await this.checkInactiveUsers();
      } catch (error) {
        console.error('Error checking inactive users:', error);
      }
    }, 120000); // 2 minutes
  }

  /**
   * Stop presence monitoring
   */
  static stopPresenceMonitoring(): void {
    if (this.presenceCheckInterval) {
      clearInterval(this.presenceCheckInterval);
      this.presenceCheckInterval = null;
    }
  }

  /**
   * Check for inactive users and mark them offline
   */
  private static async checkInactiveUsers(): Promise<void> {
    const db = DatabaseService.getInstance();
    const thresholdDate = new Date(Date.now() - this.OFFLINE_THRESHOLD_MS);

    const result = await (await db.getRequest())
      .input('threshold', sql.DateTime2, thresholdDate)
      .query(`
        UPDATE dbo.UserPresence
        SET Status = 'offline', UpdatedAt = GETUTCDATE()
        OUTPUT INSERTED.UserId
        WHERE Status != 'offline' AND UpdatedAt < @threshold
      `);

    // Broadcast offline status for each user
    if (this.io && result.recordset.length > 0) {
      result.recordset.forEach((row: any) => {
        this.io!.emit('presence-changed', {
          userId: row.UserId,
          status: 'offline',
          updatedAt: new Date()
        });
      });
    }
  }

  /**
   * Update user presence
   */
  static async updatePresence(update: PresenceUpdate): Promise<UserPresence> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, update.userId)
      .input('status', sql.NVarChar, update.status)
      .input('activity', sql.NVarChar, update.activity || null)
      .query(`
        IF EXISTS (SELECT 1 FROM dbo.UserPresence WHERE UserId = @userId)
        BEGIN
          UPDATE dbo.UserPresence
          SET Status = @status, Activity = @activity, LastSeenAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
          OUTPUT INSERTED.*
          WHERE UserId = @userId
        END
        ELSE
        BEGIN
          INSERT INTO dbo.UserPresence (UserId, Status, Activity)
          OUTPUT INSERTED.*
          VALUES (@userId, @status, @activity)
        END
      `);

    const presence = result.recordset[0] as UserPresence;

    // Broadcast presence change to all connected clients
    if (this.io) {
      this.io.emit('presence-changed', {
        userId: presence.UserId,
        status: presence.Status,
        activity: presence.Activity,
        updatedAt: presence.UpdatedAt
      });
    }

    return presence;
  }

  /**
   * Update user's last seen timestamp (heartbeat)
   */
  static async updateLastSeen(userId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE dbo.UserPresence
        SET LastSeenAt = GETUTCDATE(), UpdatedAt = GETUTCDATE()
        WHERE UserId = @userId
      `);
  }

  /**
   * Get user presence by ID
   */
  static async getUserPresence(userId: string): Promise<UserPresence | null> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM dbo.UserPresence
        WHERE UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserPresence;
  }

  /**
   * Get presence for multiple users
   */
  static async getMultipleUserPresence(userIds: string[]): Promise<UserPresence[]> {
    if (userIds.length === 0) {
      return [];
    }

    const db = DatabaseService.getInstance();

    // Create a table value parameter for the user IDs
    const table = new sql.Table();
    table.columns.add('UserId', sql.UniqueIdentifier);
    userIds.forEach(id => table.rows.add(id));

    const request = await db.getRequest();
    request.input('userIds', table);

    const result = await request.query(`
      SELECT up.* 
      FROM dbo.UserPresence up
      WHERE up.UserId IN (SELECT UserId FROM @userIds)
    `);

    return result.recordset as UserPresence[];
  }

  /**
   * Get all online users
   */
  static async getOnlineUsers(limit: number = 100): Promise<UserPresence[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP(@limit) up.*, u.Username, u.Email
        FROM dbo.UserPresence up
        JOIN dbo.Users u ON up.UserId = u.Id
        WHERE up.Status = 'online'
        ORDER BY up.UpdatedAt DESC
      `);

    return result.recordset as UserPresence[];
  }

  /**
   * Get online users count
   */
  static async getOnlineUsersCount(): Promise<number> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .query(`
        SELECT COUNT(*) as Count
        FROM dbo.UserPresence
        WHERE Status = 'online'
      `);

    return result.recordset[0].Count;
  }

  /**
   * Get online users in a specific course (based on enrollments)
   */
  static async getOnlineUsersInCourse(courseId: string): Promise<UserPresence[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('courseId', sql.UniqueIdentifier, courseId)
      .query(`
        SELECT up.*, u.Username, u.Email
        FROM dbo.UserPresence up
        JOIN dbo.Users u ON up.UserId = u.Id
        JOIN dbo.Enrollments e ON u.Id = e.UserId
        WHERE up.Status = 'online' AND e.CourseId = @courseId
        ORDER BY up.UpdatedAt DESC
      `);

    return result.recordset as UserPresence[];
  }

  /**
   * Set user online (typically called on socket connection)
   */
  static async setUserOnline(userId: string, activity?: string): Promise<UserPresence> {
    return this.updatePresence({
      userId,
      status: 'online',
      activity
    });
  }

  /**
   * Set user offline (typically called on socket disconnection)
   */
  static async setUserOffline(userId: string): Promise<UserPresence> {
    return this.updatePresence({
      userId,
      status: 'offline'
    });
  }

  /**
   * Set user away (manually triggered)
   */
  static async setUserAway(userId: string): Promise<UserPresence> {
    return this.updatePresence({
      userId,
      status: 'away'
    });
  }

  /**
   * Set user busy (do not disturb)
   */
  static async setUserBusy(userId: string, activity?: string): Promise<UserPresence> {
    return this.updatePresence({
      userId,
      status: 'busy',
      activity
    });
  }

  /**
   * Update user activity without changing status
   */
  static async updateActivity(userId: string, activity: string): Promise<void> {
    const db = DatabaseService.getInstance();

    await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .input('activity', sql.NVarChar, activity)
      .query(`
        UPDATE dbo.UserPresence
        SET Activity = @activity, UpdatedAt = GETUTCDATE()
        WHERE UserId = @userId
      `);

    // Broadcast activity update
    if (this.io) {
      const presence = await this.getUserPresence(userId);
      if (presence) {
        this.io.emit('presence-changed', {
          userId: presence.UserId,
          status: presence.Status,
          activity: presence.Activity,
          updatedAt: presence.UpdatedAt
        });
      }
    }
  }

  /**
   * Broadcast presence change to specific users
   */
  static broadcastPresenceToUsers(userIds: string[], presence: UserPresence): void {
    if (!this.io) return;

    userIds.forEach(userId => {
      this.io!.to(`user-${userId}`).emit('presence-changed', {
        userId: presence.UserId,
        status: presence.Status,
        activity: presence.Activity,
        updatedAt: presence.UpdatedAt
      });
    });
  }

  /**
   * Initialize presence for a user (create record if doesn't exist)
   */
  static async initializeUserPresence(userId: string): Promise<UserPresence> {
    const existing = await this.getUserPresence(userId);
    
    if (existing) {
      return existing;
    }

    return this.updatePresence({
      userId,
      status: 'offline'
    });
  }
}
