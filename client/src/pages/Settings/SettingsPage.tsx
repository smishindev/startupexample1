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
  Card,
  CardContent,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Storage as StorageIcon,
  DeleteForever as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { HeaderV4 } from '../../components/Navigation/HeaderV4';
import { toast } from 'react-hot-toast';
import * as settingsApi from '../../services/settingsApi';
import AccountDeletionOptionsDialog from '../../components/AccountDeletionOptionsDialog';
import CourseTransferDialog from '../../components/CourseTransferDialog';
import ArchiveCoursesDialog from '../../components/ArchiveCoursesDialog';
import axiosInstance from '../../utils/axiosConfig';

const SettingsPage: React.FC = () => {
  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);

  // Appearance Settings
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('medium');

  // Data Management
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Instructor deletion flow states
  const [deletionOptions, setDeletionOptions] = useState<any>(null);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'archive' | 'transfer' | 'force' | null>(null);
  const [transferToInstructorId, setTransferToInstructorId] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsApi.getSettings();
      
      // Privacy
      setProfileVisibility(settings.profileVisibility);
      setShowEmail(settings.showEmail);
      setShowProgress(settings.showProgress);
      setAllowMessages(settings.allowMessages);
      
      // Appearance
      setTheme(settings.theme);
      setLanguage(settings.language);
      setFontSize(settings.fontSize);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSavePrivacy = async () => {
    try {
      setSaving(true);
      await settingsApi.updateSettings({
        profileVisibility: profileVisibility as any,
        showEmail,
        showProgress,
        allowMessages
      });
      toast.success('Privacy settings saved!');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      setSaving(true);
      await settingsApi.updateSettings({
        theme: theme as any,
        language: language as any,
        fontSize: fontSize as any
      });
      toast.success('Appearance settings saved!');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      toast.error('Failed to save appearance settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const result = await settingsApi.requestDataExport();
      toast.success(result.message);
    } catch (error) {
      console.error('Error requesting data export:', error);
      toast.error('Failed to request data export');
    }
  };

  /**
   * Start the account deletion flow - check if instructor needs special handling
   */
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Check if user needs to handle instructor content first
      const response = await axiosInstance.get('/api/settings/deletion-check');

      const options = response.data;
      setDeletionOptions(options);

      if (options.canDeleteDirectly) {
        // No special handling needed - go straight to password confirmation
        setDeleteDialog(true);
      } else {
        // Show options dialog for instructor
        setShowOptionsDialog(true);
      }
    } catch (error: any) {
      console.error('Error checking deletion eligibility:', error);
      toast.error('Failed to check deletion eligibility');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handle instructor's choice of action (archive/transfer/force)
   */
  const handleActionSelected = (action: 'archive' | 'transfer' | 'force') => {
    setSelectedAction(action);
    setShowOptionsDialog(false);

    if (action === 'archive') {
      setShowArchiveDialog(true);
    } else if (action === 'transfer') {
      setShowTransferDialog(true);
    } else if (action === 'force') {
      // Force delete - go to password confirmation
      setDeleteDialog(true);
    }
  };

  /**
   * Handle archive selection (stores choice, doesn't execute yet)
   */
  const handleArchiveComplete = () => {
    setSelectedAction('archive');
    setShowArchiveDialog(false);
    // Show password confirmation dialog
    setDeleteDialog(true);
  };

  /**
   * Handle transfer selection (stores choice, doesn't execute yet)
   */
  const handleTransferComplete = (instructorId: string) => {
    setTransferToInstructorId(instructorId);
    setSelectedAction('transfer');
    setShowTransferDialog(false);
    // Show password confirmation dialog
    setDeleteDialog(true);
  };

  /**
   * Final deletion with password confirmation
   */
  const handleFinalDeletion = async () => {
    if (!deletePassword.trim()) {
      toast.error('Please enter your password to confirm deletion');
      return;
    }

    setDeleting(true);
    try {
      const result = await settingsApi.deleteAccount({
        confirmPassword: deletePassword,
        instructorAction: selectedAction || undefined,
        transferToInstructorId: transferToInstructorId || undefined
      });
      
      if (result.success) {
        toast.success(result.message);
        setDeleteDialog(false);
        setDeletePassword('');
        
        // Logout and redirect after 2 seconds
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error(result.message || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete account';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <HeaderV4 />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center', py: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading settings...
          </Typography>
        </Container>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} mb={4}>
          <SettingsIcon fontSize="large" color="primary" />
          <Typography variant="h4" fontWeight="bold">
            Settings
          </Typography>
        </Box>

        <Stack spacing={3}>
          {/* Privacy Settings */}
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <SecurityIcon color="primary" />
                <Typography variant="h5" fontWeight="600">
                  Privacy Settings
                </Typography>
              </Box>

              <Stack spacing={3}>
                {/* Profile Visibility */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Profile Visibility
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Who can see your profile</InputLabel>
                    <Select
                      value={profileVisibility}
                      label="Who can see your profile"
                      onChange={(e) => setProfileVisibility(e.target.value)}
                      data-testid="settings-profile-visibility-select"
                    >
                      <MenuItem value="public">Everyone</MenuItem>
                      <MenuItem value="students">Enrolled Students Only</MenuItem>
                      <MenuItem value="private">Only Me</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Control who can view your profile information. "Students" means users in your same courses.
                  </Typography>
                </Box>

                <Divider />

                {/* Email Visibility */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={showEmail}
                      onChange={(e) => setShowEmail(e.target.checked)}
                      data-testid="settings-show-email-switch"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Show Email Address</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Display your email in user lists, profiles, and group member lists. You always see your own email.
                      </Typography>
                    </Box>
                  }
                />

                {/* Progress Visibility */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={showProgress}
                      onChange={(e) => setShowProgress(e.target.checked)}
                      data-testid="settings-show-progress-switch"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Show Learning Progress</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow others to view your course progress and achievements. Note: Instructors can always see progress in their courses.
                      </Typography>
                    </Box>
                  }
                />

                {/* Messages */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowMessages}
                      onChange={(e) => setAllowMessages(e.target.checked)}
                      data-testid="settings-allow-messages-switch"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Allow Direct Messages</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Let other students and instructors send you direct messages (when chat is enabled)
                      </Typography>
                    </Box>
                  }
                />

                <Box sx={{ pt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSavePrivacy}
                    disabled={saving}
                    fullWidth
                    data-testid="settings-save-privacy-button"
                  >
                    {saving ? 'Saving...' : 'Save Privacy Settings'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <PaletteIcon color="primary" />
                <Typography variant="h5" fontWeight="600">
                  Appearance
                </Typography>
              </Box>

              <Stack spacing={3}>
                {/* Theme */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Theme
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Color theme</InputLabel>
                    <Select
                      value={theme}
                      label="Color theme"
                      onChange={(e) => setTheme(e.target.value)}
                      data-testid="settings-theme-select"
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (System)</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Choose your preferred color scheme
                  </Typography>
                </Box>

                <Divider />

                {/* Language */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Language
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Display language</InputLabel>
                    <Select
                      value={language}
                      label="Display language"
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Español</MenuItem>
                      <MenuItem value="fr">Français</MenuItem>
                      <MenuItem value="de">Deutsch</MenuItem>
                      <MenuItem value="zh">中文</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Select your preferred language for the interface
                  </Typography>
                </Box>

                <Divider />

                {/* Font Size */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Font Size
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Text size</InputLabel>
                    <Select
                      value={fontSize}
                      label="Text size"
                      onChange={(e) => setFontSize(e.target.value)}
                    >
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Adjust text size for better readability
                  </Typography>
                </Box>

                <Box sx={{ pt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveAppearance}
                    disabled={saving}
                    fullWidth
                    data-testid="settings-save-appearance-button"
                  >
                    {saving ? 'Saving...' : 'Save Appearance Settings'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <StorageIcon color="primary" />
                <Typography variant="h5" fontWeight="600">
                  Data Management
                </Typography>
              </Box>

              <Stack spacing={3}>
                {/* Export Data */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500">
                    Export Your Data
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Download a copy of your personal data, including profile information, 
                    course progress, and transaction history.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportData}
                    fullWidth
                    data-testid="settings-export-data-button"
                  >
                    Request Data Export
                  </Button>
                </Box>

                <Divider />

                {/* Delete Account */}
                <Box>
                  <Typography variant="subtitle1" gutterBottom fontWeight="500" color="error">
                    Delete Account
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Permanently delete your account and all associated data. 
                    This action cannot be undone.
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ Deleting your account will:
                    <ul style={{ marginTop: 8, marginBottom: 0 }}>
                      <li>Remove access to all enrolled courses</li>
                      <li>Delete all progress and certificates</li>
                      <li>Cancel any active subscriptions</li>
                      <li>Permanently delete all personal data</li>
                    </ul>
                  </Alert>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    fullWidth
                    data-testid="settings-delete-account-button"
                  >
                    {deleting ? 'Checking eligibility...' : 'Delete My Account'}
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => !deleting && setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
          data-testid="settings-delete-dialog"
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            Delete Account?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to permanently delete your account? 
              This action cannot be undone and you will lose access to:
            </DialogContentText>
            <Box component="ul" sx={{ mt: 2, color: 'text.secondary' }}>
              <li>All enrolled courses and learning progress</li>
              <li>Certificates and achievements</li>
              <li>Transaction history</li>
              <li>Personal profile and settings</li>
            </Box>
            <Alert severity="error" sx={{ mt: 2, mb: 3 }}>
              <strong>This action is permanent and cannot be reversed.</strong>
            </Alert>
            
            <TextField
              fullWidth
              type="password"
              label="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={deleting}
              autoFocus
              placeholder="Password"
              helperText="You must enter your current password to delete your account"
              data-testid="settings-delete-password-input"
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setDeleteDialog(false);
                setDeletePassword('');
                setSelectedAction(null);
                setTransferToInstructorId(null);
                setDeletionOptions(null);
              }} 
              disabled={deleting}
              data-testid="settings-delete-dialog-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalDeletion}
              color="error"
              variant="contained"
              disabled={deleting || !deletePassword.trim()}
              data-testid="settings-delete-dialog-confirm"
            >
              {deleting ? <CircularProgress size={20} /> : 'Yes, Delete My Account'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Instructor Deletion Options Dialog */}
        {deletionOptions && (
          <AccountDeletionOptionsDialog
            open={showOptionsDialog}
            onClose={() => {
              setShowOptionsDialog(false);
              setDeletionOptions(null);
              setSelectedAction(null);
            }}
            onSelectOption={handleActionSelected}
            stats={deletionOptions.content}
            blockedReason={deletionOptions.blockedReason}
          />
        )}

        {/* Archive Courses Dialog */}
        {deletionOptions && (
          <ArchiveCoursesDialog
            open={showArchiveDialog}
            onClose={() => {
              setShowArchiveDialog(false);
              setSelectedAction(null);
            }}
            onArchiveComplete={handleArchiveComplete}
            publishedCoursesCount={deletionOptions.content.publishedCourses}
            totalStudents={deletionOptions.content.totalStudents}
          />
        )}

        {/* Course Transfer Dialog */}
        {deletionOptions && (
          <CourseTransferDialog
            open={showTransferDialog}
            onClose={() => {
              setShowTransferDialog(false);
              setSelectedAction(null);
            }}
            onTransfer={handleTransferComplete}
            courseCount={deletionOptions.content.totalCourses}
          />
        )}
      </Container>
    </>
  );
};

export default SettingsPage;

