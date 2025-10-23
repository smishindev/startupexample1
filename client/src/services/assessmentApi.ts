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

export interface Assessment {
  id: string;
  lessonId: string;
  title: string;
  type: 'quiz' | 'test' | 'assignment' | 'project' | 'practical';
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  isAdaptive: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  questions?: Question[];
  userSubmissions?: AssessmentSubmission[];
}

export interface AssessmentProgress {
  bestScore: number;
  latestSubmission: AssessmentSubmission | null;
  totalAttempts: number;
  completedAttempts: number;
  attemptsUsed: number;
  attemptsLeft: number;
  passed: boolean;
  canTakeAssessment: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'passed';
}

export interface AssessmentWithProgress extends Assessment {
  userProgress?: AssessmentProgress;
}

export interface Question {
  id: string;
  assessmentId: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'code' | 'drag_drop' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer?: any;
  explanation?: string;
  difficulty: number;
  tags: string[];
  adaptiveWeight?: number;
  orderIndex: number;
}

export interface AssessmentSubmission {
  id: string;
  userId: string;
  assessmentId: string;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  timeSpent: number;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  feedback?: Record<string, any>;
}

export interface CreateAssessmentRequest {
  lessonId: string;
  title: string;
  type: Assessment['type'];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  isAdaptive?: boolean;
  questions?: Omit<Question, 'id' | 'assessmentId'>[];
}

export interface UpdateAssessmentRequest {
  title?: string;
  type?: Assessment['type'];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  isAdaptive?: boolean;
}

export interface StartAssessmentResponse {
  submissionId: string;
  attemptNumber: number;
  message?: string;
}

export interface SubmitAssessmentRequest {
  answers: Record<string, any>;
}

export interface SubmitAssessmentResponse {
  score: number;
  maxScore: number;
  passed: boolean;
  timeSpent: number;
  feedback: Record<string, any>;
}

export interface AssessmentAnalytics {
  assessment: Assessment;
  analytics: {
    totalSubmissions: number;
    completedSubmissions: number;
    passedSubmissions: number;
    passRate: number;
    averageScore: number;
    averageTimeSpent: number;
    minScore: number;
    maxScore: number;
    scoreDistribution: Array<{
      scoreRange: string;
      count: number;
    }>;
    recentSubmissions: Array<{
      Id: string;
      Score: number;
      TimeSpent: number;
      AttemptNumber: number;
      CompletedAt: string;
      StudentName: string;
      Passed: boolean;
    }>;
    topPerformers: Array<{
      StudentName: string;
      Score: number;
      AttemptNumber: number;
      TimeSpent: number;
      CompletedAt: string;
    }>;
    strugglingStudents: Array<{
      StudentName: string;
      Score: number;
      AttemptNumber: number;
      TimeSpent: number;
      CompletedAt: string;
    }>;
    questionAnalysis: Array<{
      Id: string;
      Question: string;
      Type: string;
      Difficulty: number;
      totalAttempts: number;
      correctAnswers: number;
      successRate: number;
    }>;
  };
}

export interface AssessmentSubmissionDetail {
  Id: string;
  Score: number;
  MaxScore: number;
  TimeSpent: number;
  AttemptNumber: number;
  Status: 'in_progress' | 'completed' | 'abandoned';
  StartedAt: string;
  CompletedAt?: string;
  StudentName: string;
  StudentEmail: string;
  StudentId: string;
}

class AssessmentApiService {
  private baseUrl = '/api/assessments';

  // Get all assessments for a lesson
  async getAssessmentsByLesson(lessonId: string): Promise<AssessmentWithProgress[]> {
    const response = await api.get(`${this.baseUrl}/lesson/${lessonId}`);
    return response.data;
  }

  // Get assessment details with questions
  async getAssessment(assessmentId: string): Promise<Assessment> {
    // Add cache busting parameter to ensure fresh data
    const cacheBuster = Date.now();
    const response = await api.get(`${this.baseUrl}/${assessmentId}?_=${cacheBuster}`);
    
    // Debug: Log assessment data for the problematic assessment
    if (assessmentId === '372896DE-CA53-40FA-BDB4-7A486BCA1706') {
      console.log('[DEBUG Frontend] Assessment API Response:', {
        maxAttempts: response.data.maxAttempts,
        userSubmissions: response.data.userSubmissions?.map((s: any) => ({
          id: s.id,
          timeSpent: s.timeSpent,
          attemptNumber: s.attemptNumber,
          status: s.status
        }))
      });
    }
    
    return response.data;
  }

