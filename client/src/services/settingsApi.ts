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
export const requestDataExport = async (): Promise<{ success: boolean; message: string; requestId: string; status: string }> => {
  const response = await axios.post(`${API_BASE}/settings/export-data`);
  return response.data;
};

/**
 * Get data export status
 */
export const getExportStatus = async (): Promise<{
  hasRequest: boolean;
  requestId?: string;
  status?: string;
  requestedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  fileName?: string;
  fileSize?: number;
  downloadCount?: number;
  errorMessage?: string;
}> => {
  const response = await axios.get(`${API_BASE}/settings/export-data/status`);
  return response.data;
};

/**
 * Download data export
 */
export const downloadExport = async (requestId: string): Promise<void> => {
  const response = await axios.get(`${API_BASE}/settings/export-data/download/${requestId}`, {
    responseType: 'blob',
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let fileName = 'mishin-learn-export.zip';
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = fileNameMatch[1];
    }
  }
  
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Delete account
 */
export const deleteAccount = async (params: {
  confirmPassword: string;
  instructorAction?: 'archive' | 'transfer' | 'force';
  transferToInstructorId?: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await axios.post(`${API_BASE}/settings/delete-account`, params);
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
