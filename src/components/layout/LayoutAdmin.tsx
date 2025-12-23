'use client';
import React from 'react';
import { Layout as AntLayout } from 'antd';
import { HeaderAdmin } from './HeaderAdmin';
import SidebarAdmin from './SidebarAdmin';
import { Footer } from './Footer';
import { SidebarProvider } from './SidebarContext';
const { Content } = AntLayout;
interface LayoutAdminProps {
  children: React.ReactNode;
}
const LayoutAdmin: React.FC<LayoutAdminProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <AntLayout className="app-layout">
        <HeaderAdmin />
        <AntLayout
          className="sticky-container"
          style={{
            overflow: "visible !important",
          }}
        >
          <SidebarAdmin />
          <Content className="app-content">{children}</Content>
        </AntLayout>
      <Footer />
      </AntLayout>
    </SidebarProvider>
  );
};
export default LayoutAdmin;