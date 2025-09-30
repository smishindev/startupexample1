import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
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
  Chat as ChatIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { 
  tutoringApi, 
  TutoringSession, 
  TutoringMessage, 
  CreateSessionRequest 
} from '../../services/tutoringApi';

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
    subject: 'General'
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadSessions();
    loadRecommendations();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.Id);
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSessions = async () => {
    try {
      const sessionsData = await tutoringApi.getSessions();
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !selectedSession) {
        setSelectedSession(sessionsData[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError('Failed to load tutoring sessions');
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || sending) return;

    setSending(true);
    try {
      const response = await tutoringApi.sendMessage(selectedSession.Id, {
        content: newMessage.trim()
      });

      // Add both user and AI messages to the display
      setMessages(prev => [...prev, response.userMessage, response.aiMessage]);
      setNewMessage('');
      
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
      setNewSessionData({ title: '', subject: 'General' });
    } catch (error) {
      console.error('Failed to create session:', error);
      setError('Failed to create session');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
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
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AIIcon color="primary" />
        AI Tutoring
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sessions Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Tutoring Sessions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setCreateSessionOpen(true)}
                  size="small"
                >
                  New
                </Button>
              </Box>
            </Box>
            
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {sessions.map((session) => (
                <ListItem key={session.Id} disablePadding>
                  <ListItemButton
                    selected={selectedSession?.Id === session.Id}
                    onClick={() => setSelectedSession(session)}
                  >
                    <ListItemIcon>
                      <ChatIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={session.Title}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {session.MessageCount} messages
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(session.UpdatedAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Recommendations */}
          <Card sx={{ mt: 3 }}>
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

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          {selectedSession ? (
            <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">{selectedSession.Title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  AI-powered learning assistance
                </Typography>
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
                      <Box sx={{ display: 'flex', maxWidth: '80%', alignItems: 'flex-start' }}>
                        {message.Role === 'assistant' && (
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
                  />
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    color="primary"
                  >
                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      </Grid>

      {/* Create Session Dialog */}
      <Dialog open={createSessionOpen} onClose={() => setCreateSessionOpen(false)} maxWidth="sm" fullWidth>
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
          <FormControl fullWidth variant="outlined">
            <InputLabel>Subject</InputLabel>
            <Select
              value={newSessionData.subject}
              label="Subject"
              onChange={(e) => setNewSessionData(prev => ({ ...prev, subject: e.target.value }))}
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="JavaScript">JavaScript</MenuItem>
              <MenuItem value="React">React</MenuItem>
              <MenuItem value="Python">Python</MenuItem>
              <MenuItem value="CSS">CSS</MenuItem>
              <MenuItem value="Node.js">Node.js</MenuItem>
              <MenuItem value="Database">Database</MenuItem>
              <MenuItem value="Algorithms">Algorithms</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSessionOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSession} variant="contained">Create Session</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Tutoring;