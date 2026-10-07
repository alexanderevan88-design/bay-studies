/**
 * Profile vault (soft-launch scaffold).
 *
 * The vault is the optional "save time applying" layer on top of the free,
 * public feed. Today it lives in this browser's localStorage only — no
 * account, no server, no sync. Nothing here is ever sent to a firm without the
 * person confirming it on that screener (see docs/PROFILE_VAULT.md).
 *
 * Fields that already exist on Profile (age, DOB, gender, ZIP, phone, email,
 * employment, kids) are read from Profile so onboarding stays the single
 * source for them. Vault-only fields are stored under VAULT_KEY.
 *
 * Never seed real people's answers as defaults — every field starts empty.
 */
import {
  EMPLOYMENT_LABELS,
  GENDER_LABELS,
  type Profile,
} from "./types";

export const VAULT_KEY = "bay-studies-vault-v1";

/** everyday = OK to offer in a consented fill. sensitive = confirm each time, every screener. */
export type FieldSensitivity = "everyday" | "sensitive";

export type VaultFieldKey =
  | "fullName"
  | "streetAddress"
  | "ethnicity"
  | "maritalStatus"
  | "education"
  | "housing"
  | "incomeBand"
  | "pets"
  | "jobTitle"
  | "company"
  | "deviceOs"
  | "carrier"
  | "vehicle"
  | "hobbies"
  | "gaming"
  | "health";

export type ProfileFieldKey =
  | "email"
  | "phone"
  | "zip"
  | "age"
  | "dob"
  | "gender"
  | "hasKids"
  | "employment";

export interface VaultFieldDef {
  key: VaultFieldKey | ProfileFieldKey;
  label: string;
  sensitivity: FieldSensitivity;
  /** "profile" = edit in onboarding; "vault" = edit on /vault. */
  source: "profile" | "vault";
  /** Select options for vault fields; omitted = free text. */
  options?: string[];
  placeholder?: string;
}

export interface VaultSection {
  id: string;
  title: string;
  blurb: string;
  fields: VaultFieldDef[];
}

const PREFER_NOT = "Prefer not to say";

export const VAULT_SECTIONS: VaultSection[] = [
  {
    id: "contact",
    title: "Contact",
    blurb: "The basics almost every screener asks first.",
    fields: [
      { key: "fullName", label: "Full name", sensitivity: "everyday", source: "vault", placeholder: "First and last name" },
      { key: "email", label: "Email", sensitivity: "everyday", source: "profile" },
      { key: "phone", label: "Phone", sensitivity: "everyday", source: "profile" },
      { key: "zip", label: "ZIP", sensitivity: "everyday", source: "profile" },
      { key: "streetAddress", label: "Street address", sensitivity: "sensitive", source: "vault", placeholder: "Only if a firm needs it (in-home tests)" },
    ],
  },
  {
    id: "about",
    title: "About you",
    blurb: "Demographics firms use to pick who qualifies.",
    fields: [
      { key: "age", label: "Age", sensitivity: "everyday", source: "profile" },
      { key: "dob", label: "Date of birth", sensitivity: "sensitive", source: "profile" },
      { key: "gender", label: "Gender", sensitivity: "everyday", source: "profile" },
      {
        key: "ethnicity",
        label: "Ethnicity",
        sensitivity: "sensitive",
        source: "vault",
        options: [
          "Asian",
          "Black or African American",
          "Hispanic or Latino",
          "Middle Eastern or North African",
          "Native American or Alaska Native",
          "Native Hawaiian or Pacific Islander",
          "White",
          "Multiracial",
          "Other",
          PREFER_NOT,
        ],
      },
      {
        key: "maritalStatus",
        label: "Marital status",
        sensitivity: "everyday",
        source: "vault",
        options: ["Single", "Partnered", "Married", "Separated or divorced", "Widowed", PREFER_NOT],
      },
      {
        key: "education",
        label: "Education",
        sensitivity: "everyday",
        source: "vault",
        options: [
          "High school or GED",
          "Some college",
          "Associate degree",
          "Bachelor's degree",
          "Graduate degree",
          "Trade or vocational",
          PREFER_NOT,
        ],
      },
    ],
  },
  {
    id: "household",
    title: "Household",
    blurb: "Kids, home, pets, and income band — ranges only.",
    fields: [
      { key: "hasKids", label: "Kids at home", sensitivity: "everyday", source: "profile" },
      {
        key: "housing",
        label: "Housing",
        sensitivity: "everyday",
        source: "vault",
        options: ["Rent", "Own", "Live with family", "Other", PREFER_NOT],
      },
      {
        key: "incomeBand",
        label: "Household income",
        sensitivity: "everyday",
        source: "vault",
        options: [
          "Under $50k",
          "$50k–$99k",
          "$100k–$149k",
          "$150k–$199k",
          "$200k+",
          PREFER_NOT,
        ],
      },
      { key: "pets", label: "Pets", sensitivity: "everyday", source: "vault", placeholder: "e.g. one dog, no cats" },
    ],
  },
  {
    id: "work",
    title: "Work",
    blurb: "B2B and UX studies often screen on role and industry.",
    fields: [
      { key: "employment", label: "Employment", sensitivity: "everyday", source: "profile" },
      { key: "jobTitle", label: "Job title", sensitivity: "everyday", source: "vault", placeholder: "e.g. Product manager" },
      { key: "company", label: "Company or industry", sensitivity: "everyday", source: "vault", placeholder: "Industry is fine if you'd rather not name it" },
    ],
  },
  {
    id: "life",
    title: "Tech & everyday life",
    blurb: "Devices, car, hobbies, and games — great for product and playtests.",
    fields: [
      {
        key: "deviceOs",
        label: "Phone / OS",
        sensitivity: "everyday",
        source: "vault",
        options: ["iPhone (iOS)", "Android", "Both", "Other"],
      },
      {
        key: "carrier",
        label: "Mobile carrier",
        sensitivity: "everyday",
        source: "vault",
        options: ["Verizon", "AT&T", "T-Mobile", "Visible / Mint / other prepaid", "Other"],
      },
      { key: "vehicle", label: "Vehicle", sensitivity: "everyday", source: "vault", placeholder: "e.g. 2019 Honda Civic, or none" },
      { key: "hobbies", label: "Hobbies", sensitivity: "everyday", source: "vault", placeholder: "e.g. cooking, hiking, board games" },
      { key: "gaming", label: "Gaming", sensitivity: "everyday", source: "vault", placeholder: "Platforms + favorite genres, if you play" },
    ],
  },
  {
    id: "health",
    title: "Health",
    blurb: "Optional. “Prefer not to say” is a perfectly good answer.",
    fields: [
      {
        key: "health",
        label: "Health notes",
        sensitivity: "sensitive",
        source: "vault",
        options: [PREFER_NOT, "None to share", "I'll answer per study"],
      },
    ],
  },
];

