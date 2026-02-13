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
  private connectCallbacks: Array<() => void> = [];
  private disconnectCallbacks: Array<() => void> = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.connected && this.socket?.connected) {
        console.log('Socket already connected, reusing existing connection');
        resolve();
        return;
      }

      // If socket exists but disconnected, disconnect first
      if (this.socket) {
        console.log('Cleaning up existing disconnected socket');
        this.socket.disconnect();
        this.socket = null;
      }

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
        console.log('🟢 [SocketService] ===== SOCKET CONNECTED ===== 🟢');
        console.log('   - Socket ID:', this.socket?.id);
        console.log('   - Registered connect callbacks:', this.connectCallbacks.length);
        this.connected = true;
        
        // Trigger all registered connect callbacks
        this.connectCallbacks.forEach((callback, index) => {
          try {
            console.log(`   - Executing connect callback ${index + 1}/${this.connectCallbacks.length}`);
            callback();
          } catch (error) {
            console.error('Error in connect callback:', error);
          }
        });
        
        console.log('✅ [SocketService] All connect callbacks executed');
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
        
        // Trigger all registered disconnect callbacks
        this.disconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in disconnect callback:', error);
          }
        });
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      // Clear all callbacks to prevent memory leaks
      this.connectCallbacks = [];
      this.disconnectCallbacks = [];
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Chat room methods
  joinRoom(roomId: string): void {
    if (this.socket && this.isConnected()) {
      this.socket.emit('join-room', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket && this.isConnected()) {
      this.socket.emit('leave-room', roomId);
    }
  }

  sendMessage(roomId: string, content: string, messageId?: string, createdAt?: string, messageType = 'text'): void {
    if (this.socket && this.isConnected()) {
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
    if (this.socket && this.isConnected()) {
      this.socket.emit('typing-start', { roomId });
    }
  }

  stopTyping(roomId: string): void {
    if (this.socket && this.isConnected()) {
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

  // Connection lifecycle listeners
  onConnect(callback: () => void): void {
    // Always persist for future reconnections
    this.connectCallbacks.push(callback);
    
    // If already connected, also call immediately
    if (this.isConnected()) {
      console.log('[SocketService] Already connected, executing callback immediately');
      try { callback(); } catch (e) { console.error('Error in connect callback:', e); }
    }
  }

  offConnect(callback: () => void): void {
    this.connectCallbacks = this.connectCallbacks.filter(cb => cb !== callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  offDisconnect(callback: () => void): void {
    this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback);
  }

  // Notification event listeners
  onNotification(callback: (notification: NotificationEvent) => void): void {
    if (this.socket) {
      console.log('📡 [SocketService] Registering notification-created listener');
      console.log('   - Socket connected:', this.socket.connected);
      console.log('   - Socket ID:', this.socket.id);
      
      // Remove any existing listener first to prevent duplicates
      this.socket.off('notification-created');
      
      // Register the listener
      this.socket.on('notification-created', (notification) => {
        console.log('📨 [SocketService] Raw notification-created event received:', notification);
        callback(notification);
      });
      
      console.log('✅ [SocketService] notification-created listener registered');
    } else {
      console.warn('⚠️ [SocketService] Cannot register notification listener - socket not available');
    }
  }

  onNotificationRead(callback: (data: { notificationId: string }) => void): void {
    if (this.socket) {
      this.socket.off('notification-read'); // Remove existing
      this.socket.on('notification-read', callback);
    }
  }

  onNotificationsReadAll(callback: (data: { count: number }) => void): void {
    if (this.socket) {
      this.socket.off('notifications-read-all'); // Remove existing
      this.socket.on('notifications-read-all', callback);
    }
  }

  onNotificationDeleted(callback: (data: { notificationId: string }) => void): void {
    if (this.socket) {
      this.socket.off('notification-deleted'); // Remove existing
      this.socket.on('notification-deleted', callback);
    }
  }

  // Remove specific event listeners (for cleanup on component unmount)
  offNotification(): void {
    if (this.socket) {
      this.socket.off('notification-created');
      console.log('🔕 [SocketService] notification-created listener removed');
    }
  }

  offNotificationRead(): void {
    if (this.socket) {
      this.socket.off('notification-read');
    }
  }

  offNotificationsReadAll(): void {
    if (this.socket) {
      this.socket.off('notifications-read-all');
    }
  }

  offNotificationDeleted(): void {
    if (this.socket) {
      this.socket.off('notification-deleted');
    }
  }

  // Remove chat event listeners (for cleanup on Chat component unmount)
  offMessage(): void {
    if (this.socket) {
      this.socket.off('new-message');
    }
  }

  offJoinedRoom(): void {
    if (this.socket) {
      this.socket.off('joined-room');
    }
  }

  offLeftRoom(): void {
    if (this.socket) {
      this.socket.off('left-room');
    }
  }

  offUserTyping(): void {
    if (this.socket) {
      this.socket.off('user-typing');
    }
  }

  offUserStopTyping(): void {
    if (this.socket) {
      this.socket.off('user-stop-typing');
    }
  }

  offError(): void {
    if (this.socket) {
      this.socket.off('error');
    }
  }

  // Remove all listeners
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }

  // Generic socket.io methods for chat and other features
  emit(event: string, ...args: any[]): void {
    if (this.socket && this.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`[SocketService] Cannot emit "${event}" - socket not connected`);
    }
  }

  // ========================================
  // Generic socket event methods
  // ========================================

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn(`[SocketService] Cannot register listener for "${event}" - socket not available`);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  once(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
    } else {
      console.warn(`[SocketService] Cannot register one-time listener for "${event}" - socket not available`);
    }
  }
}

export const socketService = new SocketService();