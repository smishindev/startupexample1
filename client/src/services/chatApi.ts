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

export interface ChatRoom {
  roomId: string;
  roomName: string;
  roomType: string;
  description?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ChatMessage {
  Id: string;
  Content: string;
  CreatedAt: string;
  EditedAt?: string;
  MessageType: string;
  FirstName: string;
  LastName: string;
  Email: string;
  UserId: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  type?: string;
  courseId?: string;
}

export interface SendMessageRequest {
  content: string;
  messageType?: string;
}

class ChatApi {
  async getRooms(): Promise<ChatRoom[]> {
    const response = await api.get('/chat/rooms');
    return response.data;
  }

  async getMessages(roomId: string, page = 1, limit = 50): Promise<ChatMessage[]> {
    const response = await api.get(`/chat/rooms/${roomId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  }

  async sendMessage(roomId: string, data: SendMessageRequest): Promise<ChatMessage> {
    const response = await api.post(`/chat/rooms/${roomId}/messages`, data);
    return response.data;
  }

  async createRoom(data: CreateRoomRequest): Promise<ChatRoom> {
    const response = await api.post('/chat/rooms', data);
    return response.data;
  }

  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/join`);
  }
}

export const chatApi = new ChatApi();