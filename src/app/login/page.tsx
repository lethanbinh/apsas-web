/**
 * Login page
 */

import { Metadata } from 'next';
import { LoginForm } from '@/components/features/LoginForm';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Đăng nhập - APSAS Web',
  description: 'Đăng nhập vào tài khoản APSAS Web',
};

export default function LoginPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="login-page">
        <div className="login-container">
          {/* Left side - Illustration */}
          <div className="login-illustration">
            <div className="illustration-wrapper">
              <Image
                src="https://cdn-res.keymedia.com/cdn-cgi/image/f=auto/https://cdn-res.keymedia.com/cms/images/us/036/0308_638042050063908337.jpg"
                alt="Learning illustration"
                width={700}
                height={600}
                className="illustration-image"
                priority
                unoptimized
              />
            </div>
          </div>
          
          {/* Right side - Login Form */}
          <div className="login-form-section">
            <LoginForm />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
