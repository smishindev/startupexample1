import React, { useState, useEffect } from 'react';
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
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Login as LoginIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Check for session expiry message from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).message) {
      setSessionMessage((location.state as any).message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
    
    // Clear global error when user types
    if (error) {
      clearError();
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    const success = await login(formData.email.trim(), formData.password, formData.rememberMe);
    
    if (success) {
      onSuccess?.();
      // Navigate back to where user came from (e.g., course page), or dashboard
      const returnTo = (location.state as any)?.from || '/dashboard';
      navigate(returnTo);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to your Smart Learning account
            </Typography>
          </Box>

          {sessionMessage && (
            <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setSessionMessage(null)}>
              {sessionMessage}
            </Alert>
          )}

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
              autoFocus
              disabled={isLoading}
              inputProps={{ 'data-testid': 'login-email-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              margin="normal"
              required
              autoComplete="current-password"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'login-password-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={togglePasswordVisibility}
                      edge="end"
                      disabled={isLoading}
                      data-testid="login-toggle-password-visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                  disabled={isLoading}
                  color="primary"
                  data-testid="login-remember-me-checkbox"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Keep me signed in for 30 days
                </Typography>
              }
              sx={{ mt: 1 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <Box textAlign="center">
              <Link
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
                data-testid="login-forgot-password-link"
              >
                Forgot your password?
              </Link>
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  underline="hover"
                  fontWeight="medium"
                  onClick={() => navigate('/register', { state: location.state })}
                  data-testid="login-register-link"
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};