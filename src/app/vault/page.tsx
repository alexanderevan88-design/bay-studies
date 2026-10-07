"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useProfile } from "@/hooks/useProfile";
import {
  CONSENT_CHECKLIST,
  VAULT_SECTIONS,
  clearVault,
  fieldValue,
  loadVault,
  maskValue,
  saveVault,
  sectionProgress,
  vaultProgress,
  type VaultData,
  type VaultFieldDef,
  type VaultFieldKey,
  type VaultSection,
} from "@/lib/vault";

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 focus:border-sage-600";

export default function VaultPage() {
  const { profile, ready } = useProfile();
  const [vault, setVault] = useState<VaultData>({ fields: {} });
  const [vaultReady, setVaultReady] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setVault(loadVault());
    setVaultReady(true);
  }, []);

  if (!ready || !vaultReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  const progress = vaultProgress(profile, vault);
  const empty = progress.filled === 0;

  function saveSection(fields: VaultData["fields"]) {
    const next: VaultData = {
      fields: { ...vault.fields, ...fields },
      updatedAt: new Date().toISOString(),
    };
    setVault(next);
    saveVault(next);
  }

  return (
    <AppShell>
      <header className="px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Logo size="sm" />
          <Link
            href="/me"
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-sage-700 hover:underline"
          >
            ← Me
          </Link>
        </div>
        <h1 className="mt-4 font-serif text-3xl font-semibold text-sage-900">
          Profile vault
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Answer the usual screener questions once, then reuse them when you
          apply to firm studies. Your answers stay on this device, and nothing
          goes to a firm until you confirm it.
        </p>
      </header>

      <div className="space-y-3 px-5 pb-10">
        <section className="rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-amber-50/40 p-4">
          <p className="text-sm leading-relaxed text-stone-700">
            <span className="font-semibold text-sage-900">
              The studies feed is free for everyone.
            </span>{" "}
            Signing up is optional. It saves you time on firm applications,
            and members will get exclusive Bay Studies projects later.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Accounts aren&apos;t live yet — for now your vault works on this
            device, no signup needed.
          </p>
        </section>

        {empty ? (
          <section className="rounded-2xl border border-dashed border-sage-300 bg-white px-4 py-6 text-center">
            <p className="font-serif text-lg font-semibold text-sage-900">
              Your vault is empty
            </p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-stone-600">
              Add a few details and the next screener goes a lot faster. Skip
              anything you&apos;d rather not share.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen("contact")}
                className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800"
              >
                Add your details
              </button>
              <Link
                href="/onboarding/about"
                className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 underline"
              >
                Or start with About you
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-sage-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-800">
                {progress.filled} of {progress.total} details saved
              </p>
              <p className="text-xs text-stone-500">Skip anything you like</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sage-50">
              <div
                className="h-full rounded-full bg-sage-600"
                style={{
                  width: `${Math.round((progress.filled / progress.total) * 100)}%`,
                }}
              />
            </div>
          </section>
        )}

        {VAULT_SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            open={open === section.id}
            onToggle={() =>
              setOpen((cur) => (cur === section.id ? null : section.id))
            }
            progress={sectionProgress(section, profile, vault)}
            valueOf={(f) => fieldValue(f, profile, vault)}
            vaultFields={vault.fields}
            onSave={saveSection}
          />
        ))}

        <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          <p className="text-sm font-semibold text-stone-800">ID numbers</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            We don&apos;t store driver&apos;s license, passport, or Social
            Security numbers. If a firm needs ID, you show it to them directly.
          </p>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Fill this screener
            </p>
            <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-semibold text-sage-800">
              Live on study pages
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            On any study&apos;s detail page, tap{" "}
            <strong className="font-semibold text-stone-800">
              Fill this screener
            </strong>
            , tick the checklist, then copy everyday answers as chips.
            Sensitive fields need a per-field &ldquo;Show &amp; copy&rdquo;.
            Copy-only for now — we never autofill firm sites.
          </p>
          <ul className="mt-3 space-y-2">
            {CONSENT_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-stone-700">
                <span
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-stone-300 bg-white"
                />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-500">
            We never submit for you, and sensitive answers are never sent
            without you saying yes each time.
          </p>
          <Link
            href="/feed"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-sage-800 underline"
          >
            Browse studies →
          </Link>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-sage-50/80 p-4">
          <p className="text-sm leading-relaxed text-stone-700">
            <span className="font-semibold text-sage-900">
              We never sell your data.
            </span>{" "}
            Your vault is only used to help you apply to studies you chose.
          </p>
          <Link
            href="/privacy"
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-sage-800 underline"
          >
            Privacy &amp; about →
          </Link>
        </section>

        {!empty && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Clear vault-only details on this device? About you and contact details on Me stay put."
                )
              ) {
                clearVault();
                setVault({ fields: {} });
              }
            }}
            className="min-h-11 w-full py-3 text-sm font-medium text-rose-700 hover:text-rose-900"
          >
            Clear vault details
          </button>
        )}
      </div>
    </AppShell>
  );
}

