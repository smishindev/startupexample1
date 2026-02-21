import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Lock, Visibility, VisibilityOff, ArrowBack, CheckCircle } from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api';

export const ResetPasswordForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as any)?.email || '';

  const [formData, setFormData] = useState({
    email: emailFromState,
    token: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }

    if (!formData.token.trim()) {
      errors.token = 'Reset code is required';
    } else if (formData.token.length !== 6) {
      errors.token = 'Reset code must be 6 digits';
    }

    if (!formData.newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      if (formData.newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain a lowercase letter';
      } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain an uppercase letter';
      } else if (!/(?=.*\d)/.test(formData.newPassword)) {
        errors.newPassword = 'Password must contain a number';
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          token: formData.token.trim(),
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error?.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Unable to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
        px={2}
      >
        <Card sx={{ maxWidth: 400, width: '100%', boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Box textAlign="center">
              <CheckCircle sx={{ fontSize: { xs: 48, sm: 64 }, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" component="h1" gutterBottom sx={{ fontSize: { xs: '1.3rem', sm: '1.5rem' } }}>
                Password Reset Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Your password has been reset successfully.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to login page...
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ mt: 3 }}
                data-testid="reset-password-success-go-to-login-button"
              >
                Go to Login
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card sx={{ maxWidth: 400, width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box textAlign="center" mb={3}>
            <Lock sx={{ fontSize: { xs: 40, sm: 48 }, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              Reset Password
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter the code we sent to your email and choose a new password.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              margin="normal"
              required
              autoComplete="email"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'reset-password-email-input' }}
            />

            <TextField
              fullWidth
              id="token"
              label="6-Digit Reset Code"
              value={formData.token}
              onChange={handleChange('token')}
              error={!!validationErrors.token}
              helperText={validationErrors.token || 'Enter the code from your email'}
              margin="normal"
              required
              autoFocus
              disabled={isLoading}
              inputProps={{ maxLength: 6, pattern: '[0-9]*', 'data-testid': 'reset-password-token-input' }}
            />

            <TextField
              fullWidth
              id="newPassword"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              error={!!validationErrors.newPassword}
              helperText={validationErrors.newPassword}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'reset-password-new-password-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                      data-testid="reset-password-toggle-password-visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'reset-password-confirm-password-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={isLoading}
                      data-testid="reset-password-toggle-confirm-password-visibility"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              data-testid="reset-password-submit-button"
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <Box textAlign="center">
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
                sx={{ display: 'block', mb: 1 }}
                data-testid="reset-password-resend-code-link"
              >
                Didn't receive a code? Send again
              </Link>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                data-testid="reset-password-back-to-login-link"
              >
                <ArrowBack fontSize="small" />
                Back to Login
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
