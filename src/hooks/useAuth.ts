/**
 * Custom hook for authentication
 */

'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { RootState, AppDispatch } from '@/store/store';
import { loginUser, logout, registerUser, fetchUserProfile } from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch: AppDispatch = useDispatch();
  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    // Only run on client-side to prevent hydration mismatch
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token && !isAuthenticated) {
        // dispatch(fetchUserProfile()); // Commented out as per user request
      }
    }
    setIsInitialized(true);
  }, [dispatch, isAuthenticated]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      await dispatch(loginUser(credentials)).unwrap();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      await dispatch(registerUser(userData)).unwrap();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    dispatch(logout());
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
};
