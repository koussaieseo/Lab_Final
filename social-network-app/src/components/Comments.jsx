import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Send, Trash2, Heart, MessageCircle } from 'lucide-react';

export default function Comments({ postId, comments = [], onCommentAdded }) {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.createComment(postId, newComment);
      onCommentAdded(response.comment);
      setNewComment('');
      showToast('Comment added successfully!', 'success');
    } catch {
      showToast('Failed to add comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.createComment(postId, replyContent, parentCommentId);
      onCommentAdded(response.comment);
      setReplyContent('');
      setReplyingTo(null);
      showToast('Reply added successfully!', 'success');
    } catch {
      showToast('Failed to add reply', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await api.likeComment(commentId);
      onCommentAdded(null); // Refresh comments
      showToast(response.message, 'success');
    } catch {
      showToast('Failed to like comment', 'error');
    }
  };

  const handleDislikeComment = async (commentId) => {
    try {
      const response = await api.dislikeComment(commentId);
      onCommentAdded(null); // Refresh comments
      showToast(response.message, 'success');
    } catch {
      showToast('Failed to dislike comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(commentId);
      onCommentAdded(null); // Refresh comments
      showToast('Comment deleted successfully!', 'success');
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Comment */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment._id} className="border-l-4 border-blue-200">
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.author?.avatar} alt={comment.author?.name} />
                  <AvatarFallback>{comment.author?.name?.[0] || '?'} </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{comment.author?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {comment.author?._id === user?._id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center space-x-4 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => comment.isLiked ? handleDislikeComment(comment._id) : handleLikeComment(comment._id)}
                      className={comment.isLiked ? 'text-red-500' : ''}
                    >
                      <Heart className={`h-3 w-3 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
                      {comment.likeCount || 0}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment._id)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment._id && (
                    <div className="mt-3 ml-8">
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          className="min-h-[40px] resize-none"
                          rows={1}
                        />
                        <div className="flex flex-col space-y-1">
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(comment._id)}
                            disabled={!replyContent.trim() || isSubmitting}
                          >
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {comments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}