import { QueryClient } from '@tanstack/react-query';


export const queryClientConfig = {
  defaultOptions: {
    queries: {

      staleTime: 1000 * 60 * 5,


      gcTime: 1000 * 60 * 30,


      refetchOnWindowFocus: false,


      refetchOnReconnect: true,


      retry: 1,


      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {

      retry: 1,


      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
};


export const createQueryClient = () => {
  return new QueryClient(queryClientConfig);
};

