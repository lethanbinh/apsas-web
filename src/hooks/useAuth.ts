'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useEffect, useState } from 'react';
import { RootState, AppDispatch } from '@/store/store';
import { loginUser, logout, registerUser, fetchUserProfile } from '@/store/slices/authSlice';
import { getStorageItem } from '@/lib/utils/storage';
import { removeStorageItem } from '@/lib/utils/storage';
import { deleteCookie } from '@/lib/utils/cookie';
import { initSessionTimeout, resumeSessionTimeout, clearSessionTimeout, isSessionExpired } from '@/lib/utils/sessionTimeout';

export const useAuth = () => {
  const dispatch: AppDispatch = useDispatch();
  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Handle session expiration
  const handleSessionExpire = () => {
    console.log('Session expired, logging out...');
    clearSessionTimeout();
    removeStorageItem('auth_token');
    removeStorageItem('user_data');
    removeStorageItem('user_id');
    deleteCookie('auth_token');
    dispatch(logout());
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/login' || currentPath === '/register';
      const isPublicRoute = currentPath === '/' || currentPath.startsWith('/reset-password');
      
      if (isLoginPage || isPublicRoute) {
        setIsInitialized(true);
        return;
      }

      const token = getStorageItem('auth_token');
      const userDataStr = getStorageItem('user_data');

      console.log('🔍 useAuth - Token exists:', !!token);
      console.log('🔍 useAuth - UserData exists:', !!userDataStr);
      console.log('🔍 useAuth - isAuthenticated:', isAuthenticated);

      // If no token and not on public route, redirect to login immediately
      if (!token && !isPublicRoute && !isLoginPage) {
        console.log('⚠️ No token found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      // Check if session is expired
      if (token && isSessionExpired()) {
        console.log('⚠️ Session expired');
        handleSessionExpire();
        return;
      }

      if (token && !isAuthenticated) {
        console.log('🔄 Fetching user profile from server...');
        dispatch(fetchUserProfile()).then(() => {
          // After profile is fetched, resume session timeout (pass token to validate expiry)
          resumeSessionTimeout(handleSessionExpire, token);
        });
      } else if (token && isAuthenticated) {
        console.log('✅ User already authenticated');
        // Resume session timeout after page reload (pass token to validate expiry)
        resumeSessionTimeout(handleSessionExpire, token);
      } else if (!token) {
        console.log('⚠️ No token found');
      }
    }
    setIsInitialized(true);
  }, [dispatch, isAuthenticated]);

  // Handle back/forward button - detect when page is restored from cache
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageShow = (e: PageTransitionEvent) => {
      // If page was loaded from cache (back/forward button), check auth again
      if (e.persisted) {
        console.log('🔄 Page restored from cache, checking authentication...');
        const token = getStorageItem('auth_token');
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath === '/login' || currentPath === '/register';
        const isPublicRoute = currentPath === '/' || currentPath.startsWith('/reset-password');
        
        if (!token && !isPublicRoute && !isLoginPage) {
          console.log('⚠️ No token found after cache restore, redirecting to login');
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();
      console.log('✅ Login successful, result:', result);
      console.log('👤 User info after login:', result.user);
      console.log('👤 User ID:', result.user?.id);
      console.log('👤 User role:', result.user?.role);
      console.log('👤 User full name:', result.user?.fullName);

      // Initialize session timeout
      if (result.token) {
        initSessionTimeout(result.token, handleSessionExpire);
      }

      console.log('🔄 Fetching latest user profile from server...');
      try {
        await dispatch(fetchUserProfile());
        console.log('✅ User profile refreshed from server');
      } catch (profileError) {
        console.warn('⚠️ Could not fetch profile, using login response data:', profileError);
      }

      return result;
    } catch (error) {


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
    clearSessionTimeout();
    removeStorageItem('auth_token');
    removeStorageItem('user_data');
    removeStorageItem('user_id');
    deleteCookie('auth_token');
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
