import type { Study } from "@/lib/types";

/**
 * Local/dev sample studies only. The public production feed does not use these.
 * Spans the expanded 16-firm allowlist (FIRST + STRETCH) with realistic
 * Bay Area pay, durations, and locations.
 */
export const STUDIES: Study[] = [
  {
    id: "fw-sf-fg-150",
    title: "Evening focus group: grocery delivery habits",
    firm: "Fieldwork",
    firmDomain: "fieldwork.com",
    verified: true,
    pay: 150,
    durationMinutes: 90,
    type: "focus-group",
    modality: "in-person",
    location: "San Francisco",
    metro: ["sf"],
    when: "Tue 6–8pm (upcoming sessions)",
    address: "Fieldwork SF · Financial District",
    eligibility: {
      ageMin: 25,
      ageMax: 40,
      notes:
        "Ages 25–40 · Bay Area residents who order grocery delivery at least monthly",
    },
    description:
      "Share your grocery and meal-delivery habits in a moderated evening group. Snacks provided. Facility is BART-accessible.",
    applyUrl: "https://www.fieldwork.com/join/",
  },
  {
    id: "taste-liv-75",
    title: "Snack & beverage taste test",
    firm: "Tasteocracy",
    firmDomain: "tasteocracy.com",
    verified: true,
    pay: 75,
    durationMinutes: 45,
    type: "product-taste",
    modality: "in-person",
    location: "Livermore",
    metro: ["east-bay"],
    when: "Weekday mornings & afternoons",
    address: "Tasteocracy Consumer Center · Livermore",
    eligibility: {
      ageMin: 21,
      ageMax: 55,
      notes:
        "Ages 21–55 · No severe food allergies · East Bay / Tri-Valley preferred",
    },
    description:
      "Blind taste evaluations of new snack and beverage concepts. Short session; pay on completion.",
    applyUrl: "https://www.tasteocracy.com/",
  },
  {
    id: "ea-rwc-play-100",
    title: "Console / PC game playtest",
    firm: "EA",
    firmDomain: "ea.com",
    verified: true,
    pay: 100,
    durationMinutes: 120,
    type: "game-playtest",
    modality: "in-person",
    location: "Redwood City",
    metro: ["peninsula", "sf", "san-jose"],
    when: "Evenings & weekends (by invitation)",
    address: "EA Redwood Shores campus",
    eligibility: {
      ageMin: 18,
      ageMax: 45,
      genders: ["man", "woman", "nonbinary"],
      notes: "Ages 18–45 · Play games weekly · NDAs required on site",
    },
    description:
      "Play an unreleased build and give feedback to designers. Bring photo ID. Campus parking available.",
    applyUrl: "https://www.ea.com/careers/playtesting",
  },
  {
    id: "clc-oak-ux-125",
    title: "Remote UX interview: banking app redesign",
    firm: "CLC",
    firmDomain: "consumerlearningcenter.com",
    verified: true,
    pay: 125,
    durationMinutes: 60,
    type: "ux-interview",
    modality: "remote",
    location: "Remote (Bay Area)",
    metro: ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: "Flexible · 60-min Zoom slots",
    eligibility: {
      ageMin: 30,
      ageMax: 60,
      notes:
        "Ages 30–60 · Primary bank account holders · Must have a quiet space + laptop",
    },
    description:
      "Walk through prototype screens and talk through your banking habits. Paid via digital gift card after the session.",
    applyUrl: "https://www.consumerlearningcenter.com/",
  },
  {
    id: "curion-sj-taste-90",
    title: "Plant-based meal concept test",
    firm: "Curion",
    firmDomain: "curioninsights.com",
    verified: true,
    pay: 90,
    durationMinutes: 75,
    type: "product-taste",
    modality: "in-person",
    location: "San Jose",
    metro: ["san-jose", "peninsula"],
    when: "Sat 10am–2pm (rolling)",
    address: "Curion Insights · South Bay facility",
    eligibility: {
      ageMin: 22,
      ageMax: 50,
      hasKids: true,
      notes:
        "Ages 22–50 · Households with kids preferred · Omnivore or flexitarian diets",
    },
    description:
      "Taste prepared plant-based meal concepts and rate appeal for your household. Childcare not provided.",
    applyUrl: "https://www.curioninsights.com/",
  },
  {
    id: "nichols-oak-fg-175",
    title: "Oakland focus group: streaming habits",
    firm: "Nichols",
    firmDomain: "nicholsresearch.com",
    verified: true,
    pay: 175,
    durationMinutes: 120,
    type: "focus-group",
    modality: "in-person",
    location: "Oakland",
    metro: ["oakland", "east-bay", "sf"],
    when: "Thu evening sessions",
    address: "Nichols Research · Oakland (near BART)",
    eligibility: {
      ageMin: 18,
      ageMax: 49,
      notes: "Ages 18–49 · Stream TV/movies weekly · East Bay or SF preferred",
    },
    description:
      "Talk through how you pick shows, subscribe, and cancel. Moderated group of 8–10; light snacks.",
    applyUrl: "https://nicholsresearch.com/registration-form/",
  },
  {
    id: "fleischman-sf-fg-175",
    title: "SF focus group: mobile banking",
    firm: "Fleischman Field Research",
    firmDomain: "ffrsf.com",
    verified: true,
    pay: 175,
    durationMinutes: 90,
    type: "focus-group",
    modality: "in-person",
    location: "San Francisco",
    metro: ["sf", "peninsula", "oakland"],
    when: "Weekday evenings",
    address: "Fleischman Field Research · Union Square, SF",
    eligibility: {
      ageMin: 25,
      ageMax: 55,
      notes:
        "Ages 25–55 · Use a mobile banking or payments app · SF metro preferred",
    },
    description:
      "Share how you bank and pay on your phone. Facility is downtown; bring photo ID.",
    applyUrl: "https://www.ffrsf.com/join-database/",
  },
  {
    id: "le-smart-home-150",
    title: "Bay Area study: smart home devices",
    firm: "L&E Opinions",
    firmDomain: "leopinions.com",
    verified: true,
    pay: 150,
    durationMinutes: 60,
    type: "focus-group",
    modality: "in-person",
    location: "San Francisco / Oakland",
    metro: ["sf", "oakland", "san-jose"],
    when: "Next two weeks · flexible slots",
    address: "L&E Research · Bay Area facility (assigned after screener)",
    eligibility: {
      ageMin: 30,
      ageMax: 65,
      notes:
        "Ages 30–65 · Own or shop for smart speakers, cameras, or thermostats",
    },
    description:
      "Discuss smart-home setup and shopping habits. Short in-person group; incentive paid after the session.",
    applyUrl:
      "https://www.leopinions.com/san-francisco-oakland-san-jose-ca-paid-studies/",
  },
  {
    id: "sago-remote-fg-120",
    title: "Online focus group: streaming apps",
    firm: "Focus Group (Sago)",
    firmDomain: "focusgroup.com",
    verified: true,
    pay: 120,
    durationMinutes: 75,
    type: "focus-group",
    modality: "remote",
    location: "Remote (Zoom)",
    metro: ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: "Weekend afternoon slots",
    eligibility: {
      ageMin: 21,
      ageMax: 45,
      notes: "Ages 21–45 · Use 2+ streaming apps · Quiet space + webcam",
    },
    description:
      "Join an online group about how you discover and keep streaming apps. Paid after attendance.",
    applyUrl: "https://www.focusgroup.com/Account/Join",
  },
  {
    id: "vgm-ssf-play-200",
    title: "South SF playtest: unreleased action game",
    firm: "VGM",
    firmDomain: "vgm.co",
    verified: true,
    pay: 200,
    durationMinutes: 240,
    type: "game-playtest",
    modality: "in-person",
    location: "South San Francisco",
    metro: ["peninsula", "sf", "san-jose"],
    when: "Saturday morning / afternoon",
    address: "VGM labs · South San Francisco",
    eligibility: {
      ageMin: 18,
      ageMax: 35,
      notes: "Ages 18–35 · Console or PC gamers · NDA on site",
    },
    description:
      "Long-form onsite playtest of an unreleased action title. Lunch provided; bring photo ID.",
    applyUrl: "https://vgm.co/signup/",
  },
  {
    id: "google-ux-maps-125",
    title: "Google UX interview: Maps",
    firm: "Google UX Research",
    firmDomain: "userresearch.google.com",
    verified: true,
    pay: 125,
    durationMinutes: 60,
    type: "ux-interview",
    modality: "in-person",
    location: "Mountain View / Bay Area",
    metro: ["peninsula", "san-jose", "sf", "east-bay"],
    when: "Upcoming weekday slots",
    address: "Bay Area Google office (assigned after invite)",
    eligibility: {
      ageMin: 18,
      notes: "Ages 18+ · Use Maps or similar navigation apps · Photo ID required",
    },
    description:
      "One-on-one session walking through Maps tasks with a researcher. Campus visit or remote if noted in invite.",
    applyUrl: "https://userresearch.google.com/",
  },
  {
    id: "salesforce-ux-remote-150",
    title: "Remote UX: workplace collaboration tools",
    firm: "Salesforce Research",
    firmDomain: "salesforce.com",
    verified: true,
    pay: 150,
    durationMinutes: 60,
    type: "ux-interview",
    modality: "remote",
    location: "Remote",
    metro: ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: "Weekday daytime Zoom slots",
    eligibility: {
      ageMin: 22,
      ageMax: 55,
      notes:
        "Ages 22–55 · Work with email/chat/docs tools · Prefer laptop + quiet space",
    },
    description:
      "Talk through how your team collaborates online. Remote interview; gift card after the session.",
    applyUrl: "https://uxresearch.my.salesforce-sites.com/ux/uxCRPSignup",
  },
  {
    id: "playtestcloud-remote-80",
    title: "Remote mobile game playtest",
    firm: "PlaytestCloud",
    firmDomain: "playtestcloud.com",
    verified: true,
    pay: 80,
    durationMinutes: 40,
    type: "game-playtest",
    modality: "remote",
    location: "Remote (your phone)",
    metro: ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: "Anytime this week · ~40 min",
    eligibility: {
      ageMin: 18,
      ageMax: 40,
      notes: "Ages 18–40 · Android or iOS · Record gameplay via their app",
    },
    description:
      "Play a mobile build at home and narrate your thoughts. Paid per completed session through PlaytestCloud.",
    applyUrl: "https://app.playtestcloud.com/signup",
  },
  {
    id: "ui-remote-ux-110",
    title: "Remote UX interview: health app onboarding",
    firm: "User Interviews",
    firmDomain: "userinterviews.com",
    verified: true,
    pay: 110,
    durationMinutes: 45,
    type: "ux-interview",
    modality: "remote",
    location: "Remote",
    metro: ["sf", "oakland", "peninsula", "san-jose", "east-bay"],
    when: "Flexible · next 10 days",
    eligibility: {
      ageMin: 25,
      ageMax: 50,
      notes:
        "Ages 25–50 · Used a health or wellness app in the last year · Webcam required",
    },
    description:
      "Walk through a health-app prototype with a researcher. Scheduled via User Interviews; paid after attendance.",
    applyUrl: "https://www.userinterviews.com/participants/signup",
  },
  {
    id: "meta-arvr-demo-175",
    title: "AR/VR headset demo & interview",
    firm: "Meta AR/VR Research",
    firmDomain: "meta.com",
    verified: true,
    pay: 175,
    durationMinutes: 90,
    type: "ux-interview",
    modality: "in-person",
    location: "Menlo Park area",
    metro: ["peninsula", "sf", "san-jose"],
    when: "Weekday daytime · by invitation",
    address: "Meta research lab · Menlo Park area",
    eligibility: {
      ageMin: 18,
      ageMax: 45,
      notes:
        "Ages 18–45 · Comfortable wearing a headset · No severe motion sensitivity",
    },
    description:
      "Try AR/VR experiences and share feedback with researchers. Onsite only; NDAs and photo ID required.",
    applyUrl: "https://www.meta.com/research/ar-vr-panel/",
  },
];

