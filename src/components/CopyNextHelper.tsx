"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { CONSENT_CHECKLIST, loadVault, maskValue, type VaultData } from "@/lib/vault";
import {
  buildSteps,
  clearProgress,
  copyText,
  loadProgress,
  saveProgress,
  type PilotFirm,
} from "@/lib/copyNext";

/**
 * Phone "Copy next" helper for pilot firms. One tap copies the next saved
 * answer in that firm's usual order. Device only, no telemetry; progress
 * (field keys only) survives tab switches via localStorage.
 */
export function CopyNextHelper({
  profile,
  firm,
  studyId,
  mode = "study",
}: {
  profile: Profile;
  firm: PilotFirm;
  /** Progress key. Study id, or "signup:<firmId>" in signup mode. */
  studyId: string;
  /** "signup" = joining the firm's panel (setup page), not a study screener. */
  mode?: "study" | "signup";
}) {
  const formName = mode === "signup" ? `${firm.name}’s signup form` : `${firm.name}’s form`;
  const [vault, setVault] = useState<VaultData>({ fields: {} });
  const [ready, setReady] = useState(false);
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [consented, setConsented] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(() => CONSENT_CHECKLIST.map(() => false));
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const reload = useCallback(() => {
    setVault(loadVault());
    const p = loadProgress(studyId);
    if (p) {
      setNextKey(p.nextKey);
      setCopied(p.copied);
      setSkipped(p.skipped);
      setConsented(p.consented);
    }
    setReady(true);
  }, [studyId]);

  useEffect(() => {
    reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", reload);
    window.addEventListener("pageshow", reload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", reload);
    };
  }, [reload]);

  const steps = useMemo(() => buildSteps(firm, profile, vault), [firm, profile, vault]);

  // Resolve where we are. "" = finished.
  let index: number;
  if (nextKey === "") index = steps.length;
  else {
    const at = nextKey ? steps.findIndex((s) => s.key === nextKey) : -1;
    index =
      at >= 0
        ? at
        : Math.max(
            0,
            steps.findIndex((s) => !copied.includes(s.key) && !skipped.includes(s.key))
          );
    if (at < 0 && steps.every((s) => copied.includes(s.key) || skipped.includes(s.key)) && copied.length + skipped.length > 0) {
      index = steps.length;
    }
  }
  const done = steps.length > 0 && index >= steps.length;
  const step = done ? null : steps[index];
  const following = done ? null : steps[index + 1] ?? null;

  function persist(next: { nextKey: string; copied: string[]; skipped: string[]; consented: boolean }) {
    setNextKey(next.nextKey);
    setCopied(next.copied);
    setSkipped(next.skipped);
    setConsented(next.consented);
    setRevealed(false);
    saveProgress(studyId, next);
  }

  function goTo(i: number, extra?: { copied?: string[]; skipped?: string[] }) {
    const key = i >= steps.length ? "" : steps[i].key;
    persist({
      nextKey: key,
      copied: extra?.copied ?? copied,
      skipped: extra?.skipped ?? skipped,
      consented,
    });
  }

  async function copyCurrent() {
    if (!step) return;
    if (step.sensitive && !revealed) {
      setRevealed(true);
      return;
    }
    const ok = await copyText(step.value);
    if (!ok) {
      setFlash("Couldn’t copy. Press and hold the answer to copy it.");
      setRevealed(true);
      return;
    }
    setFlash(`Copied ${lc(step.label)}. Paste it on ${formName}, then come back.`);
    goTo(index + 1, {
      copied: copied.includes(step.key) ? copied : [...copied, step.key],
      skipped: skipped.filter((k) => k !== step.key),
    });
  }

  function skip() {
    if (!step) return;
    setFlash(`Skipped ${lc(step.label)}.`);
    goTo(index + 1, { skipped: skipped.includes(step.key) ? skipped : [...skipped, step.key] });
  }

  function back() {
    setFlash(null);
    goTo(Math.max(0, index - 1));
  }

  function restart() {
    clearProgress(studyId);
    setFlash(null);
    persist({ nextKey: steps[0]?.key ?? "", copied: [], skipped: [], consented });
  }

  if (!ready) return null;

  const box = "mt-4 rounded-2xl bg-bay-tint p-3.5";
  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-bay">Fill helper: Copy next</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-600">
          Tap to copy each answer in {firm.name}’s usual order, then paste it
          into their {mode === "signup" ? "signup form" : "form"}. It stays on your phone.
        </p>
      </div>
      {steps.length > 0 && consented && (
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-bay">
          {Math.min(index, steps.length)}/{steps.length}
        </span>
      )}
    </div>
  );

  if (steps.length === 0) {
    return (
      <section className={box} aria-label="Fill helper">
        {header}
        <div className="mt-3 rounded-xl bg-white px-3.5 py-4 text-center">
          <p className="font-semibold text-ink">Your vault is empty</p>
          <p className="mt-1 text-sm text-muted">
            Save your usual answers once, and this helper will walk you through
            them here.
          </p>
          <Link
            href="/vault"
            className="mt-3 inline-flex min-h-11 items-center rounded-[14px] bg-bay px-4 text-sm font-bold text-white"
          >
            Set up your vault
          </Link>
        </div>
      </section>
    );
  }

  if (!consented) {
    const all = checks.every(Boolean);
    return (
      <section className={box} aria-label="Fill helper">
        {header}
        <ul className="mt-3 space-y-1">
          {CONSENT_CHECKLIST.map((raw) => ({ raw, item: mode === "signup" ? raw.replace("this screener", "this signup form") : raw })).map(({ item }, i) => (
            <li key={item}>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#2D6A87]"
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!all}
          onClick={() =>
            persist({ nextKey: nextKey ?? steps[0].key, copied, skipped, consented: true })
          }
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[14px] bg-bay px-4 text-base font-bold text-white transition disabled:opacity-50"
        >
          {all ? `Start: ${steps.length} saved answers` : "Tick all four to start"}
        </button>
      </section>
    );
  }

  return (
    <section className={box} aria-label="Fill helper">
      {header}

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white" aria-hidden>
        <div
          className="h-full rounded-full bg-bay transition-[width] duration-200"
          style={{ width: `${Math.round((Math.min(index, steps.length) / steps.length) * 100)}%` }}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {flash ?? ""}
      </p>
      {flash && (
        <p className="mt-2.5 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-cash">
          ✓ {flash}
        </p>
      )}

      {step ? (
        <div
          className={`mt-2.5 rounded-xl border bg-white px-3.5 py-3 ${
            step.sensitive ? "border-amber-200" : "border-bay/20"
          }`}
        >
          <p className="text-xs font-semibold text-muted">
            Up next · {index + 1} of {steps.length}
          </p>
          <p className="mt-0.5 font-display text-xl font-bold text-ink">{step.label}</p>
          <p className="mt-1 select-all break-words text-[15px] text-stone-800">
            {step.sensitive && !revealed ? maskValue(step.value) : step.value}
          </p>
          {step.sensitive && (
            <p className="mt-1.5 text-xs font-semibold text-amber-900">
              Sensitive · {revealed ? "tap again to copy" : "we ask each time"}
            </p>
          )}
          <button
            type="button"
            onClick={copyCurrent}
            className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[14px] px-4 text-base font-bold transition active:scale-[0.99] ${
              step.sensitive
                ? "border border-amber-300 bg-amber-50 text-amber-950"
                : "bg-bay text-white hover:opacity-90"
            }`}
          >
            {step.sensitive
              ? revealed
                ? `Copy ${lc(step.label)}`
                : `Show & copy ${lc(step.label)}`
              : `Copy ${lc(step.label)}`}
          </button>
          <p className="mt-2 text-xs text-muted">
            {following ? (
              <>
                Then: <span className="font-semibold text-ink">{following.label}</span>
              </>
            ) : (
              "That’s the last one."
            )}
          </p>
        </div>
      ) : (
        <div className="mt-2.5 rounded-xl border border-bay/20 bg-white px-3.5 py-3">
          <p className="font-display text-xl font-bold text-ink">All done</p>
          <p className="mt-1 text-sm text-muted">
            {copied.length} copied{skipped.length ? `, ${skipped.length} skipped` : ""}.
            Check every answer on {formName}, then press their Submit
            yourself.
          </p>
        </div>
      )}

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-bay/25 bg-white text-sm font-semibold text-bay disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={!step}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-bay/25 bg-white text-sm font-semibold text-bay disabled:opacity-40"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-bay/25 bg-white text-sm font-semibold text-bay"
        >
          Jump to…
        </button>
      </div>

      {showAll && (
        <ol className="mt-2.5 divide-y divide-bay/10 overflow-hidden rounded-xl bg-white">
          {steps.map((s, i) => {
            const status = copied.includes(s.key)
              ? "Copied"
              : skipped.includes(s.key)
                ? "Skipped"
                : i === index
                  ? "Up next"
                  : "";
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => {
                    setFlash(null);
                    goTo(i);
                    setShowAll(false);
                  }}
                  aria-current={i === index ? "step" : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left text-sm ${
                    i === index ? "bg-bay-tint/60" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      status === "Copied"
                        ? "bg-cash-tint text-cash"
                        : status === "Skipped"
                          ? "bg-stone-100 text-stone-500"
                          : "bg-bay-tint text-bay"
                    }`}
                  >
                    {status === "Copied" ? "✓" : status === "Skipped" ? "–" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{s.label}</span>
                    <span className="block truncate text-xs text-muted">
                      {s.sensitive ? `${maskValue(s.value)} · sensitive` : s.value}
                    </span>
                  </span>
                  {status && <span className="shrink-0 text-xs font-semibold text-muted">{status}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted">
        <span>{firm.tip} Blank answers are skipped.</span>
        <span className="flex gap-3">
          <button
            type="button"
            onClick={restart}
            className="inline-flex min-h-11 items-center font-semibold text-bay underline"
          >
            Start over
          </button>
          <Link href="/vault" className="inline-flex min-h-11 items-center font-semibold text-bay underline">
            Edit vault
          </Link>
        </span>
      </div>
    </section>
  );
}

/** "Date of birth" -> "date of birth", but keep "ZIP" / "Phone / OS". */
function lc(label: string): string {
  return label.replace(/\b([A-Z])([a-z])/g, (_m, a: string, b: string) => a.toLowerCase() + b);
}
