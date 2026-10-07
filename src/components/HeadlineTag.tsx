"use client";

import type { Study } from "@/lib/types";
import { closesLabel, headlineTag } from "@/lib/expiry";

/**
 * The one status tag a card shows next to the firm name.
 * Priority: Closing soon > Fresh today > New (never more than one).
 *  - Closing soon: orange tint + clock (#A5330F on #FBE6DC, 5.7:1)
 *  - Fresh today: solid bridge orange + white dot (#FFF on #C8401A, 5.0:1)
 *  - New: solid gold (existing; #3B2604 on #F2A93B)
 */
export function HeadlineTag({
  study,
  isNew,
  className = "",
}: {
  study: Study;
  isNew: boolean;
  className?: string;
}) {
  const tag = headlineTag(study, isNew);
  if (!tag) return null;
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-px text-xs font-extrabold uppercase tracking-wide";
  if (tag === "closing-soon") {
    const last = closesLabel(study);
    return (
      <span
        className={`${base} bg-bridge-tint text-bridge-dark ring-1 ring-inset ring-bridge/40 ${className}`}
        title={last ? `Last day to see it here: ${last}` : undefined}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3l2 1.5" strokeLinecap="round" />
        </svg>
        Closing soon
      </span>
    );
  }
  if (tag === "fresh-today") {
    return (
      <span className={`${base} bg-bridge text-white ${className}`}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
        Fresh today
      </span>
    );
  }
  return <span className={`${base} bg-poppy text-poppy-deep ${className}`}>New</span>;
}
