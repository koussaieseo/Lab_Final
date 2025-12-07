import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import NotificationPreferences from '@/components/NotificationPreferences';
import { Bell, Heart, MessageCircle, UserPlus, Check, Trash2, Settings, Filter } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Notifications() {
  const { notifications, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { showToast } = useUiStore();
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationsCount()
      ]);
      setNotifications(notificationsResponse.notifications);
      setUnreadCount(unreadCountResponse.count);
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.markNotificationAsRead(notificationId);
      markAsRead(notificationId);
    } catch {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const handleClearReadNotifications = async () => {
    try {
      await api.clearReadNotifications();
      showToast('Read notifications cleared', 'success');
      loadNotifications(); // Reload notifications
    } catch {
      showToast('Failed to clear read notifications', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      markAllAsRead();
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch {
      showToast('Failed to mark all notifications as read', 'error');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
      showToast('Notification deleted', 'success');
    } catch {
      showToast('Failed to delete notification', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClearReadNotifications}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Read
                </Button>
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start space-x-4 p-4 rounded-lg border ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={notification.sender?.avatar} 
                            alt={notification.sender?.name} 
                          />
                          <AvatarFallback>
                            {notification.sender?.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {notification.sender?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <NotificationPreferences />
        </DialogContent>
      </Dialog>
    </div>
  );
}