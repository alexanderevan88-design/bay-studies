export type Metro =
  | "sf"
  | "oakland"
  | "peninsula"
  | "san-jose"
  | "east-bay";

export type Gender = "woman" | "man" | "nonbinary" | "prefer-not" | "";

export type Employment =
  | "employed-full"
  | "employed-part"
  | "self-employed"
  | "student"
  | "unemployed"
  | "retired"
  | "other"
  | "";

export type Modality = "in-person" | "remote" | "both";

export type StudyType =
  | "focus-group"
  | "product-taste"
  | "game-playtest"
  | "ux-interview";

export type DigestFrequency = "off" | "daily" | "weekly";

export interface Profile {
  metro: Metro | "";
  age: number | "";
  dob: string;
  gender: Gender;
  zip: string;
  /** Optional contact details to make applying to a study quicker. */
  phone: string;
  email: string;
  employment: Employment;
  hasKids: boolean | null;
  languages: string[];
  modality: Modality;
  minPay: number;
  travelMiles: number;
  studyTypes: StudyType[];
  pushEnabled: boolean;
  digest: DigestFrequency;
  quietHoursStart: string;
  quietHoursEnd: string;
  onboarded: boolean;
  savedStudyIds: string[];
  dismissedStudyIds: string[];
  appliedStudyIds: string[];
}

export interface Study {
  id: string;
  title: string;
  firm: string;
  firmDomain: string;
  verified: boolean;
  pay: number;
  durationMinutes: number;
  type: StudyType;
  modality: "in-person" | "remote";
  location: string;
  metro: Metro[];
  when: string;
  address?: string;
  eligibility: {
    ageMin?: number;
    ageMax?: number;
    genders?: Gender[];
    hasKids?: boolean;
    languages?: string[];
    notes: string;
  };
  description: string;
  applyUrl: string;
  /** Week 3: link-health — non-2xx apply URL */
  expired?: boolean;
  linkCheckedAt?: string;
  linkStatus?: number | null;
  /** Week 3: when approved into feed */
  publishedAt?: string;
}

export const METRO_LABELS: Record<Metro, string> = {
  sf: "San Francisco",
  oakland: "Oakland",
  peninsula: "Peninsula",
  "san-jose": "San Jose",
  "east-bay": "East Bay / Tri-Valley",
};

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  "focus-group": "Focus group",
  "product-taste": "Product / taste test",
  "game-playtest": "Game playtest",
  "ux-interview": "UX interview",
};

export const GENDER_LABELS: Record<Exclude<Gender, "">, string> = {
  woman: "Woman",
  man: "Man",
  nonbinary: "Non-binary",
  "prefer-not": "Prefer not to say",
};

export const EMPLOYMENT_LABELS: Record<Exclude<Employment, "">, string> = {
  "employed-full": "Employed full-time",
  "employed-part": "Employed part-time",
  "self-employed": "Self-employed",
  student: "Student",
  unemployed: "Unemployed / between jobs",
  retired: "Retired",
  other: "Other",
};

export const DEFAULT_PROFILE: Profile = {
  metro: "",
  age: "",
  dob: "",
  gender: "",
  zip: "",
  phone: "",
  email: "",
  employment: "",
  hasKids: null,
  languages: ["English"],
  modality: "both",
  minPay: 50,
  travelMiles: 25,
  studyTypes: [
    "focus-group",
    "product-taste",
    "game-playtest",
    "ux-interview",
  ],
  pushEnabled: true,
  digest: "weekly",
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  onboarded: false,
  savedStudyIds: [],
  dismissedStudyIds: [],
  appliedStudyIds: [],
};

/* ── Week 2: email ingest ─────────────────────────────────────────── */

export type DraftStatus = "pending" | "approved" | "rejected";

export interface Source {
  id: string;
  name: string;
  /** Domains allowed on the From header (lowercase, no @). */
  fromDomains: string[];
  /** Domains allowed on apply / screener links. */
  applyDomains: string[];
  /** Optional default study type when subject/body is ambiguous. */
  defaultType?: StudyType;
  /** Optional default modality. */
  defaultModality?: "in-person" | "remote";
}

export interface RawEmail {
  id: string;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
  text: string;
  html?: string;
}

/** Extracted fields before human approve → Study. */
export interface StudyDraft {
  title?: string;
  firm?: string;
  firmDomain?: string;
  pay?: number;
  durationMinutes?: number;
  type?: StudyType;
  modality?: "in-person" | "remote";
  location?: string;
  metro?: Metro[];
  when?: string;
  address?: string;
  ageMin?: number;
  ageMax?: number;
  eligibilityNotes?: string;
  description?: string;
  applyUrl?: string;
  confidence: number;
  warnings: string[];
  fromAllowed: boolean;
  matchedSourceId?: string;
  extractedLinks: string[];
}

export interface ParseLog {
  id: string;
  emailId: string;
  parsedAt: string;
  fromAllowed: boolean;
  matchedSourceId?: string;
  confidence: number;
  warnings: string[];
  draft: StudyDraft;
}

/** Persisted admin review state for one inbound email. */
export interface IngestItemState {
  emailId: string;
  status: DraftStatus;
  publishedStudyId?: string;
  reviewedAt?: string;
}

/* ── Week 3: match + notify + freshness ───────────────────────────── */

export interface MatchReason {
  ok: boolean;
  label: string;
}

/** Simulated in-app push when a matching study is approved. */
export interface AppNotification {
  id: string;
  studyId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  matched: boolean;
  pay: number;
  ageLabel: string;
}

export interface LinkCheckResult {
  url: string;
  ok: boolean;
  status: number | null;
  error?: string;
  checkedAt: string;
}
