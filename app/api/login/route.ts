import { NextRequest, NextResponse } from "next/server";
import { loginRateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/get-client-ip";

const COOKIE_NAME = "session";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);

    const { success, limit, remaining, reset } =
      await loginRateLimit.limit(ip);

    if (!success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Troppi tentativi da questo IP. Attendi un minuto e riprova.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
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

    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    const appPassword =
      typeof process.env.APP_PASSWORD === "string"
        ? process.env.APP_PASSWORD.trim()
        : "";

  
    if (!appPassword) {
      return NextResponse.json(
        { ok: false, error: "Password applicativa non configurata." },
        { status: 500 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, error: "Password mancante o non valida." },
        { status: 400 }
      );
    }

    if (password !== appPassword) {
      return NextResponse.json(
        { ok: false, error: "Password non corretta." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(COOKIE_NAME, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    console.error("Errore nella route di login:", error);

    return NextResponse.json(
      { ok: false, error: "Errore interno del server." },
      { status: 500 }
    );
  }
}