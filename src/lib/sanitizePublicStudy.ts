import type { Study } from "./types";

/**
 * Strip panelist PII from text destined for consumer feed / detail cards.
 * Admin ingest may still show raw email bodies; public Study fields must not.
 *
 * Removes: emails, PID patterns, Username:/Password: lines, dangling
 * "Panelist login:" / credentials prefixes.
 */
export function sanitizePublicStudyText(
  input: string | undefined | null
): string {
  if (input == null) return "";
  let text = String(input);

  // Entire credential lines (Username: / Password: / User ID:)
  text = text.replace(
    /^[ \t]*(?:user\s*name|username|user\s*id|login\s*id|password|passwd|pwd)\s*[:\-].*$/gim,
    ""
  );

  // Email addresses
  text = text.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    ""
  );

  // PID 2251470 / (PID 2251470) / PID: #2251470
  text = text.replace(/\(?\bPID\s*[:#]?\s*\d{4,}\)?/gi, "");

  // Dangling "Panelist login:" / "login:" / "credentials:" after value strip
  text = text.replace(
    /\b(?:panelist\s+)?(?:login|credentials?)\s*[:\-]\s*/gi,
    ""
  );

  // Empty parens / brackets left behind
  text = text.replace(/\(\s*\)/g, "").replace(/\[\s*\]/g, "");

  // Whitespace + punctuation cleanup
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/\s+([.,;:])/g, "$1");
  text = text.replace(/([.!?]){2,}/g, "$1");
  text = text.replace(/\s+\./g, ".");

  return text.trim();
}

const PERSONAL_PARAM =
  /(?:^|_)(?:participant(?:_?id|_?screener_?key|_?key)?|screener_?key|panelist(?:_?id)?|pid|uid|user_?id|access_?token|auth_?token|session(?:_?id)?|signature|sig|refcode|as-refcode|upn|token|email|ref)$/i;

function isPersonalParam(key: string): boolean {
  const k = key.toLowerCase().replace(/\[\]$/, "");
  if (k.startsWith("prefill_")) return true;
  if (/participant|screener[_-]?key|panelist|refcode/.test(k)) return true;
  return PERSONAL_PARAM.test(k);
}

function isTrackingHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return (
    host === "mandrillapp.com" ||
    host.endsWith(".mandrillapp.com") ||
    host === "sendgrid.net" ||
    host.endsWith(".sendgrid.net") ||
    host.endsWith(".ct.sendgrid.net") ||
    host.endsWith(".awstrack.me") ||
    host === "pstmrk.it" ||
    host.endsWith(".pstmrk.it")
  );
}

function decodeBase64Url(value: string): string | undefined {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return atob(padded);
  } catch {
    return undefined;
  }
}

/** Plaintext destination buried in a Mandrill/SendGrid-style click wrapper. */
function trackingDestination(link: string): string | undefined {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return undefined;
  }

  for (const key of ["u", "url", "destination"]) {
    const value = u.searchParams.get(key);
    if (value && /^https?:\/\//i.test(value)) return value;
  }

  const p = u.searchParams.get("p");
  if (p && isTrackingHost(u.hostname)) {
    const decoded = decodeBase64Url(p);
    if (decoded) {
      try {
        const data = JSON.parse(decoded) as { u?: unknown; url?: unknown };
        const dest = data.u ?? data.url;
        if (typeof dest === "string" && /^https?:\/\//i.test(dest)) return dest;
      } catch {
        /* encrypted or non-JSON payload */
      }
    }
  }

  // AWS SES: /L0/https:%2F%2Fexample.com%2Fpath/...
  const awstrack = u.pathname.match(/\/L0\/(https?:%2F%2F[^/]+)/i);
  if (awstrack) {
    try {
      const dest = decodeURIComponent(awstrack[1]);
      if (/^https?:\/\//i.test(dest)) return dest;
    } catch {
      /* ignore */
    }
  }

  return undefined;
}

function unwrapTrackingUrl(raw: string): string {
  let current = raw.trim();
  for (let i = 0; i < 5; i++) {
    const next = trackingDestination(current);
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

/** https://www.userinterviews.com/projects/{id}/apply with no session query. */
function userInterviewsProjectApply(url: URL): string | undefined {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "userinterviews.com") return undefined;
  const match = url.pathname.match(/^\/projects\/([^/]+)(?:\/apply)?\/?$/i);
  if (!match) return undefined;
  const id = match[1];
  if (!id || id.toLowerCase() === "apply") return undefined;
  return `https://www.userinterviews.com/projects/${id}/apply`;
}

function stripPersonalParams(url: URL): void {
  const drop: string[] = [];
  url.searchParams.forEach((_value, key) => {
    if (isPersonalParam(key) && drop.indexOf(key) === -1) drop.push(key);
  });
  drop.forEach((key) => url.searchParams.delete(key));
}

/** Login/portal roots are not a study page a friend can open. */
function isGenericPortal(url: URL): boolean {
  const path = url.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  return (
    path === "/portal" ||
    path === "/portal/default" ||
    path === "/login" ||
    path === "/signin" ||
    path === "/sign-in" ||
    path === "/account"
  );
}

function firmHomepage(firmDomain: string): string | undefined {
  const host = firmDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .toLowerCase();
  if (!host || !host.includes(".")) return undefined;
  return `https://${host}/`;
}

export type ApplyUrlOptions = { firmDomain?: string };

/**
 * Shareable apply link: unwrap plaintext trackers, drop participant session
 * params, and prefer a clean User Interviews project apply URL.
 * Firm homepage is only used when the link is still a tracker or a generic
 * portal and no project URL could be recovered.
 */
export function normalizePublicApplyUrl(
  raw: string | undefined | null,
  opts?: ApplyUrlOptions
): string {
  if (raw == null) return "";
  const unwrapped = unwrapTrackingUrl(String(raw).trim());
  if (!unwrapped) return "";
  let url: URL;
  try {
    url = new URL(unwrapped);
  } catch {
    return String(raw).trim();
  }

  const project = userInterviewsProjectApply(url);
  if (project) return project;

  const parsed = url.toString();
  stripPersonalParams(url);

  const homepage = opts?.firmDomain ? firmHomepage(opts.firmDomain) : undefined;
  if (homepage && (isTrackingHost(url.hostname) || isGenericPortal(url))) {
    return homepage;
  }

  // No session params removed and no tracker unwrapped: keep the caller's URL.
  if (url.toString() === parsed && unwrapped === String(raw).trim()) {
    return String(raw).trim();
  }

  return url.toString();
}

function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return false;
  }
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return false;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^169\.254\./.test(host)) {
    return false;
  }
  return true;
}

