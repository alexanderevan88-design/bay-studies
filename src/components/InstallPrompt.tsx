"use client";

import { useCallback, useEffect, useState } from "react";
import { BridgeMark } from "./Logo";

const STORAGE_KEY = "bay-studies-install-dismissed";
const VISITS_KEY = "bay-studies-visits";
const SESSION_KEY = "bay-studies-visit-counted";
const SCROLL_TRIGGER_PX = 600;

/** Count one visit per browser session; returns the running total. */
function countVisit(): number {
  try {
    let n = Number(localStorage.getItem(VISITS_KEY) || "0") || 0;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      n += 1;
      localStorage.setItem(VISITS_KEY, String(n));
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    return n;
  } catch {
    return 1;
  }
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  const ios = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(mq || ios);
}

function isMobileish(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Soft, dismissible “Add to Home Screen” tip for phone users.
 * Remembers dismiss in localStorage. Hidden when already installed.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [iosHint, setIosHint] = useState(false);
  // Only offer install on a 2nd visit, or after the visitor scrolls a bit.
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (countVisit() >= 2) {
      setEligible(true);
      return;
    }
    const onScroll = () => {
      if (window.scrollY > SCROLL_TRIGGER_PX) {
        setEligible(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (!isMobileish()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    // iOS has no beforeinstallprompt — show Share tip after a short delay
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      timer = setTimeout(() => {
        try {
          if (localStorage.getItem(STORAGE_KEY) === "1") return;
        } catch {
          /* ignore */
        }
        if (isStandalone()) return;
        setIosHint(true);
        setVisible(true);
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* user dismissed native sheet */
    }
    setDeferred(null);
    dismiss();
  }, [deferred, dismiss]);

  if (!visible || !eligible) return null;

  return (
    <div
      role="status"
      className="pointer-events-auto fixed inset-x-0 bottom-[4.75rem] z-30 mx-auto max-w-lg px-3"
    >
      <div className="flex items-start gap-3 rounded-[20px] border border-line bg-white/95 px-4 py-3 shadow-lg shadow-sage-900/10 backdrop-blur">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bridge text-white"
          aria-hidden
        >
          <BridgeMark />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sage-900">
            Add Bay Studies to your home screen
          </p>
          {iosHint ? (
            <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
              Tap <span className="font-semibold text-stone-600">Share</span>{" "}
              then{" "}
              <span className="font-semibold text-stone-600">
                Add to Home Screen
              </span>{" "}
              for one-tap access to paid studies.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
              Install for quick access to Bay Area focus groups — no App Store
              needed.
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {deferred && (
              <button
                type="button"
                onClick={install}
                className="inline-flex min-h-11 items-center rounded-full bg-bridge px-4 text-sm font-bold text-white transition hover:bg-bridge-dark"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-700"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-50 hover:text-stone-700"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
