'use client';

import { useQueryParams } from '@/hooks/useQueryParams';

/**
 * Client component to handle query params and show notifications
 * Use this component in pages that need to display error messages from middleware redirects
 */
export const QueryParamsHandler = () => {
  useQueryParams();
  return null; // This component doesn't render anything
};

