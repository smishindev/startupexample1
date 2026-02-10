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
  Stack,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Clear as ClearIcon
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
  
  // Enrollment Controls (Phase 2)
  const [maxEnrollment, setMaxEnrollment] = useState<number | null>(course.maxEnrollment ?? null);
  const [enrollmentOpenDate, setEnrollmentOpenDate] = useState<string>(
    course.enrollmentOpenDate ? new Date(course.enrollmentOpenDate).toISOString().slice(0, 16) : ''
  );
  const [enrollmentCloseDate, setEnrollmentCloseDate] = useState<string>(
    course.enrollmentCloseDate ? new Date(course.enrollmentCloseDate).toISOString().slice(0, 16) : ''
  );
  const [requiresApproval, setRequiresApproval] = useState(course.requiresApproval ?? false);

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
      
      console.log('💾 [CourseSettingsEditor] Saving with values:', {
        maxEnrollment,
        enrollmentOpenDate,
        enrollmentCloseDate,
        requiresApproval,
        prerequisites,
        learningOutcomes
      });
      
      await instructorApi.updateCourse(course.id, {
        prerequisites,
        learningOutcomes: learningOutcomes.filter(o => o.trim().length > 0),
        maxEnrollment,
        enrollmentOpenDate: enrollmentOpenDate ? new Date(enrollmentOpenDate).toISOString() : null,
        enrollmentCloseDate: enrollmentCloseDate ? new Date(enrollmentCloseDate).toISOString() : null,
        requiresApproval
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
    const originalMaxEnrollment = course.maxEnrollment ?? null;
    const originalOpenDate = course.enrollmentOpenDate ? new Date(course.enrollmentOpenDate).toISOString().slice(0, 16) : '';
    const originalCloseDate = course.enrollmentCloseDate ? new Date(course.enrollmentCloseDate).toISOString().slice(0, 16) : '';
    const originalApproval = course.requiresApproval ?? false;
    
    const hasPrereqChanges = JSON.stringify(prerequisites.sort()) !== JSON.stringify(originalPrereqs.sort());
    const hasOutcomeChanges = JSON.stringify(learningOutcomes.sort()) !== JSON.stringify(originalOutcomes.sort());
    const hasMaxEnrollmentChanges = maxEnrollment !== originalMaxEnrollment;
    const hasOpenDateChanges = enrollmentOpenDate !== originalOpenDate;
    const hasCloseDateChanges = enrollmentCloseDate !== originalCloseDate;
    const hasApprovalChanges = requiresApproval !== originalApproval;
    
    const result = hasPrereqChanges || hasOutcomeChanges || hasMaxEnrollmentChanges || 
                   hasOpenDateChanges || hasCloseDateChanges || hasApprovalChanges;
    
    console.log('🔍 [CourseSettingsEditor] hasChanges check:', {
      result,
      current: { maxEnrollment, enrollmentOpenDate, enrollmentCloseDate, requiresApproval },
      original: { originalMaxEnrollment, originalOpenDate, originalCloseDate, originalApproval },
      changes: { hasMaxEnrollmentChanges, hasOpenDateChanges, hasCloseDateChanges, hasApprovalChanges }
    });
    
    return result;
  };

  const handleCancel = () => {
    setPrerequisites(course.prerequisites || []);
    setLearningOutcomes(course.learningOutcomes || []);
    setNewOutcome('');
    setMaxEnrollment(course.maxEnrollment ?? null);
    setEnrollmentOpenDate(course.enrollmentOpenDate ? new Date(course.enrollmentOpenDate).toISOString().slice(0, 16) : '');
    setEnrollmentCloseDate(course.enrollmentCloseDate ? new Date(course.enrollmentCloseDate).toISOString().slice(0, 16) : '');
    setRequiresApproval(course.requiresApproval ?? false);
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Course Prerequisites
          </Typography>
          <Button
            size="small"
            color="error"
            disabled={prerequisites.length === 0}
            startIcon={<ClearIcon />}
            onClick={() => setPrerequisites([])}
            data-testid="course-settings-clear-prerequisites-button"
          >
            Clear All
          </Button>
        </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            Learning Outcomes
          </Typography>
          <Button
            size="small"
            color="error"
            disabled={learningOutcomes.length === 0}
            startIcon={<ClearIcon />}
            onClick={() => setLearningOutcomes([])}
            data-testid="course-settings-clear-outcomes-button"
          >
            Clear All
          </Button>
        </Box>
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
            size="small"
            onClick={handleAddOutcome}
            disabled={newOutcome.trim().length === 0}
            startIcon={<AddIcon />}
            sx={{ minWidth: 80, height: 55, alignSelf: 'flex-start', mt: 1 }}
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

      {/* Enrollment Controls Section (Phase 2) */}
      <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enrollment Controls
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage how students can enroll in your course
        </Typography>

        {/* Max Enrollment */}
        <TextField
          fullWidth
          label="Maximum Enrollment"
          type="number"
          value={maxEnrollment ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            setMaxEnrollment(val === '' ? null : parseInt(val, 10));
          }}
          helperText="Leave empty for unlimited enrollment"
          InputProps={{
            inputProps: { min: 1 },
            endAdornment: maxEnrollment != null ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setMaxEnrollment(null)} aria-label="Clear max enrollment">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
          sx={{ mb: 3 }}
          data-testid="course-settings-max-enrollment-input"
        />

        {/* Enrollment Date Range */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Enrollment Open Date"
            type="datetime-local"
            value={enrollmentOpenDate}
            onChange={(e) => setEnrollmentOpenDate(e.target.value)}
            helperText="Leave empty for immediate enrollment"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: enrollmentOpenDate ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setEnrollmentOpenDate('')} aria-label="Clear open date">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }}
            data-testid="course-settings-enrollment-open-date"
          />
          
          <TextField
            fullWidth
            label="Enrollment Close Date"
            type="datetime-local"
            value={enrollmentCloseDate}
            onChange={(e) => setEnrollmentCloseDate(e.target.value)}
            helperText="Leave empty for no deadline"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: enrollmentCloseDate ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setEnrollmentCloseDate('')} aria-label="Clear close date">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }}
            data-testid="course-settings-enrollment-close-date"
          />
        </Stack>

        {/* Requires Approval */}
        <FormControlLabel
          control={
            <Switch
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              data-testid="course-settings-requires-approval-switch"
            />
          }
          label="Require Manual Approval"
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 3 }}>
          Students must wait for your approval before accessing the course
        </Typography>

        {/* Visual Summary */}
        {(maxEnrollment || enrollmentOpenDate || enrollmentCloseDate || requiresApproval) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">Active Enrollment Controls:</Typography>
            <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
              {maxEnrollment && <li>Maximum {maxEnrollment} students</li>}
              {enrollmentOpenDate && <li>Opens: {new Date(enrollmentOpenDate).toLocaleString()}</li>}
              {enrollmentCloseDate && <li>Closes: {new Date(enrollmentCloseDate).toLocaleString()}</li>}
              {requiresApproval && <li>Manual approval required</li>}
            </ul>
          </Alert>
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
