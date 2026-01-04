/**
 * Office Hours Queue Display Component
 * Shows current queue for instructors with admin actions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Badge
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as ClockIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { officeHoursApi } from '../../services/officeHoursApi';
import {
  QueueEntry,
  QueueStats,
  QueueStatus,
  getQueueStatusColor,
  getQueueStatusLabel,
  getDayName,
  formatTime
} from '../../types/officeHours';
import { formatDistanceToNow } from 'date-fns';
import { useOfficeHoursSocket } from '../../hooks/useOfficeHoursSocket.js';
import UserPresenceBadge from '../Presence/UserPresenceBadge';
import { presenceApi } from '../../services/presenceApi';
import { socketService } from '../../services/socketService';
import type { PresenceStatus } from '../../types/presence';

interface QueueDisplayProps {
  instructorId: string;
  isInstructor: boolean;
  onQueueUpdate?: () => void;
}

const QueueDisplay: React.FC<QueueDisplayProps> = ({ instructorId, isInstructor, onQueueUpdate }) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, admitted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});

  // Listen for real-time queue updates
  useOfficeHoursSocket({
    instructorId: isInstructor ? instructorId : null,
    onQueueUpdated: () => {
      loadQueue();
    },
    onAdmitted: () => {
      loadQueue();
    },
    onCompleted: () => {
      loadQueue();
    },
    onCancelled: () => {
      loadQueue();
    }
  });

  useEffect(() => {
    loadQueue();
  }, [instructorId]);

  // Load presence status for students in queue
  useEffect(() => {
    const loadPresence = async () => {
      if (queue.length === 0) return;
      
      try {
        const userIds = queue.map(entry => entry.StudentId);
        const response = await presenceApi.getBulkPresence(userIds);
        
        const map: Record<string, PresenceStatus> = {};
        response.presences.forEach(p => {
          map[p.UserId] = p.Status;
        });
        setPresenceMap(map);
      } catch (err) {
        console.error('Failed to load presence:', err);
      }
    };
    
    loadPresence();
    
    // Listen for presence changes
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('presence-changed', loadPresence);
      return () => {
        socket.off('presence-changed', loadPresence);
      };
    }
  }, [queue]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await officeHoursApi.getQueue(instructorId);
      setQueue(data.queue);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitStudent = async (queueId: string) => {
    try {
      setActioningId(queueId);
      await officeHoursApi.admitStudent(queueId);
      toast.success('Student admitted to office hours');
      loadQueue();
      onQueueUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleCompleteSession = async (queueId: string) => {
    try {
      setActioningId(queueId);
      await officeHoursApi.completeSession(queueId);
      toast.success('Session completed successfully');
      loadQueue();
      onQueueUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleCancelEntry = async (queueId: string) => {
    if (!window.confirm('Are you sure you want to cancel this queue entry?')) {
      return;
    }

    try {
      setActioningId(queueId);
      await officeHoursApi.cancelQueueEntry(queueId);
      toast.success('Queue entry cancelled');
      loadQueue();
      onQueueUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const getWaitTime = (entry: QueueEntry): string => {
    try {
      return formatDistanceToNow(new Date(entry.JoinedQueueAt), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Stats */}
      <Box mb={3}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {isInstructor ? 'Current Queue' : 'Queue Status'}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Chip
            label={`${stats.waiting} Waiting`}
            color="warning"
            icon={<ClockIcon />}
          />
          <Chip
            label={`${stats.admitted} In Session`}
            color="primary"
            icon={<PersonIcon />}
          />
          {stats.averageWaitTime ? (
            <Chip
              label={`Avg Wait: ${Math.round(stats.averageWaitTime)}min`}
              color="info"
            />
          ) : null}
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Queue List */}
      {queue.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center" py={3}>
              No students in queue
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {queue.map((entry, index) => (
            <Card
              key={entry.Id}
              sx={{
                borderLeft: entry.Status === QueueStatus.Waiting ? '4px solid #ff9800' : '4px solid #1976d2'
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  {/* Student Info */}
                  <Box display="flex" gap={2} flex={1}>
                    <Badge
                      badgeContent={entry.Position || index + 1}
                      color="primary"
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                    >
                      <UserPresenceBadge
                        firstName={entry.StudentName?.split(' ')[0] || 'Unknown'}
                        lastName={entry.StudentName?.split(' ').slice(1).join(' ') || 'Student'}
                        avatarUrl={null}
                        status={presenceMap[entry.StudentId] || 'offline'}
                        size={40}
                      />
                    </Badge>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="bold">
                        {entry.StudentName || 'Student'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {entry.StudentEmail}
                      </Typography>

                      {/* Show which schedule they're waiting for */}
                      {entry.DayOfWeek !== undefined && entry.StartTime && entry.EndTime && (
                        <Box mt={1} p={1} bgcolor="info.light" borderRadius={1}>
                          <Typography variant="caption" fontWeight="bold" color="info.dark">
                            <ClockIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} />{' '}
                            {getDayName(entry.DayOfWeek)}: {formatTime(entry.StartTime)} - {formatTime(entry.EndTime)}
                          </Typography>
                        </Box>
                      )}
                      
                      {entry.Question && (
                        <Box mt={1} p={1} bgcolor="grey.100" borderRadius={1}>
                          <Typography variant="body2" fontStyle="italic">
                            "{entry.Question}"
                          </Typography>
                        </Box>
                      )}

                      <Stack direction="row" spacing={2} mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          <ClockIcon fontSize="inherit" /> Joined {getWaitTime(entry)}
                        </Typography>
                        {entry.AdmittedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Admitted {formatDistanceToNow(new Date(entry.AdmittedAt), { addSuffix: true })}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Box>

                  {/* Status and Actions */}
                  <Box textAlign="right">
                    <Chip
                      label={getQueueStatusLabel(entry.Status as QueueStatus)}
                      color={getQueueStatusColor(entry.Status as QueueStatus)}
                      size="small"
                      sx={{ mb: 2 }}
                    />

                    {isInstructor && (
                      <Stack spacing={1}>
                        {entry.Status === QueueStatus.Waiting && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckIcon />}
                            onClick={() => handleAdmitStudent(entry.Id)}
                            disabled={actioningId === entry.Id}
                            data-testid="queue-admit-button"
                          >
                            Admit
                          </Button>
                        )}
                        {entry.Status === QueueStatus.Admitted && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={() => handleCompleteSession(entry.Id)}
                            disabled={actioningId === entry.Id}
                            data-testid="queue-complete-button"
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelEntry(entry.Id)}
                          disabled={actioningId === entry.Id}
                          data-testid="queue-cancel-button"
                        >
                          Cancel
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default QueueDisplay;
