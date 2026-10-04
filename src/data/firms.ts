/**
 * Firm onboarding checklist + inbound presets.
 * FIRST_FIRMS = soft-launch join priority (allowlisted + presets).
 * STRETCH_FIRMS = join next; still on SOURCES From-gate so invites parse.
 *
 * Join URLs are public panel signup pages; ingest emails are placeholders
 * until YOUR_DOMAIN + Mailgun route are live.
 */

export type FirmOnboard = {
  id:
    | "clc"
    | "tasteocracy"
    | "curion"
    | "nichols"
    | "fieldwork"
    | "fleischman"
    | "le-opinions"
    | "focusgroup"
    | "vgm"
    | "google-ux"
    | "ea"
    | "watchlab";
  name: string;
  /** Public panel / join page */
  joinUrl: string;
  /** Placeholder ingest address — replace YOUR_DOMAIN after deploy */
  suggestedIngestEmail: string;
  notes: string;
  metroHint: string;
};

export type StretchFirmOnboard = {
  id: "salesforce" | "playtestcloud" | "user-interviews" | "meta-arvr";
  name: string;
  joinUrl: string;
  suggestedIngestEmail: string;
  notes: string;
  metroHint: string;
};

export const FIRST_FIRMS: FirmOnboard[] = [
  {
    id: "clc",
    name: "CLC",
    joinUrl: "https://www.theclc.com/individualregistration.html",
    suggestedIngestEmail: "clc@studies.YOUR_DOMAIN",
    notes:
      "Consumer Learning Center (Pleasanton / East Bay). Use the ingest address as the panel email so invites hit Mailgun → /api/inbound. From domains include consumerlearningcenter.com.",
    metroHint: "East Bay · Pleasanton",
  },
  {
    id: "tasteocracy",
    name: "Tasteocracy",
    joinUrl: "https://www.tasteocracy.com/become-tester",
    suggestedIngestEmail: "tasteocracy@studies.YOUR_DOMAIN",
    notes:
      "Join the Local Panel (Livermore, CA). Product / snack taste tests. From: tasteocracy.com / mail.tasteocracy.com.",
    metroHint: "Livermore · Tri-Valley",
  },
  {
    id: "curion",
    name: "Curion",
    joinUrl: "https://curionpanelist.com/register",
    suggestedIngestEmail: "curion@studies.YOUR_DOMAIN",
    notes:
      "Pick Redwood City (San Francisco area) on signup. Product tests + concept work. From: curioninsights.com / curion.com.",
    metroHint: "Peninsula · Redwood City",
  },
  {
    id: "nichols",
    name: "Nichols",
    joinUrl: "https://nicholsresearch.com/registration-form/",
    suggestedIngestEmail: "nichols@studies.YOUR_DOMAIN",
    notes:
      "Nichols Research — Bay Area focus groups / interviews. Prefer San Jose / Peninsula / East Bay area on the form. From: nicholsresearch.com.",
    metroHint: "Sunnyvale · Bay Area",
  },
  {
    id: "fieldwork",
    name: "Fieldwork",
    joinUrl: "https://participate.fieldwork.com/Account/Register",
    suggestedIngestEmail: "fieldwork@studies.YOUR_DOMAIN",
    notes:
      "Register and choose San Francisco as nearest facility. Focus groups in FiDi. From: fieldwork.com / focusgroupresearch.com (profile mail). Apply: fieldwork.com, participate.fieldwork.com, pate.fieldwork.com.",
    metroHint: "SF · Financial District",
  },
  {
    id: "fleischman",
    name: "Fleischman Field Research",
    joinUrl: "https://www.ffrsf.com/join-database/",
    suggestedIngestEmail: "fleischman@studies.YOUR_DOMAIN",
    notes:
      "SF Union Square facility (Probe Market Research). Join the respondent database for local focus groups / UX. From: ffrsf.com (parent: probemarket.com).",
    metroHint: "SF · Union Square",
  },
  {
    id: "le-opinions",
    name: "L&E Opinions",
    joinUrl:
      "https://www.leopinions.com/san-francisco-oakland-san-jose-ca-paid-studies/",
    suggestedIngestEmail: "le-opinions@studies.YOUR_DOMAIN",
    notes:
      "L&E Research consumer panel. Click Join Now, set metro to SF–Oakland–SJ. Screeners arrive by email. From: leopinions.com / leresearch.com.",
    metroHint: "SF · Oakland · San Jose",
  },
  {
    id: "focusgroup",
    name: "Focus Group (Sago)",
    joinUrl: "https://www.focusgroup.com/Account/Join",
    suggestedIngestEmail: "focusgroup@studies.YOUR_DOMAIN",
    notes:
      "National Sago panel (ex–Focus Pointe / Schlesinger community). Email invites from @focusgroup.com; choose Bay Area metro when profile asks. From: focusgroup.com / sago.com.",
    metroHint: "National · Bay Area remote/in-person",
  },
  {
    id: "vgm",
    name: "VGM",
    joinUrl: "https://vgm.co/signup/",
    suggestedIngestEmail: "vgm@studies.YOUR_DOMAIN",
    notes:
      "Video game research — South San Francisco labs + remote. Join the player panel. From: vgm.co (screeners sometimes on Alchemer — those stay in review).",
    metroHint: "Peninsula · South San Francisco",
  },
  {
    id: "google-ux",
    name: "Google UX Research",
    joinUrl: "https://userresearch.google.com/",
    suggestedIngestEmail: "google-ux@studies.YOUR_DOMAIN",
    notes:
      "Consumer UX panel (Mountain View / Bay Area office sessions when invited). Outreach often from userresearch@withgoogle.com.",
    metroHint: "Bay Area · Mountain View",
  },
  {
    id: "ea",
    name: "EA Playtesting",
    joinUrl: "https://www.ea.com/playtesting",
    suggestedIngestEmail: "ea@studies.YOUR_DOMAIN",
    notes:
      "Create a Playtester profile for Redwood Shores campus sessions. Invites from @ea.com / @e.ea.com.",
    metroHint: "Peninsula · Redwood Shores",
  },
  {
    id: "watchlab",
    name: "watchLAB",
    joinUrl: "https://watchlab.com/sign-up/",
    suggestedIngestEmail: "watchlab@studies.YOUR_DOMAIN",
    notes:
      "watchLAB qualitative recruiting — SF listed as a top market (also San Jose metro on signup). Join the community panel for email/SMS study invites. From: watchlab.com and tfaforms.com (FormAssembly invites). Screeners often on tfaforms.com.",
    metroHint: "SF · Oakland · San Jose",
  },
];

