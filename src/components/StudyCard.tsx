"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Study } from "@/lib/types";
import { applyCtaLabel } from "@/lib/enrich";
import { HeadlineTag } from "@/components/HeadlineTag";
import { AccessTag, MemberLine } from "@/components/LoginSteps";
import { joinedPrimaryLabel, loginAccess, primaryLabel, primaryUrl } from "@/lib/firmAccess";
import { useJoinedFirms } from "@/hooks/useJoinedFirms";
import { markJoinPending } from "@/lib/joinedFirms";
import { postedAgo } from "@/lib/expiry";
import { useNow } from "@/hooks/useNow";
import {
  cleanTitle,
  firmInitial,
  firmName,
  firmTone,
  hourlyRate,
  isFresh,
  lengthLabel,
  modalityLabel,
  payBadge,
  payDetail,
  placeLabel,
  shortWhen,
  snippet,
  typeLabel,
  typeTone,
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
  // Place already says "From home", so drop the "· at home" suffix here.
  const cardLength = length?.replace(/\s*·\s*at home$/, "") ?? null;
  const when = shortWhen(study) ?? "Dates on screener";
  const place = placeLabel(study);
  const blurb = snippet(study, 220);
  const fullPay = payDetail(study);
  const login = loginAccess(study);
  const { isJoined } = useJoinedFirms();
  const member = !!login && isJoined(login.firmId);
  const cta = login
    ? member
      ? joinedPrimaryLabel(login)
      : primaryLabel(login)
    : applyCtaLabel(study);
  const ctaHref = login ? (member ? login.memberUrl : primaryUrl(login)) : study.applyUrl;
  const joinTap = () => {
    if (login?.firmId && login.joinUrl) markJoinPending(login.firmId);
  };
  const now = useNow();
  const posted = now != null ? postedAgo(study.publishedAt, now) : null;
  const fresh = isNewMatch || isFresh(study);
  const remote = study.modality === "remote";

  return (
    <article
      className={`relative overflow-hidden rounded-[20px] border bg-white shadow-card transition-colors ${
        open ? "border-[#D9CFBE]" : "border-line"
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
        className="block w-full min-h-11 px-3.5 pb-3 pr-14 pt-3.5 text-left transition active:bg-fog/60"
      >
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${firmTone(
              study
            )}`}
          >
            {firmInitial(study)}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-ink">
                {firmName(study)}
              </span>
              <HeadlineTag study={study} isNew={fresh} />
            </span>
            <span className="flex min-w-0 items-center gap-1 text-xs">
              {study.verified ? (
                <span className="flex shrink-0 items-center gap-1 font-semibold text-cash">
                  <CheckIcon />
                  Verified firm
                </span>
              ) : (
                <span className="truncate font-medium text-muted">Unverified source</span>
              )}
            </span>
          </span>
        </span>

        <span className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center rounded-[10px] px-2.5 font-display tracking-tight ${
              pay.known
                ? "bg-cash-tint py-0.5 text-[22px] font-extrabold text-cash"
                : "bg-stone-100 py-1 text-[15px] font-bold text-muted"
            }`}
          >
            {pay.text}
          </span>
          {posted && <span className="text-[13px] text-muted">{posted}</span>}
          {study.expired && <Tag tone="rose">Link expired</Tag>}
          {applied && <Tag tone="bay">Applied</Tag>}
        </span>

        <span className="mt-2 line-clamp-2 break-words font-display text-[17px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </span>

        <span className="mt-2 flex items-start gap-2 text-[13.5px] text-ink">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 max-w-full items-center gap-1.5">
              {remote ? <HomeIcon /> : <PinIcon />}
              <span className="truncate">{place}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <CalIcon />
              {when}
            </span>
            {cardLength && (
              <span className="flex shrink-0 items-center gap-1.5">
                <ClockIcon />
                <span className="sr-only">Length: </span>
                {cardLength}
              </span>
            )}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${
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
          className={`absolute right-1 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-bridge-tint active:scale-95 ${
            saved ? "text-bridge" : "text-[#6F7B80]"
          }`}
        >
          <svg
            className="h-[22px] w-[22px]"
            fill={saved ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.9}
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
          <div className="mx-3.5 border-t border-dashed border-line pb-3.5 pt-3">
            {blurb && (
              <p className="text-sm leading-relaxed text-stone-700">{blurb}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag tone={typeTone(study)}>{typeLabel(study)}</Tag>
              <Tag tone={remote ? "bay" : "slate"}>{modalityLabel(study)}</Tag>
              <AccessTag access={login} member={member} />
              {fullPay && <Tag tone="cash">{fullPay}</Tag>}
              {hourly && <Tag tone="cash">{hourly}</Tag>}
            </div>

            {study.portalNote && !login && (
              <p className="mt-3 flex gap-1.5 text-[13px] leading-relaxed text-muted">
                <InfoIcon />
                <span>{study.portalNote}</span>
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (login && !member) joinTap();
                  onApply?.();
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-bridge px-4 text-sm font-bold text-white transition hover:bg-bridge-dark active:scale-[0.99]"
              >
                {cta}
                <span aria-hidden className="text-xs font-normal opacity-90">
                  ↗
                </span>
              </a>
              <Link
                href={`/studies/${study.id}`}
                className="inline-flex min-h-11 items-center justify-center gap-0.5 rounded-[14px] border border-line bg-white px-4 text-sm font-bold text-bridge-link transition hover:bg-bridge-tint"
              >
                Details
                <span aria-hidden>›</span>
              </Link>
            </div>
            {login ? (
              <>
                <MemberLine
                  access={login}
                  joined={member}
                  onJoinTap={joinTap}
                  onOpen={() => onApply?.()}
                  className="mt-1"
                />
                {!member && (
                  <p className="text-xs text-muted">
                    Use your own free account. {login.caveat ?? ""}
                  </p>
                )}
              </>
            ) : (
              study.firmDomain &&
              !study.portalNote && (
                <p className="mt-2 text-xs text-muted">
                  Opens {study.firmDomain}. You may need a free account there.
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const TONES = {
  poppy: "bg-poppy-tint text-poppy-ink",
  dusk: "bg-[#ECE6F6] text-[#5B3F8C]",
  slate: "bg-stone-100 text-stone-600",
  bay: "bg-bay-tint text-bay",
  rose: "bg-rose-50 text-rose-800",
  cash: "bg-cash-tint text-cash",
} as const;

export function Tag({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-[13px] w-[13px]" aria-hidden>
      <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm3.03 4.72l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px] shrink-0 text-muted" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px] shrink-0 text-muted" aria-hidden>
      <path d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1z" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px] shrink-0 text-muted" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px] shrink-0 text-muted" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-[15px] w-[15px] shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
