import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001') + '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
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

// ── Types ─────────────────────────────────────────────────────────

export interface InstructorRevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  refundTotal: number;
  refundCount: number;
  totalTransactions: number;
}

export interface InstructorMonthlyRevenue {
  month: string;
  revenue: number;
  count: number;
}

export interface InstructorCourseRevenue {
  courseId: string;
  courseTitle: string;
  revenue: number;
  transactionCount: number;
  enrollments: number;
  avgPrice: number;
  lastSaleAt: string | null;
}

export interface InstructorTransaction {
  id: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
  refundAmount: number | null;
  createdAt: string;
  completedAt: string | null;
  refundedAt: string | null;
}

export interface InstructorTransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  courseId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedInstructorTransactions {
  transactions: InstructorTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── API Methods ───────────────────────────────────────────────────

export const instructorRevenueApi = {
  getMetrics: async (): Promise<InstructorRevenueMetrics> => {
    const { data } = await api.get('/instructor/revenue/metrics');
    return data;
  },

  getMonthlyRevenue: async (): Promise<InstructorMonthlyRevenue[]> => {
    const { data } = await api.get('/instructor/revenue/monthly');
    return data;
  },

  getCourseRevenue: async (): Promise<InstructorCourseRevenue[]> => {
    const { data } = await api.get('/instructor/revenue/courses');
    return data;
  },

  getTransactions: async (filters?: InstructorTransactionFilters): Promise<PaginatedInstructorTransactions> => {
    const params = new URLSearchParams();
    if (filters?.page != null) params.append('page', String(filters.page));
    if (filters?.limit != null) params.append('limit', String(filters.limit));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.courseId) params.append('courseId', filters.courseId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    const { data } = await api.get(`/instructor/revenue/transactions?${params.toString()}`);
    return data;
  },
};
