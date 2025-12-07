import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { usePostStore } from '@/stores/postStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Heart, MessageCircle, Share2, Send, Image, Edit, Trash2, MoreVertical, ThumbsDown } from 'lucide-react';
import MediaUpload from '@/components/MediaUpload';
import Comments from '@/components/Comments';

export default function Feed() {
  const { user } = useAuthStore();
  const { feedPosts, setFeedPosts, addFeedPost, updatePost, deletePostApi, setLoading, likePost, dislikePost } = usePostStore();
  const { showToast } = useUiStore();
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMediaUploadOpen, setIsMediaUploadOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showDropdown, setShowDropdown] = useState({});

  useEffect(() => {
    loadFeed();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setShowDropdown({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const response = await api.getFeed();
      setFeedPosts(response.posts);
    } catch {
      showToast('Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.createPost({ content: newPostContent });
      addFeedPost(response.post);
      setNewPostContent('');
      showToast('Post created successfully!', 'success');
    } catch {
      showToast('Failed to create post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const response = await api.likePost(postId);
      likePost(postId, {
        likeCount: response.likeCount,
        isLiked: response.isLiked
      });
    } catch {
      showToast('Failed to like post', 'error');
    }
  };

  const handleDislikePost = async (postId) => {
    try {
      // If post is already disliked, remove the dislike
      const currentPost = feedPosts.find(p => p._id === postId);
      if (currentPost?.isDisliked) {
        const response = await api.removeDislike(postId);
        dislikePost(postId, {
          dislikeCount: response.dislikeCount,
          isDisliked: false
        });
      } else {
        // Add dislike
        const response = await api.addDislike(postId);
        dislikePost(postId, {
          dislikeCount: response.dislikeCount,
          isDisliked: true
        });
      }
    } catch {
      showToast('Failed to dislike post', 'error');
    }
  };

  const toggleComments = (postId) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedComments(newExpanded);
  };

  const handleCommentAdded = (postId, commentData) => {
    if (commentData && commentData.comments) {
      // Handle pagination data from load more
      updatePost(postId, {
        comments: commentData.comments,
        commentCount: commentData.pagination.total,
        commentPagination: commentData.pagination
      });
    } else if (commentData) {
      // Handle single new comment
      updatePost(postId, {
        comments: [...(feedPosts.find(p => p._id === postId).comments || []), commentData],
        commentCount: (feedPosts.find(p => p._id === postId).commentCount || 0) + 1,
      });
    } else {
      // Refresh comments
      loadComments(postId);
    }
  };

  const loadComments = async (postId, page = 1) => {
    try {
      const response = await api.getComments(postId, page);
      updatePost(postId, {
        comments: response.comments,
        commentCount: response.pagination.total,
        commentPagination: response.pagination
      });
    } catch {
      showToast('Failed to load comments', 'error');
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post._id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await api.updatePost(editingPost, { 
        content: editContent 
      });
      updatePost(editingPost, response.post);
      setEditingPost(null);
      setEditContent('');
      showToast('Post updated successfully!', 'success');
    } catch {
      showToast('Failed to update post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setIsSubmitting(true);
    try {
      await deletePostApi(postId);
      showToast('Post deleted successfully!', 'success');
    } catch {
      showToast('Failed to delete post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDropdown = (postId) => {
    setShowDropdown(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create Post */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Create Post</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Avatar>
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's on your mind?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMediaUploadOpen(true)}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
                <Button 
                  onClick={handleCreatePost} 
                  disabled={!newPostContent.trim() || isSubmitting}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      <div className="space-y-4">
        {feedPosts.map((post) => (
          <div key={post._id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{post.author.name}</h4>
                    <p className="text-sm text-gray-500">@{post.author.username}</p>
                  </div>
                  <div className="ml-auto flex items-center space-x-2">
                    <Badge variant="outline">{new Date(post.createdAt).toLocaleDateString()}</Badge>
                    {user && user._id === post.author._id && (
                      <div className="relative dropdown-container">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDropdown(post._id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {showDropdown[post._id] && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                handleEditPost(post);
                                toggleDropdown(post._id);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-600"
                              onClick={() => {
                                handleDeletePost(post._id);
                                toggleDropdown(post._id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingPost === post._id ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Edit your post..."
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim() || isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-800 mb-4">{post.content}</p>
                    
                    {post.media && (
                      <div className="mb-4">
                        <img 
                          src={post.media.url} 
                          alt="Post media" 
                          className="w-full rounded-lg max-h-96 object-cover"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => post.isLiked ? handleDislikePost(post._id) : handleLikePost(post._id)}
                      className={post.isLiked ? 'text-red-500' : ''}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? 'fill-current' : ''}`} />
                      {post.likeCount || 0}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDislikePost(post._id)}
                      className={post.isDisliked ? 'text-blue-500' : ''}
                    >
                      <ThumbsDown className={`h-4 w-4 mr-1 ${post.isDisliked ? 'fill-current' : ''}`} />
                      {post.dislikeCount || 0}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleComments(post._id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {post.commentCount || post.comments?.length || 0}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {expandedComments.has(post._id) && (
              <div className="mt-4">
                <Comments 
                  postId={post._id}
                  comments={post.comments || []}
                  totalComments={post.commentCount || 0}
                  onCommentAdded={(comment) => handleCommentAdded(post._id, comment)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {feedPosts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No posts yet. Start by creating your first post!</p>
          </CardContent>
        </Card>
      )}
      
      <MediaUpload
        isOpen={isMediaUploadOpen}
        onClose={() => setIsMediaUploadOpen(false)}
        onUpload={() => {
          // You can now reference the uploaded media in your post
          showToast('Media uploaded! You can now reference it in your post.', 'success');
        }}
      />
    </div>
  );
}