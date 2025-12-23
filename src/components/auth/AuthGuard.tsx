'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spin } from 'antd';
import { NoSSR } from '@/components/NoSSR';
import { getStorageItem } from '@/lib/utils/storage';
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
    const token = getStorageItem('auth_token');
    if (!isLoading) {
      if (requireAuth) {
        if (!token) {
          router.replace('/login');
          return;
        }
        if (!isAuthenticated) {
          router.replace('/login');
          return;
        }
      } else if (!requireAuth && isAuthenticated) {
        const roleRedirects: { [key: number]: string } = {
          0: "/admin/manage-users",
          1: "/classes/my-classes/lecturer",
          2: "/classes/my-classes/student",
          3: "/hod/semester-plans",
          4: "/examiner/grading-groups",
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
    return null;
  }
  if (!requireAuth && isAuthenticated) {
    return null;
  }
  return <>{children}</>;
};