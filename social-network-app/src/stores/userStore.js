import { create } from 'zustand';

export const useUserStore = create((set, get) => ({
  users: [],
  currentUser: null,
  searchedUsers: [],
  isLoading: false,
  error: null,

  setUsers: (users) => set({ users }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setSearchedUsers: (searchedUsers) => set({ searchedUsers }),
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

  clearUsers: () => set({ users: [], searchedUsers: [], currentUser: null }),
}));