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

interface Certificate {
  Id: string;
  UserId: string;
  CourseId: string;
  CertificateNumber: string;
  StudentName: string;
  StudentEmail: string;
  CourseTitle: string;
  InstructorName: string;
  CompletionDate: string;
  FinalScore: number | null;
  TotalHoursSpent: number;
  Status: string;
  VerificationCode: string;
  IssuedAt: string;
  CreatedAt: string;
  PdfPath: string | null;
  PdfGeneratedAt: string | null;
  RevokedAt: string | null;
  RevokeReason: string | null;
}

interface CertificateResponse {
  certificate: Certificate;
}

interface CertificatesResponse {
  certificates: Certificate[];
  count: number;
}

interface VerificationResponse {
  valid: boolean;
  certificate?: {
    certificateNumber: string;
    studentName: string;
    courseTitle: string;
    instructorName: string;
    completionDate: string;
    issuedAt: string;
    finalScore: number | null;
    status: string;
  };
  error?: string;
}

export const certificatesApi = {
  /**
   * Get all certificates for current user
   */
  getMyCertificates: async (): Promise<CertificatesResponse> => {
    const response = await api.get('/api/certificates/my-certificates');
    return response.data;
  },

  /**
   * Get certificate for specific course
   * Returns 404 if certificate not found
   */
  getCertificateByCourse: async (courseId: string): Promise<CertificateResponse> => {
    const response = await api.get(`/api/certificates/courses/${courseId}`);
    return response.data;
  },

  /**
   * Get certificate by ID
   */
  getCertificateById: async (certificateId: string): Promise<CertificateResponse> => {
    const response = await api.get(`/api/certificates/${certificateId}`);
    return response.data;
  },

  /**
   * Verify certificate by verification code (public endpoint)
   */
  verifyCertificate: async (verificationCode: string): Promise<VerificationResponse> => {
    const response = await api.get(`/api/certificates/verify/${verificationCode}`);
    return response.data;
  },

  /**
   * Get public certificate by verification code (shareable link - no auth required)
   * This endpoint returns the full certificate for public display
   */
  getPublicCertificate: async (verificationCode: string): Promise<CertificateResponse> => {
    const response = await api.get(`/api/certificates/public/${verificationCode}`);
    return response.data;
  },

  /**
   * Download certificate PDF by verification code
   * Creates a download link and triggers download
   */
  downloadCertificatePdf: async (verificationCode: string): Promise<void> => {
    try {
      const response = await api.get(
        `/api/certificates/download/${verificationCode}`,
        { 
          responseType: 'blob',
          validateStatus: (status) => status === 200 || status === 202 // Accept both success and "generating" status
        }
      );

      // Check if PDF is being generated (202 status)
      if (response.status === 202) {
        // Convert blob to text to read the JSON error message
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Certificate PDF is being generated');
      }

      // Success - download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${verificationCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      // Don't log 202 "generating" responses - those are expected during async PDF generation
      // Only log unexpected errors
      if (!error.message?.includes('being generated') && !error.message?.includes('wait')) {
        console.error('Error downloading certificate PDF:', error);
      }
      throw error;
    }
  }
};
