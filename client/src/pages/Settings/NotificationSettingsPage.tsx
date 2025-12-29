import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { HeaderV4 } from '../../components/Navigation/HeaderV4';
import { toast } from 'react-hot-toast';
import * as notificationPreferencesApi from '../../services/notificationPreferencesApi';

interface NotificationPreferences {
  UserId: string;
  // Global toggles
  EnableInAppNotifications: boolean;
  EnableEmailNotifications: boolean;
  EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  QuietHoursStart: string | null;
  QuietHoursEnd: string | null;
  
  // Category toggles
  EnableProgressUpdates: boolean;
  EnableCourseUpdates: boolean;
  EnableAssessmentUpdates: boolean;
  EnableCommunityUpdates: boolean;
  EnableSystemAlerts: boolean;
  
  // Progress Updates subcategories
  EnableLessonCompletion: boolean | null;
  EnableVideoCompletion: boolean | null;
  EnableCourseMilestones: boolean | null;
  EnableProgressSummary: boolean | null;
  EmailLessonCompletion: boolean | null;
  EmailVideoCompletion: boolean | null;
  EmailCourseMilestones: boolean | null;
  EmailProgressSummary: boolean | null;
  
  // Course Updates subcategories
  EnableCourseEnrollment: boolean | null;
  EnableNewLessons: boolean | null;
  EnableLiveSessions: boolean | null;
  EnableCoursePublished: boolean | null;
  EnableInstructorAnnouncements: boolean | null;
  EmailCourseEnrollment: boolean | null;
  EmailNewLessons: boolean | null;
  EmailLiveSessions: boolean | null;
  EmailCoursePublished: boolean | null;
  EmailInstructorAnnouncements: boolean | null;
  
  // Assessment Updates subcategories
  EnableAssessmentSubmitted: boolean | null;
  EnableAssessmentGraded: boolean | null;
  EnableNewAssessment: boolean | null;
  EnableAssessmentDue: boolean | null;
  EnableSubmissionToGrade: boolean | null;
  EmailAssessmentSubmitted: boolean | null;
  EmailAssessmentGraded: boolean | null;
  EmailNewAssessment: boolean | null;
  EmailAssessmentDue: boolean | null;
  EmailSubmissionToGrade: boolean | null;
  
  // Community Updates subcategories
  EnableComments: boolean | null;
  EnableReplies: boolean | null;
  EnableMentions: boolean | null;
  EnableGroupInvites: boolean | null;
  EnableOfficeHours: boolean | null;
  EmailComments: boolean | null;
  EmailReplies: boolean | null;
  EmailMentions: boolean | null;
  EmailGroupInvites: boolean | null;
  EmailOfficeHours: boolean | null;
  
  // System Alerts subcategories
  EnablePaymentConfirmation: boolean | null;
  EnableRefundConfirmation: boolean | null;
  EnableCertificates: boolean | null;
  EnableSecurityAlerts: boolean | null;
  EnableProfileUpdates: boolean | null;
  EmailPaymentConfirmation: boolean | null;
  EmailRefundConfirmation: boolean | null;
  EmailCertificates: boolean | null;
  EmailSecurityAlerts: boolean | null;
  EmailProfileUpdates: boolean | null;
}

interface SubcategoryControl {
  name: string;
  label: string;
  inAppKey: keyof NotificationPreferences;
  emailKey: keyof NotificationPreferences;
  canDisable: boolean;
  description?: string;
}

