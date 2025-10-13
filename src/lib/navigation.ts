/**
 * Navigation utilities
 */

import { ROUTES } from '@/lib/constants';

export const navigation = {
  // Public routes
  home: () => ROUTES.HOME,
  login: () => ROUTES.LOGIN,
  register: () => ROUTES.REGISTER,
  
  // Dashboard routes
  dashboard: () => ROUTES.DASHBOARD,
  profile: () => `${ROUTES.PROFILE}`,
  
  // Product routes
  products: () => '/products',
  productDetail: (id: string) => `/products/${id}`,
  
  // Helper functions
  isActiveRoute: (currentPath: string, targetPath: string): boolean => {
    if (targetPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(targetPath);
  },
  
  // Breadcrumb generation
  generateBreadcrumbs: (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Trang chủ', href: '/' }];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label,
        href: currentPath,
        isLast: index === segments.length - 1,
      });
    });
    
    return breadcrumbs;
  },
} as const;
