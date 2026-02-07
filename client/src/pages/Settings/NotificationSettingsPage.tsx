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
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';
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
  EnableCourseCompletion: boolean | null;
  EnableProgressSummary: boolean | null;
  EmailLessonCompletion: boolean | null;
  EmailVideoCompletion: boolean | null;
  EmailCourseMilestones: boolean | null;
  EmailCourseCompletion: boolean | null;
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
  EnableDirectMessages: boolean | null;
  EnableGroupInvites: boolean | null;
  EnableGroupActivity: boolean | null;
  EnableOfficeHours: boolean | null;
  EmailComments: boolean | null;
  EmailReplies: boolean | null;
  EmailMentions: boolean | null;
  EmailDirectMessages: boolean | null;
  EmailGroupInvites: boolean | null;
  EmailGroupActivity: boolean | null;
  EmailOfficeHours: boolean | null;
  
  // Learning subcategories
  EnableAITutoring: boolean | null;
  EmailAITutoring: boolean | null;
  
  // System Alerts subcategories
  EnablePaymentConfirmation: boolean | null;
  EnablePaymentReceipt: boolean | null;
  EnableRefundConfirmation: boolean | null;
  EnableCertificates: boolean | null;
  EnableSecurityAlerts: boolean | null;
  EnableProfileUpdates: boolean | null;
  EnableRiskAlerts: boolean | null;
  EmailPaymentConfirmation: boolean | null;
  EmailPaymentReceipt: boolean | null;
  EmailRefundConfirmation: boolean | null;
  EmailCertificates: boolean | null;
  EmailSecurityAlerts: boolean | null;
  EmailProfileUpdates: boolean | null;
  EmailRiskAlerts: boolean | null;
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
    description: 'Notified at 25%, 50%, 75% completion'
  },
  {
    name: 'course-completion',
    label: 'Course Completion',
    inAppKey: 'EnableCourseCompletion',
    emailKey: 'EmailCourseCompletion',
    canDisable: true,
    description: 'Congratulations when you complete a course (100%)'
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
    name: 'comments',
    label: 'New Comments',
    inAppKey: 'EnableComments',
    emailKey: 'EmailComments',
    canDisable: true,
    description: 'New comments on courses/lessons you\'re enrolled in'
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
    name: 'mentions',
    label: 'Mentions',
    inAppKey: 'EnableMentions',
    emailKey: 'EmailMentions',
    canDisable: true,
    description: 'Someone mentioned you in a comment'
  },
  {
    name: 'direct-messages',
    label: 'Direct Messages',
    inAppKey: 'EnableDirectMessages',
    emailKey: 'EmailDirectMessages',
    canDisable: true,
    description: 'New direct messages from other users'
  },
  {
    name: 'group-invites',
    label: 'Study Group Invites',
    inAppKey: 'EnableGroupInvites',
    emailKey: 'EmailGroupInvites',
    canDisable: true,
    description: 'Invited to join a study group'
  },
  {
    name: 'group-activity',
    label: 'Study Group Activity',
    inAppKey: 'EnableGroupActivity',
    emailKey: 'EmailGroupActivity',
    canDisable: true,
    description: 'New members join your study groups'
  },
  {
    name: 'office-hours',
    label: 'Office Hours',
    inAppKey: 'EnableOfficeHours',
    emailKey: 'EmailOfficeHours',
    canDisable: true,
    description: 'Office hours queue and session updates'
  },
  {
    name: 'ai-tutoring',
    label: 'AI Tutor Responses',
    inAppKey: 'EnableAITutoring',
    emailKey: 'EmailAITutoring',
    canDisable: true,
    description: 'AI tutor answered your questions'
  },
];

