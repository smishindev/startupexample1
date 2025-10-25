import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'student' | 'instructor' | 'admin';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  redirectTo = '/login'
}) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, validateToken, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  // Validate token on component mount
  useEffect(() => {
    const performTokenValidation = async () => {
      if (!isAuthenticated || !user) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const valid = await validateToken();
        setIsValid(valid);
        
        // If validation failed, ensure we logout
        if (!valid) {
          logout();
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setIsValid(false);
        logout(); // Clear invalid auth state
      } finally {
        setIsValidating(false);
      }
    };

    performTokenValidation();
  }, [isAuthenticated, user, validateToken, logout, location.pathname]);

  // Show loading spinner while checking authentication or validating token
  if (isLoading || isValidating) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {isValidating ? 'Validating session...' : 'Loading...'}
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated or token validation failed
  if (!isAuthenticated || !user || !isValid) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireRole && user.role !== requireRole) {
    // Redirect based on user's role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'instructor':
        return <Navigate to="/instructor/dashboard" replace />;
      case 'student':
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;