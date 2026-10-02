const COOKIE_NAME = "session";
const ADMIN_COOKIE_NAME = "admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET?.trim() || process.env.APP_PASSWORD?.trim();

  if (!secret) {
    throw new Error("APP_PASSWORD o APP_SESSION_SECRET non configurata.");
  }

  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return toBase64Url(signature);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function createScopedSessionToken(scope: "app" | "admin"): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = `${scope}:${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

async function verifyScopedSessionToken(
  token: string | undefined,
  expectedScope: "app" | "admin"
): Promise<boolean> {
  if (!token) return false;

  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return false;

  const [scope, expiresAtRaw, payloadExtra] = payload.split(":");
  if (scope !== expectedScope || !expiresAtRaw || payloadExtra) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  try {
    const expectedSignature = await sign(payload);
    return constantTimeEqual(suppliedSignature, expectedSignature);
  } catch {
    return false;
  }
}

export function createSessionToken(): Promise<string> {
  return createScopedSessionToken("app");
}

export function createAdminSessionToken(): Promise<string> {
  return createScopedSessionToken("admin");
}

export function verifySessionToken(token?: string): Promise<boolean> {
  return verifyScopedSessionToken(token, "app");
}

export function verifyAdminSessionToken(token?: string): Promise<boolean> {
  return verifyScopedSessionToken(token, "admin");
}

export function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const requestHost = forwardedHost || request.headers.get("host");
    return Boolean(requestHost) && originUrl.host === requestHost;
  } catch {
    return false;
  }
}

export { ADMIN_COOKIE_NAME, COOKIE_NAME, SESSION_DURATION_SECONDS };
