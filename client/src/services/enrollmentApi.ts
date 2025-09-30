import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Enrollment {
  enrollmentId: string;
  EnrolledAt: string;
  Status: string;
  CompletedAt?: string;
  courseId: string;
  Title: string;
  Description: string;
  Thumbnail?: string;
  Duration: string;
  Level: string;
  Price: number;
  instructorFirstName: string;
  instructorLastName: string;
  OverallProgress: number;
  TimeSpent: number;
  LastAccessedAt: string;
}

export interface EnrollmentStatus {
  enrolled: boolean;
  enrollmentId?: string;
  status?: string;
  enrolledAt?: string;
  completedAt?: string;
}

export interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  avgProgress: number;
}

export interface EnrollmentResponse {
  enrollmentId: string;
  courseId: string;
  status: string;
  enrolledAt: string;
  message: string;
}

class EnrollmentApi {
  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await api.get('/api/enrollment/my-enrollments');
    return response.data;
  }

  async getEnrollmentStatus(courseId: string): Promise<EnrollmentStatus> {
    const response = await api.get(`/api/enrollment/courses/${courseId}/enrollment-status`);
    return response.data;
  }

  async enrollInCourse(courseId: string): Promise<EnrollmentResponse> {
    const response = await api.post(`/api/enrollment/courses/${courseId}/enroll`);
    return response.data;
  }

  async unenrollFromCourse(courseId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/enrollment/courses/${courseId}/unenroll`);
    return response.data;
  }

  async getCourseStats(courseId: string): Promise<EnrollmentStats> {
    const response = await api.get(`/api/enrollment/courses/${courseId}/stats`);
    return response.data;
  }
}

export const enrollmentApi = new EnrollmentApi();