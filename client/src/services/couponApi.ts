/**
 * Coupon API Service
 * Handles all coupon-related API calls (validation, instructor CRUD)
 */

import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

const couponAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor
couponAxios.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const token = JSON.parse(authStorage)?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* silent */ }
  }
  return config;
});

// 401 → logout
couponAxios.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    throw err;
  }
);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CouponValidationResult {
  couponId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  description: string;
}

export interface Coupon {
  Id: string;
  Code: string;
  InstructorId: string;
  CourseId: string | null;
  CourseTitle: string | null;
  DiscountType: 'percentage' | 'fixed';
  DiscountValue: number;
  MaxUses: number | null;
  UsedCount: number;
  MinimumPrice: number;
  ExpiresAt: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CouponDetail extends Coupon {
  recentUsage: CouponUsageRow[];
}

export interface CouponUsageRow {
  Id: string;
  UsedAt: string;
  DiscountAmount: number;
  OriginalAmount: number;
  FinalAmount: number;
  StudentName: string;
  CourseTitle: string;
}

export interface CouponListResponse {
  data: Coupon[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateCouponInput {
  code: string;
  courseId?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  minimumPrice?: number;
}

export interface UpdateCouponInput {
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  minimumPrice?: number;
  isActive?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (axios.isAxiosError(err)) return (err.response?.data as any)?.message || err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Validate a coupon code at checkout
 */
export const validateCoupon = async (
  code: string,
  courseId: string,
  coursePrice: number
): Promise<CouponValidationResult> => {
  try {
    const res = await couponAxios.post<{ success: boolean; data: CouponValidationResult }>(
      '/api/coupons/validate',
      { code, courseId, coursePrice }
    );
    return res.data.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

/**
 * List instructor's coupons (paginated)
 */
export const getInstructorCoupons = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}): Promise<CouponListResponse> => {
  try {
    const res = await couponAxios.get<CouponListResponse>('/api/coupons/instructor', { params });
    return res.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

/**
 * Get single coupon detail with recent usage
 */
export const getCouponById = async (id: string): Promise<CouponDetail> => {
  try {
    const res = await couponAxios.get<{ success: boolean; data: CouponDetail }>(`/api/coupons/${id}`);
    return res.data.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

/**
 * Create a new coupon
 */
export const createCoupon = async (input: CreateCouponInput): Promise<Coupon> => {
  try {
    const res = await couponAxios.post<{ success: boolean; data: Coupon }>('/api/coupons', input);
    return res.data.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

/**
 * Update an existing coupon
 */
export const updateCoupon = async (id: string, input: UpdateCouponInput): Promise<Coupon> => {
  try {
    const res = await couponAxios.put<{ success: boolean; data: Coupon }>(`/api/coupons/${id}`, input);
    return res.data.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

/**
 * Deactivate (soft-delete) a coupon
 */
export const deactivateCoupon = async (id: string): Promise<void> => {
  try {
    await couponAxios.delete(`/api/coupons/${id}`);
  } catch (err) {
    throw new Error(extractMessage(err));
  }
};

export default {
  validateCoupon,
  getInstructorCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
};
