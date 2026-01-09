import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sql from 'mssql';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');
const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'videos'), { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'images'), { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'documents'), { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });
  }
};

// Initialize upload directory
ensureUploadDir().catch(console.error);

// File type configurations
const fileTypeConfig = {
  video: {
    allowedMimes: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
    maxSize: 500 * 1024 * 1024, // 500MB
    subfolder: 'videos'
  },
  image: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    subfolder: 'images'
  },
  document: {
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    subfolder: 'documents'
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Default to videos folder, actual type validation happens in the route handler
    const dest = path.join(UPLOAD_DIR, 'videos');
    
    try {
      await fs.access(dest);
    } catch {
      await fs.mkdir(dest, { recursive: true });
    }
    
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueId}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(...Object.values(fileTypeConfig).map(c => c.maxSize))
  }
});

// File upload database schema
interface FileUpload {
  id: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  fileType: 'video' | 'image' | 'document';
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
  createdAt: string;
}

// POST /upload - Upload a file
router.post('/', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { fileType, courseId, lessonId, description } = req.body;
    const userId = (req as any).user.userId;

    console.log('Upload request:', { 
      fileType, 
      filename: file?.originalname, 
      mimetype: file?.mimetype,
      size: file?.size 
    });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type configuration
    const config = fileTypeConfig[fileType as keyof typeof fileTypeConfig];
    if (!config) {
      // Clean up uploaded file if invalid type
      await fs.unlink(file.path);
      return res.status(400).json({ error: 'Invalid file type specified' });
    }

    // Validate actual file MIME type against allowed types
    if (!config.allowedMimes.includes(file.mimetype)) {
      // Clean up uploaded file if wrong MIME type
      await fs.unlink(file.path);
      return res.status(400).json({ 
        error: `Invalid file type. Expected ${fileType}, but got ${file.mimetype}. Allowed types: ${config.allowedMimes.join(', ')}` 
      });
    }

    if (file.size > config.maxSize) {
      // Clean up uploaded file
      await fs.unlink(file.path);
      return res.status(400).json({ 
        error: `File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB` 
      });
    }

    const fileId = uuidv4();
    
    // Move file to correct subfolder after validation
    const correctDestination = path.join(UPLOAD_DIR, config.subfolder);
    await fs.mkdir(correctDestination, { recursive: true });
    const newFilePath = path.join(correctDestination, file.filename);
    await fs.rename(file.path, newFilePath);
    
    // Return full backend URL so frontend can access the file
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const fileUrl = `${backendUrl}/uploads/${config.subfolder}/${file.filename}`;
    let thumbnailUrl: string | undefined;
    let metadata: any = {
      description: description || '',
      uploadedAt: new Date().toISOString(),
      originalSize: file.size
    };

    // Generate thumbnail for images and videos
    if (fileType === 'image') {
      try {
        const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', `thumb_${file.filename}.webp`);
        await sharp(newFilePath)
          .resize(300, 300, { fit: 'cover' })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);
        thumbnailUrl = `${backendUrl}/uploads/thumbnails/thumb_${file.filename}.webp`;
        
        // Get image dimensions
        const imageMetadata = await sharp(newFilePath).metadata();
        metadata.dimensions = {
          width: imageMetadata.width,
          height: imageMetadata.height
        };
      } catch (error) {
        console.warn('Failed to generate image thumbnail:', error);
      }
    }

    // Store file information in database
    // Handle courseId and lessonId validation for UUIDs
    const isValidUUID = (str: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return str && uuidRegex.test(str);
    };

    const validCourseId = courseId && isValidUUID(courseId) ? courseId : null;
    const validLessonId = lessonId && isValidUUID(lessonId) ? lessonId : null;

    console.log('Database insert parameters:', {
      id: fileId,
      userId: userId,
      courseId: validCourseId,
      lessonId: validLessonId,
      userIdIsValid: isValidUUID(userId),
      fileIdIsValid: isValidUUID(fileId)
    });

    // Use the database query method with explicit parameter types
    const request = await db.getRequest();

    request.input('id', sql.UniqueIdentifier, fileId);
    request.input('uploadedBy', sql.UniqueIdentifier, userId);
    request.input('relatedEntityType', sql.NVarChar(50), lessonId ? 'Lesson' : (courseId ? 'Course' : null));
    request.input('relatedEntityId', sql.UniqueIdentifier, validLessonId || validCourseId);
    request.input('fileName', sql.NVarChar(255), file.originalname);
    request.input('filePath', sql.NVarChar(500), fileUrl);
    request.input('mimetype', sql.NVarChar(100), file.mimetype);
    request.input('fileSize', sql.BigInt, file.size);
    request.input('fileType', sql.NVarChar(50), fileType);
    request.input('uploadedAt', sql.DateTime2, new Date());

    await request.query(`
      INSERT INTO dbo.FileUploads 
      (Id, UploadedBy, RelatedEntityType, RelatedEntityId, FileName, FilePath, MimeType, FileSize, FileType, UploadedAt)
      VALUES (@id, @uploadedBy, @relatedEntityType, @relatedEntityId, @fileName, @filePath, @mimetype, @fileSize, @fileType, @uploadedAt)
    `);

    const uploadedFile: FileUpload = {
      id: fileId,
      userId,
      courseId,
      lessonId,
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      fileType,
      url: fileUrl,
      thumbnailUrl,
      metadata,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      file: uploadedFile
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up file if it was uploaded
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }

    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'File upload failed' 
    });
  }
});

