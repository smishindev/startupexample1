import { DatabaseService } from './DatabaseService';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './NotificationService';

export interface CreateCommentParams {
  userId: string;
  entityType: 'lesson' | 'course' | 'assignment' | 'study_group' | 'announcement';
  entityId: string;
  content: string;
  parentCommentId?: string;
}

export interface Comment {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  content: string;
  parentCommentId: string | null;
  likesCount: number;
  repliesCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role: string;
  };
  isLikedByCurrentUser: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replies?: Comment[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'likes';
}

export class CommentService {
  private db = DatabaseService.getInstance();
  private io?: Server;
  private notificationService?: NotificationService;

  setSocketIO(io: Server) {
    this.io = io;
    // Initialize notification service when Socket.IO is set
    if (!this.notificationService && io) {
      this.notificationService = new NotificationService(io);
    }
  }

  /**
   * Check if comments are enabled for an entity
   */
  async areCommentsAllowed(entityType: string, entityId: string): Promise<boolean> {
    try {
      if (entityType === 'lesson') {
        // Check parent course's allowComments setting
        const result = await this.db.query(`
          SELECT c.Id
          FROM dbo.Lessons l
          INNER JOIN dbo.Courses c ON l.CourseId = c.Id
          WHERE l.Id = @entityId
        `, { entityId });

        if (!result.length) return false;
        // For now, assume comments are allowed (we'll add allowComments field to Courses table later)
        return true;
      }

      if (entityType === 'course') {
        // Check course's allowComments setting (to be implemented)
        return true;
      }

      // For other entity types, allow by default
      return true;
    } catch (error) {
      console.error('Error checking if comments allowed:', error);
      return false;
    }
  }

  /**
   * Check if user has access to view/post comments
   */
  async canAccessComments(userId: string, entityType: string, entityId: string): Promise<boolean> {
    try {
      if (entityType === 'lesson') {
        // Check if user is enrolled in course or is the instructor
        const result = await this.db.query(`
          SELECT COUNT(*) as Count
          FROM dbo.Lessons l
          INNER JOIN dbo.Courses c ON l.CourseId = c.Id
          LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.UserId = @userId
          WHERE l.Id = @entityId
            AND (c.InstructorId = @userId OR e.Id IS NOT NULL)
        `, { userId, entityId });

        return result[0]?.Count > 0;
      }

      if (entityType === 'course') {
        // Check if user is enrolled or is the instructor
        const result = await this.db.query(`
          SELECT COUNT(*) as Count
          FROM dbo.Courses c
          LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.UserId = @userId
          WHERE c.Id = @entityId
            AND (c.InstructorId = @userId OR e.Id IS NOT NULL)
        `, { userId, entityId });

        return result[0]?.Count > 0;
      }

      // For other entity types, allow by default (can be extended)
      return true;
    } catch (error) {
      console.error('Error checking comment access:', error);
      return false;
    }
  }

  /**
   * Get instructor/moderator ID for an entity
   */
  async getModeratorId(entityType: string, entityId: string): Promise<string | null> {
    try {
      if (entityType === 'lesson') {
        const result = await this.db.query(`
          SELECT c.InstructorId
          FROM dbo.Lessons l
          INNER JOIN dbo.Courses c ON l.CourseId = c.Id
          WHERE l.Id = @entityId
        `, { entityId });
        return result[0]?.InstructorId || null;
      }

      if (entityType === 'course') {
        const result = await this.db.query(`
          SELECT InstructorId FROM dbo.Courses WHERE Id = @entityId
        `, { entityId });
        return result[0]?.InstructorId || null;
      }

      return null;
    } catch (error) {
      console.error('Error getting moderator ID:', error);
      return null;
    }
  }

