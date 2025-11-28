import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { Server as SocketIOServer } from 'socket.io';

interface StudyGroup {
  Id: string;
  Name: string;
  Description?: string;
  CourseId?: string;
  CreatedBy: string;
  IsActive: boolean;
  MaxMembers?: number;
  CreatedAt: Date;
}

interface CreateGroupParams {
  name: string;
  description?: string;
  courseId?: string;
  createdBy: string;
  maxMembers?: number;
}

interface GroupMember {
  GroupId: string;
  UserId: string;
  Role: 'admin' | 'member';
  JoinedAt: Date;
  Username?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
}

export class StudyGroupService {
  private static io: SocketIOServer | null = null;

  /**
   * Set Socket.IO instance for real-time broadcasts
   */
  static setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a new study group
   */
  static async createGroup(params: CreateGroupParams): Promise<StudyGroup> {
    const db = DatabaseService.getInstance();

    // Create the group
    const result = await (await db.getRequest())
      .input('name', sql.NVarChar, params.name)
      .input('description', sql.NVarChar, params.description || null)
      .input('courseId', sql.UniqueIdentifier, params.courseId || null)
      .input('createdBy', sql.UniqueIdentifier, params.createdBy)
      .input('maxMembers', sql.Int, params.maxMembers || null)
      .query(`
        INSERT INTO dbo.StudyGroups (Name, Description, CourseId, CreatedBy, MaxMembers)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @courseId, @createdBy, @maxMembers)
      `);

    const group = result.recordset[0] as StudyGroup;

    // Automatically add creator as admin
    await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, group.Id)
      .input('userId', sql.UniqueIdentifier, params.createdBy)
      .input('role', sql.NVarChar, 'admin')
      .query(`
        INSERT INTO dbo.StudyGroupMembers (GroupId, UserId, Role)
        VALUES (@groupId, @userId, @role)
      `);

    // Broadcast to course if courseId exists
    if (params.courseId && this.io) {
      this.io.to(`course-${params.courseId}`).emit('study-group-created', {
        groupId: group.Id,
        name: group.Name,
        courseId: params.courseId,
        createdBy: params.createdBy
      });
    }

