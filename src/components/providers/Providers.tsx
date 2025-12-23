'use client';
import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntdApp } from 'antd';
import { store } from '@/store/store';
import { QueryProvider } from './QueryProvider';
interface ProvidersProps {
  children: React.ReactNode;
}
export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryProvider>
      <Provider store={store}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
          }}
        >
          <AntdApp>
            {children}
          </AntdApp>
        </ConfigProvider>
      </Provider>
    </QueryProvider>
  );
};