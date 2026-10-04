"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeStudies } from "@/data/studies";
import {
  apiRemovePublished,
  apiUpsertPublished,
  fetchPublishedStudies,
} from "@/lib/publishedApi";
import type { Study } from "@/lib/types";

/**
 * Public feed from GET /api/published (human-approved studies only).
 * Seed placeholders are not mixed in on production. In local dev, seeds
 * show only while the published list is empty. Re-reads on focus / custom event.
 * The fetch honors Cache-Control (about 45s on the CDN). Admin ingest uses
 * fetchPublishedStudies({ fresh: true }) so Approve stays no-store.
 */
export function useFeedStudies() {
  const [studies, setStudies] = useState<Study[]>(() => mergeStudies([]));
  const [published, setPublished] = useState<Study[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const pub = await fetchPublishedStudies();
    setPublished(pub);
    setStudies(mergeStudies(pub));
    setReady(true);
  }, []);

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
    const next = await apiUpsertPublished(study);
    setPublished(next);
    setStudies(mergeStudies(next));
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
    return study;
  }, []);

  const unpublish = useCallback(async (id: string) => {
    const next = await apiRemovePublished(id);
    setPublished(next);
    setStudies(mergeStudies(next));
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
  }, []);

  const getById = useCallback(
    (id: string) => studies.find((s) => s.id === id),
    [studies]
  );

  return { studies, published, ready, refresh, publish, unpublish, getById };
}

export function notifyFeedUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bay-studies-feed-updated"));
  }
}
