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
      <div className="reset-password-page">
        <div className="reset-password-container">
          {/* Left side - Illustration */}
          <div className="reset-password-illustration">
            <div className="illustration-wrapper">
              <Image
                src="https://cdn-res.keymedia.com/cdn-cgi/image/f=auto/https://cdn-res.keymedia.com/cms/images/us/036/0308_638042050063908337.jpg"
                alt="Reset password illustration"
                width={700}
                height={600}
                className="illustration-image"
                priority
              />
            </div>
          </div>
          
          {/* Right side - Reset Password Form */}
          <div className="reset-password-form-section">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
