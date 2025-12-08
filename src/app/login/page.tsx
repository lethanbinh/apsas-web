import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoginForm } from '@/components/features/LoginForm';
import { Metadata } from 'next';
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
          {/* Left side - Login Form */}
          <div className="login-form-section">
            <LoginForm />
          </div>
          
          {/* Right side - Illustration */}
          <div className="login-illustration">
            <div className="illustration-wrapper">
              <Image
                src="/images/login-illustration.png"
                alt="Learning illustration"
                width={800}
                height={800}
                className="illustration-image"
              />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
