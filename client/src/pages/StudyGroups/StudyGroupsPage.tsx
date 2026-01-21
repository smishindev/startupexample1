/**
 * Study Groups Page
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { StudyGroupCard } from '../../components/StudyGroups/StudyGroupCard';
import { CreateGroupModal } from '../../components/StudyGroups/CreateGroupModal';
import { InviteUserModal } from '../../components/StudyGroups/InviteUserModal';
import { 
  getAllGroups,
  getMyGroups, 
  getGroupsByCourse, 
  joinGroup, 
  leaveGroup,
  deleteGroup,
  searchGroups
} from '../../services/studyGroupsApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { instructorApi } from '../../services/instructorApi';
import type { StudyGroup } from '../../types/studyGroup';
import { useAuthStore } from '../../stores/authStore';
import { useStudyGroupSocket } from '../../hooks/useStudyGroupSocket';
import { presenceApi } from '../../services/presenceApi';
import { socketService } from '../../services/socketService';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';

interface Course {
  Id: string;
  Title: string;
}

type TabValue = 'all' | 'my-groups' | 'course';

export const StudyGroupsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabValue>('my-groups');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedGroupForInvite, setSelectedGroupForInvite] = useState<{ id: string; name: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (user?.role === 'instructor') {
          const response = await instructorApi.getCourses();
          const coursesData = response.courses.map(c => ({
            Id: c.id,
            Title: c.title
          }));
          setCourses(coursesData);
        } else {
          const response = await enrollmentApi.getMyEnrollments();
          const coursesData = response.enrollments.map(e => ({
            Id: e.courseId,
            Title: e.Title
          }));
          setCourses(coursesData);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    fetchCourses();
  }, [user]);

  // Debounce search query to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay for debouncing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch groups based on active tab
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let data: StudyGroup[] = [];

      // If there's a search query, use search API regardless of tab
      if (debouncedSearchQuery.trim()) {
        data = await searchGroups({
          q: debouncedSearchQuery,
          courseId: activeTab === 'course' ? selectedCourse || undefined : undefined
        });
      } else {
        // No search query - fetch by tab
        if (activeTab === 'my-groups') {
          data = await getMyGroups();
        } else if (activeTab === 'course' && selectedCourse) {
          data = await getGroupsByCourse(selectedCourse);
        } else if (activeTab === 'all') {
          data = await getAllGroups();
        }
      }

      setGroups(data);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      setError(error.message || 'Failed to load study groups');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCourse, debouncedSearchQuery]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Load online users for presence indicators
  useEffect(() => {
    const loadOnlineUsers = async () => {
      try {
        const response = await presenceApi.getOnlineUsers(1000);
        setOnlineUsers(response.users.map(u => u.UserId));
      } catch (err) {
        console.error('Failed to load online users:', err);
      }
    };
    
    loadOnlineUsers();
    
    // Listen for presence changes
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('presence-changed', loadOnlineUsers);
      return () => {
        socket.off('presence-changed', loadOnlineUsers);
      };
    }
  }, []);

  // Socket.IO callbacks with useCallback to prevent re-renders
  const handleMemberJoined = useCallback((data: any) => {
    console.log('handleMemberJoined called:', data);
    // Don't update if it's the current user (optimistic update already happened)
    if (data.userId === user?.id) {
      console.log('Ignoring own join event (optimistic update already applied)');
      return;
    }
    setGroups(prev => prev.map(g => 
      g.Id === data.groupId 
        ? {...g, MemberCount: (g.MemberCount || 0) + 1}
        : g
    ));
  }, [user]);

  const handleMemberLeft = useCallback((data: any) => {
    console.log('handleMemberLeft called:', data);
    // Don't update if it's the current user (optimistic update already happened)
    if (data.userId === user?.id) {
      console.log('Ignoring own leave event (optimistic update already applied)');
      return;
    }
    setGroups(prev => prev.map(g => 
      g.Id === data.groupId 
        ? {...g, MemberCount: Math.max((g.MemberCount || 1) - 1, 0)}
        : g
    ));
  }, [user]);  const handleGroupCreated = useCallback((data: any) => {
    console.log('handleGroupCreated called:', data);
    toast.info(`New group created: ${data.groupName}`);
    
    // Only refetch if the group would appear in the current view
    if (activeTab === 'all') {
      // All groups tab - always refetch to include new group
      fetchGroups();
    } else if (activeTab === 'course' && data.courseId === selectedCourse) {
      // Course tab - only refetch if group belongs to the selected course
      fetchGroups();
    } else if (activeTab === 'my-groups') {
      // My groups tab - refetch to check if we're a member
      // (creator is automatically added as admin member)
      fetchGroups();
    }
    // If none of the above, just show the toast notification
  }, [fetchGroups, activeTab, selectedCourse]);

  const handleGroupDeleted = useCallback((data: any) => {
    console.log('handleGroupDeleted called:', data);
    setGroups(prev => prev.filter(g => g.Id !== data.groupId));
    toast.warning('A group was deleted');
  }, []);

  // Socket.IO real-time updates
  useStudyGroupSocket({
    onMemberJoined: handleMemberJoined,
    onMemberLeft: handleMemberLeft,
    onGroupCreated: handleGroupCreated,
    onGroupDeleted: handleGroupDeleted
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
    setSearchQuery('');
  };

  const handleJoin = async (groupId: string) => {
    try {
      await joinGroup(groupId);
      // Update local state immediately (optimistic update)
      setGroups(prev => prev.map(g => 
        g.Id === groupId 
          ? {...g, IsMember: true, MemberCount: (g.MemberCount || 0) + 1} 
          : g
      ));
      toast.success('Joined study group!');
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
      // Revert on error
      fetchGroups();
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      await leaveGroup(groupId);
      // Update local state immediately (optimistic update)
      setGroups(prev => prev.map(g => 
        g.Id === groupId 
          ? {...g, IsMember: false, MemberCount: Math.max((g.MemberCount || 1) - 1, 0)} 
          : g
      ));
      toast.success('Left study group');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error.message || 'Failed to leave group');
      // Revert on error
      fetchGroups();
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteGroup(groupId);
      toast.success('Study group deleted');
      fetchGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      toast.error(error.message || 'Failed to delete group');
    }
  };

  const handleInvite = (groupId: string) => {
    const group = groups.find(g => g.Id === groupId);
    if (group) {
      setSelectedGroupForInvite({ id: group.Id, name: group.Name });
      setInviteModalOpen(true);
    }
  };

  const filteredGroups = groups;

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <GroupIcon fontSize="large" color="primary" />
          Study Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          data-testid="study-groups-create-button"
        >
          Create Group
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" data-testid="study-groups-tabs">
          <Tab label="My Groups" value="my-groups" data-testid="study-groups-tab-my" />
          <Tab label="All Groups" value="all" data-testid="study-groups-tab-all" />
          <Tab label="By Course" value="course" data-testid="study-groups-tab-course" />
        </Tabs>
      </Paper>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {/* Search */}
          <TextField
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="study-groups-search-input"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading && debouncedSearchQuery ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : undefined
            }}
            sx={{ flexGrow: 1, minWidth: 250 }}
          />

          {/* Course Filter */}
          {activeTab === 'course' && (
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>Select Course</InputLabel>
              <Select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                label="Select Course"
                data-testid="study-groups-course-select"
              >
                <MenuItem value="">
                  <em>All Courses</em>
                </MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.Id} value={course.Id}>
                    {course.Title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredGroups.length === 0 ? (
        <Alert severity="info">
          {debouncedSearchQuery.trim()
            ? `No study groups found matching "${debouncedSearchQuery}". Try a different search term.`
            : activeTab === 'my-groups'
            ? "You haven't joined any study groups yet. Browse available groups or create a new one!"
            : 'No study groups found. Try creating one!'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.Id}>
              <StudyGroupCard
                group={group}
                onlineMembers={onlineUsers}
                onJoin={handleJoin}
                onLeave={handleLeave}
                onDelete={group.IsAdmin ? handleDelete : undefined}
                onInvite={handleInvite}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          fetchGroups();
        }}
        courses={courses}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        groupId={selectedGroupForInvite?.id || ''}
        groupName={selectedGroupForInvite?.name || ''}
      />
    </Container>
    </>
  );
};

export default StudyGroupsPage;