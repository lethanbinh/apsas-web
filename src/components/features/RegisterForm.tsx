/**
 * Register form component
 */

'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, Space } from 'antd';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';

export const RegisterForm: React.FC = () => {
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (values: any) => {
    try {
      setErrors({});
      await register(values);
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'Registration failed';
      setErrors({ general: errorMessage });
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="auth-page">
        <div className="auth-container">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="text-center">
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                APSAS Web
              </h1>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                Tạo tài khoản mới
              </p>
            </div>
            
            <Card>
              <Form
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
              >
                <Form.Item
                  name="firstName"
                  label="Họ"
                  rules={[{ required: true, message: 'Vui lòng nhập họ' }]}
                >
                  <Input placeholder="Nhập họ của bạn" />
                </Form.Item>

                <Form.Item
                  name="lastName"
                  label="Tên"
                  rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                  <Input placeholder="Nhập tên của bạn" />
                </Form.Item>

                <Form.Item
                  name="username"
                  label="Tên đăng nhập"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                    { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                  ]}
                >
                  <Input placeholder="Nhập tên đăng nhập" />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' }
                  ]}
                >
                  <Input placeholder="Nhập email của bạn" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu' },
                    { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }
                  ]}
                >
                  <Input.Password placeholder="Nhập mật khẩu" />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Nhập lại mật khẩu" />
                </Form.Item>

                {errors.general && (
                  <div className="error-message">
                    <p style={{ color: 'red' }}>{errors.general}</p>
                  </div>
                )}

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isLoading}
                    size="large"
                    style={{ width: '100%' }}
                  >
                    Đăng ký
                  </Button>
                </Form.Item>
              </Form>
            </Card>
            
            <div className="text-center">
              <p>
                Đã có tài khoản?{' '}
                <Link href="/login" className="auth-link">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </Space>
        </div>
      </div>
    </AuthGuard>
  );
};
