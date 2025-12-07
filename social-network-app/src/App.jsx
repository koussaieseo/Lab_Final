import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Recommendations from './pages/Recommendations';
import { useAuthStore } from './stores/authStore';
import DebugRoute from './components/DebugRoute';

function App() {
  const { token, setUser, setLoading, setToken, syncWithLocalStorage } = useAuthStore();

  useEffect(() => {
    console.log('App component - token changed:', token);
    const initializeAuth = async () => {
      if (token) {
        console.log('App component - token exists, initializing auth');
        try {
          setLoading(true);
          const response = await import('./services/api').then(m => m.default.getCurrentUser());
          console.log('App component - getCurrentUser success:', response.user);
          setUser(response.user);
        } catch (error) {
          console.error('App component - Auth initialization failed:', error);
          // Clear token on auth failure to prevent redirect loop
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('App component - no token, skipping auth initialization');
      }
    };

    initializeAuth();
  }, [token]);

  // Listen for localStorage changes to sync auth state
  useEffect(() => {
    const handleStorageChange = () => {
      syncWithLocalStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Periodic sync to ensure auth state consistency
    const syncInterval = setInterval(() => {
      syncWithLocalStorage();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(syncInterval);
    };
  }, [syncWithLocalStorage]);

  return (
    <BrowserRouter>
      <DebugRoute name="App">
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/" replace />} />
          <Route 
            path="/" 
            element={token ? <Layout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Feed />} />
            <Route path="users" element={<Users />} />
            <Route path="profile/:userId" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="recommendations" element={<Recommendations />} />
          </Route>
        </Routes>
      </DebugRoute>
    </BrowserRouter>
  );
}

export default App;