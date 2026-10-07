"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import {
  CONSENT_CHECKLIST,
  VAULT_SECTIONS,
  fieldValue,
  loadVault,
  maskValue,
  vaultProgress,
  type VaultData,
  type VaultFieldDef,
} from "@/lib/vault";

type Props = {
  profile: Profile;
  firmName: string;
  /** Render without its own card chrome (inside the "How to sign up" box). */
  embedded?: boolean;
};

/**
 * "Fill this screener" v0 — copy-only helper on study detail.
 * Consent checklist first, then everyday tap-to-copy chips; sensitive fields
 * need a per-field "Show & copy" confirm. Never autofills firm sites.
 */
export function FillScreenerHelper({ profile, firmName, embedded = false }: Props) {
  const [vault, setVault] = useState<VaultData>({ fields: {} });
  const [vaultReady, setVaultReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(
    () => CONSENT_CHECKLIST.map(() => false)
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedSensitive, setRevealedSensitive] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setVault(loadVault());
    setVaultReady(true);
  }, []);

  // Re-read vault when the sheet opens (user may have edited /vault in another tab).
  useEffect(() => {
    if (open) setVault(loadVault());
  }, [open]);

  const progress = useMemo(
    () => vaultProgress(profile, vault),
    [profile, vault]
  );
  const empty = progress.filled === 0;
  const allConsented = checked.every(Boolean);

  const answers = useMemo(() => {
    const list: { def: VaultFieldDef; value: string }[] = [];
    for (const section of VAULT_SECTIONS) {
      for (const def of section.fields) {
        const value = fieldValue(def, profile, vault);
        if (value) list.push({ def, value });
      }
    }
    return list;
  }, [profile, vault]);

  const everyday = answers.filter((a) => a.def.sensitivity === "everyday");
  const sensitive = answers.filter((a) => a.def.sensitivity === "sensitive");

  async function copyValue(key: string, value: string) {
    if (!value || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur));
      }, 1500);
    } catch {
      // Clipboard may be unavailable outside a secure context.
    }
  }

  function toggleCheck(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function closeSheet() {
    setOpen(false);
    setChecked(CONSENT_CHECKLIST.map(() => false));
    setRevealedSensitive({});
    setCopiedKey(null);
  }

  if (!vaultReady) return null;

  return (
    <section
      className={
        embedded
          ? "mt-4 border-t border-sage-100 pt-4"
          : "mt-5 rounded-2xl border border-sage-100 bg-white p-4"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sage-900">
            Fill this screener
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Copy your saved answers, then paste into {firmName}&apos;s form.
            We never autofill or submit for you.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-3.5 text-sm font-semibold text-white hover:bg-sage-800"
          >
            Open
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-stone-100 pt-4">
          {empty ? (
            <div className="rounded-xl border border-dashed border-sage-300 bg-sage-50/50 px-4 py-5 text-center">
              <p className="font-medium text-sage-900">Your vault is empty</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-stone-600">
                Save the usual screener answers once, then copy them here when
                you apply.
              </p>
              <Link
                href="/vault"
                className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800"
              >
                Set up your vault
              </Link>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Consent for this screener
                </p>
                <ul className="mt-2.5 space-y-2.5">
                  {CONSENT_CHECKLIST.map((item, i) => (
                    <li key={item}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          checked={checked[i]}
                          onChange={() => toggleCheck(i)}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 text-sage-700 focus:ring-sage-600"
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              {!allConsented ? (
                <p className="text-xs text-stone-500">
                  Tick all four to unlock your copy chips. Sensitive answers
                  still need a separate confirm each time.
                </p>
              ) : (
                <div className="space-y-4">
                  {everyday.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Everyday · tap to copy
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {everyday.map(({ def, value }) => (
                          <CopyChip
                            key={def.key}
                            label={def.label}
                            value={value}
                            copied={copiedKey === def.key}
                            onCopy={() => copyValue(def.key, value)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {sensitive.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Sensitive · confirm each field
                      </p>
                      <ul className="mt-2 space-y-2">
                        {sensitive.map(({ def, value }) => {
                          const shown = !!revealedSensitive[def.key];
                          return (
                            <li
                              key={def.key}
                              className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-amber-900">
                                  {def.label}
                                </p>
                                <p className="truncate text-sm text-stone-800">
                                  {shown ? value : maskValue(value)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!shown) {
                                    setRevealedSensitive((r) => ({
                                      ...r,
                                      [def.key]: true,
                                    }));
                                  }
                                  void copyValue(def.key, value);
                                }}
                                className="shrink-0 inline-flex min-h-11 items-center rounded-lg border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-950 hover:bg-amber-50"
                              >
                                {copiedKey === def.key
                                  ? "Copied"
                                  : shown
                                    ? "Copy"
                                    : "Show & copy"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {everyday.length === 0 && sensitive.length === 0 && (
                    <p className="text-sm text-stone-600">
                      No saved answers yet.{" "}
                      <Link
                        href="/vault"
                        className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline"
                      >
                        Add details in your vault
                      </Link>
                      .
                    </p>
                  )}

                  <p className="text-xs leading-relaxed text-stone-500">
                    Paste into the firm&apos;s form yourself, check every
                    answer, and press their Submit.{" "}
                    <Link
                      href="/vault"
                      className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline"
                    >
                      Edit vault
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={closeSheet}
            className="min-h-11 w-full text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            Close
          </button>
        </div>
      )}
    </section>
  );
}

function CopyChip({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label}: ${value}`}
      className="inline-flex max-w-full flex-col items-start rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-left transition hover:bg-sage-100"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-sage-700">
        {copied ? "Copied" : label}
      </span>
      <span className="max-w-[14rem] truncate text-sm font-medium text-stone-900">
        {value}
      </span>
    </button>
  );
}
