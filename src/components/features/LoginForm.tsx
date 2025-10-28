/**
 * Login form component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import { useAuth } from '@/hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { fetchUserProfile } from '@/store/slices/authSlice';
import { LoginCredentials } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { config } from '@/lib/config';
import { authService } from '@/services/authService';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [form] = Form.useForm();
  const { login, isLoading } = useAuth();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Firebase app initialization (moved outside to be consistent and avoid re-init)
  let app;
  if (getApps().length === 0) {
    app = initializeApp(config.firebase);
  } else {
    app = getApps()[0];
  }
  const auth = getAuth(app);

  // Handle redirect result for Google Login
  useEffect(() => {
    // No longer needed for signInWithPopup, remove this block if switching to popup.
  }, []); // Remove dependencies as well if the block is empty.

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      setErrors({});
      const result = await login(values);
      
      // Wait a moment for user state to update with correct role
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get user from Redux store
      const state = (dispatch as any).getState?.() || null;
      const currentUser = state ? state.auth?.user : user;
      const userInfo = currentUser || result?.user;
      
      console.log('Login successful!');
      
      // Redirect based on user role
      const roleRedirects: { [key: number]: string } = {
        0: '/admin/dashboard', // Admin
        1: '/lecturer/dashboard', // Lecturer
        2: '/home', // Student
        3: '/hod/semester-plans', // HOD
      };
      
      const redirectPath = userInfo?.role !== undefined 
        ? roleRedirects[userInfo.role] || '/home' 
        : '/home';
      
      console.log('Redirecting to:', redirectPath);
      console.log('User role is:', userInfo?.role, 'which maps to:', redirectPath);
      
      router.push(redirectPath);
      onSuccess?.();
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider); // Use signInWithPopup
      console.log("result:", result);
      if (result && result.user) {
        const idToken = await result.user.getIdToken();
        console.log("Google ID Token:", idToken);
        if (idToken) {
          console.log("Sending ID Token to backend:", idToken);
          const response = await authService.googleLogin({ idToken });
          console.log("Backend response for Google Login:", response);
          if (response.result.token) {
            localStorage.setItem('auth_token', response.result.token);
            
            // Decode JWT to get user role for redirect
            const token = response.result.token;
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            
            const roleRedirects: { [key: string]: string } = {
              'Admin': '/admin/dashboard',
              'Lecturer': '/lecturer/dashboard',
              'Student': '/home',
              'HOD': '/hod/semester-plans',
            };
            
            console.log('Decoded role from JWT:', decoded.role);
            const redirectPath = roleRedirects[decoded.role] || '/home';
            console.log("Redirecting to:", redirectPath);
            router.push(redirectPath);
            onSuccess?.();
          }
        }
      }
    } catch (error: any) {
      console.error("Google login failed:", error);
      setErrors({ general: error.message || 'Google login failed' });
      onError?.(error.message || 'Google login failed');
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form-header">
        <h1 className="login-title">Login to APSAS!</h1>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        className="login-form"
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input 
            placeholder="Enter your Email" 
            className="login-input"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password 
            placeholder="Enter your Password" 
            className="login-input"
          />
        </Form.Item>

        <div className="login-options">
          <Form.Item name="remember" valuePropName="checked" className="remember-checkbox">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>
          <Link href="/reset-password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        {errors.general && (
          <div className="error-message">
            <p className="error-text">{errors.general}</p>
          </div>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            className="login-button"
          >
            Login
          </Button>
        </Form.Item>
      </Form>

      <div className="login-divider">
        <div className="divider-line"></div>
        <span className="divider-text">Or login with</span>
        <div className="divider-line"></div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        className="google-login-button"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        }
      >
        Login With Google
      </Button>

      
    </div>
  );
};
