import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// Add auth token to requests
axios.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed?.state?.token;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error parsing auth storage:', error);
    }
  }
  return config;
});

// Add response interceptor for privacy error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle privacy-related errors
    if (error.response?.data?.code === 'PROFILE_PRIVATE') {
      error.privacyError = {
        type: 'PROFILE_PRIVATE',
        message: error.response.data.message || 'This profile is private'
      };
    } else if (error.response?.data?.code === 'PROGRESS_PRIVATE') {
      error.privacyError = {
        type: 'PROGRESS_PRIVATE',
        message: error.response.data.message || 'This user\'s progress is private'
      };
    } else if (error.response?.data?.code === 'MESSAGES_DISABLED') {
      error.privacyError = {
        type: 'MESSAGES_DISABLED',
        message: error.response.data.message || 'User does not accept direct messages'
      };
    }
    return Promise.reject(error);
  }
);

export interface UserSettings {
  id: string;
  userId: string;
  profileVisibility: 'public' | 'students' | 'private';
  showEmail: boolean;
  showProgress: boolean;
  allowMessages: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr' | 'de' | 'zh';
  fontSize: 'small' | 'medium' | 'large';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsParams {
  profileVisibility?: 'public' | 'students' | 'private';
  showEmail?: boolean;
  showProgress?: boolean;
  allowMessages?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh';
  fontSize?: 'small' | 'medium' | 'large';
}

/**
 * Get user settings
 */
export const getSettings = async (): Promise<UserSettings> => {
  const response = await axios.get(`${API_BASE}/settings`);
  return response.data;
};

/**
 * Update user settings
 */
export const updateSettings = async (params: UpdateSettingsParams): Promise<UserSettings> => {
  const response = await axios.patch(`${API_BASE}/settings`, params);
  return response.data.settings;
};

/**
 * Request data export
 */
export const requestDataExport = async (): Promise<{ success: boolean; message: string }> => {
  const response = await axios.post(`${API_BASE}/settings/export-data`);
  return response.data;
};

/**
 * Delete account
 */
export const deleteAccount = async (confirmPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await axios.post(`${API_BASE}/settings/delete-account`, {
    confirmPassword
  });
  return response.data;
};

/**
 * Get another user's public profile (with privacy checks)
 */
export const getUserProfile = async (userId: string): Promise<any> => {
  const response = await axios.get(`${API_BASE}/profile/user/${userId}`);
  return response.data.data;
};

/**
 * Get another user's progress data (with privacy checks)
 */
export const getUserProgress = async (userId: string): Promise<any> => {
  const response = await axios.get(`${API_BASE}/profile/user/${userId}/progress`);
  return response.data.data;
};
