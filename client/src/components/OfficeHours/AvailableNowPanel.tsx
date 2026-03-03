/**
 * Available Now Panel
 * Shows instructors whose office hours are live right now,
 * with online/offline status, queue stats, and quick-join buttons.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Stack,
  Alert,
  Skeleton
} from '@mui/material';
import {
  AccessTime as ClockIcon,
  People as PeopleIcon,
  Circle as CircleIcon,
  HourglassTop as WaitingIcon,
  CheckCircle as AdmittedIcon
} from '@mui/icons-material';
import { officeHoursApi } from '../../services/officeHoursApi';
import { AvailableInstructor, formatTime } from '../../types/officeHours';
import { useResponsive } from '../Responsive';
import { cardSx } from '../../theme/tokens';

interface AvailableNowPanelProps {
  onJoinQueue?: (instructorId: string) => void;
}

const AvailableNowPanel: React.FC<AvailableNowPanelProps> = ({ onJoinQueue }) => {
  const { isMobile } = useResponsive();
  const [instructors, setInstructors] = useState<AvailableInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvailable();
    // Refresh every 60 seconds
    const interval = setInterval(loadAvailable, 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadAvailable = async () => {
    try {
      setError(null);
      const data = await officeHoursApi.getAvailableNow();
      setInstructors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        {[1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  if (instructors.length === 0) {
    return (
      <Card sx={{ ...cardSx }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <ClockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No instructors available right now
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check back during scheduled office hours, or use the "Join Queue" tab to see all instructor schedules.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Alert severity="success" sx={{ mb: 2 }}>
        {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} available right now!
      </Alert>

      <Stack spacing={2}>
        {instructors.map((inst) => (
          <Card key={`${inst.InstructorId}-${inst.ScheduleId}`} sx={{ ...cardSx }}>
            <CardContent>
              <Box display="flex" gap={2} alignItems={isMobile ? 'flex-start' : 'center'} flexDirection={isMobile ? 'column' : 'row'}>
                {/* Avatar + Info */}
                <Box display="flex" gap={2} alignItems="center" flex={1}>
                  <Box position="relative">
                    <Avatar
                      src={inst.InstructorAvatar || undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      {inst.InstructorName?.charAt(0)}
                    </Avatar>
                    <CircleIcon
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        fontSize: 14,
                        color: inst.PresenceStatus === 'online' ? 'success.main' : 'text.disabled',
                        backgroundColor: 'background.paper',
                        borderRadius: '50%'
                      }}
                    />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {inst.InstructorName}
                    </Typography>
                    {inst.CourseName && (
                      <Typography variant="body2" color="primary.main">
                        {inst.CourseName}
                      </Typography>
                    )}
                    {inst.Description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {inst.Description}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Stats */}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    icon={<ClockIcon />}
                    label={`${formatTime(inst.StartTime)} – ${formatTime(inst.EndTime)}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${inst.WaitingCount} waiting`}
                    size="small"
                    color={inst.WaitingCount === 0 ? 'success' : 'warning'}
                  />
                  {inst.AvgWaitTime != null && (
                    <Chip
                      label={`~${inst.AvgWaitTime} min wait`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {/* Action — context-aware based on student's current queue status */}
                {inst.StudentQueueStatus === 'admitted' ? (
                  <Button
                    variant="contained"
                    color="success"
                    size={isMobile ? 'small' : 'medium'}
                    fullWidth={isMobile}
                    startIcon={<AdmittedIcon />}
                    onClick={() => onJoinQueue?.(inst.InstructorId)}
                    sx={{ textTransform: 'none', borderRadius: (t: any) => `${t.custom.radii.md}px`, whiteSpace: 'nowrap' }}
                  >
                    You're Admitted!
                  </Button>
                ) : inst.StudentQueueStatus === 'waiting' ? (
                  <Chip
                    icon={<WaitingIcon />}
                    label="In Queue"
                    color="warning"
                    size={isMobile ? 'small' : 'medium'}
                    onClick={() => onJoinQueue?.(inst.InstructorId)}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  />
                ) : (
                  <Button
                    variant="contained"
                    size={isMobile ? 'small' : 'medium'}
                    fullWidth={isMobile}
                    onClick={() => onJoinQueue?.(inst.InstructorId)}
                    sx={{ textTransform: 'none', borderRadius: (t: any) => `${t.custom.radii.md}px`, whiteSpace: 'nowrap' }}
                  >
                    Join Queue
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default AvailableNowPanel;
