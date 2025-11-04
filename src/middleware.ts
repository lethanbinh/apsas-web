import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/", "/login", "/reset-password", "/pe"];

  const roleRoutes = {
    0: ["/admin/dashboard", "/admin/manage-users"], // Admin
    1: ["/lecturer"], // Lecturer - can access all /lecturer/* routes
    2: ["/student"], // Student - can access all /student/* routes
    3: ["/hod/semester-plans", "/hod/approval"], // HOD
  };

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)&", "/"],
};
