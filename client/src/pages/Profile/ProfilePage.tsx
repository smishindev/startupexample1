import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  CreditCard as CreditCardIcon,
  Info as InfoIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  History as HistoryIcon,
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  MarkEmailRead
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import profileApi, { UserProfile, UpdatePersonalInfoData, UpdateBillingAddressData, ChangePasswordData } from '../../services/profileApi';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState<UpdatePersonalInfoData>({
    firstName: '',
    lastName: '',
    username: '',
    learningStyle: null
  });

  // Billing Address State
  const [billingAddress, setBillingAddress] = useState<UpdateBillingAddressData>({
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileApi.getProfile();
      setProfile(data);

      // Populate forms
      setPersonalInfo({
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        learningStyle: data.learningStyle || null
      });

      setBillingAddress({
        streetAddress: data.billingAddress.streetAddress || '',
        city: data.billingAddress.city || '',
        state: data.billingAddress.state || '',
        postalCode: data.billingAddress.postalCode || '',
        country: data.billingAddress.country || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Personal Info Handlers
  const handleSavePersonalInfo = async () => {
    try {
      setSaving(true);
      await profileApi.updatePersonalInfo(personalInfo);
      
      // Update auth store
      updateUser({
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        username: personalInfo.username,
        learningStyle: personalInfo.learningStyle || undefined
      });

      toast.success('Profile updated successfully');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Billing Address Handlers
  const handleSaveBillingAddress = async () => {
    try {
      setSaving(true);
      await profileApi.updateBillingAddress(billingAddress);
      toast.success('Billing address updated successfully');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update billing address');
    } finally {
      setSaving(false);
    }
  };

  // Avatar Upload Handlers
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploading(true);
      const result = await profileApi.uploadAvatar(file);
      
      // Update profile state and auth store
      setProfile(prev => prev ? { ...prev, avatar: result.avatar } : null);
      updateUser({ avatar: result.avatar });
      
      toast.success('Avatar uploaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  // Password Change Handlers
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      await profileApi.changePassword(passwordData);
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '' });
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <HeaderV4 />
        <PageContainer maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        </PageContainer>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <HeaderV4 />
        <PageContainer maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4 }}>
          <Alert severity="error">{error || 'Profile not found'}</Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      <PageContainer maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4 }}>
        <Paper elevation={3} sx={{ overflow: 'hidden' }}>
          {/* Header Section */}
          <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={profile.avatar || undefined}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    sx={{ width: 80, height: 80, bgcolor: 'primary.dark' }}
                  >
                    {profile.firstName?.[0]?.toUpperCase() || ''}{profile.lastName?.[0]?.toUpperCase() || ''}
                  </Avatar>
                  <IconButton
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    sx={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      bgcolor: 'white',
                      '&:hover': { bgcolor: 'grey.200' },
                      boxShadow: 2
                    }}
                    size="small"
                    data-testid="profile-avatar-upload-button"
                  >
                    {uploading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PhotoCameraIcon fontSize="small" color="primary" />
                    )}
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </Box>
              </Grid>
              <Grid item xs>
                <Typography variant="h4" fontWeight="bold">
                  {profile.firstName} {profile.lastName}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {profile.email}
                </Typography>
                <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={profile.role.toUpperCase()}
                    size="small"
                    sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 'bold' }}
                  />
                  {profile.emailVerified ? (
                    <Chip
                      label="Email Verified"
                      size="small"
                      color="success"
                      icon={<CheckCircleIcon />}
                      sx={{ bgcolor: 'success.light' }}
                    />
                  ) : (
                    <Chip
                      label="Email Not Verified"
                      size="small"
                      color="warning"
                      sx={{ bgcolor: 'warning.light' }}
                      onClick={() => navigate('/verify-email')}
                      onDelete={() => navigate('/verify-email')}
                      deleteIcon={<MarkEmailRead />}
                      data-testid="profile-verify-email-chip"
                    />
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs" variant="scrollable" scrollButtons="auto" data-testid="profile-tabs">
              <Tab icon={<PersonIcon />} label="Personal Info" iconPosition="start" data-testid="profile-tab-personal" />
              <Tab icon={<LockIcon />} label="Password" iconPosition="start" data-testid="profile-tab-password" />
              <Tab icon={<CreditCardIcon />} label="Billing Address" iconPosition="start" data-testid="profile-tab-billing" />
              <Tab icon={<InfoIcon />} label="Account Info" iconPosition="start" data-testid="profile-tab-account" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Tab 1: Personal Info */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Personal Information
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={personalInfo.firstName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                    required
                    data-testid="profile-first-name-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={personalInfo.lastName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                    required
                    data-testid="profile-last-name-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={personalInfo.username}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, username: e.target.value })}
                    required
                    helperText="Must be unique and at least 3 characters"
                    data-testid="profile-username-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profile.email}
                    disabled
                    helperText="Email cannot be changed"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Learning Style</InputLabel>
                    <Select
                      value={personalInfo.learningStyle || ''}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, learningStyle: e.target.value || null })}
                      label="Learning Style"
                      data-testid="profile-learning-style-select"
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="visual">Visual</MenuItem>
                      <MenuItem value="auditory">Auditory</MenuItem>
                      <MenuItem value="kinesthetic">Kinesthetic</MenuItem>
                      <MenuItem value="reading_writing">Reading/Writing</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSavePersonalInfo}
                    disabled={saving}
                    data-testid="profile-save-personal-info-button"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 2: Password */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Change Password
              </Typography>
              <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                Password must be at least 8 characters long
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showCurrentPassword ? 'text' : 'password'}
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    data-testid="profile-current-password-input"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                            data-testid="profile-current-password-toggle"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showNewPassword ? 'text' : 'password'}
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    data-testid="profile-new-password-input"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                            data-testid="profile-new-password-toggle"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showNewPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    data-testid="profile-confirm-password-input"
                    error={confirmPassword !== '' && passwordData.newPassword !== confirmPassword}
                    helperText={
                      confirmPassword !== '' && passwordData.newPassword !== confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<LockIcon />}
                    onClick={handleChangePassword}
                    disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !confirmPassword}
                    data-testid="profile-change-password-button"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 3: Billing Address */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Billing Address
              </Typography>
              <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                This address will be used for payment processing and invoices
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={billingAddress.streetAddress}
                    onChange={(e) => setBillingAddress({ ...billingAddress, streetAddress: e.target.value })}
                    data-testid="profile-billing-street-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    data-testid="profile-billing-city-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="State/Province"
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    data-testid="profile-billing-state-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    value={billingAddress.postalCode}
                    onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                    data-testid="profile-billing-postal-input"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Country"
                    value={billingAddress.country}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    data-testid="profile-billing-country-input"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveBillingAddress}
                    disabled={saving}
                    data-testid="profile-save-billing-button"
                  >
                    {saving ? 'Saving...' : 'Save Billing Address'}
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 4: Account Info */}
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Account Information
              </Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Account ID</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {profile.id}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Role</Typography>
                  <Typography variant="body1">
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Member Since</Typography>
                  <Typography variant="body1">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Last Login</Typography>
                  <Typography variant="body1">
                    {profile.lastLoginAt
                      ? new Date(profile.lastLoginAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => navigate('/transactions')}
                    data-testid="profile-transaction-history-button"
                  >
                    View Transaction History
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
          </Box>
        </Paper>
      </PageContainer>
    </>
  );
};

export default ProfilePage;
