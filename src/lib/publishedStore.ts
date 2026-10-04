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
 * Local / single-disk hosts: data/published.json
 * Vercel serverless without Blob: /tmp (writable; ephemeral per instance)
 * With BLOB_READ_WRITE_TOKEN: durable Vercel Blob JSON at inbox/bay-studies-published.json
 *
 * Same backend pattern as inboxStore — published Approve → feed survives localStorage clears.
 */
function resolvePublishedPath(): string {
  if (process.env.VERCEL || process.env.INBOX_USE_TMP === "1") {
    return path.join("/tmp", "bay-studies-published.json");
  }
  return path.join(process.cwd(), "data", "published.json");
}

const PUBLISHED_PATH = resolvePublishedPath();

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
 * Public reads use the Blob CDN (useCache defaults true). A cache HIT is not
 * a Simple operation; useCache:false would origin-read on every friend view.
 * Fresh reads (approve / patch / remove) bypass so read-modify-write sees
 * the latest object. One get per call — do not follow a cached get with
 * another uncached get.
 */
async function readPublishedFromBlob(opts?: {
  fresh?: boolean;
}): Promise<{ studies: Study[]; fromBlob: boolean }> {
  try {
    const result = await get(BLOB_PATHNAME, {
      access: "private",
      ...(opts?.fresh ? { useCache: false as const } : {}),
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { studies: [], fromBlob: true };
    }
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw) as Study[];
    return {
      studies: Array.isArray(parsed) ? parsed : [],
      fromBlob: true,
    };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name: string }).name)
        : "";
    const message = err instanceof Error ? err.message : String(err);
    if (name === "BlobNotFoundError" || /not found|404/i.test(message)) {
      return { studies: [], fromBlob: true };
    }
    console.error(
      "[publishedStore] blob read failed, falling back to file:",
      message
    );
    const fromFile = await readPublishedFromFile();
    if (fromFile.length > 0) return { studies: fromFile, fromBlob: false };
    return { studies: bundledPublishedFallback(), fromBlob: false };
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

/**
 * Scrubbed snapshot used when Blob is suspended (Hobby limit) and the
 * local file store is empty. Regenerate by re-running the publish scrub.
 */
function bundledPublishedFallback(): Study[] {
  return Array.isArray(fallbackJson) ? (fallbackJson as Study[]) : [];
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

/** Friend/feed reads. Warm instances skip Blob entirely inside this window. */
const PUBLIC_MEM_TTL_MS = 45_000;
/**
 * While the store is suspended, every get() can still count. Back off so
 * public traffic serves the bundled fallback instead of probing origin.
 */
const BLOB_DOWN_BACKOFF_MS = 5 * 60_000;

type MemEntry = { at: number; ttl: number; studies: Study[] };
let publicMem: MemEntry | null = null;

function readPublicMem(): Study[] | null {
  if (!publicMem) return null;
  if (Date.now() - publicMem.at >= publicMem.ttl) return null;
  return publicMem.studies;
}

function writePublicMem(studies: Study[], ttl: number): void {
  publicMem = { at: Date.now(), ttl, studies };
}

export async function readPublished(opts?: {
  /** Bypass the Blob CDN and the in-memory window (approve / patch / remove). */
  fresh?: boolean;
}): Promise<Study[]> {
  if (!blobEnabled()) {
    const studies = await readPublishedFromFile();
    return Promise.all(studies.map(scrubApplyUrlForRead));
  }

  // Public path only. Write paths pass fresh so they do a single origin get,
  // not a cached read plus a second uncached read.
  if (!opts?.fresh) {
    const cached = readPublicMem();
    if (cached) return cached;
  }

  const loaded = await readPublishedFromBlob({ fresh: opts?.fresh });
  const studies = await Promise.all(loaded.studies.map(scrubApplyUrlForRead));
  writePublicMem(
    studies,
    loaded.fromBlob ? PUBLIC_MEM_TTL_MS : BLOB_DOWN_BACKOFF_MS
  );
  return studies;
}

export async function writePublished(studies: Study[]): Promise<void> {
  if (blobEnabled()) {
    try {
      await writePublishedToBlob(studies);
      writePublicMem(studies, PUBLIC_MEM_TTL_MS);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        "[publishedStore] blob write failed, falling back to file:",
        message
      );
    }
  }
  await writePublishedToFile(studies);
  if (blobEnabled()) {
    // Blob write failed (often store suspended). Remember the file/fallback
    // list so the next public read does not immediately origin-get again.
    writePublicMem(studies, BLOB_DOWN_BACKOFF_MS);
  }
}

/** Insert or replace by study.id. Newest-approved first when inserting. */
export async function upsertPublished(study: Study): Promise<Study[]> {
  const applyUrl = await resolvePublicApplyUrl(study.applyUrl, {
    firmDomain: study.firmDomain,
  });
  const clean = sanitizeStudyForPublic({ ...study, applyUrl });
  const list = await readPublished({ fresh: true });
  const idx = list.findIndex((s) => s.id === clean.id);
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
  const next = await Promise.all(list.map(async (s) => {
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
  }));
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
  if (blobEnabled()) {
    return `blob:${BLOB_PATHNAME}`;
  }
  return PUBLISHED_PATH;
}