  /**
   * Create a new comment or reply
   */
  async createComment(params: CreateCommentParams): Promise<Comment> {
    const { userId, entityType, entityId, content, parentCommentId } = params;

    // Validation
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    if (content.length > 5000) {
      throw new Error('Comment cannot exceed 5000 characters');
    }

    // Check if comments are allowed
    const allowed = await this.areCommentsAllowed(entityType, entityId);
    if (!allowed) {
      throw new Error('Comments are not allowed for this entity');
    }

    // Check access
    const hasAccess = await this.canAccessComments(userId, entityType, entityId);
    if (!hasAccess) {
      throw new Error('You do not have permission to comment on this entity');
    }

    // If reply, verify parent comment exists
    if (parentCommentId) {
      const parentExists = await this.db.query(`
        SELECT Id FROM dbo.Comments WHERE Id = @parentCommentId AND IsDeleted = 0
      `, { parentCommentId });

      if (!parentExists.length) {
        throw new Error('Parent comment not found');
      }
    }

    const commentId = uuidv4();
    const now = new Date().toISOString();

    // Insert comment
    await this.db.execute(`
      INSERT INTO dbo.Comments (
        Id, UserId, EntityType, EntityId, Content, ParentCommentId,
        LikesCount, RepliesCount, IsEdited, IsDeleted,
        CreatedAt, UpdatedAt
      )
      VALUES (
        @id, @userId, @entityType, @entityId, @content, @parentCommentId,
        0, 0, 0, 0,
        @now, @now
      )
    `, {
      id: commentId,
      userId,
      entityType,
      entityId,
      content: content.trim(),
      parentCommentId: parentCommentId || null,
      now
    });

    // Update parent's reply count if this is a reply
    if (parentCommentId) {
      await this.db.execute(`
        UPDATE dbo.Comments
        SET RepliesCount = RepliesCount + 1, UpdatedAt = @now
        WHERE Id = @parentCommentId
      `, { parentCommentId, now });
    }

    // Fetch the created comment with user info
    const comment = await this.getCommentById(commentId, userId);

    // Emit Socket.IO event
    if (this.io) {
      const room = `comments:${entityType}:${entityId}`;
      this.io.to(room).emit('comment:created', comment);
      console.log(`📝 [CommentService] Emitted comment:created to room: ${room}`);
    }

    // Send notification if this is a reply
    if (parentCommentId && this.notificationService) {
      // Fire and forget - don't wait for notification to complete
      this.notificationService.sendCommentReplyNotification(commentId, parentCommentId)
        .catch(error => {
          console.error('❌ Failed to send comment reply notification:', error);
        });
    }

    return comment;
  }

  /**
   * Get comments for an entity (with pagination and threading)
   */
  async getComments(
    entityType: string,
    entityId: string,
    currentUserId: string,
    options: PaginationOptions = {}
  ): Promise<{ comments: Comment[]; totalCount: number; pagination: any }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sort = options.sort || 'newest';

    // Determine sort order
    let orderBy = 'c.CreatedAt DESC';
    if (sort === 'oldest') orderBy = 'c.CreatedAt ASC';
    if (sort === 'likes') orderBy = 'c.LikesCount DESC, c.CreatedAt DESC';

    // Get total count
    const countResult = await this.db.query(`
      SELECT COUNT(*) as Total
      FROM dbo.Comments
      WHERE EntityType = @entityType
        AND EntityId = @entityId
        AND ParentCommentId IS NULL
        AND IsDeleted = 0
    `, { entityType, entityId });

    const totalCount = countResult[0]?.Total || 0;

    // Get top-level comments
    const topComments = await this.db.query(`
      SELECT 
        c.Id, c.UserId, c.EntityType, c.EntityId, c.Content,
        c.ParentCommentId, c.LikesCount, c.RepliesCount,
        c.IsEdited, c.IsDeleted, c.CreatedAt, c.UpdatedAt, c.EditedAt,
        u.FirstName, u.LastName, u.Avatar, u.Role,
        CASE WHEN cl.Id IS NOT NULL THEN 1 ELSE 0 END as IsLikedByCurrentUser
      FROM dbo.Comments c
      INNER JOIN dbo.Users u ON c.UserId = u.Id
      LEFT JOIN dbo.CommentLikes cl ON c.Id = cl.CommentId AND cl.UserId = @currentUserId
      WHERE c.EntityType = @entityType
        AND c.EntityId = @entityId
        AND c.ParentCommentId IS NULL
        AND c.IsDeleted = 0
      ORDER BY ${orderBy}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `, { entityType, entityId, currentUserId, offset, limit });

