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
  Box,
  Typography,
  Autocomplete
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

  // Lazy loading state for courses
  const [displayedCourses, setDisplayedCourses] = useState<Course[]>([]);
  const [courseLoadCount, setCourseLoadCount] = useState(50);

  // Initialize displayed courses when modal opens or courses change
  React.useEffect(() => {
    if (open) {
      setDisplayedCourses(courses.slice(0, 50));
      setCourseLoadCount(50);
    }
  }, [open, courses]);

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

          {/* Course Selection - Autocomplete with lazy loading */}
          {courses.length > 0 && (
            <Autocomplete
              options={(() => {
                // Always include selected course in options
                const selectedCourse = courses.find(c => c.Id === formData.courseId);
                if (selectedCourse && !displayedCourses.find(c => c.Id === selectedCourse.Id)) {
                  return [selectedCourse, ...displayedCourses];
                }
                return displayedCourses;
              })()}
              getOptionLabel={(option) => option.Title}
              value={courses.find(c => c.Id === formData.courseId) || null}
              onChange={(_, newValue) => handleChange('courseId', newValue?.Id || '')}
              isOptionEqualToValue={(option, value) => option.Id === value.Id}
              disabled={isSubmitting}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Course (Optional)"
                  placeholder="Search courses..."
                  helperText={`${displayedCourses.length} of ${courses.length} courses loaded - type to search or scroll for more`}
                  data-testid="create-group-course-autocomplete-input"
                />
              )}
              renderOption={(props, option, state) => {
                const isLastItem = state.index === displayedCourses.length - 1;
                
                return (
                  <li 
                    {...props} 
                    key={option.Id}
                    ref={isLastItem ? (el) => {
                      if (el && courseLoadCount < courses.length) {
                        const observer = new IntersectionObserver((entries) => {
                          if (entries[0].isIntersecting) {
                            const newCount = Math.min(courseLoadCount + 12, courses.length);
                            setDisplayedCourses(courses.slice(0, newCount));
                            setCourseLoadCount(newCount);
                            observer.disconnect();
                          }
                        }, { threshold: 0.1 });
                        observer.observe(el);
                      }
                    } : undefined}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2">{option.Title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {option.Id}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              filterOptions={(options, { inputValue }) => {
                if (inputValue.trim()) {
                  return courses.filter(option =>
                    option.Title.toLowerCase().includes(inputValue.toLowerCase())
                  ).slice(0, 100);
                }
                return options;
              }}
              data-testid="create-group-course-select"
            />
          )}
          {courses.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No courses available. Link this group to a course later.
            </Typography>
          )}

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
