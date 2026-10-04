/**
 * Soft-launch admin gate for /admin/* pages and mutating APIs
 * (POST/PATCH/DELETE /api/published, POST /api/inbox/reparse).
 * Shared secret via ADMIN_SECRET env. Unset/empty → open (local/dev).
 */

export const ADMIN_COOKIE = "bay_studies_admin";
export const ADMIN_HEADER = "x-admin-secret";

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET?.trim() ?? "";
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(getAdminSecret());
}

/** True when secret is unset (local/dev open mode). */
export function isAdminOpenMode(): boolean {
  return !isAdminAuthConfigured();
}

export function verifyAdminSecretValue(provided: string | null | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret) return true;
  if (!provided) return false;
  return provided.trim() === secret;
}

/**
 * Check request for admin auth via cookie, Authorization Bearer,
 * X-Admin-Secret header, or ?admin_secret= / ?secret= query.
 */
export function verifyAdminRequest(request: Request): {
  ok: boolean;
  error?: string;
  via?: "cookie" | "bearer" | "header" | "query" | "open";
} {
  const secret = getAdminSecret();
  if (!secret) return { ok: true, via: "open" };

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  const cookieVal = cookieMatch
    ? decodeURIComponent(cookieMatch.slice(ADMIN_COOKIE.length + 1))
    : "";

  if (cookieVal && cookieVal === secret) {
    return { ok: true, via: "cookie" };
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer && bearer === secret) {
    return { ok: true, via: "bearer" };
  }

  const header = request.headers.get(ADMIN_HEADER)?.trim();
  if (header && header === secret) {
    return { ok: true, via: "header" };
  }

  const url = new URL(request.url);
  const query =
    url.searchParams.get("admin_secret")?.trim() ||
    url.searchParams.get("secret")?.trim();
  if (query && query === secret) {
    return { ok: true, via: "query" };
  }

  return {
    ok: false,
    error: "Unauthorized — invalid or missing admin secret",
  };
}

export function adminCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
