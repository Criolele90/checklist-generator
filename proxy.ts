import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  COOKIE_NAME,
  verifyAdminSessionToken,
  verifySessionToken,
} from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isAdminLoginPage = pathname === "/admin-login";
  const isAdminPage = pathname === "/gestione-checklist";
  const isAdminApi = pathname === "/api/checklist/download";
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

  const adminSession = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAdminAuthenticated = await verifyAdminSessionToken(adminSession);

  if (isAdminAuthenticated && isAdminLoginPage) {
    return NextResponse.redirect(new URL("/gestione-checklist", request.url));
  }

  if (!isAdminAuthenticated && isAdminPage) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }

  if (!isAdminAuthenticated && isAdminApi) {
    return NextResponse.json(
      { ok: false, error: "Autorizzazione amministratore richiesta." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin-login",
    "/gestione-checklist",
    "/api/admin-login",
    "/api/checklist/:path*",
    "/api/logout",
  ],
};