/** Optional next join targets — already on SOURCES From-gate. */
export const STRETCH_FIRMS: StretchFirmOnboard[] = [
  {
    id: "salesforce",
    name: "Salesforce Research",
    joinUrl: "https://uxresearch.my.salesforce-sites.com/ux/uxCRPSignup",
    suggestedIngestEmail: "salesforce@studies.YOUR_DOMAIN",
    notes:
      "SF HQ UX / customer research program. Email invites after signup. From: salesforce.com / force.com.",
    metroHint: "SF · Remote-friendly",
  },
  {
    id: "playtestcloud",
    name: "PlaytestCloud",
    joinUrl: "https://app.playtestcloud.com/signup",
    suggestedIngestEmail: "playtestcloud@studies.YOUR_DOMAIN",
    notes:
      "Remote paid game playtests. Invites from help@ / hello@playtestcloud.com.",
    metroHint: "Remote · National",
  },
  {
    id: "user-interviews",
    name: "User Interviews",
    joinUrl: "https://www.userinterviews.com/participants/signup",
    suggestedIngestEmail: "user-interviews@studies.YOUR_DOMAIN",
    notes:
      "Participant marketplace — many Bay Area / remote UX studies. Invites from @userinterviews.com.",
    metroHint: "Remote · Bay Area clients",
  },
  {
    id: "meta-arvr",
    name: "Meta AR/VR Research",
    joinUrl: "https://www.meta.com/research/ar-vr-panel/",
    suggestedIngestEmail: "meta-arvr@studies.YOUR_DOMAIN",
    notes:
      "AR/VR user research panel (Alida community). From: arvr-researchpanel.com / arvr-researchcommunity.com / meta.com / alida.com (subdomains included). Not Viewpoints, and not facebook.com.",
    metroHint: "Bay Area · Menlo Park area",
  },
];

