/**
 * Automatic study expiry (read-time date math; nothing is deleted).
 *
 * Rules, in order (see docs/EXPIRY.md):
 * 1. `expiresAt` on the study wins. "YYYY-MM-DD" = end of that day PT;
 *    a full ISO timestamp = that exact moment.
 * 2. Multi-week at-home studies (remote + weeks/days length, or "Starting …"):
 *    close at the end of the START day, since they recruit before they start.
 *    If only an end date is given ("until Oct 30"), close at the end of that day.
 * 3. Any other study with readable session dates: close at the end of the LAST
 *    session day, Pacific time (hidden from 00:00 PT the next day).
 * 4. No usable date: close at the end of the day 10 days after publishedAt (PT).
 *
 * Dates are read from `when` first; if it has none, from the description
 * (marked as a guess). Year comes from the text when given, otherwise it's the
 * year that puts the date nearest to (or after) when the study was published.
 */
import type { Study } from "./types";

export type ExpiryBasis =
  | "override"
  | "last-session"
  | "start-date"
  | "end-date"
  | "fallback-10d"
  | "none";

export interface StudyExpiry {
  /** Epoch ms when the study stops showing. null = no expiry known. */
  closesAt: number | null;
  basis: ExpiryBasis;
  /** True when the date came from the description, a fallback, or no year/day certainty. */
  guessed: boolean;
  /** Plain-English note on how the date was picked. */
  note: string;
}

const TZ = "America/Los_Angeles";
const DAY = 24 * 60 * 60 * 1000;
export const CLOSING_SOON_MS = 48 * 60 * 60 * 1000;
export const FALLBACK_DAYS = 10;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/* ── Pacific time helpers ───────────────────────────────────────── */

function ptParts(ms: number): { y: number; m: number; d: number; h: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month") - 1, d: get("day"), h: get("hour") };
}

/** Epoch ms of 00:00 PT on the given calendar day (month 0-based; overflow OK). */
export function ptMidnight(y: number, m: number, d: number): number {
  const base = new Date(Date.UTC(y, m, d));
  const Y = base.getUTCFullYear();
  const M = base.getUTCMonth();
  const D = base.getUTCDate();
  for (const off of [7, 8]) {
    const t = Date.UTC(Y, M, D, off);
    const p = ptParts(t);
    if (p.h === 0 && p.d === D && p.m === M) return t;
  }
  return Date.UTC(Y, M, D, 8);
}

/** Epoch ms when the PT calendar day ends (= next day 00:00 PT). */
export function endOfPtDay(y: number, m: number, d: number): number {
  return ptMidnight(y, m, d + 1);
}

/* ── Date parsing ───────────────────────────────────────────────── */

type Hit = { month: number; day: number; year?: number; index: number; end: number; endMarker: boolean };

function parseDates(text: string): Hit[] {
  const hits: Hit[] = [];
  const re =
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(20\d{2})\b)?/gi;
  for (const m of Array.from(text.matchAll(re))) {
    const idx = m.index ?? 0;
    hits.push({
      month: MONTHS.indexOf(m[1].toLowerCase()),
      day: Number(m[2]),
      year: m[3] ? Number(m[3]) : undefined,
      index: idx,
      end: idx + m[0].length,
      endMarker: /\b(until|through|thru|ends?|ending|by|deadline|no later than)\s*$/i.test(
        text.slice(Math.max(0, idx - 20), idx)
      ),
    });
  }
  // 02-Nov-2026
  for (const m of Array.from(
    text.matchAll(/\b(\d{1,2})-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(20\d{2})\b/gi)
  )) {
    const idx = m.index ?? 0;
    hits.push({
      month: MONTHS.indexOf(m[2].toLowerCase()),
      day: Number(m[1]),
      year: Number(m[3]),
      index: idx,
      end: idx + m[0].length,
      endMarker: false,
    });
  }
  // A trailing year ("Oct 22–Dec 17 2026") applies to earlier hits without one.
  const lastYear = [...hits].reverse().find((h) => h.year)?.year;
  for (const h of hits) if (!h.year && lastYear) h.year = lastYear;
  return hits
    .filter((h) => h.month >= 0 && h.day >= 1 && h.day <= 31)
    .sort((a, b) => a.index - b.index);
}

function resolveYear(h: Hit, refMs: number): number {
  if (h.year) return h.year;
  const ref = ptParts(refMs);
  const sameYear = ptMidnight(ref.y, h.month, h.day);
  // More than ~2 months before the reference → it's next year's date.
  return sameYear < refMs - 60 * DAY ? ref.y + 1 : ref.y;
}

function stripEmailHeaders(text: string): string {
  return text
    .split(/\r?\n/)
    .filter(
      (l) =>
        !/^-{3,}\s*forwarded message/i.test(l.trim()) &&
        !/^\s*(from|date|sent|subject|to|cc):/i.test(l)
    )
    .join("\n");
}

function isAtHomeMultiWeek(study: Study): boolean {
  if (study.modality !== "remote") return false;
  const length = `${study.durationLabel ?? ""} ${study.when ?? ""}`;
  return (
    /\b\d+\s*(weeks?|days?)\b/i.test(length) ||
    /^\s*(starting|starts|start|from|begins?|research happening)\b/i.test(study.when ?? "") ||
    /in-home/i.test(`${study.location} ${study.title}`)
  );
}