/** Seed studies only (no localStorage). Prefer getAllStudies() on the client. */
export function getStudyById(id: string): Study | undefined {
  return STUDIES.find((s) => s.id === id);
}

const SEED_IDS = new Set(STUDIES.map((study) => study.id));

/** True for placeholder rows in STUDIES, not human-approved publications. */
export function isSeedStudy(id: string): boolean {
  return SEED_IDS.has(id);
}

function seedStudiesOptIn(): boolean {
  return (
    process.env.SHOW_SEED_STUDIES === "1" ||
    process.env.NEXT_PUBLIC_SHOW_SEED_STUDIES === "1"
  );
}

/**
 * Public feed list.
 * Approved publications always win: if any exist, seeds are not merged in.
 * Production default is published-only (empty array when nothing is approved).
 * Seeds fill an empty list only for local/dev (NODE_ENV=development), or when
 * SHOW_SEED_STUDIES / NEXT_PUBLIC_SHOW_SEED_STUDIES is "1" outside production.
 */
export function mergeStudies(published: Study[]): Study[] {
  const approved: Study[] = [];
  const seen = new Set<string>();
  for (const study of published) {
    if (seen.has(study.id)) continue;
    seen.add(study.id);
    approved.push(study);
  }
  if (approved.length > 0) return approved;

  const allowSeeds =
    process.env.NODE_ENV !== "production" &&
    (process.env.NODE_ENV === "development" || seedStudiesOptIn());
  return allowSeeds ? STUDIES.slice() : [];
}

/** Soft-launch firm count for empty-state / trust copy. */
export const SEED_FIRM_COUNT = 16;
