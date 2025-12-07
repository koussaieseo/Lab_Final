import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import api from '@/services/api';
import { Users, UserPlus, TrendingUp, Network } from 'lucide-react';

export default function MutualConnections({ userId, className = '' }) {
  const [mutualConnections, setMutualConnections] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useUiStore();
  const { followUser } = useUserStore();

  useEffect(() => {
    loadMutualConnections();
    loadNetworkStats();
  }, [userId]);

  const loadMutualConnections = async () => {
    try {
      const response = await api.getMutualConnections(userId);
      setMutualConnections(response.mutualConnections);
    } catch (error) {
      showToast('Failed to load mutual connections', 'error');
    }
  };

  const loadNetworkStats = async () => {
    try {
      const response = await api.getNetworkStats();
      setNetworkStats(response.stats);
    } catch (error) {
      console.error('Failed to load network stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    try {
      await api.followUser(targetUserId);
      followUser(targetUserId);
      showToast('Followed successfully', 'success');
    } catch (error) {
      showToast('Failed to follow user', 'error');
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
    <div className="space-y-4">
      {networkStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {networkStats?.totalConnections || 0}
                </div>
                <div className="text-sm text-gray-500">Total Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {networkStats?.mutualConnections || 0}
                </div>
                <div className="text-sm text-gray-500">Mutual Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {networkStats?.networkDensity?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-500">Network Density</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {networkStats?.avgPathLength?.toFixed(1) || 0}
                </div>
                <div className="text-sm text-gray-500">Avg Path Length</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mutual Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mutualConnections.length > 0 ? (
            <div className="space-y-3">
              {mutualConnections.map((connection) => (
                <div key={connection._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={connection.avatar} alt={connection.name} />
                      <AvatarFallback>
                        {connection.name?.charAt(0)?.toUpperCase() || 
                         connection.username?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{connection.name || connection.username}</p>
                      <p className="text-sm text-gray-500 truncate">@{connection.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" size="sm">
                          {connection?.mutualConnectionsCount || 0} mutual
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {connection?.connectionStrength || 0}% strength
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={connection.isFollowing ? 'outline' : 'default'}
                    onClick={() => handleFollow(connection._id)}
                    disabled={connection.isFollowing}
                  >
                    {connection.isFollowing ? (
                      'Following'
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No mutual connections found</p>
              <p className="text-xs">Connect with more people to discover mutual connections</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}