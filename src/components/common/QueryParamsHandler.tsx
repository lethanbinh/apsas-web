'use client';

import { Suspense } from 'react';
import { useQueryParams } from '@/hooks/useQueryParams';

/**
 * Internal component that uses useSearchParams
 * Must be wrapped in Suspense boundary
 */
const QueryParamsHandlerContent = () => {
  useQueryParams();
  return null; // This component doesn't render anything
};

/**
 * Client component to handle query params and show notifications
 * Use this component in pages that need to display error messages from middleware redirects
 * Wrapped in Suspense boundary to satisfy Next.js requirements for useSearchParams
 */
export const QueryParamsHandler = () => {
  return (
    <Suspense fallback={null}>
      <QueryParamsHandlerContent />
    </Suspense>
  );
};

