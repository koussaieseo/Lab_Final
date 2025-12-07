const express = require('express');
const { Post, User, Notification } = require('../models');
const neo4jService = require('../services/neo4jService');
const { authMiddleware } = require('../middleware/auth');
const { validationSchemas, validate, validateQuery } = require('../middleware/validation');

const router = express.Router();

// Create a new post
router.post('/', authMiddleware, validate(validationSchemas.createPost), async (req, res) => {
  try {
    const { content, tags, isPublic = true } = req.body;
    const authorId = req.user._id;

    // Create post
    const post = new Post({
      author: authorId,
      content,
      tags: tags || [],
      isPublic
    });

    await post.save();

    // Populate author data
    await post.populate('author', 'name username avatar');

    // Create notifications for followers
    try {
      const followers = await neo4jService.getFollowers(authorId);
      const notificationPromises = followers.slice(0, 10).map(follower => 
        Notification.create({
          recipient: follower.id,
          sender: authorId,
          type: 'post',
          relatedPost: post._id,
          message: `${req.user.name} created a new post`
        })
      );
      
      await Promise.all(notificationPromises);
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
    }

    res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...post.toObject(),
        likeCount: 0,
        dislikeCount: 0,
        isLiked: false,
        isDisliked: false
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// Get posts feed (from users that current user follows)
router.get('/feed', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    // Get users that current user follows
    const following = await neo4jService.getFollowing(currentUserId);
    const followingIds = following.map(user => user.id);
    
    // Also include current user's posts
    followingIds.push(currentUserId);

    // Get posts from followed users
    const posts = await Post.find({ 
      author: { $in: followingIds },
      isPublic: true
    })
      .populate('author', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ 
      author: { $in: followingIds },
      isPublic: true
    });

    res.json({
      posts: posts.map(post => ({
        ...post.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
        isLiked: post.isLikedBy(currentUserId),
        isDisliked: post.isDislikedBy(currentUserId)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ message: 'Failed to get feed' });
  }
});

// Get all public posts (discover feed)
router.get('/discover', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    const posts = await Post.find({ isPublic: true })
      .populate('author', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ isPublic: true });

    res.json({
      posts: posts.map(post => ({
        ...post.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
        isLiked: post.isLikedBy(currentUserId),
        isDisliked: post.isDislikedBy(currentUserId)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get discover feed error:', error);
    res.status(500).json({ message: 'Failed to get discover feed' });
  }
});

// Get single post by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId)
      .populate('author', 'name username avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'name username avatar'
        },
        options: { sort: { createdAt: -1 }, limit: 10 }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user can view this post
    if (!post.isPublic && post.author._id.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.json({
      post: {
        ...post.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
        isLiked: post.isLikedBy(currentUserId),
        isDisliked: post.isDislikedBy(currentUserId)
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Failed to get post' });
  }
});

// Update post
router.put('/:id', authMiddleware, validate(validationSchemas.updatePost), async (req, res) => {
  try {
    const postId = req.params.id;
    const { content, tags, isPublic } = req.body;
    const currentUserId = req.user._id;

    const post = await Post.findOne({ _id: postId, author: currentUserId });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or access denied' });
    }

    // Update post
    post.content = content || post.content;
    post.tags = tags || post.tags;
    post.isPublic = isPublic !== undefined ? isPublic : post.isPublic;
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();
    await post.populate('author', 'name username avatar');

    res.json({
      message: 'Post updated successfully',
      post: {
        ...post.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
        isLiked: post.isLikedBy(currentUserId),
        isDisliked: post.isDislikedBy(currentUserId)
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Failed to update post' });
  }
});

// Delete post
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findOne({ _id: postId, author: currentUserId });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found or access denied' });
    }

    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

// Like a post
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already liked
    const existingLike = post.likes.find(like => like.user === currentUserId);
    if (existingLike) {
      return res.status(409).json({ message: 'Already liked this post' });
    }

    // Remove dislike if exists
    post.dislikes = post.dislikes.filter(dislike => dislike.user !== currentUserId);

    // Add like
    post.likes.push({ user: currentUserId });
    await post.save();

    // Create notification for post author
    if (post.author !== currentUserId) {
      try {
        await Notification.create({
          recipient: post.author,
          sender: currentUserId,
          type: 'like',
          relatedPost: postId,
          message: `${req.user.name} liked your post`
        });
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    res.json({ 
      message: 'Post liked successfully',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length,
      isLiked: true,
      isDisliked: false
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Failed to like post' });
  }
});

// Unlike a post
router.delete('/:id/like', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove like
    const initialLikeCount = post.likes.length;
    post.likes = post.likes.filter(like => like.user !== currentUserId);
    
    if (post.likes.length === initialLikeCount) {
      return res.status(404).json({ message: 'Like not found' });
    }

    await post.save();

    res.json({ 
      message: 'Post unliked successfully',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length,
      isLiked: false,
      isDisliked: false
    });
  } catch (error) {
    console.error('Unlike post error:', error);
    res.status(500).json({ message: 'Failed to unlike post' });
  }
});

// Dislike a post
router.post('/:id/dislike', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already disliked
    const existingDislike = post.dislikes.find(dislike => dislike.user === currentUserId);
    if (existingDislike) {
      return res.status(409).json({ message: 'Already disliked this post' });
    }

    // Remove like if exists
    post.likes = post.likes.filter(like => like.user !== currentUserId);

    // Add dislike
    post.dislikes.push({ user: currentUserId });
    await post.save();

    res.json({ 
      message: 'Post disliked successfully',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length,
      isLiked: false,
      isDisliked: true
    });
  } catch (error) {
    console.error('Dislike post error:', error);
    res.status(500).json({ message: 'Failed to dislike post' });
  }
});

// Remove dislike from a post
router.delete('/:id/dislike', authMiddleware, async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Remove dislike
    const initialDislikeCount = post.dislikes.length;
    post.dislikes = post.dislikes.filter(dislike => dislike.user !== currentUserId);
    
    if (post.dislikes.length === initialDislikeCount) {
      return res.status(404).json({ message: 'Dislike not found' });
    }

    await post.save();

    res.json({ 
      message: 'Post dislike removed successfully',
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length,
      isLiked: false,
      isDisliked: false
    });
  } catch (error) {
    console.error('Remove dislike error:', error);
    res.status(500).json({ message: 'Failed to remove dislike' });
  }
});

module.exports = router;