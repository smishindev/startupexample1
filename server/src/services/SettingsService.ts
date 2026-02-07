import sql from 'mssql';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { FilteredUser } from '../types/database';

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

export interface VisibilityCheckResult {
  allowed: boolean;
  reason?: string;
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

  // ==========================================
  // PRIVACY ENFORCEMENT METHODS
  // ==========================================

  /**
   * Check if viewer can see target user's profile
   * @param targetUserId - User whose profile is being viewed
   * @param viewerId - User trying to view the profile (null for public/unauthenticated)
   * @returns Object with allowed status and optional reason
   */
  async canViewProfile(targetUserId: string, viewerId: string | null): Promise<VisibilityCheckResult> {
    try {
      // User can always view their own profile
      if (viewerId && targetUserId === viewerId) {
        return { allowed: true };
      }

      // Instructor override: Can view any student's profile in their courses
      if (viewerId) {
        const viewerData = await this.dbService.query(`
          SELECT Role FROM dbo.Users WHERE Id = @userId
        `, { userId: viewerId });
        
        if (viewerData.length > 0 && viewerData[0].Role === 'instructor') {
          // Check if target user is enrolled in any of instructor's courses
          const enrollmentCheck = await this.dbService.query(`
            SELECT TOP 1 1
            FROM dbo.Enrollments e
            INNER JOIN dbo.Courses c ON e.CourseId = c.Id
            WHERE e.UserId = @targetUserId 
              AND c.InstructorId = @instructorId
          `, { targetUserId, instructorId: viewerId });
          
          if (enrollmentCheck.length > 0) {
            return { allowed: true }; // Instructor can see their students' profiles
          }
        }
      }

      // Get target user's settings
      const settings = await this.getUserSettings(targetUserId);

      // Check visibility setting
      switch (settings.ProfileVisibility) {
        case 'public':
          return { allowed: true };

        case 'private':
          return { 
            allowed: false, 
            reason: 'This profile is private' 
          };

        case 'students':
          // Check if both users are enrolled in same course
          if (!viewerId) {
            return { 
              allowed: false, 
              reason: 'This profile is only visible to fellow students' 
            };
          }
          
          const areClassmates = await this.areStudentsTogether(targetUserId, viewerId);
          return areClassmates 
            ? { allowed: true }
            : { 
                allowed: false, 
                reason: 'This profile is only visible to students in the same courses' 
              };

        default:
          // Default to private for safety
          return { 
            allowed: false, 
            reason: 'Profile visibility not configured' 
          };
      }
    } catch (error) {
      console.error('❌ Error checking profile visibility:', error);
      // Fail closed - default to private
      return { 
        allowed: false, 
        reason: 'Unable to verify profile visibility' 
      };
    }
  }

  /**
   * Check if viewer can see target user's progress data
   * @param targetUserId - User whose progress is being viewed
   * @param viewerId - User trying to view the progress
   * @param overrideContext - Optional context for overrides (e.g., 'instructor' with courseId)
   * @returns Boolean indicating if progress can be viewed
   */
  async canViewProgress(
    targetUserId: string, 
    viewerId: string | null,
    overrideContext?: { role: string; courseId?: string }
  ): Promise<boolean> {
    try {
      // User can always view their own progress
      if (viewerId && targetUserId === viewerId) {
        return true;
      }

      // Instructor override: Can view any enrolled student's progress
      if (viewerId) {
        const viewerData = await this.dbService.query(`
          SELECT Role FROM dbo.Users WHERE Id = @userId
        `, { userId: viewerId });
        
        if (viewerData.length > 0 && viewerData[0].Role === 'instructor') {
          // Check if target user is enrolled in any of instructor's courses
          const enrollmentCheck = await this.dbService.query(`
            SELECT TOP 1 1
            FROM dbo.Enrollments e
            INNER JOIN dbo.Courses c ON e.CourseId = c.Id
            WHERE e.UserId = @targetUserId 
              AND c.InstructorId = @instructorId
          `, { targetUserId, instructorId: viewerId });
          
          if (enrollmentCheck.length > 0) {
            return true; // Instructor can see their students' progress
          }
        }
      }

      // Specific course context override
      if (overrideContext?.role === 'instructor' && overrideContext.courseId && viewerId) {
        const isInstructorsCourse = await this.isInstructorOfCourse(viewerId, overrideContext.courseId);
        const isStudentEnrolled = await this.isStudentEnrolledInCourse(targetUserId, overrideContext.courseId);
        
        if (isInstructorsCourse && isStudentEnrolled) {
          return true;
        }
      }

      // Get target user's settings
      const settings = await this.getUserSettings(targetUserId);

      // Respect ShowProgress setting
      return settings.ShowProgress;
    } catch (error) {
      console.error('❌ Error checking progress visibility:', error);
      // Fail closed - default to hidden
      return false;
    }
  }

