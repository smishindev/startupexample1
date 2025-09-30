import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface TutoringSession {
  Id: string;
  Title: string;
  CreatedAt: string;
  UpdatedAt: string;
  Status: string;
  MessageCount: number;
}

export interface TutoringMessage {
  Id: string;
  Content: string;
  Role: 'user' | 'assistant';
  CreatedAt: string;
  MessageType: string;
}

export interface CreateSessionRequest {
  title?: string;
  subject?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  userMessage: TutoringMessage;
  aiMessage: TutoringMessage;
}

export interface LearningRecommendations {
  recommendations: string[];
}

class TutoringApi {
  async getSessions(): Promise<TutoringSession[]> {
    const response = await api.get('/api/tutoring/sessions');
    return response.data;
  }

  async createSession(data: CreateSessionRequest): Promise<TutoringSession> {
    const response = await api.post('/api/tutoring/sessions', data);
    return response.data;
  }

  async getMessages(sessionId: string): Promise<TutoringMessage[]> {
    const response = await api.get(`/api/tutoring/sessions/${sessionId}/messages`);
    return response.data;
  }

  async sendMessage(sessionId: string, data: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await api.post(`/api/tutoring/sessions/${sessionId}/messages`, data);
    return response.data;
  }

  async getRecommendations(): Promise<LearningRecommendations> {
    const response = await api.get('/api/tutoring/recommendations');
    return response.data;
  }
}

export const tutoringApi = new TutoringApi();