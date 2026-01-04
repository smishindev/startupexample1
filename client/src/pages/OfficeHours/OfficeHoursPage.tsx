/**
 * Office Hours Page
 * Main page for office hours scheduling and queue management
 * Role-based view: Instructors manage schedules, Students join queue
 */

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Queue as QueueIcon,
  Person as StudentIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import ScheduleManagement from '../../components/OfficeHours/ScheduleManagement';
import QueueDisplay from '../../components/OfficeHours/QueueDisplay';
import StudentQueueJoin from '../../components/OfficeHours/StudentQueueJoin';
import { useOfficeHoursSocket } from '../../hooks/useOfficeHoursSocket.js';

const OfficeHoursPage: React.FC = () => {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');

  const isInstructor = user?.role === 'instructor';

  // Connect to Socket.IO for real-time updates
  useOfficeHoursSocket({
    instructorId: isInstructor ? user?.id : null,
    onQueueUpdated: () => {
      setRefreshKey(prev => prev + 1);
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!user) {
    return (
      <>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">
            You must be logged in to access office hours.
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Office Hours
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isInstructor
              ? 'Manage your office hours schedule and help students in your queue'
              : 'Join office hours queue to get help from instructors'}
          </Typography>
        </Box>

        {/* Instructor View */}
        {isInstructor && (
          <>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab icon={<ScheduleIcon />} label="My Schedule" iconPosition="start" data-testid="office-hours-schedule-tab" />
              <Tab icon={<QueueIcon />} label="Current Queue" iconPosition="start" data-testid="office-hours-queue-tab" />
            </Tabs>

            {/* Schedule Management Tab */}
            {tabValue === 0 && (
              <ScheduleManagement
                instructorId={user.id}
                onScheduleUpdate={handleDataUpdate}
              />
            )}

            {/* Queue Display Tab */}
            {tabValue === 1 && (
              <QueueDisplay
                key={refreshKey}
                instructorId={user.id}
                isInstructor={true}
                onQueueUpdate={handleDataUpdate}
              />
            )}
          </>
        )}

        {/* Student View */}
        {!isInstructor && (
          <>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
              <Tab icon={<StudentIcon />} label="Join Queue" iconPosition="start" data-testid="office-hours-join-tab" />
              <Tab icon={<QueueIcon />} label="View Queues" iconPosition="start" data-testid="office-hours-view-queues-tab" />
            </Tabs>

            {/* Join Queue Tab */}
            {tabValue === 0 && (
              <StudentQueueJoin
                key={selectedInstructor} // Preserve state when switching tabs
                selectedInstructor={selectedInstructor}
                onInstructorChange={setSelectedInstructor}
                onQueueJoined={handleDataUpdate}
              />
            )}

            {/* View All Queues Tab (for transparency) */}
            {tabValue === 1 && (
              <>
                {selectedInstructor ? (
                  <QueueDisplay
                    key={`${refreshKey}-${selectedInstructor}`}
                    instructorId={selectedInstructor}
                    isInstructor={false}
                    onQueueUpdate={handleDataUpdate}
                  />
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Select an instructor from the "Join Queue" tab to see their current queue status.
                  </Alert>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default OfficeHoursPage;
