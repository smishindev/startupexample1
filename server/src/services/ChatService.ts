import { DatabaseService } from './DatabaseService';
import { SettingsService } from './SettingsService';
import { NotificationService } from './NotificationService';
import { v4 as uuidv4 } from 'uuid';
import { Server as SocketIOServer } from 'socket.io';

export interface ChatRoom {
  Id: string;
  Name: string;
  Type: 'course_general' | 'course_qa' | 'study_group' | 'direct_message' | 'ai_tutoring';
  CourseId: string | null;
  CreatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  LastMessageAt: string | null;
  LastMessagePreview: string | null;
  UnreadCount: number;
  IsActive: boolean;
}

export interface ChatMessage {
  Id: string;
  RoomId: string;
  UserId: string;
  Content: string;
  Type: 'text' | 'image' | 'file' | 'code' | 'system' | 'announcement';
  ReplyTo: string | null;
  IsEdited: boolean;
  IsSystemMessage: boolean;
  CreatedAt: string;
  EditedAt: string | null;
  User?: {
    Id: string;
    FirstName: string;
    LastName: string;
    Avatar: string | null;
    Role: string;
  };
}

export interface ChatParticipant {
  Id: string;
  RoomId: string;
  UserId: string;
  Role: 'owner' | 'admin' | 'member';
  JoinedAt: string;
  LastReadAt: string | null;
  IsMuted: boolean;
  IsActive: boolean;
  User?: {
    FirstName: string;
    LastName: string;
    Avatar: string | null;
  };
}

export class ChatService {
  private db: DatabaseService;
  private settingsService: SettingsService;
  private notificationService: NotificationService | null;
  private io: SocketIOServer | null;

  constructor(io?: SocketIOServer) {
    this.db = DatabaseService.getInstance();
    this.settingsService = new SettingsService();
    this.notificationService = io ? new NotificationService(io) : null;
    this.io = io || null;
  }

  /**
   * Get all chat rooms for a user
   */
  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    const result = await this.db.query(`
      SELECT 
        cr.Id,
        cr.Name,
        cr.Type,
        cr.CourseId,
        cr.CreatedBy,
        cr.CreatedAt,
        cr.UpdatedAt,
        cr.LastMessageAt,
        cr.LastMessagePreview,
        cr.IsActive,
        -- Calculate unread count per user (messages created after their last read time)
        (SELECT COUNT(*) 
         FROM dbo.ChatMessages cm
         WHERE cm.RoomId = cr.Id 
           AND cm.UserId != @userId
           AND cm.CreatedAt > ISNULL(cp.LastReadAt, '1900-01-01')
        ) as UnreadCount
      FROM dbo.ChatRooms cr
      INNER JOIN dbo.ChatParticipants cp ON cr.Id = cp.RoomId
      WHERE cp.UserId = @userId
        AND cp.IsActive = 1
        AND cr.IsActive = 1
      ORDER BY cr.LastMessageAt DESC, cr.UpdatedAt DESC
    `, { userId });