    return group;
  }

  /**
   * Get study group by ID
   */
  static async getGroupById(groupId: string): Promise<StudyGroup | null> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT * FROM dbo.StudyGroups
        WHERE Id = @groupId AND IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as StudyGroup;
  }

  /**
   * Get all study groups for a course
   */
  static async getGroupsByCourse(courseId: string): Promise<StudyGroup[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('courseId', sql.UniqueIdentifier, courseId)
      .query(`
        SELECT sg.*, COUNT(sgm.UserId) as MemberCount
        FROM dbo.StudyGroups sg
        LEFT JOIN dbo.StudyGroupMembers sgm ON sg.Id = sgm.GroupId
        WHERE sg.CourseId = @courseId AND sg.IsActive = 1
        GROUP BY sg.Id, sg.Name, sg.Description, sg.CourseId, sg.CreatedBy, sg.IsActive, sg.MaxMembers, sg.CreatedAt
        ORDER BY sg.CreatedAt DESC
      `);

    return result.recordset as StudyGroup[];
  }

  /**
   * Get study groups a user is member of
   */
  static async getUserGroups(userId: string): Promise<StudyGroup[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT sg.*, sgm.Role, COUNT(sgm2.UserId) as MemberCount
        FROM dbo.StudyGroups sg
        JOIN dbo.StudyGroupMembers sgm ON sg.Id = sgm.GroupId
        LEFT JOIN dbo.StudyGroupMembers sgm2 ON sg.Id = sgm2.GroupId
        WHERE sgm.UserId = @userId AND sg.IsActive = 1
        GROUP BY sg.Id, sg.Name, sg.Description, sg.CourseId, sg.CreatedBy, sg.IsActive, sg.MaxMembers, sg.CreatedAt, sgm.Role
        ORDER BY sg.CreatedAt DESC
      `);

    return result.recordset as StudyGroup[];
  }

  /**
   * Add member to study group
   */
  static async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const db = DatabaseService.getInstance();

    // Check if group exists and is active
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error('Study group not found');
    }

    // Check if user is already a member
    const existing = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT * FROM dbo.StudyGroupMembers
        WHERE GroupId = @groupId AND UserId = @userId
      `);

    if (existing.recordset.length > 0) {
      throw new Error('User is already a member of this group');
    }

    // Check max members limit
    if (group.MaxMembers) {
      const memberCount = await this.getMemberCount(groupId);
      if (memberCount >= group.MaxMembers) {
        throw new Error('Study group is at maximum capacity');
      }
    }

    // Add member
    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .input('role', sql.NVarChar, 'member')
      .query(`
        INSERT INTO dbo.StudyGroupMembers (GroupId, UserId, Role)
        OUTPUT INSERTED.*
        VALUES (@groupId, @userId, @role)
      `);

    const member = result.recordset[0] as GroupMember;

    // Broadcast to group
    if (this.io) {
      this.io.to(`study-group-${groupId}`).emit('member-joined', {
        groupId,
        userId,
        joinedAt: member.JoinedAt
      });
    }

    return member;
  }

  /**
   * Remove member from study group
   */
  static async removeMember(groupId: string, userId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    // Check if user is the creator (can't remove creator)
    const group = await this.getGroupById(groupId);
    if (group?.CreatedBy === userId) {
      throw new Error('Group creator cannot be removed. Delete the group instead.');
    }

    await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        DELETE FROM dbo.StudyGroupMembers
        WHERE GroupId = @groupId AND UserId = @userId
      `);

    // Broadcast to group
    if (this.io) {
      this.io.to(`study-group-${groupId}`).emit('member-left', {
        groupId,
        userId,
        leftAt: new Date()
      });
    }
  }

  /**
   * Get all members of a study group
   */
  static async getMembers(groupId: string): Promise<GroupMember[]> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT sgm.*, u.Username, u.Email, u.FirstName, u.LastName
        FROM dbo.StudyGroupMembers sgm
        JOIN dbo.Users u ON sgm.UserId = u.Id
        WHERE sgm.GroupId = @groupId
        ORDER BY sgm.Role DESC, sgm.JoinedAt ASC
      `);

    return result.recordset as GroupMember[];
  }

  /**
   * Get member count for a group
   */
  static async getMemberCount(groupId: string): Promise<number> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        SELECT COUNT(*) as Count
        FROM dbo.StudyGroupMembers
        WHERE GroupId = @groupId
      `);

    return result.recordset[0].Count;
  }

  /**
   * Check if user is member of group
   */
  static async isMember(groupId: string, userId: string): Promise<boolean> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) as Count
        FROM dbo.StudyGroupMembers
        WHERE GroupId = @groupId AND UserId = @userId
      `);

    return result.recordset[0].Count > 0;
  }

  /**
   * Check if user is admin of group
   */
  static async isAdmin(groupId: string, userId: string): Promise<boolean> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) as Count
        FROM dbo.StudyGroupMembers
        WHERE GroupId = @groupId AND UserId = @userId AND Role = 'admin'
      `);

    return result.recordset[0].Count > 0;
  }

  /**
   * Promote member to admin
   */
  static async promoteToAdmin(groupId: string, userId: string): Promise<GroupMember> {
    const db = DatabaseService.getInstance();

    const result = await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE dbo.StudyGroupMembers
        SET Role = 'admin'
        OUTPUT INSERTED.*
        WHERE GroupId = @groupId AND UserId = @userId
      `);

    if (result.recordset.length === 0) {
      throw new Error('Member not found in group');
    }

    const member = result.recordset[0] as GroupMember;

    // Broadcast to group
    if (this.io) {
      this.io.to(`study-group-${groupId}`).emit('member-promoted', {
        groupId,
        userId,
        role: 'admin'
      });
    }

    return member;
  }

  /**
   * Update study group details
   */
  static async updateGroup(
    groupId: string,
    updates: Partial<Pick<StudyGroup, 'Name' | 'Description' | 'MaxMembers' | 'IsActive'>>
  ): Promise<StudyGroup> {
    const db = DatabaseService.getInstance();

    let query = 'UPDATE dbo.StudyGroups SET ';
    const updateParts: string[] = [];
    const request = await db.getRequest();

    request.input('groupId', sql.UniqueIdentifier, groupId);

    if (updates.Name !== undefined) {
      updateParts.push('Name = @name');
      request.input('name', sql.NVarChar, updates.Name);
    }
    if (updates.Description !== undefined) {
      updateParts.push('Description = @description');
      request.input('description', sql.NVarChar, updates.Description);
    }
    if (updates.MaxMembers !== undefined) {
      updateParts.push('MaxMembers = @maxMembers');
      request.input('maxMembers', sql.Int, updates.MaxMembers);
    }
    if (updates.IsActive !== undefined) {
      updateParts.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, updates.IsActive);
    }

    if (updateParts.length === 0) {
      throw new Error('No updates provided');
    }

    query += updateParts.join(', ') + ' OUTPUT INSERTED.* WHERE Id = @groupId';

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      throw new Error('Study group not found');
    }

    const group = result.recordset[0] as StudyGroup;

    // Broadcast update to group members
    if (this.io) {
      this.io.to(`study-group-${groupId}`).emit('group-updated', {
        groupId,
        updates
      });
    }

    return group;
  }

  /**
   * Delete study group (soft delete)
   */
  static async deleteGroup(groupId: string): Promise<void> {
    const db = DatabaseService.getInstance();

    await (await db.getRequest())
      .input('groupId', sql.UniqueIdentifier, groupId)
      .query(`
        UPDATE dbo.StudyGroups
        SET IsActive = 0
        WHERE Id = @groupId
      `);

    // Broadcast to group members
    if (this.io) {
      this.io.to(`study-group-${groupId}`).emit('group-deleted', {
        groupId,
        deletedAt: new Date()
      });
    }
  }

  /**
   * Search study groups by name
   */
  static async searchGroups(searchTerm: string, courseId?: string): Promise<StudyGroup[]> {
    const db = DatabaseService.getInstance();

    let query = `
      SELECT sg.*, COUNT(sgm.UserId) as MemberCount
      FROM dbo.StudyGroups sg
      LEFT JOIN dbo.StudyGroupMembers sgm ON sg.Id = sgm.GroupId
      WHERE sg.IsActive = 1 AND sg.Name LIKE @searchTerm
    `;

    const request = await db.getRequest();
    request.input('searchTerm', sql.NVarChar, `%${searchTerm}%`);

    if (courseId) {
      query += ' AND sg.CourseId = @courseId';
      request.input('courseId', sql.UniqueIdentifier, courseId);
    }

    query += ` 
      GROUP BY sg.Id, sg.Name, sg.Description, sg.CourseId, sg.CreatedBy, sg.IsActive, sg.MaxMembers, sg.CreatedAt
      ORDER BY sg.CreatedAt DESC
    `;

    const result = await request.query(query);

    return result.recordset as StudyGroup[];
  }
}
