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
  AccessTime as ClockIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { officeHoursApi } from '../../services/officeHoursApi';
import {
  OfficeHoursSchedule,
  MyQueueStatus,
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
      const data = await officeHoursApi.getInstructors();
      setInstructors(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load instructors');
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
      const result = await officeHoursApi.joinQueue({
        instructorId: selectedInstructor,
        scheduleId: selectedSchedule,
        question: question.trim() || undefined
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
            >
              <MenuItem value="">
                <em>Choose an instructor</em>
              </MenuItem>
              {instructors.map((instructor) => (
                <MenuItem key={instructor.Id} value={instructor.Id}>
                  {instructor.FirstName} {instructor.LastName} ({instructor.Email})
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
                    <Typography variant="body2">
                      <strong>{getDayName(schedule.DayOfWeek)}:</strong>{' '}
                      {formatTime(schedule.StartTime)} - {formatTime(schedule.EndTime)}
                    </Typography>
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

            <Stack direction="row" spacing={2} mb={2}>
              {myQueueStatus.queueEntry.Status === 'waiting' && (
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

            {myQueueStatus.queueEntry.Status === 'admitted' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                You have been admitted! The instructor is ready to help you.
              </Alert>
            )}

            <Button
              variant="outlined"
              color="error"
              startIcon={<LeaveIcon />}
              onClick={handleLeaveQueue}
              disabled={submitting}
              fullWidth
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
              >
                {schedules.map((schedule) => (
                  <MenuItem key={schedule.Id} value={schedule.Id}>
                    {getDayName(schedule.DayOfWeek)}: {formatTime(schedule.StartTime)} - {formatTime(schedule.EndTime)}
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
              placeholder="What do you need help with?"
              helperText="Let the instructor know what you'd like to discuss"
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              startIcon={<JoinIcon />}
              onClick={handleJoinQueue}
              disabled={submitting}
              fullWidth
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
