import { findSourceByFromEmail, SOURCES } from "@/data/sources";
import type {
  Metro,
  RawEmail,
  Source,
  StudyDraft,
  StudyType,
  ParseLog,
} from "./types";

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
};

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

function pickApplyUrl(
  links: string[],
  source?: Source
): { url?: string; warning?: string } {
  if (links.length === 0) return { warning: "No links found in body" };
  if (!source) {
    return { url: links[0], warning: "Apply link not checked (unknown source)" };
  }
  const allowed = links.filter((link) => {
    try {
      const host = new URL(link).hostname.replace(/^www\./, "").toLowerCase();
      return source.applyDomains.some(
        (d) => host === d || host.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  });
  if (allowed.length > 0) return { url: allowed[0] };
  return {
    url: links[0],
    warning: `Apply link host not on allowlist for ${source.name}`,
  };
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
  const source = findSourceByFromEmail(email.from);
  const fromAllowed = Boolean(source);
  const warnings: string[] = [];

  if (!fromAllowed) {
    warnings.push("From domain not on sources allowlist");
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

  return {
    id,
    title: draft.title ?? "Untitled study",
    firm: draft.firm ?? source?.name ?? "Unknown firm",
    firmDomain: draft.firmDomain ?? source?.applyDomains[0] ?? "example.com",
    verified: Boolean(draft.fromAllowed && draft.confidence >= 60),
    pay: draft.pay ?? 0,
    durationMinutes: draft.durationMinutes ?? 60,
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
      notes:
        draft.eligibilityNotes ??
        "See screener for full eligibility details",
    },
    description:
      draft.description ??
      "Details extracted from an inbound recruiting email. Confirm on the firm site.",
    applyUrl: draft.applyUrl ?? `https://${draft.firmDomain ?? "example.com"}/`,
    publishedAt: new Date().toISOString(),
    expired: false,
    linkStatus: null,
  };
}
