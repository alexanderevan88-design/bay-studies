/**
 * "Copy next" phone helper (AUTOFILL.md option B).
 *
 * Steps through vault answers in a pilot firm's usual screener order. Each tap
 * copies one answer; the person pastes it into the firm's form themselves.
 *
 * Privacy rules (locked):
 * - Device only. Values are read from this browser's vault/profile and copied
 *   to the clipboard. Nothing is sent to any server.
 * - Zero fill telemetry. No analytics on what is copied.
 * - Progress saved in localStorage stores field KEYS and position only, never
 *   values, so a tab switch on iOS Safari doesn't lose your place.
 * - Blank answers are skipped. Nothing is invented or computed (no DOB from age).
 * - No government ID numbers, ever.
 */
import type { Study, Profile } from "./types";
import {
  VAULT_SECTIONS,
  fieldValue,
  type VaultData,
  type VaultFieldDef,
} from "./vault";

export type PilotFirmId = "curion" | "fieldwork" | "clc" | "tasteocracy" | "nichols";

/** Step keys: vault/profile keys, plus first/last name split from Full name. */
export type StepKey = VaultFieldDef["key"] | "firstName" | "lastName";

export interface PilotFirm {
  id: PilotFirmId;
  name: string;
  /** Typical screener order (best known / sensible default; see AUTOFILL.md). */
  order: StepKey[];
  /** Short plain-English tip shown above the steps. */
  tip: string;
}

const CONTACT: StepKey[] = ["firstName", "lastName", "email", "phone", "zip"];

export const PILOT_FIRMS: Record<PilotFirmId, PilotFirm> = {
  curion: {
    id: "curion",
    name: "Curion",
    order: [
      ...CONTACT,
      "dob",
      "age",
      "gender",
      "ethnicity",
      "hasKids",
      "maritalStatus",
      "housing",
      "incomeBand",
      "education",
      "employment",
      "jobTitle",
      "company",
      "pets",
    ],
    tip: "Curion asks contact details first, then household and food questions.",
  },
  tasteocracy: {
    id: "tasteocracy",
    name: "Tasteocracy",
    order: [
      ...CONTACT,
      "dob",
      "age",
      "gender",
      "ethnicity",
      "hasKids",
      "pets",
      "maritalStatus",
      "incomeBand",
      "education",
      "employment",
    ],
    tip: "Taste tests ask who lives at home (kids, pets) early.",
  },
  clc: {
    id: "clc",
    name: "CLC",
    order: [
      ...CONTACT,
      "dob",
      "age",
      "gender",
      "ethnicity",
      "hasKids",
      "maritalStatus",
      "education",
      "incomeBand",
      "employment",
      "jobTitle",
      "company",
      "deviceOs",
    ],
    tip: "CLC mixes taste and tech studies, so phone/OS may come up at the end.",
  },
  fieldwork: {
    id: "fieldwork",
    name: "Fieldwork",
    order: [
      ...CONTACT,
      "dob",
      "age",
      "gender",
      "ethnicity",
      "employment",
      "jobTitle",
      "company",
      "education",
      "incomeBand",
      "maritalStatus",
      "hasKids",
    ],
    tip: "Fieldwork focus groups often screen on your job, so work comes early.",
  },
  nichols: {
    id: "nichols",
    name: "Nichols Research",
    order: [
      ...CONTACT,
      "dob",
      "age",
      "gender",
      "ethnicity",
      "employment",
      "jobTitle",
      "company",
      "education",
      "incomeBand",
      "maritalStatus",
      "hasKids",
      "housing",
    ],
    tip: "Nichols focus groups usually ask work and household after contact.",
  },
};

/** Pilot firm for a study, matched on firm name or firm/apply domain. */
export function pilotFirmFor(study: Pick<Study, "firm" | "firmDomain" | "applyUrl">): PilotFirm | null {
  const hay = `${study.firm} ${study.firmDomain} ${study.applyUrl}`.toLowerCase();
  if (/curion/.test(hay)) return PILOT_FIRMS.curion;
  if (/tasteocracy/.test(hay)) return PILOT_FIRMS.tasteocracy;
  if (/fieldwork/.test(hay)) return PILOT_FIRMS.fieldwork;
  if (/nichols/.test(hay)) return PILOT_FIRMS.nichols;
  if (/\bclc\b|theclc|clc-research|consumerlearningcenter/.test(hay)) return PILOT_FIRMS.clc;
  return null;
}

