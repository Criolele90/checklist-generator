import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  hasValidOrigin,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth";
import { getClientIp } from "@/lib/get-client-ip";
import { limitLogin } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    if (!hasValidOrigin(request)) {
      return NextResponse.json(
        { ok: false, error: "Origine della richiesta non valida." },
        { status: 403 }
      );
    }

    const rateLimit = await limitLogin(`admin:${getClientIp(request.headers)}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { ok: false, error: "Troppi tentativi. Attendi un minuto e riprova." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))
            ),
          },
        }
      );
    }

    let body: { password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Corpo della richiesta non valido." },
        { status: 400 }
      );
    }

    const password = typeof body.password === "string" ? body.password : "";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "";

    if (!adminPassword) {
      return NextResponse.json(
        { ok: false, error: "Password amministratore non configurata." },
        { status: 500 }
      );
    }

    const suppliedPassword = Buffer.from(password);
    const expectedPassword = Buffer.from(adminPassword);
    const matches =
      suppliedPassword.length === expectedPassword.length &&
      timingSafeEqual(suppliedPassword, expectedPassword);

    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "Password amministratore non corretta." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, await createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Errore nella route di accesso amministratore:", error);
    return NextResponse.json(
      { ok: false, error: "Errore interno del server." },
      { status: 500 }
    );
  }
}
