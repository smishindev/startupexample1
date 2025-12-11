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

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: 'student' | 'instructor' | 'admin';
  learningStyle?: string | null;
  preferences?: Record<string, any> | null;
  emailVerified: boolean;
  billingAddress: {
    streetAddress?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface UpdatePersonalInfoData {
  firstName: string;
  lastName: string;
  username: string;
  learningStyle?: string | null;
}

export interface UpdateBillingAddressData {
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

const profileApi = {
  // Get complete profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/profile');
    return response.data.data;
  },

  // Update personal information
  updatePersonalInfo: async (data: UpdatePersonalInfoData): Promise<void> => {
    const response = await api.put('/profile/personal-info', data);
    return response.data;
  },

  // Update billing address
  updateBillingAddress: async (data: UpdateBillingAddressData): Promise<void> => {
    const response = await api.put('/profile/billing-address', data);
    return response.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    const response = await api.put('/profile/password', data);
    return response.data;
  },

  // Update avatar
  updateAvatar: async (avatar: string): Promise<{ avatar: string }> => {
    const response = await api.put('/profile/avatar', { avatar });
    return response.data.data;
  },

  // Update preferences
  updatePreferences: async (preferences: Record<string, any>): Promise<void> => {
    const response = await api.put('/profile/preferences', { preferences });
    return response.data;
  }
};

export default profileApi;
