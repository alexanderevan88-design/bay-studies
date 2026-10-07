import type { Metro } from "./types";

/**
 * Soft duplicate check for the live published feed.
 * Normalize titles, compare pay (number or payLabel), and test metro overlap.
 * Callers decide whether to warn (admin Approve) or skip (Craigslist import).
 */

/** Lowercase, strip emoji and punctuation, collapse whitespace. */
export function normalizeTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFKC")
    .toLowerCase()
    // Surrogate pairs cover emoji without a unicode-set flag (ts target is ES5).
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, " ")
    .replace(/[\u200d\ufe0e\ufe0f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PayLike = {
  pay?: number | null;
  payLabel?: string | null;
};

/** Positive dollar amounts from `pay` or a `$N` / bare-number payLabel. */
export function payNumbers(fields: PayLike): number[] {
  const nums = new Set<number>();
  const add = (n: number) => {
    if (Number.isFinite(n) && n > 0 && n < 100_000) nums.add(Math.round(n));
  };
  if (typeof fields.pay === "number") add(fields.pay);
  const label = fields.payLabel ?? "";
  const money = /\$\s*(\d{1,5})(?:\.\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = money.exec(label))) {
    add(Number(match[1]));
  }
  if (/^\s*\$?\s*\d{1,5}(?:\.\d+)?\s*$/.test(label)) {
    add(Number(label.replace(/[^0-9.]/g, "")));
  }
  const out: number[] = [];
  nums.forEach((n) => out.push(n));
  return out;
}

/**
 * Same pay when a positive number matches (including a number inside the
 * other side's payLabel) or both payLabels normalize to the same text.
 * Missing pay on both sides is not a match.
 */
export function samePay(a: PayLike, b: PayLike): boolean {
  const an = payNumbers(a);
  const bn = payNumbers(b);
  if (an.some((n) => bn.includes(n))) return true;
  const al = normalizeTitle(a.payLabel);
  const bl = normalizeTitle(b.payLabel);
  return Boolean(al && bl && al === bl);
}

export function metrosOverlap(
  a?: readonly Metro[] | null,
  b?: readonly Metro[] | null
): boolean {
  if (!a?.length || !b?.length) return false;
  const set = new Set<Metro>(a);
  return b.some((m) => set.has(m));
}

export function sharedMetros(
  a?: readonly Metro[] | null,
  b?: readonly Metro[] | null
): Metro[] {
  if (!a?.length || !b?.length) return [];
  const set = new Set<Metro>(a);
  return b.filter((m) => set.has(m));
}

const TOKEN_STOP = new Set([
  "a",
  "an",
  "the",
  "for",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "at",
  "with",
  "from",
  "your",
  "you",
  "our",
  "be",
  "is",
  "are",
]);

function significantTokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter((t) => t.length >= 3 && !TOKEN_STOP.has(t));
}

function diceCoefficient(a: string, b: string): number {
  if (a === b) return a.length ? 1 : 0;
  if (a.length < 2 || b.length < 2) return 0;
  const counts = new Map<string, number>();
  let aN = 0;
  for (let i = 0; i < a.length - 1; i += 1) {
    const g = a.slice(i, i + 2);
    counts.set(g, (counts.get(g) ?? 0) + 1);
    aN += 1;
  }
  let bN = 0;
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const g = b.slice(i, i + 2);
    bN += 1;
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      overlap += 1;
      counts.set(g, n - 1);
    }
  }
  if (!aN || !bN) return 0;
  return (2 * overlap) / (aN + bN);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b);
  const seen = new Set<string>();
  let inter = 0;
  for (let i = 0; i < a.length; i += 1) {
    const t = a[i];
    if (seen.has(t)) continue;
    seen.add(t);
    if (sb.has(t)) inter += 1;
  }
  const union = seen.size + sb.size - inter;
  return union ? inter / union : 0;
}

export type TitleComparison = {
  /** Normalized strings are equal (strong match). */
  equal: boolean;
  /** Close but not equal: containment, Dice, or token overlap. */
  fuzzy: boolean;
  score: number;
};

