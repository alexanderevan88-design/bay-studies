import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import type { Study } from "./types";
import {
  resolvePublicApplyUrl,
  sanitizeStudyForPublic,
} from "./sanitizePublicStudy";
import fallbackJson from "../../data/published-fallback.json";

const BLOB_PATHNAME = "inbox/bay-studies-published.json";

/**
 * Published feed storage + cache layers (public GET /api/published):
 *
 * 1. In-memory TTL (~45s) on a warm serverless instance — no Blob ops.
 * 2. Vercel CDN (s-maxage=45 on the route) — friend traffic rarely hits origin.
 * 3. Vercel Blob CDN get (cacheControlMaxAge=1d) when the store is healthy.
 * 4. On Blob failure / suspension: file store, then bundled
 *    data/published-fallback.json, with a 5‑minute probe backoff so we do not
 *    burn origin gets while the store is suspended.
 *
 * Writes (approve / upsert / patch / remove): try Blob, always update the
 * file store, and best-effort sync published-fallback.json so the next deploy
 * stays correct when Blob is down. Never 500 solely because Blob is suspended.
 *
 * Same backend pattern as inboxStore — published Approve → feed survives
 * localStorage clears.
 */
function resolvePublishedPath(): string {
  if (process.env.VERCEL || process.env.INBOX_USE_TMP === "1") {
    return path.join("/tmp", "bay-studies-published.json");
  }
  return path.join(process.cwd(), "data", "published.json");
}

const PUBLISHED_PATH = resolvePublishedPath();
const FALLBACK_PATH = path.join(
  process.cwd(),
  "data",
  "published-fallback.json"
);

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function ensureFileStore(): Promise<void> {
  const dir = path.dirname(PUBLISHED_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(PUBLISHED_PATH);
  } catch {
    await fs.writeFile(PUBLISHED_PATH, "[]\n", "utf8");
  }
}

async function readPublishedFromFile(): Promise<Study[]> {
  await ensureFileStore();
  try {
    const raw = await fs.readFile(PUBLISHED_PATH, "utf8");
    const parsed = JSON.parse(raw) as Study[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePublishedToFile(studies: Study[]): Promise<void> {
  await ensureFileStore();
  await fs.writeFile(
    PUBLISHED_PATH,
    JSON.stringify(studies, null, 2) + "\n",
    "utf8"
  );
}

/**
 * Keep the deploy-time safety net in sync on hosts that can write the repo
 * (laptop / CI). On Vercel the deployment FS is read-only — EROFS is fine.
 */
async function syncPublishedFallback(studies: Study[]): Promise<boolean> {
  try {
    await fs.mkdir(path.dirname(FALLBACK_PATH), { recursive: true });
    await fs.writeFile(
      FALLBACK_PATH,
      JSON.stringify(studies, null, 2) + "\n",
      "utf8"
    );
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "EROFS" && code !== "EACCES") {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[publishedStore] fallback sync skipped:", message);
    }
    return false;
  }
}

export type PublishedSource = "memory" | "blob" | "file" | "fallback";
export type BlobStoreStatus =
  | "disabled"
  | "ok"
  | "suspended"
  | "error"
  | "unknown";

type BlobLoad = {
  studies: Study[];
  source: Exclude<PublishedSource, "memory">;
};

/** Friend/feed reads. Warm instances skip Blob entirely inside this window. */
const PUBLIC_MEM_TTL_MS = 45_000;
/**
 * While the store is suspended, every get() can still count (and often 403).
 * Back off so public traffic serves file/fallback instead of probing origin.
 */
const BLOB_DOWN_BACKOFF_MS = 5 * 60_000;

type MemEntry = { at: number; ttl: number; studies: Study[] };
let publicMem: MemEntry | null = null;
/** Skip Blob gets/puts until this time after a suspension / 403 / write error. */
let blobDownUntil = 0;
let lastBlobStatus: BlobStoreStatus = blobEnabled() ? "unknown" : "disabled";
let lastBlobError: string | null = null;
let lastReadSource: PublishedSource = "fallback";

function isBlobDown(): boolean {
  return Date.now() < blobDownUntil;
}

function markBlobDown(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  lastBlobError = message;
  blobDownUntil = Date.now() + BLOB_DOWN_BACKOFF_MS;
  // get() often returns 403 Forbidden when the store is suspended; put()
  // says "This store has been suspended." Treat both as suspended.
  if (/suspend/i.test(message) || /\b403\b|forbidden/i.test(message)) {
    lastBlobStatus = "suspended";
    console.warn(
      "[publishedStore] Blob store suspended — serving file/fallback for",
      BLOB_DOWN_BACKOFF_MS / 1000,
      "s:",
      message
    );
  } else {
    lastBlobStatus = "error";
    console.error(
      "[publishedStore] Blob unavailable — backing off",
      BLOB_DOWN_BACKOFF_MS / 1000,
      "s:",
      message
    );
  }
}

function markBlobOk(): void {
  blobDownUntil = 0;
  lastBlobStatus = "ok";
  lastBlobError = null;
}

function readPublicMem(): Study[] | null {
  if (!publicMem) return null;
  if (Date.now() - publicMem.at >= publicMem.ttl) return null;
  return publicMem.studies;
}

function writePublicMem(studies: Study[], ttl: number): void {
  publicMem = { at: Date.now(), ttl, studies };
}

/**
 * Scrubbed snapshot used when Blob is suspended and the local file store is
 * empty (typical cold Vercel instance). Kept in sync by writePublished on
 * writable hosts; on Vercel, redeploy after updating the file in git.
 */
function bundledPublishedFallback(): Study[] {
  return Array.isArray(fallbackJson) ? (fallbackJson as Study[]) : [];
}

async function loadFromFileOrFallback(): Promise<BlobLoad> {
  const fromFile = await readPublishedFromFile();
  if (fromFile.length > 0) {
    return { studies: fromFile, source: "file" };
  }
  return { studies: bundledPublishedFallback(), source: "fallback" };
}

/**
 * Public reads use the Blob CDN (useCache defaults true). A cache HIT is not
 * a Simple operation; useCache:false would origin-read on every friend view.
 * Fresh reads (approve / patch / remove) bypass so read-modify-write sees
 * the latest object. One get per call — do not follow a cached get with
 * another uncached get. When the store is known-down, skip get entirely.
 */
async function readPublishedFromBlob(opts?: {
  fresh?: boolean;
}): Promise<BlobLoad> {
  if (isBlobDown()) {
    return loadFromFileOrFallback();
  }
  try {
    const result = await get(BLOB_PATHNAME, {
      access: "private",
      ...(opts?.fresh ? { useCache: false as const } : {}),
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      markBlobOk();
      return { studies: [], source: "blob" };
    }
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw) as Study[];
    markBlobOk();
    return {
      studies: Array.isArray(parsed) ? parsed : [],
      source: "blob",
    };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: string }).name)
        : "";
    const message = err instanceof Error ? err.message : String(err);
    if (name === "BlobNotFoundError" || /not found|404/i.test(message)) {
      markBlobOk();
      return { studies: [], source: "blob" };
    }
    markBlobDown(err);
    return loadFromFileOrFallback();
  }
}

