/**
 * Live Session Types
 * Phase 2 - Collaborative Features
 */

export interface LiveSession {
  Id: string;
  Title: string;
  Description: string | null;
  CourseId: string | null;
  InstructorId: string;
  ScheduledAt: string;
  StartedAt: string | null;
  EndedAt: string | null;
  Duration: number;
  Capacity: number;
  Status: SessionStatus;
  StreamUrl: string | null;
  RecordingUrl: string | null;
  Materials: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  // Populated fields (from joins)
  InstructorName?: string;
  CourseTitle?: string;
  AttendeeCount?: number;
  HasJoined?: boolean; // Whether current user has joined this session
}

export enum SessionStatus {
  Scheduled = 'scheduled',
  InProgress = 'live',
  Ended = 'ended',
  Cancelled = 'cancelled'
}

export interface SessionAttendee {
  SessionId: string;
  UserId: string;
  JoinedAt: string;
  LeftAt: string | null;
  // User details
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
}

export interface CreateSessionData {
  title: string;
  description?: string;
  courseId?: string | null;
  scheduledAt: string;
  duration: number;
  capacity: number;
  streamUrl?: string | null;
  materials?: string | null;
}

export interface UpdateSessionData {
  title?: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  capacity?: number;
  streamUrl?: string;
  materials?: string;
}
