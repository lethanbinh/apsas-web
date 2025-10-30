/**
 * Authentication middleware
 */

import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

export function middleware(request: NextRequest) {
    const {pathname} = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = [
        '/',
        '/login',
        '/reset-password',
    ];

    // Role-based route access mapping
    const roleRoutes = {
        0: ['/admin/dashboard', '/admin/manage-users'], // Admin
        1: ['/lecturer'], // Lecturer - can access all /lecturer/* routes
        2: ['/student'], // Student - can access all /student/* routes
        3: ['/hod/semester-plans', '/hod/approval'], // HOD
    };

    // Check if current path is a public route
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

    // If it's a public route, allow access
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for authentication token
    const token = request.cookies.get('auth_token')?.value;

    // If no token and trying to access protected route, redirect to login
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // If user is authenticated and trying to access login/register, redirect based on role
    if (token && (pathname === '/login' || pathname === '/register')) {
        // Get user role from localStorage (middleware runs on server, so we can't access localStorage directly)
        // We'll handle redirect in LoginForm component instead
        return NextResponse.redirect(new URL('/home', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)&', '/'],
};
