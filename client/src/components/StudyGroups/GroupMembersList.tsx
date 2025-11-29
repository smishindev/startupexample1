/**
 * Group Members List Component
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Delete as RemoveIcon,
  ArrowUpward as PromoteIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { getGroupMembers, promoteMember, removeMember } from '../../services/studyGroupsApi';
import type { GroupMember } from '../../types/studyGroup';
import { GroupRole } from '../../types/studyGroup';

interface GroupMembersListProps {
  groupId: string;
  isAdmin: boolean;
  currentUserId: string;
  onMemberUpdate?: () => void;
}

export const GroupMembersList: React.FC<GroupMembersListProps> = ({
  groupId,
  isAdmin,
  currentUserId,
  onMemberUpdate
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGroupMembers(groupId);
      // Sort: admins first, then by joined date
      const sorted = data.sort((a, b) => {
        if (a.Role === GroupRole.Admin && b.Role !== GroupRole.Admin) return -1;
        if (a.Role !== GroupRole.Admin && b.Role === GroupRole.Admin) return 1;
        return new Date(a.JoinedAt).getTime() - new Date(b.JoinedAt).getTime();
      });
      setMembers(sorted);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setError(error.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const handlePromote = async (memberId: string, userName: string) => {
    try {
      setActionInProgress(memberId);
      await promoteMember(groupId, memberId);
      toast.success(`${userName} promoted to admin`);
      fetchMembers();
      onMemberUpdate?.();
    } catch (error: any) {
      console.error('Error promoting member:', error);
      toast.error(error.message || 'Failed to promote member');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemove = async (memberId: string, userName: string) => {
    if (!window.confirm(`Remove ${userName} from the group?`)) {
      return;
    }

    try {
      setActionInProgress(memberId);
      await removeMember(groupId, memberId);
      toast.success(`${userName} removed from group`);
      fetchMembers();
      onMemberUpdate?.();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (members.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No members in this group yet
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PersonIcon />
        Members ({members.length})
      </Typography>

      <List>
        {members.map((member) => {
          const isCurrentUser = member.UserId === currentUserId;
          const isMemberAdmin = member.Role === GroupRole.Admin;

          return (
            <ListItem
              key={member.Id}
              secondaryAction={
                isAdmin && !isCurrentUser && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Promote to Admin button */}
                    {!isMemberAdmin && (
                      <Tooltip title="Promote to admin">
                        <IconButton
                          edge="end"
                          onClick={() => handlePromote(member.UserId, member.UserName || 'Member')}
                          disabled={!!actionInProgress}
                          size="small"
                        >
                          <PromoteIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    {/* Remove member button */}
                    <Tooltip title="Remove from group">
                      <IconButton
                        edge="end"
                        onClick={() => handleRemove(member.UserId, member.UserName || 'Member')}
                        disabled={!!actionInProgress}
                        color="error"
                        size="small"
                      >
                        <RemoveIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )
              }
              sx={{
                bgcolor: isCurrentUser ? 'action.selected' : 'transparent',
                borderRadius: 1,
                mb: 0.5
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: isMemberAdmin ? 'secondary.main' : 'primary.main' }}>
                  {isMemberAdmin ? <AdminIcon /> : <PersonIcon />}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      {member.UserName || 'Unknown User'}
                      {isCurrentUser && ' (You)'}
                    </Typography>
                    {isMemberAdmin && (
                      <Chip
                        label="Admin"
                        size="small"
                        color="secondary"
                        icon={<AdminIcon />}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    {member.UserEmail && (
                      <Typography variant="caption" display="block">
                        {member.UserEmail}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Joined {new Date(member.JoinedAt).toLocaleDateString()}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
