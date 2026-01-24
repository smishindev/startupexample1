import { create } from 'zustand';

export interface Notification {
  Id: string;
  UserId: string;
  Type: 'progress' | 'risk' | 'achievement' | 'intervention' | 'assignment' | 'course' | 'assessment' | 'system';
  Priority: 'low' | 'normal' | 'high' | 'urgent';
  Title: string;
  Message: string;
  Data: any;
  RelatedEntityId: string | null;
  RelatedEntityType: string | null;
  ActionUrl: string | null;
  ActionText: string | null;
  CreatedAt: string;
  ReadAt: string | null;
  ExpiresAt: string | null;
  IsRead: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  queuedCount: number;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (notificationId: string) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setQueuedCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  queuedCount: 0,
  
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.IsRead).length
  }),
  
  addNotification: (notification) => set((state) => {
    // Check if notification already exists
    const exists = state.notifications.some(n => n.Id === notification.Id);
    if (exists) {
      console.log('⚠️ [NotificationStore] Notification already exists, skipping:', notification.Id);
      return state;
    }
    
    console.log('✅ [NotificationStore] Adding new notification:', notification.Id);
    return {
      notifications: [notification, ...state.notifications],
      unreadCount: notification.IsRead ? state.unreadCount : state.unreadCount + 1
    };
  }),
  
  removeNotification: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.Id === notificationId);
    const wasUnread = notification && !notification.IsRead;
    
    return {
      notifications: state.notifications.filter(n => n.Id !== notificationId),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),
  
  markAsRead: (notificationId) => set((state) => {
    const notification = state.notifications.find(n => n.Id === notificationId);
    const wasUnread = notification && !notification.IsRead;
    
    return {
      notifications: state.notifications.map(n =>
        n.Id === notificationId
          ? { ...n, IsRead: true, ReadAt: new Date().toISOString() }
          : n
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({
      ...n,
      IsRead: true,
      ReadAt: n.ReadAt || new Date().toISOString()
    })),
    unreadCount: 0
  })),
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  setQueuedCount: (count) => set({ queuedCount: count }),
  
  incrementUnreadCount: () => set((state) => ({
    unreadCount: state.unreadCount + 1
  })),
  
  decrementUnreadCount: () => set((state) => ({
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  
  clear: () => set({ notifications: [], unreadCount: 0, queuedCount: 0 })
}));