  /**
   * Check if user accepts direct messages
   * @param userId - User to check
   * @returns Boolean indicating if messages are allowed
   */
  async canReceiveMessages(userId: string): Promise<boolean> {
    try {
      const settings = await this.getUserSettings(userId);
      return settings.AllowMessages;
    } catch (error) {
      console.error('❌ Error checking message permissions:', error);
      // Fail closed - default to not allowed
      return false;
    }
  }

  /**
   * Get user data with privacy settings applied
   * @param userId - User to fetch
   * @param viewerId - User viewing the data (null for system/public)
   * @param context - Context of the request ('profile', 'course', 'system')
   * @returns Filtered user object with privacy applied
   */
  async getUserWithPrivacy(
    userId: string,
    viewerId: string | null,
    context: 'profile' | 'course' | 'system' = 'system'
  ): Promise<FilteredUser | null> {
    try {
      // Fetch user data
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT 
            Id, FirstName, LastName, Username, Email, Avatar, Role, 
            LearningStyle, CreatedAt
          FROM Users
          WHERE Id = @UserId AND IsActive = 1
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const user = result.recordset[0];
      const settings = await this.getUserSettings(userId);
      const isOwnProfile = viewerId === userId;

      // Apply privacy filters
      return this.filterUserData(user, settings, isOwnProfile);
    } catch (error) {
      console.error('❌ Error fetching user with privacy:', error);
      throw new Error('Failed to fetch user data');
    }
  }

  /**
   * Filter user data based on privacy settings
   * @param user - Raw user object
   * @param settings - User's privacy settings
   * @param isOwnProfile - Whether this is the user's own profile
   * @returns Filtered user object
   */
  filterUserData(user: any, settings: UserSettings, isOwnProfile: boolean): FilteredUser {
    const filtered: FilteredUser = { ...user };

    // Email filtering
    if (!settings.ShowEmail && !isOwnProfile) {
      filtered.Email = null;
    }

    return filtered;
  }

  /**
   * Check if two users are enrolled in the same course (classmates)
   * @param userId1 - First user
   * @param userId2 - Second user
   * @returns Boolean indicating if they share a course
   */
  private async areStudentsTogether(userId1: string, userId2: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId1', sql.UniqueIdentifier, userId1)
        .input('UserId2', sql.UniqueIdentifier, userId2)
        .query(`
          SELECT COUNT(*) as SharedCourses
          FROM Enrollments e1
          INNER JOIN Enrollments e2 
            ON e1.CourseId = e2.CourseId
          WHERE e1.UserId = @UserId1 
            AND e2.UserId = @UserId2
            AND e1.Status IN ('active', 'completed')
            AND e2.Status IN ('active', 'completed')
        `);

      const sharedCourses = result.recordset[0]?.SharedCourses || 0;
      return sharedCourses > 0;
    } catch (error) {
      console.error('❌ Error checking if students are together:', error);
      return false;
    }
  }

  /**
   * Check if user is instructor of a specific course
   * @param userId - User to check
   * @param courseId - Course to check
   * @returns Boolean indicating if user is the course instructor
   */
  private async isInstructorOfCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('CourseId', sql.UniqueIdentifier, courseId)
        .query(`
          SELECT COUNT(*) as IsInstructor
          FROM Courses
          WHERE Id = @CourseId 
            AND InstructorId = @UserId
            AND IsActive = 1
        `);

      const isInstructor = result.recordset[0]?.IsInstructor || 0;
      return isInstructor > 0;
    } catch (error) {
      console.error('❌ Error checking if user is instructor:', error);
      return false;
    }
  }

  /**
   * Check if student is enrolled in a specific course
   * @param userId - Student to check
   * @param courseId - Course to check
   * @returns Boolean indicating if student is enrolled
   */
  private async isStudentEnrolledInCourse(userId: string, courseId: string): Promise<boolean> {
    try {
      const request = await this.dbService.getRequest();
      const result = await request
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('CourseId', sql.UniqueIdentifier, courseId)
        .query(`
          SELECT COUNT(*) as IsEnrolled
          FROM Enrollments
          WHERE UserId = @UserId 
            AND CourseId = @CourseId
            AND Status IN ('active', 'completed')
        `);

      const isEnrolled = result.recordset[0]?.IsEnrolled || 0;
      return isEnrolled > 0;
    } catch (error) {
      console.error('❌ Error checking if student is enrolled:', error);
      return false;
    }
  }
}
