import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount });
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
  })),

  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(notification =>
      notification._id === notificationId 
        ? { ...notification, isRead: true }
        : notification
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),

  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(notification =>
      ({ ...notification, isRead: true })
    ),
    unreadCount: 0,
  })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));