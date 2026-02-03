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

export interface Course {
  Id: string;
  Title: string;
  Description: string;
  Thumbnail?: string;
  Category: string;
  Level: string;
  Duration: number;
  Price: number;
  Rating: number;
  EnrollmentCount: number;
  Tags: string[];
  CreatedAt: string;
  UpdatedAt: string;
  LessonCount: number;
  Instructor: {
    Id: string; // Added instructor ID
    FirstName: string;
    LastName: string;
    Avatar?: string;
  };
}

export interface CourseDetail extends Course {
  Prerequisites: string[];
  LearningOutcomes: string[];
  Instructor: {
    Id: string;
    FirstName: string;
    LastName: string;
    Avatar?: string;
    Email: string;
  };
  Lessons: {
    Id: string;
    Title: string;
    Description: string;
    OrderIndex: number;
    Duration: number;
    IsRequired: boolean;
  }[];
}

export interface CourseFilters {
  search?: string;
  category?: string;
  level?: string;
  instructorId?: string;
  page?: number;
  limit?: number;
}

export interface CoursesResponse {
  courses: Course[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EnrollmentStatus {
  isEnrolled: boolean;
  isInstructor?: boolean;
  status?: string;
  enrolledAt?: string;
  completedAt?: string;
  message?: string;
}

export interface CourseCategory {
  Category: string;
  Count: number;
  AverageRating: number;
  AverageEnrollments: number;
}

export interface CourseLevel {
  Level: string;
  Count: number;
  AverageRating: number;
  AverageEnrollments: number;
}

class CoursesApi {
  async getCourses(filters: CourseFilters = {}): Promise<CoursesResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/api/courses?${params.toString()}`);
    return response.data;
  }

  async getCourse(id: string): Promise<CourseDetail> {
    const response = await api.get(`/api/courses/${id}`);
    return response.data;
  }

  async getEnrollmentStatus(courseId: string): Promise<EnrollmentStatus> {
    const response = await api.get(`/api/enrollment/courses/${courseId}/enrollment-status`);
    const data = response.data;
    
    // Map backend response to frontend interface
    return {
      isEnrolled: data.enrolled || false,
      isInstructor: data.isInstructor || false,
      status: data.status,
      enrolledAt: data.enrolledAt,
      completedAt: data.completedAt,
      message: data.message
    };
  }

  async getCategories(): Promise<CourseCategory[]> {
    const response = await api.get('/api/courses/meta/categories');
    return response.data;
  }

  async getLevels(): Promise<CourseLevel[]> {
    const response = await api.get('/api/courses/meta/levels');
    return response.data;
  }

  async getStats(): Promise<{
    TotalCourses: number;
    FreeCourses: number;
    TotalStudents: number;
    TotalCategories: number;
  }> {
    const response = await api.get('/api/courses/meta/stats');
    return response.data;
  }

  // Course search suggestions
  async searchCourses(query: string, limit: number = 5): Promise<Course[]> {
    const response = await this.getCourses({ 
      search: query, 
      limit,
      page: 1 
    });
    return response.courses;
  }

  // Get popular courses
  async getPopularCourses(limit: number = 6): Promise<Course[]> {
    const response = await this.getCourses({ 
      limit,
      page: 1 
    });
    // Sort by enrollment count descending
    return response.courses.sort((a, b) => b.EnrollmentCount - a.EnrollmentCount);
  }

  // Get featured courses (high rating + good enrollment)
  async getFeaturedCourses(limit: number = 6): Promise<Course[]> {
    const response = await this.getCourses({ 
      limit: 20,
      page: 1 
    });
    // Sort by rating * enrollment count (featured algorithm)
    return response.courses
      .filter(course => course.Rating >= 4.0 && course.EnrollmentCount >= 10)
      .sort((a, b) => (b.Rating * Math.log(b.EnrollmentCount + 1)) - (a.Rating * Math.log(a.EnrollmentCount + 1)))
      .slice(0, limit);
  }

  // Get user's enrolled courses (for tutoring session course selection)
  async getEnrolledCourses(): Promise<Course[]> {
    const response = await api.get('/api/enrollment/my-enrollments?limit=100');
    // Map enrollment data to Course interface
    return response.data.enrollments.map((enrollment: any) => ({
      Id: enrollment.courseId,
      Title: enrollment.Title,
      Description: enrollment.Description,
      Thumbnail: enrollment.Thumbnail,
      Category: enrollment.Category,
      Level: enrollment.Level,
      Duration: enrollment.Duration,
      Price: enrollment.Price,
      Rating: 0, // Not needed for tutoring dropdown
      EnrollmentCount: 0, // Not needed
      Tags: [],
      CreatedAt: enrollment.EnrolledAt,
      UpdatedAt: enrollment.EnrolledAt,
      LessonCount: 0,
      Instructor: {
        Id: '',
        FirstName: enrollment.instructorFirstName || '',
        LastName: enrollment.instructorLastName || '',
      }
    }));
  }
}

export const coursesApi = new CoursesApi();