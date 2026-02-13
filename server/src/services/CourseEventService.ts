import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * CourseEventService - Centralized real-time event broadcasting for course changes
 * 
 * Emits socket events when course data changes so frontend pages can refresh.
 * All course mutation points call this service instead of emitting directly.
 * 
 * Event types:
 * - course:updated        → course-{courseId} + courses-catalog rooms
 * - course:catalog-changed → courses-catalog room (all authenticated users)
 * - course:enrollment-changed → course-{courseId} + courses-catalog rooms (deduplicated)
 * 
 * Design: Lightweight payloads (courseId + field names only). Clients re-fetch fresh data from API.
 */

export interface CourseUpdatedPayload {
  courseId: string;
  fields: string[];
  timestamp: string;
}

export interface CourseCatalogChangedPayload {
  action: 'published' | 'unpublished' | 'updated' | 'removed' | 'added';
  courseId: string;
  timestamp: string;
}

export interface CourseEnrollmentChangedPayload {
  courseId: string;
  timestamp: string;
}

export class CourseEventService {
  private static instance: CourseEventService | null = null;
  private io: SocketIOServer | null = null;

  // Debounce timers for batching rapid mutations on the same course
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingFields: Map<string, Set<string>> = new Map();

  private constructor(io?: SocketIOServer) {
    if (io) {
      this.io = io;
    }
  }

  /**
   * Set the Socket.IO instance (called once during server startup)
   */
  static setSocketIO(io: SocketIOServer): void {
    if (!CourseEventService.instance) {
      CourseEventService.instance = new CourseEventService(io);
    } else {
      CourseEventService.instance.io = io;
    }
    logger.info('✅ [CourseEventService] Socket.IO instance set');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): CourseEventService {
    if (!CourseEventService.instance) {
      CourseEventService.instance = new CourseEventService();
    }
    return CourseEventService.instance;
  }

  /**
   * Flush and clear all pending debounce timers (for graceful shutdown).
   * Immediately emits any pending debounced events before clearing.
   */
  destroy(): void {
    // Flush all pending debounced events immediately
    this.updateTimers.forEach((timer, courseId) => {
      clearTimeout(timer);
      if (this.io) {
        const allFields = Array.from(this.pendingFields.get(courseId) || []);
        if (allFields.length > 0) {
          const payload: CourseUpdatedPayload = {
            courseId,
            fields: allFields,
            timestamp: new Date().toISOString()
          };
          this.io.to(`course-${courseId}`).to('courses-catalog').emit('course:updated', payload);
        }
      }
    });
    this.updateTimers.clear();
    this.pendingFields.clear();
    logger.info('[CourseEventService] Destroyed — all pending events flushed');
  }

  /**
   * Emit when course metadata or content changes (title, description, lessons, etc.)
   * Debounced: multiple rapid changes are batched into one event per 500ms window.
   * 
   * Targets: course-{courseId} room + courses-catalog room
   * (both enrolled users AND unenrolled users browsing the catalog/detail page)
   */
  emitCourseUpdated(courseId: string, fields: string[]): void {
    if (!this.io) {
      logger.warn('[CourseEventService] Cannot emit course:updated - no io instance');
      return;
    }

    // Accumulate fields for debouncing
    if (!this.pendingFields.has(courseId)) {
      this.pendingFields.set(courseId, new Set());
    }
    const pending = this.pendingFields.get(courseId)!;
    fields.forEach(f => pending.add(f));

    // Clear existing debounce timer for this course
    const existingTimer = this.updateTimers.get(courseId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer (500ms window)
    const timer = setTimeout(() => {
      const allFields = Array.from(this.pendingFields.get(courseId) || []);
      this.pendingFields.delete(courseId);
      this.updateTimers.delete(courseId);

      // Re-check io in case it was cleared during the debounce window
      if (!this.io) return;

      const payload: CourseUpdatedPayload = {
        courseId,
        fields: allFields,
        timestamp: new Date().toISOString()
      };

      // Emit to both course room and catalog room (Socket.IO deduplicates with chained .to())
      this.io.to(`course-${courseId}`).to('courses-catalog').emit('course:updated', payload);
      logger.info('[CourseEventService] Emitted course:updated', { courseId, fields: allFields });
    }, 500);

    this.updateTimers.set(courseId, timer);
  }

  /**
   * Emit when the public course catalog changes.
   * This fires on publish, unpublish, delete, archive, visibility changes,
   * or metadata changes visible in catalog cards (title, price, thumbnail).
   * 
   * Targets: courses-catalog room (all authenticated users browsing catalog)
   */
  emitCourseCatalogChanged(action: CourseCatalogChangedPayload['action'], courseId: string): void {
    if (!this.io) {
      logger.warn('[CourseEventService] Cannot emit course:catalog-changed - no io instance');
      return;
    }

    const payload: CourseCatalogChangedPayload = {
      action,
      courseId,
      timestamp: new Date().toISOString()
    };

    this.io.to('courses-catalog').emit('course:catalog-changed', payload);
    logger.info('[CourseEventService] Emitted course:catalog-changed', { action, courseId });
  }

  /**
   * Emit when enrollment count changes.
   * Sent to both the specific course room and the catalog room
   * (catalog cards may show enrollment count or "Full" badge).
   * Uses chained .to() so Socket.IO deduplicates — users in both rooms get the event only once.
   * 
   * Targets: course-{courseId} room + courses-catalog room
   */
  emitEnrollmentCountChanged(courseId: string): void {
    if (!this.io) {
      logger.warn('[CourseEventService] Cannot emit course:enrollment-changed - no io instance');
      return;
    }

    const payload: CourseEnrollmentChangedPayload = {
      courseId,
      timestamp: new Date().toISOString()
    };

    // Chained .to() deduplicates: a socket in both rooms receives the event only once
    this.io.to(`course-${courseId}`).to('courses-catalog').emit('course:enrollment-changed', payload);
    logger.info('[CourseEventService] Emitted course:enrollment-changed', { courseId });
  }

  /**
   * Join a user's socket(s) to a course room.
   * Called when a user enrolls so they start receiving course:updated events immediately
   * without needing to reconnect.
   */
  async joinUserToCourseRoom(userId: string, courseId: string): Promise<void> {
    if (!this.io) return;
    try {
      const sockets = await this.io.in(`user-${userId}`).fetchSockets();
      for (const s of sockets) {
        s.join(`course-${courseId}`);
      }
      if (sockets.length > 0) {
        logger.info('[CourseEventService] Joined user to course room', { userId, courseId, socketCount: sockets.length });
      }
    } catch (err) {
      logger.warn('[CourseEventService] Failed to join user to course room', { userId, courseId, error: err });
    }
  }
}
