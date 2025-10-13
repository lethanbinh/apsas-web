/**
 * Login form component
 */

'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox } from 'antd';
import { useAuth } from '@/hooks/useAuth';
import { LoginCredentials } from '@/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      setErrors({});
      await login(values);
      router.push('/dashboard');
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google login
    console.log('Google login clicked');
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
