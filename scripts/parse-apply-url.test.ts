/**
 * Apply-link ranking: dismiss / unsubscribe must not beat a real screener.
 * Run: npm run test:parse
 */
import assert from "node:assert/strict";
import { parseEmail } from "../src/lib/parseEmail";
import type { RawEmail } from "../src/lib/types";

const APPLY =
  "https://www.userinterviews.com/projects/password-manager-bay/apply?utm_source=email";
const DISMISS =
  "https://www.userinterviews.com/participants/dismiss-project?project_id=abc";
const NOT_INTERESTED =
  "https://www.userinterviews.com/participants/not-interested?project_id=abc";
const UNSUB = "https://mandrillapp.com/track/unsub.php?u=userinterviews&id=1";

function mandrillClick(dest: string): string {
  const p = Buffer.from(JSON.stringify({ u: dest })).toString("base64url");
  const u = new URL(
    "https://mandrillapp.com/track/click/30000000/www.userinterviews.com"
  );
  u.searchParams.set("p", p);
  return u.toString();
}

function email(partial: Partial<RawEmail> & Pick<RawEmail, "from" | "text">): RawEmail {
  return {
    id: "em-test",
    messageId: "<parse-apply-url@baystudies.local>",
    to: "ingest@baystudies.local",
    subject: partial.subject ?? "UX interview — $110 / 45 min",
    receivedAt: "2026-10-03T12:00:00-07:00",
    ...partial,
  };
}

function assertApply(label: string, raw: RawEmail, expected: string) {
  const draft = parseEmail(raw);
  assert.equal(draft.applyUrl, expected, label);
  assert.equal(
    draft.warnings.some((w) => /only dismiss or unsubscribe/i.test(w)),
    false,
    `${label}: should not warn that only dismiss links exist`
  );
}

const uiFrom = "User Interviews <studies@userinterviews.com>";

assertApply(
  "dismiss listed before apply",
  email({
    from: uiFrom,
    text: `Compensation: $110\nDuration: 45 minutes\n\nNot for me:\n${DISMISS}\n\nUnsubscribe:\n${UNSUB}\n\nApply:\n${APPLY}\n`,
  }),
  APPLY
);

assertApply(
  "gmail forward still prefers apply",
  email({
    from: "Evan <baystudies4788@gmail.com>",
    subject: "Fwd: UX interview — $110 / 45 min",
    text: `---------- Forwarded message ---------
From: User Interviews <studies@userinterviews.com>
Date: Fri, Oct 3, 2026
Subject: UX interview
To: baystudies4788@gmail.com

Not interested: ${NOT_INTERESTED}
Dismiss: ${DISMISS}
${UNSUB}

Apply on User Interviews:
${APPLY}
`,
  }),
  APPLY
);

const wrapped = mandrillClick(APPLY);
assertApply(
  "canonical apply beats mandrill wrapper",
  email({
    from: uiFrom,
    text: `Pay: $110\n45 minutes\n${DISMISS}\n${wrapped}\n${APPLY}\n`,
  }),
  APPLY
);

{
  const projectPage = "https://www.userinterviews.com/projects/password-manager-bay";
  const draft = parseEmail(
    email({
      from: uiFrom,
      text: `Pay: $110\n45 minutes\n${projectPage}\n${wrapped}\n`,
    })
  );
  assert.equal(
    draft.applyUrl,
    wrapped,
    "decoded mandrill apply destination beats a non-apply project page"
  );
}

{
  const draft = parseEmail(
    email({
      from: uiFrom,
      text: `Pay: $110\n45 minutes\n${DISMISS}\n${UNSUB}\nTrack: ${wrapped}\n`,
    })
  );
  assert.equal(
    draft.applyUrl,
    wrapped,
    "mandrill click to apply is ok when no canonical apply link is present"
  );
}

{
  const draft = parseEmail(
    email({
      from: uiFrom,
      text: `Pay: $110\n45 minutes\n${DISMISS}\n${UNSUB}\n`,
    })
  );
  assert.equal(draft.applyUrl, DISMISS);
  assert.ok(
    draft.warnings.some((w) => /only dismiss or unsubscribe/i.test(w)),
    "warn when nothing but dismiss/unsub is allowlisted"
  );
}

