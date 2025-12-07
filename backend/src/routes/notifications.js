const express = require('express');
const { Notification, User } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { validationSchemas, validateQuery } = require('../middleware/validation');

const router = express.Router();

// Get user's notifications
router.get('/', authMiddleware, validateQuery(validationSchemas.pagination), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'name username avatar')
      .populate('relatedPost', 'content author')
      .populate('relatedComment', 'content author')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({ recipient: userId });
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });

    res.json({
      notifications: notifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        message: notification.message,
        sender: notification.sender,
        relatedPost: notification.relatedPost,
        relatedComment: notification.relatedComment,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({ 
      recipient: userId, 
      isRead: false 
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId 
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.findByIdAndDelete(id);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// Delete all read notifications
router.delete('/clear-read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({ 
      recipient: userId, 
      isRead: true 
    });

    res.json({ 
      message: 'Read notifications cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({ message: 'Failed to clear read notifications' });
  }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('notificationPreferences');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Default preferences if not set
    const defaultPreferences = {
      newFollower: true,
      postLike: true,
      postComment: true,
      commentReply: true,
      commentLike: true,
      mention: true,
      directMessage: true,
      systemUpdates: false,
      marketingEmails: false
    };

    const preferences = user.notificationPreferences || defaultPreferences;

    res.json({ preferences });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({ message: 'Failed to get notification preferences' });
  }
});

// Update notification preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    // Validate preferences structure
    const validPreferences = [
      'newFollower', 'postLike', 'postComment', 'commentReply', 
      'commentLike', 'mention', 'directMessage', 'systemUpdates', 'marketingEmails'
    ];

    const updatedPreferences = {};
    validPreferences.forEach(pref => {
      if (preferences.hasOwnProperty(pref)) {
        updatedPreferences[pref] = Boolean(preferences[pref]);
      }
    });

    await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: updatedPreferences },
      { new: true }
    );

    res.json({ 
      message: 'Notification preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

// Create a test notification (for development/testing)
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'system', message = 'Test notification' } = req.body;

    const notification = new Notification({
      recipient: userId,
      sender: userId,
      type,
      message,
      isRead: false
    });

    await notification.save();
    await notification.populate('sender', 'name username avatar');

    res.status(201).json({
      message: 'Test notification created',
      notification: {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        sender: notification.sender,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({ message: 'Failed to create test notification' });
  }
});

module.exports = router;