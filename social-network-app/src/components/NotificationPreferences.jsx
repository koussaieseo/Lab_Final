import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Bell, Mail, Smartphone, Users, Heart, MessageCircle, Share2 } from 'lucide-react';

export default function NotificationPreferences({ className = '' }) {
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useUiStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await api.getNotificationPreferences();
      setPreferences(response.preferences);
    } catch (error) {
      showToast('Failed to load notification preferences', 'error');
      // Set default preferences if loading fails
      setPreferences({
        email: true,
        push: true,
        inApp: true,
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        shares: true,
        messages: true,
        recommendations: false,
        digest: 'daily'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setIsSaving(true);
      await api.updateNotificationPreferences(preferences);
      showToast('Notification preferences updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update notification preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Notification Channels</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <Label htmlFor="email-notifications">Email Notifications</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences?.email}
                onCheckedChange={(checked) => handlePreferenceChange('email', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-500" />
                <Label htmlFor="push-notifications">Push Notifications</Label>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences?.push}
                onCheckedChange={(checked) => handlePreferenceChange('push', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-500" />
                <Label htmlFor="inapp-notifications">In-App Notifications</Label>
              </div>
              <Switch
                id="inapp-notifications"
                checked={preferences?.inApp}
                onCheckedChange={(checked) => handlePreferenceChange('inApp', checked)}
              />
            </div>
          </div>

          {/* Activity Notifications */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Activity Notifications</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-gray-500" />
                <Label htmlFor="likes">Likes</Label>
              </div>
              <Switch
                id="likes"
                checked={preferences?.likes}
                onCheckedChange={(checked) => handlePreferenceChange('likes', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                <Label htmlFor="comments">Comments</Label>
              </div>
              <Switch
                id="comments"
                checked={preferences?.comments}
                onCheckedChange={(checked) => handlePreferenceChange('comments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Label htmlFor="follows">New Followers</Label>
              </div>
              <Switch
                id="follows"
                checked={preferences?.follows}
                onCheckedChange={(checked) => handlePreferenceChange('follows', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-gray-500" />
                <Label htmlFor="shares">Shares</Label>
              </div>
              <Switch
                id="shares"
                checked={preferences?.shares}
                onCheckedChange={(checked) => handlePreferenceChange('shares', checked)}
              />
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700">Additional Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                <Label htmlFor="messages">Direct Messages</Label>
              </div>
              <Switch
                id="messages"
                checked={preferences?.messages}
                onCheckedChange={(checked) => handlePreferenceChange('messages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Label htmlFor="recommendations">Recommendations</Label>
              </div>
              <Switch
                id="recommendations"
                checked={preferences?.recommendations}
                onCheckedChange={(checked) => handlePreferenceChange('recommendations', checked)}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}