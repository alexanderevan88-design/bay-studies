import { findSourceByFromEmail, SOURCES } from "@/data/sources";
import { recoverFirmFromForParse } from "./forwardFrom";
import type {
  Metro,
  RawEmail,
  Source,
  StudyDraft,
  StudyType,
  ParseLog,
} from "./types";
import { sanitizePublicStudyText } from "./sanitizePublicStudy";

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const PAY_RE =
  /(?:\$|USD\s*)(\d{2,4})(?:\s*(?:cash|gift\s*card|incentive|compensation|pay|paid))?/i;
const PAY_ALT_RE =
  /(?:compensation|incentive|pay|earn|paid)\s*[:\-]?\s*\$?\s*(\d{2,4})/i;
const MINUTES_RE =
  /(?:~|about|approx\.?)?\s*(\d{2,3})\s*(?:min(?:ute)?s?)\b/i;
const HOURS_RE =
  /(?:~|about|approx\.?)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i;
const AGE_RANGE_RE =
  /ages?\s*[:\-]?\s*(\d{2})\s*(?:–|-|to|and)\s*(\d{2})/i;
const AGE_TO_RE = /ages?\s*(\d{2})\s*[-–]\s*(\d{2})/i;

const TYPE_HINTS: { re: RegExp; type: StudyType }[] = [
  { re: /taste\s*test|beverage|snack|product\s*test|meal\s*concept/i, type: "product-taste" },
  { re: /play\s*test|game\s*play|console|unreleased\s*build/i, type: "game-playtest" },
  { re: /ux\s*interview|usability|prototype|walk\s*through/i, type: "ux-interview" },
  { re: /focus\s*group/i, type: "focus-group" },
];

const REMOTE_RE = /\b(remote|zoom|online|virtual|video\s*call)\b/i;
const IN_PERSON_RE = /\b(in[- ]person|facility|on[- ]site|campus)\b/i;

const METRO_HINTS: { re: RegExp; metro: Metro; label: string }[] = [
  { re: /\bsan\s*francisco\b|\bsf\b|financial\s*district/i, metro: "sf", label: "San Francisco" },
  { re: /\boakland\b/i, metro: "oakland", label: "Oakland" },
  { re: /\bredwood\s*city\b|\bpeninsula\b|\bpalo\s*alto\b/i, metro: "peninsula", label: "Peninsula" },
  { re: /\bsan\s*jose\b|\bsouth\s*bay\b/i, metro: "san-jose", label: "San Jose" },
  { re: /\blivermore\b|\btri[- ]?valley\b|\beast\s*bay\b/i, metro: "east-bay", label: "East Bay" },
  { re: /\bsouth\s*san\s*francisco\b|\bssf\b|\bredwood\s*shores\b/i, metro: "peninsula", label: "Peninsula" },
];

/** Per-firm light overrides on top of shared regexes. */
const FIRM_OVERRIDES: Record<
  string,
  (ctx: { body: string; draft: StudyDraft; source: Source }) => void