function fmt(ms: number): string {
  return new Date(ms - 1).toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Main ───────────────────────────────────────────────────────── */

export function studyExpiry(study: Study): StudyExpiry {
  // 1. Override
  const ov = (study as Study & { expiresAt?: string }).expiresAt?.trim();
  if (ov) {
    const dateOnly = ov.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const t = dateOnly
      ? endOfPtDay(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : Date.parse(ov);
    if (!Number.isNaN(t)) {
      return { closesAt: t, basis: "override", guessed: false, note: `Set by hand (expiresAt ${ov})` };
    }
  }

  const published = study.publishedAt ? Date.parse(study.publishedAt) : NaN;
  const ref = Number.isNaN(published) ? Date.now() : published;

  let hits = parseDates(study.when ?? "");
  let fromDescription = false;
  if (hits.length === 0) {
    hits = parseDates(stripEmailHeaders(study.description ?? ""));
    fromDescription = hits.length > 0;
  }

  if (hits.length > 0) {
    const days = hits.map((h) => {
      const y = resolveYear(h, ref);
      return { h, y, close: endOfPtDay(y, h.month, h.day) };
    });
    const guessed = fromDescription;
    const src = fromDescription ? "description" : "dates";

    if (isAtHomeMultiWeek(study)) {
      const start = days.find((x) => !x.h.endMarker);
      if (start) {
        return {
          closesAt: start.close,
          basis: "start-date",
          guessed,
          note: `At-home study: closes at the end of its start day (${fmt(start.close)}) from the ${src}`,
        };
      }
      const endDay = days[days.length - 1];
      return {
        closesAt: endDay.close,
        basis: "end-date",
        guessed,
        note: `At-home study with only an end date (${fmt(endDay.close)}) from the ${src}`,
      };
    }

    const last = days.reduce((a, b) => (b.close > a.close ? b : a));
    return {
      closesAt: last.close,
      basis: last.h.endMarker && days.length === 1 ? "end-date" : "last-session",
      guessed,
      note: `Closes after the last session day (${fmt(last.close)}) from the ${src}`,
    };
  }

  // 4. Fallback: 10 days after published, end of that PT day.
  if (!Number.isNaN(published)) {
    const p = ptParts(published);
    const close = endOfPtDay(p.y, p.m, p.d + FALLBACK_DAYS);
    return {
      closesAt: close,
      basis: "fallback-10d",
      guessed: true,
      note: `No usable date: ${FALLBACK_DAYS} days after it was added (${fmt(close)})`,
    };
  }

  return { closesAt: null, basis: "none", guessed: true, note: "No date and no published date" };
}

export function isClosed(study: Study, now = Date.now()): boolean {
  const { closesAt } = studyExpiry(study);
  return closesAt != null && now >= closesAt;
}

export function isClosingSoon(study: Study, now = Date.now()): boolean {
  const { closesAt } = studyExpiry(study);
  return closesAt != null && now < closesAt && closesAt - now <= CLOSING_SOON_MS;
}

/** Minimal public info about a closed study (for Saved + the closed detail page). */
export interface ClosedStudy {
  id: string;
  title: string;
  firm: string;
  closedAt: string | null;
}

export function toClosedStub(study: Study): ClosedStudy {
  const { closesAt } = studyExpiry(study);
  return {
    id: study.id,
    title: study.title,
    firm: study.firm,
    closedAt: closesAt != null ? new Date(closesAt).toISOString() : null,
  };
}

/** Split into live and closed at `now`. */
export function splitByExpiry(
  studies: Study[],
  now = Date.now()
): { live: Study[]; closed: Study[] } {
  const live: Study[] = [];
  const closed: Study[] = [];
  for (const s of studies) (isClosed(s, now) ? closed : live).push(s);
  return { live, closed };
}

/** "Closes Oct 13" style label (last day it's open). */
export function closesLabel(study: Study): string | null {
  const { closesAt } = studyExpiry(study);
  return closesAt == null ? null : fmt(closesAt);
}

/** Calendar day (PT) as "YYYY-MM-DD". */
function ptDayKey(ms: number): string {
  const p = ptParts(ms);
  return `${p.y}-${p.m + 1}-${p.d}`;
}

/** Published/added today, Pacific time. */
export function isFreshToday(study: Study, now = Date.now()): boolean {
  const t = study.publishedAt ? Date.parse(study.publishedAt) : NaN;
  if (Number.isNaN(t)) return false;
  return ptDayKey(t) === ptDayKey(now);
}

export type HeadlineTag = "closing-soon" | "fresh-today" | "new" | null;

/** One tag per card. Priority: Closing soon > Fresh today > New. */
export function headlineTag(study: Study, isNew: boolean, now = Date.now()): HeadlineTag {
  if (isClosingSoon(study, now)) return "closing-soon";
  if (isFreshToday(study, now)) return "fresh-today";
  return isNew ? "new" : null;
}

/**
 * "Posted 2h ago" / "Posted yesterday" / "Posted 3 days ago", by Pacific
 * calendar day. Compute on the client with a ticking `now` so cached pages
 * never show a stale age.
 */
export function postedAgo(publishedAt: string | undefined, now = Date.now()): string | null {
  const t = publishedAt ? Date.parse(publishedAt) : NaN;
  if (Number.isNaN(t)) return null;
  const diff = Math.max(0, now - t);
  const a = ptParts(t);
  const b = ptParts(now);
  const days = Math.round((ptMidnight(b.y, b.m, b.d) - ptMidnight(a.y, a.m, a.d)) / DAY);
  if (days <= 0) {
    const mins = Math.floor(diff / 60000);
    if (mins < 10) return "Posted just now";
    if (mins < 60) return `Posted ${mins}m ago`;
    return `Posted ${Math.floor(mins / 60)}h ago`;
  }
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `Posted ${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return `Posted ${new Date(t).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" })}`;
}
