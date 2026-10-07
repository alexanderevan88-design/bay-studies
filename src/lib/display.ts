import type { Study } from "./types";
import { STUDY_TYPE_LABELS } from "./types";
import { sanitizePublicStudyText } from "./sanitizePublicStudy";

/**
 * Display helpers for public cards + detail pages. Pure functions, no data
 * changes: they only decide how a stored study reads on a phone.
 */

/** Internal study / job codes like RWC_J104933, HUT261097860, 2653SF26. */
const CODE_IN_PARENS =
  /\s*\((?=[^)\s]*\d)(?=[^)\s]*[A-Za-z])([A-Za-z0-9][A-Za-z0-9_-]{4,})\)/g;

/** The firm's study code (from the title), if any. Shown on the detail page. */
export function studyCode(study: Study): string | null {
  const m = Array.from(study.title.matchAll(CODE_IN_PARENS));
  return m.length ? m[m.length - 1][1] : null;
}

/** Title without internal codes, leading emoji, or email-y prefixes. */
export function cleanTitle(study: Study): string {
  let t = study.title.replace(CODE_IN_PARENS, "");
  // Leading emoji / symbols
  t = t.replace(/^(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF\uFE0F\u200D]|\s)+/, "");
  // Recruiter-email prefixes
  t = t.replace(/^(?:you['’]ve been matched!\s*)/i, "");
  t = t.replace(/^(?:new study:\s*)/i, "");
  // Trailing pay restatements (" — pays $400", " - Earn $75.00 via Visa gift card")
  t = t.replace(/\s+[—–-]\s+(?:pays|earn)\s+\$[\d.,]+.*$/i, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t || study.title;
}

/** Description with forwarded-email headers stripped, one paragraph. */
export function cleanDescription(study: Study): string {
  const raw = study.description || study.eligibility?.notes || "";
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !/^-{3,}\s*forwarded message/i.test(l) &&
        !/^(from|date|subject|to|cc):/i.test(l) &&
        !/^-{3,}$/.test(l)
    );
  return sanitizePublicStudyText(
    lines
      .join(" ")
      .replace(/\[image:[^\]]*\]/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function snippet(study: Study, max = 200): string {
  const one = cleanDescription(study);
  if (one.length <= max) return one;
  return one.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Stored pay, or a dollar amount stated in the title/description when the
 * stored pay is missing. Never invents a number: returns 0 if none is stated.
 */
export function effectivePay(study: Study): number {
  if (study.pay > 0) return study.pay;
  if (study.payLabel && /\$\s?\d/.test(study.payLabel)) {
    const m = study.payLabel.match(/\$\s?(\d{2,4})/);
    if (m) return Number(m[1]);
  }
  for (const text of [study.title, study.description ?? ""]) {
    const m = text.match(/\$\s?(\d{2,4})(?:\.\d{2})?\b/);
    if (m) return Number(m[1]);
  }
  return 0;
}

/** Short pay for the green badge: "$100", "$50 or $90", "Pay on screener". */
export function payBadge(study: Study): { text: string; known: boolean } {
  const label = study.payLabel?.trim() ?? "";
  const pair = label.match(/^\$(\d+)\s+or\s+\$(\d+)$/i);
  if (pair) return { text: `$${pair[1]} or $${pair[2]}`, known: true };
  const pay = effectivePay(study);
  if (pay > 0) return { text: `$${pay}`, known: true };
  if (/varies/i.test(label)) return { text: "Pay varies", known: false };
  return { text: "Pay on screener", known: false };
}

/** Full pay wording when it carries more than the badge (gift card, add-ons). */
export function payDetail(study: Study): string | null {
  const label = study.payLabel?.trim();
  if (!label) return null;
  const badge = payBadge(study).text;
  if (label === badge) return null;
  return label;
}

/**
 * Plain-English length.
 *  - Multi-day / multi-week: "Runs 4 weeks · at home" (or "Runs 2 days").
 *  - Sessions: "30-min session", "2-hr session", "2 × 45-min sessions".
 */
export function lengthLabel(study: Study): string | null {
  const dl = study.durationLabel?.trim();
  const home = study.modality === "remote";
  if (dl) {
    const two = dl.match(/^(two|2|three|3)\s+(\d+)[-\s]?minute sessions$/i);
    if (two) {
      const n = /^(two|2)$/i.test(two[1]) ? 2 : 3;
      return `${n} × ${two[2]}-min sessions`;
    }
    const span = dl.match(/^(\d+)\s*(days?|weeks?|months?)$/i);
    if (span) {
      const n = Number(span[1]);
      const unit = span[2].toLowerCase().replace(/s$/, "");
      return `Runs ${n} ${unit}${n === 1 ? "" : "s"}${home ? " · at home" : ""}`;
    }
    if (/a\.m\.|p\.m\.|am|pm/i.test(dl) && study.durationMinutes > 0) {
      return sessionLabel(study.durationMinutes);
    }
    const mins = dl.match(/^(\d+)\s*(?:min|mins|minutes?)$/i);
    if (mins) return sessionLabel(Number(mins[1]));
    return dl;
  }
  if (study.durationMinutes > 0) return sessionLabel(study.durationMinutes);
  return null;
}

function sessionLabel(min: number): string {
  return `${minutesLabel(min).replace(" ", "-")} session`;
}

function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  if (Number.isInteger(h)) return `${h} hr`;
  return `${h.toFixed(1).replace(/\.0$/, "")} hr`;
}

/** "about $67/hr" when pay and a session length (not days/weeks) are known. */
export function hourlyRate(study: Study): string | null {
  const pay = effectivePay(study);
  const min = study.durationMinutes;
  if (!pay || !min || min > 8 * 60) return null;
  if (/\bor\b|up to/i.test(study.payLabel ?? "")) return null;
  const rate = Math.round((pay / min) * 60);
  return `about $${rate}/hr`;
}

export function typeLabel(study: Study): string {
  const known = STUDY_TYPE_LABELS[study.type];
  if (known) return known;
  const t = String(study.type || "").replace(/-/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Study";
}

export function modalityLabel(study: Study): string {
  return study.modality === "remote" ? "From home" : "In person";
}

/** Short place for the card line. */
export function placeLabel(study: Study): string {
  if (study.modality === "remote") return "From home";
  return study.location.replace(/\s*\/\s*Peninsula$/i, "").trim() || "Bay Area";
}

/* ── Dates ───────────────────────────────────────────────────────── */

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MON_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_SHORT: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type Hit = { month: number; day: number; index: number; end: number; weekday?: string };

function findDates(text: string): Hit[] {
  const hits: Hit[] = [];
  const re =
    /(?:(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+)?\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi;
  for (const m of Array.from(text.matchAll(re))) {
    hits.push({
      month: MONTHS.indexOf(m[2].toLowerCase()),
      day: Number(m[3]),
      index: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      weekday: m[1] ? DAY_SHORT[m[1].toLowerCase()] : undefined,
    });
  }
  // 02-Nov-2026
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{4}\b/gi))) {
    hits.push({
      month: MONTHS.indexOf(m[2].toLowerCase()),
      day: Number(m[1]),
      index: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
    });
  }
  return hits.sort((a, b) => a.index - b.index);
}

function hitDate(h: Hit, now: Date): Date {
  let year = now.getFullYear();
  // A month far in the past is probably next year.
  if (h.month < now.getMonth() - 6) year += 1;
  return new Date(year, h.month, h.day);
}

/** Short "when" for cards: "Tue, Oct 13", "Oct 14 or 15", "From Oct 23". */
export function shortWhen(study: Study): string | null {
  const when = study.when || "";
  const hits = findDates(when);
  if (hits.length === 0) {
    if (/ongoing/i.test(when)) return "Ongoing";
    const month = when.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
    );
    if (month) return month[1].charAt(0).toUpperCase() + month[1].slice(1).toLowerCase();
    return null;
  }
  const a = hits[0];
  const starting = /^\s*(starting|from|begins?)\b/i.test(when);
  if (hits.length === 1) {
    const base = `${MON_SHORT[a.month]} ${a.day}`;
    if (starting) return `From ${base}`;
    return a.weekday ? `${a.weekday}, ${base}` : base;
  }
  const b = hits[1];
  const between = when.slice(a.end, b.index);
  const sep = /\bor\b/i.test(between)
    ? " or "
    : /[–-]/.test(between) && !/\band\b/i.test(between)
      ? "–"
      : " & ";
  if (a.month === b.month) return `${MON_SHORT[a.month]} ${a.day}${sep}${b.day}`;
  return `${MON_SHORT[a.month]} ${a.day}${sep === "–" ? " – " : sep}${MON_SHORT[b.month]} ${b.day}`;
}

/** All session dates we can read from `when`. */
export function studyDates(study: Study, now = new Date()): Date[] {
  return findDates(study.when || "").map((h) => hitDate(h, now));
}

/** True when a readable session date falls in the next 7 days (today included). */
export function isThisWeek(study: Study, now = new Date()): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return studyDates(study, now).some((d) => d >= start && d <= end);
}

/* ── Firm identity ───────────────────────────────────────────────── */

export function firmName(study: Study): string {
  return study.firm.replace(/\s*\(Sago\)$/i, " · Sago");
}

export function firmInitial(study: Study): string {
  const m = study.firm.match(/[A-Za-z0-9]/);
  return (m ? m[0] : "?").toUpperCase();
}

/** Solid circle colors (white letter, all AA with white). */
const AVATAR_TONES = [
  "bg-[#C8401A]", // bridge orange
  "bg-[#2D6A87]", // bay blue
  "bg-[#17643F]", // cash green
  "bg-[#5B3F8C]", // dusk purple
  "bg-[#8A5A0B]", // poppy brown
  "bg-[#4C575B]", // slate
];

const KNOWN_FIRM_TONES: Record<string, number> = {
  curion: 0,
  "focus group (sago)": 1,
  fieldwork: 2,
  "user interviews": 3,
};

export function firmTone(study: Study): string {
  const key = study.firm.toLowerCase();
  if (key in KNOWN_FIRM_TONES) return AVATAR_TONES[KNOWN_FIRM_TONES[key]];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

/** Added to the feed in the last 3 days (uses publishedAt; false if unknown). */
export function isFresh(study: Study, now = Date.now()): boolean {
  if (!study.publishedAt) return false;
  const t = Date.parse(study.publishedAt);
  if (Number.isNaN(t)) return false;
  return now - t >= 0 && now - t <= 3 * 24 * 60 * 60 * 1000;
}

/** Tag tone key for a study type (used by cards + detail). */
export function typeTone(study: Study): "poppy" | "dusk" | "slate" {
  if (study.type === "product-taste") return "poppy";
  if (study.type === "focus-group") return "dusk";
  return "slate";
}

/** Button text for the sticky Apply bar on the study page. */
export function applyButtonText(study: Study): string {
  if (study.expired) return "Try link anyway";
  let homepage = false;
  try {
    const u = new URL(study.applyUrl);
    homepage = (u.pathname === "/" || u.pathname === "") && !u.search;
  } catch {
    /* ignore */
  }
  const dashboard =
    /(?:^|\.)my\.|login|portal|dashboard|activities|member/i.test(study.applyUrl) ||
    /^https?:\/\/pate\./i.test(study.applyUrl);
  if (homepage || dashboard) {
    const name = study.firm.replace(/\s*\(.*\)$/, "").trim();
    if (name && name.length <= 14 && !/\./.test(name)) {
      return `Sign up on ${name}’s site`;
    }
    return "Open the firm’s site";
  }
  return "Open screener";
}
