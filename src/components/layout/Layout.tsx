/**
 * Main layout component
 */

'use client';

import React from 'react';
import { Layout as AntLayout } from 'antd';
import { Header } from './Header';
import { Footer } from './Footer';

const { Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
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
