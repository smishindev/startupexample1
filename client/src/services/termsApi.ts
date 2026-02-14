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

export interface TermsVersion {
  Id: string;
  DocumentType: 'terms_of_service' | 'privacy_policy' | 'refund_policy';
  Version: string;
  Title: string;
  Content: string;
  Summary: string | null;
  EffectiveDate: string;
  CreatedAt: string;
}

export interface TermsStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  currentTermsVersion: string | null;
  currentPrivacyVersion: string | null;
  termsVersionId: string | null;
  privacyVersionId: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
}

export interface CurrentTermsResponse {
  termsOfService: TermsVersion | null;
  privacyPolicy: TermsVersion | null;
  refundPolicy: TermsVersion | null;
}

// Get current active terms versions (public, no auth needed)
export const getCurrentTerms = async (): Promise<CurrentTermsResponse> => {
  const response = await api.get('/api/terms/current');
  return response.data.data;
};

// Get terms acceptance status for current user (requires auth)
export const getTermsAcceptanceStatus = async (): Promise<TermsStatus> => {
  const response = await api.get('/api/terms/status');
  return response.data.data;
};

// Accept terms versions (requires auth)
export const acceptTerms = async (termsVersionIds: string[]): Promise<void> => {
  await api.post('/api/terms/accept', { termsVersionIds });
};

// Get specific version of a document (public)
export const getTermsVersion = async (documentType: string, version: string): Promise<TermsVersion> => {
  const response = await api.get(`/api/terms/${documentType}/${version}`);
  return response.data.data;
};
