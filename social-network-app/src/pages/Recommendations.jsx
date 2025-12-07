import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { UserPlus, Users, TrendingUp } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConnectionPath from '@/components/ConnectionPath';
import MutualConnections from '@/components/MutualConnections';

export default function Recommendations() {
  const { showToast } = useUiStore();
  const { followUser } = useUserStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConnectionPath, setShowConnectionPath] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      const response = await api.getRecommendations('users');
      // Handle different response structures from backend
      const recommendationsData = response.recommendations || response.users || [];
      setRecommendations(recommendationsData);
    } catch (error) {
      showToast('Failed to load recommendations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await api.followUser(userId);
      followUser(userId);
      showToast('Followed successfully', 'success');
    } catch (error) {
      showToast('Failed to follow user', 'error');
    }
  };

  const handleViewConnection = (user) => {
    setSelectedUser(user);
    setShowConnectionPath(true);
  };

  const handleViewMutualConnections = (user) => {
    setSelectedUser(user);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Recommended for You</h2>
          </div>
          <p className="text-sm text-gray-600">
            Based on your interests and network
          </p>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recommendations available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((user) => (
                <Card key={user._id} className="border-2 hover:border-blue-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Link to={`/profile/${user._id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-lg">{user.name[0]}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link to={`/profile/${user._id}`}>
                            <h3 className="font-semibold text-sm hover:text-blue-600">
                              {user.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{user.followersCount || 0} followers</span>
                            <span>{user.followingCount || 0} following</span>
                            {user.mutualFriends > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {user.mutualFriends} mutual friends
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant={user.isFollowing ? "outline" : "default"}
                          onClick={() => handleFollow(user._id)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          {user.isFollowing ? 'Following' : 'Follow'}
                        </Button>
                        {user.mutualFriends > 0 && (
                          <div className="flex flex-col space-y-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewConnection(user)}
                              className="text-xs"
                            >
                              View Connection
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewMutualConnections(user)}
                              className="text-xs"
                            >
                              Mutual Friends
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showConnectionPath && selectedUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Connection Path to {selectedUser.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectionPath(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectionPath 
              sourceUserId={user?._id} 
              targetUserId={selectedUser._id} 
            />
          </CardContent>
        </Card>
      )}

      {selectedUser && !showConnectionPath && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Mutual Connections with {selectedUser.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <MutualConnections 
              userId={selectedUser._id} 
              onUserClick={(user) => {
                console.log('Clicked user:', user);
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}