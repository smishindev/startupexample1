import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { includeRead }
    });
    return response.data.notifications;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.count;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.patch(
      `${API_URL}/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<number> => {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/notifications/read-all`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.count;
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.delete(`${API_URL}/notifications/${notificationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /**
   * Get notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.preferences;
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<void> => {
    const token = localStorage.getItem('token');
    await axios.patch(
      `${API_URL}/notifications/preferences`,
      preferences,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
};
