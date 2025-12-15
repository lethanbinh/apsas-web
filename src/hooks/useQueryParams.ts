'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { App } from 'antd';


export const useQueryParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (error === 'unauthorized' && errorMessage) {

      message.error(errorMessage);


      const newUrl = window.location.pathname;
      router.replace(newUrl);
    } else if (error === 'unauthorized') {

      message.error('Bạn không có quyền truy cập đường dẫn này');


      const newUrl = window.location.pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router, message]);
};

