"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Study } from "@/lib/types";
import { applyCtaLabel } from "@/lib/enrich";
import {
  cleanTitle,
  firmInitial,
  firmName,
  firmTone,
  hourlyRate,
  lengthLabel,
  modalityLabel,
  payBadge,
  payDetail,
  placeLabel,
  shortWhen,
  snippet,
  typeLabel,
} from "@/lib/display";

/**
 * Compact feed card. Starts collapsed (firm, pay, title, place · date);
 * one tap on the card expands it in place to show the rest.
 */
export function StudyCard({
  study,
  saved,
  applied,
  isNewMatch,
  defaultOpen = false,
  onToggleSave,
  onApply,
  onOpen,
}: {
  study: Study;
  saved?: boolean;
  applied?: boolean;
  isNewMatch?: boolean;
  defaultOpen?: boolean;
  onToggleSave?: () => void;
  onApply?: () => void;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const title = cleanTitle(study);
  const pay = payBadge(study);
  const length = lengthLabel(study);
  const hourly = hourlyRate(study);
  const when = shortWhen(study) ?? "Dates on screener";
  const place = placeLabel(study);
  const blurb = snippet(study, 220);
  const fullPay = payDetail(study);
  const cta = applyCtaLabel(study);

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm shadow-sage-900/5 transition-colors ${
        open ? "border-sage-200" : "border-sage-100"
      } ${study.expired ? "opacity-80" : ""}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
          onOpen?.();
        }}
        className="block w-full min-h-11 px-4 pb-3 pr-14 pt-3 text-left transition active:bg-sage-50/60"
      >
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${firmTone(
              study
            )}`}
          >
            {firmInitial(study)}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-sage-900">
            {firmName(study)}
          </span>
          {study.verified && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-sage-700"
              title="Allowlisted Bay Area firm"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm3.03 4.72l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z" />
              </svg>
              Verified
            </span>
          )}
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-base font-bold tracking-tight ${
              pay.known
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {pay.text}
          </span>
          {(length || hourly) && (
            <span className="text-sm text-stone-500">
              {[length, hourly].filter(Boolean).join(" · ")}
            </span>
          )}
          {isNewMatch && <Tag tone="violet">New</Tag>}
          {study.expired && <Tag tone="rose">Link expired</Tag>}
          {applied && <Tag tone="sky">Applied</Tag>}
        </span>

        <span className="mt-1.5 line-clamp-2 break-words font-serif text-base font-semibold leading-snug text-stone-900">
          {title}
        </span>

        <span className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
          <span className="min-w-0 truncate">
            {place} · {when}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`ml-auto h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="sr-only">{open ? "Hide details" : "Show details"}</span>
      </button>

      {onToggleSave && (
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={!!saved}
          aria-label={saved ? `Unsave ${title}` : `Save ${title}`}
          className={`absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-rose-50 active:scale-95 ${
            saved ? "text-rose-600" : "text-stone-400"
          }`}
        >
          <svg
            className="h-[22px] w-[22px]"
            fill={saved ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
          </svg>
        </button>
      )}

      <div
        id={panelId}
        role="region"
        aria-label={`More about ${title}`}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
          open
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-sage-100 px-4 pb-4 pt-3">
            {blurb && (
              <p className="text-sm leading-relaxed text-stone-600">{blurb}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag tone="sage">{typeLabel(study)}</Tag>
              <Tag tone={study.modality === "remote" ? "sky" : "stone"}>
                {modalityLabel(study)}
              </Tag>
              {fullPay && <Tag tone="emerald">{fullPay}</Tag>}
              {!study.verified && <Tag tone="amber">Unverified source</Tag>}
            </div>

            {study.portalNote && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
                {study.portalNote}
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <a
                href={study.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onApply?.()}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white transition hover:bg-sage-800 active:scale-[0.99]"
              >
                {cta}
                <span aria-hidden className="text-xs font-normal opacity-90">
                  ↗
                </span>
              </a>
              <Link
                href={`/studies/${study.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sage-200 bg-white px-4 text-sm font-semibold text-sage-800 transition hover:bg-sage-50"
              >
                Details
              </Link>
            </div>
            {study.firmDomain && !study.portalNote && (
              <p className="mt-2 text-xs text-stone-500">
                Opens {study.firmDomain}. You may need a free account there.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const TONES = {
  sage: "bg-sage-50 text-sage-800 ring-sage-200",
  stone: "bg-stone-50 text-stone-700 ring-stone-200",
  sky: "bg-sky-50 text-sky-800 ring-sky-200",
  rose: "bg-rose-50 text-rose-800 ring-rose-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
} as const;

function Tag({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
