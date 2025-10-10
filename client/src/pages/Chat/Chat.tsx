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
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid
} from '@mui/material';
import {
  Send as SendIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  EmojiEmotions as EmojiIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { chatApi, ChatRoom, ChatMessage, CreateRoomRequest } from '../../services/chatApi';
import { socketService, SocketMessage, TypingUser } from '../../services/socketService';
import { useAuthStore } from '../../stores/authStore';
import { Header } from '../../components/Navigation/Header';

const Chat: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomData, setNewRoomData] = useState<CreateRoomRequest>({ name: '' });
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuthStore();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat rooms
  const loadRooms = async () => {
    try {
      const roomsData = await chatApi.getRooms();
      setRooms(roomsData);
      if (roomsData.length > 0 && !selectedRoom) {
        setSelectedRoom(roomsData[0]);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setError('Failed to load chat rooms');
    }
  };

  // Load messages for selected room
  const loadMessages = async (roomId: string) => {
    try {
      // Loading messages for room
      const messagesData = await chatApi.getMessages(roomId);
      // Loaded messages successfully
      
      // Check for duplicates in loaded data
      const duplicates = messagesData.filter((msg, index, arr) => 
        arr.findIndex(m => m.Content === msg.Content && m.UserId === msg.UserId) !== index
      );
      if (duplicates.length > 0) {
        console.warn(`⚠️ Found ${duplicates.length} duplicate messages in database:`, duplicates);
      }
      
      setMessages(messagesData);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    }
  };

  // Send message
  const handleSendMessage = async () => {
    console.log(`🚀 handleSendMessage called - sending: ${sending}, newMessage: "${newMessage.trim()}"`);
    
    if (!newMessage.trim() || !selectedRoom) {
      console.log('❌ Aborting - no message or no room');
      return;
    }
    
    // Prevent double-sending
    if (sending) {
      console.log('❌ Already sending, preventing duplicate call');
      return;
    }

    const messageContent = newMessage.trim();
    console.log(`📤 Starting to send: "${messageContent}"`);

    setSending(true);
    try {
      // Clear the input immediately to prevent accidental double-sends
      setNewMessage('');
      console.log('🔄 Input cleared, calling API...');
      
      // Send via API for persistence
      const savedMessage = await chatApi.sendMessage(selectedRoom.roomId, {
        content: messageContent
      });
      console.log('✅ API call completed, received:', savedMessage);

      // Add the message to the UI immediately
      setMessages(prev => {
        // Check if message already exists (prevent duplicates)
        const messageExists = prev.some(msg => msg.Id === savedMessage.Id);
        if (messageExists) {
          console.log('⚠️ Message already exists in UI, not adding');
          return prev;
        }
        console.log('➕ Adding message to UI');
        return [...prev, savedMessage];
      });

      // Send via socket for real-time delivery to other users
      console.log('📡 Sending via socket...');
      socketService.sendMessage(selectedRoom.roomId, messageContent, savedMessage.Id, savedMessage.CreatedAt);
      
      socketService.stopTyping(selectedRoom.roomId);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      // Restore the message if sending failed
      setNewMessage(messageContent);
    } finally {
      console.log('🏁 Setting sending to false');
      setSending(false);
    }
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!selectedRoom) return;

    socketService.startTyping(selectedRoom.roomId);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(selectedRoom.roomId);
    }, 1000);
  };

  // Create new room
  const handleCreateRoom = async () => {
    if (!newRoomData.name.trim()) {
      setError('Please enter a room name');
      return;
    }

    try {
      console.log('Creating room with data:', newRoomData);
      const createdRoom = await chatApi.createRoom(newRoomData);
      console.log('Room created successfully:', createdRoom);
      
      setCreateRoomOpen(false);
      setNewRoomData({ name: '' });
      await loadRooms();
      setError(null);
      
      // Optionally select the newly created room
      setSelectedRoom(createdRoom);
    } catch (error) {
      console.error('Failed to create room:', error);
      if (error instanceof Error) {
        setError(`Failed to create room: ${error.message}`);
      } else {
        setError('Failed to create room. Please try again.');
      }
    }
  };

  // Initialize component
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Connect to socket
        await socketService.connect();
        
        // Load rooms
        await loadRooms();
        
        // Set up socket event listeners
        socketService.onMessage((message: SocketMessage) => {
          console.log('🔔 Received socket message:', message);
          
          // Only add message if it's NOT from the current user (we handle our own messages via API response)
          if (message.user.id === user?.id) {
            console.log('⏭️ Skipping own message from socket');
            return; // Skip our own messages
          }
          
          // Only add message if it's for the currently selected room
          setMessages(prev => {
            // Check if message already exists (prevent duplicates)
            const messageExists = prev.some(msg => msg.Id === message.id);
            if (messageExists) {
              console.log('⚠️ Message already exists in UI, skipping socket message');
              return prev;
            }
            
            console.log('➕ Adding socket message from other user to UI');
            // Add the new message
            const newMessage = {
              Id: message.id,
              Content: message.content,
              CreatedAt: message.createdAt,
              MessageType: message.messageType,
              FirstName: message.user.firstName,
              LastName: message.user.lastName,
              Email: message.user.email,
              UserId: message.user.id
            };
            
            return [...prev, newMessage];
          });
          setTimeout(scrollToBottom, 100);
        });

        socketService.onUserTyping((user: TypingUser) => {
          setTypingUsers(prev => new Set([...prev, user.userId]));
        });

        socketService.onUserStopTyping((data) => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userId);
            return newSet;
          });
        });

        socketService.onError((error) => {
          setError(error.message);
        });

      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setError('Failed to connect to chat service');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle room selection
  useEffect(() => {
    if (selectedRoom) {
      // Clear messages when switching rooms
      setMessages([]);
      
      // Join the new room
      socketService.joinRoom(selectedRoom.roomId);
      loadMessages(selectedRoom.roomId);
      
      // Leave previous room when switching (handled automatically by socket.io)
      return () => {
        if (selectedRoom) {
          socketService.leaveRoom(selectedRoom.roomId);
        }
      };
    }
  }, [selectedRoom]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ height: '80vh', display: 'flex' }}>
        {/* Chat Rooms Sidebar */}
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Chat Rooms</Typography>
              <IconButton size="small" onClick={() => setCreateRoomOpen(true)}>
                <AddIcon />
              </IconButton>
            </Box>
            <TextField
              size="small"
              placeholder="Search rooms..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <List sx={{ flex: 1, overflow: 'auto' }}>
            {rooms.map((room) => (
              <ListItem key={room.roomId} disablePadding>
                <ListItemButton
                  selected={selectedRoom?.roomId === room.roomId}
                  onClick={() => setSelectedRoom(room)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <GroupIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={room.roomName}
                    secondary={
                      <React.Fragment>
                        <Typography variant="caption" component="span" display="block" noWrap>
                          {room.lastMessage || 'No messages yet'}
                        </Typography>
                        {room.lastMessageTime && (
                          <Typography variant="caption" color="text.secondary" component="span" display="block">
                            {formatDistanceToNow(new Date(room.lastMessageTime), { addSuffix: true })}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                  <Chip label={room.roomType} size="small" variant="outlined" />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">{selectedRoom.roomName}</Typography>
                    {selectedRoom.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedRoom.description}
                      </Typography>
                    )}
                  </Box>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages Area */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {messages.map((message, index) => {
                  const isOwnMessage = message.UserId === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].UserId !== message.UserId;
                  
                  return (
                    <Box
                      key={message.Id}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                        mb: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', maxWidth: '70%' }}>
                        {!isOwnMessage && showAvatar && (
                          <Avatar
                            sx={{ width: 32, height: 32, mr: 1 }}
                            src={`https://ui-avatars.com/api/?name=${message.FirstName}+${message.LastName}&background=random`}
                          >
                            {message.FirstName?.[0]}
                          </Avatar>
                        )}
                        
                        <Box>
                          {!isOwnMessage && showAvatar && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {message.FirstName} {message.LastName}
                            </Typography>
                          )}
                          
                          <Paper
                            sx={{
                              p: 1.5,
                              ml: !isOwnMessage && !showAvatar ? 5 : 0,
                              backgroundColor: isOwnMessage ? 'primary.main' : 'grey.100',
                              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            <Typography variant="body2">{message.Content}</Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.5,
                                opacity: 0.8
                              }}
                            >
                              {formatDistanceToNow(new Date(message.CreatedAt), { addSuffix: true })}
                            </Typography>
                          </Paper>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                
                {/* Typing Indicator */}
                {typingUsers.size > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Someone is typing...
                    </Typography>
                  </Box>
                )}
                
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end">
                          <EmojiIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sending}
                        >
                          {sending ? <CircularProgress size={20} /> : <SendIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Select a room to start chatting
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Create Room Dialog */}
      <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chat Room</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Room Name"
                fullWidth
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description (Optional)"
                fullWidth
                multiline
                rows={3}
                value={newRoomData.description || ''}
                onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoomOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained" disabled={!newRoomData.name.trim()}>
            Create Room
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  );
};

export default Chat;