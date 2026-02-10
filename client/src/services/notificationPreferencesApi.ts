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

export interface NotificationPreferences {
  UserId: string;
  // Global toggles
  EnableInAppNotifications: boolean;
  EnableEmailNotifications: boolean;
  EmailDigestFrequency: 'none' | 'realtime' | 'daily' | 'weekly';
  QuietHoursStart: string | null;
  QuietHoursEnd: string | null;
  
  // Category toggles
  EnableProgressUpdates: boolean;
  EnableCourseUpdates: boolean;
  EnableAssessmentUpdates: boolean;
  EnableCommunityUpdates: boolean;
  EnableSystemAlerts: boolean;
  
  // Progress Updates subcategories
  EnableLessonCompletion: boolean | null;
  EnableVideoCompletion: boolean | null;
  EnableCourseMilestones: boolean | null;
  EnableProgressSummary: boolean | null;
  EmailLessonCompletion: boolean | null;
  EmailVideoCompletion: boolean | null;
  EmailCourseMilestones: boolean | null;
  EmailProgressSummary: boolean | null;
  
  // Course Updates subcategories
  EnableCourseEnrollment: boolean | null;
  EnableNewLessons: boolean | null;
  EnableLiveSessions: boolean | null;
  EnableCoursePublished: boolean | null;
  EnableInstructorAnnouncements: boolean | null;
  EnableEnrollmentRequest: boolean | null;
  EnableEnrollmentApproved: boolean | null;
  EnableEnrollmentRejected: boolean | null;
  EnableEnrollmentSuspended: boolean | null;
  EnableEnrollmentCancelled: boolean | null;
  EmailCourseEnrollment: boolean | null;
  EmailNewLessons: boolean | null;
  EmailLiveSessions: boolean | null;
  EmailCoursePublished: boolean | null;
  EmailInstructorAnnouncements: boolean | null;
  EmailEnrollmentRequest: boolean | null;
  EmailEnrollmentApproved: boolean | null;
  EmailEnrollmentRejected: boolean | null;
  EmailEnrollmentSuspended: boolean | null;
  EmailEnrollmentCancelled: boolean | null;
  
  // Assessment Updates subcategories
  EnableAssessmentSubmitted: boolean | null;
  EnableAssessmentGraded: boolean | null;
  EnableNewAssessment: boolean | null;
  EnableAssessmentDue: boolean | null;
  EnableSubmissionToGrade: boolean | null;
  EmailAssessmentSubmitted: boolean | null;
  EmailAssessmentGraded: boolean | null;
  EmailNewAssessment: boolean | null;
  EmailAssessmentDue: boolean | null;
  EmailSubmissionToGrade: boolean | null;
  
  // Community Updates subcategories
  EnableComments: boolean | null;
  EnableReplies: boolean | null;
  EnableMentions: boolean | null;
  EnableDirectMessages: boolean | null;
  EnableGroupInvites: boolean | null;
  EnableGroupActivity: boolean | null;
  EnableOfficeHours: boolean | null;
  EnableAITutoring: boolean | null;
  EmailComments: boolean | null;
  EmailReplies: boolean | null;
  EmailMentions: boolean | null;
  EmailDirectMessages: boolean | null;
  EmailGroupInvites: boolean | null;
  EmailGroupActivity: boolean | null;
  EmailOfficeHours: boolean | null;
  EmailAITutoring: boolean | null;
  
  // System Alerts subcategories
  EnablePaymentConfirmation: boolean | null;
  EnablePaymentReceipt: boolean | null;
  EnableRefundConfirmation: boolean | null;
  EnableCertificates: boolean | null;
  EnableSecurityAlerts: boolean | null;
  EnableProfileUpdates: boolean | null;
  EnableRiskAlerts: boolean | null;
  EmailPaymentConfirmation: boolean | null;
  EmailPaymentReceipt: boolean | null;
  EmailRefundConfirmation: boolean | null;
  EmailCertificates: boolean | null;
  EmailSecurityAlerts: boolean | null;
  EmailProfileUpdates: boolean | null;
  EmailRiskAlerts: boolean | null;
}

const notificationPreferencesApi = {
  // Get user's notification preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get('/notifications/preferences');
    const prefs = response.data.preferences; // Backend returns {success: true, preferences: {...}}
    
    // Helper function to convert time to HH:mm format
    const formatTime = (timeValue: any): string | null => {
      if (!timeValue) return null;
      
      // If it's already in HH:mm format, return as is
      if (typeof timeValue === 'string' && /^\d{2}:\d{2}/.test(timeValue)) {
        return timeValue.substring(0, 5);
      }
      
      // If it's a full ISO timestamp or Date object, extract time
      try {
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      } catch (e) {
        console.error('Error parsing time:', e);
      }
      
      return null;
    };
    
    // Format time fields
    if (prefs.QuietHoursStart) {
      prefs.QuietHoursStart = formatTime(prefs.QuietHoursStart);
    }
    if (prefs.QuietHoursEnd) {
      prefs.QuietHoursEnd = formatTime(prefs.QuietHoursEnd);
    }
    
    // Return as-is (PascalCase from backend matches interface)
    return prefs;
  },

  // Update notification preferences
  updatePreferences: async (data: Partial<NotificationPreferences>): Promise<void> => {
    // Data already in PascalCase, send directly to backend
    const response = await api.patch('/notifications/preferences', data);
    return response.data;
  }
};

export default notificationPreferencesApi;
