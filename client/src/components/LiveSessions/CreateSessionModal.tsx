/**
 * CreateSessionModal Component
 * Modal for instructors to create new live sessions
 * Phase 2 - Collaborative Features
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addHours } from 'date-fns';
import { toast } from 'sonner';
import { createSession } from '../../services/liveSessionsApi';
import type { CreateSessionData } from '../../types/liveSession';
import { CourseSelector } from '../Common/CourseSelector';

interface CreateSessionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courses?: Array<{ Id: string; Title: string }>;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  open,
  onClose,
  onSuccess,
  courses = [],
}) => {
  const [formData, setFormData] = useState<CreateSessionData>({
    title: '',
    description: '',
    courseId: '',
    scheduledAt: addHours(new Date(), 1).toISOString(),
    duration: 60,
    capacity: 50,
    streamUrl: '',
    materials: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const handleChange = (field: keyof CreateSessionData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    } else if (formData.duration > 480) {
      newErrors.duration = 'Duration cannot exceed 480 minutes (8 hours)';
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    } else if (formData.capacity > 1000) {
      newErrors.capacity = 'Capacity cannot exceed 1000';
    }

    const scheduledDate = new Date(formData.scheduledAt);
    if (scheduledDate < new Date()) {
      newErrors.scheduledAt = 'Scheduled time must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // Clean up data - send camelCase to match backend
      const submitData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || '',
        courseId: formData.courseId || null,
        scheduledAt: formData.scheduledAt,
        duration: formData.duration,
        capacity: formData.capacity,
        streamUrl: formData.streamUrl?.trim() || null,
        materials: formData.materials?.trim() || null,
      };

      await createSession(submitData);
      
      console.log('Session created successfully, showing toast...');
      toast.success('Live session created successfully!');
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        courseId: '',
        scheduledAt: addHours(new Date(), 1).toISOString(),
        duration: 60,
        capacity: 50,
        streamUrl: '',
        materials: '',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setApiError(error.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setErrors({});
      setApiError('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      data-testid="create-session-modal"
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>Create Live Session</DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {apiError && (
            <Alert severity="error" onClose={() => setApiError('')}>
              {apiError}
            </Alert>
          )}

          {/* Title */}
          <TextField
            label="Session Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            required
            fullWidth
            autoFocus
            data-testid="create-session-title-input"
          />

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
            placeholder="Describe what you'll cover in this session..."
            data-testid="create-session-description-input"
          />

          {/* Course Selection - Autocomplete with lazy loading (infinite scroll) */}
          {courses.length > 0 && (
            <CourseSelector
              courses={courses}
              value={formData.courseId}
              onChange={(id: string) => handleChange('courseId', id)}
              label="Course (Optional)"
              placeholder="Search courses..."
              testId="create-session-course-autocomplete"
              inputTestId="create-session-course-autocomplete-input"
            />
          )}

          {/* Scheduled Time */}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Scheduled Time"
              value={new Date(formData.scheduledAt)}
              onChange={(date) =>
                handleChange('scheduledAt', date?.toISOString() || new Date().toISOString())
              }
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !!errors.scheduledAt,
                  helperText: errors.scheduledAt,
                },
              }}
              minDateTime={new Date()}
            />
          </LocalizationProvider>

          {/* Duration and Capacity Row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="number"
              label="Duration (minutes)"
              value={formData.duration || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange('duration', value === '' ? 0 : parseInt(value));
              }}
              error={!!errors.duration}
              helperText={errors.duration || "15-480 minutes (15 min increments)"}
              required
              fullWidth
              data-testid="create-session-duration-input"
              InputProps={{
                inputProps: { min: 15, max: 480, step: 15 }
              }}
            />

            <TextField
              type="number"
              label="Max Capacity"
              value={formData.capacity || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange('capacity', value === '' ? 0 : parseInt(value));
              }}
              error={!!errors.capacity}
              helperText={errors.capacity || "1-1000 attendees"}
              required
              fullWidth
              data-testid="create-session-capacity-input"
              InputProps={{
                inputProps: { min: 1, max: 1000 }
              }}
            />
          </Box>

          {/* Stream URL */}
          <TextField
            label="Stream URL (Optional)"
            value={formData.streamUrl}
            onChange={(e) => handleChange('streamUrl', e.target.value)}
            fullWidth
            placeholder="https://zoom.us/j/... or meeting link"
            data-testid="create-session-stream-url-input"
          />

          {/* Materials */}
          <TextField
            label="Materials/Resources (Optional)"
            value={formData.materials}
            onChange={(e) => handleChange('materials', e.target.value)}
            multiline
            rows={2}
            fullWidth
            placeholder="Links to slides, documents, or other resources..."
            data-testid="create-session-materials-input"
          />

          <Typography variant="caption" color="text.secondary">
            * Students will receive notifications when the session starts
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading} data-testid="create-session-cancel-button">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
          data-testid="create-session-submit-button"
        >
          {loading ? 'Creating...' : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
