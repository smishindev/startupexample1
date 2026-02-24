/**
 * EditSessionModal Component
 * Modal for instructors to edit existing live sessions
 * Phase 2 - Collaborative Features
 */

import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { updateSession, getSessionById } from '../../services/liveSessionsApi';
import type { UpdateSessionData } from '../../types/liveSession';
import { useResponsive } from '../Responsive/useResponsive';

interface EditSessionModalProps {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
  onSuccess: () => void;
  courses?: Array<{ Id: string; Title: string }>;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  open,
  sessionId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<UpdateSessionData>({
    title: '',
    description: '',
    scheduledAt: new Date().toISOString(),
    duration: 60,
    capacity: 50,
    streamUrl: '',
    materials: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const { isMobile } = useResponsive();

  // Fetch session data when modal opens
  useEffect(() => {
    if (open && sessionId) {
      fetchSession();
    }
  }, [open, sessionId]);

  const fetchSession = async () => {
    if (!sessionId) return;

    setFetching(true);
    setApiError('');
    
    try {
      const data = await getSessionById(sessionId);
      
      // Populate form with existing data
      setFormData({
        title: data.Title || '',
        description: data.Description || '',
        scheduledAt: data.ScheduledAt || new Date().toISOString(),
        duration: data.Duration || 60,
        capacity: data.Capacity || 50,
        streamUrl: data.StreamUrl || '',
        materials: data.Materials ? JSON.stringify(data.Materials) : '',
      });
    } catch (error: any) {
      setApiError(error.message || 'Failed to load session');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (field: keyof UpdateSessionData, value: any) => {
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

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (formData.duration !== undefined) {
      if (formData.duration < 15) {
        newErrors.duration = 'Duration must be at least 15 minutes';
      } else if (formData.duration > 480) {
        newErrors.duration = 'Duration cannot exceed 480 minutes (8 hours)';
      }
    }

    if (formData.capacity !== undefined) {
      if (formData.capacity < 1) {
        newErrors.capacity = 'Capacity must be at least 1';
      } else if (formData.capacity > 1000) {
        newErrors.capacity = 'Capacity cannot exceed 1000';
      }
    }

    if (formData.scheduledAt) {
      const scheduledDate = new Date(formData.scheduledAt);
      if (scheduledDate < new Date()) {
        newErrors.scheduledAt = 'Scheduled time must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!sessionId || !validate()) {
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      // Only send fields that have values
      const submitData: UpdateSessionData = {};
      
      if (formData.title?.trim()) submitData.title = formData.title.trim();
      if (formData.description !== undefined) submitData.description = formData.description.trim();
      if (formData.scheduledAt) submitData.scheduledAt = formData.scheduledAt;
      if (formData.duration !== undefined) submitData.duration = formData.duration;
      if (formData.capacity !== undefined) submitData.capacity = formData.capacity;
      if (formData.streamUrl !== undefined) submitData.streamUrl = formData.streamUrl.trim() || undefined;
      if (formData.materials !== undefined) submitData.materials = formData.materials.trim() || undefined;

      await updateSession(sessionId, submitData);
      
      toast.success('Session updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      setApiError(error.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !fetching) {
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
      fullScreen={isMobile}
      data-testid="edit-session-modal"
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>Edit Live Session</DialogTitle>
      
      <DialogContent dividers>
        {fetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
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
              data-testid="edit-session-title-input"
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
              data-testid="edit-session-description-input"
            />

            {/* Scheduled Time */}
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Scheduled Time"
                value={new Date(formData.scheduledAt || new Date().toISOString())}
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
                helperText={errors.duration || "15-480 minutes"}
                required
                fullWidth
                data-testid="edit-session-duration-input"
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
                data-testid="edit-session-capacity-input"
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
              data-testid="edit-session-stream-url-input"
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
              data-testid="edit-session-materials-input"
            />

            <Typography variant="caption" color="text.secondary">
              * Enrolled students will be notified of the changes
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading || fetching} data-testid="edit-session-cancel-button">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || fetching}
          startIcon={loading && <CircularProgress size={16} />}
          data-testid="edit-session-submit-button"
        >
          {loading ? 'Updating...' : 'Update Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