export function compareTitles(
  a: string | null | undefined,
  b: string | null | undefined
): TitleComparison {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb || na.length < 8 || nb.length < 8) {
    return { equal: false, fuzzy: false, score: 0 };
  }
  if (na === nb) return { equal: true, fuzzy: false, score: 1 };
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  const contained = shorter.length >= 24 && longer.includes(shorter);
  const dice = diceCoefficient(na, nb);
  const ta = significantTokens(na);
  const tb = significantTokens(nb);
  const jac = jaccard(ta, tb);
  const sharedLong = ta.filter(
    (t) => t.length >= 4 && tb.includes(t)
  ).length;
  const score = Math.max(dice, jac, contained ? 0.9 : 0);
  const fuzzy =
    contained || dice >= 0.86 || (jac >= 0.62 && sharedLong >= 3);
  return { equal: false, fuzzy, score };
}

export type FeedLike = PayLike & {
  id?: string;
  title?: string | null;
  metro?: Metro[] | null;
  applyUrl?: string | null;
};

export type NearDuplicateHit = {
  id: string;
  title: string;
  score: number;
  titleKind: "normalized" | "similar";
  why: string;
};

/**
 * Live feed match for admin Approve: (fuzzy title OR normalized equality)
 * AND same pay AND any shared metro. Same study id is an upsert, not a dup.
 */
export function findLiveNearDuplicate(
  candidate: FeedLike,
  live: readonly FeedLike[]
): NearDuplicateHit | null {
  let best: NearDuplicateHit | null = null;
  for (const item of live) {
    if (!item.id) continue;
    if (candidate.id && item.id === candidate.id) continue;
    const titles = compareTitles(candidate.title, item.title);
    if (!titles.equal && !titles.fuzzy) continue;
    if (!samePay(candidate, item)) continue;
    if (!metrosOverlap(candidate.metro, item.metro)) continue;
    const shared = sharedMetros(candidate.metro, item.metro);
    const titleKind = titles.equal ? "normalized" : "similar";
    const titleBit = titles.equal
      ? "same normalized title"
      : `similar title (${Math.round(titles.score * 100)}%)`;
    const hit: NearDuplicateHit = {
      id: item.id,
      title: item.title?.trim() || item.id,
      score: titles.score,
      titleKind,
      why: `${titleBit}, same pay, overlapping metro (${shared.join(", ")})`,
    };
    if (!best || hit.score > best.score) best = hit;
  }
  return best;
}

/** Same shape as the Craigslist within-batch apply-link key. */
export function normalizeApplyUrl(url: string | null | undefined): string {
  return (url ?? "").trim().replace(/\/+$/, "").toLowerCase();
}

export function findPublishedApplyUrl(
  applyUrl: string | null | undefined,
  live: readonly FeedLike[],
  ignoreId?: string
): FeedLike | null {
  const key = normalizeApplyUrl(applyUrl);
  if (!key) return null;
  for (const item of live) {
    if (ignoreId && item.id === ignoreId) continue;
    if (normalizeApplyUrl(item.applyUrl) === key) return item;
  }
  return null;
}

/**
 * Strong title equality (not fuzzy) plus same pay.
 * When both sides list metros, they must overlap.
 */
export function findNormalizedTitlePay(
  candidate: FeedLike,
  live: readonly FeedLike[],
  ignoreId?: string
): FeedLike | null {
  const title = normalizeTitle(candidate.title);
  if (!title || title.length < 8) return null;
  for (const item of live) {
    if (ignoreId && item.id === ignoreId) continue;
    if (normalizeTitle(item.title) !== title) continue;
    if (!samePay(candidate, item)) continue;
    if (
      candidate.metro?.length &&
      item.metro?.length &&
      !metrosOverlap(candidate.metro, item.metro)
    ) {
      continue;
    }
    return item;
  }
  return null;
}

/**
 * Craigslist import: skip when a *different* published id already has this
 * apply URL, or the normalized title + pay is already on the feed.
 * Same id is the existing upsert and is left alone.
 */
export function craigslistFeedSkipReason(
  candidate: FeedLike,
  live: readonly FeedLike[]
): string | null {
  const byUrl = findPublishedApplyUrl(
    candidate.applyUrl,
    live,
    candidate.id
  );
  if (byUrl?.id) {
    return `apply URL already published (${byUrl.id})`;
  }
  const byTitle = findNormalizedTitlePay(candidate, live, candidate.id);
  if (byTitle?.id) {
    const label = byTitle.title?.trim() || byTitle.id;
    return `normalized title + pay already on feed (${byTitle.id}: ${label})`;
  }
  return null;
}
