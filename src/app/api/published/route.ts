import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  patchPublished,
  publishedPath,
  readPublished,
  removePublished,
  upsertPublished,
} from "@/lib/publishedStore";
import type { Study } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Edge cache for anonymous friend traffic. Admin sends no-cache and skips this. */
const PUBLIC_CACHE = "public, s-maxage=45, stale-while-revalidate=30";

function requestWantsFresh(request: Request): boolean {
  const cacheControl = request.headers.get("cache-control") ?? "";
  const pragma = request.headers.get("pragma") ?? "";
  return /no-cache|no-store/i.test(cacheControl) || /no-cache/i.test(pragma);
}

function publicCacheHeaders(): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", PUBLIC_CACHE);
  // Honored by the Vercel CDN even when the browser does not store the JSON.
  headers.set("CDN-Cache-Control", PUBLIC_CACHE);
  headers.set("Vercel-CDN-Cache-Control", PUBLIC_CACHE);
  return headers;
}

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Server-side published studies (Approve → feed).
 * Survives browser localStorage clears. Same Blob/tmp/file pattern as inbox.
 *
 * GET  → public { ok, studies, count, path }
 * POST / PATCH / DELETE → require ADMIN_SECRET (cookie / Bearer / X-Admin-Secret / query)
 *   when configured; open when unset (local/dev).
 */
function unauthorized(auth: ReturnType<typeof verifyAdminRequest>) {
  return NextResponse.json(
    { ok: false, error: auth.error ?? "Unauthorized" },
    { status: 401, headers: PRIVATE_NO_STORE }
  );
}

export async function GET(request: Request) {
  const fresh = requestWantsFresh(request);
  try {
    const studies = await readPublished({ fresh });
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        studies,
        path: publishedPath(),
      },
      { headers: fresh ? PRIVATE_NO_STORE : publicCacheHeaders() }
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to read published studies";
    return NextResponse.json(
      { ok: false, count: 0, studies: [], error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) return unauthorized(auth);

  try {
    const body = (await request.json()) as { study?: Study };
    if (!body?.study || typeof body.study !== "object" || !body.study.id) {
      return NextResponse.json(
        { ok: false, error: "Body must include study with id" },
        { status: 400, headers: PRIVATE_NO_STORE }
      );
    }
    const studies = await upsertPublished(body.study);
    return NextResponse.json(
      {
        ok: true,
        study: body.study,
        count: studies.length,
        studies,
        path: publishedPath(),
      },
      { headers: PRIVATE_NO_STORE }
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to upsert published study";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) return unauthorized(auth);

  try {
    const body = (await request.json()) as {
      id?: string;
      patch?: Partial<Study>;
    };
    if (!body?.id || !body.patch || typeof body.patch !== "object") {
      return NextResponse.json(
        { ok: false, error: "Body must include id and patch" },
        { status: 400, headers: PRIVATE_NO_STORE }
      );
    }
    const studies = await patchPublished(body.id, body.patch);
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        studies,
        path: publishedPath(),
      },
      { headers: PRIVATE_NO_STORE }
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to patch published study";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) return unauthorized(auth);

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Query id is required" },
        { status: 400, headers: PRIVATE_NO_STORE }
      );
    }
    const studies = await removePublished(id);
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        studies,
        path: publishedPath(),
      },
      { headers: PRIVATE_NO_STORE }
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to remove published study";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}
