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
      "theclc.com",
      "mail.theclc.com",
    ],
    applyDomains: ["consumerlearningcenter.com", "clc-research.com", "theclc.com", "my.theclc.com"],
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
    fromDomains: [
      "fieldwork.com",
      "mail.fieldwork.com",
      "e.fieldwork.com",
      // Profile / portal mail (live: DoNotReply@focusgroupresearch.com). From only —
      // click-tracking hosts on this domain are not apply links.
      "focusgroupresearch.com",
    ],
    applyDomains: [
      "fieldwork.com",
      "participate.fieldwork.com",
      "pate.fieldwork.com",
    ],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Lynette Eberhart (President). ffrsf.com covers lynette@ffrsf.com;
    // she also mailed from Probe Market domains — add those + exact addresses.
    id: "fleischman",
    name: "Fleischman Field Research / Lynette",
    fromEmails: [
      "lynette@ffrsf.com",
      "lynette@probemarket.com",
      "lynette@probemarketresearch.com",
      "lynette@probemarketny.com",
      "lynette@probemarket.net",
      "nathan@probemarket.net",
      "sheila@ffrsf.com",
      "zach@ffrsf.com",
      "shanice@ffrsf.com",
      "bids@ffrsf.com",
    ],
    fromDomains: [
      "ffrsf.com",
      "mail.ffrsf.com",
      "probemarket.com",
      "probemarketresearch.com",
      "probemarketny.com",
      "probemarket.net",
    ],
    applyDomains: [
      "ffrsf.com",
      "probemarket.com",
      "probemarketresearch.com",
      "probemarketny.com",
      "probemarket.net",
    ],
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
    applyDomains: ["focusgroup.com", "sago.com", "survey.sago.com"],
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
      // Alida hosts the AR/VR community. Suffix match covers mail./community. subdomains.
      // facebook.com / fb.com are intentionally not allowlisted (shared consumer mail).
      "alida.com",
    ],
    applyDomains: [
      "meta.com",
      "arvr-researchpanel.com",
      "arvr-researchcommunity.com",
      "alida.com",
    ],
    defaultType: "ux-interview",
    defaultModality: "in-person",
  },
  {
    id: "watchlab",
    name: "watchLAB",
    fromDomains: ["watchlab.com", "tfaforms.com"],
    applyDomains: ["watchlab.com", "tfaforms.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Indie recruiter (Claudia Paige), not staff at a big facility.
    // Own domain — not a personal Gmail. Join: https://satelliteresearch.net/join/
    id: "satellite-research",
    name: "Satellite Research",
    fromEmails: ["claudia@satelliteresearch.net"],
    fromDomains: ["satelliteresearch.net"],
    applyDomains: ["satelliteresearch.net"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Games / high-tech recruiting. Hugh sends from Gmail — exact address
    // only. Do not add gmail.com to fromDomains.
    // Public signup: https://www.bowenresearch.com/sign-up.php
    id: "bowen-research",
    name: "Bowen Research",
    fromEmails: [
      "hughbowenresearch@gmail.com",
      // Other Bowen recruiters who confirm from Gmail (not the bowenresearch.com domain).
      "morsy.bowenresearch@gmail.com",
      "lowellvs@gmail.com",
    ],
    fromDomains: ["bowenresearch.com"],
    applyDomains: ["bowenresearch.com"],
    defaultType: "game-playtest",
    defaultModality: "in-person",
  },
  {
    // Nationwide qualitative recruiting. Debbie McAfee (Evan's Debbie) sends
    // from the company domain and, when Gmail spam-filtered the firm, from
    // deborah.e.mcafee@gmail.com. Domain match covers debm@ / debbiem@ /
    // dmacfee@ / mcafeedeb@ / debbie@ — do not add gmail.com.
    id: "alphabuzz",
    name: "AlphaBuzz / Debbie McAfee",
    fromEmails: ["deborah.e.mcafee@gmail.com"],
    fromDomains: ["alphabuzzgroup.com"],
    applyDomains: ["alphabuzzgroup.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Active 2026 (participate@ / jcrawford@). In-person Bay Area studies.
    id: "amplify-research",
    name: "Amplify Research",
    fromDomains: ["amplifyresearch.com"],
    applyDomains: ["amplifyresearch.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Active 2026. Mock trials, gaming, and consumer groups.
    id: "hagen-sinclair",
    name: "Hagen/Sinclair",
    fromDomains: ["hagensinclair.com"],
    applyDomains: ["hagensinclair.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // 2026 invite mail is @wilkinssurvey.com; screeners live on wilkinsresearch.com.
    id: "wilkins-survey",
    name: "Wilkins Survey",
    fromDomains: ["wilkinssurvey.com"],
    applyDomains: ["wilkinssurvey.com", "wilkinsresearch.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Indie gaming recruiter (Justin Steele). Outsourced playtest model.
    // Evan's mail used jsteele@; public About page also lists justin@.
    id: "steele-recruiting",
    name: "Steele Recruiting / Justin Steele",
    fromEmails: [
      "jsteele@steele-recruiting.com",
      "justin@steele-recruiting.com",
      "jeremy@steele-recruiting.com",
    ],
    fromDomains: ["steele-recruiting.com"],
    applyDomains: ["steele-recruiting.com"],
    defaultType: "game-playtest",
    defaultModality: "in-person",
  },
  {
    // SF facility. Invite platforms use rotating local-parts
    // (*@vupointinvite.com, *@mdcinvite.com) — domain match, not exact addresses.
    id: "vupoint-mdc",
    name: "VuPoint/MDC",
    fromDomains: ["vupointresearch.com", "vupointinvite.com", "mdcinvite.com"],
    applyDomains: ["vupointresearch.com", "vupointinvite.com", "mdcinvite.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Deb Tysall. deb@intactqualitativeresearch.com is covered by the domain.
    // Later mail from deb@iqrsf.com belongs to IQ Research SF, not this source.
    id: "intact-qualitative",
    name: "Intact Qualitative",
    fromEmails: ["deb@intactqualitativeresearch.com"],
    fromDomains: ["intactqualitativeresearch.com"],
    applyDomains: ["intactqualitativeresearch.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "c2-research",
    name: "C2 Research",
    fromDomains: ["c2research.com"],
    applyDomains: ["c2research.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Focus Pointe Global rebranded to Delve. Not the Sago focusgroup.com panel.
    id: "focus-pointe-delve",
    name: "Focus Pointe Global / Delve",
    fromDomains: ["focuspointeglobal.com", "delve.com"],
    applyDomains: ["focuspointeglobal.com", "delve.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // IQ Research San Francisco (Deb Tysall / Richard Ngo era).
    // nicerecruiting@ and emailrich.ngo@ are Gmail — exact addresses only.
    id: "iq-research-sf",
    name: "IQ Research SF",
    fromEmails: ["nicerecruiting@gmail.com", "emailrich.ngo@gmail.com"],
    fromDomains: ["iqrsf.com"],
    applyDomains: ["iqrsf.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "your-contact-hub",
    name: "Your Contact Hub",
    fromDomains: ["yourcontacthub.com"],
    applyDomains: ["yourcontacthub.com"],
    defaultType: "ux-interview",
    defaultModality: "in-person",
  },
  {
    id: "bluesky-mr",
    name: "BlueSky MR",
    fromDomains: ["blueskymr.com"],
    applyDomains: ["blueskymr.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Lisa Chiapetta. lisa@lcaresearch.com is covered by the domain.
    id: "lca-research",
    name: "LCA Research",
    fromEmails: ["lisa@lcaresearch.com"],
    fromDomains: ["lcaresearch.com"],
    applyDomains: ["lcaresearch.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "nelson-recruiting",
    name: "Nelson Recruiting",
    fromDomains: ["nelsonrecruiting.com"],
    applyDomains: ["nelsonrecruiting.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    id: "chatter-inc",
    name: "Chatter Inc",
    fromDomains: ["chatterinc.com"],
    applyDomains: ["chatterinc.com"],
    defaultType: "game-playtest",
    defaultModality: "in-person",
  },
  {
    id: "dscout",
    name: "dscout",
    fromDomains: ["dscout.com"],
    applyDomains: ["dscout.com"],
    defaultType: "ux-interview",
    defaultModality: "remote",
  },
  {
    // Q & A Research (qar.com), Marin/SF. Not an L&E alias — L&E stays
    // leopinions.com / leresearch.com.
    id: "qar",
    name: "Q & A Research",
    fromDomains: ["qar.com"],
    applyDomains: ["qar.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Heidi Flores. Seen on researchbayarea.com (not already allowlisted).
    id: "bay-area-research",
    name: "Bay Area Research Group",
    fromDomains: ["researchbayarea.com"],
    applyDomains: ["researchbayarea.com"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
  {
    // Inspiration only — not a verified research firm. From-gate so admin
    // Approve is not blocked. Publish path forces verified:false.
    id: "craigslist-sfbay-etc",
    name: "Craigslist SF Bay etc",
    fromDomains: ["craigslist.org"],
    applyDomains: ["craigslist.org"],
    defaultType: "focus-group",
    defaultModality: "in-person",
  },
];

export function getSourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

/** Shared consumer mail. Domain match must never allow every sender here. */
function isBlockedFromDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return (
    d === "gmail.com" ||
    d === "googlemail.com" ||
    d.endsWith(".gmail.com") ||
    d.endsWith(".googlemail.com")
  );
}

const FROM_ADDRESS_RE = /([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})/i;

export function extractEmailAddress(from: string): string | null {
  const match = from.match(FROM_ADDRESS_RE);
  if (!match) return null;
  return `${match[1].toLowerCase()}@${match[2].toLowerCase()}`;
}

export function findSourceByFromEmail(from: string): Source | undefined {
  const address = extractEmailAddress(from);
  if (address) {
    const byEmail = SOURCES.find((s) =>
      s.fromEmails?.some((e) => e.toLowerCase() === address)
    );
    if (byEmail) return byEmail;
  }

  const domain = extractEmailDomain(from);
  if (!domain || isBlockedFromDomain(domain)) return undefined;

  return SOURCES.find((s) =>
    s.fromDomains.some((d) => {
      const allowed = d.toLowerCase();
      if (isBlockedFromDomain(allowed)) return false;
      return domain === allowed || domain.endsWith(`.${allowed}`);
    })
  );
}

export function extractEmailDomain(from: string): string | null {
  const match = from.match(FROM_ADDRESS_RE);
  return match ? match[2].toLowerCase() : null;
}
