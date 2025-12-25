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

export interface VerificationResponse {
  success: boolean;
  message: string;
  data?: {
    user?: {
      id: string;
      email: string;
      firstName: string;
      emailVerified: boolean;
    };
    email?: string;
    expiresIn?: string;
  };
}

export interface VerificationStatusResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      emailVerified: boolean;
    };
  };
}

class VerificationApiService {
  /**
   * Send verification code to user's email
   */
  async sendVerificationCode(): Promise<VerificationResponse> {
    try {
      const response = await api.post<VerificationResponse>('/api/verification/send');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send verification code',
      };
    }
  }

  /**
   * Verify the code entered by user
   */
  async verifyCode(code: string): Promise<VerificationResponse> {
    try {
      const response = await api.post<VerificationResponse>('/api/verification/verify', {
        code: code.trim(),
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify code',
      };
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(): Promise<VerificationResponse> {
    try {
      const response = await api.post<VerificationResponse>('/api/verification/resend');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend verification code',
      };
    }
  }

  /**
   * Get verification status for current user
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    try {
      const response = await api.get<VerificationStatusResponse>('/api/verification/status');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get verification status',
      };
    }
  }
}

export const verificationApi = new VerificationApiService();
