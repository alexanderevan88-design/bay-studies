import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE = "bay_studies_admin";
const ADMIN_HEADER = "x-admin-secret";

/**
 * Soft-launch gate for /admin/* (except /admin/login).
 * ADMIN_SECRET unset/empty → allow through (local/dev).
 * When set: cookie, Bearer, X-Admin-Secret, or ?admin_secret= / ?secret=.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Login page always reachable
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET?.trim() ?? "";
  if (!secret) {
    // Open mode — pages show a clear "ADMIN_SECRET unset" warning via layout.
    return NextResponse.next();
  }

  const cookieVal = request.cookies.get(ADMIN_COOKIE)?.value ?? "";
  if (cookieVal === secret) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer === secret) {
    return NextResponse.next();
  }

  const header = request.headers.get(ADMIN_HEADER)?.trim();
  if (header === secret) {
    return NextResponse.next();
  }

  const adminSecret =
    request.nextUrl.searchParams.get("admin_secret")?.trim() ||
    request.nextUrl.searchParams.get("secret")?.trim();
  if (adminSecret === secret) {
    // Set cookie and strip secret from URL
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("admin_secret");
    clean.searchParams.delete("secret");
    const res = NextResponse.redirect(clean);
    res.cookies.set(ADMIN_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  login.searchParams.set(
    "next",
    pathname + (request.nextUrl.search || "")
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
