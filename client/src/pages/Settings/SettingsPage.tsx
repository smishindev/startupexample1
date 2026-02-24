import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
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
import { useTheme } from '@mui/material/styles';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Storage as StorageIcon,
  DeleteForever as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import { toast } from 'react-hot-toast';
import * as settingsApi from '../../services/settingsApi';
import AccountDeletionOptionsDialog from '../../components/AccountDeletionOptionsDialog';
import CourseTransferDialog from '../../components/CourseTransferDialog';
import ArchiveCoursesDialog from '../../components/ArchiveCoursesDialog';
import axiosInstance from '../../utils/axiosConfig';

const SettingsPage: React.FC = () => {
  const muiTheme = useTheme();
  const { isMobile } = useResponsive();
  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEmail, setShowEmail] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);

  // Appearance Settings
  const [colorTheme, setColorTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('medium');

  // Data Export State
  const [exportStatus, setExportStatus] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);

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

  // Define loadExportStatus before useEffects that use it
  const loadExportStatus = useCallback(async () => {
    try {
      const status = await settingsApi.getExportStatus();
      setExportStatus(status);
    } catch (error) {
      console.error('Error loading export status:', error);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadExportStatus();
  }, [loadExportStatus]);

  // Poll export status when pending/processing
  useEffect(() => {
    if (exportStatus?.status === 'pending' || exportStatus?.status === 'processing') {
      const interval = setInterval(() => {
        // Only poll if page is visible (optimize API calls)
        if (!document.hidden) {
          loadExportStatus();
        }
      }, 10000); // Poll every 10 seconds

      // Resume polling when page becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden && (exportStatus?.status === 'pending' || exportStatus?.status === 'processing')) {
          loadExportStatus();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [exportStatus?.status, loadExportStatus]);

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
      setColorTheme(settings.theme);
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
        theme: colorTheme as any,
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
      setExportLoading(true);
      const result = await settingsApi.requestDataExport();
      toast.success(result.message);
      
      // Reload status to show the new request
      await loadExportStatus();
    } catch (error: any) {
      console.error('Error requesting data export:', error);
      
      if (error.response?.status === 429) {
        toast.error('Rate limit exceeded. Maximum 3 export requests per 24 hours.');
      } else {
        toast.error('Failed to request data export');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!exportStatus?.requestId) return;
    
    try {
      setExportLoading(true);
      await settingsApi.downloadExport(exportStatus.requestId);
      toast.success('Download started!');
      
      // Reload status to update download count
      await loadExportStatus();
    } catch (error: any) {
      console.error('Error downloading export:', error);
      
      if (error.response?.status === 410) {
        toast.error('Export has expired. Please request a new export.');
      } else {
        toast.error('Failed to download export');
      }
      
      // Reload status in case of expiry
      await loadExportStatus();
    } finally {
      setExportLoading(false);
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
        <PageContainer maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4, textAlign: 'center', pt: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Loading settings...
          </Typography>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      <PageContainer maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={{ xs: 1, md: 2 }} mb={{ xs: 2, md: 4 }}>
          <SettingsIcon fontSize="large" color="primary" />
          <PageTitle sx={{ mb: 0 }}>
            Settings
          </PageTitle>
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
                      value={colorTheme}
                      label="Color theme"
                      onChange={(e) => setColorTheme(e.target.value)}
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

                  {/* No export request yet */}
                  {!exportStatus?.hasRequest && (
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={handleExportData}
                      disabled={exportLoading}
                      fullWidth
                      data-testid="settings-export-data-button"
                    >
                      {exportLoading ? 'Requesting...' : 'Request Data Export'}
                    </Button>
                  )}

                  {/* Export Status Display */}
                  {exportStatus?.hasRequest && (
                    <Box>
                      {/* Pending / Processing Status */}
                      {(exportStatus.status === 'pending' || exportStatus.status === 'processing') && (
                        <Box 
                          sx={{ 
                            p: { xs: 2, sm: 3 }, 
                            bgcolor: 'warning.50', 
                            borderRadius: 2, 
                            border: '1px solid',
                            borderColor: 'warning.400',
                            mb: 2 
                          }}
                        >
                          <Box display="flex" alignItems="center" gap={2} mb={2}>
                            <CircularProgress size={24} />
                            <Typography variant="h6" color="text.primary">
                              ⏳ {exportStatus.status === 'pending' ? 'Queued' : 'Processing'}...
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            Your data export is being prepared. This usually takes 5-10 minutes.
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Requested {new Date(exportStatus.requestedAt).toLocaleString()}
                          </Typography>
                          <Box mt={2}>
                            <Typography variant="caption" color="text.secondary">
                              ℹ️ You'll receive an email with a download link when your export is ready. 
                              You can also check back here.
                            </Typography>
                          </Box>
                          <Box mt={2}>
                            <Button
                              size="small"
                              onClick={loadExportStatus}
                              disabled={exportLoading}
                            >
                              Refresh Status
                            </Button>
                          </Box>
                        </Box>
                      )}

                      {/* Completed Status */}
                      {exportStatus.status === 'completed' && (
                        <Box 
                          sx={{ 
                            p: { xs: 2, sm: 3 }, 
                            bgcolor: 'success.50', 
                            borderRadius: 2, 
                            border: '1px solid',
                            borderColor: 'success.300',
                            mb: 2 
                          }}
                        >
                          <Typography variant="h6" color="success.dark" gutterBottom>
                            ✅ Export Ready!
                          </Typography>
                          
                          <Box sx={{ mt: 2, mb: 2 }}>
                            <table style={{ width: '100%', fontSize: '14px' }}>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '4px 0', color: muiTheme.palette.text.secondary }}>
                                    <strong>File Name:</strong>
                                  </td>
                                  <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    {exportStatus.fileName}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '4px 0', color: muiTheme.palette.text.secondary }}>
                                    <strong>File Size:</strong>
                                  </td>
                                  <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    {exportStatus.fileSize ? (exportStatus.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '4px 0', color: muiTheme.palette.text.secondary }}>
                                    <strong>Completed:</strong>
                                  </td>
                                  <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    {new Date(exportStatus.completedAt).toLocaleString()}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '4px 0', color: muiTheme.palette.text.secondary }}>
                                    <strong>Expires:</strong>
                                  </td>
                                  <td style={{ padding: '4px 0', textAlign: 'right', color: muiTheme.palette.error.main }}>
                                    {new Date(exportStatus.expiresAt).toLocaleDateString()} (7 days)
                                  </td>
                                </tr>
                                {exportStatus.downloadCount > 0 && (
                                  <tr>
                                    <td style={{ padding: '4px 0', color: muiTheme.palette.text.secondary }}>
                                      <strong>Downloads:</strong>
                                    </td>
                                    <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                      {exportStatus.downloadCount} time{exportStatus.downloadCount !== 1 ? 's' : ''}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </Box>

                          <Stack direction="row" spacing={2} mt={2}>
                            <Button
                              variant="contained"
                              startIcon={<DownloadIcon />}
                              onClick={handleDownloadExport}
                              disabled={exportLoading}
                              fullWidth
                            >
                              {exportLoading ? 'Downloading...' : 'Download Export'}
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={handleExportData}
                              disabled={exportLoading}
                            >
                              New Export
                            </Button>
                          </Stack>
                        </Box>
                      )}

                      {/* Failed Status */}
                      {exportStatus.status === 'failed' && (
                        <Box 
                          sx={{ 
                            p: { xs: 2, sm: 3 }, 
                            bgcolor: 'error.50', 
                            borderRadius: 2, 
                            border: '1px solid',
                            borderColor: 'error.300',
                            mb: 2 
                          }}
                        >
                          <Typography variant="h6" color="error.dark" gutterBottom>
                            ❌ Export Failed
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {exportStatus.errorMessage || 'An error occurred while generating your export.'}
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={handleExportData}
                            disabled={exportLoading}
                            color="error"
                          >
                            Try Again
                          </Button>
                        </Box>
                      )}

                      {/* Expired Status */}
                      {exportStatus.status === 'expired' && (
                        <Box 
                          sx={{ 
                            p: { xs: 2, sm: 3 }, 
                            bgcolor: 'grey.50', 
                            borderRadius: 2, 
                            border: '1px solid',
                            borderColor: 'grey.400',
                            mb: 2 
                          }}
                        >
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            ⏱️ Export Expired
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            Your previous export has expired. Request a new export to download your data.
                          </Typography>
                          <Button
                            variant="outlined"
                            onClick={handleExportData}
                            disabled={exportLoading}
                          >
                            Request New Export
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
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
          fullScreen={isMobile}
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
      </PageContainer>
    </>
  );
};

export default SettingsPage;

