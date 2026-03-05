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

// Handle token expiration
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

export interface PlatformStats {
  totalUsers: number;
  totalInstructors: number;
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalRevenue: number;
  totalRefunds: number;
}

export interface GrowthDataPoint {
  date: string;
  newUsers: number;
  newEnrollments: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  refundTotal: number;
  refundCount: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'signup' | 'enrollment' | 'payment' | 'course_published' | 'refund';
  description: string;
  userName: string;
  timestamp: string;
  metadata: string | null;
}

export interface TopCourse {
  courseId: string;
  title: string;
  instructorName: string;
  enrollmentCount: number;
  revenue: number;
}

// ── Phase 2: User Management Types ────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  enrollmentCount: number;
  totalSpent: number;
}

export interface AdminUserDetail extends Omit<AdminUser, 'enrollmentCount' | 'totalSpent'> {
  stats: {
    enrollmentCount: number;
    completedCourses: number;
    totalSpent: number;
    totalRefunds: number;
    coursesCreated: number;
  };
  enrollments: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    status: string;
  }>;
  recentTransactions: Array<{
    id: string;
    courseTitle: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface PaginatedUsers {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Phase 3: Course Management Types ──────────────────────────────

export interface AdminCourse {
  id: string;
  title: string;
  thumbnail: string | null;
  instructorId: string | null;
  instructorName: string;
  category: string;
  level: string;
  price: number;
  rating: number;
  ratingCount: number;
  enrollmentCount: number;
  lessonCount: number;
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCourseDetail extends Omit<AdminCourse, 'lessonCount'> {
  description: string;
  instructorEmail: string;
  duration: number;
  stats: {
    lessonCount: number;
    activeStudents: number;
    completedStudents: number;
    totalRevenue: number;
    avgRating: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    orderIndex: number;
    duration: number;
  }>;
  recentEnrollments: Array<{
    userId: string;
    userName: string;
    enrolledAt: string;
    status: string;
  }>;
}

export interface PaginatedCourses {
  courses: AdminCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CourseFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  level?: string;
  instructorId?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Phase 4: Revenue & Transaction Types ──────────────────────────

export interface AdminTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
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

export interface AdminTransactionDetail extends AdminTransaction {
  courseCategory: string;
  instructorName: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  refundReason: string | null;
  updatedAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    taxAmount: number;
    totalAmount: number;
  } | null;
}

export interface PaginatedTransactions {
  transactions: AdminTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  courseId?: string;
  userId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface RevenueBreakdown {
  byCategory: Array<{ category: string; revenue: number; count: number }>;
  topInstructors: Array<{ instructorId: string; instructorName: string; revenue: number; transactionCount: number }>;
  refundSummary: { totalRefunds: number; refundCount: number; avgRefund: number };
  dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
}

// ── Phase 5: Reports & System Health types ────────────────────────

export interface SystemHealth {
  database: { status: string; timestamp: string };
  tables: Array<{ name: string; rowCount: number }>;
  recentActivity: {
    lastSignup: string | null;
    lastEnrollment: string | null;
    lastTransaction: string | null;
    lastLogin: string | null;
  };
  userSummary: {
    totalActive: number;
    totalInactive: number;
    loggedInToday: number;
    loggedInThisWeek: number;
  };
}

export interface AuditLogEntry {
  id: string;
  type: 'account_deletion' | 'course_ownership';
  description: string;
  details: string;
  timestamp: string;
}

export interface PaginatedAuditLog {
  entries: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  type?: string; // 'all' | 'deletion' | 'ownership'
}

export interface PopularCourse {
  id: string;
  title: string;
  category: string;
  instructorName: string;
  status: string;
  enrollmentCount: number;
  rating: number;
  ratingCount: number;
  revenue: number;
  createdAt: string;
}

export interface InstructorLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  totalRevenue: number;
  avgRating: number;
  totalRatings: number;
  joinedAt: string;
}

// ── API Methods ───────────────────────────────────────────────────

export const adminApi = {
  /** Aggregated platform-level counts */
  getStats: async (): Promise<PlatformStats> => {
    const { data } = await api.get('/admin/stats');
    return data;
  },

  /** 30-day daily new-user + enrollment growth */
  getGrowth: async (): Promise<GrowthDataPoint[]> => {
    const { data } = await api.get('/admin/growth');
    return data;
  },

  /** Revenue totals, monthly total, avg order value, refunds */
  getRevenue: async (): Promise<RevenueMetrics> => {
    const { data } = await api.get('/admin/revenue');
    return data;
  },

  /** 12-month revenue chart data */
  getMonthlyRevenue: async (): Promise<MonthlyRevenuePoint[]> => {
    const { data } = await api.get('/admin/revenue/monthly');
    return data;
  },

  /** Recent activity feed (signup, enrollment, payment, etc.) */
  getRecentActivity: async (limit = 20): Promise<RecentActivityItem[]> => {
    const { data } = await api.get('/admin/recent-activity', { params: { limit } });
    return data;
  },

  /** Top courses by enrollment count */
  getTopCourses: async (limit = 10): Promise<TopCourse[]> => {
    const { data } = await api.get('/admin/top-courses', { params: { limit } });
    return data;
  },

  /** Promote a user to instructor role */
  promoteToInstructor: async (email: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/admin/promote-to-instructor', { email });
    return data;
  },

  // ── Phase 2: User Management ──────────────────────────────────

  /** Paginated user list with search/filter/sort */
  getUsers: async (filters: UserFilters = {}): Promise<PaginatedUsers> => {
    const { data } = await api.get('/admin/users', { params: filters });
    return data;
  },

  /** Full detail for a single user */
  getUserById: async (userId: string): Promise<AdminUserDetail> => {
    const { data } = await api.get(`/admin/users/${userId}`);
    return data;
  },

  /** Change a user's role */
  updateUserRole: async (userId: string, role: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
    return data;
  },

  /** Activate or deactivate a user account */
  updateUserStatus: async (userId: string, isActive: boolean): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/admin/users/${userId}/status`, { isActive });
    return data;
  },

  /** Trigger a password reset for a user */
  resetUserPassword: async (userId: string): Promise<{ success: boolean; message: string; resetToken: string }> => {
    const { data } = await api.post(`/admin/users/${userId}/reset-password`);
    return data;
  },

  // ── Phase 3: Course Management ────────────────────────────────

  /** Paginated course list with search/filter/sort */
  getCourses: async (filters: CourseFilters = {}): Promise<PaginatedCourses> => {
    const { data } = await api.get('/admin/courses', { params: filters });
    return data;
  },

  /** Full detail for a single course */
  getCourseById: async (courseId: string): Promise<AdminCourseDetail> => {
    const { data } = await api.get(`/admin/courses/${courseId}`);
    return data;
  },

  /** Change a course's status */
  updateCourseStatus: async (courseId: string, status: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/admin/courses/${courseId}/status`, { status });
    return data;
  },

  /** Reassign course to a different instructor */
  reassignCourse: async (courseId: string, newInstructorId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/admin/courses/${courseId}/reassign`, { newInstructorId });
    return data;
  },

  /** Soft-delete a course */
  deleteCourse: async (courseId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/admin/courses/${courseId}`);
    return data;
  },

  // ── Phase 4: Revenue & Transactions ────────────────────────────

  /** Paginated transaction list with search/filter/sort */
  getTransactions: async (filters: TransactionFilters = {}): Promise<PaginatedTransactions> => {
    const { data } = await api.get('/admin/transactions', { params: filters });
    return data;
  },

  /** Full detail for a single transaction */
  getTransactionById: async (transactionId: string): Promise<AdminTransactionDetail> => {
    const { data } = await api.get(`/admin/transactions/${transactionId}`);
    return data;
  },

  /** Revenue breakdown by category, instructor, daily, refund summary */
  getRevenueBreakdown: async (): Promise<RevenueBreakdown> => {
    const { data } = await api.get('/admin/revenue/breakdown');
    return data;
  },

  /** Process a refund for a completed transaction */
  processRefund: async (transactionId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/transactions/${transactionId}/refund`, { reason });
    return data;
  },

  // ── Phase 5: Reports & System Health ──────────────────────────

  /** Fetch system health status */
  getSystemHealth: async (): Promise<SystemHealth> => {
    const { data } = await api.get('/admin/system/health');
    return data;
  },

  /** Paginated audit log (account deletions + course ownership changes) */
  getAuditLog: async (opts: AuditLogFilters = {}): Promise<PaginatedAuditLog> => {
    const { data } = await api.get('/admin/audit-log', { params: opts });
    return data;
  },

  /** Top courses by enrollment & rating */
  getPopularCourses: async (limit: number = 20): Promise<PopularCourse[]> => {
    const { data } = await api.get('/admin/reports/popular-courses', { params: { limit } });
    return data;
  },

  /** Top instructors leaderboard */
  getInstructorLeaderboard: async (limit: number = 20): Promise<InstructorLeaderboardEntry[]> => {
    const { data } = await api.get('/admin/reports/top-instructors', { params: { limit } });
    return data;
  },
};