    return result;
  }

  /**
   * Get messages for a room with pagination
   */
  async getRoomMessages(
    roomId: string,
    userId: string,
    options: { limit?: number; offset?: number; beforeTimestamp?: string } = {}
  ): Promise<ChatMessage[]> {
    const { limit = 50, offset = 0, beforeTimestamp } = options;

    // Verify user is participant
    const isParticipant = await this.isRoomParticipant(roomId, userId);
    if (!isParticipant) {
      throw new Error('User is not a participant of this room');
    }

    const query = `
      SELECT
        cm.Id,
        cm.RoomId,
        cm.UserId,
        cm.Content,
        cm.Type,
        cm.ReplyTo,
        cm.IsEdited,
        cm.IsSystemMessage,
        cm.CreatedAt,
        cm.EditedAt,
        u.FirstName,
        u.LastName,
        u.Avatar,
        u.Role
      FROM dbo.ChatMessages cm
      INNER JOIN dbo.Users u ON cm.UserId = u.Id
      WHERE cm.RoomId = @roomId
        ${beforeTimestamp ? 'AND cm.CreatedAt < @beforeTimestamp' : ''}
      ORDER BY cm.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const result = await this.db.query(query, { 
      roomId, 
      limit, 
      offset, 
      beforeTimestamp: beforeTimestamp || null 
    });

    // Reverse to chronological order
    return result.reverse().map((msg: any) => ({
      Id: msg.Id,
      RoomId: msg.RoomId,
      UserId: msg.UserId,
      Content: msg.Content,
      Type: msg.Type,
      ReplyTo: msg.ReplyTo,
      IsEdited: msg.IsEdited,
      IsSystemMessage: msg.IsSystemMessage,
      CreatedAt: msg.CreatedAt,
      EditedAt: msg.EditedAt,
      User: {
        Id: msg.UserId,
        FirstName: msg.FirstName,
        LastName: msg.LastName,
        Avatar: msg.Avatar,
        Role: msg.Role
      }
    }));
  }

  /**
   * Send a message to a room
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    type: string = 'text',
    replyTo: string | null = null
  ): Promise<ChatMessage> {
    // Verify user is participant (check existence regardless of IsActive status)
    // We'll reactivate inactive participants below
    const participantCheck = await this.db.query(`
      SELECT 1 FROM dbo.ChatParticipants
      WHERE RoomId = @roomId AND UserId = @userId
    `, { roomId, userId });
    
    if (participantCheck.length === 0) {
      throw new Error('User is not a participant of this room');
    }

    // Get room details
    const room = await this.getRoomById(roomId);
    if (!room || !room.IsActive) {
      throw new Error('Room not found or inactive');
    }

    // Find inactive participants who deleted this conversation
    const inactiveParticipants = await this.db.query<{ UserId: string }>(`
      SELECT UserId 
      FROM dbo.ChatParticipants
      WHERE RoomId = @roomId AND IsActive = 0
    `, { roomId });

    // Auto-reactivate any inactive participants (handles deleted conversations)
    // This allows messages to be sent to users who deleted the conversation
    if (inactiveParticipants.length > 0) {
      await this.db.query(`
        UPDATE dbo.ChatParticipants
        SET IsActive = 1, LeftAt = NULL
        WHERE RoomId = @roomId AND IsActive = 0
      `, { roomId });
    }

    // For direct messages, check privacy settings
    if (room.Type === 'direct_message') {
      const recipientId = await this.getDirectMessageRecipient(roomId, userId);
      const canMessage = await this.settingsService.canReceiveMessages(recipientId);
      
      if (!canMessage) {
        throw new Error('Recipient does not accept direct messages');
      }
    }

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    // Insert message
    await this.db.query(`
      INSERT INTO dbo.ChatMessages (Id, RoomId, UserId, Content, Type, ReplyTo, CreatedAt)
      VALUES (@messageId, @roomId, @userId, @content, @type, @replyTo, @timestamp)
    `, { messageId, roomId, userId, content, type, replyTo: replyTo || null, timestamp });

    // Update room's last message
    const preview = content.length > 200 ? content.substring(0, 197) + '...' : content;
    await this.db.query(`
      UPDATE dbo.ChatRooms
      SET LastMessageAt = @timestamp,
          LastMessagePreview = @preview,
          UpdatedAt = @timestamp
      WHERE Id = @roomId
    `, { roomId, timestamp, preview });

    // Get full message with user data
    const messageResult = await this.db.query(`
      SELECT 
        cm.*,
        u.FirstName,
        u.LastName,
        u.Avatar,
        u.Role
      FROM dbo.ChatMessages cm
      INNER JOIN dbo.Users u ON cm.UserId = u.Id
      WHERE cm.Id = @messageId
    `, { messageId });

    const msgData = messageResult[0];

    const message: ChatMessage = {
      Id: msgData.Id,
      RoomId: msgData.RoomId,
      UserId: msgData.UserId,
      Content: msgData.Content,
      Type: msgData.Type,
      ReplyTo: msgData.ReplyTo,
      IsEdited: msgData.IsEdited,
      IsSystemMessage: msgData.IsSystemMessage,
      CreatedAt: msgData.CreatedAt,
      EditedAt: msgData.EditedAt,
      User: {
        Id: msgData.UserId,
        FirstName: msgData.FirstName,
        LastName: msgData.LastName,
        Avatar: msgData.Avatar,
        Role: msgData.Role
      }
    };

    // Emit Socket.IO event to room
    if (this.io) {
      this.io.to(`chat-room-${roomId}`).emit('chat:message', message);

      // Notify users whose conversations were restored (exclude sender)
      if (inactiveParticipants.length > 0) {
        // Get updated room data with unread count for each restored user
        for (const participant of inactiveParticipants) {
          // Skip sender - they initiated the message and already see the conversation
          if (participant.UserId === userId) {
            continue;
          }
          
          const restoredRooms = await this.getUserRooms(participant.UserId);
          const restoredRoom = restoredRooms.find(r => r.Id === roomId);
          
          if (restoredRoom) {
            this.io.to(`user-${participant.UserId}`).emit('chat:conversation-restored', {
              room: restoredRoom,
              message: message
            });
          }
        }
      }
    }

    // Send notifications to offline participants
    await this.sendMessageNotifications(roomId, userId, content, room.Type);

    return message;
  }

  /**
   * Create a direct message room between two users
   */
  async createDirectMessageRoom(user1Id: string, user2Id: string): Promise<ChatRoom> {
    // Check if room already exists (including inactive participants)
    const existingRoom = await this.db.query(`
      SELECT DISTINCT cr.Id
      FROM dbo.ChatRooms cr
      INNER JOIN dbo.ChatParticipants cp1 ON cr.Id = cp1.RoomId AND cp1.UserId = @user1Id
      INNER JOIN dbo.ChatParticipants cp2 ON cr.Id = cp2.RoomId AND cp2.UserId = @user2Id
      WHERE cr.Type = 'direct_message'
        AND cr.IsActive = 1
    `, { user1Id, user2Id });

    if (existingRoom.length > 0) {
      const roomId = existingRoom[0].Id;
      
      // Check which participants were inactive before reactivation
      const inactiveBeforeReactivation = await this.db.query<{ UserId: string }>(`
        SELECT UserId FROM dbo.ChatParticipants
        WHERE RoomId = @roomId AND UserId IN (@user1Id, @user2Id) AND IsActive = 0
      `, { roomId, user1Id, user2Id });
      
      // Reactivate both participants if they were inactive
      if (inactiveBeforeReactivation.length > 0) {
        await this.db.query(`
          UPDATE dbo.ChatParticipants
          SET IsActive = 1, LeftAt = NULL
          WHERE RoomId = @roomId AND UserId IN (@user1Id, @user2Id)
        `, { roomId, user1Id, user2Id });
        
        // Notify inactive users (excluding the initiator) that conversation was restored
        if (this.io) {
          for (const participant of inactiveBeforeReactivation) {
            // Skip the initiator (user1Id) - they're creating the conversation
            if (participant.UserId === user1Id) {
              continue;
            }
            
            // Get fresh room data for this user
            const restoredRooms = await this.getUserRooms(participant.UserId);
            const restoredRoom = restoredRooms.find(r => r.Id === roomId);
            
            if (restoredRoom) {
              this.io.to(`user-${participant.UserId}`).emit('chat:conversation-restored', {
                room: restoredRoom,
                message: null // No message yet, just room restoration
              });
            }
          }
        }
      }
      
      const room = await this.getRoomById(roomId);
      if (room) return room;
    }

    // Check privacy settings
    const canMessage = await this.settingsService.canReceiveMessages(user2Id);
    if (!canMessage) {
      throw new Error('User does not accept direct messages');
    }

    // Get user names for room name
    const users = await this.db.query(`
      SELECT Id, FirstName, LastName FROM dbo.Users WHERE Id IN (@user1Id, @user2Id)
    `, { user1Id, user2Id });

    const user1 = users.find((u: any) => u.Id === user1Id);
    const user2 = users.find((u: any) => u.Id === user2Id);
    
    if (!user1 || !user2) {
      throw new Error('User not found');
    }
    
    // Create room name, truncate if too long (max 100 chars in database)
    let roomName = `${user1.FirstName} ${user1.LastName} & ${user2.FirstName} ${user2.LastName}`;
    if (roomName.length > 100) {
      roomName = roomName.substring(0, 97) + '...';
    }

    const roomId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create room
    await this.db.query(`
      INSERT INTO dbo.ChatRooms (Id, Name, Type, CreatedBy, CreatedAt, UpdatedAt, IsActive)
      VALUES (@roomId, @roomName, 'direct_message', @user1Id, @timestamp, @timestamp, 1)
    `, { roomId, roomName, user1Id, timestamp });

    // Add both participants
    await this.addParticipant(roomId, user1Id, 'owner');
    await this.addParticipant(roomId, user2Id, 'member');

    const room = await this.getRoomById(roomId);
    if (!room) {
      throw new Error('Failed to create room');
    }
    
    return room;
  }

  /**
   * Add participant to room
   */
  async addParticipant(roomId: string, userId: string, role: string = 'member'): Promise<void> {
    // Check if participant already exists
    const existing = await this.db.query(`
      SELECT 1 FROM dbo.ChatParticipants
      WHERE RoomId = @roomId AND UserId = @userId
    `, { roomId, userId });

    if (existing.length > 0) {
      // Already a participant, just ensure they're active
      await this.db.query(`
        UPDATE dbo.ChatParticipants
        SET IsActive = 1, Role = @role, LeftAt = NULL
        WHERE RoomId = @roomId AND UserId = @userId
      `, { roomId, userId, role });
      return;
    }

    const participantId = uuidv4();
    await this.db.query(`
      INSERT INTO dbo.ChatParticipants (Id, RoomId, UserId, Role, JoinedAt, IsActive)
      VALUES (@participantId, @roomId, @userId, @role, GETUTCDATE(), 1)
    `, { participantId, roomId, userId, role });
  }

  /**
   * Check if user is room participant
   */
  async isRoomParticipant(roomId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT 1 FROM dbo.ChatParticipants
      WHERE RoomId = @roomId AND UserId = @userId AND IsActive = 1
    `, { roomId, userId });

    return result.length > 0;
  }

  /**
   * Get room by ID
   */
  async getRoomById(roomId: string): Promise<ChatRoom | null> {
    const result = await this.db.query(`
      SELECT 
        Id,
        Name,
        Type,
        CourseId,
        CreatedBy,
        CreatedAt,
        UpdatedAt,
        LastMessageAt,
        LastMessagePreview,
        IsActive
      FROM dbo.ChatRooms 
      WHERE Id = @roomId
    `, { roomId });

    if (result.length === 0) return null;

    const room = result[0];
    return {
      ...room,
      UnreadCount: 0 // Will be calculated per user when needed
    };
  }

  /**
   * Get other participant in direct message
   */
  async getDirectMessageRecipient(roomId: string, currentUserId: string): Promise<string> {
    const result = await this.db.query(`
      SELECT UserId FROM dbo.ChatParticipants
      WHERE RoomId = @roomId AND UserId != @currentUserId AND IsActive = 1
    `, { roomId, currentUserId });

    if (result.length === 0) {
      throw new Error('Recipient not found');
    }

    return result[0].UserId;
  }

  /**
   * Send notifications to offline participants
   */
  private async sendMessageNotifications(
    roomId: string,
    senderId: string,
    content: string,
    roomType: string
  ): Promise<void> {
    if (!this.notificationService) return;

    try {
      // Get room participants (excluding sender)
      const participants = await this.db.query(`
        SELECT cp.UserId, u.FirstName, u.LastName
        FROM dbo.ChatParticipants cp
        INNER JOIN dbo.Users u ON cp.UserId = u.Id
        WHERE cp.RoomId = @roomId 
          AND cp.UserId != @senderId
          AND cp.IsActive = 1
      `, { roomId, senderId });

      // Get sender info
      const senderResult = await this.db.query(`
        SELECT FirstName, LastName, Role FROM dbo.Users WHERE Id = @senderId
      `, { senderId });

      const sender = senderResult[0];
      const senderName = `${sender.FirstName} ${sender.LastName}`;
      const messagePreview = content.length > 100 ? content.substring(0, 100) + '...' : content;

      // Determine notification type and priority
      const isInstructorMessage = sender.Role === 'instructor';
      const priority = isInstructorMessage ? 'high' : 'normal';
      const type = 'community';

      // Send notification to each participant
      for (const participant of participants) {
        await this.notificationService.createNotificationWithControls(
          {
            userId: participant.UserId,
            type,
            priority,
            title: isInstructorMessage 
              ? `Message from Instructor ${senderName}`
              : `New Message from ${senderName}`,
            message: messagePreview,
            actionUrl: `/chat?roomId=${roomId}`,
            actionText: 'View Message'
          },
          { 
            category: 'community', 
            subcategory: 'DirectMessages'
          }
        );
      }
    } catch (error) {
      console.error('Error sending message notifications:', error);
      // Don't throw - notifications are non-blocking
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    const timestamp = new Date().toISOString();

    // Update participant's LastReadAt
    await this.db.query(`
      UPDATE dbo.ChatParticipants
      SET LastReadAt = @timestamp
      WHERE RoomId = @roomId AND UserId = @userId
    `, { roomId, userId, timestamp });

    // Emit read receipt event
    if (this.io) {
      this.io.to(`chat-room-${roomId}`).emit('chat:read', {
        roomId,
        userId,
        timestamp
      });
    }
  }

  /**
   * Leave a room (soft delete - set IsActive to 0)
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const timestamp = new Date().toISOString();

    // Update participant status to inactive
    await this.db.query(`
      UPDATE dbo.ChatParticipants
      SET IsActive = 0, LeftAt = @timestamp
      WHERE RoomId = @roomId AND UserId = @userId
    `, { roomId, userId, timestamp });

    // Emit leave event if user is currently in the room
    if (this.io) {
      this.io.to(`chat-room-${roomId}`).emit('chat:user-left', {
        userId,
        roomId,
        timestamp
      });
    }
  }
}
