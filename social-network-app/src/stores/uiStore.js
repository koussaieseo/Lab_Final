import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  isSidebarOpen: false,
  isMobileMenuOpen: false,
  theme: 'light',
  isLoading: false,
  toast: null,

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  setTheme: (theme) => set({ theme }),
  setLoading: (isLoading) => set({ isLoading }),
  setToast: (toast) => set({ toast }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),

  showToast: (message, type = 'default') => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  resetUi: () => set({
    isSidebarOpen: false,
    isMobileMenuOpen: false,
    isLoading: false,
    toast: null,
  }),
}));