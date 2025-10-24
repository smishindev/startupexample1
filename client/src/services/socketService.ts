import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

export interface SocketMessage {
  id: string;
  roomId: string;
  content: string;
  messageType: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TypingUser {
  userId: string;
  email: string;
  roomId: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  data: any;
  actionUrl?: string;
  actionText?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private connected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = useAuthStore.getState().token;
      
      if (!token) {
        reject(new Error('No authentication token'));
        return;
      }

      this.socket = io('http://localhost:3001', {
        auth: {
          token: token
        }
      });

      this.socket.on('connect', () => {
        console.log('Connected to socket server');
        this.connected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from socket server');
        this.connected = false;
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // Chat room methods
  joinRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('join-room', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket) {
      this.socket.emit('leave-room', roomId);
    }
  }

  sendMessage(roomId: string, content: string, messageId?: string, createdAt?: string, messageType = 'text'): void {
    if (this.socket) {
      this.socket.emit('chat-message', {
        roomId,
        content,
        messageType,
        messageId,
        createdAt
      });
    }
  }

  // Typing indicators
  startTyping(roomId: string): void {
    if (this.socket) {
      this.socket.emit('typing-start', { roomId });
    }
  }

  stopTyping(roomId: string): void {
    if (this.socket) {
      this.socket.emit('typing-stop', { roomId });
    }
  }

  // Event listeners
  onMessage(callback: (message: SocketMessage) => void): void {
    if (this.socket) {
      this.socket.on('new-message', callback);
    }
  }

  onJoinedRoom(callback: (data: { roomId: string }) => void): void {
    if (this.socket) {
      this.socket.on('joined-room', callback);
    }
  }

  onLeftRoom(callback: (data: { roomId: string }) => void): void {
    if (this.socket) {
      this.socket.on('left-room', callback);
    }
  }

  onUserTyping(callback: (user: TypingUser) => void): void {
    if (this.socket) {
      this.socket.on('user-typing', callback);
    }
  }

  onUserStopTyping(callback: (data: { userId: string; roomId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user-stop-typing', callback);
    }
  }

  onError(callback: (error: { message: string }) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Notification event listeners
  onNotification(callback: (notification: NotificationEvent) => void): void {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  onNotificationRead(callback: (data: { notificationId: string }) => void): void {
    if (this.socket) {
      this.socket.on('notification-read', callback);
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();