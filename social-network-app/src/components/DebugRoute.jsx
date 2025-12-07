import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function DebugRoute({ children, name }) {
  const location = useLocation();
  const { token, user } = useAuthStore();

  useEffect(() => {
    console.log(`DebugRoute [${name}] - Location:`, location.pathname);
    console.log(`DebugRoute [${name}] - Token:`, token);
    console.log(`DebugRoute [${name}] - User:`, user);
  }, [location, token, user, name]);

  return children;
}