/**
 * Login page
 */

import { Metadata } from 'next';
import { LoginForm } from '@/components/features/LoginForm';
import { Card, Space } from 'antd';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'Đăng nhập - APSAS Web',
  description: 'Đăng nhập vào tài khoản APSAS Web',
};

export default function LoginPage() {
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
                Đăng nhập để tiếp tục
              </p>
            </div>
            
            <LoginForm />
            
            <div className="text-center">
              <p>
                Chưa có tài khoản?{' '}
                <Link href="/register" className="auth-link">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </Space>
        </div>
      </div>
    </AuthGuard>
  );
}
