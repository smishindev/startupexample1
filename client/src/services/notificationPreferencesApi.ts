import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (error) {
      console.error('Error parsing auth storage:', error);
    }
  }
  return config;
});

export interface NotificationPreferences {
  id: string;
  userId: string;
  enableProgressNotifications: boolean;
  enableRiskAlerts: boolean;
  enableAchievementNotifications: boolean;
  enableCourseUpdates: boolean;
  enableAssignmentReminders: boolean;
  enableEmailNotifications: boolean;
  emailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesData {
  enableProgressNotifications?: boolean;
  enableRiskAlerts?: boolean;
  enableAchievementNotifications?: boolean;
  enableCourseUpdates?: boolean;
  enableAssignmentReminders?: boolean;
  enableEmailNotifications?: boolean;
  emailDigestFrequency?: 'none' | 'realtime' | 'daily' | 'weekly';
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

const notificationPreferencesApi = {
  // Get user's notification preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/notifications/preferences');
    const prefs = response.data.preferences;
    
    // Helper function to convert time to HH:mm format
    const formatTime = (timeValue: any): string | null => {
      if (!timeValue) return null;
      
      // If it's already in HH:mm format, return as is
      if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      // If it's a full ISO timestamp or Date object, extract time
      try {
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      } catch (e) {
        console.error('Error parsing time:', e);
      }
      
      return null;
    };
    
    // Convert PascalCase from backend to camelCase for frontend
    return {
      id: prefs.Id || prefs.id,
      userId: prefs.UserId || prefs.userId,
      enableProgressNotifications: prefs.EnableProgressNotifications ?? prefs.enableProgressNotifications,
      enableRiskAlerts: prefs.EnableRiskAlerts ?? prefs.enableRiskAlerts,
      enableAchievementNotifications: prefs.EnableAchievementNotifications ?? prefs.enableAchievementNotifications,
      enableCourseUpdates: prefs.EnableCourseUpdates ?? prefs.enableCourseUpdates,
      enableAssignmentReminders: prefs.EnableAssignmentReminders ?? prefs.enableAssignmentReminders,
      enableEmailNotifications: prefs.EnableEmailNotifications ?? prefs.enableEmailNotifications,
      emailDigestFrequency: prefs.EmailDigestFrequency || prefs.emailDigestFrequency,
      quietHoursStart: formatTime(prefs.QuietHoursStart ?? prefs.quietHoursStart),
      quietHoursEnd: formatTime(prefs.QuietHoursEnd ?? prefs.quietHoursEnd),
      createdAt: prefs.CreatedAt || prefs.createdAt,
      updatedAt: prefs.UpdatedAt || prefs.updatedAt,
    };
  },

  // Update notification preferences
  updatePreferences: async (data: UpdatePreferencesData): Promise<void> => {
    // Convert camelCase to PascalCase for backend
    const backendData = {
      EnableProgressNotifications: data.enableProgressNotifications,
      EnableRiskAlerts: data.enableRiskAlerts,
      EnableAchievementNotifications: data.enableAchievementNotifications,
      EnableCourseUpdates: data.enableCourseUpdates,
      EnableAssignmentReminders: data.enableAssignmentReminders,
      EnableEmailNotifications: data.enableEmailNotifications,
      EmailDigestFrequency: data.emailDigestFrequency,
      QuietHoursStart: data.quietHoursStart,
      QuietHoursEnd: data.quietHoursEnd,
    };
    const response = await api.patch('/notifications/preferences', backendData);
    return response.data;
  }
};

export default notificationPreferencesApi;
