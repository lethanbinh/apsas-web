'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { App } from 'antd';

/**
 * Hook to handle query params and show notifications
 * Used for displaying error messages from middleware redirects
 */
export const useQueryParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (error === 'unauthorized' && errorMessage) {
      // Show error message as toast
      message.error(errorMessage);
      
      // Clean up URL by removing query params
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    } else if (error === 'unauthorized') {
      // Default message if no custom message provided
      message.error('Bạn không có quyền truy cập đường dẫn này');
      
      // Clean up URL
      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router, message]);
};