> = {
  fieldwork: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "focus-group";
    if (!draft.modality) draft.modality = "in-person";
    if (!draft.location && draft.metro?.includes("sf")) {
      draft.location = "San Francisco";
      draft.address = draft.address ?? "Fieldwork SF · Financial District";
    }
  },
  tasteocracy: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "product-taste";
    if (!draft.modality) draft.modality = "in-person";
    if (/livermore/i.test(draft.location ?? "") || draft.metro?.includes("east-bay")) {
      draft.location = draft.location ?? "Livermore";
      draft.address =
        draft.address ?? "Tasteocracy Consumer Center · Livermore";
    }
  },
  clc: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "ux-interview";
    if (!draft.modality) draft.modality = "remote";
    if (!draft.location) draft.location = "Remote (Bay Area)";
    if (!draft.metro) {
      draft.metro = ["sf", "oakland", "peninsula", "san-jose", "east-bay"];
    }
  },
  curion: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "product-taste";
    if (!draft.modality) draft.modality = "in-person";
  },
  nichols: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "focus-group";
    if (!draft.modality) draft.modality = "in-person";
  },
  fleischman: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "focus-group";
    if (!draft.modality) draft.modality = "in-person";
    if (!draft.location) {
      draft.location = "San Francisco";
      draft.metro = draft.metro ?? ["sf"];
      draft.address =
        draft.address ?? "Fleischman Field Research · Union Square";
    }
  },
  "le-opinions": ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "focus-group";
  },
  focusgroup: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "focus-group";
  },
  vgm: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "game-playtest";
    if (!draft.modality) draft.modality = "in-person";
    if (/south\s*san\s*francisco|ssf/i.test(draft.location ?? "") || !draft.location) {
      draft.location = draft.location ?? "South San Francisco";
      draft.metro = draft.metro ?? ["peninsula"];
      draft.address = draft.address ?? "VGM labs · South San Francisco";
    }
  },
  "google-ux": ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "ux-interview";
  },
  ea: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "game-playtest";
    if (!draft.modality) draft.modality = "in-person";
    if (!draft.location) {
      draft.location = "Redwood Shores";
      draft.metro = draft.metro ?? ["peninsula"];
      draft.address = draft.address ?? "EA campus · Redwood Shores";
    }
  },
  salesforce: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "ux-interview";
    if (!draft.modality) draft.modality = "remote";
  },
  playtestcloud: ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "game-playtest";
    if (!draft.modality) draft.modality = "remote";
  },
  "user-interviews": ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "ux-interview";
    if (!draft.modality) draft.modality = "remote";
  },
  "meta-arvr": ({ draft, source }) => {
    draft.firm = source.name;
    draft.firmDomain = source.applyDomains[0];
    if (!draft.type) draft.type = "ux-interview";
  },
  "craigslist-sfbay-etc": ({ body, draft }) => {
    const external = externalApplyLink(draft.extractedLinks);
    if (external) draft.applyUrl = external;
    let host = "";
    try {
      host = new URL(draft.applyUrl ?? "").hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      host = "";
    }
    if (/research america/i.test(body)) {
      draft.firm = "Research America";
      draft.firmDomain = host && !host.endsWith("craigslist.org") ? host : "metrixmatrix.com";
    } else if (host && !host.endsWith("craigslist.org")) {
      draft.firm = host;
      draft.firmDomain = host;
    } else {
      draft.firm = "Unknown (Craigslist)";
      draft.firmDomain = "craigslist.org";
    }
    if (/research panel|online or occasionally/i.test(body)) {
      draft.modality = "remote";
      draft.type = draft.type ?? "focus-group";
      if (draft.pay == null) draft.payLabel = draft.payLabel || "Varies / panel";
    }
    const warn =
      "Craigslist etc — unverified aggregator or panel. Verify the firm before Approve.";
    if (!draft.warnings.includes(warn)) draft.warnings.push(warn);
  },
};

function externalApplyLink(links: string[]): string | undefined {
  for (const link of links) {
    let host = "";
    try {
      host = new URL(link).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      continue;
    }
    if (
      host === "schema.org" ||
      host.endsWith(".schema.org") ||
      host === "craigslist.org" ||
      host.endsWith(".craigslist.org") ||
      host === "google.com" ||
      host.endsWith(".google.com")
    ) {
      continue;
    }
    return link;
  }
  return undefined;
}

export function extractLinks(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  // Strip trailing punctuation leftovers
  return Array.from(new Set(found.map((u) => u.replace(/[.,;:]+$/, ""))));
}

