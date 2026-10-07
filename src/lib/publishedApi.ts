import type { Study } from "./types";
import type { ClosedStudy } from "./expiry";
import {
  loadPublishedStudies,
  removePublishedStudy,
  savePublishedStudies,
  upsertPublishedStudy,
  patchPublishedStudy as patchLocal,
} from "./storage";

/**
 * Client helpers for server published store.
 * Server is source of truth; localStorage is a cache + offline fallback.
 *
 * Mutating calls (POST/PATCH/DELETE) send credentials so the httpOnly
 * bay_studies_admin cookie from /admin/login is included. When ADMIN_SECRET
 * is unset (local/dev open mode), the API accepts unauthenticated writes.
 */

const mutatingInit = {
  credentials: "same-origin" as RequestCredentials,
};

export type PublishedApiMeta = {
  studies: Study[];
  warning?: string;
  blobStatus?: string;
  source?: string;
};

export async function fetchPublishedStudies(opts?: {
  /** Admin ingest: bypass the CDN and the server memory window. Includes date-closed studies. */
  fresh?: boolean;
}): Promise<Study[]> {
  return (await fetchPublishedFeed(opts)).studies;
}

const CLOSED_KEY = "bay-studies-closed-v1";

function loadClosedStubs(): ClosedStudy[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CLOSED_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as ClosedStudy[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Public feed + the stub list of studies that closed by date (for Saved and
 * the "This study has closed" page). Admin (fresh) gets every study.
 */
export async function fetchPublishedFeed(opts?: {
  fresh?: boolean;
}): Promise<{ studies: Study[]; closed: ClosedStudy[] }> {
  try {
    const fresh = opts?.fresh === true;
    // Public feed must NOT send no-cache/no-store or the Vercel CDN will
    // bypass s-maxage and every friend view will invoke the function.
    const res = await fetch(
      fresh ? "/api/published?include=closed" : "/api/published",
      fresh
        ? {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }
        : { cache: "default" }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      studies?: Study[];
      closed?: ClosedStudy[];
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      const closed = Array.isArray(data.closed) ? data.closed : [];
      try {
        localStorage.setItem(CLOSED_KEY, JSON.stringify(closed));
      } catch {
        /* storage full / private mode */
      }
      return { studies: data.studies, closed };
    }
  } catch {
    /* fall through */
  }
  return { studies: loadPublishedStudies(), closed: loadClosedStubs() };
}

export async function apiUpsertPublished(
  study: Study
): Promise<PublishedApiMeta> {
  try {
    const res = await fetch("/api/published", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ study }),
      ...mutatingInit,
    });
    const data = (await res.json()) as {
      ok?: boolean;
      studies?: Study[];
      warning?: string;
      blobStatus?: string;
      source?: string;
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      return {
        studies: data.studies,
        warning: data.warning,
        blobStatus: data.blobStatus,
        source: data.source,
      };
    }
  } catch {
    /* fall through to local cache */
  }
  return { studies: upsertPublishedStudy(study) };
}

export async function apiRemovePublished(id: string): Promise<Study[]> {
  try {
    const res = await fetch(
      `/api/published?id=${encodeURIComponent(id)}`,
      { method: "DELETE", ...mutatingInit }
    );
    const data = (await res.json()) as {
      ok?: boolean;
      studies?: Study[];
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      return data.studies;
    }
  } catch {
    /* fall through */
  }
  return removePublishedStudy(id);
}

export async function apiPatchPublished(
  id: string,
  patch: Partial<Study>
): Promise<Study[]> {
  try {
    const res = await fetch("/api/published", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
      ...mutatingInit,
    });
    const data = (await res.json()) as {
      ok?: boolean;
      studies?: Study[];
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      return data.studies;
    }
  } catch {
    /* fall through */
  }
  return patchLocal(id, patch);
}
