import { create } from 'zustand';
import apiService from '../services/api';

export const usePostStore = create((set, get) => ({
  posts: [],
  feedPosts: [],
  currentPost: null,
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,

  setPosts: (posts) => set({ posts }),
  setFeedPosts: (feedPosts) => set({ feedPosts }),
  setCurrentPost: (currentPost) => set({ currentPost }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setHasMore: (hasMore) => set({ hasMore }),
  setPage: (page) => set({ page }),

  addPost: (post) => set((state) => ({ 
    posts: [post, ...state.posts] 
  })),

  addFeedPost: (post) => set((state) => ({ 
    feedPosts: [post, ...state.feedPosts] 
  })),

  updatePost: (postId, updates) => set((state) => ({
    posts: state.posts.map(post => 
      post._id === postId ? { ...post, ...updates } : post
    ),
    feedPosts: state.feedPosts.map(post => 
      post._id === postId ? { ...post, ...updates } : post
    ),
  })),

  // Like/Dislike actions
  likePost: (postId, likeData) => set((state) => ({
    posts: state.posts.map(post => 
      post._id === postId ? { 
        ...post, 
        likeCount: likeData.likeCount,
        isLiked: likeData.isLiked,
        isDisliked: false // Remove dislike when liking
      } : post
    ),
    feedPosts: state.feedPosts.map(post => 
      post._id === postId ? { 
        ...post, 
        likeCount: likeData.likeCount,
        isLiked: likeData.isLiked,
        isDisliked: false // Remove dislike when liking
      } : post
    ),
  })),

  dislikePost: (postId, dislikeData) => set((state) => ({
    posts: state.posts.map(post => 
      post._id === postId ? { 
        ...post, 
        dislikeCount: dislikeData.dislikeCount,
        isDisliked: dislikeData.isDisliked,
        isLiked: false // Remove like when disliking
      } : post
    ),
    feedPosts: state.feedPosts.map(post => 
      post._id === postId ? { 
        ...post, 
        dislikeCount: dislikeData.dislikeCount,
        isDisliked: dislikeData.isDisliked,
        isLiked: false // Remove like when disliking
      } : post
    ),
  })),

  deletePost: (postId) => set((state) => ({
    posts: state.posts.filter(post => post._id !== postId),
    feedPosts: state.feedPosts.filter(post => post._id !== postId),
  })),

  clearPosts: () => set({ posts: [], feedPosts: [], currentPost: null, page: 1, hasMore: true }),

  // API-based post update
  updatePostApi: async (postId, postData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.updatePost(postId, postData);
      const updatedPost = response.post;
      
      // Update local state
      set((state) => ({
        posts: state.posts.map(post => 
          post._id === postId ? { ...post, ...updatedPost } : post
        ),
        feedPosts: state.feedPosts.map(post => 
          post._id === postId ? { ...post, ...updatedPost } : post
        ),
        currentPost: state.currentPost?._id === postId 
          ? { ...state.currentPost, ...updatedPost } 
          : state.currentPost,
        isLoading: false,
        error: null
      }));
      
      return response;
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to update post' 
      });
      throw error;
    }
  },

  // API-based post deletion
  deletePostApi: async (postId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.deletePost(postId);
      
      // Remove from local state
      set((state) => ({
        posts: state.posts.filter(post => post._id !== postId),
        feedPosts: state.feedPosts.filter(post => post._id !== postId),
        currentPost: state.currentPost?._id === postId ? null : state.currentPost,
        isLoading: false,
        error: null
      }));
      
      return response;
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to delete post' 
      });
      throw error;
    }
  },
}));