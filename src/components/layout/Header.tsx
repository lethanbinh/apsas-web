/**
 * Header component
 */

'use client';

import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Space } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
      onClick: () => router.push('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader className="app-header">
      <div className="header-content">
        <div className="header-logo">
          <h2>APSAS Web</h2>
        </div>

        <div className="header-actions">
          {isAuthenticated ? (
            <Space>
              <span>Xin chào, {user?.firstName}</span>
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
              >
                <Avatar
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  style={{ cursor: 'pointer' }}
                />
              </Dropdown>
            </Space>
          ) : (
            <Space>
              <Button
                type="default"
                onClick={() => router.push('/login')}
              >
                Đăng nhập
              </Button>
              <Button
                type="primary"
                onClick={() => router.push('/register')}
              >
                Đăng ký
              </Button>
            </Space>
          )}
        </div>
      </div>
    </AntHeader>
  );
};
