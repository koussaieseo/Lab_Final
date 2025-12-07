import { create } from 'zustand';

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

  deletePost: (postId) => set((state) => ({
    posts: state.posts.filter(post => post._id !== postId),
    feedPosts: state.feedPosts.filter(post => post._id !== postId),
  })),

  clearPosts: () => set({ posts: [], feedPosts: [], currentPost: null, page: 1, hasMore: true }),
}));