export type VaultData = {
  fields: Partial<Record<VaultFieldKey, string>>;
  updatedAt?: string;
};

export const EMPTY_VAULT: VaultData = { fields: {} };

export function loadVault(): VaultData {
  if (typeof window === "undefined") return { fields: {} };
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return { fields: {} };
    const parsed = JSON.parse(raw) as VaultData;
    return { fields: parsed.fields ?? {}, updatedAt: parsed.updatedAt };
  } catch {
    return { fields: {} };
  }
}

export function saveVault(data: VaultData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAULT_KEY, JSON.stringify(data));
}

export function clearVault(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VAULT_KEY);
}

/** Display value for a field, reading Profile for profile-backed keys. "" = empty. */
export function fieldValue(
  def: VaultFieldDef,
  profile: Profile,
  vault: VaultData
): string {
  if (def.source === "vault") {
    return (vault.fields[def.key as VaultFieldKey] ?? "").trim();
  }
  switch (def.key as ProfileFieldKey) {
    case "email":
      return profile.email.trim();
    case "phone":
      return profile.phone.trim();
    case "zip":
      return profile.zip.trim();
    case "age":
      return profile.age === "" ? "" : String(profile.age);
    case "dob":
      return profile.dob;
    case "gender":
      return profile.gender ? GENDER_LABELS[profile.gender] : "";
    case "hasKids":
      return profile.hasKids === null ? "" : profile.hasKids ? "Yes" : "No";
    case "employment":
      return profile.employment ? EMPLOYMENT_LABELS[profile.employment] : "";
    default:
      return "";
  }
}

export function sectionProgress(
  section: VaultSection,
  profile: Profile,
  vault: VaultData
): { filled: number; total: number } {
  const filled = section.fields.filter(
    (f) => fieldValue(f, profile, vault) !== ""
  ).length;
  return { filled, total: section.fields.length };
}

export function vaultProgress(
  profile: Profile,
  vault: VaultData
): { filled: number; total: number } {
  return VAULT_SECTIONS.reduce(
    (acc, s) => {
      const p = sectionProgress(s, profile, vault);
      return { filled: acc.filled + p.filled, total: acc.total + p.total };
    },
    { filled: 0, total: 0 }
  );
}

/** Mask a sensitive value for display (e.g. DOB → ••••-••-12). */
export function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 2) return "••";
  return "•".repeat(Math.min(8, value.length - 2)) + value.slice(-2);
}

/** Per-screener consent checklist. Same copy on /vault preview and study fill helper. */
export const CONSENT_CHECKLIST = [
  "I opened this screener myself, on the firm's own site.",
  "Fill my everyday details (name, email, phone, ZIP).",
  "Ask me before each sensitive field (date of birth, address, health).",
  "I'll check every answer and press the firm's Submit button myself.",
] as const;
