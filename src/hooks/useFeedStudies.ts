"use client";

import { useCallback, useEffect, useState } from "react";
import { mergeStudies } from "@/data/studies";
import {
  loadPublishedStudies,
  removePublishedStudy,
  upsertPublishedStudy,
} from "@/lib/storage";
import type { Study } from "@/lib/types";

/**
 * Seed STUDIES + localStorage-approved publications.
 * Re-reads on window focus / custom event so admin approve updates /feed.
 */
export function useFeedStudies() {
  const [studies, setStudies] = useState<Study[]>(() => mergeStudies([]));
  const [published, setPublished] = useState<Study[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const pub = loadPublishedStudies();
    setPublished(pub);
    setStudies(mergeStudies(pub));
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onCustom = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("bay-studies-feed-updated", onCustom);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bay-studies-feed-updated", onCustom);
    };
  }, [refresh]);

  const publish = useCallback(
    (study: Study) => {
      const next = upsertPublishedStudy(study);
      setPublished(next);
      setStudies(mergeStudies(next));
      window.dispatchEvent(new Event("bay-studies-feed-updated"));
      return study;
    },
    []
  );

  const unpublish = useCallback((id: string) => {
    const next = removePublishedStudy(id);
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