/** Never offered, even if something like it ends up in storage. */
const GOV_ID = /ssn|social.?security|license|licence|passport|tax.?id|itin|government/i;

export interface Step {
  key: StepKey;
  label: string;
  value: string;
  sensitive: boolean;
}

const ALL_DEFS: VaultFieldDef[] = VAULT_SECTIONS.flatMap((s) => s.fields);

function splitName(full: string): { first: string; last: string } | null {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return null;
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

/**
 * Ordered steps for this firm. Firm order first, then anything else already in
 * the vault (vault section order). Blank answers are dropped.
 */
export function buildSteps(
  firm: PilotFirm,
  profile: Profile,
  vault: VaultData
): Step[] {
  const steps: Step[] = [];
  const seen = new Set<string>();
  const fullName = (vault.fields.fullName ?? "").trim();
  const split = splitName(fullName);

  const push = (key: StepKey) => {
    if (seen.has(key) || GOV_ID.test(key)) return;
    if (key === "firstName" || key === "lastName") {
      seen.add(key);
      if (split) {
        steps.push({
          key,
          label: key === "firstName" ? "First name" : "Last name",
          value: key === "firstName" ? split.first : split.last,
          sensitive: false,
        });
      } else if (fullName && !seen.has("fullName")) {
        seen.add("fullName");
        steps.push({ key: "fullName", label: "Full name", value: fullName, sensitive: false });
      }
      seen.add("fullName");
      return;
    }
    const def = ALL_DEFS.find((d) => d.key === key);
    seen.add(key);
    if (!def || GOV_ID.test(def.label)) return;
    const value = fieldValue(def, profile, vault);
    if (!value) return;
    steps.push({ key, label: def.label, value, sensitive: def.sensitivity === "sensitive" });
  };

  firm.order.forEach(push);
  // Full name on its own too, after first/last, for forms with one box.
  if (split && !steps.some((s) => s.key === "fullName")) {
    const at = steps.findIndex((s) => s.key === "lastName");
    steps.splice(at + 1, 0, { key: "fullName", label: "Full name (one box)", value: fullName, sensitive: false });
  }
  ALL_DEFS.forEach((d) => push(d.key));
  return steps;
}

/* ── Progress (keys + position only, never values) ───────────────── */

const PROGRESS_PREFIX = "bay-studies-copy-next-v1:";
const PROGRESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CopyNextProgress {
  /** Key of the step that's up next ("" = finished). */
  nextKey: string;
  copied: string[];
  skipped: string[];
  consented: boolean;
  updatedAt: number;
}

export function loadProgress(studyId: string): CopyNextProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + studyId);
    if (!raw) return null;
    const p = JSON.parse(raw) as CopyNextProgress;
    if (!p || Date.now() - (p.updatedAt || 0) > PROGRESS_TTL_MS) {
      localStorage.removeItem(PROGRESS_PREFIX + studyId);
      return null;
    }
    return {
      nextKey: String(p.nextKey ?? ""),
      copied: Array.isArray(p.copied) ? p.copied : [],
      skipped: Array.isArray(p.skipped) ? p.skipped : [],
      consented: !!p.consented,
      updatedAt: p.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveProgress(studyId: string, p: Omit<CopyNextProgress, "updatedAt">): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PROGRESS_PREFIX + studyId,
      JSON.stringify({ ...p, updatedAt: Date.now() })
    );
  } catch {
    /* storage full / private mode: helper still works for this tab */
  }
}

export function clearProgress(studyId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROGRESS_PREFIX + studyId);
  } catch {
    /* ignore */
  }
}

/** Clipboard write with a fallback for older iOS Safari. Must run in a tap. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
