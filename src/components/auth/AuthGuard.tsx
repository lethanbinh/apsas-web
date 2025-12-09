'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spin } from 'antd';
import { NoSSR } from '@/components/NoSSR';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  return (
    <NoSSR fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    }>
      <AuthGuardContent requireAuth={requireAuth}>
        {children}
      </AuthGuardContent>
    </NoSSR>
  );
};

const AuthGuardContent: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push('/login');
      } else if (!requireAuth && isAuthenticated) {
        // Redirect based on user role
        const roleRedirects: { [key: number]: string } = {
          0: "/admin/manage-users", // Admin
          1: "/classes/my-classes/lecturer", // Lecturer
          2: "/classes/my-classes/student", // Student
          3: "/hod/semester-plans", // HOD
          4: "/examiner/grading-groups", // Examiner
        };
        const userRole = user?.role as number;
        const redirectPath = roleRedirects[userRole] || "/classes/my-classes/student";
        router.push(redirectPath);
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, router, user?.role]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect to login
  }

  if (!requireAuth && isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return <>{children}</>;
};