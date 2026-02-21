import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  // Get token from auth store (same as other APIs)
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface UploadedFile {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  fileType: 'video' | 'image' | 'document';
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
  createdAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  fileType: 'video' | 'image' | 'document';
  courseId?: string;
  lessonId?: string;
  description?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export const fileUploadApi = {
  // Upload a file
  uploadFile: async (file: File, options: UploadOptions): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', options.fileType);
    
    if (options.courseId) {
      formData.append('courseId', options.courseId);
    }
    
    if (options.lessonId) {
      formData.append('lessonId', options.lessonId);
    }
    
    if (options.description) {
      formData.append('description', options.description);
    }

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });

    return response.data.file;
  },

  // Get user's uploaded files
  getFiles: async (options: {
    fileType?: 'video' | 'image' | 'document';
    courseId?: string;
    lessonId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<UploadedFile[]> => {
    const params = new URLSearchParams();
    
    if (options.fileType) params.append('fileType', options.fileType);
    if (options.courseId) params.append('courseId', options.courseId);
    if (options.lessonId) params.append('lessonId', options.lessonId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const response = await api.get(`/api/upload/files?${params.toString()}`);
    return response.data.files;
  },

  // Delete a file
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/api/upload/${fileId}`);
  },

  // Get full URL for a file
  getFileUrl: (file: UploadedFile): string => {
    return `${API_BASE_URL}${file.url}`;
  },

  // Get thumbnail URL for a file
  getThumbnailUrl: (file: UploadedFile): string | null => {
    return file.thumbnailUrl ? `${API_BASE_URL}${file.thumbnailUrl}` : null;
  },

  // Validate file before upload
  validateFile: (file: File, fileType: 'video' | 'image' | 'document'): { valid: boolean; error?: string } => {
    const fileTypeConfig = {
      video: {
        allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
        maxSize: 500 * 1024 * 1024, // 500MB
        maxSizeLabel: '500MB'
      },
      image: {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 10 * 1024 * 1024, // 10MB
        maxSizeLabel: '10MB'
      },
      document: {
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        maxSize: 25 * 1024 * 1024, // 25MB
        maxSizeLabel: '25MB'
      }
    };

    const config = fileTypeConfig[fileType];
    
    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`
      };
    }

    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${config.maxSizeLabel}`
      };
    }

    return { valid: true };
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

export default fileUploadApi;