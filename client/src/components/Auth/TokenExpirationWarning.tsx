import { useEffect, useState } from 'react';
import { Snackbar, Alert, Button } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';

interface TokenPayload {
  exp: number;
  userId: string;
  email: string;
  role: string;
}

export const TokenExpirationWarning: React.FC = () => {
  const { token, refreshToken } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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

        // Show warning if less than 5 minutes remaining
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeLeft > 0 && timeLeft <= fiveMinutes) {
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiration, 30000);

    return () => clearInterval(interval);
  }, [token]);

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
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={handleClose}
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            EXTEND SESSION
          </Button>
        }
      >
        Your session will expire in {timeRemaining}. Would you like to extend it?
      </Alert>
    </Snackbar>
  );
};
