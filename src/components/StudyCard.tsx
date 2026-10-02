"use client";

import Link from "next/link";
import type { Study } from "@/lib/types";
import { STUDY_TYPE_LABELS } from "@/lib/types";
import { formatDuration } from "@/lib/match";
import { TrustLine } from "./TrustLine";
import { VerifiedBadge } from "./VerifiedBadge";

export function StudyCard({
  study,
  matchPercent,
  saved,
  applied,
  isNewMatch,
  profileReady = true,
}: {
  study: Study;
  matchPercent: number;
  saved?: boolean;
  applied?: boolean;
  isNewMatch?: boolean;
  /** When false, show Match TBD instead of a placeholder %. */
  profileReady?: boolean;
}) {
  const fromEmail = study.id.startsWith("pub-");

  return (
    <article className="overflow-hidden rounded-2xl border border-sage-100 bg-white p-4 shadow-sm shadow-sage-900/5 transition hover:border-sage-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-sage-900">
            ${study.pay}{" "}
            <span className="font-normal text-stone-500">
              · {formatDuration(study.durationMinutes)}
            </span>
          </p>
          <p className="mt-0.5 break-words text-sm text-stone-600">
            {STUDY_TYPE_LABELS[study.type]} · {study.location}
          </p>
        </div>
        {study.verified && (
          <div className="shrink-0">
            <VerifiedBadge href="/about/verify" />
          </div>
        )}
      </div>

      <h3 className="mt-3 break-words font-serif text-base leading-snug text-stone-900">
        {study.title}
      </h3>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span className="max-w-full break-words font-medium text-sage-800">
          {study.firm}
        </span>
        <span className="text-stone-300" aria-hidden>
          ·
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            !profileReady
              ? "bg-stone-100 text-stone-500"
              : matchPercent >= 85
                ? "bg-sage-100 text-sage-800"
                : matchPercent >= 70
                  ? "bg-amber-50 text-amber-800"
                  : "bg-stone-100 text-stone-600"
          }`}
          title={
            profileReady
              ? "Soft score from your age, metro, prefs, and pay floor"
              : "Complete your profile to see a personal match %"
          }
        >
          {profileReady ? `${matchPercent}% match` : "Match TBD"}
        </span>
        {fromEmail && (
          <span
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-900 ring-1 ring-inset ring-violet-300/70"
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
        {isNewMatch && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-violet-800">
            New match
          </span>
        )}
        {study.expired && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
            Link expired
          </span>
        )}
        {applied && (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
            Applied
          </span>
        )}
        {saved && !applied && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
            Saved
          </span>
        )}
      </div>

      <div className="mt-3">
        <TrustLine domain={study.firmDomain} compact />
      </div>

      <div className="mt-4">
        <Link
          href={`/studies/${study.id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-800 active:scale-[0.99]"
        >
          View
        </Link>
      </div>
    </article>
  );
}
