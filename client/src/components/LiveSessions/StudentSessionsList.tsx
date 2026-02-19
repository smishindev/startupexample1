/**
 * StudentSessionsList Component
 * Browse and join available live sessions
 * Phase 2 - Collaborative Features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { toast } from 'sonner';
import { LiveSessionCard } from './LiveSessionCard';
import { getSessionsByCourse, joinSession, leaveSession } from '../../services/liveSessionsApi';
import { LiveSession, SessionStatus } from '../../types/liveSession';
import { useLiveSessionSocket } from '../../hooks/useLiveSessionSocket';
import { CourseSelector } from '../Common/CourseSelector';

interface Course {
  Id: string;
  Title: string;
}

interface StudentSessionsListProps {
  enrolledCourses?: Course[];
}

export const StudentSessionsList: React.FC<StudentSessionsListProps> = ({
  enrolledCourses = [],
}) => {
  const theme = useTheme();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Fetch sessions
  const fetchSessions = async (courseId?: string) => {
    if (!courseId || courseId === 'all') {
      // For "all courses", fetch sessions from each enrolled course
      if (enrolledCourses.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const allSessions = await Promise.all(
          enrolledCourses
            .filter(course => course.Id) // Only fetch for courses with valid IDs
            .map((course) => getSessionsByCourse(course.Id))
        );
        
        // Flatten and deduplicate
        const flatSessions = allSessions.flat();
        const uniqueSessions = Array.from(
          new Map(flatSessions.map((s) => [s.Id, s])).values()
        );
        
        setSessions(uniqueSessions);
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        setError('');
        const data = await getSessionsByCourse(courseId);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSessions(selectedCourse);
  }, [selectedCourse, enrolledCourses]);

  // Setup Socket.IO listeners for real-time updates
  useLiveSessionSocket({
    onSessionCreated: (data) => {
      // Refresh sessions if the new session is for a course the student is enrolled in
      const isEnrolledInCourse = enrolledCourses.some(course => course.Id === data.courseId);
      if (isEnrolledInCourse) {
        toast.info(`New session: ${data.title}`);
        fetchSessions(selectedCourse);
      }
    },
    onSessionCancelled: (data) => {
      // Remove cancelled session from list or update status
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, Status: SessionStatus.Cancelled }
            : s
        )
      );
      toast.warning(`Session cancelled: ${data.title}`);
    },
    onSessionUpdated: (data) => {
      // Update session details in the list
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { 
                ...s, 
                Title: data.updates.title ?? s.Title,
                Description: data.updates.description ?? s.Description,
                ScheduledAt: data.updates.scheduledAt ?? s.ScheduledAt,
                Duration: data.updates.duration ?? s.Duration,
                Capacity: data.updates.capacity ?? s.Capacity,
                StreamUrl: data.updates.streamUrl ?? s.StreamUrl,
                Materials: data.updates.materials ?? s.Materials
              }
            : s
        )
      );
      toast.info('A session has been updated');
    },
    onSessionStarted: (data) => {
      // Update session status to in-progress
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, Status: SessionStatus.InProgress, StartedAt: data.startedAt }
            : s
        )
      );
      toast.info('A session has started!');
    },
    onSessionEnded: (data) => {
      // Update session status to ended and reset attendee count
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, Status: SessionStatus.Ended, EndedAt: data.endedAt, AttendeeCount: 0 }
            : s
        )
      );
      toast.info(`Session ended: ${data.title || 'Live session has ended'}`);
    },
    onSessionDeleted: (data) => {
      // Remove session from list
      setSessions((prev) => prev.filter((s) => s.Id !== data.sessionId));
      toast.info(`Session deleted: ${data.title || 'A session has been deleted'}`);
    },
    onAttendeeJoined: (data) => {
      // Update attendee count
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, AttendeeCount: (s.AttendeeCount || 0) + 1 }
            : s
        )
      );
    },
    onAttendeeLeft: (data) => {
      // Update attendee count
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === data.sessionId
            ? { ...s, AttendeeCount: Math.max((s.AttendeeCount || 1) - 1, 0) }
            : s
        )
      );
    },
  });

  // Filter sessions by status
  const filteredSessions = sessions.filter((session) => {
    switch (activeTab) {
      case 0: // All
        return true;
      case 1: // Upcoming
        return session.Status === SessionStatus.Scheduled;
      case 2: // Live Now
        return session.Status === SessionStatus.InProgress;
      case 3: // Past
        return session.Status === SessionStatus.Ended;
      default:
        return true;
    }
  });

  // Handle join session
  const handleJoin = async (sessionId: string) => {
    try {
      await joinSession(sessionId);
      // Update local state to mark as joined
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === sessionId
            ? { ...s, HasJoined: true, AttendeeCount: (s.AttendeeCount || 0) + 1 }
            : s
        )
      );
      toast.success('Successfully joined session!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join session');
    }
  };

  // Handle leave session
  const handleLeave = async (sessionId: string) => {
    try {
      await leaveSession(sessionId);
      // Update local state to mark as not joined
      setSessions((prev) =>
        prev.map((s) =>
          s.Id === sessionId
            ? { ...s, HasJoined: false, AttendeeCount: Math.max((s.AttendeeCount || 1) - 1, 0) }
            : s
        )
      );
      toast.success('Left session');
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave session');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Live Sessions
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Join live sessions from your enrolled courses
        </Typography>
      </Box>

      {/* Course Filter - Autocomplete with lazy loading */}
      {enrolledCourses.length > 0 && (
        <CourseSelector
          courses={enrolledCourses}
          value={selectedCourse}
          onChange={(id: string) => setSelectedCourse(id || 'all')}
          allOption={{ value: 'all', label: 'All Courses' }}
          size="small"
          placeholder="Filter by course..."
          sx={{ mb: 3, minWidth: 250 }}
          testId="live-sessions-student-course-autocomplete"
          inputTestId="live-sessions-student-course-autocomplete-input"
        />
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        data-testid="live-sessions-student-tabs"
        sx={{
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tab label="All" data-testid="live-sessions-student-tab-all" />
        <Tab label="Upcoming" data-testid="live-sessions-student-tab-upcoming" />
        <Tab 
          label="Live Now" 
          data-testid="live-sessions-student-tab-live"
          sx={{
            color: activeTab === 2 ? theme.palette.error.main : undefined,
            '&.Mui-selected': {
              color: theme.palette.error.main,
            },
          }}
        />
        <Tab label="Past" data-testid="live-sessions-student-tab-past" />
      </Tabs>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : enrolledCourses.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2,
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            No Enrolled Courses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enroll in courses to see their live sessions
          </Typography>
        </Box>
      ) : filteredSessions.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            backgroundColor: alpha(theme.palette.primary.main, 0.02),
            borderRadius: 2,
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Typography variant="h6" gutterBottom>
            {activeTab === 0
              ? 'No sessions available'
              : activeTab === 1
              ? 'No upcoming sessions'
              : activeTab === 2
              ? 'No live sessions right now'
              : 'No past sessions'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedCourse === 'all'
              ? 'Check back later for new sessions'
              : 'Instructors will schedule sessions for this course'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredSessions.map((session) => (
            <Grid item xs={12} sm={6} md={4} key={session.Id}>
              <LiveSessionCard
                session={session}
                isInstructor={false}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
