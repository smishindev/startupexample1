import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { instructorApi, InstructorCourse } from '../../services/instructorApi';

interface CourseSettingsEditorProps {
  course: InstructorCourse;
  onUpdate: () => void;
}

export const CourseSettingsEditor: React.FC<CourseSettingsEditorProps> = ({ course, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [availableCourses, setAvailableCourses] = useState<InstructorCourse[]>([]);
  const [prerequisites, setPrerequisites] = useState<string[]>(course.prerequisites || []);
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(course.learningOutcomes || []);
  const [newOutcome, setNewOutcome] = useState('');

  // Load instructor's published courses for prerequisites selection
  useEffect(() => {
    loadAvailableCourses();
  }, []);

  const loadAvailableCourses = async () => {
    try {
      const response = await instructorApi.getCourses('published', 1, 100);
      // Exclude current course from prerequisites
      setAvailableCourses(response.courses.filter(c => c.id !== course.id));
    } catch (error) {
      console.error('Failed to load available courses:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      await instructorApi.updateCourse(course.id, {
        prerequisites,
        learningOutcomes: learningOutcomes.filter(o => o.trim().length > 0)
      });

      toast.success('Course settings updated successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update course settings:', error);
      toast.error(error.response?.data?.error || 'Failed to update course settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOutcome = () => {
    if (newOutcome.trim().length > 0) {
      setLearningOutcomes([...learningOutcomes, newOutcome.trim()]);
      setNewOutcome('');
    }
  };

  const handleRemoveOutcome = (index: number) => {
    setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const hasChanges = () => {
    const originalPrereqs = course.prerequisites || [];
    const originalOutcomes = course.learningOutcomes || [];
    
    return JSON.stringify(prerequisites.sort()) !== JSON.stringify(originalPrereqs.sort()) ||
           JSON.stringify(learningOutcomes.sort()) !== JSON.stringify(originalOutcomes.sort());
  };

  const handleCancel = () => {
    setPrerequisites(course.prerequisites || []);
    setLearningOutcomes(course.learningOutcomes || []);
    setNewOutcome('');
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Course Prerequisites
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select courses that students must complete before enrolling in this course.
          Students will not be able to enroll until all prerequisites are completed.
        </Typography>

        <Autocomplete
          multiple
          options={availableCourses}
          getOptionLabel={(option) => option.title}
          value={availableCourses.filter(c => prerequisites.includes(c.id))}
          onChange={(_, newValue) => {
            setPrerequisites(newValue.map(c => c.id));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select prerequisite courses"
              placeholder="Search courses..."
              data-testid="course-settings-prerequisites-input"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  label={option.title}
                  {...tagProps}
                  data-testid={`course-settings-prerequisite-chip-${index}`}
                />
              );
            })
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          data-testid="course-settings-prerequisites-autocomplete"
        />

        {prerequisites.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Students must complete {prerequisites.length} course{prerequisites.length > 1 ? 's' : ''} before enrolling.
          </Alert>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Learning Outcomes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Define what students will be able to do after completing this course.
          These outcomes will be displayed on the course detail page.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Add learning outcome"
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOutcome();
              }
            }}
            placeholder="Students will be able to..."
            inputProps={{ maxLength: 200 }}
            helperText={`${newOutcome.length}/200 characters`}
            data-testid="course-settings-outcome-input"
          />
          <Button
            variant="contained"
            onClick={handleAddOutcome}
            disabled={newOutcome.trim().length === 0}
            startIcon={<AddIcon />}
            sx={{ minWidth: 100 }}
            data-testid="course-settings-add-outcome-button"
          >
            Add
          </Button>
        </Stack>

        {learningOutcomes.length === 0 ? (
          <Alert severity="info">
            No learning outcomes defined yet. Add outcomes to help students understand what they'll learn.
          </Alert>
        ) : (
          <List>
            {learningOutcomes.map((outcome, index) => (
              <React.Fragment key={index}>
                <ListItem data-testid={`course-settings-outcome-item-${index}`}>
                  <ListItemText
                    primary={outcome}
                    primaryTypographyProps={{
                      sx: { pr: 6 }
                    }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveOutcome(index)}
                      data-testid={`course-settings-remove-outcome-button-${index}`}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < learningOutcomes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={loading || !hasChanges()}
          startIcon={<CancelIcon />}
          data-testid="course-settings-cancel-button"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || !hasChanges()}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          data-testid="course-settings-save-button"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default CourseSettingsEditor;