export function extractPay(text: string): number | undefined {
  const m = text.match(PAY_RE) ?? text.match(PAY_ALT_RE);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function extractDurationMinutes(text: string): number | undefined {
  const min = text.match(MINUTES_RE);
  if (min) {
    const n = Number(min[1]);
    if (Number.isFinite(n)) return n;
  }
  const hrs = text.match(HOURS_RE);
  if (hrs) {
    const n = Number(hrs[1]);
    if (Number.isFinite(n)) return Math.round(n * 60);
  }
  return undefined;
}

export function extractAgeRange(
  text: string
): { ageMin?: number; ageMax?: number } {
  const m = text.match(AGE_RANGE_RE) ?? text.match(AGE_TO_RE);
  if (!m) return {};
  const ageMin = Number(m[1]);
  const ageMax = Number(m[2]);
  return {
    ageMin: Number.isFinite(ageMin) ? ageMin : undefined,
    ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
  };
}

function guessType(text: string, source?: Source): StudyType | undefined {
  for (const { re, type } of TYPE_HINTS) {
    if (re.test(text)) return type;
  }
  return source?.defaultType;
}

function guessModality(
  text: string,
  source?: Source
): "in-person" | "remote" | undefined {
  const remote = REMOTE_RE.test(text);
  const inPerson = IN_PERSON_RE.test(text);
  if (remote && !inPerson) return "remote";
  if (inPerson && !remote) return "in-person";
  if (remote && inPerson) {
    // Prefer remote if Zoom mentioned alongside facility boilerplate
    if (/zoom|video\s*call/i.test(text)) return "remote";
  }
  return source?.defaultModality;
}

function guessMetroAndLocation(text: string): {
  metro?: Metro[];
  location?: string;
} {
  const hits = METRO_HINTS.filter((h) => h.re.test(text));
  if (hits.length === 0) return {};
  return {
    metro: Array.from(new Set(hits.map((h) => h.metro))),
    location: hits[0].label,
  };
}

/**
 * PlaytestCloud onboarding mail leads with the bare homepage, then the real
 * participation link (app.playtestcloud.com/participations/…, players., /tests/).
 * Prefer those over www.playtestcloud.com/ and over unsubscribe/ESP hosts.
 * Combined with applyLinkScore for every firm (dismiss/unsub lose to apply).
 */
function playtestcloudApplyScore(link: string): number {
  let host = "";
  let path = "/";
  try {
    const u = new URL(link);
    host = u.hostname.replace(/^www\./, "").toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return -1000;
  }
  const bare = path === "/" || path === "";
  let score = 0;
  if (
    host === "email.playtestcloud.com" ||
    /unsubscribe|\/asm\//i.test(path + link)
  ) {
    score -= 100;
  }
  if (host === "app.playtestcloud.com" || host.startsWith("players.")) {
    score += 40;
  }
  if (/\/(tests|playtests|participations|playtest)(\/|$)/i.test(path)) {
    score += 50;
  }
  if (!bare) score += 20;
  else if (host === "playtestcloud.com") score -= 30;
  return score;
}

type LinkParts = { host: string; path: string; search: string };

function linkParts(link: string): LinkParts | undefined {
  try {
    const u = new URL(link);
    return {
      host: u.hostname.replace(/^www\./, "").toLowerCase(),
      path: u.pathname.toLowerCase(),
      search: u.search.toLowerCase(),
    };
  } catch {
    return undefined;
  }
}

function hostAllowlisted(host: string, source: Source): boolean {
  return source.applyDomains.some((d) => host === d || host.endsWith(`.${d}`));
}

function linkAllowlisted(link: string, source: Source): boolean {
  const parts = linkParts(link);
  if (!parts) return false;
  return hostAllowlisted(parts.host, source);
}

/** Dismiss, unsubscribe, and "not interested" — never beat a real apply link. */
function isNegativeApplyLink(link: string): boolean {
  const parts = linkParts(link);
  if (!parts) return false;
  const hay = `${parts.host}${parts.path}${parts.search}`;
  return (
    /(?:^|[/?&#=_.\-])(?:dismiss(?:-project)?|unsubscribe|unsub|not[-_]?interested|opt[-_]?out)(?:[/?&#=_.\-]|$)/i.test(
      hay
    ) || /\/asm\//i.test(parts.path)
  );
}

function isMandrillHost(host: string): boolean {
  return host === "mandrillapp.com" || host.endsWith(".mandrillapp.com");
}

/**
 * Mandrill click wrappers (and similar /track/click URLs).
 * `p` is often base64 JSON with a `u` destination. Unsub trackers return nothing.
 */
function unwrapTrackingDestination(link: string): string | undefined {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return undefined;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const mandrill = isMandrillHost(host);
  if (!mandrill && !/\/track\/click/i.test(u.pathname)) return undefined;
  if (isNegativeApplyLink(link)) return undefined;

  for (const key of ["u", "url", "destination"]) {
    const value = u.searchParams.get(key);
    if (value && /^https?:\/\//i.test(value)) return value;
  }

  const p = u.searchParams.get("p");
  if (!p) return undefined;
  try {
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob works in the admin client bundle and on the server (URLs are ASCII).
    const json = atob(padded);
    const data = JSON.parse(json) as { u?: unknown; url?: unknown };
    const dest = data.u ?? data.url;
    if (typeof dest === "string" && /^https?:\/\//i.test(dest)) return dest;
  } catch {
    /* not a JSON payload */
  }
  return undefined;
}

/** Higher means "this is the screener / apply link". */
function applyIntentScore(link: string): number {
  const parts = linkParts(link);
  if (!parts) return -1000;
  const hay = parts.path + parts.search;
  let score = 0;
  if (/\/projects\/[^/]+\/apply(?:\/|$)/i.test(parts.path)) score += 100;
  else if (
    /(?:^|\/)apply(?:\/|$)/i.test(parts.path) ||
    /[?&](?:apply|application)(?:=|&|$)/i.test(parts.search)
  ) {
    score += 80;
  }
  if (/screener/i.test(hay)) score += 70;
  // Signup/register above schedule, both below a real screener.
  // Kept under PlaytestCloud's participation bonus so /participations beats /signup.
  if (/sign[-_]?up|register/i.test(hay)) score += 45;
  if (/schedule/i.test(hay)) score += 40;
  return score;
}

/**
 * Airtable "contact us" forms are not the study screener when a real apply
 * link is also in the mail.
 */
function isAirtableContactOnly(link: string): boolean {
  const parts = linkParts(link);
  if (!parts) return false;
  if (parts.host !== "airtable.com" && !parts.host.endsWith(".airtable.com")) {
    return false;
  }
  if (applyIntentScore(link) > 0) return false;
  return /contact/i.test(parts.path + parts.search);
}

function isMandrillClick(link: string): boolean {
  const parts = linkParts(link);
  if (!parts || !isMandrillHost(parts.host)) return false;
  if (isNegativeApplyLink(link)) return false;
  return /\/track\/click/i.test(parts.path);
}

/**
 * Rank one URL. Canonical apply/screener beats Mandrill click wrappers.
 * Dismiss / unsubscribe / not-interested sink to the bottom.
 * Equal scores keep earlier-in-body order (caller picks strictly greater).
 */
function applyLinkScore(link: string, source?: Source): number {
  let score = applyIntentScore(link);
  const dest = unwrapTrackingDestination(link);
  if (dest) {
    score += applyIntentScore(dest);
    // Wrapper loses to the same canonical URL printed in the body.
    score -= 15;
  } else if (isMandrillClick(link)) {
    score -= 15;
  }
  if (isNegativeApplyLink(link) || (dest != null && isNegativeApplyLink(dest))) {
    score -= 400;
  }
  if (isAirtableContactOnly(link) || (dest != null && isAirtableContactOnly(dest))) {
    score -= 120;
  }
  if (source?.id === "playtestcloud") score += playtestcloudApplyScore(link);
  return score;
}

function pickBestLink(links: string[], source?: Source): string {
  let best = links[0];
  let bestScore = applyLinkScore(best, source);
  for (const link of links.slice(1)) {
    const score = applyLinkScore(link, source);
    if (score > bestScore) {
      best = link;
      bestScore = score;
    }
  }
  return best;
}

/**
 * A Mandrill click tracker counts when it is not an unsubscribe link.
 * Prefer the bare userinterviews.com/projects/…/apply URL when both exist;
 * if the mail only has the tracker, that tracker is acceptable.
 */
function isUsefulTracker(link: string, source: Source): boolean {
  if (!isMandrillClick(link)) return false;
  const dest = unwrapTrackingDestination(link);
  if (!dest) return true;
  if (isNegativeApplyLink(dest)) return false;
  const parts = linkParts(dest);
  if (parts && hostAllowlisted(parts.host, source)) return true;
  return applyIntentScore(dest) > 0;
}

function pickApplyUrl(
  links: string[],
  source?: Source
): { url?: string; warning?: string } {
  if (links.length === 0) return { warning: "No links found in body" };
  if (!source) {
    return {
      url: pickBestLink(links),
      warning: "Apply link not checked (unknown source)",
    };
  }
  const candidates = links.filter(
    (link) => linkAllowlisted(link, source) || isUsefulTracker(link, source)
  );
  if (candidates.length === 0) {
    return {
      url: links[0],
      warning: `Apply link host not on allowlist for ${source.name}`,
    };
  }
  const best = pickBestLink(candidates, source);
  if (isNegativeApplyLink(best)) {
    return {
      url: best,
      warning: "Only dismiss or unsubscribe links found",
    };
  }
  return { url: best };
}

function titleFromSubject(subject: string): string {
  return subject
    .replace(/^(re:|fwd:)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeConfidence(draft: StudyDraft): number {
  let score = 0;
  if (draft.fromAllowed) score += 30;
  else score -= 20;
  if (draft.pay != null) score += 15;
  if (draft.durationMinutes != null) score += 10;
  if (draft.applyUrl) score += 15;
  if (draft.ageMin != null || draft.ageMax != null) score += 8;
  if (draft.type) score += 7;
  if (draft.modality) score += 5;
  if (draft.location || (draft.metro && draft.metro.length > 0)) score += 5;
  if (draft.firm) score += 5;
  // Penalize warnings lightly
  score -= Math.min(20, draft.warnings.length * 4);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Parse a raw email into a StudyDraft.
 * From-gate first; then shared regexes + per-firm overrides.
 */
export function parseEmail(email: RawEmail): StudyDraft {
  const body = `${email.subject}\n\n${email.text}`;
  const warnings: string[] = [];

  // Keep envelope From on the stored email for audit. When Gmail forwards
  // (baystudies4788@gmail.com / other Gmail), recover the original firm From
  // for allowlist matching — e.g. Info@theclc.com inside a Fwd block.
  let matchFrom = email.from;
  const recoveredFrom = recoverFirmFromForParse(email);
  if (recoveredFrom) {
    matchFrom = recoveredFrom;
  }

  let source = findSourceByFromEmail(matchFrom);
  // If envelope already matched a firm, prefer that over a recovered From.
  const envelopeSource = findSourceByFromEmail(email.from);
  if (envelopeSource) {
    source = envelopeSource;
  } else if (recoveredFrom && source) {
    warnings.push(`From recovered from Gmail forward: ${recoveredFrom}`);
  }

  const fromAllowed = Boolean(source);

  if (!fromAllowed) {
    warnings.push(
      recoveredFrom
        ? "Forwarded From domain not on sources allowlist"
        : "From domain not on sources allowlist"
    );
  }

  const links = extractLinks(body);
  const pay = extractPay(body);
  const durationMinutes = extractDurationMinutes(body);
  const { ageMin, ageMax } = extractAgeRange(body);
  const type = guessType(body, source);
  const modality = guessModality(body, source);
  const { metro, location } = guessMetroAndLocation(body);
  const { url: applyUrl, warning: linkWarn } = pickApplyUrl(links, source);
  if (linkWarn) warnings.push(linkWarn);

  if (pay == null) warnings.push("Could not extract pay");
  if (durationMinutes == null) warnings.push("Could not extract duration");

  const draft: StudyDraft = {
    title: titleFromSubject(email.subject),
    firm: source?.name,
    firmDomain: source?.applyDomains[0],
    pay,
    durationMinutes,
    type,
    modality,
    location,
    metro,
    ageMin,
    ageMax,
    eligibilityNotes:
      ageMin != null || ageMax != null
        ? `Ages ${ageMin ?? "?"}${ageMax != null ? `–${ageMax}` : "+"}`
        : undefined,
    description: email.text.trim().slice(0, 480),
    applyUrl,
    when: guessWhen(body),
    confidence: 0,
    warnings,
    fromAllowed,
    matchedSourceId: source?.id,
    recoveredFrom:
      !envelopeSource && recoveredFrom ? recoveredFrom : undefined,
    extractedLinks: links,
  };

  if (source && FIRM_OVERRIDES[source.id]) {
    FIRM_OVERRIDES[source.id]({ body, draft, source });
  }

  // Refresh eligibility notes after overrides
  if (
    (draft.ageMin != null || draft.ageMax != null) &&
    !draft.eligibilityNotes?.includes("Ages")
  ) {
    draft.eligibilityNotes = `Ages ${draft.ageMin ?? "?"}${
      draft.ageMax != null ? `–${draft.ageMax}` : "+"
    }`;
  }

  draft.confidence = computeConfidence(draft);
  // CL etc is inspiration, not a firm email. Keep confidence under auto-publish.
  if (draft.matchedSourceId === "craigslist-sfbay-etc") {
    draft.confidence = Math.min(42, draft.confidence);
  }
  return draft;
}

function guessWhen(text: string): string | undefined {
  const m = text.match(
    /when\s*[:\-]\s*([^\n]+)|(?:sessions?|evenings?|weekday[^\n]{0,40}|thu\b[^\n]{0,40}|tue\b[^\n]{0,40}|sat\b[^\n]{0,60})/i
  );
  if (!m) return undefined;
  const line = (m[1] ?? m[0]).replace(/^when\s*[:\-]\s*/i, "").trim();
  return line.slice(0, 80) || undefined;
}

export function buildParseLog(email: RawEmail, draft: StudyDraft): ParseLog {
  return {
    id: `plog-${email.id}`,
    emailId: email.id,
    parsedAt: new Date().toISOString(),
    fromAllowed: draft.fromAllowed,
    matchedSourceId: draft.matchedSourceId,
    confidence: draft.confidence,
    warnings: draft.warnings,
    draft,
  };
}

/** Convert an approved draft into a feed Study (fills safe defaults). */
export function draftToStudy(
  draft: StudyDraft,
  emailId: string
): import("./types").Study {
  const id = `pub-${emailId}`;
  const source = draft.matchedSourceId
    ? SOURCES.find((s) => s.id === draft.matchedSourceId)
    : undefined;

  const hasDuration =
    draft.durationMinutes != null || Boolean(draft.durationLabel?.trim());

  const notes = sanitizePublicStudyText(
    draft.eligibilityNotes ?? "See screener for full eligibility details"
  );
  const description = sanitizePublicStudyText(
    draft.description ??
      "Details extracted from an inbound recruiting email. Confirm on the firm site."
  );
  const portalNoteRaw = draft.portalNote?.trim();
  const portalNote = portalNoteRaw
    ? sanitizePublicStudyText(portalNoteRaw) || undefined
    : undefined;

  return {
    id,
    title: sanitizePublicStudyText(draft.title) || "Untitled study",
    firm: draft.firm ?? source?.name ?? "Unknown firm",
    firmDomain: draft.firmDomain ?? source?.applyDomains[0] ?? "example.com",
    verified:
      draft.matchedSourceId === "craigslist-sfbay-etc"
        ? false
        : Boolean(draft.fromAllowed && draft.confidence >= 60),
    pay: draft.pay ?? 0,
    payLabel: draft.payLabel?.trim() || undefined,
    durationMinutes: draft.durationMinutes ?? (hasDuration ? 0 : 60),
    durationLabel: draft.durationLabel?.trim() || undefined,
    type: draft.type ?? source?.defaultType ?? "focus-group",
    modality: draft.modality ?? source?.defaultModality ?? "in-person",
    location: draft.location ?? "Bay Area",
    metro: draft.metro?.length
      ? draft.metro
      : ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: draft.when ?? "See screener for dates",
    address: draft.address,
    eligibility: {
      ageMin: draft.ageMin,
      ageMax: draft.ageMax,
      notes: notes || "See screener for full eligibility details",
    },
    description:
      description ||
      "Details extracted from an inbound recruiting email. Confirm on the firm site.",
    applyUrl: draft.applyUrl ?? `https://${draft.firmDomain ?? "example.com"}/`,
    portalNote,
    publishedAt: new Date().toISOString(),
    expired: false,
    linkStatus: null,
  };
}
