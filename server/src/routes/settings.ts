import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SettingsService, UpdateSettingsParams } from '../services/SettingsService';
import { AccountDeletionService } from '../services/AccountDeletionService';
import { CourseManagementService } from '../services/CourseManagementService';
import { DataExportService } from '../services/DataExportService';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

/**
 * GET /api/settings
 * Get user settings
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settingsService = new SettingsService();
    const settings = await settingsService.getUserSettings(userId);

    // Convert to camelCase for frontend
    res.json({
      id: settings.Id,
      userId: settings.UserId,
      profileVisibility: settings.ProfileVisibility,
      showEmail: settings.ShowEmail,
      showProgress: settings.ShowProgress,
      allowMessages: settings.AllowMessages,
      theme: settings.Theme,
      language: settings.Language,
      fontSize: settings.FontSize,
      createdAt: settings.CreatedAt,
      updatedAt: settings.UpdatedAt
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/settings
 * Update user settings
 */
router.patch('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const params: UpdateSettingsParams = {
      profileVisibility: req.body.profileVisibility,
      showEmail: req.body.showEmail,
      showProgress: req.body.showProgress,
      allowMessages: req.body.allowMessages,
      theme: req.body.theme,
      language: req.body.language,
      fontSize: req.body.fontSize
    };

    const settingsService = new SettingsService();
    const settings = await settingsService.updateSettings(userId, params);

    // Convert to camelCase for frontend
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        id: settings.Id,
        userId: settings.UserId,
        profileVisibility: settings.ProfileVisibility,
        showEmail: settings.ShowEmail,
        showProgress: settings.ShowProgress,
        allowMessages: settings.AllowMessages,
        theme: settings.Theme,
        language: settings.Language,
        fontSize: settings.FontSize,
        createdAt: settings.CreatedAt,
        updatedAt: settings.UpdatedAt
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/settings/export-data
 * Request data export
 */
router.post('/export-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dataExportService = new DataExportService();

    // Create export request (includes rate limiting check)
    const exportRequest = await dataExportService.createExportRequest(userId);

    console.log(`📦 Data export requested for user ${userId} (Request ID: ${exportRequest.Id})`);

    res.json({
      success: true,
      message: 'Data export request submitted successfully. You will receive an email when your export is ready (usually within 5-10 minutes).',
      requestId: exportRequest.Id,
      status: exportRequest.Status
    });
  } catch (error: any) {
    console.error('Error requesting data export:', error);
    
    // Handle rate limiting
    if (error.message?.includes('Rate limit exceeded')) {
      return res.status(429).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to request data export' });
  }
});

/**
 * GET /api/settings/export-data/status
 * Get status of latest export request
 */
router.get('/export-data/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dataExportService = new DataExportService();
    const exportRequest = await dataExportService.getLatestExportRequest(userId);

    if (!exportRequest) {
      return res.json({
        hasRequest: false,
        status: null
      });
    }

    res.json({
      hasRequest: true,
      requestId: exportRequest.Id,
      status: exportRequest.Status,
      requestedAt: exportRequest.RequestedAt,
      completedAt: exportRequest.CompletedAt,
      expiresAt: exportRequest.ExpiresAt,
      fileName: exportRequest.FileName,
      fileSize: exportRequest.FileSize,
      downloadCount: exportRequest.DownloadCount,
      errorMessage: exportRequest.ErrorMessage
    });
  } catch (error) {
    console.error('Error fetching export status:', error);
    res.status(500).json({ error: 'Failed to fetch export status' });
  }
});

/**
 * GET /api/settings/export-data/download/:requestId
 * Download export file
 */
router.get('/export-data/download/:requestId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dataExportService = new DataExportService();
    const exportRequest = await dataExportService.getExportRequest(requestId, userId);

    if (!exportRequest) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    if (exportRequest.Status !== 'completed') {
      return res.status(400).json({ error: `Export is not ready yet. Status: ${exportRequest.Status}` });
    }

    if (!exportRequest.FilePath || !fs.existsSync(exportRequest.FilePath)) {
      return res.status(404).json({ error: 'Export file not found' });
    }

    // Check if expired
    if (exportRequest.ExpiresAt && new Date(exportRequest.ExpiresAt) < new Date()) {
      return res.status(410).json({ error: 'Export has expired. Please request a new export.' });
    }

    // Increment download count
    await dataExportService.incrementDownloadCount(requestId);

    // Send file
    res.download(exportRequest.FilePath, exportRequest.FileName || 'export.zip', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download export file' });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download export' });
    }
  }
});

/**
 * GET /api/settings/deletion-check
 * Check if instructor can delete their account and get options
 */
router.get('/deletion-check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');
    const accountDeletionService = new AccountDeletionService(io);

    const options = await accountDeletionService.getInstructorDeletionOptions(userId);

    res.json(options);
  } catch (error) {
    console.error('Error checking deletion eligibility:', error);
    res.status(500).json({ error: 'Failed to check deletion eligibility' });
  }
});

/**
 * POST /api/settings/archive-courses
 * Archive all instructor's published courses
 */
router.post('/archive-courses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reason } = req.body;

    const io = req.app.get('io');
    const courseManagementService = new CourseManagementService(io);

    const result = await courseManagementService.archiveAllCourses(userId, reason);

    res.json(result);
  } catch (error) {
    console.error('Error archiving courses:', error);
    res.status(500).json({ error: 'Failed to archive courses' });
  }
});

/**
 * GET /api/settings/eligible-instructors
 * Get list of instructors eligible for course transfer
 */
router.get('/eligible-instructors', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const io = req.app.get('io');
    const courseManagementService = new CourseManagementService(io);

    const instructors = await courseManagementService.getEligibleInstructors(userId);

    res.json(instructors);
  } catch (error) {
    console.error('Error fetching eligible instructors:', error);
    res.status(500).json({ error: 'Failed to fetch eligible instructors' });
  }
});

/**
 * POST /api/settings/transfer-courses
 * Transfer courses to another instructor
 */
router.post('/transfer-courses', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { toInstructorId, courseIds, reason } = req.body;

    if (!toInstructorId) {
      return res.status(400).json({ error: 'Target instructor ID required' });
    }

    const io = req.app.get('io');
    const courseManagementService = new CourseManagementService(io);

    const result = await courseManagementService.transferCourses({
      fromInstructorId: userId,
      toInstructorId,
      courseIds,
      reason: reason || 'manual_transfer',
      transferredBy: userId
    });

    res.json(result);
  } catch (error) {
    console.error('Error transferring courses:', error);
    res.status(500).json({ error: 'Failed to transfer courses' });
  }
});

/**
 * POST /api/settings/delete-account
 * Delete user account
 */
router.post('/delete-account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirmPassword, reason, instructorAction, transferToInstructorId } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    console.log(`🗑️ Account deletion requested for user ${userId}`, 
      instructorAction ? `with action: ${instructorAction}` : '');

    // Get Socket.IO instance for notifications
    const io = req.app.get('io');
    const accountDeletionService = new AccountDeletionService(io);

    const result = await accountDeletionService.deleteAccount({
      userId,
      confirmPassword,
      reason,
      instructorAction,
      transferToInstructorId
    });

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.message 
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to process account deletion' });
  }
});

export default router;
