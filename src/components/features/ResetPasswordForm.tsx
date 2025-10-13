'use client';

import React, { useState } from 'react';
import { Form, Input, Button } from 'antd';
import { useRouter } from 'next/navigation';

const ResetPasswordForm: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      setErrors({});
      
      // Mock reset password logic - replace with actual API call
      console.log('Reset password data:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success
      router.push('/login');
    } catch (error: any) {
      const errorMessage = error.message || 'Reset password failed';
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google login
    console.log('Google login clicked');
  };

  return (
    <div className="reset-password-form-container">
      <div className="reset-password-form-header">
        <h1 className="reset-password-title">Reset password</h1>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        className="reset-password-form"
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input
            placeholder="Enter your Email"
            className="reset-password-input"
          />
        </Form.Item>

        <Form.Item
          name="otp"
          label="Type OTP"
          rules={[
            { required: true, message: 'Please enter OTP' },
            { len: 6, message: 'OTP must be 6 digits' },
          ]}
        >
          <Input
            placeholder="Enter OTP"
            className="reset-password-input"
            maxLength={6}
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New password"
          rules={[
            { required: true, message: 'Please enter new password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password
            placeholder="Enter your Password"
            className="reset-password-input"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Retype Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder="Retype your Password"
            className="reset-password-input"
          />
        </Form.Item>

        {errors.general && (
          <div className="error-message">
            <p className="error-text">{errors.general}</p>
          </div>
        )}

        <div className="reset-password-actions">
          <Button
            type="default"
            className="back-to-login-button"
            onClick={() => router.push('/login')}
          >
            Back to login
          </Button>
          
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            className="reset-password-button"
          >
            Reset password
          </Button>
        </div>
      </Form>

      <div className="reset-password-divider">
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

export default ResetPasswordForm;