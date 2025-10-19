/**
 * Authentication middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/reset-password',
    '/lecturer/detail-assignment',
    '/lecturer/assignment-grading',
    '/lecturer/dashboard', // Re-add dashboard route
    '/lecturer/grading-history', // Add grading history route
    '/lecturer/practical-exam', // Add practical exam route
    '/lecturer/tasks', // Add tasks route
    '/admin/dashboard', // Add admin dashboard route
    '/admin/manage-users', // Add admin manage users route
  ];
  // All routes under /lecturer/* are protected by default as they are not listed in publicRoutes.
  
  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check for authentication token in cookies
  const token = request.cookies.get('auth_token')?.value;
  
  // If no token and not on public route, redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)&', '/'],
};
