import { NextRequest } from "next/server";

export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");

  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("x-real-ip");

  if (xRealIp) {
    return xRealIp.trim();
  }

  return "unknown";
}