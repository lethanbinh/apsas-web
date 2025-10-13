/**
 * Login form component
 */

'use client';

import React, { useState } from 'react';
import { Form, Card, Typography, Space, Input } from 'antd';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { LoginCredentials } from '@/types';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

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

  return (
    <Card className="login-form">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className="text-center">
          <Title level={2}>Đăng nhập</Title>
          <Text type="secondary">Chào mừng bạn quay trở lại</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="Nhập email của bạn" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu của bạn" />
          </Form.Item>

          {errors.general && (
            <div className="error-message">
              <Text type="danger">{errors.general}</Text>
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
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </Card>
  );
};
