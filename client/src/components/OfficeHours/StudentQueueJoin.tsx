/**
 * Student Queue Join Component
 * Allows students to join an instructor's office hours queue
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import {
  PersonAdd as JoinIcon,
  Cancel as LeaveIcon,
  AccessTime as ClockIcon,
  Chat as ChatIcon,
  OpenInNew as LinkIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { officeHoursApi } from '../../services/officeHoursApi';
import {
  OfficeHoursSchedule,
  MyQueueStatus,
  QueueStatus,
  getDayName,
  formatTime,
  getQueueStatusLabel,
  getQueueStatusColor
} from '../../types/officeHours';
import { useOfficeHoursSocket } from '../../hooks/useOfficeHoursSocket.js';

interface StudentQueueJoinProps {
  selectedInstructor?: string;
  onInstructorChange?: (instructorId: string) => void;
  onQueueJoined?: () => void;
}

const StudentQueueJoin: React.FC<StudentQueueJoinProps> = ({ 
  selectedInstructor: externalSelectedInstructor,
  onInstructorChange,
  onQueueJoined 
}) => {
  const navigate = useNavigate();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>(externalSelectedInstructor || '');
  const [schedules, setSchedules] = useState<OfficeHoursSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [myQueueStatus, setMyQueueStatus] = useState<MyQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync external instructor selection
  useEffect(() => {
    if (externalSelectedInstructor && externalSelectedInstructor !== selectedInstructor) {
      setSelectedInstructor(externalSelectedInstructor);
    }
  }, [externalSelectedInstructor]);

  // Handle instructor selection change
  const handleInstructorChange = (instructorId: string) => {
    setSelectedInstructor(instructorId);
    onInstructorChange?.(instructorId);
  };

  // Listen for real-time queue updates
  useOfficeHoursSocket({
    instructorId: selectedInstructor || null,
    joinLobby: false, // OfficeHoursPage's hook owns the lobby — don't double-join/leave
    // joinInstructorRoom stays true (default): students need to be in office-hours-{id}
    // to receive real-time queue-updated events. Page-level hook for students never
    // joins this room (instructorId=null), so StudentQueueJoin owns it safely.
    onQueueUpdated: () => {
      if (selectedInstructor) {
        loadSchedulesAndStatus();
      }
    },
    onAdmitted: () => {
      if (selectedInstructor) {
        loadSchedulesAndStatus();
      }
    },
    onCompleted: () => {
      if (selectedInstructor) {
        loadSchedulesAndStatus();
      }
    },
    onCancelled: () => {
      if (selectedInstructor) {
        loadSchedulesAndStatus();
      }
    }
  });

  useEffect(() => {
    loadInstructors();
  }, []);

  useEffect(() => {
    if (selectedInstructor) {
      loadSchedulesAndStatus();
      
      // Poll for schedule updates every 10 seconds when an instructor is selected
      const interval = setInterval(() => {
        loadSchedulesAndStatus();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [selectedInstructor]);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const data = await officeHoursApi.getEnrolledInstructors();
      setInstructors(data);
    } catch (err: any) {
      // Fallback to legacy endpoint
      try {
        const data = await officeHoursApi.getInstructors();
        setInstructors(data);
      } catch (err2: any) {
        setError(err2.message);
        toast.error('Failed to load instructors');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulesAndStatus = async () => {
    try {
      const [schedulesData, statusData] = await Promise.all([
        officeHoursApi.getInstructorSchedules(selectedInstructor),
        officeHoursApi.getMyQueueStatus(selectedInstructor)
      ]);
      // Filter to show only active schedules to students
      setSchedules(schedulesData.filter(s => s.IsActive));
      setMyQueueStatus(statusData);
    } catch (err: any) {
      console.error('Error loading schedules/status:', err);
    }
  };

  const handleJoinQueue = async () => {
    if (!selectedInstructor) {
      toast.error('Please select an instructor');
      return;
    }

    if (!selectedSchedule) {
      toast.error('Please select a schedule time slot');
      return;
    }

    try {
      setSubmitting(true);
      // Auto-derive courseId from the selected schedule
      const selectedScheduleObj = schedules.find(s => s.Id === selectedSchedule);
      const result = await officeHoursApi.joinQueue({
        instructorId: selectedInstructor,
        scheduleId: selectedSchedule,
        question: question.trim() || undefined,
        courseId: selectedScheduleObj?.CourseId || undefined
      });
      
      toast.success(`Joined queue at position ${result.position}`);
      setQuestion('');
      setSelectedSchedule('');
      loadSchedulesAndStatus();
      onQueueJoined?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!myQueueStatus?.queueEntry) return;

    if (!window.confirm('Are you sure you want to leave the queue?')) {
      return;
    }

    try {
      setSubmitting(true);
      await officeHoursApi.cancelQueueEntry(myQueueStatus.queueEntry.Id);
      toast.success('Left the queue');
      loadSchedulesAndStatus();
      onQueueJoined?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
      {/* Header */}
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Join Office Hours
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Instructor Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Select Instructor</InputLabel>
            <Select
              value={selectedInstructor}
              onChange={(e) => handleInstructorChange(e.target.value)}
              label="Select Instructor"
              data-testid="queue-instructor-select"
            >
              <MenuItem value="">
                <em>Choose an instructor</em>
              </MenuItem>
              {instructors.map((instructor) => (
                <MenuItem key={instructor.Id} value={instructor.Id}>
                  {instructor.FirstName} {instructor.LastName} ({instructor.Email || 'Email hidden'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Show Schedules */}
          {selectedInstructor && schedules.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Office Hours Schedule:
              </Typography>
              <Stack spacing={1}>
                {schedules.map((schedule) => (
                  <Box
                    key={schedule.Id}
                    display="flex"
                    alignItems="center"
                    gap={1}
                    p={1}
                    bgcolor="grey.50"
                    borderRadius={1}
                  >
                    <ClockIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2">
                        <strong>{getDayName(schedule.DayOfWeek)}:</strong>{' '}
                        {formatTime(schedule.StartTime)} - {formatTime(schedule.EndTime)}
                      </Typography>
                      {schedule.CourseName && (
                        <Typography variant="caption" color="primary">
                          {schedule.CourseName}
                        </Typography>
                      )}
                      {schedule.Description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {schedule.Description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {selectedInstructor && schedules.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This instructor has not set up office hours yet.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Queue Status */}
      {myQueueStatus?.inQueue && myQueueStatus.queueEntry && (
        <Card sx={{ mb: 3, borderLeft: '4px solid #ff9800' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              You're in the Queue
            </Typography>

            {/* Show which schedule they're waiting for */}
            {myQueueStatus.queueEntry.DayOfWeek !== undefined && (
              <Box p={2} bgcolor="info.light" borderRadius={1} mb={2}>
                <Typography variant="body2" fontWeight="bold" color="info.dark">
                  <ClockIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Waiting for: {getDayName(myQueueStatus.queueEntry.DayOfWeek)}{' '}
                  {myQueueStatus.queueEntry.StartTime && formatTime(myQueueStatus.queueEntry.StartTime)} - {' '}
                  {myQueueStatus.queueEntry.EndTime && formatTime(myQueueStatus.queueEntry.EndTime)}
                </Typography>
              </Box>
            )}

            <Stack direction="row" mb={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {myQueueStatus.queueEntry.Status === QueueStatus.Waiting && (
                <Chip
                  label={`Position: ${myQueueStatus.position}`}
                  color="warning"
                  icon={<ClockIcon />}
                />
              )}
              <Chip
                label={getQueueStatusLabel(myQueueStatus.queueEntry.Status)}
                color={getQueueStatusColor(myQueueStatus.queueEntry.Status)}
              />
            </Stack>
            
            {myQueueStatus.queueEntry.Question && (
              <Box p={2} bgcolor="grey.100" borderRadius={1} mb={2}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Your Question:
                </Typography>
                <Typography variant="body2">
                  {myQueueStatus.queueEntry.Question}
                </Typography>
              </Box>
            )}

            {myQueueStatus.queueEntry.Status === QueueStatus.Admitted && (
              <Alert severity="success" sx={{ mb: 2 }}>
                You have been admitted! The instructor is ready to help you.
              </Alert>
            )}

            {myQueueStatus.queueEntry.Status === QueueStatus.Admitted && (
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                {myQueueStatus.queueEntry.ChatRoomId && (
                  <Button
                    variant="contained"
                    startIcon={<ChatIcon />}
                    onClick={() => navigate('/chat', { state: { roomId: myQueueStatus.queueEntry!.ChatRoomId } })}
                    data-testid="queue-open-chat-button"
                  >
                    Open Chat with Instructor
                  </Button>
                )}
                {myQueueStatus.queueEntry.MeetingUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    href={myQueueStatus.queueEntry.MeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Meeting
                  </Button>
                )}
              </Stack>
            )}

            <Button
              variant="outlined"
              color="error"
              startIcon={<LeaveIcon />}
              onClick={handleLeaveQueue}
              disabled={submitting}
              fullWidth
              data-testid="queue-leave-button"
            >
              Leave Queue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Join Queue Form */}
      {selectedInstructor && schedules.length > 0 && !myQueueStatus?.inQueue && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Join the Queue
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Time Slot</InputLabel>
              <Select
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
                label="Select Time Slot"
                data-testid="queue-timeslot-select"
              >
                {schedules.map((schedule) => (
                  <MenuItem key={schedule.Id} value={schedule.Id}>
                    {getDayName(schedule.DayOfWeek)}: {formatTime(schedule.StartTime)} - {formatTime(schedule.EndTime)}
                    {schedule.CourseName ? ` (${schedule.CourseName})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Question or Topic (Optional)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you need help with? Include the lesson or topic for faster help."
              helperText="Let the instructor know what you'd like to discuss"
              sx={{ mb: 2 }}
              data-testid="queue-question-input"
            />

            <Button
              variant="contained"
              startIcon={<JoinIcon />}
              onClick={handleJoinQueue}
              disabled={submitting}
              fullWidth
              data-testid="queue-join-button"
            >
              {submitting ? <CircularProgress size={24} /> : 'Join Queue'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StudentQueueJoin;
