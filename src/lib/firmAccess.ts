/**
 * How a friend gets into a study.
 *
 * "Direct link": the apply link opens a shareable screener/project page.
 * "Join panel first": the link can only land on a homepage, login page or
 * member dashboard, so friends join the firm's panel (free) or log in with
 * their own account, then find the study by its code or name.
 *
 * FIRMS holds each firm's public join + login pages. Every URL here was
 * checked by hand (see docs/FIRM_ACCESS.md); never add one that wasn't.
 * A firm without a verified join page falls back to a single homepage button.
 */
import type { Study } from "./types";
import { cleanTitle, studyCode } from "./display";

export interface FirmConfig {
  id: string;
  /** Name used in sentences: "Curion", "Focus Group by Sago". */
  name: string;
  /** Shorter name for buttons, when different. */
  buttonName?: string;
  test: (hay: string) => boolean;
  /** Public panel signup page. */
  joinUrl?: string;
  /** Member login page (verified). */
  loginUrl?: string;
  /** Homepage, used when there's no verified login page. */
  homeUrl: string;
  /** Study links from this firm never open the study for a non-member. */
  alwaysPanel: boolean;
  /** Where the study shows up once logged in. */
  where: string;
  /** Members can search by the study code. */
  searchable: boolean;
  caveat?: string;
}

export const FIRMS: FirmConfig[] = [
  {
    id: "curion",
    name: "Curion",
    test: (h) => /curion/.test(h),
    joinUrl: "https://curionpanelist.com/register",
    homeUrl: "https://curioninsights.com/",
    alwaysPanel: true,
    where: "open screeners",
    searchable: true,
  },
  {
    id: "sago",
    name: "Focus Group by Sago",
    buttonName: "Focus Group",
    test: (h) => /\bsago\b|focusgroup\.com|sago\.com/.test(h),
    joinUrl: "https://www.focusgroup.com/Account/Join",
    // Login is a pop-up behind the "Login" button at the top of the homepage
    // (no standalone login URL), so the homepage is the login link.
    loginUrl: "https://www.focusgroup.com/",
    homeUrl: "https://www.focusgroup.com/",
    alwaysPanel: true,
    where: "your Survey Dashboard",
    searchable: false,
    caveat: "Sago invites members by profile, so it only shows up if you match.",
  },
  {
    id: "fieldwork",
    name: "Fieldwork",
    test: (h) => /fieldwork\.com|\bfieldwork\b/.test(h),
    joinUrl: "https://participate.fieldwork.com/Account/Register",
    loginUrl: "https://participate.fieldwork.com/Account/Login",
    homeUrl: "https://www.fieldwork.com/",
    alwaysPanel: true,
    where: "your respondent dashboard",
    searchable: true,
  },
  {
    id: "clc",
    name: "CLC",
    test: (h) => /theclc\.com|consumer learning center|\bclc\b/.test(h),
    joinUrl: "https://www.theclc.com/individualregistration.html",
    loginUrl: "https://my.theclc.com/",
    homeUrl: "https://www.theclc.com/",
    alwaysPanel: false,
    where: "your studies",
    searchable: true,
  },
  {
    id: "tasteocracy",
    name: "Tasteocracy",
    test: (h) => /tasteocracy/.test(h),
    joinUrl: "https://www.tasteocracy.com/become-tester",
    loginUrl: "https://myaccount.tasteocracy.com/",
    homeUrl: "https://www.tasteocracy.com/",
    alwaysPanel: false,
    where: "your dashboard",
    searchable: true,
  },
  {
    id: "nichols",
    name: "Nichols",
    test: (h) => /nichols ?research|nicholsresearch\.com/.test(h),
    joinUrl: "https://nicholsresearch.com/registration-form/",
    homeUrl: "https://nicholsresearch.com/",
    alwaysPanel: false,
    where: "its current studies",
    searchable: true,
  },
  {
    id: "userinterviews",
    name: "User Interviews",
    test: (h) => /userinterviews\.com|user interviews/.test(h),
    joinUrl: "https://www.userinterviews.com/participants/signup",
    loginUrl: "https://www.userinterviews.com/accounts/signin",
    homeUrl: "https://www.userinterviews.com/",
    // Project apply links (/projects/<id>/apply) are shareable: direct link.
    alwaysPanel: false,
    where: "your dashboard",
    searchable: false,
  },
];

export interface LoginAccess {
  firm: string;
  buttonFirm: string;
  firmId: string | null;
  code: string | null;
  lookFor: string;
  where: string;
  caveat?: string;
  searchable: boolean;
  /** Two-button mode when set. */
  joinUrl?: string;
  /** Secondary button target: login page, else homepage. */
  memberUrl: string;
  /** True when memberUrl is a real login page (not just a homepage). */
  memberIsLogin: boolean;
}

const hayOf = (s: Study) =>
  `${s.firm} ${s.firmDomain ?? ""} ${s.applyUrl ?? ""}`.toLowerCase();

export function firmConfig(study: Study): FirmConfig | undefined {
  const hay = hayOf(study);
  return FIRMS.find((f) => f.test(hay));
}

function isHomepageOrLogin(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if (path === "" && !u.search) return true;
    if (/^(?:my|myaccount|portal|members?|pate)\./i.test(u.hostname)) return true;
    return /\/(?:login|log-in|signin|sign-in|account(?:\/(?:join|login|register))?|join|register|portal|dashboard)$/.test(
      path
    );
  } catch {
    return false;
  }
}

function shortFirm(study: Study): string {
  const name = study.firm.replace(/\s*\(.*\)$/, "").trim();
  return name && name.length <= 18 && !/\./.test(name) ? name : "the firm’s site";
}

/** null = "Direct link": the apply link opens the study's own page. */
export function loginAccess(study: Study): LoginAccess | null {
  const cfg = firmConfig(study);
  const panel = cfg?.alwaysPanel || isHomepageOrLogin(study.applyUrl);
  if (!panel) return null;
  const code = studyCode(study);
  const base = {
    code,
    lookFor: cleanTitle(study),
  };
  if (cfg) {
    return {
      ...base,
      firm: cfg.name,
      buttonFirm: cfg.buttonName ?? cfg.name,
      firmId: cfg.id,
      where: cfg.where,
      caveat: cfg.caveat,
      searchable: cfg.searchable && !!code,
      joinUrl: cfg.joinUrl,
      memberUrl: cfg.loginUrl ?? cfg.homeUrl,
      memberIsLogin: !!cfg.loginUrl,
    };
  }
  return {
    ...base,
    firm: shortFirm(study),
    buttonFirm: shortFirm(study),
    firmId: null,
    where: "its open studies",
    searchable: !!code,
    memberUrl: study.applyUrl,
    memberIsLogin: false,
  };
}

/** Primary button. Two-button mode: "Join Curion free"; else a homepage button. */
export function primaryLabel(a: LoginAccess): string {
  if (a.joinUrl) return `Join ${a.buttonFirm} free`;
  return a.firm === "the firm’s site" ? "Open the firm’s site" : `Open ${a.firm}’s site`;
}

export function primaryUrl(a: LoginAccess): string {
  return a.joinUrl ?? a.memberUrl;
}

/** Secondary link (two-button mode only). */
export function memberLabel(a: LoginAccess): string {
  return a.memberIsLogin ? "Already a member? Log in" : `Already a member? Visit ${a.buttonFirm}`;
}

/** "then search RWC_J104933" / "then look for “Oral care…”". */
export function loginThen(a: LoginAccess): string {
  if (a.searchable && a.code) return `then search ${a.code}`;
  return `then look for “${a.lookFor}”`;
}
