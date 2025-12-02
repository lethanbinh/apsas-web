import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Helper function to decode JWT token (works in Edge runtime)
function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    
    // Simple base64 decode using atob (available in Edge runtime)
    // Handle padding
    let padded = base64;
    while (padded.length % 4) {
      padded += "=";
    }
    
    try {
      const binaryString = atob(padded);
      // Convert binary string to JSON
      const jsonPayload = decodeURIComponent(
        binaryString
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (decodeError) {
      // Fallback: try direct parsing if atob fails
      return null;
    }
  } catch (error) {
    // Silent fail - return null if decode fails
    return null;
  }
}

// Map role string/number to role number
function mapRoleToNumber(role: string | number): number {
  if (typeof role === "number") {
    return role;
  }
  const roleLower = String(role).toLowerCase();
  if (roleLower === "admin") return 0;
  if (roleLower === "lecturer") return 1;
  if (roleLower === "student") return 2;
  if (roleLower === "hod") return 3;
  if (roleLower === "examiner") return 4;
  return 2; // Default to Student
}

// Get user role from token
function getUserRole(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }
  return mapRoleToNumber(decoded.role || decoded.Role || 2);
}

// Check if user role has access to the pathname
function hasAccess(pathname: string, userRole: number, allowedPaths: string[]): boolean {
  // Role identifiers mapping
  const roleIdentifiers: Record<number, string> = {
    0: "admin",
    1: "lecturer",
    2: "student",
    3: "hod",
    4: "examiner",
  };
  
  // Get current user's role identifier
  const userRoleIdentifier = roleIdentifiers[userRole];
  if (!userRoleIdentifier) {
    return false; // Unknown role
  }
  
  // Split pathname into segments
  const pathSegments = pathname.split("/").filter(Boolean);
  
  // Check if pathname contains another role's identifier
  for (const [roleNum, identifier] of Object.entries(roleIdentifiers)) {
    const otherRole = Number(roleNum);
    if (otherRole === userRole) continue; // Skip own role
    
    // Check if pathname starts with another role's route (e.g., /admin, /lecturer)
    if (pathname.startsWith(`/${identifier}`)) {
      return false; // Deny access to other role's main routes
    }
    
    // Check if pathname contains another role's identifier as a segment
    // (e.g., /classes/my-classes/lecturer for a student user)
    if (pathSegments.includes(identifier)) {
      return false; // Deny access if path contains another role's identifier
    }
  }
  
  // Check if pathname is in allowed paths for this role
  return allowedPaths.some((path) => {
    // Exact match
    if (pathname === path) return true;
    // Prefix match (for nested routes)
    if (pathname.startsWith(path + "/")) return true;
    // Also check if path is a prefix (e.g., /lecturer matches /lecturer/tasks)
    if (pathname.startsWith(path) && (pathname.length === path.length || pathname[path.length] === "/")) {
      return true;
    }
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PRIORITY 1: Handle login and register routes FIRST
  // These routes should ALWAYS be accessible
  if (pathname === "/login" || pathname === "/register") {
    // Always allow access to login/register pages
    // Even if user has token, let them access login (they might want to switch accounts)
    // The login page itself will handle redirecting authenticated users if needed
    return NextResponse.next();
  }

  // Get token from cookie for other routes
  const token = request.cookies.get("auth_token")?.value;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/reset-password",
    "/pe", // PE (Practical Exam) routes are public
  ];

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === route;
    }
    return pathname === route || pathname.startsWith(route + "/");
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from token
  const userRole = getUserRole(token);

  if (userRole === null) {
    // Invalid token, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_token");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth_token");
    return response;
  }

  // Redirect generic routes to role-specific routes
  const roleIdentifiers: Record<number, string> = {
    0: "admin",
    1: "lecturer",
    2: "student",
    3: "hod",
    4: "examiner",
  };
  
  const userRoleIdentifier = roleIdentifiers[userRole];
  
  // Redirect /classes to /classes/my-classes/{role}
  if (pathname === "/classes") {
    return NextResponse.redirect(new URL(`/classes/my-classes/${userRoleIdentifier}`, request.url));
  }
  
  // Redirect /home to /home/{role}
  if (pathname === "/home") {
    return NextResponse.redirect(new URL(`/home/${userRoleIdentifier}`, request.url));
  }

  // Define allowed route prefixes for each role
  // Routes are checked in order, so more specific routes should come first
  const roleRoutes: Record<number, string[]> = {
    0: [
      // Admin routes - only admin can access
      "/admin",
      "/profile",
      "/dashboard",
    ],
    1: [
      // Lecturer routes - only lecturer can access
      "/lecturer",
      "/classes/my-classes/lecturer",
      "/home/lecturer",
      "/profile",
      "/dashboard",
    ],
    2: [
      // Student routes - only student can access
      "/student",
      "/classes/my-classes/student",
      "/home/student",
      "/profile",
      "/dashboard",
    ],
    3: [
      // HOD routes - only HOD can access
      "/hod",
      "/profile",
      "/dashboard",
    ],
    4: [
      // Examiner routes - only Examiner can access
      "/examiner",
      "/profile",
      "/dashboard",
    ],
  };

  // Get allowed routes for user's role
  const allowedRoutes = roleRoutes[userRole] || [];

  // Check if user has access to the current route
  const hasRouteAccess = hasAccess(pathname, userRole, allowedRoutes);

  // If user doesn't have access, redirect to their default route (home page)
  // This is better UX than redirecting to login since user is already authenticated
  // User might have clicked a wrong link or typed wrong URL
  if (!hasRouteAccess) {
    const defaultRoute = getDefaultRouteForRole(userRole, request.url);
    // Add error message as query param to show notification on the home page
    defaultRoute.searchParams.set("error", "unauthorized");
    defaultRoute.searchParams.set("message", "Bạn không có quyền truy cập đường dẫn này");
    return NextResponse.redirect(defaultRoute);
  }

  return NextResponse.next();
}

// Get default route for a role
function getDefaultRouteForRole(role: number, baseUrl: string): URL {
  const defaultRoutes: Record<number, string> = {
    0: "/admin/manage-users", // Admin
    1: "/classes/my-classes/lecturer", // Lecturer
    2: "/classes/my-classes/student", // Student
    3: "/hod/semester-plans", // HOD
    4: "/examiner/grading-groups", // Examiner
  };

  const defaultRoute = defaultRoutes[role] || "/classes/my-classes/student";
  return new URL(defaultRoute, baseUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};