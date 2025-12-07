const express = require('express');
const { User } = require('../models');
const neo4jService = require('../services/neo4jService');
const AuthService = require('../utils/auth');
const { validationSchemas, validate } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', validate(validationSchemas.register), async (req, res) => {
  try {
    const { name, email, username, password, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User already exists',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(password);
    
    // Generate user ID
    const userId = AuthService.generateUserId();

    // Create user in MongoDB
    const user = new User({
      _id: userId,
      name,
      email,
      username,
      password: hashedPassword,
      bio: bio || ''
    });

    await user.save();

    // Create user in Neo4j
    await neo4jService.createUser({
      id: userId,
      name,
      email,
      username,
      avatar: null,
      bio: bio || ''
    });

    // Generate JWT token
    const token = AuthService.generateToken(userId);

    // Sanitize user data
    const sanitizedUser = AuthService.sanitizeUser(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: sanitizedUser,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login user
router.post('/login', validate(validationSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await AuthService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = AuthService.generateToken(user._id);

    // Sanitize user data
    const sanitizedUser = AuthService.sanitizeUser(user);

    res.json({
      message: 'Login successful',
      user: sanitizedUser,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    // Get network stats from Neo4j
    const networkStats = await neo4jService.getNetworkStats(req.user._id);
    
    res.json({
      user: {
        ...user.toObject(),
        networkStats
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, validate(validationSchemas.updateProfile), async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    
    // Update MongoDB
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio, avatar },
      { new: true }
    ).select('-password');

    // Update Neo4j
    await neo4jService.updateUser(req.user._id, {
      name,
      bio,
      avatar
    });

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Logout user (optional - mainly for client-side token removal)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Refresh token (if implementing refresh token strategy)
router.post('/refresh', authMiddleware, (req, res) => {
  try {
    const newToken = AuthService.generateToken(req.user._id);
    
    res.json({
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

module.exports = router;