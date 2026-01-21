/**
 * Study Group Card Component
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Tooltip,
  Link
} from '@mui/material';
import {
  Group as GroupIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  ExitToApp as LeaveIcon,
  Login as JoinIcon,
  PersonAdd as InviteIcon
} from '@mui/icons-material';
import type { StudyGroup } from '../../types/studyGroup';

interface StudyGroupCardProps {
  group: StudyGroup;
  onlineMembers?: string[]; // Array of user IDs who are online
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  onViewDetails?: (groupId: string) => void;
  onEdit?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  onInvite?: (groupId: string) => void;
}

export const StudyGroupCard: React.FC<StudyGroupCardProps> = ({
  group,
  onlineMembers = [],
  onJoin,
  onLeave,
  onViewDetails,
  onEdit,
  onDelete,
  onInvite
}) => {
  const navigate = useNavigate();
  const isFull = group.MaxMembers !== null && (group.MemberCount || 0) >= group.MaxMembers;
  const canJoin = !group.IsMember && !isFull;

  return (
    <Card 
      data-testid="study-group-card"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 4
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header with name and badges */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <GroupIcon color="primary" />
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              {group.Name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {group.IsMember && (
              <Chip
                label="Member"
                size="small"
                color="success"
                icon={<PersonIcon />}
              />
            )}
            {group.IsAdmin && (
              <Chip
                label="Admin"
                size="small"
                color="secondary"
                icon={<AdminIcon />}
              />
            )}
            {isFull && (
              <Chip
                label="Full"
                size="small"
                color="error"
              />
            )}
          </Box>
        </Box>

        {/* Description */}
        {group.Description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {group.Description.length > 150 
              ? `${group.Description.substring(0, 150)}...` 
              : group.Description}
          </Typography>
        )}

        {/* Course info */}
        {group.CourseTitle && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SchoolIcon fontSize="small" color="action" />
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/courses/${group.CourseId}`)}
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                },
                cursor: 'pointer'
              }}
            >
              {group.CourseTitle}
            </Link>
          </Box>
        )}

        {/* Member count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {group.MemberCount || 0}
            {group.MaxMembers !== null && ` / ${group.MaxMembers}`} members
          </Typography>
          {onlineMembers.length > 0 && (
            <Chip 
              label={`${onlineMembers.length} online`}
              size="small"
              color="success"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* Created by */}
        {group.CreatorName && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Created by {group.CreatorName}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* View Details button */}
          {onViewDetails && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onViewDetails(group.Id)}
              data-testid="study-group-view-details-button"
            >
              View Details
            </Button>
          )}

          {/* Admin actions */}
          {group.IsAdmin && (
            <>
              {onEdit && (
                <Tooltip title="Edit group">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onEdit(group.Id)}
                    data-testid="study-group-edit-button"
                  >
                    Edit
                  </Button>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete group">
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onDelete(group.Id)}
                    data-testid="study-group-delete-button"
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}
            </>
          )}

          {/* Invite button - shown for all members */}
          {group.IsMember && onInvite && (
            <Tooltip title="Invite users to this group">
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<InviteIcon />}
                onClick={() => onInvite(group.Id)}
                data-testid="study-group-invite-button"
              >
                Invite
              </Button>
            </Tooltip>
          )}
        </Box>

        <Box>
          {/* Join/Leave actions */}
          {group.IsMember ? (
            onLeave && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<LeaveIcon />}
                onClick={() => onLeave(group.Id)}
                data-testid="study-group-leave-button"
              >
                Leave
              </Button>
            )
          ) : (
            canJoin && onJoin && (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<JoinIcon />}
                onClick={() => onJoin(group.Id)}
                data-testid="study-group-join-button"
              >
                Join Group
              </Button>
            )
          )}
        </Box>
      </CardActions>
    </Card>
  );
};
