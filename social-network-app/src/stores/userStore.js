import { create } from 'zustand';
import apiService from '../services/api';

export const useUserStore = create((set, get) => ({
  users: [],
  currentUser: null,
  searchedUsers: [],
  userFollowing: [],
  followingPagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  },
  isLoading: false,
  error: null,

  setUsers: (users) => set({ users }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSearchedUsers: (searchedUsers) => set({ searchedUsers }),
  setUserFollowing: (userFollowing) => set({ userFollowing }),
  setFollowingPagination: (followingPagination) => set({ followingPagination }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(user => 
      user._id === userId ? { ...user, ...updates } : user
    ),
    currentUser: state.currentUser?._id === userId 
      ? { ...state.currentUser, ...updates } 
      : state.currentUser,
  })),

  followUser: (userId) => set((state) => ({
    users: state.users.map(user => 
      user._id === userId 
        ? { 
            ...user, 
            followersCount: user.followersCount + 1,
            isFollowing: true 
          } 
        : user
    ),
    currentUser: state.currentUser?._id === userId 
      ? { 
          ...state.currentUser, 
          followersCount: state.currentUser.followersCount + 1,
          isFollowing: true 
        } 
      : state.currentUser,
  })),

  unfollowUser: (userId) => set((state) => ({
    users: state.users.map(user => 
      user._id === userId 
        ? { 
            ...user, 
            followersCount: Math.max(0, user.followersCount - 1),
            isFollowing: false 
          } 
        : user
    ),
    currentUser: state.currentUser?._id === userId 
      ? { 
          ...state.currentUser, 
          followersCount: Math.max(0, state.currentUser.followersCount - 1),
          isFollowing: false 
        } 
      : state.currentUser,
  })),

  clearUsers: () => set({ users: [], searchedUsers: [], currentUser: null, userFollowing: [] }),

  // Fetch user's following
  fetchUserFollowing: async (userId, page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getUserFollowing(userId, page, limit);
      const { following, pagination } = response;
      
      set({
        userFollowing: following,
        followingPagination: pagination,
        isLoading: false,
        error: null
      });
      
      return { following, pagination };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to fetch user following' 
      });
      throw error;
    }
  },

  // Load more following (pagination)
  loadMoreFollowing: async (userId) => {
    const { followingPagination, userFollowing } = get();
    if (followingPagination.page >= followingPagination.pages) return;
    
    const nextPage = followingPagination.page + 1;
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getUserFollowing(userId, nextPage, followingPagination.limit);
      const { following, pagination } = response;
      
      set({
        userFollowing: [...userFollowing, ...following],
        followingPagination: pagination,
        isLoading: false,
        error: null
      });
      
      return { following, pagination };
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to load more following' 
      });
      throw error;
    }
  },
}));