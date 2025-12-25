import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { MarkEmailRead, RefreshOutlined } from '@mui/icons-material';
import { verificationApi } from '../../services/verificationApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

export const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const { user, updateEmailVerified } = useAuthStore();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if already verified
  useEffect(() => {
    if (user?.emailVerified) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await verificationApi.verifyCode(code);

      if (response.success) {
        setSuccess(true);
        updateEmailVerified(true);
        toast.success('Email verified successfully!');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(response.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);

    try {
      const response = await verificationApi.resendVerificationCode();

      if (response.success) {
        toast.success('Verification code sent! Check your email.');
        setResendCooldown(60); // 60 second cooldown
        setCode(''); // Clear the code input
      } else {
        setError(response.message || 'Failed to resend code. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Resend error:', err);
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying && code.length === 6) {
      handleVerifyCode();
    }
  };

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="warning">
          Please log in to verify your email.
        </Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <MarkEmailRead sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Verify Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We sent a 6-digit verification code to
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="primary.main">
              {user.email}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Email verified successfully! Redirecting to dashboard...
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Verification Code"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              disabled={isVerifying || success}
              inputProps={{
                maxLength: 6,
                style: { 
                  textAlign: 'center', 
                  fontSize: '24px', 
                  letterSpacing: '8px',
                  fontWeight: 'bold',
                },
              }}
              helperText="Enter the 6-digit code from your email"
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 6 || success}
              sx={{ py: 1.5 }}
            >
              {isVerifying ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Didn't receive the code?
              </Typography>
              <Button
                variant="text"
                startIcon={<RefreshOutlined />}
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0 || success}
              >
                {isResending ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  'Resend Code'
                )}
              </Button>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              disabled={isVerifying}
            >
              Back to Dashboard
            </Button>
          </Stack>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              💡 <strong>Tips:</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Check your spam folder if you don't see the email
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • The code expires in 24 hours
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • You can request a new code at any time
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default EmailVerificationPage;
