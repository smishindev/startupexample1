/**
 * Office Hours Schedule Management Component
 * Allows instructors to create, view, edit, and delete their office hours schedules
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as ClockIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { officeHoursApi } from '../../services/officeHoursApi';
import {
  OfficeHoursSchedule,
  CreateScheduleData,
  getDayName,
  formatTime
} from '../../types/officeHours';
import { useResponsive } from '../Responsive/useResponsive';

interface ScheduleManagementProps {
  instructorId: string;
  onScheduleUpdate?: () => void;
}

const ScheduleManagement: React.FC<ScheduleManagementProps> = ({ instructorId, onScheduleUpdate }) => {
  const [schedules, setSchedules] = useState<OfficeHoursSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<OfficeHoursSchedule | null>(null);
  const { isMobile } = useResponsive();
  const [formData, setFormData] = useState<CreateScheduleData>({
    dayOfWeek: 1, // Monday
    startTime: '14:00',
    endTime: '16:00'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [instructorId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await officeHoursApi.getInstructorSchedules(instructorId);
      setSchedules(data);
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule?: OfficeHoursSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      // Convert HH:mm:ss to HH:mm for input fields
      setFormData({
        dayOfWeek: schedule.DayOfWeek,
        startTime: schedule.StartTime.substring(0, 5), // HH:mm
        endTime: schedule.EndTime.substring(0, 5) // HH:mm
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '16:00'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSchedule(null);
    setFormData({
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '16:00'
    });
  };

  const handleSubmit = async () => {
    try {
      // Validate times
      if (formData.startTime >= formData.endTime) {
        toast.error('End time must be after start time');
        return;
      }

      setSubmitting(true);

      // Add seconds for API format (HH:mm:ss)
      const dataWithSeconds = {
        dayOfWeek: formData.dayOfWeek,
        startTime: `${formData.startTime}:00`,
        endTime: `${formData.endTime}:00`
      };

      if (editingSchedule) {
        // Update existing schedule
        await officeHoursApi.updateSchedule(editingSchedule.Id, dataWithSeconds);
        toast.success('Schedule updated successfully');
      } else {
        // Create new schedule
        await officeHoursApi.createSchedule(dataWithSeconds);
        toast.success('Schedule created successfully');
      }

      handleCloseDialog();
      loadSchedules();
      onScheduleUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await officeHoursApi.deleteSchedule(scheduleId);
      toast.success('Schedule deleted successfully');
      loadSchedules();
      onScheduleUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (schedule: OfficeHoursSchedule) => {
    try {
      await officeHoursApi.updateSchedule(schedule.Id, {
        isActive: !schedule.IsActive
      });
      toast.success(schedule.IsActive ? 'Schedule deactivated' : 'Schedule activated');
      loadSchedules();
      onScheduleUpdate?.();
    } catch (err: any) {
      toast.error(err.message);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight="bold">
          My Office Hours Schedule
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          data-testid="schedule-add-button"
        >
          Add Schedule
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Schedules Grid */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center" py={3}>
              No office hours scheduled yet. Click "Add Schedule" to create your first schedule.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {schedules.map((schedule) => (
            <Grid item xs={12} md={6} key={schedule.Id}>
              <Card sx={{ borderLeft: schedule.IsActive ? '4px solid #1976d2' : '4px solid #ccc' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {getDayName(schedule.DayOfWeek)}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ClockIcon fontSize="small" color="action" />
                        <Typography variant="body1">
                          {formatTime(schedule.StartTime)} - {formatTime(schedule.EndTime)}
                        </Typography>
                      </Stack>
                    </Box>
                    <Chip
                      label={schedule.IsActive ? 'Active' : 'Inactive'}
                      color={schedule.IsActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Box display="flex" gap={1} mt={2}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(schedule)}
                      data-testid="schedule-edit-button"
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color={schedule.IsActive ? 'warning' : 'success'}
                      onClick={() => handleToggleActive(schedule)}
                      data-testid="schedule-toggle-button"
                    >
                      {schedule.IsActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(schedule.Id)}
                      data-testid="schedule-delete-button"
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile} data-testid="schedule-dialog">
        <DialogTitle>
          {editingSchedule ? 'Edit Office Hours' : 'Add Office Hours'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Day of Week</InputLabel>
              <Select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                label="Day of Week"
                data-testid="schedule-day-select"
              >
                <MenuItem value={0}>Sunday</MenuItem>
                <MenuItem value={1}>Monday</MenuItem>
                <MenuItem value={2}>Tuesday</MenuItem>
                <MenuItem value={3}>Wednesday</MenuItem>
                <MenuItem value={4}>Thursday</MenuItem>
                <MenuItem value={5}>Friday</MenuItem>
                <MenuItem value={6}>Saturday</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              data-testid="schedule-start-time-input"
            />

            <TextField
              fullWidth
              margin="normal"
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              data-testid="schedule-end-time-input"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Students will be able to join your office hours queue during these times.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting} data-testid="schedule-dialog-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            data-testid="schedule-dialog-submit"
          >
            {submitting ? <CircularProgress size={24} /> : editingSchedule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleManagement;
