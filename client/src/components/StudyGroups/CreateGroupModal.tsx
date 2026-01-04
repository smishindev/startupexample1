/**
 * Create Study Group Modal Component
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { toast } from 'sonner';
import { createGroup } from '../../services/studyGroupsApi';
import type { CreateGroupData } from '../../types/studyGroup';

interface Course {
  Id: string;
  Title: string;
}

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courses: Course[];
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  open,
  onClose,
  onSuccess,
  courses
}) => {
  const [formData, setFormData] = useState<CreateGroupData>({
    name: '',
    description: '',
    courseId: '',
    maxMembers: 10
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof CreateGroupData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    }

    if (formData.maxMembers && (formData.maxMembers < 2 || formData.maxMembers > 100)) {
      newErrors.maxMembers = 'Max members must be between 2 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createGroup({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        courseId: formData.courseId || undefined,
        maxMembers: formData.maxMembers || undefined
      });

      toast.success('Study group created successfully!');
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating study group:', error);
      toast.error(error.message || 'Failed to create study group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        description: '',
        courseId: '',
        maxMembers: 10
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="create-group-modal"
    >
      <DialogTitle>Create Study Group</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Group Name */}
          <TextField
            label="Group Name"
            required
            fullWidth
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'Choose a descriptive name for your group'}
            disabled={isSubmitting}
            data-testid="create-group-name-input"
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            helperText="Optional: Describe the purpose of this study group"
            disabled={isSubmitting}
            data-testid="create-group-description-input"
          />

          {/* Course Selection */}
          <FormControl fullWidth>
            <InputLabel>Course (Optional)</InputLabel>
            <Select
              value={formData.courseId}
              onChange={(e) => handleChange('courseId', e.target.value)}
              label="Course (Optional)"
              disabled={isSubmitting}
              data-testid="create-group-course-select"
            >
              <MenuItem value="">
                <em>No specific course</em>
              </MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.Id} value={course.Id}>
                  {course.Title}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
              Link this group to a specific course
            </Typography>
          </FormControl>

          {/* Max Members */}
          <TextField
            label="Max Members"
            type="number"
            fullWidth
            value={formData.maxMembers || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleChange('maxMembers', value === '' ? undefined : parseInt(value));
            }}
            error={!!errors.maxMembers}
            helperText={errors.maxMembers || 'Maximum number of members (2-100, leave empty for unlimited)'}
            disabled={isSubmitting}
            data-testid="create-group-max-members-input"
            InputProps={{
              inputProps: { min: 2, max: 100 }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={isSubmitting}
          data-testid="create-group-cancel-button"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          data-testid="create-group-submit-button"
        >
          {isSubmitting ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
