/**
 * Study Group Type Definitions
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

export enum GroupRole {
  Member = 'member',
  Admin = 'admin'
}

export interface StudyGroup {
  Id: string;
  Name: string;
  Description: string | null;
  CourseId: string | null;
  CreatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
  MaxMembers: number | null;
  MemberCount?: number;
  CourseTitle?: string;
  CreatorName?: string;
  IsMember?: boolean;
  IsAdmin?: boolean;
}

export interface GroupMember {
  Id: string;
  GroupId: string;
  UserId: string;
  Role: GroupRole;
  JoinedAt: string;
  UserName?: string;
  UserEmail?: string;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  courseId?: string;
  maxMembers?: number;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  maxMembers?: number;
}

export interface SearchGroupsParams {
  q: string;
  courseId?: string;
}
