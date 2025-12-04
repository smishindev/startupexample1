/**
 * Presence Types & Interfaces
 * User online/offline status tracking
 */

export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

export interface UserPresence {
  UserId: string;
  Status: PresenceStatus;
  Activity: string | null;
  LastSeenAt: string;
  UpdatedAt: string;
  // Joined user data
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Avatar?: string;
  Role?: string;
}

export interface OnlineUser {
  UserId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Avatar: string | null;
  Role: string;
  Status: PresenceStatus;
  Activity: string | null;
  LastSeenAt: string;
}

export interface UpdatePresenceData {
  status: PresenceStatus;
  activity?: string;
}

export interface PresenceEventData {
  userId: string;
  status: PresenceStatus;
  activity?: string;
  timestamp: string;
}

export interface BulkPresenceRequest {
  userIds: string[];
}

export interface BulkPresenceResponse {
  presences: UserPresence[];
  count: number;
}

export interface OnlineUsersResponse {
  users: OnlineUser[];
  count: number;
  limit: number;
}
