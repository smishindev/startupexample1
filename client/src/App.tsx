import { useEffect } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { Box } from '@mui/material';

// Auth Components
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';

// Main Pages
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { CoursesPage } from './pages/Courses/CoursesPage';
import { CourseDetailPage } from './pages/Course/CourseDetailPage';
import { LessonDetailPage } from './pages/Course/LessonDetailPage';
import LandingPage from './pages/Landing/LandingPage';

// Hooks
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated, token, refreshToken } = useAuthStore();

  // Auto-refresh token on app load
  useEffect(() => {
    if (token && !isAuthenticated) {
      refreshToken();
    }
  }, [token, isAuthenticated, refreshToken]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterForm />
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <CoursesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses/:courseId"
          element={
            <ProtectedRoute>
              <CourseDetailPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/courses/:courseId/lessons/:lessonId"
          element={
            <ProtectedRoute>
              <LessonDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback redirect */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Box>
  );
}

// Main App wrapper with Router
function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppWrapper;