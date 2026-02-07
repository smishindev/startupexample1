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
  Badge,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { chatApi } from '../../services/chatApi';
import { socketService } from '../../services/socketService';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { UserSearchDialog } from '../../components/Chat/UserSearchDialog';

interface ChatRoom {
  Id: string;
  Name: string;
  Type: string;
  CourseId: string | null;
  CreatedBy: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  LastMessageAt: string | null;
  LastMessagePreview: string | null;
  UnreadCount: number;
  IsActive: boolean;
}

interface ChatMessage {
  Id: string;
  RoomId: string;
  UserId: string;
  Content: string;
  Type: string;
  ReplyTo: string | null;
  IsEdited: boolean;
  IsSystemMessage: boolean;
  CreatedAt: string;
  EditedAt: string | null;
  User?: {
    Id: string;
    FirstName: string;
    LastName: string;
    Avatar: string | null;
    Role: string;
  };
}

const Chat: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [, setCurrentTime] = useState(Date.now());
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<ChatRoom | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuthStore();

  // Auto-update timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load rooms
  const loadRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await chatApi.getRooms();
      setRooms(roomsData);
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to load rooms:', error);
      setError(error.response?.data?.error || 'Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  // Load messages
  const loadMessages = async (roomId: string) => {
    try {
      const messagesData = await chatApi.getMessages(roomId);
      
      // Replace messages but keep any that arrived via websocket after this fetch started
      setMessages(prev => {
        // Get IDs of loaded messages
        const loadedIds = new Set(messagesData.map(m => m.Id));
        
        // Find messages that are in prev but not in loaded (received via websocket)
        const newMessages = prev.filter(m => !loadedIds.has(m.Id) && m.RoomId === roomId);
        
        // Combine: loaded messages + new websocket messages
        return [...messagesData, ...newMessages];
      });
      
      setError(null);
      setTimeout(scrollToBottom, 100);
      
      // Mark messages as read
      await chatApi.markAsRead(roomId);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      if (error.response?.status === 403) {
        setError('You do not have access to this room');
      } else {
        setError(error.response?.data?.error || 'Failed to load messages');
      }
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || sending) return;

    const messageContent = newMessage.trim();
    setSending(true);
    setNewMessage('');

    try {
      await chatApi.sendMessage(selectedRoom.Id, {
        content: messageContent
      });
      
      // Message will be received via Socket.IO for all users including sender
      // So we don't need to add it manually
      
      setError(null);
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      if (error.response?.status === 403 && error.response?.data?.code === 'MESSAGES_DISABLED') {
        setError('Recipient does not accept direct messages');
      } else {
        setError(error.response?.data?.error || 'Failed to send message');
      }
      setNewMessage(messageContent); // Restore message
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!selectedRoom) return;

    socketService.emit('chat:typing-start', selectedRoom.Id);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socketService.emit('chat:typing-stop', selectedRoom.Id);
    }, 1000);
  };

  // Handle delete room confirmation
  const handleDeleteClick = (room: ChatRoom, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the room
    setRoomToDelete(room);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;

    try {
      await chatApi.leaveRoom(roomToDelete.Id);
      
      // Remove room from list
      setRooms(prev => prev.filter(r => r.Id !== roomToDelete.Id));
      
      // If deleted room was selected, clear selection and messages
      if (selectedRoom?.Id === roomToDelete.Id) {
        setSelectedRoom(null);
        setMessages([]);
      }
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete room:', error);
      setError(error.response?.data?.error || 'Failed to delete conversation');
    } finally {
      setDeleteConfirmOpen(false);
      setRoomToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setRoomToDelete(null);
  };

  // Create direct message room
  const handleCreateDirectMessage = async (recipientId: string) => {
    try {
      setLoading(true);
      const room = await chatApi.createDirectRoom(recipientId);
      
      // Reload rooms to get updated list
      const roomsData = await chatApi.getRooms();
      setRooms(roomsData);
      
      // Find and select the newly created room from the loaded list
      const newRoom = roomsData.find(r => r.Id === room.Id);
      if (newRoom) {
        setSelectedRoom(newRoom);
      }
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to create direct message room:', error);
      if (error.response?.status === 403 && error.response?.data?.code === 'MESSAGES_DISABLED') {
        setError('This user does not accept direct messages');
      } else {
        setError(error.response?.data?.error || 'Failed to create conversation');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

  // Listen for conversation restoration events (when someone messages after both deleted)
  useEffect(() => {
    const handleConversationRestored = (data: { room: ChatRoom; message: ChatMessage | null }) => {
      console.log('🔄 [Chat] Conversation restored:', data.room.Id);
      
      // Add room to list if not already present
      setRooms(prev => {
        const exists = prev.find(r => r.Id === data.room.Id);
        if (exists) {
          // Update existing room with new data
          return prev.map(r => r.Id === data.room.Id ? data.room : r);
        }
        // Add new room at the top (most recent)
        return [data.room, ...prev];
      });

      // If no room is selected, select this restored room
      setSelectedRoom(current => {
        if (!current) {
          return data.room;
        }
        // If user is looking at this room, update it
        if (current.Id === data.room.Id) {
          return data.room;
        }
        return current;
      });
    };

    socketService.on('chat:conversation-restored', handleConversationRestored);

    return () => {
      socketService.off('chat:conversation-restored', handleConversationRestored);
    };
  }, []);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.Id);
    }
  }, [selectedRoom]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!selectedRoom) return;

    console.log(`📡 [Chat] Subscribing to room ${selectedRoom.Id}`);
    
    // Join room
    socketService.emit('chat:join-room', selectedRoom.Id);

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      console.log(`💬 [Chat] Received message for room ${message.RoomId}`);
      if (message.RoomId === selectedRoom.Id) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.Id === message.Id)) {
            return prev;
          }
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    // Listen for typing indicators
    const handleUserTyping = (data: { userId: string; roomId: string; isTyping: boolean }) => {
      if (data.roomId === selectedRoom.Id && data.userId !== user?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    };

    // Listen for read receipts
    const handleRead = (data: { roomId: string; userId: string }) => {
      if (data.roomId === selectedRoom.Id) {
        // Mark messages as read in UI if needed
        console.log(`✓ User ${data.userId} read messages in room ${selectedRoom.Id}`);
      }
    };

    // Listen for Socket.IO errors
    const handleChatError = (error: { message: string }) => {
      console.error('❌ [Chat] Socket error:', error.message);
      setError(error.message);
    };

    socketService.on('chat:message', handleNewMessage);
    socketService.on('chat:user-typing', handleUserTyping);
    socketService.on('chat:read', handleRead);
    socketService.on('chat:error', handleChatError);

    return () => {
      console.log(`👋 [Chat] Unsubscribing from room ${selectedRoom.Id}`);
      socketService.emit('chat:leave-room', selectedRoom.Id);
      socketService.off('chat:message', handleNewMessage);
      socketService.off('chat:user-typing', handleUserTyping);
      socketService.off('chat:read', handleRead);
      socketService.off('chat:error', handleChatError);
      
      // Clean up typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [selectedRoom, user?.id]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Paper elevation={2} sx={{ height: 'calc(100vh - 150px)', display: 'flex', overflow: 'hidden' }}>
          
          {/* Rooms List */}
          <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Messages</Typography>
              <Button
                startIcon={<PersonAddIcon />}
                size="small"
                sx={{ mt: 1 }}
                fullWidth
                variant="outlined"
                onClick={() => setUserSearchOpen(true)}
              >
                New Message
              </Button>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : rooms.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No conversations yet
                </Typography>
              </Box>
            ) : (
              <List sx={{ overflow: 'auto', flex: 1 }}>
                {rooms.map((room) => (
                  <ListItem 
                    key={room.Id} 
                    disablePadding
                    secondaryAction={
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={(e) => handleDeleteClick(room, e)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      selected={selectedRoom?.Id === room.Id}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <ListItemAvatar>
                        <Badge badgeContent={room.UnreadCount} color="primary">
                          <Avatar>{room.Name.charAt(0)}</Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={room.Name}
                        secondary={room.LastMessagePreview || 'No messages'}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          {/* Messages Area */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!selectedRoom ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  Select a conversation to start messaging
                </Typography>
              </Box>
            ) : (
              <>
                {/* Room Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">{selectedRoom.Name}</Typography>
                  {typingUsers.size > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Someone is typing...
                    </Typography>
                  )}
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                      {error}
                    </Alert>
                  )}
                  
                  {messages.map((message) => {
                    const isOwn = message.UserId === user?.id;
                    const senderName = message.User 
                      ? `${message.User.FirstName} ${message.User.LastName}`
                      : 'Unknown';

                    return (
                      <Box
                        key={message.Id}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          mb: 2
                        }}
                      >
                        <Box sx={{ maxWidth: '70%' }}>
                          {!isOwn && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              {senderName}
                            </Typography>
                          )}
                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              backgroundColor: isOwn ? 'primary.main' : 'grey.100',
                              color: isOwn ? 'white' : 'text.primary'
                            }}
                          >
                            <Typography variant="body2">{message.Content}</Typography>
                          </Paper>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {formatDistanceToNow(new Date(message.CreatedAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
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
                          <IconButton
                            onClick={handleSendMessage}
                            disabled={sending || !newMessage.trim()}
                            color="primary"
                          >
                            {sending ? <CircularProgress size={24} /> : <SendIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        </Paper>
      </Container>

      <UserSearchDialog
        open={userSearchOpen}
        onClose={() => setUserSearchOpen(false)}
        onSelectUser={handleCreateDirectMessage}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this conversation with {roomToDelete?.Name}?
            This will remove it from your list, but the other person can still see the conversation.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chat;
