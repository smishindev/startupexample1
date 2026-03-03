/**
 * Session History Panel
 * Shows completed office hours sessions for both students and instructors.
 * Reused on both student and instructor tabs.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Collapse,
  TextField,
  Button,
  Skeleton
} from '@mui/material';
import {
  History as HistoryIcon,
  Chat as ChatIcon,
  NoteAdd as NoteIcon,
  School as CourseIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { officeHoursApi } from '../../services/officeHoursApi';
import { SessionHistory } from '../../types/officeHours';
import { useAuthStore } from '../../stores/authStore';
import { cardSx } from '../../theme/tokens';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SessionHistoryPanel: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const isInstructor = user?.role === 'instructor';

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setError(null);
      const data = await officeHoursApi.getSessionHistory(30);
      setSessions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (sessionId: string) => {
    if (!notesText.trim()) return;
    try {
      setSavingNotes(true);
      await officeHoursApi.addSessionNotes(sessionId, notesText.trim());
      toast.success('Notes saved');
      setExpandedId(null);
      setNotesText('');
      loadHistory();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleExpand = (id: string, existingNotes?: string | null) => {
    if (expandedId === id) {
      setExpandedId(null);
      setNotesText('');
    } else {
      setExpandedId(id);
      setNotesText(existingNotes || '');
    }
  };

  if (loading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (sessions.length === 0) {
    return (
      <Card sx={{ ...cardSx }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No session history yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Completed office hours sessions will appear here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {sessions.map((session) => (
        <Card key={session.Id} sx={{ ...cardSx }}>
          <CardContent sx={{ pb: expandedId === session.Id ? 1 : undefined }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} gap={1}>
              <Box flex={1} minWidth={0}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {isInstructor ? session.StudentName : session.InstructorName}
                </Typography>
                {session.CourseName && (
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <CourseIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                    <Typography variant="caption" color="primary.main">
                      {session.CourseName}
                      {session.LessonTitle && ` > ${session.LessonTitle}`}
                    </Typography>
                  </Stack>
                )}
                {session.Question && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Q: {session.Question}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} sx={{ mt: { xs: 0.5, sm: 0 } }}>
                {session.DurationMinutes != null && (
                  <Chip
                    icon={<TimerIcon />}
                    label={`${session.DurationMinutes} min`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {session.CompletedAt && (
                  <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(session.CompletedAt), { addSuffix: true })}
                  </Typography>
                )}
              </Stack>
            </Box>

            {/* Instructor notes display */}
            {session.InstructorNotes && expandedId !== session.Id && (
              <Typography variant="body2" sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'primary.200', color: 'text.secondary' }}>
                {session.InstructorNotes}
              </Typography>
            )}

            {/* Action row */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {session.ChatRoomId && (
                <Button
                  size="small"
                  startIcon={<ChatIcon />}
                  onClick={() => navigate('/chat', { state: { roomId: session.ChatRoomId } })}
                  sx={{ textTransform: 'none' }}
                >
                  View Chat
                </Button>
              )}
              {isInstructor && (
                <Button
                  size="small"
                  startIcon={<NoteIcon />}
                  onClick={() => toggleExpand(session.Id, session.InstructorNotes)}
                  sx={{ textTransform: 'none' }}
                >
                  {session.InstructorNotes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              )}
            </Stack>
          </CardContent>

          {/* Expandable notes editor for instructor */}
          {isInstructor && (
            <Collapse in={expandedId === session.Id}>
              <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Add notes about this session..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    size="small"
                    onClick={() => { setExpandedId(null); setNotesText(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleSaveNotes(session.Id)}
                    disabled={savingNotes || !notesText.trim()}
                  >
                    {savingNotes ? <CircularProgress size={16} /> : 'Save Notes'}
                  </Button>
                </Stack>
              </Box>
            </Collapse>
          )}
        </Card>
      ))}
    </Stack>
  );
};

export default SessionHistoryPanel;
