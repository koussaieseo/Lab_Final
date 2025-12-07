import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { UserPlus, UserMinus, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const { users, setUsers, followUser, unfollowUser } = useUserStore();
  const { showToast } = useUiStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.searchUsers('');
      setUsers(response.users);
    } catch (error) {
      showToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadUsers();
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.searchUsers(searchQuery);
      setUsers(response.users);
    } catch (error) {
      showToast('Search failed', 'error');
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

  const handleUnfollow = async (userId) => {
    try {
      await api.unfollowUser(userId);
      unfollowUser(userId);
      showToast('Unfollowed successfully', 'success');
    } catch (error) {
      showToast('Failed to unfollow user', 'error');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="h-64" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Discover Users</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex space-x-2">
            <Input
              placeholder="Search users by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user._id}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Link to={`/profile/${user._id}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-lg">{user.name[0]}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${user._id}`}>
                    <h3 className="font-semibold text-sm truncate hover:text-blue-600">
                      {user.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{user.bio}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold">{user.followersCount || 0}</span> followers
                </div>
                {user._id !== currentUser?._id && (
                  <Button
                    size="sm"
                    variant={user.isFollowing ? "outline" : "default"}
                    onClick={() => user.isFollowing ? handleUnfollow(user._id) : handleFollow(user._id)}
                    disabled={user._id === currentUser?._id}
                  >
                    {user.isFollowing ? (
                      <>
                        <UserMinus className="h-3 w-3 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}