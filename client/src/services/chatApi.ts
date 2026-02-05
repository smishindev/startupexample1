import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend response interfaces (matching ChatService.ts)
export interface ChatRoom {
  Id: string;
  Name: string;
  Type: string;
  CourseId: string | null;
  CreatedBy: string | null;
  IsActive: boolean;
  LastMessageAt: string | null;
  LastMessagePreview: string | null;
  UnreadCount: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ChatMessage {
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

export interface CreateRoomRequest {
  name: string;
  description?: string;
  type?: string;
  courseId?: string;
}

export interface SendMessageRequest {
  content: string;
  type?: string;
  replyTo?: string;
}

class ChatApi {
  async getRooms(): Promise<ChatRoom[]> {
    const response = await api.get('/chat/rooms');
    return response.data;
  }

  async getMessages(roomId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/rooms/${roomId}/messages`, {
      params: { limit, offset }
    });
    return response.data;
  }

  async sendMessage(roomId: string, data: SendMessageRequest): Promise<ChatMessage> {
    const response = await api.post(`/chat/rooms/${roomId}/messages`, data);
    return response.data;
  }

  async createDirectRoom(recipientId: string): Promise<ChatRoom> {
    const response = await api.post('/chat/rooms/direct', { recipientId });
    return response.data;
  }

  async markAsRead(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/read`);
  }

  async leaveRoom(roomId: string): Promise<void> {
    await api.delete(`/chat/rooms/${roomId}`);
  }
}

export const chatApi = new ChatApi();