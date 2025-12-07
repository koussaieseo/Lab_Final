const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Media, User, Post } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { validationSchemas, validate } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/media');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload media
router.post('/upload', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type, altText, postId } = req.body;
    const userId = req.user._id;

    // Validate post ownership if postId is provided
    if (postId) {
      const post = await Post.findOne({ _id: postId, author: userId });
      if (!post) {
        return res.status(404).json({ message: 'Post not found or access denied' });
      }
    }

    // Create media record
    const media = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      type: type || (req.file.mimetype.startsWith('image/') ? 'image' : 'video'),
      altText: altText || '',
      uploadedBy: userId,
      postId: postId || null
    });

    await media.save();
    await media.populate('uploadedBy', 'name username avatar');

    res.status(201).json({
      message: 'Media uploaded successfully',
      media: {
        id: media._id,
        filename: media.filename,
        url: `/api/media/${media.filename}`,
        type: media.type,
        altText: media.altText,
        uploadedBy: media.uploadedBy
      }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    
    // Clean up uploaded file if error occurred
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError);
      }
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
    }
    
    res.status(500).json({ message: 'Failed to upload media' });
  }
});

// Get media by filename
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Find media record
    const media = await Media.findOne({ filename });
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    // Check if media is associated with a public post or if user has access
    if (media.postId) {
      const post = await Post.findById(media.postId);
      if (!post) {
        return res.status(404).json({ message: 'Associated post not found' });
      }
      
      // If post is not public and no authenticated user, deny access
      if (!post.isPublic && !req.user) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Serve the file
    const filePath = path.join(__dirname, '../../uploads/media', filename);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ message: 'Failed to retrieve media' });
  }
});

// Get user's media
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    // Check if user can view this media (either own media or public posts)
    const query = userId === currentUserId 
      ? { uploadedBy: userId }
      : { 
          uploadedBy: userId,
          $or: [
            { postId: null }, // Profile pictures, etc.
            { postId: { $exists: true } } // Will filter by post visibility below
          ]
        };

    const media = await Media.find(query)
      .populate('uploadedBy', 'name username avatar')
      .populate({
        path: 'postId',
        select: 'isPublic author',
        match: userId !== currentUserId ? { isPublic: true } : {}
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Filter out media from private posts (if not the owner)
    const filteredMedia = userId === currentUserId 
      ? media 
      : media.filter(m => !m.postId || m.postId.isPublic);

    const total = await Media.countDocuments(query);

    res.json({
      media: filteredMedia.map(m => ({
        id: m._id,
        filename: m.filename,
        url: `/api/media/${m.filename}`,
        type: m.type,
        altText: m.altText,
        uploadedBy: m.uploadedBy,
        postId: m.postId?._id || null,
        createdAt: m.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user media error:', error);
    res.status(500).json({ message: 'Failed to get user media' });
  }
});

// Update media metadata
router.put('/:id', authMiddleware, validate(validationSchemas.updateMedia), async (req, res) => {
  try {
    const { id } = req.params;
    const { altText } = req.body;
    const userId = req.user._id;

    const media = await Media.findOne({ _id: id, uploadedBy: userId });
    if (!media) {
      return res.status(404).json({ message: 'Media not found or access denied' });
    }

    media.altText = altText || media.altText;
    media.updatedAt = new Date();

    await media.save();
    await media.populate('uploadedBy', 'name username avatar');

    res.json({
      message: 'Media updated successfully',
      media: {
        id: media._id,
        filename: media.filename,
        url: `/api/media/${media.filename}`,
        type: media.type,
        altText: media.altText,
        uploadedBy: media.uploadedBy
      }
    });
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ message: 'Failed to update media' });
  }
});

// Delete media
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const media = await Media.findOne({ _id: id, uploadedBy: userId });
    if (!media) {
      return res.status(404).json({ message: 'Media not found or access denied' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '../../uploads/media', media.filename);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('Failed to delete file:', fileError);
    }

    // Remove from associated post if any
    if (media.postId) {
      await Post.findByIdAndUpdate(
        media.postId,
        { $pull: { media: media._id } }
      );
    }

    // Delete media record
    await Media.findByIdAndDelete(id);

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ message: 'Failed to delete media' });
  }
});

module.exports = router;