/**
 * Study Groups API Service
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { StudyGroup, GroupMember, CreateGroupData, UpdateGroupData, SearchGroupsParams } from '../types/studyGroup';

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

const API_URL = '/api/study-groups';

/**
 * Get all study groups
 */
export const getAllGroups = async (): Promise<StudyGroup[]> => {
  try {
    const response = await api.get(API_URL);
    return response.data.groups || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch study groups');
  }
};

/**
 * Create a new study group
 */
export const createGroup = async (data: CreateGroupData): Promise<StudyGroup> => {
  try {
    const response = await api.post(API_URL, data);
    return response.data.group || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create study group');
  }
};

/**
 * Get study group by ID
 */
export const getGroupById = async (groupId: string): Promise<StudyGroup> => {
  try {
    const response = await api.get(`${API_URL}/${groupId}`);
    return response.data.group || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch study group');
  }
};

/**
 * Get all study groups for a course
 */
export const getGroupsByCourse = async (courseId: string): Promise<StudyGroup[]> => {
  try {
    const response = await api.get(`${API_URL}/course/${courseId}`);
    return response.data.groups || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch course study groups');
  }
};

/**
 * Get current user's study groups
 */
export const getMyGroups = async (): Promise<StudyGroup[]> => {
  try {
    const response = await api.get(`${API_URL}/my/groups`);
    return response.data.groups || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch your study groups');
  }
};

/**
 * Join a study group
 */
export const joinGroup = async (groupId: string): Promise<GroupMember> => {
  try {
    const response = await api.post(`${API_URL}/${groupId}/join`);
    return response.data.member || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to join study group');
  }
};

/**
 * Leave a study group
 */
export const leaveGroup = async (groupId: string): Promise<void> => {
  try {
    await api.post(`${API_URL}/${groupId}/leave`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to leave study group');
  }
};

/**
 * Get study group members
 */
export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  try {
    const response = await api.get(`${API_URL}/${groupId}/members`);
    return response.data.members || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to fetch group members');
  }
};

/**
 * Promote member to admin
 */
export const promoteMember = async (groupId: string, userId: string): Promise<GroupMember> => {
  try {
    const response = await api.post(`${API_URL}/${groupId}/members/${userId}/promote`);
    return response.data.member || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to promote member');
  }
};

/**
 * Remove member from group
 */
export const removeMember = async (groupId: string, userId: string): Promise<void> => {
  try {
    await api.post(`${API_URL}/${groupId}/members/${userId}/remove`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to remove member');
  }
};

/**
 * Update study group details
 */
export const updateGroup = async (groupId: string, data: UpdateGroupData): Promise<StudyGroup> => {
  try {
    const response = await api.put(`${API_URL}/${groupId}`, data);
    return response.data.group || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update study group');
  }
};

/**
 * Delete study group
 */
export const deleteGroup = async (groupId: string): Promise<void> => {
  try {
    await api.delete(`${API_URL}/${groupId}`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to delete study group');
  }
};

/**
 * Search study groups
 */
export const searchGroups = async (params: SearchGroupsParams): Promise<StudyGroup[]> => {
  try {
    const response = await api.get(`${API_URL}/search`, { params });
    return response.data.groups || response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to search study groups');
  }
};

/**
 * Invite a user to join a study group
 */
export const inviteUser = async (groupId: string, userId: string): Promise<void> => {
  try {
    await api.post(`${API_URL}/${groupId}/invite`, { userId });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send invitation');
  }
};
