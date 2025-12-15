import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }


    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");



    let padded = base64;
    while (padded.length % 4) {
      padded += "=";
    }

    try {
      const binaryString = atob(padded);

      const jsonPayload = decodeURIComponent(
        binaryString
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (decodeError) {

      return null;
    }
  } catch (error) {

    return null;
  }
}


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
  return 2;
}


function getUserRole(token: string): number | null {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }
  return mapRoleToNumber(decoded.role || decoded.Role || 2);
}


function hasAccess(pathname: string, userRole: number, allowedPaths: string[]): boolean {

  const roleIdentifiers: Record<number, string> = {
    0: "admin",
    1: "lecturer",
    2: "student",
    3: "hod",
    4: "examiner",
  };


  const userRoleIdentifier = roleIdentifiers[userRole];
  if (!userRoleIdentifier) {
    return false;
  }


  const pathSegments = pathname.split("/").filter(Boolean);


  for (const [roleNum, identifier] of Object.entries(roleIdentifiers)) {
    const otherRole = Number(roleNum);
    if (otherRole === userRole) continue;


    if (pathname.startsWith(`/${identifier}`)) {
      return false;
    }



    if (pathSegments.includes(identifier)) {
      return false;
    }
  }


  return allowedPaths.some((path) => {

    if (pathname === path) return true;

    if (pathname.startsWith(path + "/")) return true;

    if (pathname.startsWith(path) && (pathname.length === path.length || pathname[path.length] === "/")) {
      return true;
    }
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;



  if (pathname === "/login" || pathname === "/register") {



    return NextResponse.next();
  }


  const token = request.cookies.get("auth_token")?.value;


  const publicRoutes = [
    "/",
    "/reset-password",
    "/pe",
  ];


  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === route;
    }
    return pathname === route || pathname.startsWith(route + "/");
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }


  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }


  const userRole = getUserRole(token);

  if (userRole === null) {

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_token");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("auth_token");
    return response;
  }


  const roleIdentifiers: Record<number, string> = {
    0: "admin",
    1: "lecturer",
    2: "student",
    3: "hod",
    4: "examiner",
  };

  const userRoleIdentifier = roleIdentifiers[userRole];


  if (pathname === "/classes") {
    return NextResponse.redirect(new URL(`/classes/my-classes/${userRoleIdentifier}`, request.url));
  }



  const roleRoutes: Record<number, string[]> = {
    0: [

      "/admin",
      "/profile",
    ],
    1: [

      "/lecturer",
      "/classes/my-classes/lecturer",
      "/profile",
    ],
    2: [

      "/student",
      "/classes/my-classes/student",
      "/profile",
    ],
    3: [

      "/hod",
      "/profile",
    ],
    4: [

      "/examiner",
      "/profile",
    ],
  };


  const allowedRoutes = roleRoutes[userRole] || [];


  const hasRouteAccess = hasAccess(pathname, userRole, allowedRoutes);




  if (!hasRouteAccess) {
    const defaultRoute = getDefaultRouteForRole(userRole, request.url);

    defaultRoute.searchParams.set("error", "unauthorized");
    defaultRoute.searchParams.set("message", "Bạn không có quyền truy cập đường dẫn này");
    return NextResponse.redirect(defaultRoute);
  }

  return NextResponse.next();
}


function getDefaultRouteForRole(role: number, baseUrl: string): URL {
  const defaultRoutes: Record<number, string> = {
    0: "/admin/manage-users",
    1: "/classes/my-classes/lecturer",
    2: "/classes/my-classes/student",
    3: "/hod/semester-plans",
    4: "/examiner/grading-groups",
  };

  const defaultRoute = defaultRoutes[role] || "/classes/my-classes/student";
  return new URL(defaultRoute, baseUrl);
}

export const config = {
  matcher: [

    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};