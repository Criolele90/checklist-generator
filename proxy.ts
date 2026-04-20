import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isProtectedRoute = pathname === "/";
  const session = request.cookies.get("session")?.value;

  // Non autenticato: entra solo nella login
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticato: non tornare alla login
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};