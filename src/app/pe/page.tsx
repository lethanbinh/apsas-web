"use client";

import { PEALoginForm } from '@/components/features/PEALoginForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function PEPage() {
  return (
    <AuthGuard requireAuth={false}>
      <div className="pea-login-page">
        <PEALoginForm />
      </div>
    </AuthGuard>
  );
}

