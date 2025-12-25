import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, IconButton, Box, Collapse } from '@mui/material';
import { MarkEmailRead, Close } from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';

export const EmailVerificationBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  // Don't show banner if user is verified or if dismissed
  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity="warning"
        icon={<MarkEmailRead />}
        sx={{
          borderRadius: 0,
          borderBottom: '1px solid',
          borderBottomColor: 'warning.light',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={() => navigate('/verify-email')}
              sx={{
                fontWeight: 'bold',
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              }}
            >
              Verify Now
            </Button>
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setDismissed(true)}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <strong>Please verify your email address</strong>
          <span>to access all features and receive important updates.</span>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default EmailVerificationBanner;
