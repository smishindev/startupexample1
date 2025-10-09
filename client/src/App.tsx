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
import CourseDetail from './pages/Courses/CourseDetail';
import { CourseDetailPage } from './pages/Course/CourseDetailPage';
import { LessonDetailPage } from './pages/Course/LessonDetailPage';
import { InstructorDashboard } from './pages/Instructor/InstructorDashboard';
import { CourseCreationForm } from './pages/Instructor/CourseCreationForm';
import { CourseEditPage } from './pages/Instructor/CourseEditPage';
import { LessonManagementPage } from './pages/Instructor/LessonManagementPage';
import StudentManagement from './pages/Instructor/StudentManagement';
import CourseAnalyticsDashboard from './pages/Instructor/CourseAnalyticsDashboard';
import LandingPage from './pages/Landing/LandingPage';
import MyLearningPage from './pages/Learning/MyLearningPage';
import ProgressDashboard from './pages/Progress/ProgressDashboard';
import Chat from './pages/Chat/Chat';
import Tutoring from './pages/Tutoring/Tutoring';

// Demo Components
import { ContentUploadDemo } from './components/Demo/ContentUploadDemo';

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
        
        <Route path="/courses" element={<CoursesPage />} />
        
        {/* Course Discovery Detail Route (public) */}
        <Route path="/courses/:id/preview" element={<CourseDetail />} />

        <Route
          path="/my-learning"
          element={
            <ProtectedRoute>
              <MyLearningPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ProgressDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tutoring"
          element={
            <ProtectedRoute>
              <Tutoring />
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

        {/* Instructor Routes */}
        <Route
          path="/instructor"
          element={<Navigate to="/instructor/dashboard" replace />}
        />
        
        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute requireRole="instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/courses/create"
          element={
            <ProtectedRoute requireRole="instructor">
              <CourseCreationForm />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/courses/:courseId/edit"
          element={
            <ProtectedRoute requireRole="instructor">
              <CourseEditPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/courses/:courseId/lessons"
          element={
            <ProtectedRoute requireRole="instructor">
              <LessonManagementPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/students"
          element={
            <ProtectedRoute requireRole="instructor">
              <StudentManagement />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/analytics"
          element={
            <ProtectedRoute requireRole="instructor">
              <CourseAnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* Demo Route */}
        <Route
          path="/demo/upload"
          element={<ContentUploadDemo />}
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