{
  const screener = "https://www.consumerlearningcenter.com/screener/banking-ux";
  const contact =
    "https://airtable.com/app123/shrContactForm?prefill_contact=1";
  const draft = parseEmail(
    email({
      from: "Someone <person@example.com>",
      text: `Contact only:\n${contact}\n\nScreener:\n${screener}\nPay: $100\n60 minutes\n`,
    })
  );
  assert.equal(draft.applyUrl, screener, "airtable contact loses to screener");
}

{
  const home = "https://www.playtestcloud.com/";
  const unsub = "https://email.playtestcloud.com/unsubscribe?u=1";
  const signup = "https://app.playtestcloud.com/signup";
  const session = "https://app.playtestcloud.com/participations/abc123";
  const draft = parseEmail(
    email({
      from: "PlaytestCloud <playtests@playtestcloud.com>",
      subject: "Paid playtest — $80 / 40 min",
      text: `${home}\n${unsub}\n${signup}\n${session}\nPay: $80\n40 minutes\n`,
    })
  );
  assert.equal(
    draft.applyUrl,
    session,
    "playtest participation link still beats homepage, unsub, and signup"
  );
}

{
  const first = "https://www.fieldwork.com/studies/snack-sf";
  const second = "https://www.fieldwork.com/about";
  const draft = parseEmail(
    email({
      from: "Fieldwork <invite@fieldwork.com>",
      subject: "Focus group — $150 / 90 min",
      text: `${first}\n${second}\nPay: $150\n90 minutes\nSan Francisco\n`,
    })
  );
  assert.equal(draft.applyUrl, first, "equal scores keep the earlier link");
}

console.log("parse-apply-url: ok");

import { normalizePublicApplyUrl } from "../src/lib/sanitizePublicStudy";

{
  const dirty =
    "https://www.userinterviews.com/projects/XfxPIhjs7g/apply?participant_id=12345678&participant_screener_key=abcdefghijklmnop&utm_source=email&utm_medium=email";
  assert.equal(
    normalizePublicApplyUrl(dirty),
    "https://www.userinterviews.com/projects/XfxPIhjs7g/apply",
    "UI apply drops participant session params and utm"
  );
}

{
  const projectPage =
    "https://www.userinterviews.com/projects/lPQ46bMxzA?participant_id=99887766&participant_screener_key=keykeykeykeykeyk";
  assert.equal(
    normalizePublicApplyUrl(projectPage),
    "https://www.userinterviews.com/projects/lPQ46bMxzA/apply",
    "UI project page becomes a clean /apply URL"
  );
}

{
  const dest =
    "https://www.userinterviews.com/projects/WG08mjKwIA/apply?participant_id=11223344&participant_screener_key=screenerkeyvalue1";
  assert.equal(
    normalizePublicApplyUrl(mandrillClick(dest)),
    "https://www.userinterviews.com/projects/WG08mjKwIA/apply",
    "plaintext mandrill destination unwraps to a clean project apply URL"
  );
}

{
  const portal =
    "https://curionpanelist.com/portal/default?as-refcode=abcDEF1234567890";
  assert.equal(
    normalizePublicApplyUrl(portal, { firmDomain: "curioninsights.com" }),
    "https://curioninsights.com/",
    "personal portal with no project URL falls back to the firm homepage"
  );
}

{
  const tracker =
    "https://u33561959.ct.sendgrid.net/ls/click?upn=not-a-real-token";
  assert.equal(
    normalizePublicApplyUrl(tracker, { firmDomain: "curioninsights.com" }),
    "https://curioninsights.com/",
    "unreadable sendgrid click falls back to the firm homepage"
  );
}

{
  const study =
    "https://www.curioninsights.com/participate/plant-based-sj?pid=1234567&utm_source=email";
  assert.equal(
    normalizePublicApplyUrl(study, { firmDomain: "curioninsights.com" }),
    "https://www.curioninsights.com/participate/plant-based-sj?utm_source=email",
    "real study path keeps non-personal query params"
  );
}

{
  const portalHome = "https://pate.fieldwork.com";
  assert.equal(
    normalizePublicApplyUrl(portalHome, { firmDomain: "fieldwork.com" }),
    portalHome,
    "already-public firm portal URL is left alone"
  );
}

{
  const dirty =
    "https://survey.sago.com/Survey/CSLaunch.aspx?scrid=150129&seguid=847fae1e-82d4-4c34-9ed2-6bb8ca4faa45&rid=3738017";
  assert.equal(
    normalizePublicApplyUrl(dirty),
    "https://survey.sago.com/Survey/CSLaunch.aspx?scrid=150129",
    "Sago CSLaunch keeps scrid and drops rid/seguid"
  );
}

{
  const dirty =
    "https://survey.sago.com/Survey/CSLaunch.aspx?scrid=150129&recipient=jake%40example.com&invite=abc&invite_id=99&respondent=1&resp=2";
  assert.equal(
    normalizePublicApplyUrl(dirty),
    "https://survey.sago.com/Survey/CSLaunch.aspx?scrid=150129",
    "Sago-style invite/respondent personal params are stripped"
  );
}

{
  const ra =
    "https://survey.metrixmatrix.com/SE/?st=tV6aAl7DSRd1VVaA33cNMZ78Z3luCjlalwqpRB7u%2Brc%3D";
  assert.equal(
    normalizePublicApplyUrl(ra),
    ra,
    "Research America st= study token is left alone"
  );
}

console.log("normalize-apply-url: ok");

import { sanitizeStudyForPublic } from "../src/lib/sanitizePublicStudy";
import type { Study } from "../src/lib/types";

{
  const dirty =
    "https://www.userinterviews.com/projects/XfxPIhjs7g/apply?participant_id=12345678&participant_screener_key=abcdefghijklmnop";
  const study = sanitizeStudyForPublic({
    id: "pub-test",
    title: "Workout study",
    firm: "User Interviews",
    firmDomain: "userinterviews.com",
    verified: true,
    pay: 75,
    durationMinutes: 60,
    type: "ux-interview",
    modality: "in-person",
    location: "Fremont",
    metro: ["east-bay"],
    when: "See screener",
    eligibility: { notes: "See screener" },
    description: `Book here ${dirty} thanks`,
    applyUrl: dirty,
  } satisfies Study);
  assert.equal(
    study.applyUrl,
    "https://www.userinterviews.com/projects/XfxPIhjs7g/apply"
  );
  assert.equal(study.description.includes("participant_id"), false);
  assert.equal(
    study.description.includes(
      "https://www.userinterviews.com/projects/XfxPIhjs7g/apply"
    ),
    true
  );
}

console.log("sanitize-card-urls: ok");

import { findSourceByFromEmail } from "../src/data/sources";

{
  assert.equal(
    findSourceByFromEmail("Hugh Bowen <hughbowenresearch@gmail.com>")?.id,
    "bowen-research",
    "exact recruiter Gmail matches before domain"
  );
  assert.equal(
    findSourceByFromEmail("HUGHBOWENRESEARCH@GMAIL.COM")?.id,
    "bowen-research",
    "fromEmails compare lowercase"
  );
  assert.equal(
    findSourceByFromEmail("Hugh <hugh@bowenresearch.com>")?.id,
    "bowen-research",
    "bowenresearch.com still matches fromDomains"
  );
  assert.equal(
    findSourceByFromEmail("Evan <baystudies4788@gmail.com>"),
    undefined,
    "other gmail.com senders stay off the allowlist"
  );
  assert.equal(
    findSourceByFromEmail("someone@googlemail.com"),
    undefined,
    "googlemail.com is not a blanket allowlist"
  );
  assert.equal(
    findSourceByFromEmail("Research <studies@withgoogle.com>")?.id,
    "google-ux",
    "non-gmail domains still match fromDomains"
  );
}

{
  const draft = parseEmail(
    email({
      from: "Hugh Bowen <hughbowenresearch@gmail.com>",
      subject: "Paid session — $50 / 60 min",
      text: "Compensation: $50\nDuration: 60 minutes\nhttps://www.bowenresearch.com/sign-up.php\n",
    })
  );
  assert.equal(draft.fromAllowed, true, "bowen gmail from is allowlisted");
  assert.equal(draft.matchedSourceId, "bowen-research");
  assert.equal(draft.firm, "Bowen Research");
  assert.equal(draft.type, "game-playtest", "default type when body has no type hint");
  assert.equal(
    draft.applyUrl,
    "https://www.bowenresearch.com/sign-up.php",
    "bowenresearch.com signup is an apply host"
  );
}

