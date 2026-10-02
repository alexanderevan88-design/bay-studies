"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production (or when explicitly enabled).
 * Skips during `next dev` so HMR / caching quirks don't bite.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const allowDev = process.env.NEXT_PUBLIC_ENABLE_SW === "1";
    if (process.env.NODE_ENV !== "production" && !allowDev) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        // Quiet — no console spam unless debugging
        if (process.env.NODE_ENV !== "production") {
          console.info("[pwa] service worker registered", reg.scope);
        }
      })
      .catch(() => {
        // Registration failure is non-fatal (e.g. private mode quirks)
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
