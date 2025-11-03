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
      const userDataStr = localStorage.getItem('user_data');
      
      console.log('🔍 useAuth - Token exists:', !!token);
      console.log('🔍 useAuth - UserData exists:', !!userDataStr);
      console.log('🔍 useAuth - isAuthenticated:', isAuthenticated);
      
      if (token && !isAuthenticated) {
        console.log('🔄 Fetching user profile from server...');
        dispatch(fetchUserProfile());
      } else if (token && isAuthenticated) {
        console.log('✅ User already authenticated');
      } else {
        console.log('⚠️ No token found');
      }
    }
    setIsInitialized(true);
  }, [dispatch, isAuthenticated]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();
      console.log('✅ Login successful, result:', result);
      console.log('👤 User info after login:', result.user);
      console.log('👤 User ID:', result.user?.id);
      console.log('👤 User role:', result.user?.role);
      console.log('👤 User full name:', result.user?.fullName);
      
      // Fetch latest user profile from server using the correct API
      console.log('🔄 Fetching latest user profile from server...');
      try {
        await dispatch(fetchUserProfile());
        console.log('✅ User profile refreshed from server');
      } catch (profileError) {
        console.warn('⚠️ Could not fetch profile, using login response data:', profileError);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Login failed:', error);
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
