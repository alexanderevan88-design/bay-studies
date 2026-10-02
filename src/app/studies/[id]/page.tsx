"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TrustLine } from "@/components/TrustLine";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import {
  computeMatchPercent,
  explainMatch,
  formatDuration,
  isProfileMatch,
} from "@/lib/match";
import { bumpOpen } from "@/lib/analytics";
import { STUDY_TYPE_LABELS } from "@/lib/types";

export default function StudyDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getById, ready: studiesReady } = useFeedStudies();
  const study = getById(id);
  const { profile, ready, toggleSaved, dismissStudy, markApplied } =
    useProfile();
  const { seeMatch, isNewMatch } = useNotifications();
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);

  async function copyToClipboard(field: CopyField, value: string) {
    if (!value || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1500);
    } catch {
      // Clipboard access can be unavailable outside a secure browser context.
    }
  }

  useEffect(() => {
    if (study && isProfileMatch(study, profile)) {
      seeMatch(study.id);
    }
  }, [study, profile, seeMatch]);

  useEffect(() => {
    if (study) {
      bumpOpen();
    }
    // Count once per study id mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.id]);

  if (!ready || !studiesReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  if (!study) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="font-serif text-xl text-sage-900">Study not found</p>
          <Link
            href="/feed"
            className="mt-4 inline-block text-sm font-semibold text-sage-700"
          >
            ← Back to feed
          </Link>
        </div>
      </AppShell>
    );
  }

  const match = computeMatchPercent(study, profile);
  const reasons = explainMatch(study, profile);
  const saved = profile.savedStudyIds.includes(study.id);
  const applied = profile.appliedStudyIds.includes(study.id);
  const matched = isProfileMatch(study, profile);
  const neu = isNewMatch(study.id, matched);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-sage-800 hover:bg-sage-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => toggleSaved(study.id)}
          aria-label={saved ? "Unsave" : "Save"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sage-800 hover:bg-sage-50"
        >
          <svg
            className="h-6 w-6"
            fill={saved ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
          </svg>
        </button>
      </header>

      <div className="px-5 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {study.verified && <VerifiedBadge href="/about/verify" />}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              profile.onboarded
                ? "bg-sage-100 text-sage-800"
                : "bg-stone-100 text-stone-500"
            }`}
            title={
              profile.onboarded
                ? "Soft score from your age, metro, prefs, and pay floor"
                : "Complete your profile for a personal match %"
            }
          >
            {profile.onboarded ? `${match}% match` : "Match TBD"}
          </span>
          {neu && (
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-violet-800">
              New match
            </span>
          )}
          {study.expired && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              Link expired
            </span>
          )}
          {study.id.startsWith("pub-") && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-900 ring-1 ring-inset ring-violet-300/70"
              title="Published from an inbound firm email"
            >
              <svg
                className="h-3 w-3 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              From email
            </span>
          )}
          {applied && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">
              Applied
            </span>
          )}
        </div>

        <p className="mt-4 text-2xl font-semibold tracking-tight text-sage-900">
          ${study.pay}{" "}
          <span className="text-lg font-normal text-stone-500">
            · ~{formatDuration(study.durationMinutes)}
          </span>
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {STUDY_TYPE_LABELS[study.type]} ·{" "}
          {study.modality === "remote" ? "Remote" : "In-person"}
        </p>

        <h1 className="mt-4 font-serif text-2xl font-semibold leading-snug text-stone-900">
          {study.title}
        </h1>
        <p className="mt-2 text-sm font-medium text-sage-800">
          {study.firm} · {study.location}
        </p>

        <dl className="mt-6 space-y-3 rounded-2xl border border-sage-100 bg-white p-4 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              When
            </dt>
            <dd className="mt-0.5 text-stone-800">{study.when}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Where
            </dt>
            <dd className="mt-0.5 text-stone-800">
              {study.address ?? study.location}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              You may match
            </dt>
            <dd className="mt-0.5 text-stone-800">
              {study.eligibility.notes}
            </dd>
          </div>
        </dl>

        <section className="mt-4 rounded-2xl border border-sage-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Why you matched
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {profile.onboarded
              ? "Checks against your profile — green means a fit, amber means a miss or gap."
              : "Finish onboarding to see personal fit reasons for this study."}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {reasons.map((r) => (
              <li
                key={r.label}
                className={`flex items-start gap-2 text-sm ${
                  r.ok ? "text-stone-700" : "text-stone-500"
                }`}
              >
                <span
                  className={`mt-0.5 text-xs font-bold ${
                    r.ok ? "text-sage-600" : "text-amber-600"
                  }`}
                  aria-hidden
                >
                  {r.ok ? "✓" : "!"}
                </span>
                {r.label}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 text-sm leading-relaxed text-stone-600">
          {study.description}
        </p>

        <div className="mt-6">
          <TrustLine domain={study.firmDomain} />
        </div>

        <section className="mt-5 rounded-2xl border border-sage-100 bg-white p-4">
          <p className="text-sm font-semibold text-sage-900">
            Have these ready for the screener
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Copy a detail, then paste it into the firm&apos;s form.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CopyButton
              label="Copy phone"
              value={profile.phone}
              copied={copiedField === "phone"}
              onClick={() => copyToClipboard("phone", profile.phone)}
            />
            <CopyButton
              label="Copy email"
              value={profile.email}
              copied={copiedField === "email"}
              onClick={() => copyToClipboard("email", profile.email)}
            />
            <CopyButton
              label="Copy ZIP"
              value={profile.zip}
              copied={copiedField === "zip"}
              onClick={() => copyToClipboard("zip", profile.zip)}
            />
          </div>
          {(!profile.phone || !profile.email) && (
            <p className="mt-3 text-xs text-stone-500">
              {!profile.phone && !profile.email
                ? "Phone and email not set — "
                : !profile.phone
                  ? "Phone not set — "
                  : "Email not set — "}
              <Link
                href="/onboarding/about"
                className="font-semibold text-sage-800 underline"
              >
                add in profile
              </Link>{" "}
              so you can paste into the screener.
            </p>
          )}
        </section>

        {study.expired ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
              <p className="font-semibold">Apply link looks dead or closed</p>
              <p className="mt-1 text-rose-900/90">
                Last check
                {study.linkCheckedAt
                  ? ` ${formatPt(study.linkCheckedAt)}`
                  : " (when an admin ran Check link)"}
                {study.linkStatus != null ? ` · HTTP ${study.linkStatus}` : ""}
                . The firm may have filled the study — you can still try the URL
                or visit their site.
              </p>
            </div>
            <a
              href={study.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => markApplied(study.id)}
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-3.5 text-base font-semibold text-rose-900 transition hover:bg-rose-50"
            >
              Try apply link anyway
            </a>
            <a
              href={`https://${study.firmDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Visit {study.firmDomain}
            </a>
          </div>
        ) : (
          <a
            href={study.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => markApplied(study.id)}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-sage-800"
          >
            Apply on {study.firm}
            <span aria-hidden className="text-sm font-normal opacity-90">
              ↗
            </span>
          </a>
        )}
        <p className="mt-2 text-center text-xs text-stone-500">
          Opens {study.firmDomain} in a new tab · we mark you Applied
        </p>

        <button
          type="button"
          onClick={() => {
            dismissStudy(study.id);
            router.push("/feed");
          }}
          className="mt-3 min-h-11 w-full py-3 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Not for me
        </button>
      </div>
    </AppShell>
  );
}

type CopyField = "phone" | "email" | "zip";

function CopyButton({
  label,
  value,
  copied,
  onClick,
}: {
  label: string;
  value: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!value}
      className="min-h-11 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2.5 text-sm font-semibold text-sage-800 transition hover:bg-sage-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-400"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function formatPt(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " PT"
    );
  } catch {
    return iso;
  }
}
