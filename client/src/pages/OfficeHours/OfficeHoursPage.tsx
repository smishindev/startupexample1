/**
 * Office Hours Page
 * Smart, course-aware office hours with chat integration
 * Student: Available Now → Join Queue → History
 * Instructor: Schedule Management → Queue Dashboard → History
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Queue as QueueIcon,
  History as HistoryIcon,
  Wifi as LiveIcon,
  AccessTime as ClockIcon
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import ScheduleManagement from '../../components/OfficeHours/ScheduleManagement';
import QueueDisplay from '../../components/OfficeHours/QueueDisplay';
import StudentQueueJoin from '../../components/OfficeHours/StudentQueueJoin';
import AvailableNowPanel from '../../components/OfficeHours/AvailableNowPanel';
import SessionHistoryPanel from '../../components/OfficeHours/SessionHistoryPanel';
import { useOfficeHoursSocket } from '../../hooks/useOfficeHoursSocket.js';

const OfficeHoursPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isMobile } = useResponsive();
  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | undefined>();

  const isInstructor = user?.role === 'instructor';

  // Connect to Socket.IO for real-time updates
  useOfficeHoursSocket({
    instructorId: isInstructor ? user?.id : null,
    onQueueUpdated: () => {
      setRefreshKey(prev => prev + 1);
    },
    onScheduleChanged: () => {
      setRefreshKey(prev => prev + 1);
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDataUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  if (!user) {
    return (
      <>
        <Header />
        <PageContainer maxWidth="lg" disableBottomPad>
          <Alert severity="error">
            You must be logged in to access office hours.
          </Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <PageContainer maxWidth="lg">
        {/* Page Header */}
        <Box mb={{ xs: 2, sm: 4 }}>
          <PageTitle icon={<ClockIcon />}>
            Office Hours
          </PageTitle>
          <Typography variant="body1" color="text.secondary">
            {isInstructor
              ? 'Manage your office hours schedule and help students'
              : 'Get live help from your instructors'}
          </Typography>
        </Box>

        {/* Instructor View */}
        {isInstructor && (
          <>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant={isMobile ? 'scrollable' : 'fullWidth'}
              scrollButtons="auto"
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<ScheduleIcon />} label="My Schedule" iconPosition="start" data-testid="office-hours-schedule-tab" />
              <Tab icon={<QueueIcon />} label="Current Queue" iconPosition="start" data-testid="office-hours-queue-tab" />
              <Tab icon={<HistoryIcon />} label="History" iconPosition="start" data-testid="office-hours-history-tab" />
            </Tabs>

            {tabValue === 0 && (
              <ScheduleManagement
                instructorId={user.id}
                onScheduleUpdate={handleDataUpdate}
              />
            )}
            {tabValue === 1 && (
              <QueueDisplay
                key={refreshKey}
                instructorId={user.id}
                isInstructor={true}
                onQueueUpdate={handleDataUpdate}
              />
            )}
            {tabValue === 2 && (
              <SessionHistoryPanel key={refreshKey} />
            )}
          </>
        )}

        {/* Student View */}
        {!isInstructor && (
          <>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant={isMobile ? 'scrollable' : 'fullWidth'}
              scrollButtons="auto"
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<LiveIcon />} label="Available Now" iconPosition="start" data-testid="office-hours-available-tab" />
              <Tab icon={<QueueIcon />} label="Join Queue" iconPosition="start" data-testid="office-hours-join-tab" />
              <Tab icon={<HistoryIcon />} label="History" iconPosition="start" data-testid="office-hours-history-tab" />
            </Tabs>

            {tabValue === 0 && (
              <AvailableNowPanel
                key={refreshKey}
                onJoinQueue={(instructorId) => {
                  setSelectedInstructorId(instructorId);
                  setTabValue(1);
                  handleDataUpdate();
                }}
              />
            )}
            {tabValue === 1 && (
              <StudentQueueJoin
                key={refreshKey}
                selectedInstructor={selectedInstructorId}
                onQueueJoined={handleDataUpdate}
              />
            )}
            {tabValue === 2 && (
              <SessionHistoryPanel key={refreshKey} />
            )}
          </>
        )}
      </PageContainer>
    </>
  );
};

export default OfficeHoursPage;
