import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Users, ArrowRight, Link } from 'lucide-react';

export default function ConnectionPath({ sourceUserId, targetUserId, className = '' }) {
  const [connectionPath, setConnectionPath] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useUiStore();

  const findConnectionPath = async () => {
    if (!sourceUserId || !targetUserId) {
      showToast('Please select both source and target users', 'error');
      return;
    }

    if (sourceUserId === targetUserId) {
      showToast('Source and target users cannot be the same', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.getConnectionPath(targetUserId);
      setConnectionPath(response.path);
    } catch (error) {
      showToast('Failed to find connection path', 'error');
      setConnectionPath(null);
    } finally {
      setIsLoading(false);
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
          <Link className="h-5 w-5" />
          Connection Path
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              onClick={findConnectionPath}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Finding Path...' : 'Find Connection Path'}
            </Button>
          </div>

          {connectionPath && connectionPath.length > 0 && (
            <div className="space-y-3">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  {connectionPath.length - 1} degrees of separation
                </Badge>
              </div>
              
              <div className="space-y-2">
                {connectionPath.map((user, index) => (
                  <div key={user._id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name || user.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    
                    {index < connectionPath.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {connectionPath && connectionPath.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No connection path found</p>
              <p className="text-xs">These users are not connected in the network</p>
            </div>
          )}

          {!connectionPath && (
            <div className="text-center text-gray-500 py-4">
              <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click to find connection path</p>
              <p className="text-xs">Discover how users are connected</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}