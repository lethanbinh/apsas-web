/**
 * Custom hook for authentication
 */

'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { RootState } from '@/store/store';
import { login, logout, setUser } from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
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
        // You can verify token here and set user data
        // For now, we'll just set authenticated state
        dispatch(setUser({ id: '1', email: 'user@example.com', firstName: 'User' }));
      }
    }
    setIsInitialized(true);
  }, [dispatch, isAuthenticated]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      // Mock login - replace with actual API call
      const mockUser = {
        id: '1',
        email: credentials.email,
        firstName: 'User',
        lastName: 'Name',
        username: 'user123',
        role: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock-jwt-token';
      localStorage.setItem('auth_token', mockToken);
      
      dispatch(login({ user: mockUser, token: mockToken }));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleRegister = async (userData: any) => {
    try {
      // Mock register - replace with actual API call
      const mockUser = {
        id: '1',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock-jwt-token';
      localStorage.setItem('auth_token', mockToken);
      
      dispatch(login({ user: mockUser, token: mockToken }));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    dispatch(logout());
  };

  const updateUser = (userData: any) => {
    dispatch(setUser(userData));
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    updateUser,
  };
};
