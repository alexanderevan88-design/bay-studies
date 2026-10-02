/**
 * Week 4 — simple localStorage analytics counters (offline / demo-safe).
 * publishes · opens · falseRejects
 */

export type AnalyticsCounters = {
  publishes: number;
  opens: number;
  falseRejects: number;
};

const ANALYTICS_KEY = "bay-studies-analytics-v1";
const TRUSTED_DOMAINS_KEY = "bay-studies-trusted-from-v1";
const AUTO_PUBLISH_KEY = "bay-studies-auto-publish-v1";

/** Confidence is stored 0–100; threshold 75 ≡ 0.75. */
export const AUTO_PUBLISH_CONFIDENCE_THRESHOLD = 75;

export const ANALYTICS_EVENT = "bay-studies-analytics";

const EMPTY: AnalyticsCounters = {
  publishes: 0,
  opens: 0,
  falseRejects: 0,
};

export function loadAnalytics(): AnalyticsCounters {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AnalyticsCounters>;
    return {
      publishes: Number(parsed.publishes) || 0,
      opens: Number(parsed.opens) || 0,
      falseRejects: Number(parsed.falseRejects) || 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

function saveAnalytics(c: AnalyticsCounters): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(ANALYTICS_EVENT));
}

export function bumpPublish(): AnalyticsCounters {
  const cur = loadAnalytics();
  const updated = { ...cur, publishes: cur.publishes + 1 };
  saveAnalytics(updated);
  return updated;
}

export function bumpOpen(): AnalyticsCounters {
  const cur = loadAnalytics();
  const updated = { ...cur, opens: cur.opens + 1 };
  saveAnalytics(updated);
  return updated;
}

export function bumpFalseReject(): AnalyticsCounters {
  const cur = loadAnalytics();
  const updated = { ...cur, falseRejects: cur.falseRejects + 1 };
  saveAnalytics(updated);
  return updated;
}

export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ANALYTICS_KEY);
  window.dispatchEvent(new Event(ANALYTICS_EVENT));
}

/* ── Trusted From domains (manual Approve unlocks auto-publish) ── */

export function loadTrustedFromDomains(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRUSTED_DOMAINS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list.map((d) => d.toLowerCase()) : [];
  } catch {
    return [];
  }
}

export function trustFromDomain(domain: string): string[] {
  const d = domain.toLowerCase();
  const current = loadTrustedFromDomains();
  if (current.includes(d)) return current;
  const next = [...current, d];
  if (typeof window !== "undefined") {
    localStorage.setItem(TRUSTED_DOMAINS_KEY, JSON.stringify(next));
  }
  return next;
}

export function isNewFromDomain(domain: string | null | undefined): boolean {
  if (!domain) return true;
  return !loadTrustedFromDomains().includes(domain.toLowerCase());
}

export function clearTrustedFromDomains(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TRUSTED_DOMAINS_KEY);
}

/* ── Auto-publish preference toggle ─────────────────────────────── */

export function loadAutoPublishEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_PUBLISH_KEY) === "1";
}

export function saveAutoPublishEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_PUBLISH_KEY, on ? "1" : "0");
}

export function clearAutoPublishPref(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTO_PUBLISH_KEY);
}

/** Eligible for auto-publish: high confidence, allowlisted, domain already trusted. */
export function canAutoPublish(opts: {
  confidence: number;
  fromAllowed: boolean;
  fromDomain: string | null;
}): boolean {
  return (
    opts.fromAllowed &&
    opts.confidence >= AUTO_PUBLISH_CONFIDENCE_THRESHOLD &&
    !isNewFromDomain(opts.fromDomain)
  );
}
