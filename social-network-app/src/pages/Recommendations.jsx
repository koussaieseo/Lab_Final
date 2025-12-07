import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { UserPlus, Users, TrendingUp, FileText } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ConnectionPath from '@/components/ConnectionPath';
import MutualConnections from '@/components/MutualConnections';
import SuggestedPosts from '@/components/SuggestedPosts';

export default function Recommendations() {
  const { showToast } = useUiStore();
  const { followUser } = useUserStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [trendingUsers, setTrendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConnectionPath, setShowConnectionPath] = useState(false);
  const [activeTab, setActiveTab] = useState('people');
  const [recommendationsLoaded, setRecommendationsLoaded] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  useEffect(() => {
    loadRecommendations();
    loadTrendingUsers();
  }, []);

  useEffect(() => {
    if (recommendationsLoaded && trendingLoaded) {
      setIsLoading(false);
    }
  }, [recommendationsLoaded, trendingLoaded]);

  const loadRecommendations = async () => {
    try {
      const response = await api.getRecommendations('users');
      // Handle different response structures from backend
      const recommendationsData = response.recommendations || response.users || [];
      setRecommendations(recommendationsData);
      setRecommendationsLoaded(true);
    } catch (error) {
      showToast('Failed to load recommendations', 'error');
    }
  };

  const loadTrendingUsers = async () => {
    try {
      const response = await api.getRecommendations('trending');
      // Handle different response structures from backend
      const trendingData = response.users || response.recommendations || [];
      setTrendingUsers(trendingData);
      setTrendingLoaded(true);
    } catch (error) {
      showToast('Failed to load trending users', 'error');
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

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === 'trending' && !trendingLoaded) {
      loadTrendingUsers();
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="people">People You May Know</TabsTrigger>
            <TabsTrigger value="trending">Trending Users</TabsTrigger>
            <TabsTrigger value="posts">Suggested Posts</TabsTrigger>
          </TabsList>
        
        <TabsContent value="people">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold">People You May Know</h2>
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
    </TabsContent>
    
    <TabsContent value="trending">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold">Trending Users</h2>
          </div>
          <p className="text-sm text-gray-600">
            Popular users across the platform
          </p>
        </CardHeader>
        <CardContent>
          {trendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No trending users available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trendingUsers.map((user) => (
                <Card key={user._id} className="border-2 hover:border-red-200 transition-colors">
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
                            <h3 className="font-semibold text-sm hover:text-red-600">
                              {user.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                          {user.bio && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{user.followerCount || user.followersCount || 0} followers</span>
                            <span>{user.followingCount || 0} following</span>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
    
    <TabsContent value="posts">
      <SuggestedPosts />
    </TabsContent>
  </Tabs>

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