export type FirmPresetId = FirmOnboard["id"] | StretchFirmOnboard["id"];

/** Sample inbound payloads for POST /api/inbound/dev?firm=… */
export type FirmInboundPreset = {
  id: FirmPresetId;
  from: string;
  subject: string;
  text: string;
  to: string;
};

export const FIRM_INBOUND_PRESETS: Record<FirmPresetId, FirmInboundPreset> = {
  clc: {
    id: "clc",
    from: "Recruiting <invite@consumerlearningcenter.com>",
    to: "clc@studies.YOUR_DOMAIN",
    subject: "Paid study: Online banking app UX interview — $125 / 60 min",
    text: `Hi,

We're recruiting Bay Area residents for a remote UX interview about online banking habits.

Compensation: $125
Duration: about 60 minutes via Zoom
Ages: 30–60
Location: Remote (must be in the SF Bay Area)

If you qualify, apply here:
https://www.consumerlearningcenter.com/screener/banking-ux-fall

Thank you,
CLC Recruiting Team
`,
  },
  tasteocracy: {
    id: "tasteocracy",
    from: "Tasteocracy Studies <studies@mail.tasteocracy.com>",
    to: "tasteocracy@studies.YOUR_DOMAIN",
    subject: "You're invited: Snack taste test in Livermore — $75 for 45 minutes",
    text: `Hello!

Tasteocracy is hosting a snack & beverage taste test at our Livermore Consumer Center.

Pay: $75 cash
Session length: 45 minutes
Ages 21-55 welcome
When: Weekday mornings & afternoons this month
Where: Tasteocracy Consumer Center · Livermore, CA

Sign up:
https://www.tasteocracy.com/join/livermore-snacks

See you soon,
Tasteocracy
`,
  },
  curion: {
    id: "curion",
    from: "Curion Insights <panel@curioninsights.com>",
    to: "curion@studies.YOUR_DOMAIN",
    subject: "Plant-based meal concept test — San Jose — $90",
    text: `Curion Insights invites you to a plant-based meal concept test.

Compensation: $90
Duration: ~75 minutes
Ages 22–50 (households with kids preferred)
When: Sat 10am–2pm (rolling)
Where: Curion Insights · South Bay facility, San Jose

Register:
https://www.curioninsights.com/participate/plant-based-sj

Thank you,
Curion Insights
`,
  },
  nichols: {
    id: "nichols",
    from: "Nichols Research <ops@nicholsresearch.com>",
    to: "nichols@studies.YOUR_DOMAIN",
    subject: "Oakland focus group: streaming habits — earn $175 (2 hours)",
    text: `Nichols Research is recruiting for an in-person focus group in Oakland.

Topic: Streaming & entertainment habits
Pay: $175
Time: 2 hours
Ages: 18-49
Modality: In-person
Location: Oakland facility (near BART)
When: Thu evening sessions

Screener link:
https://www.nicholsresearch.com/screener/streaming-oak

— Nichols Research
`,
  },
  fieldwork: {
    id: "fieldwork",
    from: "Fieldwork SF <recruiting@fieldwork.com>",
    to: "fieldwork@studies.YOUR_DOMAIN",
    subject: "SF Focus Group — Grocery delivery habits — $150 / 90 min",
    text: `Fieldwork San Francisco is looking for participants:

Evening focus group on grocery delivery habits
Incentive: $150
Length: 90 minutes
Ages: 25 to 40
Facility: Fieldwork SF · Financial District
Sessions: Tue 6–8pm (upcoming)

Apply / qualify:
https://www.fieldwork.com/join/sf-grocery-delivery

Questions? Reply to this email.
— Fieldwork SF Recruiting
`,
  },
  fleischman: {
    id: "fleischman",
    from: "Fleischman Recruiting <recruiting@ffrsf.com>",
    to: "fleischman@studies.YOUR_DOMAIN",
    subject: "SF focus group: mobile banking — $175 / 90 minutes",
    text: `Fleischman Field Research is recruiting for an in-person focus group in San Francisco.

Topic: Mobile banking & payments
Pay: $175
Duration: 90 minutes
Ages: 25–55
Where: Fleischman Field Research · Union Square, SF
When: Weekday evenings

Screener:
https://www.ffrsf.com/studies/mobile-banking-sf

— Fleischman Field Research
`,
  },
  "le-opinions": {
    id: "le-opinions",
    from: "L&E Opinions <studies@leopinions.com>",
    to: "le-opinions@studies.YOUR_DOMAIN",
    subject: "Bay Area study invite: smart home devices — $150 / 60 min",
    text: `Hi from L&E Opinions!

You may qualify for a paid research study about smart home devices.

Compensation: $150
Duration: about 60 minutes
Ages: 30–65
Location: In-person · San Francisco / Oakland metro
When: Next two weeks (flexible slots)

Take the screener:
https://www.leopinions.com/studies/smart-home-bay

Thanks,
L&E Research
`,
  },
  focusgroup: {
    id: "focusgroup",
    from: "Focus Group Panel <invite@focusgroup.com>",
    to: "focusgroup@studies.YOUR_DOMAIN",
    subject: "You're invited: Online focus group — streaming apps — $120",
    text: `Hello,

Focus Group (a Sago community) has a study that may match your profile.

Incentive: $120
Length: 75 minutes
Ages 21-45
Modality: Online focus group (Zoom)
When: This weekend afternoon slots

Apply here:
https://www.focusgroup.com/Surveys/streaming-apps-fall

— Focus Group Panel Team
`,
  },
  vgm: {
    id: "vgm",
    from: "VGM Testing <testing@vgm.co>",
    to: "vgm@studies.YOUR_DOMAIN",
    subject: "South SF playtest — unreleased action game — $200 / 4 hours",
    text: `VGM is recruiting playtesters for an onsite session in South San Francisco.

Pay: $200
Session: up to 4 hours
Ages: 18-35 (console / PC gamers)
Where: VGM labs · South San Francisco
When: Saturday morning / afternoon

Sign up / screener:
https://vgm.co/testers-wanted

— VGM Player Panel
`,
  },
  "google-ux": {
    id: "google-ux",
    from: "Google User Experience Research <userresearch@withgoogle.com>",
    to: "google-ux@studies.YOUR_DOMAIN",
    subject: "Invitation: Google UX interview — Maps — $125 / 60 min",
    text: `Hello,

You're invited to a Google User Experience Research session about Maps.

Compensation: $125
Duration: 60 minutes
Ages: 18+
Location: In-person · Bay Area Google office (or remote if noted)
When: Upcoming weekday slots

Learn more / schedule:
https://userresearch.google.com/

— Google UX Research
`,
  },
  ea: {
    id: "ea",
    from: "EA Playtesting <playtesting@e.ea.com>",
    to: "ea@studies.YOUR_DOMAIN",
    subject: "EA Playtest invite — Redwood Shores lab — $150 / 2 hours",
    text: `Hi Playtester,

EA Playtesting has an onsite session at Redwood Shores.

Incentive: $150
Length: 2 hours
Ages: 18-40
Facility: EA campus · Redwood Shores, CA
When: Weekday evenings this month

Apply in your Playtester profile:
https://www.ea.com/playtesting

— EA Playtesting
`,
  },
  salesforce: {
    id: "salesforce",
    from: "Salesforce UX Research <uxresearch@salesforce.com>",
    to: "salesforce@studies.YOUR_DOMAIN",
    subject: "Salesforce research invite: CRM dashboard UX — $150 / 60 min",
    text: `Hello,

You're invited to a Salesforce User Experience Research session.

Compensation: $150
Duration: 60 minutes via Zoom
Ages: 25–60 (business software users preferred)
Location: Remote · SF Bay Area residents welcome
When: Weekday daytime slots

Schedule / screener:
https://uxresearch.my.salesforce-sites.com/ux/uxCRPSignup

— Salesforce Research
`,
  },
  playtestcloud: {
    id: "playtestcloud",
    from: "PlaytestCloud <hello@playtestcloud.com>",
    to: "playtestcloud@studies.YOUR_DOMAIN",
    subject: "Paid remote playtest — mobile puzzle game — $80 / 40 min",
    text: `Hi!

PlaytestCloud has a remote paid playtest that may fit your profile.

Pay: $80
Length: about 40 minutes
Ages: 18-40
Modality: Remote (record yourself playing on your phone)
When: Flexible — complete within 48 hours of accept

Join / apply:
https://app.playtestcloud.com/signup

— PlaytestCloud
`,
  },
  "user-interviews": {
    id: "user-interviews",
    from: "User Interviews <studies@userinterviews.com>",
    to: "user-interviews@studies.YOUR_DOMAIN",
    subject: "UX interview: password managers — $110 / 45 min (remote)",
    text: `Hi there,

A Bay Area client is recruiting for a remote UX interview.

Compensation: $110
Duration: 45 minutes
Ages: 22–55
Location: Remote (Zoom)
When: Next 10 days

Apply on User Interviews:
https://www.userinterviews.com/projects/password-manager-bay

Thanks,
User Interviews
`,
  },
  "meta-arvr": {
    id: "meta-arvr",
    from: "Meta AR/VR Research <invite@arvr-researchpanel.com>",
    to: "meta-arvr@studies.YOUR_DOMAIN",
    subject: "AR/VR research session — Menlo Park area — $175 / 90 min",
    text: `Hello,

Meta AR/VR Research is inviting panelists for an onsite session.

Incentive: $175
Length: 90 minutes
Ages: 18–45
Where: Bay Area research lab (Menlo Park area)
When: Weekday / weekend slots this month
Note: Comfortable wearing a headset; photo ID required

Learn more / screener:
https://www.meta.com/research/ar-vr-panel/

— Meta AR/VR Research Panel
`,
  },
  watchlab: {
    id: "watchlab",
    from: "watchLAB <service@watchlab.com>",
    to: "watchlab@studies.YOUR_DOMAIN",
    subject: "SF Bay Area focus group: streaming habits — $175 / 90 min",
    text: `Hi,

watchLAB is recruiting for an in-person focus group in the San Francisco Bay Area.

Topic: Streaming & entertainment habits
Pay: $175
Duration: 90 minutes
Ages: 21–55
Location: In-person · San Francisco
When: Weekday evening sessions

Screener:
https://watchlab.com/sign-up/

— watchLAB Recruiting
`,
  },
};

export function getFirmOnboard(id: string): FirmOnboard | undefined {
  return FIRST_FIRMS.find((f) => f.id === id);
}

export function getFirmInboundPreset(
  id: string
): FirmInboundPreset | undefined {
  if (id in FIRM_INBOUND_PRESETS) {
    return FIRM_INBOUND_PRESETS[id as FirmPresetId];
  }
  return undefined;
}

export const FIRM_PRESET_IDS = Object.keys(
  FIRM_INBOUND_PRESETS
) as FirmPresetId[];
