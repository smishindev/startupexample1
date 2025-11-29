/**
 * InstructorSessionsList Component
 * Displays and manages instructor's live sessions
 * Phase 2 - Collaborative Features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { LiveSessionCard } from './LiveSessionCard';
import { CreateSessionModal } from './CreateSessionModal';
import {
  getInstructorSessions,
  startSession,
  endSession,
  cancelSession,
} from '../../services/liveSessionsApi';
import { LiveSession, SessionStatus } from '../../types/liveSession';
import { useLiveSessionSocket } from '../../hooks/useLiveSessionSocket';

interface Course {
  Id: string;
  Title: string;
}

interface InstructorSessionsListProps {
  courses?: Course[];
}

export const InstructorSessionsList: React.FC<InstructorSessionsListProps> = ({
  courses = [],
}) => {
  const theme = useTheme();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getInstructorSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Setup Socket.IO listeners for real-time updates
  useLiveSessionSocket({
    onAttendeeJoined: (data) => {
      // Update attendee count for the session
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, AttendeeCount: (s.AttendeeCount || 0) + 1 }
            : s
        )
      );
      toast.success(`${data.userName} joined your session`);
    },
    onAttendeeLeft: (data) => {
      // Update attendee count for the session
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, AttendeeCount: Math.max((s.AttendeeCount || 1) - 1, 0) }
            : s
        )
      );
    },
  });

  // Filter sessions by status
  const filteredSessions = sessions.filter((session) => {
    switch (activeTab) {
      case 0: // All
        return true;
      case 1: // Upcoming
        return session.Status === SessionStatus.Scheduled;
      case 2: // Live
        return session.Status === SessionStatus.InProgress;
      case 3: // Past
        return session.Status === SessionStatus.Ended || session.Status === SessionStatus.Cancelled;
      default:
        return true;
    }
  });

  // Handle start session
  const handleStart = async (sessionId: string) => {
    try {
      await startSession(sessionId);
      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === sessionId ? { ...s, Status: SessionStatus.InProgress } : s
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    }
  };

  // Handle end session
  const handleEnd = async (sessionId: string) => {
    try {
      await endSession(sessionId);
      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === sessionId ? { ...s, Status: SessionStatus.Ended } : s
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to end session');
    }
  };

  // Handle cancel session
  const handleCancel = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) {
      return;
    }

    try {
      await cancelSession(sessionId);
      toast.success('Session cancelled successfully');
      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === sessionId ? { ...s, Status: SessionStatus.Cancelled } : s
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel session');
    }
  };

  // Handle edit session
  const handleEdit = (_sessionId: string) => {
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon!');
  };

  // Handle delete session
  const handleDelete = (_sessionId: string) => {
    // TODO: Implement delete functionality
    alert('Delete functionality coming soon!');
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            My Live Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and schedule your live sessions
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateModalOpen(true)}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            px: 3,
          }}
        >
          Create Session
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tab label="All" />
        <Tab label="Upcoming" />
        <Tab label="Live" />
        <Tab label="Past" />
      </Tabs>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button size="small" onClick={fetchSessions} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      ) : filteredSessions.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2,
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {activeTab === 0
              ? 'No sessions yet'
              : activeTab === 1
              ? 'No upcoming sessions'
              : activeTab === 2
              ? 'No live sessions'
              : 'No past sessions'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {activeTab === 0
              ? 'Create your first live session to get started'
              : 'Sessions will appear here when available'}
          </Typography>
          {activeTab === 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Your First Session
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredSessions.map((session) => (
            <Grid item xs={12} sm={6} md={4} key={session.Id}>
              <LiveSessionCard
                session={session}
                isInstructor
                onStart={handleStart}
                onEnd={handleEnd}
                onCancel={handleCancel}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Modal */}
      <CreateSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchSessions}
        courses={courses}
      />
    </Box>
  );
};
