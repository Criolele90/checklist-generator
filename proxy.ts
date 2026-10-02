import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api/");
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(session);

  // Non autenticato: entra solo nella login
  if (!isAuthenticated && !isLoginPage) {
    if (isApiRoute) {
      return NextResponse.json(
        { ok: false, error: "Sessione non valida o scaduta." },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticato: non tornare alla login
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/gestione-checklist",
    "/api/checklist/:path*",
    "/api/logout",
  ],
};