const PROGRESS_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'lesson-completion',
    label: 'Lesson Completion',
    inAppKey: 'EnableLessonCompletion',
    emailKey: 'EmailLessonCompletion',
    canDisable: true,
    description: 'Notified when you complete a lesson'
  },
  {
    name: 'video-completion',
    label: 'Video Completion',
    inAppKey: 'EnableVideoCompletion',
    emailKey: 'EmailVideoCompletion',
    canDisable: true,
    description: 'Notified when you finish watching a video'
  },
  {
    name: 'course-milestones',
    label: 'Course Milestones',
    inAppKey: 'EnableCourseMilestones',
    emailKey: 'EmailCourseMilestones',
    canDisable: true,
    description: 'Notified at 25%, 50%, 75%, 100% completion'
  },
  {
    name: 'progress-summary',
    label: 'Weekly Progress Summary',
    inAppKey: 'EnableProgressSummary',
    emailKey: 'EmailProgressSummary',
    canDisable: true,
    description: 'Weekly summary of your learning progress'
  },
];

const COURSE_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'course-enrollment',
    label: 'Course Enrollment',
    inAppKey: 'EnableCourseEnrollment',
    emailKey: 'EmailCourseEnrollment',
    canDisable: true,
    description: 'Welcome message when you enroll in a course'
  },
  {
    name: 'new-lessons',
    label: 'New Lessons',
    inAppKey: 'EnableNewLessons',
    emailKey: 'EmailNewLessons',
    canDisable: true,
    description: 'Notified when new lessons are added'
  },
  {
    name: 'live-sessions',
    label: 'Live Sessions',
    inAppKey: 'EnableLiveSessions',
    emailKey: 'EmailLiveSessions',
    canDisable: true,
    description: 'Live session invitations and reminders'
  },
  {
    name: 'instructor-announcements',
    label: 'Instructor Announcements',
    inAppKey: 'EnableInstructorAnnouncements',
    emailKey: 'EmailInstructorAnnouncements',
    canDisable: true,
    description: 'Important updates from your instructors'
  },
];

const ASSESSMENT_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'assessment-graded',
    label: 'Assessment Graded',
    inAppKey: 'EnableAssessmentGraded',
    emailKey: 'EmailAssessmentGraded',
    canDisable: true,
    description: 'Notified when your work is graded'
  },
  {
    name: 'assessment-due',
    label: 'Due Date Reminders',
    inAppKey: 'EnableAssessmentDue',
    emailKey: 'EmailAssessmentDue',
    canDisable: true,
    description: 'Reminders 2 days before due date'
  },
  {
    name: 'new-assessment',
    label: 'New Assessment',
    inAppKey: 'EnableNewAssessment',
    emailKey: 'EmailNewAssessment',
    canDisable: true,
    description: 'Notified when new assessments are available'
  },
];

const COMMUNITY_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'mentions',
    label: 'Mentions',
    inAppKey: 'EnableMentions',
    emailKey: 'EmailMentions',
    canDisable: true,
    description: 'Someone mentioned you in a comment'
  },
  {
    name: 'replies',
    label: 'Replies to Comments',
    inAppKey: 'EnableReplies',
    emailKey: 'EmailReplies',
    canDisable: true,
    description: 'Replies to your comments'
  },
  {
    name: 'group-invites',
    label: 'Study Group Invites',
    inAppKey: 'EnableGroupInvites',
    emailKey: 'EmailGroupInvites',
    canDisable: true,
    description: 'Invited to join a study group'
  },
];

const SYSTEM_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'payment-confirmation',
    label: 'Payment Confirmation',
    inAppKey: 'EnablePaymentConfirmation',
    emailKey: 'EmailPaymentConfirmation',
    canDisable: true,
    description: 'Course purchase and payment receipts'
  },
  {
    name: 'certificates',
    label: 'Certificates Earned',
    inAppKey: 'EnableCertificates',
    emailKey: 'EmailCertificates',
    canDisable: true,
    description: 'Course completion certificates'
  },
  {
    name: 'security-alerts',
    label: 'Security Alerts',
    inAppKey: 'EnableSecurityAlerts',
    emailKey: 'EmailSecurityAlerts',
    canDisable: false, // Cannot disable security alerts
    description: 'Important account security notifications'
  },
];

const NotificationSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationPreferencesApi.default.getPreferences();
      
      // Normalize all null/undefined values to false for controlled inputs
      const normalizedPrefs: any = { ...prefs };
      Object.keys(normalizedPrefs).forEach(key => {
        // Skip UserId/userId and string fields (handle both PascalCase and camelCase)
        if (key === 'UserId' || key === 'userId' || key === 'EmailDigestFrequency' || key === 'QuietHoursStart' || key === 'QuietHoursEnd') {
          return;
        }
        
        const value = normalizedPrefs[key];
        if (typeof value === 'boolean' || value === null || value === undefined || typeof value === 'number') {
          if (value === null || value === undefined) {
            normalizedPrefs[key] = false;
          } else if (typeof value === 'number') {
            normalizedPrefs[key] = Boolean(value);
          }
        }
      });
      
      setPreferences(normalizedPrefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await notificationPreferencesApi.default.updatePreferences(preferences as any);
      toast.success('Notification settings saved!');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalToggle = (field: keyof NotificationPreferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => prev ? { ...prev, [field]: event.target.checked } : null);
  };

  const handleCategoryToggle = (field: keyof NotificationPreferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => prev ? { ...prev, [field]: event.target.checked } : null);
  };

  const handleSubcategoryToggle = (field: keyof NotificationPreferences) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferences(prev => prev ? { ...prev, [field]: event.target.checked } : null);
  };

  const handleDigestFrequencyChange = (event: any) => {
    setPreferences(prev => prev ? { ...prev, EmailDigestFrequency: event.target.value } : null);
  };

  const getToggleValue = (key: keyof NotificationPreferences): boolean => {
    if (!preferences) return false;
    const value = preferences[key];
    // Handle both boolean and number types (SQL BIT returns 0/1)
    if (value === null || value === undefined) return false;
    // Type-safe conversion to boolean
    return Boolean(value);
  };

  const getDigestFrequency = (): string => {
    if (!preferences || !preferences.EmailDigestFrequency) return 'daily';
    return preferences.EmailDigestFrequency;
  };

  if (loading || !preferences) {
    return (
      <>
        <HeaderV4 />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon fontSize="large" />
            Notification Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Control how and when you receive notifications
          </Typography>
        </Box>

        {/* Info Banner */}
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>How it works:</strong> Subcategories with no selection inherit from their category setting. 
            Explicitly turn ON or OFF to override.
          </Typography>
        </Alert>

        {/* Global Controls */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            🌐 Global Controls
          </Typography>
          
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={getToggleValue('EnableInAppNotifications')}
                  onChange={handleGlobalToggle('EnableInAppNotifications')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Enable In-App Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Show notifications in the bell icon
                  </Typography>
                </Box>
              }
            />

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={getToggleValue('EnableEmailNotifications')}
                  onChange={handleGlobalToggle('EnableEmailNotifications')}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Enable Email Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Send notifications to your email
                  </Typography>
                </Box>
              }
            />

            {preferences.EnableEmailNotifications && (
              <Box sx={{ pl: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Email Frequency</InputLabel>
                  <Select
                    value={getDigestFrequency()}
                    label="Email Frequency"
                    onChange={handleDigestFrequencyChange}
                  >
                    <MenuItem value="realtime">Realtime (immediate)</MenuItem>
                    <MenuItem value="daily">Daily Digest (8 AM)</MenuItem>
                    <MenuItem value="weekly">Weekly Digest (Monday 8 AM)</MenuItem>
                    <MenuItem value="none">None (in-app only)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Quiet Hours</strong> (notifications queued during this time)
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Coming soon: Set quiet hours
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Paper>

        {/* Category Sections */}
        <Stack spacing={2}>
          {/* Progress Updates */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableProgressUpdates')}
                  onChange={handleCategoryToggle('EnableProgressUpdates')}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">📊 Progress Updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lesson completions, milestones, progress summaries
                  </Typography>
                </Box>
                <Chip 
                  label={preferences.EnableProgressUpdates ? 'Enabled' : 'Disabled'} 
                  color={preferences.EnableProgressUpdates ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {PROGRESS_SUBCATEGORIES.map(sub => (
                  <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.inAppKey)} onChange={handleSubcategoryToggle(sub.inAppKey)} size="small" />}
                      label="In-App"
                      sx={{ minWidth: 100 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.emailKey)} onChange={handleSubcategoryToggle(sub.emailKey)} size="small" />}
                      label="Email"
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Course Updates */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableCourseUpdates')}
                  onChange={handleCategoryToggle('EnableCourseUpdates')}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">📚 Course Updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    New lessons, live sessions, course announcements
                  </Typography>
                </Box>
                <Chip 
                  label={preferences.EnableCourseUpdates ? 'Enabled' : 'Disabled'} 
                  color={preferences.EnableCourseUpdates ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {COURSE_SUBCATEGORIES.map(sub => (
                  <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.inAppKey)} onChange={handleSubcategoryToggle(sub.inAppKey)} size="small" />}
                      label="In-App"
                      sx={{ minWidth: 100 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.emailKey)} onChange={handleSubcategoryToggle(sub.emailKey)} size="small" />}
                      label="Email"
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Assessment Updates */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableAssessmentUpdates')}
                  onChange={handleCategoryToggle('EnableAssessmentUpdates')}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">📝 Assessment Updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Grading, due dates, new assessments
                  </Typography>
                </Box>
                <Chip 
                  label={preferences.EnableAssessmentUpdates ? 'Enabled' : 'Disabled'} 
                  color={preferences.EnableAssessmentUpdates ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {ASSESSMENT_SUBCATEGORIES.map(sub => (
                  <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.inAppKey)} onChange={handleSubcategoryToggle(sub.inAppKey)} size="small" />}
                      label="In-App"
                      sx={{ minWidth: 100 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.emailKey)} onChange={handleSubcategoryToggle(sub.emailKey)} size="small" />}
                      label="Email"
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Community Updates */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableCommunityUpdates')}
                  onChange={handleCategoryToggle('EnableCommunityUpdates')}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">👥 Community Updates</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Comments, mentions, study groups
                  </Typography>
                </Box>
                <Chip 
                  label={preferences.EnableCommunityUpdates ? 'Enabled' : 'Disabled'} 
                  color={preferences.EnableCommunityUpdates ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {COMMUNITY_SUBCATEGORIES.map(sub => (
                  <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                    </Box>
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.inAppKey)} onChange={handleSubcategoryToggle(sub.inAppKey)} size="small" />}
                      label="In-App"
                      sx={{ minWidth: 100 }}
                    />
                    <FormControlLabel
                      control={<Switch checked={getToggleValue(sub.emailKey)} onChange={handleSubcategoryToggle(sub.emailKey)} size="small" />}
                      label="Email"
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* System Alerts */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableSystemAlerts')}
                  onChange={handleCategoryToggle('EnableSystemAlerts')}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">⚙️ System Alerts</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Payments, certificates, security alerts
                  </Typography>
                </Box>
                <Chip 
                  label={preferences.EnableSystemAlerts ? 'Enabled' : 'Disabled'} 
                  color={preferences.EnableSystemAlerts ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {SYSTEM_SUBCATEGORIES.map(sub => (
                  <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={getToggleValue(sub.inAppKey)} 
                          onChange={handleSubcategoryToggle(sub.inAppKey)} 
                          disabled={!sub.canDisable}
                          size="small" 
                        />
                      }
                      label="In-App"
                      sx={{ minWidth: 100 }}
                    />
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={getToggleValue(sub.emailKey)} 
                          onChange={handleSubcategoryToggle(sub.emailKey)} 
                          disabled={!sub.canDisable}
                          size="small" 
                        />
                      }
                      label="Email"
                      sx={{ minWidth: 100 }}
                    />
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>

        {/* Save Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={savePreferences}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default NotificationSettingsPage;
