/**
 * Sidebar component for dashboard
 */

'use client';

import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const { Sider } = Layout;

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/dashboard/profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
    },
    {
      key: '/dashboard/settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <Sider 
      width={250} 
      style={{ 
        background: '#fff',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          APSAS Web
        </Typography.Title>
      </div>
      
      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none' }}
      />
      
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        width: '100%',
        borderTop: '1px solid #f0f0f0'
      }}>
        <Menu
          mode="inline"
          items={[
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Đăng xuất',
              onClick: handleLogout,
            }
          ]}
          style={{ border: 'none' }}
        />
      </div>
    </Sider>
  );
};
