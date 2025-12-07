import axios from 'axios';

const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: "http://localhost:5000/api",
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        console.log('API request interceptor - token:', token);
        console.log('API request interceptor - url:', config.url);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('API request interceptor - Authorization header set');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log('API response interceptor - success:', response.config.url, response.status);
        return response;
      },
      (error) => {
        console.log('API response interceptor - error:', error.config?.url, error.response?.status);
        console.log('API response interceptor - error details:', error.message);
        if (error.response?.status === 401) {
          console.log('API response interceptor - 401 detected, clearing token');
          localStorage.removeItem('token');
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        
        const errorMessage = error.response?.data?.message || 'An error occurred';
        throw new Error(errorMessage);
      }
    );
  }

  // Authentication
  async register(userData) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(credentials) {
    console.log('API login called with:', credentials);
    try {
      const response = await this.api.post('/auth/login', credentials);
      console.log('API login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API login error:', error);
      console.error('API login error response:', error.response);
      throw error;
    }
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  async refreshToken() {
    const response = await this.api.post('/auth/refresh');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Posts
  async getPosts(page = 1, limit = 10) {
    const response = await this.api.get(`/posts?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getFeed(page = 1, limit = 10) {
    const response = await this.api.get(`/posts/feed?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createPost(postData) {
    const response = await this.api.post('/posts', postData);
    return response.data;
  }

  async getPost(postId) {
    const response = await this.api.get(`/posts/${postId}`);
    return response.data;
  }

  async updatePost(postId, postData) {
    const response = await this.api.put(`/posts/${postId}`, postData);
    return response.data;
  }

  async deletePost(postId) {
    const response = await this.api.delete(`/posts/${postId}`);
    return response.data;
  }

  async likePost(postId) {
    const response = await this.api.post(`/posts/${postId}/like`);
    return response.data;
  }

  async dislikePost(postId) {
    const response = await this.api.delete(`/posts/${postId}/like`);
    return response.data;
  }

  async addDislike(postId) {
    const response = await this.api.post(`/posts/${postId}/dislike`);
    return response.data;
  }

  async removeDislike(postId) {
    const response = await this.api.delete(`/posts/${postId}/dislike`);
    return response.data;
  }

  // Comments
  async getComments(postId) {
    const response = await this.api.get(`/comments/${postId}`);
    return response.data;
  }

  async createComment(postId, content, parentCommentId = null) {
    const response = await this.api.post('/comments', { 
      postId, 
      content,
      parentCommentId 
    });
    return response.data;
  }

  async getCommentReplies(commentId) {
    const response = await this.api.get(`/comments/${commentId}/replies`);
    return response.data;
  }

  async likeComment(commentId) {
    const response = await this.api.post(`/comments/${commentId}/like`);
    return response.data;
  }

  async dislikeComment(commentId) {
    const response = await this.api.delete(`/comments/${commentId}/like`);
    return response.data;
  }

  async deleteComment(commentId) {
    const response = await this.api.delete(`/comments/${commentId}`);
    return response.data;
  }

  async updateComment(commentId, content) {
    const response = await this.api.put(`/comments/${commentId}`, { content });
    return response.data;
  }

  // Users
  async getUserProfile(userId) {
    const response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  async updateUserProfile(userData) {
    const response = await this.api.put('/users/profile', userData);
    return response.data;
  }

  async getUserPosts(userId, page = 1, limit = 10) {
    const response = await this.api.get(`/users/${userId}/posts?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getUserFollowers(userId, page = 1, limit = 10) {
    const response = await this.api.get(`/users/${userId}/followers?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getUserFollowing(userId, page = 1, limit = 10) {
    const response = await this.api.get(`/users/${userId}/following?page=${page}&limit=${limit}`);
    return response.data;
  }

  async searchUsers(query, type = 'all', page = 1, limit = 10) {
    const response = await this.api.get(`/users/search?q=${query}&type=${type}&page=${page}&limit=${limit}`);
    return response.data;
  }

  // Relationships
  async followUser(userId) {
    const response = await this.api.post(`/relationships/follow/${userId}`);
    return response.data;
  }

  async unfollowUser(userId) {
    const response = await this.api.post(`/relationships/unfollow/${userId}`);
    return response.data;
  }

  async getRelationshipStatus(userId) {
    const response = await this.api.get(`/relationships/status/${userId}`);
    return response.data;
  }

  async getMutualFollowers(userId) {
    const response = await this.api.get(`/relationships/mutual/${userId}`);
    return response.data;
  }

  async getNetworkGraph(userId) {
    const response = await this.api.get(`/relationships/network/${userId}`);
    return response.data;
  }

  // Notifications
  async getNotifications(page = 1, limit = 20) {
    const response = await this.api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getUnreadNotificationsCount() {
    const response = await this.api.get('/notifications/unread-count');
    return response.data;
  }

  async markNotificationAsRead(notificationId) {
    const response = await this.api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.api.patch('/notifications/mark-all-read');
    return response.data;
  }

  async deleteNotification(notificationId) {
    const response = await this.api.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  async clearReadNotifications() {
    const response = await this.api.delete('/notifications/clear-read');
    return response.data;
  }

  async getNotificationPreferences() {
    const response = await this.api.get('/notifications/preferences');
    return response.data;
  }

  async updateNotificationPreferences(preferences) {
    const response = await this.api.put('/notifications/preferences', preferences);
    return response.data;
  }

  async createTestNotification(type, message) {
    const response = await this.api.post('/notifications/test', { type, message });
    return response.data;
  }

  // Recommendations
  async getRecommendations(type = 'users') {
    const response = await this.api.get(`/recommendations/${type === 'users' ? 'people-you-may-know' : 'trending-users'}`);
    return response.data;
  }

  async getRecommendedUsers() {
    const response = await this.api.get('/recommendations/people-you-may-know');
    return response.data;
  }

  async getSuggestedPosts() {
    const response = await this.api.get('/recommendations/suggested-posts');
    return response.data;
  }

  async getMutualConnections(userId) {
    const response = await this.api.get(`/recommendations/mutual-connections/${userId}`);
    return response.data;
  }

  async getNetworkStats() {
    const response = await this.api.get('/recommendations/network-stats');
    return response.data;
  }

  async getConnectionPath(targetUserId) {
    const response = await this.api.get(`/recommendations/connection-path/${targetUserId}`);
    return response.data;
  }

  // Media
  async uploadMedia(file, type = 'image', postId = null, altText = null) {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('type', type);
    if (postId) formData.append('postId', postId);
    if (altText) formData.append('altText', altText);

    const response = await this.api.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMedia(mediaId) {
    const response = await this.api.get(`/media/${mediaId}`);
    return response.data;
  }

  async getUserMedia(userId, page = 1, limit = 10) {
    const response = await this.api.get(`/media/user/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  }

  async updateMedia(mediaId, altText) {
    const response = await this.api.put(`/media/${mediaId}`, { altText });
    return response.data;
  }

  async deleteMedia(mediaId) {
    const response = await this.api.delete(`/media/${mediaId}`);
    return response.data;
  }
}

export default new ApiService();