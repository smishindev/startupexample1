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
