import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  patchPublished,
  publishedStoreMeta,
  readPublishedDetailed,
  removePublished,
  upsertPublished,
} from "@/lib/publishedStore";
import type { Study } from "@/lib/types";
import { splitByExpiry, studyExpiry, toClosedStub } from "@/lib/expiry";

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
 * Cache layers: instance memory (45s) → Vercel CDN (s-maxage=45) → Blob CDN
 * (1d) → file / bundled published-fallback.json with 5m backoff when Blob is
 * suspended. See docs/DEPLOY.md § Published feed cache.
 *
 * GET  → public { ok, studies (live only), count, liveCount, closedCount, closed[] stubs, path, source, blobStatus }
 *        ?include=closed → studies includes date-expired ones too (docs/EXPIRY.md)
 * POST / PATCH / DELETE → require ADMIN_SECRET (cookie / Bearer / X-Admin-Secret / query)
 *   when configured; open when unset (local/dev).
 */
function unauthorized(auth: ReturnType<typeof verifyAdminRequest>) {
  return NextResponse.json(
    { ok: false, error: auth.error ?? "Unauthorized" },
    { status: 401, headers: PRIVATE_NO_STORE }
  );
}

function storeFields() {
  const meta = publishedStoreMeta();
  return {
    path: meta.path,
    source: meta.source,
    blobStatus: meta.blobStatus,
    ...(meta.blobError ? { blobError: meta.blobError } : {}),
  };
}

export async function GET(request: Request) {
  const fresh = requestWantsFresh(request);
  try {
    const { studies: all, source } = await readPublishedDetailed({ fresh });
    const meta = publishedStoreMeta();
    // Date-based expiry happens here at read time (nothing is deleted).
    // ?include=closed (admin ingest, import scripts) returns every study.
    const includeClosed = new URL(request.url).searchParams.get("include") === "closed";
    const { live, closed } = splitByExpiry(all);
    const studies = includeClosed ? all : live;
    // Kept beside (not inside) the studies so admin re-saves never persist it.
    const expiry: Record<string, { closesAt: string | null; basis: string; guessed: boolean }> = {};
    for (const s of studies) {
      const e = studyExpiry(s);
      expiry[s.id] = {
        closesAt: e.closesAt != null ? new Date(e.closesAt).toISOString() : null,
        basis: e.basis,
        guessed: e.guessed,
      };
    }
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        liveCount: live.length,
        closedCount: closed.length,
        closed: closed.map(toClosedStub),
        studies,
        expiry,
        path: meta.path,
        source,
        blobStatus: meta.blobStatus,
        ...(meta.blobError ? { blobError: meta.blobError } : {}),
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
    // upsert already wrote; re-read meta after writePublished inside upsert.
    // Force a no-op write meta surface by reading publishedStoreMeta after.
    const meta = storeFields();
    const warning =
      meta.blobStatus === "suspended"
        ? "Blob store suspended — saved to file/fallback. Unsuspend or upgrade Blob in Vercel Storage so Approve survives cold starts without a redeploy."
        : meta.blobStatus === "error"
          ? "Blob write failed — saved to file/fallback."
          : undefined;
    return NextResponse.json(
      {
        ok: true,
        study: body.study,
        count: studies.length,
        studies,
        ...meta,
        ...(warning ? { warning } : {}),
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
    const meta = storeFields();
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        studies,
        ...meta,
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
    const meta = storeFields();
    return NextResponse.json(
      {
        ok: true,
        count: studies.length,
        studies,
        ...meta,
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
