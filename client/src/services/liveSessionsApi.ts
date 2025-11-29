/**
 * Live Sessions API Service
 * Phase 2 - Collaborative Features
 */

import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { 
  LiveSession, 
  SessionAttendee, 
  CreateSessionData,
  UpdateSessionData 
} from '../types/liveSession';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

/**
 * Create a new live session (Instructor only)
 */
export const createSession = async (data: CreateSessionData): Promise<LiveSession> => {
  try {
    const response = await api.post('/api/live-sessions', data);
    // Backend returns { message, session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create session');
  }
};

/**
 * Get session by ID
 */
export const getSessionById = async (sessionId: string): Promise<LiveSession> => {
  try {
    const response = await api.get(`/api/live-sessions/${sessionId}`);
    // Backend returns { session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch session');
  }
};

/**
 * Get all sessions for a specific course
 */
export const getSessionsByCourse = async (courseId: string): Promise<LiveSession[]> => {
  try {
    const response = await api.get(`/api/live-sessions/course/${courseId}`);
    // Backend returns { sessions, count }, extract just sessions array
    return response.data.sessions || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch course sessions');
  }
};

/**
 * Get instructor's sessions
 */
export const getInstructorSessions = async (): Promise<LiveSession[]> => {
  try {
    const response = await api.get('/api/live-sessions/instructor/my-sessions');
    // Backend returns { sessions, count }, extract just sessions array
    return response.data.sessions || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch instructor sessions');
  }
};

/**
 * Start a session (Instructor only)
 */
export const startSession = async (sessionId: string): Promise<LiveSession> => {
  try {
    const response = await api.post(`/api/live-sessions/${sessionId}/start`);
    // Backend returns { message, session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to start session');
  }
};

/**
 * End a session (Instructor only)
 */
export const endSession = async (sessionId: string, recordingUrl?: string): Promise<LiveSession> => {
  try {
    const response = await api.post(`/api/live-sessions/${sessionId}/end`, { recordingUrl });
    // Backend returns { message, session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to end session');
  }
};

/**
 * Cancel a session (Instructor only)
 */
export const cancelSession = async (sessionId: string): Promise<LiveSession> => {
  try {
    const response = await api.post(`/api/live-sessions/${sessionId}/cancel`);
    // Backend returns { message, session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to cancel session');
  }
};

/**
 * Join a session (Student)
 */
export const joinSession = async (sessionId: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/api/live-sessions/${sessionId}/join`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to join session');
  }
};

/**
 * Leave a session (Student)
 */
export const leaveSession = async (sessionId: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/api/live-sessions/${sessionId}/leave`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to leave session');
  }
};

/**
 * Get attendees for a session
 */
export const getSessionAttendees = async (sessionId: string): Promise<SessionAttendee[]> => {
  try {
    const response = await api.get(`/api/live-sessions/${sessionId}/attendees`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch attendees');
  }
};

/**
 * Update session details (Instructor only)
 */
export const updateSession = async (
  sessionId: string, 
  data: UpdateSessionData
): Promise<LiveSession> => {
  try {
    const response = await api.put(`/api/live-sessions/${sessionId}`, data);
    // Backend returns { message, session }, extract just the session
    return response.data.session || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update session');
  }
};
