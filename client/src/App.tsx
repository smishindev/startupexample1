import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'

// Layout Components (will create these)
import Layout from './components/Layout/Layout'
import PublicLayout from './components/Layout/PublicLayout'

// Auth Components
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Main Pages
import Dashboard from './pages/Dashboard/Dashboard'
import Courses from './pages/Courses/Courses'
import CourseDetail from './pages/Courses/CourseDetail'
import Lesson from './pages/Lessons/Lesson'
import Profile from './pages/Profile/Profile'
import Analytics from './pages/Analytics/Analytics'
import Tutoring from './pages/Tutoring/Tutoring'
import Chat from './pages/Chat/Chat'

// Landing Page
import LandingPage from './pages/Landing/LandingPage'

// Protected Route Component
import ProtectedRoute from './components/Auth/ProtectedRoute'

// Hooks
import { useAuthStore } from './store/authStore'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="lessons/:id" element={<Lesson />} />
          <Route path="profile" element={<Profile />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="tutoring" element={<Tutoring />} />
          <Route path="chat" element={<Chat />} />
        </Route>

        {/* Fallback redirect */}
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Box>
  )
}

export default App