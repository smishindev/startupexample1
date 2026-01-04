/**
 * LiveSessionCard Component
 * Displays live session information in a card format
 * Phase 2 - Collaborative Features
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Avatar,
  useTheme,
  alpha,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  VideocamOutlined,
  PeopleOutlined,
  ScheduleOutlined,
  PlayArrowOutlined,
  StopOutlined,
  CancelOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@mui/icons-material';
import { LiveSession, SessionStatus } from '../../types/liveSession';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface LiveSessionCardProps {
  session: LiveSession;
  isInstructor?: boolean;
  onJoin?: (sessionId: string) => void;
  onLeave?: (sessionId: string) => void;
  onStart?: (sessionId: string) => void;
  onEnd?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  onEdit?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({
  session,
  isInstructor = false,
  onJoin,
  onLeave,
  onStart,
  onEnd,
  onCancel,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();

  // Format scheduled time with safe date parsing
  const scheduledDate = new Date(session.ScheduledAt);
  const isValidDate = !isNaN(scheduledDate.getTime());
  
  const formattedDate = isValidDate
    ? isToday(scheduledDate)
      ? `Today at ${format(scheduledDate, 'h:mm a')}`
      : isTomorrow(scheduledDate)
      ? `Tomorrow at ${format(scheduledDate, 'h:mm a')}`
      : format(scheduledDate, 'MMM d, yyyy \'at\' h:mm a')
    : 'Invalid date';

  // Status colors
  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.Scheduled:
        return theme.palette.info.main;
      case SessionStatus.InProgress:
        return theme.palette.success.main;
      case SessionStatus.Ended:
        return theme.palette.grey[500];
      case SessionStatus.Cancelled:
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  // Status labels
  const getStatusLabel = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.Scheduled:
        return 'Scheduled';
      case SessionStatus.InProgress:
        return 'Live Now';
      case SessionStatus.Ended:
        return 'Ended';
      case SessionStatus.Cancelled:
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Check if session is full
  const isFull = session.AttendeeCount !== undefined && session.AttendeeCount >= session.Capacity;

  // Check if session can be joined
  const canJoin = session.Status === SessionStatus.InProgress && !isFull;

  // Check if session can be started
  const canStart = session.Status === SessionStatus.Scheduled && isValidDate && !isPast(scheduledDate);

  return (
    <Card
      data-testid="live-session-card"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.3s ease',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      {/* Status Badge */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1,
        }}
      >
        <Chip
          label={getStatusLabel(session.Status)}
          size="small"
          sx={{
            backgroundColor: session.Status === SessionStatus.InProgress 
              ? getStatusColor(session.Status)
              : alpha(getStatusColor(session.Status), 0.1),
            color: session.Status === SessionStatus.InProgress 
              ? 'white'
              : getStatusColor(session.Status),
            fontWeight: 600,
            borderRadius: '8px',
            ...(session.Status === SessionStatus.InProgress && {
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.85 },
              },
            }),
          }}
        />
      </Box>

      {/* Live Indicator for in-progress sessions */}
      {session.Status === SessionStatus.InProgress && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: alpha(theme.palette.error.main, 0.9),
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: '20px',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 },
            },
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'white',
            }}
          />
          <Typography variant="caption" fontWeight={600}>
            LIVE
          </Typography>
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, pt: 6 }}>
        {/* Title */}
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {session.Title}
        </Typography>

        {/* Description */}
        {session.Description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {session.Description}
          </Typography>
        )}

        {/* Course Title */}
        {session.CourseTitle && (
          <Chip
            label={session.CourseTitle}
            size="small"
            variant="outlined"
            sx={{ mb: 2 }}
          />
        )}

        {/* Session Info */}
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {/* Instructor */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 28, height: 28, fontSize: '0.875rem' }}>
              {session.InstructorName?.[0] || 'I'}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {session.InstructorName || 'Instructor'}
            </Typography>
          </Box>

          {/* Schedule */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>

          {/* Duration */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideocamOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {session.Duration} minutes
            </Typography>
          </Box>

          {/* Capacity */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleOutlined fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {session.AttendeeCount || 0} / {session.Capacity} attendees
              {isFull && (
                <Chip
                  label="Full"
                  size="small"
                  color="error"
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Typography>
          </Box>
        </Stack>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {isInstructor ? (
            <>
              {/* Instructor Actions */}
              {canStart && onStart && (
                <Button
                  variant="contained"
                  startIcon={<PlayArrowOutlined />}
                  onClick={() => onStart(session.Id)}
                  fullWidth
                  size="small"
                  data-testid="live-session-start-button"
                >
                  Start Session
                </Button>
              )}

              {session.Status === SessionStatus.InProgress && onEnd && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopOutlined />}
                  onClick={() => onEnd(session.Id)}
                  fullWidth
                  size="small"
                  data-testid="live-session-end-button"
                >
                  End Session
                </Button>
              )}

              {session.Status === SessionStatus.Scheduled && (
                <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                  {onEdit && (
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(session.Id)}
                        sx={{ flex: 1 }}
                        data-testid="live-session-edit-button"
                      >
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onCancel && (
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onCancel(session.Id)}
                        sx={{ flex: 1 }}
                        data-testid="live-session-cancel-button"
                      >
                        <CancelOutlined />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onDelete && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(session.Id)}
                        sx={{ flex: 1 }}
                        data-testid="live-session-delete-button"
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
            </>
          ) : (
            <>
              {/* Student Actions */}
              {session.Status === SessionStatus.InProgress && (
                session.HasJoined ? (
                  // Already joined - show Leave button
                  onLeave && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<StopOutlined />}
                      onClick={() => onLeave(session.Id)}
                      fullWidth
                      size="small"
                      data-testid="live-session-leave-button"
                    >
                      Leave Session
                    </Button>
                  )
                ) : (
                  // Not joined yet - show Join button (if not full)
                  canJoin && onJoin && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowOutlined />}
                      onClick={() => onJoin(session.Id)}
                      fullWidth
                      size="small"
                      data-testid="live-session-join-button"
                    >
                      Join Session
                    </Button>
                  )
                )
              )}

              {session.Status === SessionStatus.Scheduled && isValidDate && !isPast(scheduledDate) && (
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  disabled
                >
                  Not Started Yet
                </Button>
              )}

              {isFull && session.Status !== SessionStatus.Ended && (
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  disabled
                >
                  Session Full
                </Button>
              )}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
