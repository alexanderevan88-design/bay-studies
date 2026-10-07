"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FIRMS } from "@/lib/firmAccess";
import { loadJoined, loadSetupSuggest, saveSetupSuggest } from "@/lib/joinedFirms";

/** Member-login firms first (they're the ones you can't apply to without an account). */
function suggestedNames(): string {
  const names = [...FIRMS]
    .sort((a, b) => Number(b.alwaysPanel) - Number(a.alwaysPanel))
    .map((f) => f.buttonName ?? f.name);
  return `${names.slice(0, 3).join(", ")}…`;
}

/**
 * Optional suggestion card: "Get ready for new studies". Primary Get set up,
 * clear Maybe later. Never blocks anything.
 */
export function SetupSuggestCard({
  onLater,
  className = "",
}: {
  onLater?: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label="Optional: get set up"
      className={`rounded-[20px] border border-line bg-white p-4 shadow-card ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-bridge-dark">Optional</p>
      <h2 className="mt-1 font-display text-[20px] font-bold leading-tight text-ink">
        Get ready for new studies
      </h2>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
        Join the big panels once ({suggestedNames()}) so you can apply in seconds
        when new ones drop. About 3 minutes each, and you can stop any time.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/setup"
          onClick={() => saveSetupSuggest({ choice: "opened" })}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-bridge px-4 text-sm font-bold text-white hover:bg-bridge-dark"
        >
          Get set up
        </Link>
        <button
          type="button"
          onClick={() => {
            saveSetupSuggest({ choice: "later" });
            onLater?.();
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] border border-line bg-white px-4 text-sm font-bold text-ink hover:bg-fog"
        >
          Maybe later
        </button>
      </div>
    </section>
  );
}

/** True when the vault/onboarding suggestion should show (not answered yet, not all joined). */
export function shouldSuggestSetup(): boolean {
  const s = loadSetupSuggest();
  if (s.choice) return false;
  return Object.keys(loadJoined()).length < FIRMS.length;
}

/** Small, dismissible feed nudge. Hidden once dismissed or every panel is joined. */
export function SetupFeedNudge() {
  const [state, setState] = useState<{ show: boolean; joined: number }>({ show: false, joined: 0 });

  useEffect(() => {
    const joined = Object.keys(loadJoined()).filter((id) => FIRMS.some((f) => f.id === id)).length;
    const s = loadSetupSuggest();
    setState({ show: !s.nudgeDismissed && joined < FIRMS.length, joined });
  }, []);

  if (!state.show) return null;
  return (
    <div className="flex items-center gap-2 rounded-[20px] border border-line bg-white py-1.5 pl-4 pr-1.5">
      <p className="min-w-0 flex-1 text-sm leading-snug text-stone-700">
        <Link href="/setup" className="font-semibold text-bridge-link underline underline-offset-2">
          Get set up
        </Link>
        {state.joined > 0
          ? ` · ${state.joined} of ${FIRMS.length} panels joined`
          : ": join the panels once, apply faster later"}
      </p>
      <button
        type="button"
        aria-label="Dismiss get set up tip"
        onClick={() => {
          saveSetupSuggest({ nudgeDismissed: true });
          setState((s) => ({ ...s, show: false }));
        }}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fog"
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
