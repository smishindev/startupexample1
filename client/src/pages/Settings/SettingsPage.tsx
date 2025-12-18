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

  const handleDeleteAccount = async () => {
    setDeleteDialog(false);
    try {
      const result = await settingsApi.deleteAccount('');
      toast.error(result.message);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
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
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialog(true)}
                    fullWidth
                  >
                    Delete My Account
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {/* Delete Account Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
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
            <Alert severity="error" sx={{ mt: 2 }}>
              <strong>This action is permanent and cannot be reversed.</strong>
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              variant="contained"
            >
              Yes, Delete My Account
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
};

export default SettingsPage;

