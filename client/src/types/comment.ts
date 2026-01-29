export interface Comment {
  id: string;
  userId: string;
  entityType: 'lesson' | 'course' | 'assignment' | 'study_group' | 'announcement';
  entityId: string;
  content: string;
  parentCommentId: string | null;
  likesCount: number;
  repliesCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  
  // Joined data from Users table
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    role: string;
  };
  
  // User-specific flags
  isLikedByCurrentUser: boolean;
  canEdit: boolean;
  canDelete: boolean;
  
  // Nested replies (1 level deep)
  replies?: Comment[];
}

export interface CreateCommentRequest {
  entityType: string;
  entityId: string;
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentsPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  totalCount: number;
  pagination: CommentsPagination;
}
