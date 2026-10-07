"use client";

import Link from "next/link";
import { useJoinedFirms } from "@/hooks/useJoinedFirms";
import { FIRMS } from "@/lib/firmAccess";

/** Me page: joined panels (device only) with Unmark, plus a link to /setup. */
export function MyPanels() {
  const { isJoined, toggle, ready } = useJoinedFirms();
  if (!ready) return null;
  const joined = FIRMS.filter((f) => isJoined(f.id));
  return (
    <section className="rounded-[20px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Your panels · {joined.length} of {FIRMS.length}
        </p>
        <Link
          href="/setup"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-bridge-link hover:underline"
        >
          {joined.length === FIRMS.length ? "View" : "Get set up"}
        </Link>
      </div>
      {joined.length === 0 ? (
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Join the big panels once (Curion, Focus Group, Fieldwork…) and studies
          from them become a quick log-in instead of a signup.
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-stone-100">
          {joined.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span aria-hidden className="text-cash">✓</span>
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => toggle(f.id, false)}
                aria-label={`Unmark ${f.name} as joined`}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-bridge-link hover:bg-fog"
              >
                Unmark
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-muted">Saved on this phone only.</p>
    </section>
  );
}