async function writePublishedToBlob(studies: Study[]): Promise<void> {
  const body = JSON.stringify(studies, null, 2) + "\n";
  await put(BLOB_PATHNAME, body, {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
    // Minimum Blob allows is 60s. A 60s TTL would miss (Simple op) about
    // once a minute and can re-hit the Hobby cap. One day keeps HITs cheap.
    // Overwrite propagation is still ~60s; admin reads stay useCache:false.
    cacheControlMaxAge: 60 * 60 * 24,
  });
}

const resolvedApplyUrlCache = new Map<string, string>();

/** Drop participant session params on the way out to the public feed. */
async function scrubApplyUrlForRead(study: Study): Promise<Study> {
  const cacheKey = `${study.firmDomain}\n${study.applyUrl}`;
  let applyUrl = resolvedApplyUrlCache.get(cacheKey);
  if (!applyUrl) {
    applyUrl = await resolvePublicApplyUrl(study.applyUrl, {
      firmDomain: study.firmDomain,
    });
    resolvedApplyUrlCache.set(cacheKey, applyUrl);
  }
  return sanitizeStudyForPublic({
    ...study,
    applyUrl: applyUrl || study.applyUrl,
  });
}

export type PublishedReadResult = {
  studies: Study[];
  source: PublishedSource;
};

export async function readPublished(opts?: {
  /** Bypass the Blob CDN and the in-memory window (approve / patch / remove). */
  fresh?: boolean;
}): Promise<Study[]> {
  const result = await readPublishedDetailed(opts);
  return result.studies;
}

export async function readPublishedDetailed(opts?: {
  fresh?: boolean;
}): Promise<PublishedReadResult> {
  if (!blobEnabled()) {
    lastBlobStatus = "disabled";
    const loaded = await loadFromFileOrFallback();
    const studies = await Promise.all(
      loaded.studies.map(scrubApplyUrlForRead)
    );
    lastReadSource = loaded.source;
    writePublicMem(studies, PUBLIC_MEM_TTL_MS);
    return { studies, source: loaded.source };
  }

  // Public path only. Write paths pass fresh so they do a single origin get,
  // not a cached read plus a second uncached read. Memory still wins for
  // public traffic; fresh skips memory but still honors Blob-down backoff.
  if (!opts?.fresh) {
    const cached = readPublicMem();
    if (cached) {
      lastReadSource = "memory";
      return { studies: cached, source: "memory" };
    }
  }

  const loaded = await readPublishedFromBlob({ fresh: opts?.fresh });
  const studies = await Promise.all(loaded.studies.map(scrubApplyUrlForRead));
  writePublicMem(
    studies,
    loaded.source === "blob" ? PUBLIC_MEM_TTL_MS : BLOB_DOWN_BACKOFF_MS
  );
  lastReadSource = loaded.source;
  return { studies, source: loaded.source };
}

