const express = require('express');
const { User } = require('../models');
const neo4jService = require('../services/neo4jService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get people you may know (based on mutual connections)
router.get('/people-you-may-know', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { limit = 10 } = req.query;

    const recommendations = await neo4jService.getPeopleYouMayKnow(currentUserId, parseInt(limit));
    
    // Get user details for recommendations
    const userIds = recommendations.map(rec => rec.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username avatar bio')
      .lean();

    // Combine with mutual connections count
    const recommendationsWithDetails = users.map(user => {
      const rec = recommendations.find(r => r.userId === user._id);
      return {
        ...user,
        mutualConnections: rec?.mutualConnections || 0
      };
    });

    res.json({
      recommendations: recommendationsWithDetails,
      total: recommendationsWithDetails.length
    });
  } catch (error) {
    console.error('Get people you may know error:', error);
    res.status(500).json({ message: 'Failed to get recommendations' });
  }
});

// Get trending users (based on followers count)
router.get('/trending-users', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const currentUserId = req.user._id;

    const trendingUsers = await neo4jService.getTrendingUsers(parseInt(limit));
    
    // Get user details
    const userIds = trendingUsers.map(user => user.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username avatar bio')
      .lean();

    // Combine with follower count and check if current user follows them
    const trendingWithDetails = await Promise.all(users.map(async (user) => {
      const trending = trendingUsers.find(u => u.userId === user._id);
      const isFollowing = await neo4jService.isFollowing(currentUserId, user._id);
      
      return {
        ...user,
        followerCount: trending?.followerCount || 0,
        isFollowing
      };
    }));

    res.json({
      users: trendingWithDetails,
      total: trendingWithDetails.length
    });
  } catch (error) {
    console.error('Get trending users error:', error);
    res.status(500).json({ message: 'Failed to get trending users' });
  }
});

// Get connection path between two users
router.get('/connection-path/:targetUserId', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Cannot find connection path to yourself' });
    }

    const path = await neo4jService.getConnectionPath(currentUserId, targetUserId);
    
    if (!path || path.length === 0) {
      return res.json({
        path: [],
        distance: -1,
        message: 'No connection path found'
      });
    }

    // Get user details for path users
    const userIds = path.map(node => node.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username avatar')
      .lean();

    // Create path with user details
    const pathWithDetails = path.map(node => {
      const user = users.find(u => u._id === node.userId);
      return {
        userId: node.userId,
        name: user?.name || 'Unknown User',
        username: user?.username || 'unknown',
        avatar: user?.avatar || null
      };
    });

    res.json({
      path: pathWithDetails,
      distance: pathWithDetails.length - 1,
      message: `Connection path found with ${pathWithDetails.length - 1} degrees of separation`
    });
  } catch (error) {
    console.error('Get connection path error:', error);
    res.status(500).json({ message: 'Failed to get connection path' });
  }
});

// Get mutual connections with a user
router.get('/mutual-connections/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot find mutual connections with yourself' });
    }

    const mutualConnections = await neo4jService.getMutualConnections(currentUserId, userId);
    
    // Get user details for mutual connections
    const userIds = mutualConnections.map(conn => conn.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username avatar bio')
      .lean();

    res.json({
      mutualConnections: users,
      total: users.length
    });
  } catch (error) {
    console.error('Get mutual connections error:', error);
    res.status(500).json({ message: 'Failed to get mutual connections' });
  }
});

// Get network statistics
router.get('/network-stats', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const stats = await neo4jService.getNetworkStats(currentUserId);
    
    res.json({
      stats: {
        totalConnections: stats.totalConnections || 0,
        directConnections: stats.directConnections || 0,
        secondDegreeConnections: stats.secondDegreeConnections || 0,
        thirdDegreeConnections: stats.thirdDegreeConnections || 0,
        networkReach: stats.networkReach || 0,
        averageClustering: stats.averageClustering || 0,
        networkDensity: stats.networkDensity || 0
      }
    });
  } catch (error) {
    console.error('Get network stats error:', error);
    res.status(500).json({ message: 'Failed to get network statistics' });
  }
});

// Get suggested posts based on user interactions and network
router.get('/suggested-posts', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { limit = 10 } = req.query;

    // Get users in network (following + their connections)
    const following = await neo4jService.getFollowing(currentUserId);
    const followingIds = following.map(user => user.id);
    
    // Get some popular posts from network
    const { Post } = require('../models');
    
    const suggestedPosts = await Post.find({
      author: { $in: followingIds },
      isPublic: true,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
      .populate('author', 'name username avatar')
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(parseInt(limit));

    // Add interaction info
    const postsWithInteractions = suggestedPosts.map(post => ({
      ...post.toObject(),
      likeCount: post.likes.length,
      dislikeCount: post.dislikes.length,
      isLiked: post.isLikedBy(currentUserId),
      isDisliked: post.isDislikedBy(currentUserId)
    }));

    res.json({
      posts: postsWithInteractions,
      total: postsWithInteractions.length
    });
  } catch (error) {
    console.error('Get suggested posts error:', error);
    res.status(500).json({ message: 'Failed to get suggested posts' });
  }
});

module.exports = router;