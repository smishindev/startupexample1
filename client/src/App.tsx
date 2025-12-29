import { useEffect } from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import { Box } from '@mui/material';
import { Toaster } from 'sonner';

// Auth Components
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { ForgotPasswordForm } from './components/Auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/Auth/ResetPasswordForm';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { TokenExpirationWarning } from './components/Auth/TokenExpirationWarning';
import EmailVerificationPage from './pages/Auth/EmailVerificationPage';

// Main Pages
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { CoursesPage } from './pages/Courses/CoursesPage';
import { CourseDetailPage } from './pages/Course/CourseDetailPage';
import { LessonDetailPage } from './pages/Course/LessonDetailPage';
import { InstructorDashboard } from './pages/Instructor/InstructorDashboard';
import { CourseCreationForm } from './pages/Instructor/CourseCreationForm';
import { CourseEditPage } from './pages/Instructor/CourseEditPage';
import { LessonManagementPage } from './pages/Instructor/LessonManagementPage';
import { AssessmentManagementPage } from './pages/Instructor/AssessmentManagementPage';
import { CourseAssessmentManagementPage } from './pages/Instructor/CourseAssessmentManagementPage';
import { AssessmentCreationPage } from './pages/Instructor/AssessmentCreationPage';
import { AssessmentEditPage } from './pages/Instructor/AssessmentEditPage';
import { AssessmentViewPage } from './pages/Instructor/AssessmentViewPage';
import { AssessmentTakingPage } from './pages/Assessment/AssessmentTakingPage';
import { StudentAssessmentDashboard } from './pages/Assessment/StudentAssessmentDashboard';
import StudentManagement from './pages/Instructor/StudentManagement';
import CourseAnalyticsDashboard from './pages/Instructor/CourseAnalyticsDashboard';
import { EnhancedAssessmentAnalyticsPage } from './pages/Instructor/EnhancedAssessmentAnalyticsPage';
import { AnalyticsHubPage } from './pages/Instructor/AnalyticsHubPage';
import { InterventionDashboard } from './pages/Instructor/InterventionDashboard';
import { InstructorStudentAnalytics } from './pages/Instructor/InstructorStudentAnalytics';
import { VideoAnalyticsPage } from './pages/Instructor/VideoAnalyticsPage';
import LandingPage from './pages/Landing/LandingPage';
import MyLearningPage from './pages/Learning/MyLearningPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';

// Phase 2 - Collaborative Features
import { LiveSessionsPage } from './pages/LiveSessions/LiveSessionsPage';
import { StudyGroupsPage } from './pages/StudyGroups/StudyGroupsPage';
import OfficeHoursPage from './pages/OfficeHours/OfficeHoursPage';
import PresencePage from './pages/Presence/PresencePage';

// Payment Pages
import CourseCheckoutPage from './pages/Payment/CourseCheckoutPage';
import PaymentSuccessPage from './pages/Payment/PaymentSuccessPage';
import TransactionsPage from './pages/Profile/TransactionsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import SettingsPage from './pages/Settings/SettingsPage';
import NotificationSettingsPage from './pages/Settings/NotificationSettingsPage';

import { StudentProgressPage } from './pages/Progress/StudentProgressPage';
import Chat from './pages/Chat/Chat';
import Tutoring from './pages/Tutoring/Tutoring';

// Demo Components
import { ContentUploadDemo } from './components/Demo/ContentUploadDemo';

// Hooks
import { useAuthStore } from './stores/authStore';
import { socketService } from './services/socketService';

function App() {
  const { isAuthenticated, token, validateToken, logout } = useAuthStore();

  // Validate token on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      if (token && isAuthenticated) {
        try {
          const isValid = await validateToken();
          if (!isValid) {
            console.warn('Token validation failed on app startup, logging out...');
            logout();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          logout();
        }
      }
    };

    initializeAuth();
  }, []); // Run once on app startup

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('Initializing socket connection...');
      socketService.connect()
        .then(() => console.log('Socket connected successfully'))
        .catch(err => console.error('Socket connection failed:', err));
      
      return () => {
        console.log('Disconnecting socket...');
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Toast notifications */}
      <Toaster position="top-right" richColors closeButton />
      
      {/* Token expiration warning */}
      {isAuthenticated && <TokenExpirationWarning />}
      
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
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />

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
        
        {/* Unified Course Detail Route - public, works for everyone */}
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/courses/:courseId/preview" element={<CourseDetailPage />} />

        {/* Payment Routes */}
        <Route
          path="/checkout/:courseId"
          element={
            <ProtectedRoute>
              <CourseCheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/notifications"
          element={
            <ProtectedRoute>
              <NotificationSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

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
          element={<Navigate to="/smart-progress" replace />}
        />
        
        <Route
          path="/smart-progress"
          element={
            <ProtectedRoute>
              <StudentProgressPage />
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

        {/* Phase 2 - Live Sessions */}
        <Route
          path="/live-sessions"
          element={
            <ProtectedRoute>
              <LiveSessionsPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 - Study Groups */}
        <Route
          path="/study-groups"
          element={
            <ProtectedRoute>
              <StudyGroupsPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 - Office Hours */}
        <Route
          path="/office-hours"
          element={
            <ProtectedRoute>
              <OfficeHoursPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2 - Online Users / Presence */}
        <Route
          path="/presence"
          element={
            <ProtectedRoute>
              <PresencePage />
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

        <Route
          path="/my-assessments"
          element={
            <ProtectedRoute>
              <StudentAssessmentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessments/:assessmentId"
          element={
            <ProtectedRoute>
              <AssessmentTakingPage />
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
          path="/instructor/interventions"
          element={
            <ProtectedRoute requireRole="instructor">
              <InterventionDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/video-analytics"
          element={
            <ProtectedRoute requireRole="instructor">
              <VideoAnalyticsPage />
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
          path="/instructor/courses/:courseId/assessments"
          element={
            <ProtectedRoute requireRole="instructor">
              <CourseAssessmentManagementPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/lessons/:lessonId/assessments"
          element={
            <ProtectedRoute requireRole="instructor">
              <AssessmentManagementPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/lessons/:lessonId/assessments/create"
          element={
            <ProtectedRoute requireRole="instructor">
              <AssessmentCreationPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/assessments/:assessmentId/edit"
          element={
            <ProtectedRoute requireRole="instructor">
              <AssessmentEditPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/assessments/:assessmentId/view"
          element={
            <ProtectedRoute requireRole="instructor">
              <AssessmentViewPage />
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
          path="/instructor/analytics-hub"
          element={
            <ProtectedRoute requireRole="instructor">
              <AnalyticsHubPage />
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
        
        <Route
          path="/instructor/assessment-analytics"
          element={
            <ProtectedRoute requireRole="instructor">
              <EnhancedAssessmentAnalyticsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/instructor/student-analytics"
          element={
            <ProtectedRoute requireRole="instructor">
              <InstructorStudentAnalytics />
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
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <App />
    </BrowserRouter>
  );
}

export default AppWrapper;