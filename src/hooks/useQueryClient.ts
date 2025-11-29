'use client';

import { useQueryClient as useTanStackQueryClient } from '@tanstack/react-query';

/**
 * Custom hook to access the QueryClient instance
 * 
 * This is a simple wrapper around TanStack Query's useQueryClient hook
 * that provides better TypeScript support and consistency.
 * 
 * Usage:
 *   const queryClient = useQueryClient();
 *   queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
 */
export const useQueryClient = () => {
  return useTanStackQueryClient();
};

