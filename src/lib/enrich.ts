import type { Study, StudyDraft } from "./types";
import { formatDuration } from "./match";
import { sanitizePublicStudyText } from "./sanitizePublicStudy";

/** Editable enrich fields on /admin/ingest before Approve. */
export type EnrichFields = {
  title: string;
  firm: string;
  description: string;
  /** Free text — numeric portion used for match when present. */
  pay: string;
  /** Free text — minutes parsed when possible. */
  duration: string;
  location: string;
  modality: "" | "in-person" | "remote";
  applyUrl: string;
  portalNote: string;
};

export function draftToEnrich(draft: StudyDraft): EnrichFields {
  const pay =
    draft.payLabel?.trim() ||
    (draft.pay != null ? String(draft.pay) : "");
  const duration =
    draft.durationLabel?.trim() ||
    (draft.durationMinutes != null ? String(draft.durationMinutes) : "");
  return {
    title: draft.title ?? "",
    firm: draft.firm ?? "",
    description: draft.description ?? draft.eligibilityNotes ?? "",
    pay,
    duration,
    location: draft.location ?? "",
    modality: draft.modality ?? "",
    applyUrl: draft.applyUrl ?? "",
    portalNote: draft.portalNote ?? "",
  };
}

export function parsePayInput(raw: string): {
  pay?: number;
  payLabel?: string;
} {
  const t = raw.trim();
  if (!t) return {};
  const m = t.match(/(\d{2,4})/);
  if (/^\$?\s*\d{2,4}\s*$/.test(t) && m) {
    return { pay: Number(m[1]) };
  }
  if (m) return { pay: Number(m[1]), payLabel: t };
  return { payLabel: t };
}

export function parseDurationInput(raw: string): {
  durationMinutes?: number;
  durationLabel?: string;
} {
  const t = raw.trim();
  if (!t) return {};
  const min = t.match(/(\d{1,3})\s*min/i);
  if (min) return { durationMinutes: Number(min[1]) };
  const hrs = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  if (hrs) return { durationMinutes: Math.round(Number(hrs[1]) * 60) };
  if (/^\d{1,3}$/.test(t)) return { durationMinutes: Number(t) };
  const bare = t.match(/(\d{2,3})/);
  if (bare) return { durationMinutes: Number(bare[1]), durationLabel: t };
  return { durationLabel: t };
}

/** Merge operator edits into the parser draft before draftToStudy. */
export function mergeEnrichIntoDraft(
  draft: StudyDraft,
  enrich: EnrichFields
): StudyDraft {
  const { pay, payLabel } = parsePayInput(enrich.pay);
  const { durationMinutes, durationLabel } = parseDurationInput(enrich.duration);
  const title = enrich.title.trim();
  const firm = enrich.firm.trim();
  const description = sanitizePublicStudyText(enrich.description.trim());
  const location = enrich.location.trim();
  const applyUrl = enrich.applyUrl.trim();
  const portalNote = sanitizePublicStudyText(enrich.portalNote.trim());

  return {
    ...draft,
    title: title || draft.title,
    firm: firm || draft.firm,
    description: description || draft.description,
    location: location || draft.location,
    modality: enrich.modality || draft.modality,
    applyUrl: applyUrl || draft.applyUrl,
    portalNote: portalNote || undefined,
    pay: pay ?? (enrich.pay.trim() === "" ? draft.pay : undefined),
    payLabel: payLabel,
    durationMinutes:
      durationMinutes ??
      (enrich.duration.trim() === "" ? draft.durationMinutes : undefined),
    durationLabel: durationLabel,
  };
}

/** Dashboard / login portals that are not study screeners. */
export function isDashboardLink(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    const hay = `${host}${path}`;
    if (host === "my.theclc.com") return true;
    if (/screener|survey|qualtrics|typeform|join\/|apply/i.test(hay)) {
      return false;
    }
    return /(?:^|\.)my\.|login|portal|dashboard|activities|account\/|member/i.test(
      hay
    );
  } catch {
    return false;
  }
}

/**
 * Tip-style / thin invites: low confidence or no pay, and weak or
 * dashboard-only link — operators should enrich before publishing.
 */
export function isTipStyleDraft(draft: StudyDraft): boolean {
  const noPay = draft.pay == null && !draft.payLabel;
  const lowConf = draft.confidence < 65;
  const weakLink =
    !draft.applyUrl ||
    isDashboardLink(draft.applyUrl) ||
    draft.warnings.some((w) => /no links found/i.test(w));
  return (noPay || lowConf) && weakLink;
}

export function formatStudyPay(study: Study): string | null {
  if (study.payLabel?.trim()) return study.payLabel.trim();
  if (study.pay > 0) return `$${study.pay}`;
  return null;
}

export function formatStudyDuration(study: Study): string | null {
  if (study.durationLabel?.trim()) return study.durationLabel.trim();
  if (study.durationMinutes > 0) return formatDuration(study.durationMinutes);
  return null;
}

/** Consumer CTA label for apply / firm link. */
export function applyCtaLabel(study: Study): string {
  if (study.portalNote?.trim()) return "View at firm";
  if (isDashboardLink(study.applyUrl)) return "View at firm";
  const url = study.applyUrl?.toLowerCase() ?? "";
  if (/screener|survey|qualtrics|typeform|apply|join\//i.test(url)) {
    return "Open screener";
  }
  return "Open screener";
}

/** Short who/what blurb for feed cards. */
export function studySnippet(study: Study, max = 140): string {
  const raw = sanitizePublicStudyText(
    study.description?.trim() ||
      study.eligibility.notes?.trim() ||
      ""
  );
  if (!raw) return "";
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1).trimEnd() + "…";
}
