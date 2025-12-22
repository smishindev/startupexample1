import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

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

export interface Notification {
  Id: string;
  UserId: string;
  Type: 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course';
  Priority: 'low' | 'normal' | 'high' | 'urgent';
  Title: string;
  Message: string;
  Data: any;
  IsRead: boolean;
  CreatedAt: string;
  ReadAt: string | null;
  ExpiresAt: string | null;
  ActionUrl: string | null;
  ActionText: string | null;
  RelatedEntityId: string | null;
  RelatedEntityType: string | null;
}

export interface NotificationPreferences {
  UserId: string;
  EnableProgressNotifications: boolean;
  EnableRiskAlerts: boolean;
  EnableAchievementNotifications: boolean;
  EnableCourseUpdates: boolean;
  EnableAssignmentReminders: boolean;
  EnableEmailNotifications: boolean;
  EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  QuietHoursStart: string | null;
  QuietHoursEnd: string | null;
}

export const notificationApi = {
  /**
   * Get all notifications for the authenticated user
   */
  getNotifications: async (includeRead: boolean = true): Promise<Notification[]> => {
    const response = await api.get('/api/notifications', {
      params: { includeRead }
    });
    return response.data.notifications;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/api/notifications/unread-count');
    return response.data.count;
  },

  /**
   * Get queued notification count (quiet hours)
   */
  getQueuedCount: async (): Promise<number> => {
    const response = await api.get('/api/notifications/queue/count');
    return response.data.count;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/api/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<number> => {
    const response = await api.patch('/api/notifications/read-all');
    return response.data.count;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/api/notifications/${notificationId}`);
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/api/notifications/preferences');
    return response.data.preferences;
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<void> => {
    await api.patch('/api/notifications/preferences', preferences);
  }
};
