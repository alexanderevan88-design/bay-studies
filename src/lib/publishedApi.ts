import type { Study } from "./types";
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

export async function fetchPublishedStudies(opts?: {
  /** Admin ingest: bypass the CDN and the server memory window. */
  fresh?: boolean;
}): Promise<Study[]> {
  try {
    const fresh = opts?.fresh === true;
    // Public feed must NOT send no-cache/no-store or the Vercel CDN will
    // bypass s-maxage and every friend view will invoke the function.
    const res = await fetch(
      "/api/published",
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
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      return data.studies;
    }
  } catch {
    /* fall through */
  }
  return loadPublishedStudies();
}

export async function apiUpsertPublished(study: Study): Promise<Study[]> {
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
    };
    if (res.ok && data.ok && Array.isArray(data.studies)) {
      savePublishedStudies(data.studies);
      return data.studies;
    }
  } catch {
    /* fall through to local cache */
  }
  return upsertPublishedStudy(study);
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
