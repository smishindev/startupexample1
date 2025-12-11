import sql from 'mssql';
import { DatabaseService } from './DatabaseService';

export interface UserSettings {
  Id: string;
  UserId: string;
  ProfileVisibility: 'public' | 'students' | 'private';
  ShowEmail: boolean;
  ShowProgress: boolean;
  AllowMessages: boolean;
  Theme: 'light' | 'dark' | 'auto';
  Language: 'en' | 'es' | 'fr' | 'de' | 'zh';
  FontSize: 'small' | 'medium' | 'large';
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface UpdateSettingsParams {
  profileVisibility?: 'public' | 'students' | 'private';
  showEmail?: boolean;
  showProgress?: boolean;
  allowMessages?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh';
  fontSize?: 'small' | 'medium' | 'large';
}

export class SettingsService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Get user settings (creates default if not exists)
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 
            Id, UserId, ProfileVisibility, ShowEmail, ShowProgress, AllowMessages,
            Theme, Language, FontSize, CreatedAt, UpdatedAt
          FROM UserSettings
          WHERE UserId = @UserId
        `);

      if (result.recordset.length === 0) {
        // Create default settings
        return await this.createDefaultSettings(userId);
      }

      return result.recordset[0];
    } catch (error) {
      console.error('❌ Error getting user settings:', error);
      throw new Error('Failed to retrieve user settings');
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, params: UpdateSettingsParams): Promise<UserSettings> {
    try {
      // Ensure settings exist
      const existingSettings = await this.getUserSettings(userId);

      const updates: string[] = [];
      const request = await this.dbService.getRequest();
      request.input('UserId', sql.UniqueIdentifier, userId);

      // Privacy settings
      if (params.profileVisibility !== undefined) {
        updates.push('ProfileVisibility = @ProfileVisibility');
        request.input('ProfileVisibility', sql.NVarChar(20), params.profileVisibility);
      }
      if (params.showEmail !== undefined) {
        updates.push('ShowEmail = @ShowEmail');
        request.input('ShowEmail', sql.Bit, params.showEmail);
      }
      if (params.showProgress !== undefined) {
        updates.push('ShowProgress = @ShowProgress');
        request.input('ShowProgress', sql.Bit, params.showProgress);
      }
      if (params.allowMessages !== undefined) {
        updates.push('AllowMessages = @AllowMessages');
        request.input('AllowMessages', sql.Bit, params.allowMessages);
      }

      // Appearance settings
      if (params.theme !== undefined) {
        updates.push('Theme = @Theme');
        request.input('Theme', sql.NVarChar(20), params.theme);
      }
      if (params.language !== undefined) {
        updates.push('Language = @Language');
        request.input('Language', sql.NVarChar(5), params.language);
      }
      if (params.fontSize !== undefined) {
        updates.push('FontSize = @FontSize');
        request.input('FontSize', sql.NVarChar(10), params.fontSize);
      }

      if (updates.length === 0) {
        return existingSettings;
      }

      updates.push('UpdatedAt = GETUTCDATE()');

      await request.query(`
        UPDATE UserSettings
        SET ${updates.join(', ')}
        WHERE UserId = @UserId
      `);

      console.log(`✅ Settings updated for user ${userId}`);

      // Return updated settings
      return await this.getUserSettings(userId);
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw new Error('Failed to update settings');
    }
  }

  /**
   * Create default settings for a user
   */
  private async createDefaultSettings(userId: string): Promise<UserSettings> {
    try {
      const request = await this.dbService.getRequest();
      await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          INSERT INTO UserSettings (UserId)
          VALUES (@UserId)
        `);

      console.log(`✅ Default settings created for user ${userId}`);

      // Return the created settings
      return await this.getUserSettings(userId);
    } catch (error) {
      console.error('❌ Error creating default settings:', error);
      throw new Error('Failed to create default settings');
    }
  }

  /**
   * Delete user settings (used when deleting account)
   */
  async deleteUserSettings(userId: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          DELETE FROM UserSettings
          WHERE UserId = @UserId
        `);

      console.log(`✅ Settings deleted for user ${userId}`);
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('❌ Error deleting settings:', error);
      throw new Error('Failed to delete settings');
    }
  }
}