  // Create new assessment (instructors only)
  async createAssessment(assessmentData: CreateAssessmentRequest): Promise<Assessment> {
    const response = await api.post(this.baseUrl, assessmentData);
    return response.data;
  }

  // Update assessment (instructors only)
  async updateAssessment(assessmentId: string, updates: UpdateAssessmentRequest): Promise<Assessment> {
    const response = await api.put(`${this.baseUrl}/${assessmentId}`, updates);
    return response.data;
  }

  // Delete assessment (instructors only)
  async deleteAssessment(assessmentId: string): Promise<{ message: string }> {
    const response = await api.delete(`${this.baseUrl}/${assessmentId}`);
    return response.data;
  }

  // Start assessment attempt
  async startAssessment(assessmentId: string, isPreview: boolean = false): Promise<StartAssessmentResponse> {
    const response = await api.post(`${this.baseUrl}/${assessmentId}/start`, { isPreview });
    return response.data;
  }

  // Submit assessment answers (students only)
  async submitAssessment(submissionId: string, answers: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> {
    const response = await api.post(`${this.baseUrl}/submissions/${submissionId}/submit`, answers);
    return response.data;
  }

  // Get submission results
  async getSubmissionResults(submissionId: string): Promise<AssessmentSubmission> {
    const response = await api.get(`${this.baseUrl}/submissions/${submissionId}/results`);
    return response.data;
  }

  // Helper methods for frontend components

  // Get assessment with user progress
  async getAssessmentWithProgress(assessmentId: string): Promise<Assessment & { canTakeAssessment: boolean; attemptsLeft: number }> {
    const assessment = await this.getAssessment(assessmentId);
    const userSubmissions = assessment.userSubmissions || [];
    
    const completedAttempts = userSubmissions.filter(sub => sub.status === 'completed').length;
    const hasInProgress = userSubmissions.some(sub => sub.status === 'in_progress');
    const attemptsLeft = Math.max(0, assessment.maxAttempts - completedAttempts);
    
    // Debug: Log attempt calculation for the problematic assessment
    if (assessmentId === '372896DE-CA53-40FA-BDB4-7A486BCA1706') {
      console.log('[DEBUG Frontend] Attempt Calculation:', {
        maxAttempts: assessment.maxAttempts,
        totalSubmissions: userSubmissions.length,
        completedAttempts,
        hasInProgress,
        attemptsLeft,
        submissionStatuses: userSubmissions.map(s => ({ attempt: s.attemptNumber, status: s.status }))
      });
    }
    
    return {
      ...assessment,
      canTakeAssessment: !hasInProgress && completedAttempts < assessment.maxAttempts,
      attemptsLeft
    };
  }

  // Get best score for an assessment
  getBestScore(userSubmissions: AssessmentSubmission[]): number {
    if (!userSubmissions || userSubmissions.length === 0) return 0;
    return Math.max(...userSubmissions.map(sub => sub.score));
  }

  // Get latest attempt
  getLatestAttempt(userSubmissions: AssessmentSubmission[]): AssessmentSubmission | null {
    if (!userSubmissions || userSubmissions.length === 0) return null;
    return userSubmissions.reduce((latest, current) => 
      new Date(current.startedAt) > new Date(latest.startedAt) ? current : latest
    );
  }

  // Check if user passed assessment
  hasPassedAssessment(assessment: Assessment, userSubmissions: AssessmentSubmission[]): boolean {
    const bestScore = this.getBestScore(userSubmissions);
    return bestScore >= assessment.passingScore;
  }

  // Format time for display
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  // Get comprehensive assessment analytics for instructors
  async getMyAssessmentProgress(): Promise<any> {
    const response = await api.get(`${this.baseUrl}/my-progress`);
    return response.data;
  }

  async getAssessmentAnalytics(assessmentId: string): Promise<AssessmentAnalytics> {
    const response = await api.get(`${this.baseUrl}/${assessmentId}/analytics`);
    return response.data;
  }

  // Get all submissions for an assessment (instructors only)
  async getAssessmentSubmissions(
    assessmentId: string, 
    options?: {
      page?: number;
      limit?: number;
      status?: 'all' | 'completed' | 'in_progress' | 'abandoned';
    }
  ): Promise<{
    submissions: AssessmentSubmissionDetail[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);

    const response = await api.get(`${this.baseUrl}/${assessmentId}/submissions?${params}`);
    return response.data;
  }

  // Validate answers before submission
  validateAnswers(questions: Question[], answers: Record<string, any>): {
    isValid: boolean;
    missingAnswers: string[];
    invalidAnswers: string[];
  } {
    const missingAnswers: string[] = [];
    const invalidAnswers: string[] = [];

    questions.forEach(question => {
      // Handle both capitalized (from database) and lowercase (from interface) IDs
      const questionId = (question as any).Id || question.id;
      const answer = answers[questionId];
      
      if (answer === undefined || answer === null || answer === '') {
        missingAnswers.push(questionId);
        return;
      }

      // Handle both capitalized and lowercase property names
      const questionType = (question as any).Type || question.type;
      const questionOptions = question.options || ((question as any).Options ? JSON.parse((question as any).Options) : []);

      // Basic validation based on question type
      switch (questionType) {
        case 'multiple_choice':
          if (!questionOptions?.includes(answer)) {
            invalidAnswers.push(questionId);
          }
          break;
        case 'true_false':
          if (typeof answer !== 'boolean') {
            invalidAnswers.push(questionId);
          }
          break;
        case 'short_answer':
        case 'essay':
          if (typeof answer !== 'string' || answer.trim().length === 0) {
            invalidAnswers.push(questionId);
          }
          break;
        case 'code':
          if (typeof answer !== 'string') {
            invalidAnswers.push(questionId);
          }
          break;
        // Add more validation for other question types
      }
    });

    return {
      isValid: missingAnswers.length === 0 && invalidAnswers.length === 0,
      missingAnswers,
      invalidAnswers
    };
  }

  // Adaptive Assessment Methods
  async getNextAdaptiveQuestion(
    assessmentId: string, 
    submissionId: string,
    answeredQuestions: Array<{questionId: string, correct: boolean, difficulty: number}>,
    recentPerformance: {correct: number, total: number, avgDifficulty: number}
  ) {
    const response = await api.post(`/api/assessments/${assessmentId}/adaptive/next-question`, {
      submissionId,
      answeredQuestions,
      recentPerformance
    });
    return response.data;
  }

  async submitAdaptiveAnswer(
    assessmentId: string,
    submissionId: string,
    questionId: string,
    answer: any,
    timeSpent: number
  ) {
    const response = await api.post(`/api/assessments/${assessmentId}/adaptive/submit-answer`, {
      submissionId,
      questionId,
      answer,
      timeSpent
    });
    return response.data;
  }

  // Generate question templates for quiz creation
  getQuestionTemplate(type: Question['type']): Partial<Question> {
    const baseTemplate = {
      question: '',
      difficulty: 5,
      tags: [],
      explanation: '',
      orderIndex: 0
    };

    switch (type) {
      case 'multiple_choice':
        return {
          ...baseTemplate,
          type,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A'
        };
      case 'true_false':
        return {
          ...baseTemplate,
          type,
          options: ['True', 'False'],
          correctAnswer: true
        };
      case 'short_answer':
        return {
          ...baseTemplate,
          type,
          correctAnswer: ''
        };
      case 'essay':
        return {
          ...baseTemplate,
          type,
          correctAnswer: 'Sample answer or grading rubric'
        };
      case 'code':
        return {
          ...baseTemplate,
          type,
          correctAnswer: '// Expected code solution'
        };
      case 'drag_drop':
        return {
          ...baseTemplate,
          type,
          options: ['Item 1', 'Item 2', 'Item 3'],
          correctAnswer: ['Item 1', 'Item 2', 'Item 3'] // Order matters
        };
      case 'fill_blank':
        return {
          ...baseTemplate,
          type,
          correctAnswer: ['blank1', 'blank2'] // Array of correct answers for blanks
        };
      default:
        return baseTemplate;
    }
  }
}

export const assessmentApi = new AssessmentApiService();