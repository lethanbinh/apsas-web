/**
 * Reset Password page
 */

import { Metadata } from 'next';
import ResetPasswordForm from '@/components/features/ResetPasswordForm';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Reset Password - APSAS Web',
  description: 'Reset your password on APSAS Web',
};

export default function ResetPasswordPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="reset-password-main-container">
        <div className="reset-password-content-wrapper">
          {/* Left side - Reset Password Form */}
          <div className="reset-password-form-section">
            <ResetPasswordForm />
          </div>
          {/* Right side - Illustration */}
          <div className="reset-password-illustration-section">
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
      </div>
    </AuthGuard>
  );
}
