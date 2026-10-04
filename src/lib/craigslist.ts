import type { InboxItem } from "./inboxStore";
import type { Metro, ParseLog, RawEmail, Study, StudyDraft } from "./types";

/** Inspiration source id — human Approve still required. Not a verified firm. */
export const CRAIGSLIST_SOURCE_ID = "craigslist-sfbay-etc";

export const CRAIGSLIST_SEARCH_URL =
  "https://sapi.craigslist.org/web/v8/postings/search/full";

export const CRAIGSLIST_REFERER = "https://sfbay.craigslist.org/";

/** Jobs → etc, SF Bay, 50 miles from 94103. */
export const DEFAULT_QUERIES = [
  "focus group",
  "focus groups",
  "market research",
  "paid study",
  "get paid research",
];

const BAY_SUBAREAS = new Set(["sfc", "eby", "pen", "sby", "nby", "scz"]);

const BAY_LOCATION_RE =
  /\b(san francisco|oakland|berkeley|bay area|walnut creek|peninsula|san jose|sunnyvale|palo alto|fremont|hayward|marin|daly city|richmond|concord|south bay|east bay|north bay|san mateo|redwood|alameda|santa clara|mountain view|san rafael)\b/i;

const INCLUDE_RE =
  /focus\s*groups?|market\s*research|paid\s*(?:study|focus|research)|participants?\s+needed|research\s+panel|get\s+paid(?:\s+for\s+your\s+opinions)?/i;

const NOISE_RE =
  /\b(dentist|endo\s*focus|speech\s*language|pathologist|teacher|tutor|mechanic|nanny|babysit)\b/i;

/** Clinical trials stay out of inbox and the public feed. */
export const CLINICAL_RE =
  /\b(hiv|vaccine|c\.?\s*diff|c-diff|clostridium|investigational|antibody\s*infusion|phase\s*1|clinical\s*trial|flourish\s*research)\b/i;

const OUT_OF_AREA_RE =
  /\b(jamestown|tuolumne|sacramento|auburn|stockton|modesto|fresno|tracy|merced)\b/i;

const SKIP_HOSTS = new Set([
  "schema.org",
  "craigslist.org",
  "google.com",
  "maps.google.com",
  "gstatic.com",
  "facebook.com",
]);

export interface CraigslistListing {
  postingId: number;
  postedEpoch: number;
  title: string;
  url: string;
  subarea: string;
  location: string;
  price: number | null;
  body: string;
  applyUrl?: string;
  links: string[];
  pay?: number;
  matchedQuery?: string;
}

export interface CraigslistSkip {
  postingId?: number;
  title?: string;
  reason: string;
}

interface DecodeTables {
  minPostingId: number;
  minPostedDate: number;
  locations: unknown[];
  locationDescriptions: unknown[];
}

