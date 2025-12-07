import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import api from '@/services/api';
import { Send, Trash2, Heart, MessageCircle, Edit } from 'lucide-react';

export default function Comments({ postId, comments = [], onCommentAdded, totalComments = 0 }) {
  const { user } = useAuthStore();
  const { showToast } = useUiStore();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentReplies, setCommentReplies] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const commentsPerPage = 20;

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

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await api.updateComment(commentId, editContent);
      onCommentAdded(null); // Refresh comments
      setEditingComment(null);
      setEditContent('');
      showToast('Comment updated successfully!', 'success');
    } catch {
      showToast('Failed to update comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  const loadCommentReplies = async (commentId) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const response = await api.getCommentReplies(commentId);
      const replies = response.replies || [];
      setCommentReplies(prev => ({ ...prev, [commentId]: replies }));
      return replies;
    } catch {
      showToast('Failed to load replies', 'error');
      return [];
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleViewReplies = async (commentId) => {
    if (commentReplies[commentId]) {
      // If replies are already loaded, toggle visibility
      setCommentReplies(prev => ({ ...prev, [commentId]: undefined }));
    } else {
      // Load replies for the first time
      await loadCommentReplies(commentId);
    }
  };

  const loadMoreComments = async () => {
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await api.getComments(postId, nextPage, commentsPerPage);
      
      if (response.comments && response.comments.length > 0) {
        // Append new comments to existing ones
        onCommentAdded({
          comments: [...comments, ...response.comments],
          pagination: response.pagination
        });
        setCurrentPage(nextPage);
        setHasMoreComments(response.pagination.page < response.pagination.pages);
      } else {
        setHasMoreComments(false);
      }
    } catch {
      showToast('Failed to load more comments', 'error');
    } finally {
      setLoadingMore(false);
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
                  <AvatarFallback>{comment.author?.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{comment.author?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  {comment.author?._id === user?._id && (
                    <div key={`actions-${comment._id}`} className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditComment(comment)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  </div>
                  
                  {/* Comment Content - Edit Mode */}
                  {editingComment === comment._id ? (
                    <div key={`edit-${comment._id}`} className="space-y-2 mt-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                        rows={2}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment._id)}
                          disabled={!editContent.trim() || isSubmitting}
                        >
                          {isSubmitting ? 'Updating...' : 'Update'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p key={`content-${comment._id}`} className="text-sm text-gray-700 mt-1">{comment.content}</p>
                  )}
                  
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReplies(comment._id)}
                      disabled={loadingReplies[comment._id]}
                    >
                      {loadingReplies[comment._id] ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1" />
                          Loading...
                        </>
                      ) : commentReplies[comment._id] ? (
                        'Hide Replies'
                      ) : (
                        'View Replies'
                      )}
                    </Button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment._id && (
                    <div key={`reply-${comment._id}`} className="mt-3 ml-8">
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

                  {/* Comment Replies */}
                  {commentReplies[comment._id] && (
                    <div key={`replies-${comment._id}`} className="mt-4 ml-8 space-y-3">
                      {commentReplies[comment._id].map((reply) => (
                        <Card key={reply._id} className="border-l-2 border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={reply.author?.avatar} alt={reply.author?.name} />
                                <AvatarFallback>{reply.author?.name?.[0] || '?'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-xs">{reply.author?.name || 'Unknown'}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : 'Unknown date'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-700 mt-1">{reply.content}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => reply.isLiked ? handleDislikeComment(reply._id) : handleLikeComment(reply._id)}
                                    className={reply.isLiked ? 'text-red-500' : ''}
                                  >
                                    <Heart className={`h-2 w-2 mr-1 ${reply.isLiked ? 'fill-current' : ''}`} />
                                    {reply.likeCount || 0}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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

      {/* Load More Comments */}
      {hasMoreComments && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMoreComments}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                Loading...
              </>
            ) : (
              'Load More Comments'
            )}
          </Button>
        </div>
      )}

      {/* Comments Summary */}
      {comments.length > 0 && !hasMoreComments && (
        <div className="text-center text-sm text-gray-500 mt-4">
          Showing {comments.length} of {totalComments} comments
        </div>
      )}
    </div>
  );
}