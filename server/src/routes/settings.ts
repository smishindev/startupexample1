import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SettingsService, UpdateSettingsParams } from '../services/SettingsService';

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

    // TODO: Implement data export functionality
    // This should:
    // 1. Collect all user data (profile, enrollments, progress, transactions)
    // 2. Create a ZIP file with JSON/CSV exports
    // 3. Send email with download link
    // 4. Clean up file after 48 hours

    console.log(`📦 Data export requested for user ${userId}`);

    res.json({
      success: true,
      message: 'Data export request received. You will receive an email with the download link within 24 hours.'
    });
  } catch (error) {
    console.error('Error requesting data export:', error);
    res.status(500).json({ error: 'Failed to request data export' });
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

    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation required' });
    }

    // TODO: Implement account deletion workflow
    // This should:
    // 1. Verify password
    // 2. Cancel active subscriptions
    // 3. Delete all user data (cascading deletes)
    // 4. Send confirmation email
    // 5. Revoke all sessions/tokens
    // 6. Log deletion for compliance

    console.log(`🗑️ Account deletion requested for user ${userId}`);

    res.json({
      success: true,
      message: 'Account deletion functionality is not yet implemented. Please contact support.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to process account deletion' });
  }
});

export default router;
