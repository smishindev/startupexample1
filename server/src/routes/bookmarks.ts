import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

interface BookmarkRow {
  Id: string;
  Title: string;
  Description: string;
  Thumbnail: string;
  Category: string;
  Level: string;
  Duration: number;
  Price: number;
  Rating: number;
  EnrollmentCount: number;
  Tags: string;
  CreatedAt: Date;
  InstructorName: string;
  InstructorAvatar: string;
  BookmarkedAt: Date;
  Notes: string;
  TotalCount: number;
}

// Get user's bookmarked courses
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const query = `
      SELECT 
        c.Id,
        c.Title,
        c.Description,
        c.Thumbnail,
        c.Category,
        c.Level,
        c.Duration,
        c.Price,
        c.Rating,
        c.EnrollmentCount,
        c.Tags,
        c.CreatedAt,
        u.FirstName + ' ' + u.LastName as InstructorName,
        u.Avatar as InstructorAvatar,
        b.BookmarkedAt,
        b.Notes,
        COUNT(*) OVER() as TotalCount
      FROM dbo.Bookmarks b
      INNER JOIN dbo.Courses c ON b.CourseId = c.Id
      INNER JOIN dbo.Users u ON c.InstructorId = u.Id
      WHERE b.UserId = @userId AND c.IsPublished = 1
      ORDER BY b.BookmarkedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const result = await db.query<BookmarkRow>(query, {
      userId,
      offset,
      limit: parseInt(limit)
    });

    const totalCount = result.length > 0 ? result[0].TotalCount : 0;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      bookmarks: result.map((row: BookmarkRow) => ({
        id: row.Id,
        title: row.Title,
        description: row.Description,
        thumbnail: row.Thumbnail,
        category: row.Category,
        level: row.Level,
        duration: row.Duration,
        price: row.Price,
        rating: row.Rating,
        enrollmentCount: row.EnrollmentCount,
        tags: row.Tags ? JSON.parse(row.Tags) : [],
        instructor: {
          name: row.InstructorName,
          avatar: row.InstructorAvatar
        },
        bookmarkedAt: row.BookmarkedAt,
        notes: row.Notes,
        isBookmarked: true
      })),
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookmarks',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add bookmark
router.post('/:courseId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;
    const { notes = null } = req.body;

    // Validate course exists and is published
    const courseQuery = `
      SELECT Id FROM dbo.Courses 
      WHERE Id = @courseId AND IsPublished = 1
    `;
    
    const courseResult = await db.query(courseQuery, { courseId });
    if (courseResult.length === 0) {
      return res.status(404).json({ 
        error: 'Course not found or not available' 
      });
    }

    // Check if already bookmarked
    const existingQuery = `
      SELECT Id FROM dbo.Bookmarks 
      WHERE UserId = @userId AND CourseId = @courseId
    `;
    
    const existing = await db.query(existingQuery, { userId, courseId });
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Course is already bookmarked' 
      });
    }

    // Add bookmark
    const insertQuery = `
      INSERT INTO dbo.Bookmarks (UserId, CourseId, Notes)
      OUTPUT INSERTED.Id, INSERTED.BookmarkedAt
      VALUES (@userId, @courseId, @notes)
    `;

    const result = await db.query(insertQuery, {
      userId,
      courseId,
      notes
    });

    res.status(201).json({
      success: true,
      bookmark: {
        id: result[0].Id,
        userId,
        courseId,
        notes,
        bookmarkedAt: result[0].BookmarkedAt
      }
    });

  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ 
      error: 'Failed to add bookmark',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Remove bookmark
router.delete('/:courseId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;

    const deleteQuery = `
      DELETE FROM dbo.Bookmarks 
      WHERE UserId = @userId AND CourseId = @courseId
    `;

    const result = await db.execute(deleteQuery, { userId, courseId });

    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        error: 'Bookmark not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Bookmark removed successfully' 
    });

  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ 
      error: 'Failed to remove bookmark',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if course is bookmarked
router.get('/check/:courseId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;

    const query = `
      SELECT Id, Notes, BookmarkedAt 
      FROM dbo.Bookmarks 
      WHERE UserId = @userId AND CourseId = @courseId
    `;

    const result = await db.query(query, { userId, courseId });

    res.json({
      isBookmarked: result.length > 0,
      bookmark: result.length > 0 ? {
        id: result[0].Id,
        notes: result[0].Notes,
        bookmarkedAt: result[0].BookmarkedAt
      } : null
    });

  } catch (error) {
    console.error('Error checking bookmark:', error);
    res.status(500).json({ 
      error: 'Failed to check bookmark status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update bookmark notes
router.patch('/:courseId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { courseId } = req.params;
    const { notes } = req.body;

    const updateQuery = `
      UPDATE dbo.Bookmarks 
      SET Notes = @notes
      WHERE UserId = @userId AND CourseId = @courseId
    `;

    const result = await db.execute(updateQuery, { userId, courseId, notes });

    if (result.rowsAffected && result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        error: 'Bookmark not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Bookmark notes updated successfully' 
    });

  } catch (error) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ 
      error: 'Failed to update bookmark',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;