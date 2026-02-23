import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { getGroupById } from '../../services/studyGroupsApi';
import { GroupMembersList } from '../../components/StudyGroups/GroupMembersList';
import type { StudyGroup } from '../../types/studyGroup';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { useStudyGroupSocket } from '../../hooks/useStudyGroupSocket';
import { PageContainer } from '../../components/Responsive';

const StudyGroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) {
      setError('Invalid group ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getGroupById(groupId);
      setGroup(data);
    } catch (err: any) {
      console.error('Failed to load study group:', err);
      setError(err.response?.data?.message || 'Failed to load study group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  // Socket.io real-time updates using the hook
  const { joinStudyGroup, leaveStudyGroup } = useStudyGroupSocket({
    onMemberJoined: (data) => {
      if (data.groupId === groupId) {
        // Update member count when someone joins
        loadGroup();
      }
    },
    onMemberLeft: (data) => {
      if (data.groupId === groupId) {
        // If current user left, redirect to list
        if (data.userId === user?.id) {
          navigate('/study-groups', { 
            state: { message: 'You have left this group' }
          });
        } else {
          // Someone else left, just refresh
          loadGroup();
        }
      }
    },
    onMemberPromoted: (data) => {
      if (data.groupId === groupId) {
        // Refresh to update admin status if needed
        loadGroup();
      }
    },
    onMemberRemoved: (data) => {
      if (data.groupId === groupId) {
        // If current user was removed, redirect to list
        if (data.userId === user?.id) {
          navigate('/study-groups', { 
            state: { message: 'You have been removed from this group' }
          });
        } else {
          // Someone else was removed, just refresh
          loadGroup();
        }
      }
    },
    onGroupDeleted: (data) => {
      if (data.groupId === groupId) {
        // Group was deleted, redirect to study groups list
        navigate('/study-groups', { 
          state: { message: 'This study group has been deleted' }
        });
      }
    }
  });

  // Join/leave socket room for this group
  useEffect(() => {
    if (groupId) {
      joinStudyGroup(groupId);
      return () => {
        leaveStudyGroup(groupId);
      };
    }
  }, [groupId, joinStudyGroup, leaveStudyGroup]); // Functions are now stable from useCallback

  const handleMembersUpdate = () => {
    // Only update member count, GroupMembersList handles its own member list refresh
    if (groupId) {
      getGroupById(groupId).then(data => {
        setGroup(data);
      }).catch(err => {
        console.error('Failed to update group data:', err);
      });
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <PageContainer maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </PageContainer>
      </>
    );
  }

  if (error || !group) {
    return (
      <>
        <Header />
        <PageContainer maxWidth="lg">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Study group not found'}
          </Alert>
          <Box>
            <Link
              component={RouterLink}
              to="/study-groups"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ArrowBackIcon fontSize="small" />
              Back to Study Groups
            </Link>
          </Box>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <PageContainer maxWidth="lg">
        {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: { xs: 2, sm: 3 }, overflow: 'auto' }}>
        <Link
          component={RouterLink}
          to="/study-groups"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}
        >
          <PeopleIcon fontSize="small" />
          Study Groups
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} noWrap>
          {group.Name}
        </Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <Tooltip title="Back to Study Groups">
          <IconButton
            onClick={() => navigate('/study-groups')}
            size="small"
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Group Info Card */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
          <Box flex={1} minWidth={0}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
              {group.Name}
            </Typography>
            {group.Description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {group.Description}
              </Typography>
            )}
          </Box>
          <Chip
            icon={<PeopleIcon />}
            label={`${group.MemberCount || 0} members`}
            color="primary"
            variant="outlined"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" alignItems="center" gap={1}>
          <SchoolIcon color="action" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            Course: {group.CourseTitle || 'N/A'}
          </Typography>
        </Box>
      </Paper>

      {/* Members List */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Group Members
        </Typography>
        <GroupMembersList
          groupId={groupId!}
          isAdmin={group.IsAdmin || false}
          currentUserId={user?.id || ''}
          onMemberUpdate={handleMembersUpdate}
        />
      </Paper>
    </PageContainer>
    </>
  );
};

export default StudyGroupDetailPage;
