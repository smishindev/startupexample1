/**
 * Presence API Service
 * Handles user presence status API calls
 */

import axios from 'axios';
import { UserPresence, OnlineUser, UpdatePresenceData, BulkPresenceResponse, OnlineUsersResponse } from '../types/presence';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

export const presenceApi = {
  /**
   * Get all online users
   */
  getOnlineUsers: async (limit: number = 100): Promise<OnlineUsersResponse> => {
    const response = await api.get<OnlineUsersResponse>(`/presence/online?limit=${limit}`);
    return response.data;
  },

  /**
   * Get online users in a specific course
   */
  getOnlineUsersInCourse: async (courseId: string): Promise<{ users: OnlineUser[]; count: number }> => {
    const response = await api.get<{ users: OnlineUser[]; count: number }>(`/presence/course/${courseId}`);
    return response.data;
  },

  /**
   * Get presence for a specific user
   */
  getUserPresence: async (userId: string): Promise<UserPresence> => {
    const response = await api.get<{ presence: UserPresence }>(`/presence/user/${userId}`);
    return response.data.presence;
  },

  /**
   * Get own presence status
   */
  getMyPresence: async (): Promise<UserPresence | null> => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return null;
      
      const { state } = JSON.parse(authStorage);
      if (!state?.user?.id) return null;
      
      const response = await api.get<{ presence: UserPresence }>(`/presence/user/${state.user.id}`);
      return response.data.presence;
    } catch (error) {
      console.error('Error fetching own presence:', error);
      return null;
    }
  },

  /**
   * Get presence for multiple users (bulk)
   */
  getBulkPresence: async (userIds: string[]): Promise<BulkPresenceResponse> => {
    const response = await api.post<BulkPresenceResponse>('/presence/bulk', { userIds });
    return response.data;
  },

  /**
   * Update own presence status
   */
  updateStatus: async (status: UpdatePresenceData['status'], activity?: string): Promise<UserPresence> => {
    const response = await api.put<{ presence: UserPresence }>('/presence/status', { status, activity });
    return response.data.presence;
  },

  /**
   * Update activity without changing status
   */
  updateActivity: async (activity: string): Promise<void> => {
    await api.put('/presence/activity', { activity });
  },

  /**
   * Send heartbeat to update last seen
   */
  sendHeartbeat: async (): Promise<void> => {
    await api.post('/presence/heartbeat');
  },
};
