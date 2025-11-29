'use client';

import React, { useState } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/react-query/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider component that wraps the application with TanStack Query
 * 
 * Note: In Next.js App Router, we need to create a new QueryClient for each request
 * to avoid sharing state between users. However, for client-side navigation,
 * we want to reuse the same QueryClient instance.
 * 
 * This implementation creates a singleton QueryClient that persists across
 * client-side navigations but is recreated for each server render.
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Create a QueryClient instance that persists across client-side navigations
  // but is recreated for each server render (important for SSR)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
};

