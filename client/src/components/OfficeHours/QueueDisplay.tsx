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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as ClockIcon,
  Chat as ChatIcon,
  School as SchoolIcon
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
import { useNavigate } from 'react-router-dom';
import { useOfficeHoursSocket } from '../../hooks/useOfficeHoursSocket.js';
import UserPresenceBadge from '../Presence/UserPresenceBadge';
import { presenceApi } from '../../services/presenceApi';
import { socketService } from '../../services/socketService';
import type { PresenceStatus } from '../../types/presence';
import { useResponsive } from '../Responsive';

interface QueueDisplayProps {
  instructorId: string;
  isInstructor: boolean;
  onQueueUpdate?: () => void;
}

const QueueDisplay: React.FC<QueueDisplayProps> = ({ instructorId, isInstructor, onQueueUpdate }) => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, admitted: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});
  const [, setCurrentTime] = useState(Date.now());
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingEntryId, setCompletingEntryId] = useState<string | null>(null);
  const [instructorNotes, setInstructorNotes] = useState('');

  // Listen for real-time queue updates
  useOfficeHoursSocket({
    instructorId: isInstructor ? instructorId : null,
    joinLobby: false,          // OfficeHoursPage's hook owns the lobby
    joinInstructorRoom: false, // OfficeHoursPage's hook already joined this room
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

  // Update relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

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
      await officeHoursApi.completeSession(queueId, instructorNotes || undefined);
      toast.success('Session completed successfully');
      setCompleteDialogOpen(false);
      setCompletingEntryId(null);
      setInstructorNotes('');
      loadQueue();
      onQueueUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActioningId(null);
    }
  };

  const openCompleteDialog = (queueId: string) => {
    setCompletingEntryId(queueId);
    setInstructorNotes('');
    setCompleteDialogOpen(true);
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
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
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
          {(stats.completedToday ?? 0) > 0 && (
            <Chip
              label={`${stats.completedToday} Completed Today`}
              color="success"
              icon={<CheckIcon />}
            />
          )}
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
              <CardContent sx={{ px: { xs: 1.5, sm: 2 } }}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} gap={{ xs: 1.5, sm: 0 }}>
                  {/* Student Info */}
                  <Box display="flex" gap={{ xs: 1.5, sm: 2 }} flex={1} minWidth={0}>
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

                      {/* Course & Lesson context */}
                      {(entry.CourseName || entry.LessonTitle) && (
                        <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <SchoolIcon fontSize="small" color="primary" />
                          {entry.CourseName && (
                            <Typography variant="body2" color="primary" fontWeight="medium">
                              {entry.CourseName}
                            </Typography>
                          )}
                          {entry.LessonTitle && (
                            <Typography variant="body2" color="text.secondary">
                              — {entry.LessonTitle}
                            </Typography>
                          )}
                        </Stack>
                      )}
                      
                      {entry.Question && (
                        <Box mt={1} p={1} bgcolor="grey.100" borderRadius={1}>
                          <Typography variant="body2" fontStyle="italic">
                            "{entry.Question}"
                          </Typography>
                        </Box>
                      )}

                      <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" useFlexGap>
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
                  <Box textAlign={{ xs: 'left', sm: 'right' }} display="flex" flexDirection={{ xs: 'row', sm: 'column' }} alignItems={{ xs: 'center', sm: 'flex-end' }} gap={1} flexWrap="wrap">
                    <Chip
                      label={getQueueStatusLabel(entry.Status as QueueStatus)}
                      color={getQueueStatusColor(entry.Status as QueueStatus)}
                      size="small"
                      sx={{ mb: { xs: 0, sm: 2 } }}
                    />

                    {isInstructor && (
                      <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
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
                          <>
                            {entry.ChatRoomId && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ChatIcon />}
                                onClick={() => navigate('/chat', { state: { roomId: entry.ChatRoomId } })}
                                data-testid="queue-open-chat-button"
                              >
                                Open Chat
                              </Button>
                            )}
                            {entry.MeetingUrl && (
                              <Button
                                size="small"
                                variant="outlined"
                                href={entry.MeetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Join Meeting
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => openCompleteDialog(entry.Id)}
                              disabled={actioningId === entry.Id}
                              data-testid="queue-complete-button"
                            >
                              Complete
                            </Button>
                          </>
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

      {/* Complete Session Dialog with Notes */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Complete Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add optional notes about this session for your records.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Session Notes (Optional)"
            placeholder="Topics discussed, follow-up items, student progress..."
            value={instructorNotes}
            onChange={(e) => setInstructorNotes(e.target.value)}
            data-testid="complete-session-notes"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => completingEntryId && handleCompleteSession(completingEntryId)}
            disabled={actioningId !== null}
          >
            {actioningId ? <CircularProgress size={24} /> : 'Complete Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QueueDisplay;
