/**
 * Office Hours Types
 * TypeScript interfaces for Office Hours scheduling and queue management
 */

/**
 * Office hours schedule status
 */
export enum ScheduleStatus {
  Active = 'active',
  Inactive = 'inactive'
}

/**
 * Queue entry status
 */
export enum QueueStatus {
  Waiting = 'waiting',
  Admitted = 'admitted',
  Completed = 'completed',
  Cancelled = 'cancelled'
}

/**
 * Days of week for scheduling
 */
export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6
}

/**
 * Office hours schedule interface
 */
export interface OfficeHoursSchedule {
  Id: string;
  InstructorId: string;
  DayOfWeek: number; // 0-6 (Sunday-Saturday)
  StartTime: string; // HH:mm:ss format
  EndTime: string;   // HH:mm:ss format
  IsActive: boolean;
  CreatedAt: string;
  InstructorName?: string; // Enriched field
}

/**
 * Queue entry interface
 */
export interface QueueEntry {
  Id: string;
  InstructorId: string;
  StudentId: string;
  ScheduleId?: string;
  Status: QueueStatus;
  Question?: string;
  JoinedQueueAt: string;
  AdmittedAt?: string;
  CompletedAt?: string;
  Position?: number; // Position in queue (enriched)
  StudentName?: string; // Enriched field
  StudentEmail?: string; // Enriched field
  // Schedule details (enriched from JOIN)
  DayOfWeek?: number;
  StartTime?: string;
  EndTime?: string;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  waiting: number;
  admitted: number;
  completed?: number;
  averageWaitTime?: number; // in minutes
}

/**
 * Create schedule data (form submission)
 */
export interface CreateScheduleData {
  dayOfWeek: number;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

/**
 * Update schedule data
 */
export interface UpdateScheduleData {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

/**
 * Join queue data (form submission)
 */
export interface JoinQueueData {
  instructorId: string;
  scheduleId: string;
  question?: string;
}

/**
 * My queue status response
 */
export interface MyQueueStatus {
  queueEntry: QueueEntry | null;
  position: number;
  inQueue: boolean;
}

/**
 * Instructor with schedules (for dropdown)
 */
export interface InstructorWithSchedule {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  HasSchedule: boolean;
  Schedules?: OfficeHoursSchedule[];
}

/**
 * Helper function to convert DayOfWeek enum to string
 */
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
};

/**
 * Helper function to format time from HH:mm:ss to HH:mm AM/PM
 */
export const formatTime = (time: string): string => {
  if (!time) return '';
  
  // Handle both HH:mm:ss and HH:mm formats
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12; // Convert 0 to 12
  
  return `${displayHours}:${minutes} ${period}`;
};

/**
 * Helper function to get queue status color
 */
export const getQueueStatusColor = (status: QueueStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status) {
    case QueueStatus.Waiting:
      return 'warning';
    case QueueStatus.Admitted:
      return 'primary';
    case QueueStatus.Completed:
      return 'success';
    case QueueStatus.Cancelled:
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Helper function to get queue status label
 */
export const getQueueStatusLabel = (status: QueueStatus): string => {
  switch (status) {
    case QueueStatus.Waiting:
      return 'Waiting';
    case QueueStatus.Admitted:
      return 'In Session';
    case QueueStatus.Completed:
      return 'Completed';
    case QueueStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
};
