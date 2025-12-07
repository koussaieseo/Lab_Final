import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      setToken: (token) => {
        console.log('AuthStore - setToken called with:', token);
        set({ token });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, error: null });
      },

      syncWithLocalStorage: () => {
        const token = localStorage.getItem('token');
        if (token !== get().token) {
          set({ token });
        }
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token 
      }),
    }
  )
);