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
  CircularProgress,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3001/api';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string>(''); // DEV ONLY
  const [validationError, setValidationError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setValidationError('');

    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // DEV ONLY - show token in development
        if (data._devToken) {
          setResetToken(data._devToken);
        }
      } else {
        setError(data.error?.message || 'Failed to send reset instructions');
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
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" component="h1" gutterBottom align="center">
              Check Your Email
            </Typography>
            
            <Alert severity="success" sx={{ my: 3 }}>
              If an account exists with <strong>{email}</strong>, you will receive password reset instructions shortly.
            </Alert>

            {resetToken && (
              <Alert severity="info" sx={{ my: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  Development Mode - Reset Code:
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'monospace', my: 1 }}>
                  {resetToken}
                </Typography>
                <Typography variant="caption">
                  (In production, this will be sent via email)
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" paragraph>
              Please check your email inbox and spam folder. The reset link will expire in 1 hour.
            </Typography>

            <Button
              component={RouterLink}
              to="/reset-password"
              state={{ email }}
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
            >
              Enter Reset Code
            </Button>

            <Box textAlign="center" mt={2}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                <ArrowBack fontSize="small" />
                Back to Login
              </Link>
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
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Email sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Forgot Password?
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your email address and we'll send you a code to reset your password.
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationError('');
                setError(null);
              }}
              error={!!validationError}
              helperText={validationError}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
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
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Sending...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>

            <Box textAlign="center">
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
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
