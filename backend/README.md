# Social Network Backend API Documentation

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
  - [Authentication Routes](#authentication-routes)
  - [User Routes](#user-routes)
  - [Post Routes](#post-routes)
  - [Comment Routes](#comment-routes)
  - [Relationship Routes](#relationship-routes)
  - [Recommendation Routes](#recommendation-routes)
  - [Media Routes](#media-routes)
  - [Notification Routes](#notification-routes)
- [Sample Code Examples](#sample-code-examples)
- [Status Codes](#status-codes)

## Overview

This is the backend API for a social network application built with Node.js, Express, MongoDB, and Neo4j. The API provides comprehensive functionality for user management, posts, comments, relationships, media uploads, notifications, and recommendations.

### API Summary
- **Total Endpoints**: 53+ endpoints
- **Authentication**: JWT-based authentication
- **Database**: MongoDB for document storage, Neo4j for graph relationships
- **File Upload**: Support for images and videos with multer
- **Rate Limiting**: Built-in rate limiting for API protection
- **Validation**: Request validation with Joi schemas

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

1. Register a new user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Use the returned token in subsequent requests

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP
- **Headers**: Rate limit information is included in response headers

## Error Handling

All errors follow a consistent format:

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/social_network?authSource=admin

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password123

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Authentication Routes

#### Register New User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "securepassword123",
  "bio": "Software developer passionate about technology"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "bio": "Software developer passionate about technology",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "bio": "Software developer passionate about technology",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### Get Current User Profile
```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "bio": "Software developer passionate about technology",
    "avatar": "avatar_url",
    "networkStats": {
      "followersCount": 150,
      "followingCount": 75
    }
  }
}
```

#### Update User Profile
```http
PUT /api/auth/profile
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "bio": "Updated bio information",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "_id": "user_id",
    "name": "John Updated Doe",
    "bio": "Updated bio information",
    "avatar": "https://example.com/new-avatar.jpg"
  }
}
```

#### Logout
```http
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "token": "new_jwt_token_here"
}
```

### User Routes

#### Get User Profile
```http
GET /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "username": "johndoe",
    "bio": "Software developer",
    "avatar": "avatar_url",
    "networkStats": {
      "followersCount": 150,
      "followingCount": 75
    },
    "isFollowing": false
  }
}
```

#### Search Users
```http
GET /api/users/search?q=john&type=users&page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `q` (required): Search query
- `type`: 'users', 'posts', or 'all' (default: 'all')
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Get User's Followers
```http
GET /api/users/:id/followers?page=1&limit=20
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "followers": [
    {
      "_id": "follower_id",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatar": "avatar_url"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### Get User's Following
```http
GET /api/users/:id/following?page=1&limit=20
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "following": [
    {
      "_id": "following_id",
      "name": "Bob Johnson",
      "username": "bobjohnson",
      "avatar": "avatar_url"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 75,
    "pages": 4
  }
}
```

#### Get User's Posts
```http
GET /api/users/:id/posts?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "content": "This is my latest post",
      "author": {
        "_id": "user_id",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "avatar_url"
      },
      "likeCount": 25,
      "dislikeCount": 0,
      "isLiked": true,
      "isDisliked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Post Routes

#### Create Post
```http
POST /api/posts
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "This is my new post content",
  "tags": ["technology", "programming"],
  "isPublic": true
}
```

**Response:**
```json
{
  "message": "Post created successfully",
  "post": {
    "_id": "post_id",
    "content": "This is my new post content",
    "author": {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    },
    "tags": ["technology", "programming"],
    "isPublic": true,
    "likeCount": 0,
    "dislikeCount": 0,
    "isLiked": false,
    "isDisliked": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Feed (Posts from Followed Users)
```http
GET /api/posts/feed?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "content": "Post from someone I follow",
      "author": {
        "_id": "author_id",
        "name": "Jane Smith",
        "username": "janesmith",
        "avatar": "avatar_url"
      },
      "likeCount": 15,
      "dislikeCount": 0,
      "isLiked": false,
      "isDisliked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### Get Discover Feed (All Public Posts)
```http
GET /api/posts/discover?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:** Same as feed response but includes all public posts

#### Get Single Post
```http
GET /api/posts/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "post": {
    "_id": "post_id",
    "content": "Full post content",
    "author": {
      "_id": "author_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    },
    "tags": ["tag1", "tag2"],
    "isPublic": true,
    "likeCount": 25,
    "dislikeCount": 1,
    "isLiked": true,
    "isDisliked": false,
    "viewCount": 150,
    "comments": [
      {
        "_id": "comment_id",
        "content": "Great post!",
        "author": {
          "_id": "commenter_id",
          "name": "Alice Brown",
          "username": "alicebrown",
          "avatar": "avatar_url"
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Update Post
```http
PUT /api/posts/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Updated post content",
  "tags": ["updated", "tags"],
  "isPublic": false
}
```

**Response:**
```json
{
  "message": "Post updated successfully",
  "post": {
    "_id": "post_id",
    "content": "Updated post content",
    "tags": ["updated", "tags"],
    "isPublic": false
  }
}
```

#### Delete Post
```http
DELETE /api/posts/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Post deleted successfully"
}
```

#### Like Post
```http
POST /api/posts/:id/like
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Post liked successfully",
  "likeCount": 26,
  "isLiked": true
}
```

#### Unlike Post
```http
DELETE /api/posts/:id/like
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Post unliked successfully",
  "likeCount": 25,
  "isLiked": false
}
```

#### Dislike Post
```http
POST /api/posts/:id/dislike
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Post disliked successfully",
  "dislikeCount": 2,
  "isDisliked": true
}
```

#### Remove Dislike
```http
DELETE /api/posts/:id/dislike
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Post dislike removed successfully",
  "dislikeCount": 1,
  "isDisliked": false
}
```

### Comment Routes

#### Create Comment
```http
POST /api/comments/posts/:postId
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "This is my comment",
  "parentComment": "parent_comment_id" // Optional, for replies
}
```

**Response:**
```json
{
  "message": "Comment created successfully",
  "comment": {
    "_id": "comment_id",
    "content": "This is my comment",
    "author": {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    },
    "post": "post_id",
    "parentComment": null,
    "likeCount": 0,
    "isLiked": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Comments for Post
```http
GET /api/comments/posts/:postId?page=1&limit=20
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "comments": [
    {
      "_id": "comment_id",
      "content": "Great post!",
      "author": {
        "_id": "commenter_id",
        "name": "Alice Brown",
        "username": "alicebrown",
        "avatar": "avatar_url"
      },
      "likeCount": 5,
      "isLiked": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

#### Update Comment
```http
PUT /api/comments/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Updated comment content"
}
```

**Response:**
```json
{
  "message": "Comment updated successfully",
  "comment": {
    "_id": "comment_id",
    "content": "Updated comment content"
  }
}
```

#### Delete Comment
```http
DELETE /api/comments/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

#### Like Comment
```http
POST /api/comments/:id/like
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Comment liked successfully",
  "likeCount": 6,
  "isLiked": true
}
```

#### Unlike Comment
```http
DELETE /api/comments/:id/like
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Comment unliked successfully",
  "likeCount": 5,
  "isLiked": false
}
```

#### Get Comment Replies
```http
GET /api/comments/:commentId/replies
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "replies": [
    {
      "_id": "reply_id",
      "content": "This is a reply to the comment",
      "author": {
        "_id": "author_id",
        "name": "Bob Johnson",
        "username": "bobjohnson",
        "avatar": "avatar_url"
      },
      "likeCount": 2,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### Delete Comment
```http
DELETE /api/comments/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Comment deleted successfully"
}
```

### Relationship Routes

#### Follow User
```http
POST /api/relationships/follow/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Successfully followed user"
}
```

#### Unfollow User
```http
DELETE /api/relationships/follow/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Successfully unfollowed user"
}
```

#### Get Relationship Status
```http
GET /api/relationships/status/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "isFollowing": true,
  "isFollowedBy": false,
  "isMutual": false
}
```

#### Get Mutual Followers
```http
GET /api/relationships/mutual/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "mutualFollowers": [
    {
      "_id": "user_id",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatar": "avatar_url"
    }
  ],
  "count": 5
}
```

#### Get Network Graph Data
```http
GET /api/relationships/network/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "nodes": [
    {
      "id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "type": "user"
    }
  ],
  "edges": [
    {
      "source": "user1_id",
      "target": "user2_id",
      "type": "follows"
    }
  ],
  "networkStats": {
    "totalNodes": 150,
    "totalEdges": 300
  }
}
```

### Recommendation Routes

#### Get People You May Know
```http
GET /api/recommendations/people-you-may-know?limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "recommendations": [
    {
      "_id": "user_id",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatar": "avatar_url",
      "bio": "Software engineer",
      "mutualConnections": 3
    }
  ],
  "total": 10
}
```

#### Get Trending Users
```http
GET /api/recommendations/trending-users?limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "Popular User",
      "username": "popularuser",
      "avatar": "avatar_url",
      "bio": "Influencer and content creator",
      "followerCount": 10000,
      "isFollowing": false
    }
  ],
  "total": 10
}
```

#### Get Connection Path
```http
GET /api/recommendations/connection-path/:targetUserId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "path": [
    {
      "_id": "user1_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    },
    {
      "_id": "user2_id",
      "name": "Jane Smith",
      "username": "janesmith",
      "avatar": "avatar_url"
    }
  ],
  "distance": 2,
  "message": "Connection path found"
}
```

#### Get Mutual Connections
```http
GET /api/recommendations/mutual-connections/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "mutualConnections": [
    {
      "_id": "user_id",
      "name": "Alice Brown",
      "username": "alicebrown",
      "avatar": "avatar_url",
      "bio": "Software developer"
    }
  ],
  "total": 3
}
```

#### Get Network Statistics
```http
GET /api/recommendations/network-stats
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "networkStats": {
    "totalConnections": 150,
    "networkReach": 1250,
    "networkDensity": 0.15,
    "avgPathLength": 3.2
  }
}
```

#### Get Suggested Posts
```http
GET /api/recommendations/suggested-posts
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "posts": [
    {
      "_id": "post_id",
      "content": "Suggested post content",
      "author": {
        "_id": "author_id",
        "name": "Jane Smith",
        "username": "janesmith",
        "avatar": "avatar_url"
      },
      "likeCount": 45,
      "isLiked": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

### Media Routes

#### Upload Media
```http
POST /api/media/upload
```

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `media`: File (image/video)
- `type`: 'image' or 'video'
- `altText`: Alternative text (optional)
- `postId`: Associated post ID (optional)

**Response:**
```json
{
  "message": "Media uploaded successfully",
  "media": {
    "id": "media_id",
    "filename": "user_id-1234567890.jpg",
    "url": "/api/media/user_id-1234567890.jpg",
    "type": "image",
    "altText": "Description of the image",
    "uploadedBy": {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "avatar": "avatar_url"
    }
  }
}
```

#### Get Media
```http
GET /api/media/:filename
```

**Response:** File stream (image or video)

#### Get User's Media
```http
GET /api/media/user/:userId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "media": [
    {
      "id": "media_id",
      "filename": "user_id-1234567890.jpg",
      "url": "/api/media/user_id-1234567890.jpg",
      "type": "image",
      "altText": "Description of the image",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 5
}
```

#### Update Media
```http
PUT /api/media/:id
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "altText": "Updated description",
  "postId": "post_id"
}
```

**Response:**
```json
{
  "message": "Media updated successfully",
  "media": {
    "id": "media_id",
    "altText": "Updated description",
    "postId": "post_id"
  }
}
```

#### Delete Media
```http
DELETE /api/media/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Media deleted successfully"
}
```

### Notification Routes

#### Get User Notifications
```http
GET /api/notifications?page=1&limit=20
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "notifications": [
    {
      "id": "notification_id",
      "type": "follow",
      "message": "John Doe started following you",
      "sender": {
        "_id": "sender_id",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "avatar_url"
      },
      "relatedPost": null,
      "relatedComment": null,
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  },
  "unreadCount": 3
}
```

#### Get Unread Notifications Count
```http
GET /api/notifications/unread-count
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "unreadCount": 3
}
```

#### Mark Notification as Read
```http
PATCH /api/notifications/:id/read
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

#### Mark All Notifications as Read
```http
PATCH /api/notifications/mark-all-read
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

#### Delete Notification
```http
DELETE /api/notifications/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Notification deleted successfully"
}
```

#### Clear Read Notifications
```http
DELETE /api/notifications/clear-read
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Read notifications cleared successfully",
  "deletedCount": 10
}
```

#### Get Notification Preferences
```http
GET /api/notifications/preferences
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "preferences": {
    "followNotifications": true,
    "postNotifications": true,
    "commentNotifications": true,
    "likeNotifications": false,
    "emailNotifications": true
  }
}
```

#### Update Notification Preferences
```http
PUT /api/notifications/preferences
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "followNotifications": true,
  "postNotifications": false,
  "commentNotifications": true,
  "likeNotifications": true,
  "emailNotifications": false
}
```

**Response:**
```json
{
  "message": "Notification preferences updated successfully",
  "preferences": {
    "followNotifications": true,
    "postNotifications": false,
    "commentNotifications": true,
    "likeNotifications": true,
    "emailNotifications": false
  }
}
```

#### Create Test Notification (Development)
```http
POST /api/notifications/test
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "follow",
  "message": "Test notification message"
}
```

**Response:**
```json
{
  "message": "Test notification created successfully"
}
```

## Sample Code Examples

### JavaScript/TypeScript API Client

```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Client Class
class SocialNetworkAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : '',
    };
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    this.setToken(data.token);
    return data;
  }

  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Posts
  async createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async getFeed(page = 1, limit = 10) {
    return this.request(`/posts/feed?page=${page}&limit=${limit}`);
  }

  async likePost(postId) {
    return this.request(`/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  // Users
  async searchUsers(query, type = 'all', page = 1, limit = 10) {
    return this.request(`/users/search?q=${query}&type=${type}&page=${page}&limit=${limit}`);
  }

  async followUser(userId) {
    return this.request(`/relationships/follow/${userId}`, {
      method: 'POST',
    });
  }

  // Media Upload
  async uploadMedia(file, type = 'image', postId = null) {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('type', type);
    if (postId) formData.append('postId', postId);

    return this.request('/media/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
    });
  }
}

