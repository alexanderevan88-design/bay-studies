"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useProfile } from "@/hooks/useProfile";
import { formatDuration } from "@/lib/match";
import {
  clearVault,
  loadVault,
  vaultProgress,
  type VaultData,
} from "@/lib/vault";
import {
  EMPLOYMENT_LABELS,
  GENDER_LABELS,
  METRO_LABELS,
  STUDY_TYPE_LABELS,
  type Study,
} from "@/lib/types";

export default function MePage() {
  const { profile, ready, reset } = useProfile();
  const { studies, ready: studiesReady } = useFeedStudies();
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);
  const [vault, setVault] = useState<VaultData>({ fields: {} });

  useEffect(() => {
    setVault(loadVault());
  }, []);

  const savedStudies = useMemo(
    () =>
      profile.savedStudyIds
        .map((id) => studies.find((s) => s.id === id))
        .filter((s): s is Study => Boolean(s)),
    [profile.savedStudyIds, studies]
  );

  const appliedStudies = useMemo(
    () =>
      profile.appliedStudyIds
        .map((id) => studies.find((s) => s.id === id))
        .filter((s): s is Study => Boolean(s)),
    [profile.appliedStudyIds, studies]
  );

  async function copyField(field: "phone" | "email", value: string) {
    if (!value || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => {
        setCopied((c) => (c === field ? null : c));
      }, 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  if (!ready || !studiesReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  const missing: { label: string; href: string }[] = [];
  if (!profile.metro) missing.push({ label: "Metro", href: "/" });
  if (profile.age === "")
    missing.push({ label: "Age", href: "/onboarding/about" });
  if (!profile.zip || profile.zip.length < 5)
    missing.push({ label: "ZIP", href: "/onboarding/about" });
  if (!profile.phone)
    missing.push({ label: "Phone", href: "/onboarding/about" });
  if (!profile.email)
    missing.push({ label: "Email", href: "/onboarding/about" });
  if (!profile.onboarded || profile.studyTypes.length === 0)
    missing.push({ label: "Preferences", href: "/onboarding/preferences" });

  const profileIncomplete =
    !profile.onboarded || !profile.metro || profile.age === "";
  const contactGaps = !profile.phone || !profile.email;

  return (
    <AppShell>
      <header className="px-5 pb-4 pt-3">
        <Logo size="sm" />
        <p className="mt-5 text-[13px] font-semibold text-muted">Me</p>
        <h1 className="mt-0.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink">
          Your Bay Studies
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Everything here stays on this phone. Edit anytime, no account needed.
        </p>
      </header>

      <div className="space-y-3 px-5 pb-10">
        {(profileIncomplete || missing.length > 0) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-950">
              {profileIncomplete
                ? "Profile incomplete"
                : "A few details still help"}
            </p>
            <p className="mt-1 text-sm text-amber-900/80">
              {profileIncomplete
                ? "Finish setup for better matches and alerts."
                : "Phone and email make screeners faster to paste."}
            </p>
            {missing.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {missing.map((m) => (
                  <li key={m.label}>
                    <Link
                      href={m.href}
                      className="inline-flex min-h-11 items-center rounded-full border border-amber-300/80 bg-white/80 px-2.5 text-xs font-semibold text-amber-950"
                    >
                      + {m.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={
                profileIncomplete
                  ? "/onboarding/about"
                  : contactGaps
                    ? "/onboarding/about"
                    : "/onboarding/preferences"
              }
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-3.5 text-sm font-semibold text-white"
            >
              {profileIncomplete ? "Continue setup" : "Add missing details"}
            </Link>
          </div>
        )}

        <section className="rounded-[20px] border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Profile
              </p>
              <p className="mt-1 font-medium text-stone-900">
                {profile.metro
                  ? METRO_LABELS[profile.metro]
                  : "Metro not set"}
                {profile.age !== "" ? ` · ${profile.age}` : ""}
                {profile.gender
                  ? ` · ${GENDER_LABELS[profile.gender]}`
                  : ""}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {profile.zip ? `ZIP ${profile.zip}` : "No ZIP"}
                {profile.employment
                  ? ` · ${EMPLOYMENT_LABELS[profile.employment]}`
                  : ""}
              </p>
              {profile.languages.length > 0 && (
                <p className="mt-1 text-sm text-stone-500">
                  {profile.languages.join(", ")}
                </p>
              )}
            </div>
            <Link
              href="/onboarding/about"
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-sage-50 px-3 text-sm font-semibold text-sage-800"
            >
              Edit about
            </Link>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Contact for screeners
            </p>
            <ContactRow
              label="Phone"
              value={profile.phone}
              copied={copied === "phone"}
              onCopy={() => copyField("phone", profile.phone)}
            />
            <ContactRow
              label="Email"
              value={profile.email}
              copied={copied === "email"}
              onCopy={() => copyField("email", profile.email)}
            />
            {contactGaps && (
              <Link
                href="/onboarding/about"
                className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 underline"
              >
                Add missing phone or email →
              </Link>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/onboarding/preferences"
              className="inline-flex min-h-11 items-center rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-800"
            >
              Edit preferences
            </Link>
            <Link
              href="/alerts"
              className="inline-flex min-h-11 items-center rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-800"
            >
              Alerts
            </Link>
            <Link
              href="/about/verify"
              className="inline-flex min-h-11 items-center rounded-lg border border-sage-200 bg-sage-50 px-3 text-sm font-medium text-sage-800"
            >
              How we verify
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-800"
            >
              Privacy
            </Link>
          </div>
        </section>

        <VaultCard {...vaultProgress(profile, vault)} />

        <section className="overflow-hidden rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-amber-50/40 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-sage-600">
            Laptop day
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-sage-900">
            Deploy + Mailgun
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            Short path to a public ingest address so firm invites hit the app.
            Skip for local demo — fixtures +{" "}
            <code className="rounded bg-white/80 px-1 text-xs">
              /api/inbound/dev
            </code>{" "}
            work offline.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-stone-700">
            <li>Deploy (Vercel preferred) and note your HTTPS URL.</li>
            <li>
              Create Mailgun + receiving domain; set{" "}
              <code className="break-all rounded bg-white/80 px-1 text-xs">
                INBOUND_WEBHOOK_SECRET
              </code>
              .
            </li>
            <li>
              Point a Receiving route at{" "}
              <code className="break-all rounded bg-white/80 px-1 text-xs">
                /api/inbound?secret=…
              </code>
              .
            </li>
            <li>
              Sign the first firms with your ingest email, then Approve on
              Ingest.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/setup"
              className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800"
            >
              Open deploy checklist
            </Link>
            <Link
              href="/admin/firms"
              className="inline-flex min-h-11 items-center rounded-xl border border-sage-200 bg-white px-4 text-sm font-semibold text-sage-800 hover:bg-sage-50"
            >
              First firms
            </Link>
          </div>
        </section>

        <section className="rounded-[20px] border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Saved
            </p>
            <Link
              href="/feed?tab=saved"
              className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 hover:underline"
            >
              View all
            </Link>
          </div>
          {savedStudies.length === 0 ? (
            <EmptyList
              title="No saved studies"
              hint="Heart a study on its detail page."
              href="/feed"
              cta="Browse feed"
            />
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {savedStudies.slice(0, 5).map((s) => (
                <StudyRow key={s.id} study={s} badge="Saved" />
              ))}
            </ul>
          )}
          {savedStudies.length > 5 && (
            <Link
              href="/feed?tab=saved"
              className="mt-2 block text-center text-xs font-medium text-sage-800"
            >
              +{savedStudies.length - 5} more
            </Link>
          )}
        </section>

        <section className="rounded-[20px] border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Applied
            </p>
            <Link
              href="/feed?tab=applied"
              className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 hover:underline"
            >
              View all
            </Link>
          </div>
          {appliedStudies.length === 0 ? (
            <EmptyList
              title="No applications yet"
              hint="Opening a screener marks it Applied."
              href="/feed"
              cta="Find a study"
            />
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {appliedStudies.slice(0, 5).map((s) => (
                <StudyRow key={s.id} study={s} badge="Applied" />
              ))}
            </ul>
          )}
          {appliedStudies.length > 5 && (
            <Link
              href="/feed?tab=applied"
              className="mt-2 block text-center text-xs font-medium text-sage-800"
            >
              +{appliedStudies.length - 5} more
            </Link>
          )}
        </section>

        <section className="rounded-[20px] border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Activity
          </p>
          <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
            <li className="rounded-xl bg-rose-50 px-2 py-3">
              <p className="text-lg font-semibold text-rose-800">
                {profile.savedStudyIds.length}
              </p>
              <p className="text-xs font-medium text-rose-800/80">Saved</p>
            </li>
            <li className="rounded-xl bg-sky-50 px-2 py-3">
              <p className="text-lg font-semibold text-sky-800">
                {profile.appliedStudyIds.length}
              </p>
              <p className="text-xs font-medium text-sky-800/80">Applied</p>
            </li>
            <li className="rounded-xl bg-stone-100 px-2 py-3">
              <p className="text-lg font-semibold text-stone-800">
                {profile.dismissedStudyIds.length}
              </p>
              <p className="text-xs font-medium text-stone-600">
                Dismissed
              </p>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-sage-50/80 p-4">
          <h2 className="font-display text-lg font-semibold text-sage-900">
            How we verify sources
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Allowlisted From domains, firm apply links, pay + time upfront,
            verified badges, and a human gate for new domains. We never charge
            a fee — you finish on the firm&apos;s own screener.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href="/about/verify"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-sage-800 underline"
            >
              Trust checklist →
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-sage-800 underline"
            >
              Privacy &amp; about →
            </Link>
          </div>
          <p className="mt-3 text-sm font-medium text-sage-800">
            No fee. Ever.
          </p>
        </section>

        <button
          type="button"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm("Clear local profile and vault, and start over?")
            ) {
              reset();
              clearVault();
              window.location.href = "/";
            }
          }}
          className="min-h-11 w-full py-3 text-sm font-medium text-rose-700 hover:text-rose-900"
        >
          Clear local profile
        </button>
      </div>
    </AppShell>
  );
}

function VaultCard({ filled, total }: { filled: number; total: number }) {
  const empty = filled === 0;
  return (
    <section className="rounded-[20px] border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Profile vault
          </p>
          <p className="mt-1 font-medium text-stone-900">
            {empty
              ? "Save time on firm applications"
              : `${filled} of ${total} screener details saved`}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {empty
              ? "Answer the usual screener questions once. Nothing goes to a firm until you confirm it."
              : "Stays on this device. You confirm before anything is shared."}
          </p>
        </div>
        <Link
          href="/vault"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
            empty ? "bg-sage-700 text-white" : "bg-sage-50 text-sage-800"
          }`}
        >
          {empty ? "Add details" : "Open vault"}
        </Link>
      </div>
    </section>
  );
}

function ContactRow({
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
  if (!value) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-stone-500">
          {label}: <span className="italic">not set</span>
        </span>
        <Link
          href="/onboarding/about"
          className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 underline"
        >
          Add
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate text-stone-800">
        <span className="text-stone-500">{label}: </span>
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-sage-200 bg-white px-2.5 text-xs font-semibold text-sage-800"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function StudyRow({
  study,
  badge,
}: {
  study: Study;
  badge: "Saved" | "Applied";
}) {
  return (
    <li>
      <Link
        href={`/studies/${study.id}`}
        className="flex min-h-11 items-start justify-between gap-3 py-3 hover:opacity-90"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-900">
            {study.title}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            ${study.pay} · {formatDuration(study.durationMinutes)} ·{" "}
            {STUDY_TYPE_LABELS[study.type]} · {study.firm}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            badge === "Applied"
              ? "bg-sky-50 text-sky-800"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {badge}
        </span>
      </Link>
    </li>
  );
}

function EmptyList({
  title,
  hint,
  href,
  cta,
}: {
  title: string;
  hint: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-center">
      <p className="text-sm font-medium text-stone-800">{title}</p>
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
      <Link
        href={href}
        className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 underline"
      >
        {cta}
      </Link>
    </div>
  );
}