const SYSTEM_SUBCATEGORIES: SubcategoryControl[] = [
  {
    name: 'payment-confirmation',
    label: 'Payment Confirmation',
    inAppKey: 'EnablePaymentConfirmation',
    emailKey: 'EmailPaymentConfirmation',
    canDisable: true,
    description: 'Initial purchase confirmation notifications'
  },
  {
    name: 'payment-receipt',
    label: 'Payment Receipt',
    inAppKey: 'EnablePaymentReceipt',
    emailKey: 'EmailPaymentReceipt',
    canDisable: true,
    description: 'Payment processed receipts with transaction details'
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
    description: 'Password changes, account deletions, suspicious activity'
  },
  {
    name: 'risk-alerts',
    label: 'At-Risk Student Alerts',
    inAppKey: 'EnableRiskAlerts',
    emailKey: 'EmailRiskAlerts',
    canDisable: true,
    description: 'Weekly alerts for students who may need intervention (Instructors only)'
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
      
      // Normalize data but PRESERVE NULL for subcategories (inheritance)
      const normalizedPrefs: any = { ...prefs };
      
      // List of category and global fields that should never be NULL (convert to false if needed)
      const requiredBooleanFields = [
        'EnableInAppNotifications',
        'EnableEmailNotifications',
        'EnableProgressUpdates',
        'EnableCourseUpdates',
        'EnableAssessmentUpdates',
        'EnableCommunityUpdates',
        'EnableSystemAlerts'
      ];
      
      Object.keys(normalizedPrefs).forEach(key => {
        // Skip non-boolean fields
        if (key === 'UserId' || key === 'userId' || key === 'EmailDigestFrequency' || key === 'QuietHoursStart' || key === 'QuietHoursEnd') {
          return;
        }
        
        const value = normalizedPrefs[key];
        
        // Only normalize required fields (global/category) - subcategories keep NULL
        if (requiredBooleanFields.includes(key)) {
          if (value === null || value === undefined) {
            normalizedPrefs[key] = false;
          } else if (typeof value === 'number') {
            normalizedPrefs[key] = Boolean(value);
          }
        } else {
          // Subcategories: preserve NULL, convert numbers to boolean, keep false
          if (typeof value === 'number') {
            normalizedPrefs[key] = value === 1 ? true : value === 0 ? false : null;
          }
          // Keep null/undefined as null for inheritance
          if (value === undefined) {
            normalizedPrefs[key] = null;
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
    setPreferences(prev => {
      if (!prev) return null;
      
      // Shift+Click: Set to Inherit (null), Normal click: Toggle between true/false
      let newValue: boolean | null;
      
      if (event.nativeEvent && (event.nativeEvent as MouseEvent).shiftKey) {
        // Shift+Click: Set to Inherit (null)
        newValue = null;
      } else {
        // Normal click: Toggle between true/false
        newValue = event.target.checked;
      }
      
      return { ...prev, [field]: newValue };
    });
  };

  const handleDigestFrequencyChange = (event: any) => {
    setPreferences(prev => prev ? { ...prev, EmailDigestFrequency: event.target.value } : null);
  };

  const getToggleValue = (key: keyof NotificationPreferences, categoryKey?: keyof NotificationPreferences): boolean => {
    if (!preferences) return false;
    const value = preferences[key];
    
    // If value is explicitly set (true or false), use it
    if (value === true || value === false) {
      return Boolean(value);
    }
    
    // If value is NULL and categoryKey provided, inherit from category
    if (value === null && categoryKey && preferences[categoryKey] !== undefined) {
      return Boolean(preferences[categoryKey]);
    }
    
    // Default to false
    return false;
  };
  
  const getToggleState = (key: keyof NotificationPreferences): boolean | null => {
    if (!preferences) return false;
    const value = preferences[key];
    return value === null ? null : Boolean(value);
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
                  data-testid="notifications-settings-enable-in-app-switch"
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
                  data-testid="notifications-settings-enable-email-switch"
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
                    data-testid="notifications-settings-email-frequency-select"
                  >
                    <MenuItem value="realtime">Realtime (immediate)</MenuItem>
                    <MenuItem value="daily">Daily Digest (8 AM)</MenuItem>
                    <MenuItem value="weekly">Weekly Digest (Monday 8 AM)</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Toggle Email Notifications OFF above for in-app only
                  </Typography>
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
          <Accordion defaultExpanded data-testid="notifications-settings-category-progress-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="notifications-settings-category-progress-accordion-summary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableProgressUpdates')}
                  onChange={handleCategoryToggle('EnableProgressUpdates')}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="notifications-settings-category-progress-switch"
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
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Tip:</strong> Shift+Click a switch to set it to "Inherit" (follows category setting)
                  </Typography>
                </Alert>
                {PROGRESS_SUBCATEGORIES.map(sub => {
                  const inAppState = getToggleState(sub.inAppKey);
                  const emailState = getToggleState(sub.emailKey);
                  const categoryEnabled = preferences.EnableProgressUpdates;
                  
                  return (
                    <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                      </Box>
                      <Box sx={{ minWidth: 100 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={getToggleValue(sub.inAppKey, 'EnableProgressUpdates')} 
                              onChange={handleSubcategoryToggle(sub.inAppKey)} 
                              size="small"
                              sx={inAppState === null ? { opacity: 0.6 } : {}}
                              data-testid={`notifications-settings-progress-${sub.name}-inapp-switch`}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="caption">In-App</Typography>
                              {inAppState === null && (
                                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic' }}>
                                  (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </Box>
                      <Box sx={{ minWidth: 100 }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={getToggleValue(sub.emailKey, 'EnableProgressUpdates')} 
                              onChange={handleSubcategoryToggle(sub.emailKey)} 
                              size="small"
                              sx={emailState === null ? { opacity: 0.6 } : {}}
                              data-testid={`notifications-settings-progress-${sub.name}-email-switch`}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="caption">Email</Typography>
                              {emailState === null && (
                                <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic' }}>
                                  (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Course Updates */}
          <Accordion data-testid="notifications-settings-category-course-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="notifications-settings-category-course-accordion-summary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableCourseUpdates')}
                  onChange={handleCategoryToggle('EnableCourseUpdates')}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="notifications-settings-category-course-switch"
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
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Tip:</strong> Shift+Click any switch to set it to "Inherit" from the category setting.
                  </Typography>
                </Alert>
                {COURSE_SUBCATEGORIES.map(sub => {
                  const inAppState = getToggleState(sub.inAppKey);
                  const emailState = getToggleState(sub.emailKey);
                  const categoryEnabled = preferences.EnableCourseUpdates;
                  
                  return (
                    <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.inAppKey, 'EnableCourseUpdates')} 
                            onChange={handleSubcategoryToggle(sub.inAppKey)} 
                            size="small"
                            sx={inAppState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-course-${sub.name}-inapp-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">In-App</Typography>
                            {inAppState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.emailKey, 'EnableCourseUpdates')} 
                            onChange={handleSubcategoryToggle(sub.emailKey)} 
                            size="small"
                            sx={emailState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-course-${sub.name}-email-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">Email</Typography>
                            {emailState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Assessment Updates */}
          <Accordion data-testid="notifications-settings-category-assessment-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="notifications-settings-category-assessment-accordion-summary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableAssessmentUpdates')}
                  onChange={handleCategoryToggle('EnableAssessmentUpdates')}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="notifications-settings-category-assessment-switch"
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
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Tip:</strong> Shift+Click any switch to set it to "Inherit" from the category setting.
                  </Typography>
                </Alert>
                {ASSESSMENT_SUBCATEGORIES.map(sub => {
                  const inAppState = getToggleState(sub.inAppKey);
                  const emailState = getToggleState(sub.emailKey);
                  const categoryEnabled = preferences.EnableAssessmentUpdates;
                  
                  return (
                    <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.inAppKey, 'EnableAssessmentUpdates')} 
                            onChange={handleSubcategoryToggle(sub.inAppKey)} 
                            size="small"
                            sx={inAppState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-assessment-${sub.name}-inapp-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">In-App</Typography>
                            {inAppState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.emailKey, 'EnableAssessmentUpdates')} 
                            onChange={handleSubcategoryToggle(sub.emailKey)} 
                            size="small"
                            sx={emailState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-assessment-${sub.name}-email-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">Email</Typography>
                            {emailState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Community Updates */}
          <Accordion data-testid="notifications-settings-category-community-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="notifications-settings-category-community-accordion-summary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableCommunityUpdates')}
                  onChange={handleCategoryToggle('EnableCommunityUpdates')}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="notifications-settings-category-community-switch"
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
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Tip:</strong> Shift+Click any switch to set it to "Inherit" from the category setting.
                  </Typography>
                </Alert>
                {COMMUNITY_SUBCATEGORIES.map(sub => {
                  const inAppState = getToggleState(sub.inAppKey);
                  const emailState = getToggleState(sub.emailKey);
                  const categoryEnabled = preferences.EnableCommunityUpdates;
                  
                  return (
                    <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.inAppKey, 'EnableCommunityUpdates')} 
                            onChange={handleSubcategoryToggle(sub.inAppKey)} 
                            size="small"
                            sx={inAppState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-community-${sub.name}-inapp-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">In-App</Typography>
                            {inAppState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.emailKey, 'EnableCommunityUpdates')} 
                            onChange={handleSubcategoryToggle(sub.emailKey)} 
                            size="small"
                            sx={emailState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-community-${sub.name}-email-switch`}
                          />}
                        label={
                          <Box>
                            <Typography variant="caption">Email</Typography>
                            {emailState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* System Alerts */}
          <Accordion data-testid="notifications-settings-category-system-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="notifications-settings-category-system-accordion-summary">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Switch
                  checked={getToggleValue('EnableSystemAlerts')}
                  onChange={handleCategoryToggle('EnableSystemAlerts')}
                  onClick={(e) => e.stopPropagation()}
                  data-testid="notifications-settings-category-system-switch"
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
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="caption">
                    <strong>Tip:</strong> Shift+Click any switch to set it to "Inherit" from the category setting.
                  </Typography>
                </Alert>
                {SYSTEM_SUBCATEGORIES.map(sub => {
                  const inAppState = getToggleState(sub.inAppKey);
                  const emailState = getToggleState(sub.emailKey);
                  const categoryEnabled = preferences.EnableSystemAlerts;
                  
                  return (
                    <Box key={sub.name} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{sub.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{sub.description}</Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.inAppKey, 'EnableSystemAlerts')} 
                            onChange={handleSubcategoryToggle(sub.inAppKey)} 
                            disabled={!sub.canDisable}
                            size="small"
                            sx={inAppState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-system-${sub.name}-inapp-switch`}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="caption">In-App</Typography>
                            {inAppState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={getToggleValue(sub.emailKey, 'EnableSystemAlerts')} 
                            onChange={handleSubcategoryToggle(sub.emailKey)} 
                            disabled={!sub.canDisable}
                            size="small"
                            sx={emailState === null ? { opacity: 0.6 } : {}}
                            data-testid={`notifications-settings-system-${sub.name}-email-switch`}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="caption">Email</Typography>
                            {emailState === null && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                (Inherit: {categoryEnabled ? 'ON' : 'OFF'})
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ minWidth: 100 }}
                      />
                    </Box>
                  );
                })}
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
            data-testid="notifications-settings-save-button"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Container>
    </>
  );
};

export default NotificationSettingsPage;