{
  const draft = parseEmail(
    email({
      from: "Random Recruiter <paidstudies@gmail.com>",
      subject: "Paid session — $50 / 60 min",
      text: "Compensation: $50\nDuration: 60 minutes\nhttps://www.bowenresearch.com/sign-up.php\n",
    })
  );
  assert.equal(draft.fromAllowed, false, "gmail.com domain is not allowlisted");
  assert.equal(draft.matchedSourceId, undefined);
}

console.log("bowen-allowlist: ok");

{
  assert.equal(
    findSourceByFromEmail("Claudia Paige <claudia@satelliteresearch.net>")?.id,
    "satellite-research",
    "Satellite Research matches Claudia's address and domain"
  );
  assert.equal(
    findSourceByFromEmail("invite@satelliteresearch.net")?.id,
    "satellite-research"
  );
  const draft = parseEmail(
    email({
      from: "Claudia Paige <claudia@satelliteresearch.net>",
      subject: "Paid session — $100 / 90 min",
      text: "Compensation: $100\nDuration: 90 minutes\nhttps://satelliteresearch.net/join/\n",
    })
  );
  assert.equal(draft.fromAllowed, true);
  assert.equal(draft.matchedSourceId, "satellite-research");
  assert.equal(draft.firm, "Satellite Research");
  assert.equal(draft.type, "focus-group");
  assert.equal(draft.applyUrl, "https://satelliteresearch.net/join/");
}

console.log("satellite-allowlist: ok");

{
  const cases: [string, string][] = [
    ["Debbie McAfee <deborah.e.mcafee@gmail.com>", "alphabuzz"],
    ["Debbie McAfee <debm@alphabuzzgroup.com>", "alphabuzz"],
    ["Debbie McAfee <debbiem@alphabuzzgroup.com>", "alphabuzz"],
    ["Amplify <participate@amplifyresearch.com>", "amplify-research"],
    ["Hagen <smithd@hagensinclair.com>", "hagen-sinclair"],
    ["Wilkins <websend@wilkinssurvey.com>", "wilkins-survey"],
    ["Jen <jsteele@steele-recruiting.com>", "steele-recruiting"],
    ["VuPoint <Survey180438-26550900@vupointinvite.com>", "vupoint-mdc"],
    ["MDC <VuPointSF-15781584@mdcinvite.com>", "vupoint-mdc"],
    ["Deb Tysall <deb@intactqualitativeresearch.com>", "intact-qualitative"],
    ["C2 <surveys@c2research.com>", "c2-research"],
    ["Delve <delve_cpm@delve.com>", "focus-pointe-delve"],
    ["FPG <noreply@focuspointeglobal.com>", "focus-pointe-delve"],
    ["IQ <nicerecruiting@gmail.com>", "iq-research-sf"],
    ["Richard Ngo <emailrich.ngo@gmail.com>", "iq-research-sf"],
    ["Deb Tysall <deb@iqrsf.com>", "iq-research-sf"],
    ["Sokol <sokol@yourcontacthub.com>", "your-contact-hub"],
    ["BlueSky <jreid@blueskymr.com>", "bluesky-mr"],
    ["Lisa <lisa@lcaresearch.com>", "lca-research"],
    ["Nelson <confirmations@nelsonrecruiting.com>", "nelson-recruiting"],
    ["Justin <justin@chatterinc.com>", "chatter-inc"],
    ["dscout <support@dscout.com>", "dscout"],
    ["QAR <confirmationteam@qar.com>", "qar"],
    ["Heidi <heidi@researchbayarea.com>", "bay-area-research"],
    ["Lowell Smith <lowellvs@gmail.com>", "bowen-research"],
  ];
  for (const [from, id] of cases) {
    assert.equal(findSourceByFromEmail(from)?.id, id, from);
  }
  assert.equal(
    findSourceByFromEmail("Friend <kikknowledge@gmail.com>"),
    undefined,
    "personal gmail forwards stay off the allowlist"
  );
  assert.equal(
    findSourceByFromEmail("Lisa <lisagerritsen98@gmail.com>"),
    undefined,
    "unrelated personal gmail is not LCA"
  );
  assert.notEqual(
    findSourceByFromEmail("QAR <confirmationteam@qar.com>")?.id,
    "le-opinions",
    "qar.com is not an L&E alias"
  );
}

console.log("forgotten-firms-allowlist: ok");
