"use client";

import { useEffect, useState } from "react";
import { firmById } from "@/lib/firmAccess";
import { setJoined, takeJoinQuestion } from "@/lib/joinedFirms";

/**
 * After someone taps "Join <firm> free" and comes back to this tab, ask once:
 * "Did you finish joining <firm>?" Yes marks it joined (device only).
 * Not yet does nothing. At most once per firm per session.
 */
export function JoinReturnPrompt({ raised = true }: { raised?: boolean }) {
  const [firmId, setFirmId] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const id = takeJoinQuestion();
      if (id && firmById(id)) setFirmId(id);
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  const firm = firmId ? firmById(firmId) : undefined;
  if (!firm) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={`Did you finish joining ${firm.name}?`}
      className={`fixed inset-x-0 z-50 px-3 ${raised ? "bottom-24" : "bottom-28"}`}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2 rounded-[20px] border border-line bg-white p-4 shadow-card">
        <p className="font-display text-[17px] font-bold text-ink">
          Did you finish joining {firm.name}?
        </p>
        <p className="text-sm text-muted">
          We&apos;ll remember it on this phone and show a Log in button instead of Join.
        </p>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setJoined(firm.id, true);
              setFirmId(null);
            }}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-bridge px-4 text-sm font-bold text-white hover:bg-bridge-dark"
          >
            Yes, I joined
          </button>
          <button
            type="button"
            onClick={() => setFirmId(null)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-fog"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}
