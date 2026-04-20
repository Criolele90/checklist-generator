import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "audit_auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // percorsi pubblici
  const publicPaths = ["/login", "/api/login", "/logo.png", "/favicon.ico"];

  const isPublicPath =
    publicPaths.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/login");

  if (isPublicPath) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (authCookie === "ok") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};