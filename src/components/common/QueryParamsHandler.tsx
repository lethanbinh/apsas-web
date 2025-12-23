'use client';
import { Suspense } from 'react';
import { useQueryParams } from '@/hooks/useQueryParams';
const QueryParamsHandlerContent = () => {
  useQueryParams();
  return null;
};
export const QueryParamsHandler = () => {
  return (
    <Suspense fallback={null}>
      <QueryParamsHandlerContent />
    </Suspense>
  );
};