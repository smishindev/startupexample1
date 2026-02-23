import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
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
  InputAdornment,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { instructorApi, InstructorCourse } from '../../services/instructorApi';
import { CourseSelector } from '../Common/CourseSelector';
import type { CourseOption } from '../Common/CourseSelector';

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

  // Certificate Settings (Phase 3)
  const [certificateEnabled, setCertificateEnabled] = useState(course.certificateEnabled ?? true);
  const [certificateTitle, setCertificateTitle] = useState<string>(course.certificateTitle || '');
  const [certificateTemplate, setCertificateTemplate] = useState<string>(course.certificateTemplate || 'classic');

  // Advanced Visibility (Phase 4)
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>(course.visibility || 'public');
  const [previewToken, setPreviewToken] = useState<string | null>(course.previewToken || null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load instructor's published courses for prerequisites selection
  useEffect(() => {
    loadAvailableCourses();
  }, []);

  const loadAvailableCourses = async () => {
    try {
      const courses = await instructorApi.getCoursesForDropdown('published');
      // Exclude current course from prerequisites
      setAvailableCourses(courses.filter(c => c.id !== course.id));
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
        requiresApproval,
        certificateEnabled,
        certificateTitle: certificateTitle.trim() || null,
        certificateTemplate,
        visibility
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
    const originalCertEnabled = course.certificateEnabled ?? true;
    const originalCertTitle = course.certificateTitle || '';
    const originalCertTemplate = course.certificateTemplate || 'classic';
    
    const hasPrereqChanges = JSON.stringify(prerequisites.sort()) !== JSON.stringify(originalPrereqs.sort());
    const hasOutcomeChanges = JSON.stringify(learningOutcomes.sort()) !== JSON.stringify(originalOutcomes.sort());
    const hasMaxEnrollmentChanges = maxEnrollment !== originalMaxEnrollment;
    const hasOpenDateChanges = enrollmentOpenDate !== originalOpenDate;
    const hasCloseDateChanges = enrollmentCloseDate !== originalCloseDate;
    const hasApprovalChanges = requiresApproval !== originalApproval;
    const hasCertEnabledChanges = certificateEnabled !== originalCertEnabled;
    const hasCertTitleChanges = certificateTitle !== originalCertTitle;
    const hasCertTemplateChanges = certificateTemplate !== originalCertTemplate;
    const hasVisibilityChanges = visibility !== (course.visibility || 'public');
    
    const result = hasPrereqChanges || hasOutcomeChanges || hasMaxEnrollmentChanges || 
                   hasOpenDateChanges || hasCloseDateChanges || hasApprovalChanges ||
                   hasCertEnabledChanges || hasCertTitleChanges || hasCertTemplateChanges ||
                   hasVisibilityChanges;
    
    console.log('🔍 [CourseSettingsEditor] hasChanges check:', {
      result,
      current: { maxEnrollment, enrollmentOpenDate, enrollmentCloseDate, requiresApproval, certificateEnabled, certificateTitle, certificateTemplate, visibility },
      original: { originalMaxEnrollment, originalOpenDate, originalCloseDate, originalApproval, originalCertEnabled, originalCertTitle, originalCertTemplate },
      changes: { hasMaxEnrollmentChanges, hasOpenDateChanges, hasCloseDateChanges, hasApprovalChanges, hasCertEnabledChanges, hasCertTitleChanges, hasCertTemplateChanges, hasVisibilityChanges }
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
    setCertificateEnabled(course.certificateEnabled ?? true);
    setCertificateTitle(course.certificateTitle || '');
    setCertificateTemplate(course.certificateTemplate || 'classic');
    setVisibility(course.visibility || 'public');
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
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

        <CourseSelector
          multiple
          courses={availableCourses}
          value={prerequisites}
          onChange={(ids: string[]) => setPrerequisites(ids)}
          excludeIds={[course.id]}
          label="Select prerequisite courses"
          placeholder="Search courses..."
          testId="course-settings-prerequisites-autocomplete"
          inputTestId="course-settings-prerequisites-input"
          renderTag={(option: CourseOption, index: number, getTagProps: any) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={option.Title}
                {...tagProps}
                data-testid={`course-settings-prerequisite-chip-${index}`}
              />
            );
          }}
        />

        {prerequisites.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Students must complete {prerequisites.length} course{prerequisites.length > 1 ? 's' : ''} before enrolling.
          </Alert>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
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
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
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

      {/* Certificate Settings Section (Phase 3) */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Certificate Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure completion certificates for this course
        </Typography>

        {/* Enable/Disable Certificates */}
        <FormControlLabel
          control={
            <Switch
              checked={certificateEnabled}
              onChange={(e) => setCertificateEnabled(e.target.checked)}
              data-testid="course-settings-certificate-enabled-switch"
            />
          }
          label="Enable Certificates"
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mb: 3 }}>
          Students will receive a certificate when they complete this course
        </Typography>

        {/* Custom Certificate Title */}
        <TextField
          fullWidth
          label="Custom Certificate Title"
          value={certificateTitle}
          onChange={(e) => setCertificateTitle(e.target.value)}
          placeholder={course.title || 'Uses course title by default'}
          disabled={!certificateEnabled}
          inputProps={{ maxLength: 200 }}
          helperText={`${certificateTitle.length}/200 characters. Leave empty to use course title.`}
          InputProps={{
            endAdornment: certificateTitle ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setCertificateTitle('')} aria-label="Clear certificate title">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
          sx={{ mb: 3 }}
          data-testid="course-settings-certificate-title-input"
        />

        {/* Certificate Template Selection */}
        <FormControl disabled={!certificateEnabled} sx={{ mb: 2 }}>
          <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Certificate Template</FormLabel>
          <RadioGroup
            value={certificateTemplate}
            onChange={(e) => setCertificateTemplate(e.target.value)}
            data-testid="course-settings-certificate-template-radio"
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {[
                { value: 'classic', label: 'Classic', desc: 'Traditional academic style with blue/purple tones', color: '#667eea' },
                { value: 'modern', label: 'Modern', desc: 'Clean design with indigo gradient accents', color: '#6366f1' },
                { value: 'elegant', label: 'Elegant', desc: 'Ornate borders with warm gold/brown tones', color: '#92400e' },
                { value: 'minimal', label: 'Minimal', desc: 'Simple and clean monochrome design', color: '#18181b' }
              ].map((tpl) => (
                <Paper
                  key={tpl.value}
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: certificateEnabled ? 'pointer' : 'default',
                    border: certificateTemplate === tpl.value ? `2px solid ${tpl.color}` : '1px solid',
                    borderColor: certificateTemplate === tpl.value ? tpl.color : 'divider',
                    bgcolor: certificateTemplate === tpl.value ? `${tpl.color}08` : 'background.paper',
                    opacity: certificateEnabled ? 1 : 0.5,
                    transition: 'all 0.2s',
                    '&:hover': certificateEnabled ? { borderColor: tpl.color, bgcolor: `${tpl.color}05` } : {}
                  }}
                  onClick={() => certificateEnabled && setCertificateTemplate(tpl.value)}
                  data-testid={`course-settings-certificate-template-${tpl.value}`}
                >
                  <FormControlLabel
                    value={tpl.value}
                    control={<Radio size="small" sx={{ '&.Mui-checked': { color: tpl.color } }} />}
                    label={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">{tpl.label}</Typography>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: tpl.color }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {tpl.desc}
                        </Typography>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Paper>
              ))}
            </Box>
          </RadioGroup>
        </FormControl>

        {/* Visual Summary */}
        {certificateEnabled && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">Certificate Configuration:</Typography>
            <ul style={{ marginTop: 8, paddingLeft: 20, marginBottom: 0 }}>
              <li>Title: {certificateTitle.trim() || course.title || '(Course title)'}</li>
              <li>Template: {certificateTemplate.charAt(0).toUpperCase() + certificateTemplate.slice(1)}</li>
            </ul>
          </Alert>
        )}

        {!certificateEnabled && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Certificates are disabled. Students will not receive a certificate upon completing this course.
          </Alert>
        )}
      </Paper>

      {/* Advanced Visibility Section (Phase 4) */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Advanced Visibility
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Control how your course appears in the catalog and who can access it
        </Typography>

        {/* Course Visibility */}
        <FormControl sx={{ mb: 3 }}>
          <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Course Visibility</FormLabel>
          <RadioGroup
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'unlisted')}
            data-testid="course-settings-visibility-radio"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: visibility === 'public' ? '2px solid' : '1px solid',
                  borderColor: visibility === 'public' ? 'primary.main' : 'divider',
                  bgcolor: visibility === 'public' ? 'primary.50' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => setVisibility('public')}
                data-testid="course-settings-visibility-public"
              >
                <FormControlLabel
                  value="public"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2">Public</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Course appears in the catalog and search results. Anyone can find and enroll.
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: visibility === 'unlisted' ? '2px solid' : '1px solid',
                  borderColor: visibility === 'unlisted' ? 'warning.main' : 'divider',
                  bgcolor: visibility === 'unlisted' ? 'warning.50' : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'warning.main' }
                }}
                onClick={() => setVisibility('unlisted')}
                data-testid="course-settings-visibility-unlisted"
              >
                <FormControlLabel
                  value="unlisted"
                  control={<Radio size="small" color="warning" />}
                  label={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityOffIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2">Unlisted</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Course is hidden from the catalog but accessible via direct link. Share the URL with specific students.
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, width: '100%' }}
                />
              </Paper>
            </Box>
          </RadioGroup>
        </FormControl>

        {visibility === 'unlisted' && course.status === 'published' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This published course is unlisted. Students can only access it via direct link:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={`${window.location.origin}/courses/${course.id}`}
                InputProps={{ readOnly: true }}
                sx={{ bgcolor: 'background.paper' }}
              />
              <IconButton
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/courses/${course.id}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success('Direct link copied!');
                }}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Alert>
        )}

        {/* Preview Link for Draft Courses */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Preview Link
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Generate a shareable preview link so others can view this course even if it{"'s"} not published yet. Anyone with this link can see the course details.
        </Typography>

        {previewToken ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LinkIcon fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight={500}>Active preview link:</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={`${window.location.origin}/courses/${course.id}/preview/${previewToken}`}
                InputProps={{ readOnly: true }}
                sx={{ bgcolor: 'action.hover' }}
                data-testid="course-settings-preview-link"
              />
              <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/courses/${course.id}/preview/${previewToken}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast.success('Preview link copied!');
                  }}
                  data-testid="course-settings-copy-preview-link"
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Generate new link (old link will stop working)">
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      setGeneratingToken(true);
                      const result = await instructorApi.generatePreviewToken(course.id);
                      setPreviewToken(result.previewToken);
                      toast.success('New preview link generated');
                    } catch {
                      toast.error('Failed to generate preview link');
                    } finally {
                      setGeneratingToken(false);
                    }
                  }}
                  disabled={generatingToken}
                  data-testid="course-settings-regenerate-preview-token"
                >
                  {generatingToken ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={generatingToken ? <CircularProgress size={18} /> : <LinkIcon />}
            onClick={async () => {
              try {
                setGeneratingToken(true);
                const result = await instructorApi.generatePreviewToken(course.id);
                setPreviewToken(result.previewToken);
                toast.success('Preview link generated!');
              } catch {
                toast.error('Failed to generate preview link');
              } finally {
                setGeneratingToken(false);
              }
            }}
            disabled={generatingToken}
            data-testid="course-settings-generate-preview-token"
          >
            {generatingToken ? 'Generating...' : 'Generate Preview Link'}
          </Button>
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
