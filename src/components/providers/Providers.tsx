/**
 * App providers wrapper
 */

'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import { store } from '@/store/store';

// Ant Design v5 patch for React 19 compatibility
// Note: This is a warning, not an error. Ant Design v5 works with React 19 but shows compatibility warning.
// To suppress the warning, you can install: npm install @ant-design/v5-patch-for-react-19
// For now, we're leaving it commented as the warning doesn't affect functionality
// import '@ant-design/v5-patch-for-react-19';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </Provider>
  );
};