// Usage Example
const api = new SocialNetworkAPI();

// Login
async function login() {
  try {
    const data = await api.login({
      email: 'user@example.com',
      password: 'password123'
    });
    console.log('Login successful:', data);
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

// Create a post
async function createPost() {
  try {
    const data = await api.createPost({
      content: 'Hello, this is my first post!',
      tags: ['introduction', 'hello'],
      isPublic: true
    });
    console.log('Post created:', data);
  } catch (error) {
    console.error('Post creation failed:', error.message);
  }
}

// Get feed
async function getFeed() {
  try {
    const data = await api.getFeed(1, 10);
    console.log('Feed:', data.posts);
  } catch (error) {
    console.error('Failed to get feed:', error.message);
  }
}

// Upload media
async function uploadMedia() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  if (file) {
    try {
      const data = await api.uploadMedia(file, 'image');
      console.log('Media uploaded:', data);
    } catch (error) {
      console.error('Media upload failed:', error.message);
    }
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

// Custom hook for API calls
function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const callApi = async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, callApi };
}

// Usage in a component
function FeedComponent() {
  const { loading, error, data, callApi } = useApi();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const api = new SocialNetworkAPI();
    callApi(() => api.getFeed()).then(result => {
      setPosts(result.posts);
    });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post._id}>
          <h3>{post.author.name}</h3>
          <p>{post.content}</p>
          <button onClick={() => handleLike(post._id)}>
            Like ({post.likeCount})
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Error Handling Example

```javascript
// Enhanced error handling
class SocialNetworkAPI {
  // ... previous methods ...

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options.headers },
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 401) {
          // Token expired, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Handle validation errors
        if (response.status === 400 && data.errors) {
          const errorMessages = data.errors.map(err => err.message).join(', ');
          throw new Error(`Validation error: ${errorMessages}`);
        }

        throw new Error(data.message || `API Error: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      throw error;
    }
  }
}
```

## Status Codes

### 2xx Success
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return

### 4xx Client Errors
- `400 Bad Request` - Invalid request data or malformed JSON
- `401 Unauthorized` - Authentication required or token expired
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email, already following)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `415 Unsupported Media Type` - Invalid file type for uploads

### 5xx Server Errors
- `500 Internal Server Error` - Server error occurred
- `502 Bad Gateway` - Invalid response from upstream server
- `503 Service Unavailable` - Service temporarily unavailable

---

## Version Information

- **API Version**: 1.0.0
- **Last Updated**: December 2024
- **Compatibility**: Node.js 16+, MongoDB 4.4+, Neo4j 4.4+

## Support

For questions or issues with the API, please refer to the error messages and status codes provided in the responses. Ensure all required headers and authentication tokens are included in your requests.