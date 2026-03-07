import { Router, Request, Response } from 'express';
import { InstructorProfileService } from '../services/InstructorProfileService';
import { logger } from '../utils/logger';

const router = Router();
const instructorProfileService = new InstructorProfileService();

/**
 * @route   GET /api/instructors/:id/profile
 * @desc    Get instructor public profile (no authentication required)
 * @access  Public
 */
router.get('/:id/profile', async (req: Request, res: Response) => {
  try {
    const instructorId = req.params.id;

    if (!instructorId) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ID is required'
      });
    }

    const profile = await instructorProfileService.getPublicProfile(instructorId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error fetching instructor public profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instructor profile'
    });
  }
});

export default router;