interface SearchResponse {
  data?: {
    areas?: Record<string, { name?: string }>;
    totalResultCount?: number;
    items?: unknown[];
    decode?: DecodeTables;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isSkippableHost(host: string): boolean {
  if (!host) return true;
  if (SKIP_HOSTS.has(host)) return true;
  if (host.endsWith(".craigslist.org") || host.endsWith(".schema.org")) return true;
  if (host.endsWith(".google.com") || host === "goo.gl") return true;
  return false;
}

/** Prefer a non-Craigslist https apply link from the posting body. */
export function pickExternalApplyUrl(links: string[]): string | undefined {
  const cleaned = links
    .map((u) => u.replace(/&amp;/g, "&").replace(/\\+$/g, "").trim())
    .filter((u) => /^https:\/\//i.test(u));
  return cleaned.find((u) => !isSkippableHost(hostOf(u)));
}

export function isClinicalText(text: string): boolean {
  return CLINICAL_RE.test(text);
}

export function isBayListing(listing: {
  subarea?: string;
  location?: string;
  title?: string;
  body?: string;
}): boolean {
  const sub = (listing.subarea ?? "").toLowerCase();
  if (sub && BAY_SUBAREAS.has(sub)) return true;
  const loc = listing.location ?? "";
  if (BAY_LOCATION_RE.test(loc) && !OUT_OF_AREA_RE.test(loc)) return true;
  return false;
}

function decodeLocation(
  raw: string,
  decode: DecodeTables
): { subarea: string; location: string } {
  const locIdx = Number(raw.split(":")[0]);
  const hoodIdx = Number((raw.split(":")[1] ?? "").split("~")[0]);
  const locRow = decode.locations[locIdx];
  const subarea =
    Array.isArray(locRow) && typeof locRow[2] === "string" ? locRow[2] : "";
  const hood = decode.locationDescriptions[hoodIdx];
  const location = typeof hood === "string" ? hood : "";
  return { subarea, location };
}

function titleOf(item: unknown[]): string {
  for (let i = item.length - 1; i >= 0; i -= 1) {
    const el = item[i];
    if (typeof el === "string" && el.trim()) return el.trim();
  }
  return "";
}

function tagged(item: unknown[], code: number): string | undefined {
  for (const el of item) {
    if (Array.isArray(el) && el[0] === code && typeof el[1] === "string") {
      return el[1];
    }
  }
  return undefined;
}

export function decodeSearchItems(
  payload: SearchResponse,
  matchedQuery: string
): CraigslistListing[] {
  const data = payload.data;
  if (!data?.decode || !Array.isArray(data.items)) return [];
  const { minPostingId, minPostedDate } = data.decode;
  const out: CraigslistListing[] = [];
  for (const raw of data.items) {
    if (!Array.isArray(raw)) continue;
    const postingId = minPostingId + Number(raw[0]);
    const postedEpoch = minPostedDate + Number(raw[1]);
    const priceRaw = raw[3];
    const price =
      typeof priceRaw === "number" && priceRaw > 0 ? priceRaw : null;
    const locRaw = typeof raw[4] === "string" ? raw[4] : "";
    const { subarea, location } = locRaw
      ? decodeLocation(locRaw, data.decode)
      : { subarea: "", location: "" };
    const slug = tagged(raw, 6);
    const key = tagged(raw, 13);
    if (!slug || !key || !Number.isFinite(postingId)) continue;
    out.push({
      postingId,
      postedEpoch,
      title: titleOf(raw),
      url: `https://www.craigslist.org/view/d/${slug}/${key}`,
      subarea,
      location,
      price,
      body: "",
      links: [],
      matchedQuery,
    });
  }
  return out;
}

function decodeHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function parsePostingHtml(html: string): {
  title?: string;
  body: string;
  links: string[];
} {
  const title = html.match(/id="titletextonly"[^>]*>\s*([^<]+)/i)?.[1]?.trim();
  const bodyHtml =
    html.match(/id="postingbody"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ?? "";
  const links = Array.from(
    bodyHtml.matchAll(/href="(https?:\/\/[^"]+)"/gi),
    (m) => m[1]
  );
  const plainLinks = bodyHtml.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  return {
    title,
    body: decodeHtml(bodyHtml),
    links: Array.from(new Set([...links, ...plainLinks])),
  };
}

function extractPay(text: string): number | undefined {
  const m =
    text.match(/\$\s*(\d{2,4})(?:\.\d{2})?/) ??
    text.match(/\b(\d{2,4})\s*(?:dollars|usd)\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

async function fetchText(url: string, referer: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Referer: referer,
      "User-Agent": "bay-studies-craigslist-import/0.1",
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Craigslist ${res.status} for ${url}`);
  }
  return res.text();
}

export async function searchEtc(query: string): Promise<{
  listings: CraigslistListing[];
  area?: string;
  total?: number;
}> {
  const params = new URLSearchParams({
    searchPath: "etc",
    query,
    sort: "date",
    batch: "1-0-360-1-0",
    lang: "en",
    cc: "us",
    postal: "94103",
    search_distance: "50",
  });
  const url = `${CRAIGSLIST_SEARCH_URL}?${params.toString()}`;
  const json = JSON.parse(await fetchText(url, CRAIGSLIST_REFERER)) as SearchResponse;
  const areas = json.data?.areas ?? {};
  const area = Object.values(areas)[0]?.name;
  return {
    listings: decodeSearchItems(json, query),
    area,
    total: json.data?.totalResultCount,
  };
}

export async function enrichListing(
  listing: CraigslistListing
): Promise<CraigslistListing> {
  const html = await fetchText(listing.url, CRAIGSLIST_REFERER);
  const parsed = parsePostingHtml(html);
  const links = parsed.links;
  const body = parsed.body;
  const applyUrl = pickExternalApplyUrl(links);
  const pay = extractPay(`${listing.title}\n${body}`) ?? listing.price ?? undefined;
  return {
    ...listing,
    title: parsed.title || listing.title,
    body,
    links,
    applyUrl,
    pay: pay ?? undefined,
  };
}

export interface ScrapeOptions {
  nowEpoch?: number;
  maxAgeDays?: number;
  queries?: string[];
  /** Include Jamestown / Sacramento / etc. Still never includes clinical. */
  includeOutOfArea?: boolean;
  pauseMs?: number;
}

export async function scrapeBayEtc(
  opts: ScrapeOptions = {}
): Promise<{ kept: CraigslistListing[]; skipped: CraigslistSkip[]; area?: string }> {
  const now = opts.nowEpoch ?? Math.floor(Date.now() / 1000);
  const maxAge = (opts.maxAgeDays ?? 7) * 24 * 60 * 60;
  const queries = opts.queries ?? DEFAULT_QUERIES;
  const pauseMs = opts.pauseMs ?? 1100;
  const skipped: CraigslistSkip[] = [];
  const byId = new Map<number, CraigslistListing>();
  let area: string | undefined;

  for (let i = 0; i < queries.length; i += 1) {
    if (i > 0) await sleep(pauseMs);
    let result: Awaited<ReturnType<typeof searchEtc>>;
    try {
      result = await searchEtc(queries[i]);
    } catch (err) {
      skipped.push({
        reason: `search failed (${queries[i]}): ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    area = area ?? result.area;
    if (result.area && result.area !== "sfbay") {
      skipped.push({
        reason: `search area was ${result.area}, expected sfbay (${queries[i]})`,
      });
    }
    for (const listing of result.listings) {
      if (byId.has(listing.postingId)) continue;
      const age = now - listing.postedEpoch;
      if (age > maxAge || age < -3600) {
        skipped.push({
          postingId: listing.postingId,
          title: listing.title,
          reason: "older than 7 days",
        });
        continue;
      }
      const hayTitle = listing.title;
      if (NOISE_RE.test(hayTitle)) {
        skipped.push({
          postingId: listing.postingId,
          title: listing.title,
          reason: "noise (job / dentist / teacher / etc.)",
        });
        continue;
      }
      if (isClinicalText(hayTitle)) {
        skipped.push({
          postingId: listing.postingId,
          title: listing.title,
          reason: "clinical (title)",
        });
        continue;
      }
      if (!INCLUDE_RE.test(hayTitle)) {
        skipped.push({
          postingId: listing.postingId,
          title: listing.title,
          reason: "title is not focus group / market research / paid study",
        });
        continue;
      }
      const bay = isBayListing(listing);
      if (!bay && !opts.includeOutOfArea) {
        skipped.push({
          postingId: listing.postingId,
          title: listing.title,
          reason: `outside Bay metros (${listing.location || listing.subarea || "unknown"})`,
        });
        continue;
      }
      byId.set(listing.postingId, listing);
    }
  }

  const kept: CraigslistListing[] = [];
  const seenApply = new Set<string>();
  const ids = Array.from(byId.values()).sort((a, b) => b.postedEpoch - a.postedEpoch);
  for (let i = 0; i < ids.length; i += 1) {
    if (i > 0) await sleep(pauseMs);
    let full: CraigslistListing;
    try {
      full = await enrichListing(ids[i]);
    } catch (err) {
      skipped.push({
        postingId: ids[i].postingId,
        title: ids[i].title,
        reason: `posting fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }
    const blob = `${full.title}\n${full.body}`;
    if (isClinicalText(blob)) {
      skipped.push({
        postingId: full.postingId,
        title: full.title,
        reason: "clinical (body) — not imported",
      });
      continue;
    }
    if (NOISE_RE.test(blob) && !INCLUDE_RE.test(full.title)) {
      skipped.push({
        postingId: full.postingId,
        title: full.title,
        reason: "noise after body fetch",
      });
      continue;
    }
    const applyKey = full.applyUrl
      ? full.applyUrl.replace(/\/+$/, "").toLowerCase()
      : "";
    if (applyKey && seenApply.has(applyKey)) {
      skipped.push({
        postingId: full.postingId,
        title: full.title,
        reason: "duplicate apply link (kept the newer Bay posting)",
      });
      continue;
    }
    if (applyKey) seenApply.add(applyKey);
    kept.push(full);
  }

  return { kept, skipped, area };
}

function metrosFor(listing: CraigslistListing): Metro[] {
  const text = `${listing.location} ${listing.body} ${listing.subarea}`;
  const metros = new Set<Metro>();
  if (/\bsan francisco\b|\bsfc\b|\bsf county\b/i.test(text)) metros.add("sf");
  if (/\boakland\b/i.test(text)) metros.add("oakland");
  if (/\bpeninsula\b|\bpalo alto\b|\bsan mateo\b|\bredwood\b/i.test(text)) {
    metros.add("peninsula");
  }
  if (/\bsan jose\b|\bsouth bay\b|\bsunnyvale\b|\bsanta clara\b/i.test(text)) {
    metros.add("san-jose");
  }
  if (/\beast bay\b|\bberkeley\b|\bwalnut creek\b|\bfremont\b|\bhayward\b/i.test(text)) {
    metros.add("east-bay");
  }
  if (/\bbay area\b|\bsurrounding counties\b/i.test(text) || metros.size === 0) {
    if (isBayListing(listing)) {
      return ["sf", "oakland", "peninsula", "san-jose", "east-bay"];
    }
  }
  if (metros.size === 0 && isBayListing(listing)) {
    return ["sf", "oakland", "peninsula", "san-jose", "east-bay"];
  }
  return Array.from(metros);
}

function firmFromListing(listing: CraigslistListing): {
  firm: string;
  firmDomain: string;
} {
  if (/research america/i.test(listing.body) || /research america/i.test(listing.title)) {
    return { firm: "Research America", firmDomain: hostOf(listing.applyUrl ?? "") || "metrixmatrix.com" };
  }
  const host = hostOf(listing.applyUrl ?? "");
  if (host) return { firm: host, firmDomain: host };
  return { firm: "Unknown (Craigslist)", firmDomain: "craigslist.org" };
}

const AGGREGATOR_WARNING =
  "Craigslist etc — unverified aggregator or panel. Verify the firm before Approve.";

export function listingToDraft(listing: CraigslistListing): StudyDraft {
  const { firm, firmDomain } = firmFromListing(listing);
  const bay = isBayListing(listing);
  const panel = /research panel|join a (?:local )?paid market research panel|online or occasionally/i.test(
    `${listing.title}\n${listing.body}`
  );
  const warnings = [
    AGGREGATOR_WARNING,
    "Human Approve required. Craigslist is an inspiration source, not a verified firm.",
  ];
  if (!bay) {
    warnings.push(
      `Outside core Bay metros (${listing.location || "unknown"}). Confirm before Approve.`
    );
  }
  if (!listing.applyUrl) {
    warnings.push("No non-Craigslist apply link found in the posting.");
  }
  const links = Array.from(
    new Set(
      [...listing.links, listing.applyUrl, listing.url].filter(
        (u): u is string => Boolean(u)
      )
    )
  );
  const pay = panel ? undefined : listing.pay;
  return {
    title: listing.title,
    firm,
    firmDomain,
    pay,
    payLabel: panel ? "Varies / panel" : undefined,
    type: "focus-group",
    modality: panel ? "remote" : "in-person",
    location: listing.location || (bay ? "Bay Area" : undefined),
    metro: metrosFor(listing),
    description: listing.body.slice(0, 900),
    applyUrl: listing.applyUrl || listing.url,
    when: panel ? "Ongoing panel — see screener" : undefined,
    eligibilityNotes: bay
      ? "See Craigslist posting and screener. Bay Area listing; firm is unverified."
      : `See posting. Location: ${listing.location || "not a Bay metro"}.`,
    confidence: 38,
    warnings,
    fromAllowed: true,
    matchedSourceId: CRAIGSLIST_SOURCE_ID,
    extractedLinks: links,
    portalNote: bay
      ? "Source: Craigslist SF Bay jobs → etc. Unverified — confirm before you apply."
      : `Source: Craigslist. Location: ${listing.location || "outside Bay metros"}. Unverified — confirm before you apply.`,
  };
}

export function listingToEmail(listing: CraigslistListing): RawEmail {
  const draft = listingToDraft(listing);
  const posted = new Date(listing.postedEpoch * 1000).toISOString();
  const text = [
    listing.body,
    "",
    `Listing: ${listing.url}`,
    draft.applyUrl ? `Apply: ${draft.applyUrl}` : "",
    listing.location ? `Location: ${listing.location}` : "",
    draft.pay != null ? `Pay: $${draft.pay}` : draft.payLabel ? `Pay: ${draft.payLabel}` : "",
    "Source: Craigslist SF Bay jobs → etc (inspiration only; human Approve required).",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    id: `cl-${listing.postingId}`,
    messageId: `<cl-${listing.postingId}@craigslist.org>`,
    from: "Craigslist SF Bay etc <listings@craigslist.org>",
    to: "inbox@baystudies.local",
    subject: listing.title,
    receivedAt: posted,
    text,
  };
}

export function listingToInboxItem(listing: CraigslistListing, storedAt = new Date().toISOString()): InboxItem {
  const email = listingToEmail(listing);
  const draft = listingToDraft(listing);
  const parseLog: ParseLog = {
    id: `plog-${email.id}`,
    emailId: email.id,
    parsedAt: storedAt,
    fromAllowed: true,
    matchedSourceId: CRAIGSLIST_SOURCE_ID,
    confidence: draft.confidence,
    warnings: draft.warnings,
    draft,
  };
  return {
    email,
    draft,
    parseLog,
    provider: "craigslist",
    storedAt,
  };
}

/** Public feed card. verified is always false — CL is not a firm allowlist hit. */
export function listingToStudy(listing: CraigslistListing, publishedAt = new Date().toISOString()): Study {
  const draft = listingToDraft(listing);
  const hasDuration = draft.durationMinutes != null || Boolean(draft.durationLabel);
  return {
    id: `pub-cl-${listing.postingId}`,
    title: draft.title || listing.title,
    firm: draft.firm || "Unknown (Craigslist)",
    firmDomain: draft.firmDomain || "craigslist.org",
    verified: false,
    pay: draft.pay ?? 0,
    payLabel: draft.payLabel,
    durationMinutes: draft.durationMinutes ?? (hasDuration ? 0 : 0),
    durationLabel: draft.durationLabel,
    type: draft.type ?? "focus-group",
    modality: draft.modality ?? "in-person",
    location: draft.location || "Bay Area",
    metro: draft.metro?.length
      ? draft.metro
      : ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: draft.when || "See screener",
    eligibility: {
      notes: draft.eligibilityNotes || "See the Craigslist posting and screener.",
    },
    description: draft.description || listing.body.slice(0, 480),
    applyUrl: draft.applyUrl || listing.url,
    portalNote: draft.portalNote,
    publishedAt,
    expired: false,
    linkStatus: null,
  };
}
