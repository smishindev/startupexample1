// Simple analytics service for tracking share events
export interface ShareEvent {
  courseId: string;
  platform: string;
  userId?: string;
  timestamp: string;
  courseTitle?: string;
  courseCategory?: string;
  courseLevel?: string;
  coursePrice?: number;
}

export class ShareAnalytics {
  private static events: ShareEvent[] = [];

  /**
   * Track a course share event
   */
  static trackShare(shareEvent: Omit<ShareEvent, 'timestamp'>): void {
    const event: ShareEvent = {
      ...shareEvent,
      timestamp: new Date().toISOString(),
    };

    // Store locally for now
    this.events.push(event);
    
    // Also store in localStorage for persistence
    this.persistEvent(event);
    
    // Log for debugging
    console.log('Share event tracked:', event);
    
    // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
    // this.sendToAnalyticsService(event);
  }

  /**
   * Get all share events
   */
  static getShareEvents(): ShareEvent[] {
    return [...this.events];
  }

  /**
   * Get share events for a specific course
   */
  static getCourseShareEvents(courseId: string): ShareEvent[] {
    return this.events.filter(event => event.courseId === courseId);
  }

  /**
   * Get share events by platform
   */
  static getShareEventsByPlatform(platform: string): ShareEvent[] {
    return this.events.filter(event => event.platform === platform);
  }

  /**
   * Get share statistics
   */
  static getShareStats(): {
    totalShares: number;
    sharesByPlatform: Record<string, number>;
    sharesByCourse: Record<string, number>;
    sharesLastWeek: number;
    mostSharedPlatform: string;
    mostSharedCourse: string;
  } {
    const events = this.getShareEvents();
    const totalShares = events.length;
    
    // Shares by platform
    const sharesByPlatform = events.reduce((acc, event) => {
      acc[event.platform] = (acc[event.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Shares by course
    const sharesByCourse = events.reduce((acc, event) => {
      acc[event.courseId] = (acc[event.courseId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Shares in last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const sharesLastWeek = events.filter(
      event => new Date(event.timestamp) > oneWeekAgo
    ).length;
    
    // Most shared platform
    const mostSharedPlatform = Object.entries(sharesByPlatform)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
    
    // Most shared course
    const mostSharedCourse = Object.entries(sharesByCourse)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    return {
      totalShares,
      sharesByPlatform,
      sharesByCourse,
      sharesLastWeek,
      mostSharedPlatform,
      mostSharedCourse,
    };
  }

  /**
   * Persist event to localStorage
   */
  private static persistEvent(event: ShareEvent): void {
    try {
      const existingEvents = this.getPersistedEvents();
      existingEvents.push(event);
      
      // Keep only last 1000 events to prevent localStorage bloat
      const eventsToKeep = existingEvents.slice(-1000);
      
      localStorage.setItem('share_analytics', JSON.stringify(eventsToKeep));
    } catch (error) {
      console.warn('Failed to persist share event:', error);
    }
  }

  /**
   * Load events from localStorage
   */
  static loadPersistedEvents(): void {
    const persistedEvents = this.getPersistedEvents();
    this.events.push(...persistedEvents);
  }

  /**
   * Get events from localStorage
   */
  private static getPersistedEvents(): ShareEvent[] {
    try {
      const stored = localStorage.getItem('share_analytics');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load persisted share events:', error);
      return [];
    }
  }

  /**
   * Clear all share events
   */
  static clearEvents(): void {
    this.events = [];
    localStorage.removeItem('share_analytics');
  }

  /**
   * Export share data for analysis
   */
  static exportData(): string {
    return JSON.stringify({
      events: this.getShareEvents(),
      stats: this.getShareStats(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * TODO: Send to external analytics service
   * Uncomment and implement when ready to integrate with external analytics
   */
  // private static async sendToAnalyticsService(event: ShareEvent): Promise<void> {
  //   // Example implementation for Google Analytics 4
  //   // if (typeof gtag !== 'undefined') {
  //   //   gtag('event', 'share', {
  //   //     content_type: 'course',
  //   //     content_id: event.courseId,
  //   //     method: event.platform
  //   //   });
  //   // }

  //   // Example implementation for custom analytics API
  //   // try {
  //   //   await fetch('/api/analytics/share', {
  //   //     method: 'POST',
  //   //     headers: { 'Content-Type': 'application/json' },
  //   //     body: JSON.stringify(event)
  //   //   });
  //   // } catch (error) {
  //   //   console.error('Failed to send share event to analytics:', error);
  //   // }
  // }
}

// Auto-load persisted events when the module is imported
ShareAnalytics.loadPersistedEvents();