const mongoose = require('mongoose');

// User Schema for MongoDB (complements Neo4j graph data)
const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

// Post Schema
const postSchema = new mongoose.Schema({
  author: {
    type: String,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String,
      default: null
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number, // for video/audio
      size: Number
    }
  }],
  likes: [{
    user: {
      type: String,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  dislikes: [{
    user: {
      type: String,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  shareCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'likes.user': 1 });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for dislike count
postSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

// Method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user === userId);
};

// Method to check if user disliked the post
postSchema.methods.isDislikedBy = function(userId) {
  return this.dislikes.some(dislike => dislike.user === userId);
};

const Post = mongoose.model('Post', postSchema);

// Comment Schema
const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: String,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    user: {
      type: String,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to check if user liked the comment
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user === userId);
};

const Comment = mongoose.model('Comment', commentSchema);

// Media Schema for file management
const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: null
  },
  uploadedBy: {
    type: String,
    ref: 'User',
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    format: String
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedIn: [{
    type: {
      type: String,
      enum: ['post', 'comment', 'profile']
    },
    id: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: true
});

// Indexes
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ createdAt: -1 });

const Media = mongoose.model('Media', mediaSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: String,
    ref: 'User',
    required: true
  },
  sender: {
    type: String,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['follow', 'like', 'comment', 'mention', 'share'],
    required: true
  },
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  relatedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = {
  User,
  Post,
  Comment,
  Media,
  Notification
};