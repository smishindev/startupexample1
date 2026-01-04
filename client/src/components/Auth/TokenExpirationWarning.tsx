import { useEffect, useState } from 'react';
import { Snackbar, Alert, Button } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface TokenPayload {
  exp: number;
  userId: string;
  email: string;
  role: string;
}

export const TokenExpirationWarning: React.FC = () => {
  const { token, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  useEffect(() => {
    if (!token) return;

    const checkTokenExpiration = () => {
      try {
        // Decode JWT manually without external library
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload) as TokenPayload;
        
        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeLeft = expiryTime - currentTime;

        // Show warning if less than 5 minutes remaining (for 10-minute testing tokens)
        const warningThreshold = 5 * 60 * 1000; // 5 minutes
        
        if (timeLeft > 0 && timeLeft <= warningThreshold) {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          setShowWarning(true);
          setHasLoggedOut(false); // Reset if user gets a new token
        } else if (timeLeft <= 0 && !hasLoggedOut) {
          // Token expired - automatic logout
          console.warn('Token has expired. Logging out...');
          setShowWarning(false);
          setHasLoggedOut(true);
          logout();
          navigate('/login', { 
            state: { message: 'Your session has expired. Please login again.' } 
          });
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check more frequently (every 5 seconds) for accurate countdown and logout
    const interval = setInterval(checkTokenExpiration, 5000);

    return () => clearInterval(interval);
  }, [token, hasLoggedOut]);

  const handleRefresh = async () => {
    const success = await refreshToken();
    if (success) {
      setShowWarning(false);
    }
  };

  const handleClose = () => {
    setShowWarning(false);
  };

  return (
    <Snackbar
      open={showWarning}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      onClose={handleClose}
      data-testid="token-expiration-warning"
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={handleClose}
        action={
          <Button color="inherit" size="small" onClick={handleRefresh} data-testid="token-extend-session-button">
            EXTEND SESSION
          </Button>
        }
      >
        Your session will expire in {timeRemaining}. Would you like to extend it?
      </Alert>
    </Snackbar>
  );
};
