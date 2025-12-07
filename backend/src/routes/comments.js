const express = require('express');
const { Comment, Post, Notification } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { validationSchemas, validate } = require('../middleware/validation');

const router = express.Router();

// Create a new comment
router.post('/posts/:postId', authMiddleware, validate(validationSchemas.createComment), async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;
    const authorId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if parent comment exists (if provided)
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      if (parent.post.toString() !== postId) {
        return res.status(400).json({ message: 'Parent comment does not belong to this post' });
      }
    }

    // Create comment
    const comment = new Comment({
      post: postId,
      author: authorId,
      content,
      parentComment: parentComment || null
    });

    await comment.save();
    await comment.populate('author', 'name username avatar');

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    // Create notification for post author (if not the same as comment author)
    if (post.author !== authorId) {
      try {
        await Notification.create({
          recipient: post.author,
          sender: authorId,
          type: 'comment',
          relatedPost: postId,
          relatedComment: comment._id,
          message: `${req.user.name} commented on your post`
        });
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    // Create notification for parent comment author (if different from current author)
    if (parentComment) {
      const parentCommentData = await Comment.findById(parentComment).populate('author');
      if (parentCommentData.author._id.toString() !== authorId && 
          parentCommentData.author._id.toString() !== post.author) {
        try {
          await Notification.create({
            recipient: parentCommentData.author._id,
            sender: authorId,
            type: 'comment',
            relatedPost: postId,
            relatedComment: comment._id,
            message: `${req.user.name} replied to your comment`
          });
        } catch (notificationError) {
          console.error('Notification creation error:', notificationError);
        }
      }
    }

    res.status(201).json({
      message: 'Comment created successfully',
      comment: {
        ...comment.toObject(),
        likeCount: 0,
        isLiked: false
      }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

// Get comments for a post
router.get('/posts/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    // Check if post exists and user can view it
    const post = await Post.findById(postId).populate('author', 'name username avatar');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.isPublic && post.author._id.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get top-level comments (no parent)
    const comments = await Comment.find({ 
      post: postId, 
      parentComment: null 
    })
      .populate('author', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get total count
    const total = await Comment.countDocuments({ 
      post: postId, 
      parentComment: null 
    });

    // Add like information to each comment
    const commentsWithLikes = comments.map(comment => ({
      ...comment.toObject(),
      likeCount: comment.likes.length,
      isLiked: comment.isLikedBy(currentUserId)
    }));

    res.json({
      comments: commentsWithLikes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Failed to get comments' });
  }
});

// Get replies for a comment
router.get('/:commentId/replies', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    // Check if parent comment exists
    const parentComment = await Comment.findById(commentId).populate('post');
    if (!parentComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can view the post
    const post = parentComment.post;
    if (!post.isPublic && post.author !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get replies
    const replies = await Comment.find({ parentComment: commentId })
      .populate('author', 'name username avatar')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ parentComment: commentId });

    res.json({
      replies: replies.map(reply => ({
        ...reply.toObject(),
        likeCount: reply.likes.length,
        isLiked: reply.isLikedBy(currentUserId)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Failed to get replies' });
  }
});

// Update a comment
router.put('/:id', authMiddleware, validate(validationSchemas.updateComment), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    const comment = await Comment.findOne({ _id: id, author: currentUserId });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found or access denied' });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('author', 'name username avatar');

    res.json({
      message: 'Comment updated successfully',
      comment: {
        ...comment.toObject(),
        likeCount: comment.likes.length,
        isLiked: comment.isLikedBy(currentUserId)
      }
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const comment = await Comment.findOne({ _id: id, author: currentUserId });
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found or access denied' });
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(
      comment.post,
      { $pull: { comments: comment._id } }
    );

    // Delete comment and its replies
    await Comment.deleteMany({ 
      $or: [
        { _id: comment._id },
        { parentComment: comment._id }
      ]
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

// Like a comment
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if already liked
    const existingLike = comment.likes.find(like => like.user === currentUserId);
    if (existingLike) {
      return res.status(409).json({ message: 'Already liked this comment' });
    }

    // Add like
    comment.likes.push({ user: currentUserId });
    await comment.save();

    // Create notification for comment author (if different from current user)
    if (comment.author !== currentUserId) {
      try {
        await Notification.create({
          recipient: comment.author,
          sender: currentUserId,
          type: 'like',
          relatedComment: comment._id,
          message: `${req.user.name} liked your comment`
        });
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    res.json({ 
      message: 'Comment liked successfully',
      likeCount: comment.likes.length,
      isLiked: true
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Failed to like comment' });
  }
});

// Unlike a comment
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Remove like
    const initialLikeCount = comment.likes.length;
    comment.likes = comment.likes.filter(like => like.user !== currentUserId);
    
    if (comment.likes.length === initialLikeCount) {
      return res.status(404).json({ message: 'Like not found' });
    }

    await comment.save();

    res.json({ 
      message: 'Comment unliked successfully',
      likeCount: comment.likes.length,
      isLiked: false
    });
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ message: 'Failed to unlike comment' });
  }
});

module.exports = router;