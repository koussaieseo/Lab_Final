const express = require('express');
const neo4j = require('neo4j-driver');
const neo4jService = require('../services/neo4jService');
const { authMiddleware } = require('../middleware/auth');
const { Notification } = require('../models');

const router = express.Router();

// Follow a user
router.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Prevent self-following
    if (currentUserId === userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Check if already following
    const isAlreadyFollowing = await neo4jService.isFollowing(currentUserId, userId);
    if (isAlreadyFollowing) {
      return res.status(409).json({ message: 'Already following this user' });
    }

    // Create follow relationship
    const success = await neo4jService.followUser(currentUserId, userId);
    
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create notification for the followed user
    try {
      await Notification.create({
        recipient: userId,
        sender: currentUserId,
        type: 'follow',
        message: `${req.user.name} started following you`
      });
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
    }

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Failed to follow user' });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Remove follow relationship
    const success = await neo4jService.unfollowUser(currentUserId, userId);
    
    if (!success) {
      return res.status(404).json({ message: 'Follow relationship not found' });
    }

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
});

// Get relationship status between two users
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId === userId) {
      return res.json({
        isFollowing: false,
        isFollowedBy: false,
        isMutual: false
      });
    }

    // Check if current user follows the target user
    const isFollowing = await neo4jService.isFollowing(currentUserId, userId);
    
    // Check if target user follows the current user
    const isFollowedBy = await neo4jService.isFollowing(userId, currentUserId);

    res.json({
      isFollowing,
      isFollowedBy,
      isMutual: isFollowing && isFollowedBy
    });
  } catch (error) {
    console.error('Get relationship status error:', error);
    res.status(500).json({ message: 'Failed to get relationship status' });
  }
});

// Get mutual followers between two users
router.get('/mutual/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Get followers of both users
    const currentUserFollowers = await neo4jService.getFollowers(currentUserId);
    const targetUserFollowers = await neo4jService.getFollowers(userId);

    // Find mutual followers
    const currentFollowerIds = currentUserFollowers.map(f => f.id);
    const targetFollowerIds = targetUserFollowers.map(f => f.id);
    
    const mutualFollowerIds = currentFollowerIds.filter(id => targetFollowerIds.includes(id));

    // Get user details for mutual followers
    const { User } = require('../models');
    const mutualFollowers = await User.find({ _id: { $in: mutualFollowerIds } })
      .select('-password')
      .limit(20);

    res.json({
      mutualFollowers: mutualFollowers.map(user => user.toObject()),
      count: mutualFollowers.length
    });
  } catch (error) {
    console.error('Get mutual followers error:', error);
    res.status(500).json({ message: 'Failed to get mutual followers' });
  }
});

// Get user's network graph data (for visualization)
router.get('/network/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const depth = parseInt(req.query.depth) || 2;
    const limit = parseInt(req.query.limit) || 50;

    // Get network data from Neo4j
    const session = neo4jService.getSession();
    
    const result = await session.run(`
      MATCH (user:User {id: $userId})
      MATCH (user)-[:FOLLOWS*1..${depth}]-(connected:User)
      WHERE user <> connected
      WITH user, connected, shortestPath((user)-[:FOLLOWS*1..${depth}]-(connected)) as path
      RETURN 
        user as centralUser,
        connected as connectedUser,
        length(path) as distance
      LIMIT $limit
    `, { userId, limit: neo4j.int(limit) });

    const nodes = new Set();
    const edges = [];
    
    result.records.forEach(record => {
      const centralUser = record.get('centralUser').properties;
      const connectedUser = record.get('connectedUser').properties;
      const distance = record.get('distance').toNumber();

      nodes.add(JSON.stringify({
        id: centralUser.id,
        name: centralUser.name,
        username: centralUser.username,
        avatar: centralUser.avatar,
        distance: 0
      }));

      nodes.add(JSON.stringify({
        id: connectedUser.id,
        name: connectedUser.name,
        username: connectedUser.username,
        avatar: connectedUser.avatar,
        distance: distance
      }));
    });

    // Parse back to objects
    const uniqueNodes = Array.from(nodes).map(node => JSON.parse(node));
    
    res.json({
      nodes: uniqueNodes,
      edges: edges,
      userId
    });

    await session.close();
  } catch (error) {
    console.error('Get network graph error:', error);
    res.status(500).json({ message: 'Failed to get network graph' });
  }
});

module.exports = router;