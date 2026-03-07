import { DatabaseService } from './DatabaseService';
import { SettingsService } from './SettingsService';
import { InstructorPublicProfile, InstructorPublicCourse } from '../types/database';
import { logger } from '../utils/logger';

export class InstructorProfileService {
  private db = DatabaseService.getInstance();
  private settingsService = new SettingsService();

  /**
   * Get a public instructor profile by ID.
   * Respects privacy settings — returns null if profile is private.
   */
  async getPublicProfile(instructorId: string): Promise<InstructorPublicProfile | null> {
    try {
      // 1. Fetch instructor basic info
      const userResult = await this.db.query(`
        SELECT 
          Id, FirstName, LastName, Avatar, Bio, Headline,
          WebsiteUrl, LinkedInUrl, TwitterUrl, CreatedAt
        FROM dbo.Users
        WHERE Id = @instructorId
          AND Role IN ('instructor', 'admin')
          AND IsActive = 1
      `, { instructorId });

      if (userResult.length === 0) {
        logger.warn('Instructor public profile not found', { instructorId });
        return null;
      }

      const user = userResult[0];

      // 2. Check privacy settings — only show truly public profiles
      try {
        const settings = await this.settingsService.getUserSettings(instructorId);
        if (settings.ProfileVisibility !== 'public') {
          logger.info('Instructor profile is not public', { instructorId, visibility: settings.ProfileVisibility });
          return null;
        }
      } catch {
        // If settings retrieval fails, default to allowing public access
      }

      // 3. Aggregate stats across all published courses
      const statsResult = await this.db.query(`
        SELECT 
          COUNT(DISTINCT c.Id) as totalCourses,
          ISNULL(SUM(c.EnrollmentCount), 0) as totalStudents,
          CASE 
            WHEN SUM(CASE WHEN c.RatingCount > 0 THEN 1 ELSE 0 END) > 0
            THEN CAST(SUM(c.Rating * c.RatingCount) AS FLOAT) / NULLIF(SUM(c.RatingCount), 0)
            ELSE 0
          END as averageRating,
          ISNULL(SUM(c.RatingCount), 0) as totalReviews
        FROM dbo.Courses c
        WHERE c.InstructorId = @instructorId
          AND c.Status = 'published'
      `, { instructorId });

      const stats = statsResult[0] || {
        totalCourses: 0,
        totalStudents: 0,
        averageRating: 0,
        totalReviews: 0
      };

      // 4. Published courses list
      const coursesResult = await this.db.query(`
        SELECT 
          Id, Title, Description, Thumbnail, Category, Level,
          Price, Rating, RatingCount, EnrollmentCount, Duration
        FROM dbo.Courses
        WHERE InstructorId = @instructorId
          AND Status = 'published'
        ORDER BY EnrollmentCount DESC
      `, { instructorId });

      const courses: InstructorPublicCourse[] = coursesResult.map((c: any) => ({
        id: c.Id,
        title: c.Title,
        description: c.Description,
        thumbnail: c.Thumbnail,
        category: c.Category,
        level: c.Level,
        price: c.Price,
        rating: c.Rating,
        ratingCount: c.RatingCount,
        enrollmentCount: c.EnrollmentCount,
        duration: c.Duration || 0
      }));

      // 5. Assemble response
      const profile: InstructorPublicProfile = {
        id: user.Id,
        firstName: user.FirstName,
        lastName: user.LastName,
        avatar: user.Avatar,
        bio: user.Bio,
        headline: user.Headline,
        websiteUrl: user.WebsiteUrl,
        linkedInUrl: user.LinkedInUrl,
        twitterUrl: user.TwitterUrl,
        joinedAt: user.CreatedAt,
        stats: {
          totalStudents: stats.totalStudents,
          totalCourses: stats.totalCourses,
          averageRating: Math.round((stats.averageRating || 0) * 100) / 100,
          totalReviews: stats.totalReviews
        },
        courses
      };

      logger.info('Instructor public profile fetched', { instructorId, courseCount: courses.length });
      return profile;
    } catch (error) {
      logger.error('Error fetching instructor public profile', { instructorId, error });
      throw error;
    }
  }
}
