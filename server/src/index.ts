import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { courseRoutes } from './routes/courses';
import { lessonRoutes } from './routes/lessons';
import { progressRoutes } from './routes/progress';
import { analyticsRoutes } from './routes/analytics';
import { tutoringRoutes } from './routes/tutoring';
import { chatRoutes } from './routes/chat';
import { uploadRoutes } from './routes/upload';
import { adminRoutes } from './routes/admin';
import instructorRoutes from './routes/instructor';
import studentsRoutes from './routes/students';
import { enrollmentRoutes } from './routes/enrollment';
import bookmarkRoutes from './routes/bookmarks';
import assessmentRoutes from './routes/assessments';
import assessmentAnalyticsRoutes from './routes/assessment-analytics';
import notificationRoutes from './routes/notifications';
import verificationRoutes from './routes/verification';
import paymentsRoutes from './routes/payments';
import { videoLessonRoutes } from './routes/videoLessons';
import { videoProgressRoutes } from './routes/videoProgress';
import { videoAnalyticsRoutes } from './routes/videoAnalytics';
import dashboardRoutes from './routes/dashboard';
const studentProgressRoutes = require('./routes/student-progress');
import { DatabaseService } from './services/DatabaseService';
import { setupSocketHandlers } from './sockets';
import { logger } from './utils/logger';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting - More permissive for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (shorter window)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests per minute for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV === 'development';
  }
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Range'],
  exposedHeaders: ['Content-Range', 'Content-Length', 'Accept-Ranges'],
}));

app.use(compression());
app.use(morgan('combined'));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom uploads handler with range support
app.get('/uploads/*', async (req, res, next) => {
  const requestedPath = req.path.replace('/uploads/', '');
  const filePath = path.join(__dirname, '../../uploads', requestedPath);
  
  console.log('[UPLOADS] Request for:', requestedPath, 'Range:', req.headers.range);
  
  // Set CORS headers BEFORE sending response
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  
  try {
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunksize);
      res.setHeader('Content-Type', 'video/mp4');
      res.status(206);
      
      console.log('[UPLOADS] Serving range:', start, '-', end, '/', fileSize);
      console.log('[UPLOADS] Response headers:', res.getHeaders());
      
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Type', 'video/mp4');
      
      console.log('[UPLOADS] Serving full file:', fileSize, 'bytes');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (err) {
    console.error('[UPLOADS] File send error:', err);
    res.status(404).json({ error: 'File not found' });
  }
});

// Make io accessible in routes
app.set('io', io);

// Initialize services that need Socket.io
import { NotificationService } from './services/NotificationService';
const notificationService = new NotificationService(io);
app.set('notificationService', notificationService);

// Health check endpoint
app.get('/health', async (req, res) => {
  const db = DatabaseService.getInstance();
  const dbHealth = await db.healthCheck();
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbHealth.isConnected,
      error: dbHealth.error || null
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tutoring', tutoringRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assessment-analytics', assessmentAnalyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/student-progress', studentProgressRoutes);
app.use('/api/video-lessons', videoLessonRoutes);
app.use('/api/video-progress', videoProgressRoutes);
app.use('/api/video-analytics', videoAnalyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// Socket.IO setup
setupSocketHandlers(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Try to initialize database connection
    try {
      await DatabaseService.getInstance().initialize();
      logger.info('✅ Database connected successfully');
    } catch (dbError) {
      logger.error('❌ Database connection failed, but server will continue:', dbError);
      logger.warn('⚠️  Database-dependent features will not be available until connection is restored');
    }

    // Start HTTP server regardless of database status
    server.listen(PORT, () => {
      logger.info(`🚀 Mishin Learn Server running on http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      logger.info(`💡 Health check available at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };