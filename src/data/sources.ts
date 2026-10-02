import type { Source } from "@/lib/types";

/**
 * Allowlisted research firms for From-gate + apply-link checks.
 * Later: Mailgun inbound will resolve sender domain against this list.
 *
 * Trust bar: real research firms / public panels with email invites.
 * No survey-mill aggregators or invite-only-only brands without a public join.
 */
export const SOURCES: Source[] = [
  {
    id: "clc",
    name: "CLC",
    fromDomains: [
      "consumerlearningcenter.com",
      "clc-research.com",
      "mail.consumerlearningcenter.com",
    ],
    applyDomains: ["consumerlearningcenter.com", "clc-research.com", "theclc.com"],
    defaultType: "ux-interview",
    defaultModality: "remote",
  },
  {
    id: "tasteocracy",
    name: "Tasteocracy",
    fromDomains: ["tasteocracy.com", "mail.tasteocracy.com", "e.tasteocracy.com"],
    applyDomains: ["tasteocracy.com"],
    defaultType: "product-taste",
    defaultModality: "in-person",
  },
  {
    id: "curion",
    name: "Curion",
    fromDomains: ["curioninsights.com", "curion.com", "mail.curioninsights.com"],
    applyDomains: ["curioninsights.com", "curion.com", "curionpanelist.com"],
    defaultType: "product-taste",
    defaultModality: "in-person",
  },
  {
    id: "nichols",
    name: "Nichols",
    fromDomains: [
      "nicholsresearch.com",
      "nichols-research.com",
      "mail.nicholsresearch.com",
    ],
    applyDomains: ["nicholsresearch.com", "nichols-research.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "fieldwork",
    name: "Fieldwork",
    fromDomains: ["fieldwork.com", "mail.fieldwork.com", "e.fieldwork.com"],
    applyDomains: ["fieldwork.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "fleischman",
    name: "Fleischman Field Research",
    fromDomains: ["ffrsf.com", "mail.ffrsf.com", "probemarket.com"],
    applyDomains: ["ffrsf.com", "probemarket.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "le-opinions",
    name: "L&E Opinions",
    fromDomains: [
      "leopinions.com",
      "leresearch.com",
      "mail.leopinions.com",
      "mail.leresearch.com",
    ],
    applyDomains: ["leopinions.com", "leresearch.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "focusgroup",
    name: "Focus Group (Sago)",
    fromDomains: [
      "focusgroup.com",
      "mail.focusgroup.com",
      "sago.com",
      "mail.sago.com",
    ],
    applyDomains: ["focusgroup.com", "sago.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "vgm",
    name: "VGM",
    fromDomains: ["vgm.co", "mail.vgm.co"],
    applyDomains: ["vgm.co"],
    defaultType: "game-playtest",
    defaultModality: "in-person",
  },
  {
    id: "google-ux",
    name: "Google UX Research",
    fromDomains: ["withgoogle.com", "google.com", "mail.google.com"],
    applyDomains: [
      "userresearch.google.com",
      "google.com",
      "withgoogle.com",
      "docs.google.com",
    ],
    defaultType: "ux-interview",
    defaultModality: "in-person",
  },
  {
    id: "ea",
    name: "EA Playtesting",
    fromDomains: ["ea.com", "e.ea.com", "mail.ea.com"],
    applyDomains: ["ea.com", "go.ea.com"],
    defaultType: "game-playtest",
    defaultModality: "in-person",
  },
  {
    id: "salesforce",
    name: "Salesforce Research",
    fromDomains: [
      "salesforce.com",
      "force.com",
      "mail.salesforce.com",
      "salesforce-sites.com",
    ],
    applyDomains: [
      "salesforce.com",
      "force.com",
      "salesforce-sites.com",
    ],
    defaultType: "ux-interview",
    defaultModality: "remote",
  },
  {
    id: "playtestcloud",
    name: "PlaytestCloud",
    fromDomains: ["playtestcloud.com", "mail.playtestcloud.com"],
    applyDomains: ["playtestcloud.com"],
    defaultType: "game-playtest",
    defaultModality: "remote",
  },
  {
    id: "user-interviews",
    name: "User Interviews",
    fromDomains: [
      "userinterviews.com",
      "mail.userinterviews.com",
      "e.userinterviews.com",
    ],
    applyDomains: ["userinterviews.com"],
    defaultType: "ux-interview",
    defaultModality: "remote",
  },
  {
    id: "meta-arvr",
    name: "Meta AR/VR Research",
    fromDomains: [
      "meta.com",
      "arvr-researchpanel.com",
      "arvr-researchcommunity.com",
      "mail.arvr-researchpanel.com",
    ],
    applyDomains: [
      "meta.com",
      "arvr-researchpanel.com",
      "arvr-researchcommunity.com",
    ],
    defaultType: "ux-interview",
    defaultModality: "in-person",
  },
];

export function getSourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function findSourceByFromEmail(from: string): Source | undefined {
  const domain = extractEmailDomain(from);
  if (!domain) return undefined;
  return SOURCES.find((s) =>
    s.fromDomains.some(
      (d) => domain === d || domain.endsWith(`.${d}`)
    )
  );
}

export function extractEmailDomain(from: string): string | null {
  const match = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return match ? match[1].toLowerCase() : null;
}