export type PublishedWriteResult = {
  blobOk: boolean;
  fallbackSynced: boolean;
  blobStatus: BlobStoreStatus;
  blobError: string | null;
};

export async function writePublished(
  studies: Study[]
): Promise<PublishedWriteResult> {
  let blobOk = false;

  if (blobEnabled() && !isBlobDown()) {
    try {
      await writePublishedToBlob(studies);
      markBlobOk();
      blobOk = true;
    } catch (err) {
      markBlobDown(err);
    }
  } else if (blobEnabled() && isBlobDown()) {
    console.warn(
      "[publishedStore] skipping Blob write while store is down until",
      new Date(blobDownUntil).toISOString()
    );
  }

  // Always persist locally so this instance (and laptop deploys) stay correct.
  await writePublishedToFile(studies);
  const fallbackSynced = await syncPublishedFallback(studies);

  writePublicMem(
    studies,
    blobOk ? PUBLIC_MEM_TTL_MS : BLOB_DOWN_BACKOFF_MS
  );

  return {
    blobOk,
    fallbackSynced,
    blobStatus: publishedBlobStatus(),
    blobError: lastBlobError,
  };
}

/** Insert or replace by study.id. Newest-approved first when inserting. */
export async function upsertPublished(study: Study): Promise<Study[]> {
  const applyUrl = await resolvePublicApplyUrl(study.applyUrl, {
    firmDomain: study.firmDomain,
  });
  const clean = sanitizeStudyForPublic({ ...study, applyUrl });
  const list = await readPublished({ fresh: true });
  const idx = list.findIndex((s) => s.id === clean.id);
  // Expiry's 10-day fallback counts from publishedAt, so every published
  // study must carry one (keep the original on re-approve if none was sent).
  if (!clean.publishedAt) {
    clean.publishedAt =
      (idx >= 0 ? list[idx].publishedAt : undefined) ?? new Date().toISOString();
  }
  if (idx >= 0) {
    list[idx] = clean;
  } else {
    list.unshift(clean);
  }
  await writePublished(list);
  return list;
}

export async function removePublished(id: string): Promise<Study[]> {
  const next = (await readPublished({ fresh: true })).filter((s) => s.id !== id);
  await writePublished(next);
  return next;
}

export async function patchPublished(
  id: string,
  patch: Partial<Study>
): Promise<Study[]> {
  const list = await readPublished({ fresh: true });
  const next = await Promise.all(
    list.map(async (s) => {
      if (s.id !== id) return s;
      const merged: Study = {
        ...s,
        ...patch,
        eligibility: patch.eligibility
          ? { ...s.eligibility, ...patch.eligibility }
          : s.eligibility,
      };
      const applyUrl = await resolvePublicApplyUrl(merged.applyUrl, {
        firmDomain: merged.firmDomain,
      });
      return sanitizeStudyForPublic({ ...merged, applyUrl });
    })
  );
  await writePublished(next);
  return next;
}

export async function findPublishedById(
  id: string
): Promise<Study | undefined> {
  const list = await readPublished();
  return list.find((s) => s.id === id);
}

export function publishedPath(): string {
  if (blobEnabled() && !isBlobDown() && lastBlobStatus === "ok") {
    return `blob:${BLOB_PATHNAME}`;
  }
  if (blobEnabled() && (isBlobDown() || lastBlobStatus === "suspended")) {
    return `fallback:${FALLBACK_PATH} (blob suspended)`;
  }
  if (blobEnabled()) {
    return `blob:${BLOB_PATHNAME}`;
  }
  return PUBLISHED_PATH;
}

export function publishedBlobStatus(): BlobStoreStatus {
  if (!blobEnabled()) return "disabled";
  if (isBlobDown()) return lastBlobStatus === "suspended" ? "suspended" : lastBlobStatus;
  return lastBlobStatus;
}

export function publishedStoreMeta(): {
  path: string;
  blobStatus: BlobStoreStatus;
  blobError: string | null;
  source: PublishedSource;
  blobDownUntil: number | null;
} {
  return {
    path: publishedPath(),
    blobStatus: publishedBlobStatus(),
    blobError: lastBlobError,
    source: lastReadSource,
    blobDownUntil: isBlobDown() ? blobDownUntil : null,
  };
}