function SectionCard({
  section,
  open,
  onToggle,
  progress,
  valueOf,
  vaultFields,
  onSave,
}: {
  section: VaultSection;
  open: boolean;
  onToggle: () => void;
  progress: { filled: number; total: number };
  valueOf: (f: VaultFieldDef) => string;
  vaultFields: VaultData["fields"];
  onSave: (fields: VaultData["fields"]) => void;
}) {
  const [draft, setDraft] = useState<VaultData["fields"]>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const initial: VaultData["fields"] = {};
      for (const f of section.fields) {
        if (f.source === "vault") {
          const k = f.key as VaultFieldKey;
          initial[k] = vaultFields[k] ?? "";
        }
      }
      setDraft(initial);
      setSaved(false);
    }
    // Re-seed only when the section opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const done = progress.filled === progress.total;

  return (
    <section className="rounded-2xl border border-sage-100 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-medium text-stone-900">{section.title}</p>
          <p className="mt-0.5 text-sm text-stone-500">{section.blurb}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            done
              ? "bg-sage-100 text-sage-800"
              : progress.filled === 0
                ? "bg-stone-100 text-stone-600"
                : "bg-amber-50 text-amber-900"
          }`}
        >
          {progress.filled === 0 ? "Add" : `${progress.filled}/${progress.total}`}
        </span>
      </button>

      {open && (
        <form
          className="space-y-4 border-t border-stone-100 px-4 pb-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const cleaned: VaultData["fields"] = {};
            for (const [k, v] of Object.entries(draft)) {
              cleaned[k as VaultFieldKey] = (v ?? "").trim();
            }
            onSave(cleaned);
            setSaved(true);
          }}
        >
          {section.fields.map((f) => {
            const sensitive = f.sensitivity === "sensitive";
            const label = (
              <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
                {f.label}
                {sensitive && (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                    Sensitive · we ask each time
                  </span>
                )}
              </span>
            );

            if (f.source === "profile") {
              const v = valueOf(f);
              const show = !sensitive || revealed[f.key];
              return (
                <div key={f.key}>
                  {label}
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-stone-100 bg-stone-50/80 px-3.5 py-0.5 text-sm">
                    <span className={v ? "text-stone-800" : "italic text-stone-400"}>
                      {v ? (show ? v : maskValue(v)) : "Not set"}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {v && sensitive && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealed((r) => ({ ...r, [f.key]: !r[f.key] }))
                          }
                          className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-stone-600 underline"
                        >
                          {show ? "Hide" : "Show"}
                        </button>
                      )}
                      <Link
                        href="/onboarding/about"
                        className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-sage-800 underline"
                      >
                        {v ? "Edit" : "Add"}
                      </Link>
                    </span>
                  </div>
                </div>
              );
            }

            const k = f.key as VaultFieldKey;
            const value = draft[k] ?? "";
            const set = (val: string) => {
              setSaved(false);
              setDraft((d) => ({ ...d, [k]: val }));
            };
            return (
              <label key={f.key} className="block">
                {label}
                {f.options ? (
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Skip for now</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value}
                    placeholder={f.placeholder}
                    autoComplete={
                      k === "fullName"
                        ? "name"
                        : k === "streetAddress"
                          ? "street-address"
                          : "off"
                    }
                    onChange={(e) => set(e.target.value)}
                    className={inputClass}
                  />
                )}
              </label>
            );
          })}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800"
            >
              Save {section.title.toLowerCase()}
            </button>
            {saved && (
              <span className="text-sm font-medium text-sage-700">
                Saved on this device
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
