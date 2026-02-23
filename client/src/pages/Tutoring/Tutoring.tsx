import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  TextField,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { PageContainer } from '../../components/Responsive/PageContainer';
import { PageTitle } from '../../components/Responsive/PageTitle';
import { useResponsive } from '../../components/Responsive/useResponsive';
import { formatDistanceToNow } from 'date-fns';
import { 
  tutoringApi, 
  TutoringSession, 
  TutoringMessage, 
  CreateSessionRequest 
} from '../../services/tutoringApi';
import { coursesApi, Course } from '../../services/coursesApi';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { CourseSelector } from '../../components/Common/CourseSelector';

const Tutoring: React.FC = () => {
  const [sessions, setSessions] = useState<TutoringSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TutoringSession | null>(null);
  const [messages, setMessages] = useState<TutoringMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState<CreateSessionRequest>({
    title: '',
    subject: 'General',
    courseId: undefined
  });
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini'); // Default model
  const [, setCurrentTime] = useState(Date.now()); // For auto-updating relative timestamps
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  // Available AI models with descriptions
  const availableModels = [
    { value: 'gpt-4o', label: 'GPT-4 Turbo', description: 'Most capable, best for complex problems' },
    { value: 'gpt-4o-mini', label: 'GPT-4 Mini', description: 'Balanced performance and speed (recommended)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for simple queries' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadSessions();
    loadRecommendations();
    loadEnrolledCourses();
  }, []);

  // Auto-update relative timestamps every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.Id);
      // Reset model selection and clear stale suggestions when switching sessions
      setSelectedModel('gpt-4o-mini');
      setCurrentSuggestions([]);
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = async () => {
    try {
      const sessionsData = await tutoringApi.getSessions();
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !selectedSession && !isMobile) {
        setSelectedSession(sessionsData[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // Only show error if we have sessions (indicates real error, not empty state)
      if (sessions.length > 0) {
        setError('Failed to load tutoring sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const messagesData = await tutoringApi.getMessages(sessionId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await tutoringApi.getRecommendations();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadEnrolledCourses = async () => {
    try {
      const courses = await coursesApi.getEnrolledCourses();
      setEnrolledCourses(courses);
    } catch (error) {
      console.error('Failed to load enrolled courses:', error);
      // Non-critical error - user can still use General option
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || sending) return;

    setSending(true);
    try {
      const response = await tutoringApi.sendMessage(selectedSession.Id, {
        content: newMessage.trim(),
        model: selectedModel // Send selected AI model
      });

      // Add both user and AI messages to the display
      setMessages(prev => [...prev, response.userMessage, response.aiMessage]);
      setNewMessage('');
      
      // Update current suggestions from AI response
      if (response.aiMessage.suggestions) {
        setCurrentSuggestions(response.aiMessage.suggestions);
      }
      
      // Update session in list
      setSessions(prev => 
        prev.map(s => 
          s.Id === selectedSession.Id 
            ? { ...s, UpdatedAt: response.aiMessage.CreatedAt, MessageCount: s.MessageCount + 2 }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      const newSession = await tutoringApi.createSession(newSessionData);
      setSessions(prev => [newSession, ...prev]);
      setSelectedSession(newSession);
      setCreateSessionOpen(false);
      setNewSessionData({ title: '', subject: 'General', courseId: undefined });
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create session');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectSession = (session: TutoringSession) => {
    setSelectedSession(session);
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setMessages([]);
  };

  const formatMessageContent = (content: string) => {
    // Simple formatting for code blocks
    const parts = content.split('```');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <Box
            key={index}
            component="pre"
            sx={{
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              my: 1
            }}
          >
            {part}
          </Box>
        );
      }
      return (
        <Typography key={index} variant="body1" component="span" sx={{ whiteSpace: 'pre-wrap' }}>
          {part}
        </Typography>
      );
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <PageContainer maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <PageContainer maxWidth="xl" sx={{ flex: 1 }}>
        <PageTitle
          icon={<AIIcon color="primary" />}
          gutterBottom
        >
          AI Tutoring
        </PageTitle>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sessions Sidebar - hidden on mobile when a session is selected */}
        {(!isMobile || !selectedSession) && (
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: { xs: 'calc(100vh - 240px)', md: '70vh' }, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Tutoring Sessions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setCreateSessionOpen(true)}
                  size="small"
                  data-testid="tutoring-create-session-button"
                >
                  New
                </Button>
              </Box>
            </Box>
            
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {sessions.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    No tutoring sessions yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Start a new session to get AI-powered help with your learning!
                  </Typography>
                </Box>
              ) : (
                sessions.map((session) => (
                  <ListItem key={session.Id} disablePadding>
                    <ListItemButton
                      selected={selectedSession?.Id === session.Id}
                      onClick={() => handleSelectSession(session)}
                      data-testid={`tutoring-session-item-${session.Id}`}
                    >
                      <ListItemIcon>
                        <ChatIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={session.Title}
                        secondary={
                          <React.Fragment>
                            <Typography variant="caption" display="block" component="span">
                              {session.MessageCount} messages
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="span">
                              {formatDistanceToNow(new Date(session.UpdatedAt), { addSuffix: true })}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>

          {/* Recommendations */}
          <Card sx={{ mt: { xs: 2, md: 3 } }}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightbulbIcon color="primary" />
                Learning Recommendations
              </Typography>
              {recommendations.map((rec, index) => (
                <Chip
                  key={index}
                  label={rec}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </CardContent>
          </Card>
        </Grid>
        )}

        {/* Chat Area - hidden on mobile when no session selected */}
        {(!isMobile || selectedSession) && (
        <Grid item xs={12} md={8}>
          {selectedSession ? (
            <Paper sx={{ height: { xs: 'calc(100vh - 200px)', md: '70vh' }, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {isMobile && (
                      <IconButton onClick={handleBackToSessions} size="small" edge="start">
                        <ArrowBackIcon />
                      </IconButton>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" noWrap>{selectedSession.Title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        AI-powered learning assistance
                      </Typography>
                    </Box>
                  </Box>
                  <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 200 } }}>
                    <InputLabel>AI Model</InputLabel>
                    <Select
                      value={selectedModel}
                      label="AI Model"
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {availableModels.map((model) => (
                        <MenuItem key={model.value} value={model.value}>
                          <Box>
                            <Typography variant="body2">{model.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {model.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AIIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Start a conversation with your AI tutor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ask questions, request explanations, or get help with coding problems
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message) => (
                    <Box
                      key={message.Id}
                      sx={{
                        display: 'flex',
                        mb: 2,
                        justifyContent: message.Role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <Box sx={{ display: 'flex', maxWidth: { xs: '90%', sm: '80%' }, alignItems: 'flex-start' }}>
                        {message.Role === 'ai' && (
                          <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                            <AIIcon />
                          </Avatar>
                        )}
                        <Paper
                          sx={{
                            p: 2,
                            bgcolor: message.Role === 'user' ? 'primary.main' : 'grey.100',
                            color: message.Role === 'user' ? 'primary.contrastText' : 'text.primary'
                          }}
                        >
                          {formatMessageContent(message.Content)}
                          <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
                            {formatDistanceToNow(new Date(message.CreatedAt), { addSuffix: true })}
                          </Typography>
                        </Paper>
                        {message.Role === 'user' && (
                          <Avatar sx={{ ml: 1, bgcolor: 'secondary.main' }}>
                            <PersonIcon />
                          </Avatar>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                {/* Quick Suggestions */}
                {currentSuggestions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Quick suggestions:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {currentSuggestions.map((suggestion, index) => (
                        <Chip
                          key={index}
                          label={suggestion}
                          variant="outlined"
                          size="small"
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Ask your AI tutor anything..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    data-testid="tutoring-message-input"
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    color="primary"
                    data-testid="tutoring-send-button"
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ height: { xs: 'calc(100vh - 200px)', md: '70vh' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a tutoring session to start learning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new session or continue an existing conversation
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
        )}
      </Grid>

      {/* Create Session Dialog */}
      <Dialog open={createSessionOpen} onClose={() => setCreateSessionOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile} disableEnforceFocus>
        <DialogTitle>Start New Tutoring Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Title"
            fullWidth
            variant="outlined"
            value={newSessionData.title}
            onChange={(e) => setNewSessionData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., JavaScript Help, React Questions"
            sx={{ mb: 2 }}
          />
          <CourseSelector
            courses={enrolledCourses}
            value={newSessionData.courseId || ''}
            onChange={(id: string) => {
              const courseId = id || undefined;
              const course = enrolledCourses.find(c => c.Id === courseId);
              setNewSessionData(prev => ({
                ...prev,
                courseId,
                subject: course ? course.Title : 'General',
                title: prev.title || (course ? `Help with ${course.Title}` : '')
              }));
            }}
            allOption={{ value: '', label: 'General Question' }}
            label="Course"
            placeholder="Search enrolled courses..."
            testId="tutoring-course-select"
            renderCourseOption={(props, option) => {
              // "General Question" option
              if (option.Id === '') {
                return (
                  <li {...props} key="general-question">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <AIIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>General Question</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Not related to a specific course
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                );
              }
              // Course options with icon and subtext
              const raw = option._raw as Course | undefined;
              return (
                <li {...props} key={option.Id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <SchoolIcon fontSize="small" color="primary" />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{option.Title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {raw?.Level || ''} · {raw?.Category || ''}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              );
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSessionOpen(false)} data-testid="tutoring-dialog-cancel-button">Cancel</Button>
          <Button onClick={handleCreateSession} variant="contained" data-testid="tutoring-dialog-create-button">Create Session</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
    </Box>
  );
};

export default Tutoring;