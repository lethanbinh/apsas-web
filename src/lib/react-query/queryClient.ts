import { QueryClient } from '@tanstack/react-query';

/**
 * Default query client configuration
 * Customize these options based on your application needs
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      // Time in milliseconds after data is considered stale
      staleTime: 1000 * 60 * 5, // 5 minutes
      
      // Time in milliseconds that unused/inactive cache data remains in memory
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      
      // Automatically refetch on window focus
      refetchOnWindowFocus: false,
      
      // Automatically refetch on reconnect
      refetchOnReconnect: true,
      
      // Retry failed requests
      retry: 1,
      
      // Retry delay in milliseconds
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      
      // Retry delay in milliseconds
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
};

/**
 * Create a new QueryClient instance
 * This should be created once and reused across the application
 */
export const createQueryClient = () => {
  return new QueryClient(queryClientConfig);
};