// GET /upload/files - Get user's uploaded files
router.get('/files', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { fileType, courseId, lessonId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT Id, UploadedBy, RelatedEntityType, RelatedEntityId, FileName, FilePath, 
             MimeType, FileSize, FileType, UploadedAt
      FROM dbo.FileUploads 
      WHERE UploadedBy = @userId
    `;
    
    const params: any = { userId };

    if (fileType) {
      query += ` AND FileType = @fileType`;
      params.fileType = fileType;
    }

    if (courseId) {
      query += ` AND RelatedEntityType = 'Course' AND RelatedEntityId = @courseId`;
      params.courseId = courseId;
    }

    if (lessonId) {
      query += ` AND RelatedEntityType = 'Lesson' AND RelatedEntityId = @lessonId`;
      params.lessonId = lessonId;
    }

    query += ` ORDER BY UploadedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = parseInt(offset as string, 10) || 0;
    params.limit = Math.min(parseInt(limit as string, 10) || 50, 100); // Cap at 100

    const result = await db.query(query, params);

    const files = result.map((row: any) => ({
      id: row.Id,
      userId: row.UploadedBy,
      courseId: row.RelatedEntityType === 'Course' ? row.RelatedEntityId : null,
      lessonId: row.RelatedEntityType === 'Lesson' ? row.RelatedEntityId : null,
      originalName: row.FileName,
      filename: row.FileName,
      mimetype: row.MimeType,
      size: row.FileSize,
      fileType: row.FileType,
      url: row.FilePath,
      thumbnailUrl: null,
      metadata: null,
      createdAt: row.UploadedAt
    }));

    res.json({ files });

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// DELETE /upload/:fileId - Delete a file
router.delete('/:fileId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.userId;

    // Get file info from database
    const fileResult = await db.query(
      `SELECT FileName, FileType, FilePath FROM dbo.FileUploads 
       WHERE Id = @fileId AND UploadedBy = @userId`,
      { fileId, userId }
    );

    if (!fileResult.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileInfo = fileResult[0];

    // Delete physical files
    try {
      const config = fileTypeConfig[fileInfo.FileType as keyof typeof fileTypeConfig];
      // Extract filename from the full URL path
      const filename = path.basename(fileInfo.FilePath);
      const filePath = path.join(UPLOAD_DIR, config.subfolder, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to delete physical file:', error);
    }

    // Delete from database
    await db.execute(
      'DELETE FROM dbo.FileUploads WHERE Id = @fileId AND UploadedBy = @userId',
      { fileId, userId }
    );

    res.json({ success: true, message: 'File deleted successfully' });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET /upload/:fileId - Get file metadata by ID
router.get('/:fileId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user.userId;
    
    // Get file with access check - user must be uploader OR enrolled in related course (handles both Course and Lesson associations)
    const result = await db.query(
      `SELECT F.Id, F.FileName, F.FilePath, F.MimeType, F.FileSize, F.FileType, F.UploadedAt 
       FROM dbo.FileUploads F
       -- For Course-related files
       LEFT JOIN dbo.Courses C1 ON F.RelatedEntityType = 'Course' AND F.RelatedEntityId = C1.Id
       LEFT JOIN dbo.Enrollments E1 ON C1.Id = E1.CourseId AND E1.UserId = @userId
       -- For Lesson-related files (most common for videos)
       LEFT JOIN dbo.Lessons L ON F.RelatedEntityType = 'Lesson' AND F.RelatedEntityId = L.Id
       LEFT JOIN dbo.Courses C2 ON L.CourseId = C2.Id
       LEFT JOIN dbo.Enrollments E2 ON C2.Id = E2.CourseId AND E2.UserId = @userId
       WHERE F.Id = @fileId 
       AND (
         F.UploadedBy = @userId 
         OR C1.InstructorId = @userId OR E1.UserId IS NOT NULL
         OR C2.InstructorId = @userId OR E2.UserId IS NOT NULL
       )`,
      { fileId, userId }
    );

    if (!result.length) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const file = result[0];
    res.json({
      id: file.Id,
      fileName: file.FileName,
      url: file.FilePath,
      mimeType: file.MimeType,
      fileSize: file.FileSize,
      fileType: file.FileType,
      uploadedAt: file.UploadedAt
    });

  } catch (error) {
    console.error('Error fetching file metadata:', error);
    res.status(500).json({ error: 'Failed to fetch file metadata' });
  }
});

export { router as uploadRoutes };