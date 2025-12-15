'use client';

import { useQueryClient as useTanStackQueryClient } from '@tanstack/react-query';


export const useQueryClient = () => {
  return useTanStackQueryClient();
};