async function followTrackingRedirect(link: string): Promise<string | undefined> {
  if (!isPublicHttpUrl(link)) return undefined;
  try {
    const res = await fetch(link, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "BayStudiesLinkScrub/1.0" },
    });
    if (res.status < 300 || res.status >= 400) return undefined;
    const loc = res.headers.get("location");
    if (!loc) return undefined;
    const next = new URL(loc, link).toString();
    if (!isPublicHttpUrl(next)) return undefined;
    return next;
  } catch {
    return undefined;
  }
}

/**
 * Like normalizePublicApplyUrl, but follows Mandrill/SendGrid (and similar)
 * redirects when the destination is not embedded in the URL.
 */
export async function resolvePublicApplyUrl(
  raw: string | undefined | null,
  opts?: ApplyUrlOptions
): Promise<string> {
  let current = unwrapTrackingUrl(String(raw ?? "").trim());
  for (let hop = 0; hop < 4; hop++) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      break;
    }
    if (!isTrackingHost(url.hostname)) break;
    const next = await followTrackingRedirect(current);
    if (!next || next === current) break;
    current = unwrapTrackingUrl(next);
  }
  return normalizePublicApplyUrl(current, opts);
}

const PUBLIC_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

/**
 * Rewrite links inside card text. Tracking wrappers are replaced with the
 * study's public apply URL so the body does not keep a personal click token.
 */
function rewritePublicUrls(
  text: string,
  opts: { firmDomain?: string; applyUrl: string }
): string {
  return text.replace(PUBLIC_URL_RE, (raw) => {
    const trimmed = raw.replace(/[.,;:]+$/, "");
    const suffix = raw.slice(trimmed.length);
    let next = normalizePublicApplyUrl(trimmed, { firmDomain: opts.firmDomain });
    try {
      if (isTrackingHost(new URL(trimmed).hostname) && opts.applyUrl) {
        next = opts.applyUrl;
      }
    } catch {
      /* keep normalized */
    }
    return (next || trimmed) + suffix;
  });
}

/** Scrub public-facing string fields on a Study before feed persistence. */
export function sanitizeStudyForPublic(study: Study): Study {
  const applyUrl =
    normalizePublicApplyUrl(study.applyUrl, { firmDomain: study.firmDomain }) ||
    study.applyUrl;
  const urlOpts = { firmDomain: study.firmDomain, applyUrl };

  const notes = rewritePublicUrls(
    sanitizePublicStudyText(study.eligibility?.notes),
    urlOpts
  );
  const description = rewritePublicUrls(
    sanitizePublicStudyText(study.description),
    urlOpts
  );
  const portalNoteRaw = study.portalNote?.trim();
  const portalNote = portalNoteRaw
    ? rewritePublicUrls(sanitizePublicStudyText(portalNoteRaw), urlOpts) ||
      undefined
    : undefined;
  const title =
    rewritePublicUrls(sanitizePublicStudyText(study.title) || study.title, urlOpts);
  const when =
    rewritePublicUrls(sanitizePublicStudyText(study.when) || study.when, urlOpts);
  const address = study.address
    ? rewritePublicUrls(sanitizePublicStudyText(study.address), urlOpts) ||
      undefined
    : undefined;
  const location = rewritePublicUrls(
    sanitizePublicStudyText(study.location) || study.location,
    urlOpts
  );

  return {
    ...study,
    title,
    when,
    location,
    address,
    applyUrl,
    description:
      description ||
      "Details extracted from an inbound recruiting email. Confirm on the firm site.",
    portalNote,
    eligibility: {
      ...study.eligibility,
      notes: notes || "See screener for full eligibility details",
    },
  };
}
