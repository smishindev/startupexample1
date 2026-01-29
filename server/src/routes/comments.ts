import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CommentService } from '../services/CommentService';

export const createCommentsRouter = (commentService: CommentService) => {
  const router = Router();

// GET /api/comments/:entityType/:entityId - Get all comments for an entity
router.get('/:entityType/:entityId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const userId = (req as any).user.userId;
    const { page, limit, sort } = req.query;

    // Validate entityType
    const validTypes = ['lesson', 'course', 'assignment', 'study_group', 'announcement'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Check access
    const hasAccess = await commentService.canAccessComments(userId, entityType, entityId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to view comments' });
    }

    const options = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      sort: (sort as 'newest' | 'oldest' | 'likes') || 'newest'
    };

    const result = await commentService.getComments(entityType, entityId, userId, options);

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

// POST /api/comments - Create new comment or reply
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { entityType, entityId, content, parentCommentId } = req.body;

    // Validate required fields
    if (!entityType || !entityId || !content) {
      return res.status(400).json({ error: 'Missing required fields: entityType, entityId, content' });
    }

    // Validate entityType
    const validTypes = ['lesson', 'course', 'assignment', 'study_group', 'announcement'];
    if (!validTypes.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const comment = await commentService.createComment({
      userId,
      entityType,
      entityId,
      content,
      parentCommentId
    });

    res.status(201).json({ comment, message: 'Comment posted successfully' });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    const statusCode = error.message.includes('permission') || error.message.includes('not allowed') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to create comment' });
  }
});

// PUT /api/comments/:commentId - Edit own comment
router.put('/:commentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user.userId;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const comment = await commentService.updateComment(commentId, userId, content);

    res.json({ comment, message: 'Comment updated successfully' });
  } catch (error: any) {
    console.error('Error updating comment:', error);
    const statusCode = error.message.includes('permission') || error.message.includes('only edit') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to update comment' });
  }
});

// DELETE /api/comments/:commentId - Delete own comment (soft delete)
router.delete('/:commentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    await commentService.deleteComment(commentId, userId, userRole);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    const statusCode = error.message.includes('permission') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to delete comment' });
  }
});

// POST /api/comments/:commentId/like - Toggle like on comment
router.post('/:commentId/like', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user.userId;

    const result = await commentService.toggleLike(commentId, userId);

    res.json(result);
  } catch (error: any) {
    console.error('Error toggling like:', error);
    res.status(400).json({ error: error.message || 'Failed to toggle like' });
  }
});

  return router;
};
