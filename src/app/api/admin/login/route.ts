import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  getAdminSecret,
  isAdminAuthConfigured,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST { secret } → set httpOnly admin cookie when it matches ADMIN_SECRET.
 * When ADMIN_SECRET is unset, returns ok with open:true (no cookie needed).
 */
export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({
      ok: true,
      open: true,
      message: "ADMIN_SECRET unset — admin is open (local/dev).",
    });
  }

  let body: { secret?: string } = {};
  try {
    body = (await request.json()) as { secret?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body with secret" },
      { status: 400 }
    );
  }

  const provided = body.secret?.trim() ?? "";
  const expected = getAdminSecret();
  if (!provided || provided !== expected) {
    return NextResponse.json(
      { ok: false, error: "Invalid admin secret" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true, open: false });
  res.cookies.set(ADMIN_COOKIE, expected, adminCookieOptions());
  return res;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: isAdminAuthConfigured(),
  });
}