    // For each top-level comment, get its replies
    const comments: Comment[] = [];
    for (const row of topComments) {
      const comment = this.mapRowToComment(row, currentUserId);

      // Get replies (1 level deep)
      const replies = await this.db.query(`
        SELECT 
          c.Id, c.UserId, c.EntityType, c.EntityId, c.Content,
          c.ParentCommentId, c.LikesCount, c.RepliesCount,
          c.IsEdited, c.IsDeleted, c.CreatedAt, c.UpdatedAt, c.EditedAt,
          u.FirstName, u.LastName, u.Avatar, u.Role,
          CASE WHEN cl.Id IS NOT NULL THEN 1 ELSE 0 END as IsLikedByCurrentUser
        FROM dbo.Comments c
        INNER JOIN dbo.Users u ON c.UserId = u.Id
        LEFT JOIN dbo.CommentLikes cl ON c.Id = cl.CommentId AND cl.UserId = @currentUserId
        WHERE c.ParentCommentId = @parentId
          AND c.IsDeleted = 0
        ORDER BY c.CreatedAt ASC
      `, { parentId: comment.id, currentUserId });

      comment.replies = replies.map(r => this.mapRowToComment(r, currentUserId));
      comments.push(comment);
    }

    return {
      comments,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount
      }
    };
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(commentId: string, currentUserId: string): Promise<Comment> {
    const result = await this.db.query(`
      SELECT 
        c.Id, c.UserId, c.EntityType, c.EntityId, c.Content,
        c.ParentCommentId, c.LikesCount, c.RepliesCount,
        c.IsEdited, c.IsDeleted, c.CreatedAt, c.UpdatedAt, c.EditedAt,
        u.FirstName, u.LastName, u.Avatar, u.Role,
        CASE WHEN cl.Id IS NOT NULL THEN 1 ELSE 0 END as IsLikedByCurrentUser
      FROM dbo.Comments c
      INNER JOIN dbo.Users u ON c.UserId = u.Id
      LEFT JOIN dbo.CommentLikes cl ON c.Id = cl.CommentId AND cl.UserId = @currentUserId
      WHERE c.Id = @commentId
    `, { commentId, currentUserId });

    if (!result.length) {
      throw new Error('Comment not found');
    }

    return this.mapRowToComment(result[0], currentUserId);
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string): Promise<Comment> {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    if (content.length > 5000) {
      throw new Error('Comment cannot exceed 5000 characters');
    }

    // Get comment to verify ownership and check edit window
    const existing = await this.db.query(`
      SELECT Id, UserId, CreatedAt, EntityType, EntityId, IsDeleted
      FROM dbo.Comments
      WHERE Id = @commentId
    `, { commentId });

    if (!existing.length) {
      throw new Error('Comment not found');
    }

    const comment = existing[0];

    if (comment.IsDeleted) {
      throw new Error('Cannot edit deleted comment');
    }

    if (comment.UserId !== userId) {
      throw new Error('You can only edit your own comments');
    }

    // Check 5-minute edit window
    const createdAt = new Date(comment.CreatedAt);
    const now = new Date();
    const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    if (minutesElapsed > 5) {
      throw new Error('Edit window has expired (5 minutes)');
    }

    // Update comment
    const updatedAt = new Date().toISOString();
    await this.db.execute(`
      UPDATE dbo.Comments
      SET Content = @content,
          IsEdited = 1,
          EditedAt = @updatedAt,
          UpdatedAt = @updatedAt
      WHERE Id = @commentId
    `, { commentId, content: content.trim(), updatedAt });

    // Fetch updated comment
    const updated = await this.getCommentById(commentId, userId);

    // Emit Socket.IO event
    if (this.io) {
      const room = `comments:${comment.EntityType}:${comment.EntityId}`;
      this.io.to(room).emit('comment:updated', updated);
      console.log(`✏️ [CommentService] Emitted comment:updated to room: ${room}`);
    }

    return updated;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string, userRole: string): Promise<void> {
    // Get comment to verify ownership or moderator status
    const existing = await this.db.query(`
      SELECT Id, UserId, EntityType, EntityId, IsDeleted, ParentCommentId
      FROM dbo.Comments
      WHERE Id = @commentId
    `, { commentId });

    if (!existing.length) {
      throw new Error('Comment not found');
    }

    const comment = existing[0];

    if (comment.IsDeleted) {
      throw new Error('Comment already deleted');
    }

    // Check if user is owner or moderator
    const isOwner = comment.UserId === userId;
    const moderatorId = await this.getModeratorId(comment.EntityType, comment.EntityId);
    const isModerator = userId === moderatorId || userRole === 'admin';

    if (!isOwner && !isModerator) {
      throw new Error('You do not have permission to delete this comment');
    }

    // Soft delete
    const now = new Date().toISOString();
    await this.db.execute(`
      UPDATE dbo.Comments
      SET IsDeleted = 1,
          DeletedAt = @now,
          DeletedBy = @userId,
          UpdatedAt = @now
      WHERE Id = @commentId
    `, { commentId, userId, now });

    // Update parent's reply count if this was a reply
    if (comment.ParentCommentId) {
      await this.db.execute(`
        UPDATE dbo.Comments
        SET RepliesCount = RepliesCount - 1,
            UpdatedAt = @now
        WHERE Id = @parentId AND RepliesCount > 0
      `, { parentId: comment.ParentCommentId, now });
    }

    // Emit Socket.IO event
    if (this.io) {
      const room = `comments:${comment.EntityType}:${comment.EntityId}`;
      this.io.to(room).emit('comment:deleted', commentId);
      console.log(`🗑️ [CommentService] Emitted comment:deleted to room: ${room}`);
    }
  }

  /**
   * Toggle like on a comment
   */
  async toggleLike(commentId: string, userId: string): Promise<{ isLiked: boolean; likesCount: number }> {
    // Check if comment exists
    const comment = await this.db.query(`
      SELECT Id, EntityType, EntityId, IsDeleted FROM dbo.Comments WHERE Id = @commentId
    `, { commentId });

    if (!comment.length) {
      throw new Error('Comment not found');
    }

    if (comment[0].IsDeleted) {
      throw new Error('Cannot like deleted comment');
    }

    // Check if already liked
    const existing = await this.db.query(`
      SELECT Id FROM dbo.CommentLikes WHERE CommentId = @commentId AND UserId = @userId
    `, { commentId, userId });

    const now = new Date().toISOString();
    let isLiked: boolean;

    if (existing.length) {
      // Unlike: remove like and decrement count
      await this.db.execute(`
        DELETE FROM dbo.CommentLikes WHERE CommentId = @commentId AND UserId = @userId
      `, { commentId, userId });

      await this.db.execute(`
        UPDATE dbo.Comments
        SET LikesCount = LikesCount - 1, UpdatedAt = @now
        WHERE Id = @commentId AND LikesCount > 0
      `, { commentId, now });

      isLiked = false;
    } else {
      // Like: add like and increment count
      const likeId = uuidv4();
      await this.db.execute(`
        INSERT INTO dbo.CommentLikes (Id, CommentId, UserId, CreatedAt)
        VALUES (@id, @commentId, @userId, @now)
      `, { id: likeId, commentId, userId, now });

      await this.db.execute(`
        UPDATE dbo.Comments
        SET LikesCount = LikesCount + 1, UpdatedAt = @now
        WHERE Id = @commentId
      `, { commentId, now });

      isLiked = true;
    }

    // Get updated count
    const updated = await this.db.query(`
      SELECT LikesCount FROM dbo.Comments WHERE Id = @commentId
    `, { commentId });

    const likesCount = updated[0]?.LikesCount || 0;

    // Emit Socket.IO event
    if (this.io) {
      const room = `comments:${comment[0].EntityType}:${comment[0].EntityId}`;
      this.io.to(room).emit('comment:liked', { commentId, likesCount, isLiked });
      console.log(`👍 [CommentService] Emitted comment:liked to room: ${room}`);
    }

    return { isLiked, likesCount };
  }

  /**
   * Map database row to Comment object
   */
  private mapRowToComment(row: any, currentUserId: string): Comment {
    return {
      id: row.Id,
      userId: row.UserId,
      entityType: row.EntityType,
      entityId: row.EntityId,
      content: row.Content,
      parentCommentId: row.ParentCommentId,
      likesCount: row.LikesCount,
      repliesCount: row.RepliesCount,
      isEdited: row.IsEdited,
      isDeleted: row.IsDeleted,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
      editedAt: row.EditedAt,
      user: {
        id: row.UserId,
        firstName: row.FirstName,
        lastName: row.LastName,
        avatar: row.Avatar,
        role: row.Role
      },
      isLikedByCurrentUser: Boolean(row.IsLikedByCurrentUser),
      canEdit: row.UserId === currentUserId,
      canDelete: row.UserId === currentUserId,
      replies: []
    };
  }
}

export default CommentService;
