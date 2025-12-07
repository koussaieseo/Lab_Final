import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import NetworkGraph from '@/components/NetworkGraph';
import MutualConnections from '@/components/MutualConnections';
import ConnectionPath from '@/components/ConnectionPath';
import { UserPlus, UserMinus, Mail, Calendar, MapPin, Link as LinkIcon, Users, Network } from 'lucide-react';

export default function Profile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuthStore();
  const { currentUser: profileUser, setCurrentUser, followUser, unfollowUser } = useUserStore();
  const { showToast } = useUiStore();
  const [isFollowing, setIsFollowing] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [mutualFollowers, setMutualFollowers] = useState([]);
  const [networkGraph, setNetworkGraph] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const [userResponse, postsResponse, relationshipResponse, followersResponse, mutualFollowersResponse, networkGraphResponse] = await Promise.all([
        api.getUserProfile(userId),
        api.getUserPosts(userId),
        api.getRelationshipStatus(userId),
        api.getUserFollowers(userId),
        api.getMutualFollowers(userId),
        api.getNetworkGraph(userId)
      ]);
      
      setCurrentUser(userResponse.user);
      setUserPosts(postsResponse.posts);
      setIsFollowing(relationshipResponse.isFollowing);
      setFollowers(followersResponse.followers);
      setMutualFollowers(mutualFollowersResponse.mutualFollowers);
      setNetworkGraph(networkGraphResponse.network);
    } catch {
      showToast('Failed to load user profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await api.unfollowUser(userId);
        unfollowUser(userId);
        setIsFollowing(false);
        showToast('Unfollowed successfully', 'success');
      } else {
        await api.followUser(userId);
        followUser(userId);
        setIsFollowing(true);
        showToast('Followed successfully', 'success');
      }
    } catch {
      showToast('Failed to update follow status', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profileUser.avatar} alt={profileUser.name} />
              <AvatarFallback className="text-2xl">{profileUser.name[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{profileUser.name}</h1>
                <p className="text-gray-500">@{profileUser.username}</p>
              </div>
              
              {profileUser.bio && (
                <p className="text-gray-700">{profileUser.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {profileUser.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {profileUser.website && (
                  <div className="flex items-center space-x-1">
                    <LinkIcon className="h-4 w-4" />
                    <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profileUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(profileUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div>
                  <span className="font-semibold">{profileUser.postsCount || 0}</span>
                  <span className="text-gray-500 ml-1">Posts</span>
                </div>
                <div>
                  <span className="font-semibold">{profileUser.followersCount || 0}</span>
                  <span className="text-gray-500 ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-semibold">{profileUser.followingCount || 0}</span>
                  <span className="text-gray-500 ml-1">Following</span>
                </div>
              </div>
              
              {!isOwnProfile && (
                <div className="flex space-x-3">
                  <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"}>
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Posts */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Content & Connections</h3>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="followers">
                <Users className="h-4 w-4 mr-1" />
                Followers
              </TabsTrigger>
              <TabsTrigger value="mutual">
                <Users className="h-4 w-4 mr-1" />
                Mutual
              </TabsTrigger>
              <TabsTrigger value="network">
                <Network className="h-4 w-4 mr-1" />
                Network
              </TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="space-y-4 mt-4">
              {userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <div key={post._id} className="border rounded-lg p-4">
                    <p className="text-gray-800">{post.content}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>{post.likes?.length || 0} likes</span>
                      <span>{post.comments?.length || 0} comments</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No posts yet</p>
              )}
            </TabsContent>
            <TabsContent value="media" className="mt-4">
              <p className="text-gray-500 text-center py-8">No media posts yet</p>
            </TabsContent>
            <TabsContent value="followers" className="mt-4">
              {followers.length > 0 ? (
                <div className="space-y-3">
                  {followers.map((follower) => (
                    <div key={follower._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follower.avatar} alt={follower.name} />
                        <AvatarFallback>{follower.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{follower.name}</p>
                        <p className="text-sm text-gray-500">@{follower.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No followers yet</p>
              )}
            </TabsContent>
            <TabsContent value="mutual" className="mt-4">
              <MutualConnections userId={userId} />
            </TabsContent>
            <TabsContent value="network" className="mt-4">
              <div className="space-y-6">
                <NetworkGraph 
                  userId={userId} 
                  onUserClick={(node) => {
                    // Handle user click - could navigate to user profile
                    console.log('Clicked user:', node);
                  }}
                />
                <ConnectionPath 
                  sourceUserId={currentUser?._id} 
                  targetUserId={userId} 
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}