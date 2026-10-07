"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeStudies } from "@/data/studies";
import {
  apiRemovePublished,
  apiUpsertPublished,
  fetchPublishedFeed,
} from "@/lib/publishedApi";
import type { Study } from "@/lib/types";
import { splitByExpiry, toClosedStub, type ClosedStudy } from "@/lib/expiry";

/**
 * Re-apply date expiry on the client too: covers a stale CDN/local cache and
 * POST/DELETE responses (which return every study, closed ones included).
 */
function splitLive(
  list: Study[],
  serverClosed: ClosedStudy[] = []
): { live: Study[]; closed: ClosedStudy[] } {
  const { live, closed } = splitByExpiry(list);
  const byId = new Map<string, ClosedStudy>();
  for (const c of serverClosed) byId.set(c.id, c);
  for (const c of closed) byId.set(c.id, toClosedStub(c));
  return { live, closed: Array.from(byId.values()) };
}

/**
 * Public feed from GET /api/published (human-approved studies only).
 * Date-expired studies are split out into `closed` (see docs/EXPIRY.md).
 * Seed placeholders are not mixed in on production. In local dev, seeds
 * show only while the published list is empty. Re-reads on focus / custom event.
 * The fetch honors Cache-Control (about 45s on the CDN). Admin ingest uses
 * fetchPublishedStudies({ fresh: true }) so Approve stays no-store.
 */
export function useFeedStudies() {
  const [studies, setStudies] = useState<Study[]>(() => mergeStudies([]));
  const [published, setPublished] = useState<Study[]>([]);
  const [closed, setClosed] = useState<ClosedStudy[]>([]);
  const [ready, setReady] = useState(false);

  const apply = useCallback((list: Study[], serverClosed?: ClosedStudy[]) => {
    const { live, closed: shut } = splitLive(list, serverClosed);
    setPublished(live);
    setClosed(shut);
    setStudies(mergeStudies(live));
  }, []);

  const refresh = useCallback(async () => {
    const { studies: pub, closed: serverClosed } = await fetchPublishedFeed();
    apply(pub, serverClosed);
    setReady(true);
  }, [apply]);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    const onCustom = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("bay-studies-feed-updated", onCustom);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bay-studies-feed-updated", onCustom);
    };
  }, [refresh]);

  const publish = useCallback(async (study: Study) => {
    const { studies: next } = await apiUpsertPublished(study);
    apply(next);
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
    return study;
  }, [apply]);

  const unpublish = useCallback(async (id: string) => {
    const next = await apiRemovePublished(id);
    apply(next);
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
  }, [apply]);

  const getById = useCallback(
    (id: string) => studies.find((s) => s.id === id),
    [studies]
  );

  /** Study that closed by date (still in the data file, hidden from the feed). */
  const getClosedById = useCallback(
    (id: string) => closed.find((s) => s.id === id),
    [closed]
  );

  return {
    studies,
    published,
    closed,
    ready,
    refresh,
    publish,
    unpublish,
    getById,
    getClosedById,
  };
}

export function notifyFeedUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
  }
}
