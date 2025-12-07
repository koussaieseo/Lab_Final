const express = require('express');
const { User } = require('../models');
const neo4jService = require('../services/neo4jService');
const { authMiddleware } = require('../middleware/auth');
const { validateQuery } = require('../middleware/validation');
const { validationSchemas } = require('../middleware/validation');

const router = express.Router();

// Search users
router.get('/search', authMiddleware, validateQuery(validationSchemas.search), async (req, res) => {
  try {
    const { q, type = 'users', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (type === 'users' || type === 'all') {
      if (q && q.trim() !== '') {
        query = {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        };
      }
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    const total = await User.countDocuments(query);

    // Get following status for each user if Neo4j is available
    let usersWithFollowingStatus = users.map(user => user.toObject());
    
    if (neo4jService.driver) {
      usersWithFollowingStatus = await Promise.all(
        users.map(async (user) => {
          const userObj = user.toObject();
          
          // Check if current user follows this user
          const isFollowing = await neo4jService.isFollowing(req.user._id, user._id);
          
          return {
            ...userObj,
            isFollowing
          };
        })
      );
    }

    res.json({
      users: usersWithFollowingStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

// Get user profile by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user from MongoDB
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get network stats from Neo4j
    const networkStats = await neo4jService.getNetworkStats(userId);
    
    // Check if current user follows this user
    const isFollowing = await neo4jService.isFollowing(req.user._id, userId);

    res.json({
      user: {
        ...user.toObject(),
        networkStats,
        isFollowing
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Failed to get user profile' });
  }
});

// Get user's followers
router.get('/:id/followers', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Get followers from Neo4j
    const followers = await neo4jService.getFollowers(userId);
    
    // Get user details from MongoDB
    const followerIds = followers.map(f => f.id);
    const users = await User.find({ _id: { $in: followerIds } })
      .select('-password')
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    res.json({
      followers: users.map(user => user.toObject()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: followers.length,
        pages: Math.ceil(followers.length / limit)
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Failed to get followers' });
  }
});

// Get users that the user is following
router.get('/:id/following', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Get following from Neo4j
    const following = await neo4jService.getFollowing(userId);
    
    // Get user details from MongoDB
    const followingIds = following.map(f => f.id);
    const users = await User.find({ _id: { $in: followingIds } })
      .select('-password')
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    res.json({
      following: users.map(user => user.toObject()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: following.length,
        pages: Math.ceil(following.length / limit)
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Failed to get following' });
  }
});

// Get user's posts
router.get('/:id/posts', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    
    const { Post } = require('../models');
    
    const posts = await Post.find({ author: userId })
      .populate('author', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ author: userId });

    res.json({
      posts: posts.map(post => ({
        ...post.toObject(),
        likeCount: post.likes.length,
        dislikeCount: post.dislikes.length,
        isLiked: post.isLikedBy(req.user._id),
        isDisliked: post.isDislikedBy(req.user._id)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Failed to get user posts' });
  }
});

module.exports = router;