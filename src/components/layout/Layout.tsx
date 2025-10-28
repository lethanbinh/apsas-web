/**
 * Main layout component with role-based layout
 */

'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Layout as AntLayout } from 'antd';
import { Header } from './Header';
import { HeaderAdmin } from './HeaderAdmin';
import { Footer } from './Footer';
import LayoutAdmin from './LayoutAdmin';
import LayoutLecturer from './LayoutLecturer';
import LayoutHod from './LayoutHod';

const { Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role;
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isProfilePage = pathname === '/profile';

  // If profile page, use simple layout with role-specific header but no sidebar
  if (isProfilePage) {
    return (
      <AntLayout className="app-layout">
        {role === 0 ? (
          // Admin profile - use HeaderAdmin but no sidebar
          <>
            <HeaderAdmin />
            <Content className="app-content">
              {children}
            </Content>
          </>
        ) : (
          // Other roles - use standard Header
          <>
            <Header />
            <Content className="app-content">
              {children}
            </Content>
          </>
        )}
        <Footer />
      </AntLayout>
    );
  }

  // Return role-specific layout for other pages with sidebar
  if (role === 0) {
    // Admin
    return <LayoutAdmin>{children}</LayoutAdmin>;
  }

  if (role === 1) {
    // Lecturer
    return <LayoutLecturer>{children}</LayoutLecturer>;
  }

  if (role === 3) {
    // HOD
    return <LayoutHod>{children}</LayoutHod>;
  }

  // Default layout for Students and other roles
  return (
    <AntLayout className="app-layout">
      <Header />
      <Content className="app-content">
        {children}
      </Content>
      <Footer />
    </AntLayout>
  );
};
