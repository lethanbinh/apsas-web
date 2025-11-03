/**
 * Navigation utilities
 */

import { ROUTES, ROLE_NAVIGATION, ROLES, type Role } from '@/lib/constants';

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
  
  // Role-based navigation
  getRoleNavigation: (role: Role) => {
    return ROLE_NAVIGATION[role] || [];
  },
  
  // Helper functions
  isActiveRoute: (currentPath: string, targetPath: string): boolean => {
    if (targetPath === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(targetPath);
  },
  
  // Check if user has access to a route
  hasRoleAccess: (userRole: Role, requiredRoles: Role[]): boolean => {
    return requiredRoles.includes(userRole);
  },
  
  // Breadcrumb generation
  generateBreadcrumbs: (pathname: string) => {
    type Breadcrumb = { label: string; href: string; isLast?: boolean };
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [{ label: 'Trang chủ', href: '/' }];
    
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
