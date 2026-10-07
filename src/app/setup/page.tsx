"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BridgeInFog } from "@/components/BridgeInFog";
import { CopyNextHelper } from "@/components/CopyNextHelper";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useJoinedFirms } from "@/hooks/useJoinedFirms";
import { useProfile } from "@/hooks/useProfile";
import { signupFirm } from "@/lib/copyNext";
import { firmTone } from "@/lib/display";
import { FIRMS, firmConfig, firmMemberUrl, type FirmConfig } from "@/lib/firmAccess";
import { markJoinPending, saveSetupSuggest } from "@/lib/joinedFirms";
import type { Study } from "@/lib/types";
import { loadVault, vaultProgress } from "@/lib/vault";

/**
 * "Get set up": one-time checklist for joining firm panels.
 * Joined state is device-only (localStorage). Nothing is sent anywhere.
 */
export default function SetupPage() {
  const { profile, ready: profileReady } = useProfile();
  const { studies, ready: feedReady } = useFeedStudies();
  const { isJoined, toggle, ready: joinedReady } = useJoinedFirms();
  const [helperFor, setHelperFor] = useState<string | null>(null);
  const [vaultFilled, setVaultFilled] = useState<number | null>(null);

  useEffect(() => {
    saveSetupSuggest({ choice: "opened" });
  }, []);

  useEffect(() => {
    if (profileReady) setVaultFilled(vaultProgress(profile, loadVault()).filled);
  }, [profile, profileReady]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of studies) {
      const id = firmConfig(s)?.id;
      if (id) c[id] = (c[id] ?? 0) + 1;
    }
    return c;
  }, [studies]);

  const firms = useMemo(
    () =>
      [...FIRMS].sort(
        (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name)
      ),
    [counts]
  );

  const joinedCount = FIRMS.filter((f) => isJoined(f.id)).length;
  const allDone = joinedReady && joinedCount === FIRMS.length;
  const left = FIRMS.length - joinedCount;

  return (
    <AppShell>
      <header className="px-5 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center rounded-lg pr-2 text-sm font-semibold text-bridge-link"
          >
            ← Me
          </Link>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-lg pl-2 text-sm font-semibold text-bridge-link"
          >
            Studies
          </Link>
        </div>
        <p className="mt-3 text-[13px] font-semibold text-muted">Get set up · one time</p>
        <h1 className="mt-0.5 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-ink">
          Join the panels once, apply in seconds later
        </h1>

        <div className="mt-4 rounded-[20px] border border-line bg-white p-4">
          <p className="font-display text-lg font-bold text-ink">
            {joinedCount} of {FIRMS.length} panels joined
          </p>
          {!allDone && (
            <p className="text-xs text-muted">
              About 3 min each{left > 1 ? ` · roughly ${left * 3} min for the rest` : ""}
            </p>
          )}
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-fog"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FIRMS.length}
            aria-valuenow={joinedCount}
            aria-label="Panels joined"
          >
            <div
              className="h-full rounded-full bg-bridge transition-[width] motion-reduce:transition-none"
              style={{ width: `${(joinedCount / FIRMS.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Saved on this phone only. We never see which panels you join.
          </p>
        </div>

        {vaultFilled !== null && vaultFilled < 6 && !allDone && (
          <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-bay-tint px-4 py-3">
            <p className="min-w-0 flex-1 text-sm leading-snug text-stone-700">
              <span className="font-semibold text-bay">Tip:</span> fill your vault first.
              Then each signup is mostly tap-copy-paste.
            </p>
            <Link
              href="/vault"
              className="inline-flex min-h-11 shrink-0 items-center rounded-[14px] bg-bay px-3.5 text-sm font-bold text-white"
            >
              Open vault
            </Link>
          </div>
        )}
      </header>

      <div className="space-y-3 px-4 pb-8">
        {allDone && (
          <div className="rounded-[22px] border border-line bg-white px-5 py-7 text-center shadow-card">
            <BridgeInFog />
            <p className="mt-3 font-display text-[21px] font-bold text-ink">All set.</p>
            <p className="mx-auto mt-1 max-w-xs text-[14.5px] leading-relaxed text-muted">
              You&apos;re ready for almost every study on the feed.
            </p>
            <Link
              href="/feed"
              className="mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-bridge px-5 text-sm font-bold text-white"
            >
              See studies
            </Link>
          </div>
        )}

        {firms.map((f) => (
          <FirmRow
            key={f.id}
            firm={f}
            count={feedReady ? counts[f.id] ?? 0 : null}
            joined={isJoined(f.id)}
            onToggle={() => toggle(f.id)}
            helperOpen={helperFor === f.id}
            onJoin={() => {
              markJoinPending(f.id);
              setHelperFor(f.id);
            }}
            onCloseHelper={() => setHelperFor(null)}
            helper={
              profileReady ? (
                <CopyNextHelper
                  profile={profile}
                  firm={signupFirm(f.id, f.buttonName ?? f.name)}
                  studyId={`signup:${f.id}`}
                  mode="signup"
                />
              ) : null
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

function FirmRow({
  firm,
  count,
  joined,
  onToggle,
  onJoin,
  helperOpen,
  onCloseHelper,
  helper,
}: {
  firm: FirmConfig;
  count: number | null;
  joined: boolean;
  onToggle: () => void;
  onJoin: () => void;
  helperOpen: boolean;
  onCloseHelper: () => void;
  helper: React.ReactNode;
}) {
  const tone = firmTone({ firm: firm.dataName } as Study);
  return (
    <article
      className={`rounded-[20px] border bg-white p-4 shadow-card ${joined ? "border-cash/30" : "border-line"}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${tone}`}
        >
          {firm.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-bold leading-tight text-ink">{firm.name}</h2>
          <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{firm.blurb}</p>
          {count !== null && count > 0 && (
            <p className="mt-1 text-xs font-semibold text-cash">
              {count} {count === 1 ? "study" : "studies"} on the feed now
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!joined && firm.joinUrl && (
          <a
            href={firm.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onJoin}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-bridge px-4 text-sm font-bold text-white hover:bg-bridge-dark"
          >
            Join {firm.buttonName ?? firm.name} free
            <span aria-hidden className="text-xs font-normal opacity-90">↗</span>
          </a>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={joined}
          onClick={onToggle}
          className={`inline-flex min-h-11 items-center gap-2 rounded-[14px] border px-3.5 text-sm font-bold transition ${
            joined
              ? "flex-1 border-cash/40 bg-cash-tint text-cash"
              : "border-line bg-white text-ink hover:bg-fog"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
              joined ? "border-cash bg-cash text-white" : "border-stone-300 bg-white"
            }`}
          >
            {joined && (
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          I&apos;ve joined
        </button>
      </div>
      <a
        href={firmMemberUrl(firm)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-bridge-link underline underline-offset-2"
      >
        {firm.loginUrl ? "Already a member? Log in" : `Already a member? Visit ${firm.buttonName ?? firm.name}`}
        <span aria-hidden className="ml-1 text-xs font-normal no-underline">↗</span>
      </a>

      {helperOpen && !joined && (
        <div>
          {helper}
          <button
            type="button"
            onClick={onCloseHelper}
            className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-muted underline"
          >
            Hide fill helper
          </button>
        </div>
      )}
    </article>
  );
}
