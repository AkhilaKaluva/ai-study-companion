import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "study_session";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX64_REGEX = /^[0-9a-f]{64}$/i;

function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  return UUID_REGEX.test(trimmed) || HEX64_REGEX.test(trimmed);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSessionFormat = isValidSessionToken(sessionCookie);

  if (pathname === "/login" || pathname === "/signup") {
    if (hasValidSessionFormat) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/spaces" ||
    pathname.startsWith("/spaces/") ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/") ||
    pathname === "/project" ||
    pathname.startsWith("/project/") ||
    pathname === "/tutor" ||
    pathname.startsWith("/tutor/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isProtected) {
    if (!hasValidSessionFormat) {
      let redirectPath = pathname + search;
      if (redirectPath.startsWith("//")) {
        redirectPath = "/" + redirectPath.replace(/^\/+/, "");
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", redirectPath);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/spaces",
    "/spaces/:path*",
    "/projects",
    "/projects/:path*",
    "/project",
    "/project/:path*",
    "/tutor",
    "/tutor/:path*",
    "/settings",
    "/settings/:path*",
    "/admin",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
