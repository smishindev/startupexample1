import { Router } from 'express';
import { Server } from 'socket.io';
import { StudyGroupService } from '../services/StudyGroupService';
import { SettingsService } from '../services/SettingsService';
import { NotificationService } from '../services/NotificationService';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const settingsService = new SettingsService();

/**
 * @route   POST /api/study-groups
 * @desc    Create a new study group
 * @access  Private
 */
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, courseId, maxMembers } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await StudyGroupService.createGroup({
      name,
      description,
      courseId,
      createdBy: req.user!.userId,
      maxMembers
    });

    // Emit Socket.IO event
    const io: Server = req.app.get('io');
    if (io) {
      console.log('Emitting group-created event:', { groupId: group.Id, groupName: group.Name });
      io.emit('group-created', {
        groupId: group.Id,
        groupName: group.Name,
        courseId: group.CourseId
      });
    }

    res.status(201).json({ 
      message: 'Study group created successfully', 
      group 
    });
  } catch (error) {
    console.error('Error creating study group:', error);
    res.status(500).json({ 
      message: 'Failed to create study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups
 * @desc    Get all study groups (with membership info)
 * @access  Private
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const db = await (await import('../services/DatabaseService')).DatabaseService.getInstance();
    const request = await db.getRequest();
    const result = await request.query(`
      SELECT 
        sg.Id,
        sg.Name,
        sg.Description,
        sg.CourseId,
        sg.CreatedBy,
        sg.MaxMembers,
        sg.CreatedAt,
        c.Title as CourseTitle,
        COUNT(sgm.UserId) as MemberCount
      FROM dbo.StudyGroups sg
      LEFT JOIN dbo.StudyGroupMembers sgm ON sg.Id = sgm.GroupId
      LEFT JOIN dbo.Courses c ON sg.CourseId = c.Id
      WHERE sg.IsActive = 1
      GROUP BY sg.Id, sg.Name, sg.Description, sg.CourseId, sg.CreatedBy, sg.MaxMembers, sg.CreatedAt, c.Title
      ORDER BY sg.CreatedAt DESC
    `);

    const groups = result.recordset;
    const enrichedGroups = await StudyGroupService.enrichGroupsWithMembership(groups, req.user!.userId);

    res.json({ groups: enrichedGroups, count: enrichedGroups.length });
  } catch (error) {
    console.error('Error fetching all study groups:', error);
    res.status(500).json({ 
      message: 'Failed to fetch study groups', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups/search
 * @desc    Search study groups by name
 * @access  Private
 * @note    Must come before /:groupId to avoid treating "search" as a groupId
 */
router.get('/search', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { q, courseId } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const groups = await StudyGroupService.searchGroups(
      q as string,
      courseId as string | undefined
    );
    const enrichedGroups = await StudyGroupService.enrichGroupsWithMembership(groups, req.user!.userId);

    res.json({ groups: enrichedGroups, count: enrichedGroups.length });
  } catch (error) {
    console.error('Error searching study groups:', error);
    res.status(500).json({ 
      message: 'Failed to search study groups', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups/course/:courseId
 * @desc    Get all study groups for a course
 * @access  Private
 * @note    Must come before /:groupId to avoid treating "course" as a groupId
 */
router.get('/course/:courseId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.params;

    const groups = await StudyGroupService.getGroupsByCourse(courseId);
    const enrichedGroups = await StudyGroupService.enrichGroupsWithMembership(groups, req.user!.userId);

    res.json({ groups: enrichedGroups, count: enrichedGroups.length });
  } catch (error) {
    console.error('Error fetching course study groups:', error);
    res.status(500).json({ 
      message: 'Failed to fetch study groups', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups/my/groups
 * @desc    Get user's study groups
 * @access  Private
 * @note    Must come before /:groupId to avoid treating "my" as a groupId
 */
router.get('/my/groups', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const groups = await StudyGroupService.getUserGroups(req.user!.userId);
    // For "my groups", user is always a member, enrich with admin status
    const enrichedGroups = groups.map(g => ({
      ...g,
      IsMember: true,
      IsAdmin: (g as any).Role === 'admin'
    }));

    res.json({ groups: enrichedGroups, count: enrichedGroups.length });
  } catch (error) {
    console.error('Error fetching user study groups:', error);
    res.status(500).json({ 
      message: 'Failed to fetch study groups', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups/:groupId
 * @desc    Get study group details
 * @access  Private
 * @note    Generic route - must come AFTER specific routes (search, course, my)
 */
router.get('/:groupId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;

    const group = await StudyGroupService.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Error fetching study group:', error);
    res.status(500).json({ 
      message: 'Failed to fetch study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/study-groups/:groupId/invite
 * @desc    Invite a user to join a study group
 * @access  Private (member only)
 */
router.post('/:groupId/invite', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Prevent users from inviting themselves
    if (userId === req.user!.userId) {
      return res.status(400).json({ message: 'You cannot invite yourself' });
    }

    // Check if requester is a member of the group
    const isMember = await StudyGroupService.isMember(groupId, req.user!.userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Only group members can invite others' });
    }

    // Check if invited user exists
    const db = DatabaseService.getInstance();
    const userResult = await db.query<{ Id: string; FirstName: string; LastName: string; Username: string }>(
      `SELECT Id, FirstName, LastName, Username FROM dbo.Users WHERE Id = @userId AND IsActive = 1`,
      { userId }
    );

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const alreadyMember = await StudyGroupService.isMember(groupId, userId);
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    // Get group details for notification
    const group = await StudyGroupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Study group not found' });
    }

    // Get inviter name
    const inviterResult = await db.query<{ FirstName: string; LastName: string; Username: string }>(
      `SELECT FirstName, LastName, Username FROM dbo.Users WHERE Id = @inviterId`,
      { inviterId: req.user!.userId }
    );
    const inviterName = inviterResult[0]?.FirstName && inviterResult[0]?.LastName 
      ? `${inviterResult[0].FirstName} ${inviterResult[0].LastName}`
      : inviterResult[0]?.Username || 'A group member';

    // Send notification to invited user
    const io: Server = req.app.get('io');
    if (io) {
      try {
        const notificationService = new NotificationService(io);
        await notificationService.createNotificationWithControls(
          {
            userId: userId,
            type: 'course',
            priority: 'normal',
            title: 'Study Group Invitation',
            message: `${inviterName} invited you to join "${group.Name}"`,
            actionUrl: `/study-groups`,
            actionText: 'View Group',
            relatedEntityId: groupId,
            relatedEntityType: 'course'
          },
          {
            category: 'community',
            subcategory: 'GroupInvites'
          }
        );
        console.log(`✅ Invitation notification sent to user ${userId} for group ${groupId}`);
      } catch (notifError) {
        console.error('❌ Error creating invitation notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    res.json({ 
      message: 'Invitation sent successfully',
      invitedUser: {
        id: userResult[0].Id,
        name: userResult[0].FirstName && userResult[0].LastName 
          ? `${userResult[0].FirstName} ${userResult[0].LastName}`
          : userResult[0].Username
      }
    });
  } catch (error) {
    console.error('Error inviting user to study group:', error);
    res.status(500).json({ 
      message: 'Failed to send invitation', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/study-groups/:groupId/join
 * @desc    Join a study group
 * @access  Private
 */
router.post('/:groupId/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;

    const member = await StudyGroupService.addMember(groupId, req.user!.userId);

    // Emit Socket.IO event (always)
    const io: Server = req.app.get('io');
    if (io) {
      console.log('Emitting study-group-member-joined event:', { groupId, userId: req.user!.userId });
      io.emit('study-group-member-joined', {
        groupId,
        userId: req.user!.userId,
        userName: req.user!.email
      });
    }

    // Get group details and new member info for notifications
    const group = await StudyGroupService.getGroupById(groupId);
    
    // Only send notifications if group exists and has other members
    if (group && io) {
      const db = DatabaseService.getInstance();
      const newMemberResult = await db.query<{ FirstName: string; LastName: string; Username: string }>(
        `SELECT FirstName, LastName, Username FROM dbo.Users WHERE Id = @userId`,
        { userId: req.user!.userId }
      );
      const newMemberName = newMemberResult[0]?.FirstName && newMemberResult[0]?.LastName 
        ? `${newMemberResult[0].FirstName} ${newMemberResult[0].LastName}`
        : newMemberResult[0]?.Username || 'A new member';

      // Get all existing members (excluding the new joiner) for notifications
      const existingMembers = await db.query<{ UserId: string }>(
        `SELECT UserId FROM dbo.StudyGroupMembers WHERE GroupId = @groupId AND UserId != @newUserId`,
        { groupId, newUserId: req.user!.userId }
      );

      // Send notifications to existing members about the new joiner
      if (existingMembers.length > 0) {
        try {
          const notificationService = new NotificationService(io);
          
          for (const existingMember of existingMembers) {
            await notificationService.createNotificationWithControls(
              {
                userId: existingMember.UserId,
                type: 'course',
                priority: 'normal',
                title: 'New Study Group Member',
                message: `${newMemberName} joined "${group.Name}"`,
                actionUrl: `/study-groups`,
                actionText: 'View Group',
                relatedEntityId: groupId,
                relatedEntityType: 'course'
              },
              {
                category: 'community',
                subcategory: 'GroupActivity'
              }
            );
          }
          console.log(`✅ Sent ${existingMembers.length} member-joined notifications for group ${groupId}`);
        } catch (notifError) {
          console.error('❌ Error creating member-joined notifications:', notifError);
          // Don't fail the request if notifications fail
        }
      }
    }

    res.json({ 
      message: 'Joined study group successfully', 
      member 
    });
  } catch (error) {
    console.error('Error joining study group:', error);
    res.status(500).json({ 
      message: 'Failed to join study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/study-groups/:groupId/leave
 * @desc    Leave a study group
 * @access  Private
 */
router.post('/:groupId/leave', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;

    await StudyGroupService.removeMember(groupId, req.user!.userId);

    // Emit Socket.IO event
    const io: Server = req.app.get('io');
    if (io) {
      io.emit('study-group-member-left', {
        groupId,
        userId: req.user!.userId,
        userName: req.user!.email
      });
    }

    res.json({ message: 'Left study group successfully' });
  } catch (error) {
    console.error('Error leaving study group:', error);
    res.status(500).json({ 
      message: 'Failed to leave study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   GET /api/study-groups/:groupId/members
 * @desc    Get study group members
 * @access  Private
 */
router.get('/:groupId/members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;
    const viewerId = req.user!.userId;

    // Check if user is a member
    const isMember = await StudyGroupService.isMember(groupId, viewerId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const members = await StudyGroupService.getMembers(groupId);

    // Apply privacy filtering (group members can see each other, respect email)
    const filteredMembers = await Promise.all(
      members.map(async (member: any) => {
        try {
          const settings = await settingsService.getUserSettings(member.UserId);
          const isOwnProfile = member.UserId === viewerId;
          return settingsService.filterUserData(member, settings, isOwnProfile);
        } catch (error) {
          console.error(`Error filtering member ${member.UserId}:`, error);
          return { ...member, Email: null };
        }
      })
    );

    res.json({ members: filteredMembers, count: filteredMembers.length });
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ 
      message: 'Failed to fetch members', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/study-groups/:groupId/members/:userId/promote
 * @desc    Promote member to admin
 * @access  Private (admin only)
 */
router.post('/:groupId/members/:userId/promote', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId, userId } = req.params;

    // Check if requester is admin
    const isAdmin = await StudyGroupService.isAdmin(groupId, req.user!.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can promote members' });
    }

    const member = await StudyGroupService.promoteToAdmin(groupId, userId);

    res.json({ 
      message: 'Member promoted to admin', 
      member 
    });
  } catch (error) {
    console.error('Error promoting member:', error);
    res.status(500).json({ 
      message: 'Failed to promote member', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   POST /api/study-groups/:groupId/members/:userId/remove
 * @desc    Remove member from group
 * @access  Private (admin only)
 */
router.post('/:groupId/members/:userId/remove', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId, userId } = req.params;

    // Check if requester is admin
    const isAdmin = await StudyGroupService.isAdmin(groupId, req.user!.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    await StudyGroupService.removeMember(groupId, userId);

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ 
      message: 'Failed to remove member', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   PUT /api/study-groups/:groupId
 * @desc    Update study group details
 * @access  Private (admin only)
 */
router.put('/:groupId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, maxMembers } = req.body;

    // Check if requester is admin
    const isAdmin = await StudyGroupService.isAdmin(groupId, req.user!.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can update group details' });
    }

    const group = await StudyGroupService.updateGroup(groupId, {
      Name: name,
      Description: description,
      MaxMembers: maxMembers
    });

    res.json({ 
      message: 'Study group updated successfully', 
      group 
    });
  } catch (error) {
    console.error('Error updating study group:', error);
    res.status(500).json({ 
      message: 'Failed to update study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * @route   DELETE /api/study-groups/:groupId
 * @desc    Delete study group
 * @access  Private (admin only)
 */
router.delete('/:groupId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;

    // Check if requester is admin
    const isAdmin = await StudyGroupService.isAdmin(groupId, req.user!.userId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    await StudyGroupService.deleteGroup(groupId);

    // Emit Socket.IO event
    const io: Server = req.app.get('io');
    if (io) {
      console.log('Emitting group-deleted event:', { groupId });
      io.emit('group-deleted', { groupId });
    }

    res.json({ message: 'Study group deleted successfully' });
  } catch (error) {
    console.error('Error deleting study group:', error);
    res.status(500).json({ 
      message: 'Failed to delete study group', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
