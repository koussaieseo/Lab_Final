import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Heart, MessageCircle } from 'lucide-react';

export default function SuggestedPosts() {
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useUiStore();

  useEffect(() => {
    loadSuggestedPosts();
  }, []);

  const loadSuggestedPosts = async () => {
    setLoading(true);
    try {
      const response = await api.getSuggestedPosts();
      setSuggestedPosts(response.posts || []);
    } catch (error) {
      showToast('Failed to load suggested posts', 'error');
      console.error('Error loading suggested posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await api.likePost(postId);
      setSuggestedPosts(posts => 
        posts.map(post => 
          post._id === postId 
            ? { ...post, isLiked: true, likeCount: (post.likeCount || 0) + 1 }
            : post
        )
      );
    } catch (error) {
      showToast('Failed to like post', 'error');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Suggested Posts</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Loading suggested posts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestedPosts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Suggested Posts</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No suggested posts available at the moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">Suggested Posts</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestedPosts.map((post) => (
            <div key={post._id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-center space-x-3 mb-3">
                <Avatar>
                  <AvatarImage src={post.author.avatar} alt={post.author.name} />
                  <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-sm">{post.author.name}</h4>
                  <p className="text-xs text-gray-500">@{post.author.username}</p>
                </div>
                <div className="ml-auto">
                  <Badge variant="outline" className="text-xs">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
              
              <p className="text-gray-800 text-sm mb-3">{post.content}</p>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLikePost(post._id)}
                  className={post.isLiked ? 'text-red-500' : ''}
                  disabled={post.isLiked}
                >
                  <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
                  {post.likeCount || 0}
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  0
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}