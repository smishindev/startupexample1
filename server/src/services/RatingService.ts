import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface CourseRating {
  Id: string;
  CourseId: string;
  UserId: string;
  Rating: number;
  ReviewText: string | null;
  IsEdited: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  // Joined user fields
  FirstName?: string;
  LastName?: string;
  Avatar?: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface PaginatedRatings {
  ratings: CourseRating[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class RatingService {
  private db = DatabaseService.getInstance();

  /**
   * Get paginated ratings for a course with user info
   */
  async getCourseRatings(
    courseId: string,
    page: number = 1,
    limit: number = 10,
    sort: 'newest' | 'oldest' | 'highest' | 'lowest' = 'newest'
  ): Promise<PaginatedRatings> {
    const offset = (page - 1) * limit;

    let orderBy = 'cr.CreatedAt DESC'; // newest
    switch (sort) {
      case 'oldest': orderBy = 'cr.CreatedAt ASC'; break;
      case 'highest': orderBy = 'cr.Rating DESC, cr.CreatedAt DESC'; break;
      case 'lowest': orderBy = 'cr.Rating ASC, cr.CreatedAt DESC'; break;
    }

    const [ratings, countResult] = await Promise.all([
      this.db.query(`
        SELECT 
          cr.Id, cr.CourseId, cr.UserId, cr.Rating, cr.ReviewText,
          cr.IsEdited, cr.CreatedAt, cr.UpdatedAt,
          u.FirstName, u.LastName, u.Avatar
        FROM CourseRatings cr
        INNER JOIN Users u ON cr.UserId = u.Id
        WHERE cr.CourseId = @courseId
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `, { courseId, offset, limit }),
      this.db.query(`
        SELECT COUNT(*) as total FROM CourseRatings WHERE CourseId = @courseId
      `, { courseId })
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      ratings: ratings.map((r: any) => ({
        ...r,
        IsEdited: Boolean(r.IsEdited),
      })),
      pagination: {
        current: page,
        pages: totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get rating distribution summary for a course
   */
  async getRatingSummary(courseId: string): Promise<RatingSummary> {
    const result = await this.db.query(`
      SELECT 
        ISNULL(AVG(CAST(Rating AS FLOAT)), 0) as average,
        COUNT(*) as total,
        SUM(CASE WHEN Rating = 1 THEN 1 ELSE 0 END) as star1,
        SUM(CASE WHEN Rating = 2 THEN 1 ELSE 0 END) as star2,
        SUM(CASE WHEN Rating = 3 THEN 1 ELSE 0 END) as star3,
        SUM(CASE WHEN Rating = 4 THEN 1 ELSE 0 END) as star4,
        SUM(CASE WHEN Rating = 5 THEN 1 ELSE 0 END) as star5
      FROM CourseRatings
      WHERE CourseId = @courseId
    `, { courseId });

    const row = result[0] || {};
    return {
      average: Math.round((row.average || 0) * 100) / 100,
      count: row.total || 0,
      distribution: {
        1: row.star1 || 0,
        2: row.star2 || 0,
        3: row.star3 || 0,
        4: row.star4 || 0,
        5: row.star5 || 0,
      },
    };
  }

  /**
   * Get a user's rating for a specific course
   */
  async getUserRating(userId: string, courseId: string): Promise<CourseRating | null> {
    const result = await this.db.query(`
      SELECT cr.*, u.FirstName, u.LastName, u.Avatar
      FROM CourseRatings cr
      INNER JOIN Users u ON cr.UserId = u.Id
      WHERE cr.UserId = @userId AND cr.CourseId = @courseId
    `, { userId, courseId });

    if (result.length === 0) return null;
    return { ...result[0], IsEdited: Boolean(result[0].IsEdited) };
  }

  /**
   * Submit or update a rating (upsert)
   * Returns { rating, isNew } where isNew indicates first-time rating
   */
  async submitRating(
    userId: string,
    courseId: string,
    rating: number,
    reviewText?: string | null
  ): Promise<{ rating: CourseRating; isNew: boolean }> {
    // Check if user already has a rating
    const existing = await this.db.query(`
      SELECT Id FROM CourseRatings WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    const isNew = existing.length === 0;
    const trimmedReview = reviewText?.trim() || null;

    if (isNew) {
      // Insert new rating
      await this.db.query(`
        INSERT INTO CourseRatings (CourseId, UserId, Rating, ReviewText)
        VALUES (@courseId, @userId, @rating, @reviewText)
      `, { courseId, userId, rating, reviewText: trimmedReview });
    } else {
      // Update existing rating
      await this.db.query(`
        UPDATE CourseRatings 
        SET Rating = @rating, ReviewText = @reviewText, IsEdited = 1, UpdatedAt = GETUTCDATE()
        WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId, rating, reviewText: trimmedReview });
    }

    // Recalculate denormalized rating on Courses table
    await this.recalculateCourseRating(courseId);

    // Fetch the saved rating to return
    const saved = await this.getUserRating(userId, courseId);
    return { rating: saved!, isNew };
  }

  /**
   * Delete a user's rating
   */
  async deleteRating(userId: string, courseId: string): Promise<boolean> {
    const result = await this.db.query(`
      DELETE FROM CourseRatings WHERE UserId = @userId AND CourseId = @courseId
    `, { userId, courseId });

    // Recalculate denormalized rating
    await this.recalculateCourseRating(courseId);

    return true;
  }

  /**
   * Recalculate and update the denormalized Rating and RatingCount on the Courses table
   */
  async recalculateCourseRating(courseId: string): Promise<void> {
    await this.db.query(`
      UPDATE Courses 
      SET 
        Rating = ISNULL((SELECT AVG(CAST(Rating AS DECIMAL(3,2))) FROM CourseRatings WHERE CourseId = @courseId), 0),
        RatingCount = (SELECT COUNT(*) FROM CourseRatings WHERE CourseId = @courseId),
        UpdatedAt = GETUTCDATE()
      WHERE Id = @courseId
    `, { courseId });

    logger.info('[RatingService] Recalculated course rating', { courseId });
  }

  /**
   * Check if a user can rate a course (must be enrolled with active/completed status)
   */
  async canUserRate(userId: string, courseId: string): Promise<{ canRate: boolean; reason?: string }> {
    // Check if user is the course instructor
    const courseCheck = await this.db.query(`
      SELECT InstructorId FROM Courses WHERE Id = @courseId
    `, { courseId });

    if (courseCheck.length === 0) {
      return { canRate: false, reason: 'Course not found' };
    }

    if (courseCheck[0].InstructorId === userId) {
      return { canRate: false, reason: 'Instructors cannot rate their own courses' };
    }

    // Check enrollment status
    const enrollment = await this.db.query(`
      SELECT Status FROM Enrollments 
      WHERE UserId = @userId AND CourseId = @courseId AND Status IN ('active', 'completed')
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return { canRate: false, reason: 'You must be enrolled in this course to rate it' };
    }

    return { canRate: true };
  }

  /**
   * Get instructor's rating summary across all their courses
   */
  async getInstructorRatingSummary(instructorId: string): Promise<{
    totalRatings: number;
    averageRating: number;
    recentRatings: CourseRating[];
  }> {
    const [summaryResult, recentResult] = await Promise.all([
      this.db.query(`
        SELECT 
          COUNT(*) as totalRatings,
          ISNULL(AVG(CAST(cr.Rating AS FLOAT)), 0) as averageRating
        FROM CourseRatings cr
        INNER JOIN Courses c ON cr.CourseId = c.Id
        WHERE c.InstructorId = @instructorId
          AND (c.Status IS NULL OR c.Status != 'deleted')
      `, { instructorId }),
      this.db.query(`
        SELECT TOP 5
          cr.Id, cr.CourseId, cr.UserId, cr.Rating, cr.ReviewText,
          cr.IsEdited, cr.CreatedAt, cr.UpdatedAt,
          u.FirstName, u.LastName, u.Avatar,
          c.Title as CourseTitle
        FROM CourseRatings cr
        INNER JOIN Users u ON cr.UserId = u.Id
        INNER JOIN Courses c ON cr.CourseId = c.Id
        WHERE c.InstructorId = @instructorId
          AND (c.Status IS NULL OR c.Status != 'deleted')
        ORDER BY cr.CreatedAt DESC
      `, { instructorId })
    ]);

    return {
      totalRatings: summaryResult[0]?.totalRatings || 0,
      averageRating: Math.round((summaryResult[0]?.averageRating || 0) * 100) / 100,
      recentRatings: recentResult.map((r: any) => ({
        ...r,
        IsEdited: Boolean(r.IsEdited),
      })),
    };
  }
}
