# Bay Studies — firm signup checklist

Use a dedicated ingest address per firm (e.g. `clc@studies.YOUR_DOMAIN`) so invites hit Mailgun → `/api/inbound`. Until DNS is live, keep notes of which personal/forwarding inbox you used.

**Forward tip:** If a firm won’t accept `*@studies.…`, sign up with your normal email and forward study invites to `ingest@studies.YOUR_DOMAIN` (or your Mailgun route recipient).

**Current soft-launch path:** signed up with `baystudies4788@gmail.com`; Gmail → Mailgun forwarding is on for firms marked Done.

## Status (2026-10-05)

| Status | Firms | Notes |
| :--- | :--- | :--- |
| **Done** | CLC, Tasteocracy, Curion, Nichols Research, Fieldwork, L&E Opinions, Focus Group (Sago), Google UX Research, EA Playtesting, User Interviews, Hagen/Sinclair, Wilkins Research, IQ Research SF, Satellite Research, Bowen Research, Steele Recruiting, Salesforce UX | Panel signup complete with `baystudies4788@gmail.com`; Gmail→Mailgun forwarding on |
| **Blocked** | VGM | Mobile signup won’t accept DOB — retry on desktop/laptop |
| **Skipped (for now)** | Fleischman Field Research (Probe), watchLAB | Fleischman: Evan already on list — do not re-join. watchLAB: reCAPTCHA wall |
| **Not started** | Salesforce Research *(stretch)*, PlaytestCloud *(stretch)*, Meta AR/VR Research *(stretch)*, IQRSF, Satellite, Bowen, Steele, Nelson | IQRSF waiting on profile answers; then remaining public joins |

| Firm | Status | Why included | Signup URL |
| :--- | :--- | :--- | :--- |
| **CLC** | Done | Pleasanton / East Bay sensory & UX; primary email-ingest firm | https://www.theclc.com/individualregistration.html |
| **Tasteocracy** | Done | Livermore taste tests; reliable invite mail | https://www.tasteocracy.com/become-tester |
| **Curion** | Done | Redwood City panelist register; product / concept tests | https://curionpanelist.com/register |
| **Nichols Research** | Done | Bay Area focus groups (Sunnyvale / Peninsula / East Bay) | https://nicholsresearch.com/registration-form/ |
| **Fieldwork** | Done | SF FiDi facility; national network with local room | https://participate.fieldwork.com/Account/Register |
| **Fleischman Field Research** | Skipped (for now) | Already on Evan’s list — do not re-join | https://www.ffrsf.com/join-database/ |
| **L&E Opinions** | Done | L&E Research panel with SF–Oakland–SJ metro studies + email screeners | https://www.leopinions.com/san-francisco-oakland-san-jose-ca-paid-studies/ |
| **Focus Group (Sago)** | Done | National panel (ex–Focus Pointe / Schlesinger community); email invites | https://www.focusgroup.com/Account/Join |
| **VGM** | Blocked | South SF game research labs + remote playtests — DOB field broken on mobile | https://vgm.co/signup/ |
| **Google UX Research** | Done | Public consumer UX panel; Bay Area office sessions | https://userresearch.google.com/ |
| **EA Playtesting** | Done | Redwood Shores campus playtests | https://www.ea.com/playtesting |
| **watchLAB** | Skipped (for now) | reCAPTCHA wall on join form | https://watchlab.com/sign-up/ |
| **Salesforce Research** *(stretch)* | Done | Signed up 2026-10-05 as Product Manager / Self-employed | https://uxresearch.my.site.com/uxsignup/ |
| **PlaytestCloud** *(stretch)* | Done | Evan confirmed already signed up 2026-10-05 | https://app.playtestcloud.com/signup |
| **User Interviews** *(stretch)* | Done | High-quality UX participant marketplace; email apply links | https://www.userinterviews.com/participants/signup |
| **Meta AR/VR Research** *(stretch)* | Not started | Public AR/VR panel (not Viewpoints app) | https://www.meta.com/research/ar-vr-panel/ |

| **Hagen/Sinclair** | Done | Respondent database; confirmations from cynthia@hagensinclair.com | https://hagensinclair.com/paid-research-studies-2/online-form/ |
| **Wilkins Research** | Done | Panel signup 2026-10-05 | https://wilkinsresearch.com/join-our-panel/ |
| **IQ Research SF (Intact)** | Done | Signed up 2026-10-05; thank-you on form page | https://www.iqrsf.com/participant-intake-form |
| **Satellite Research** | Done | Signed up 2026-10-05 | https://satelliteresearch.net/join/ |
| **Bowen Research** | Done | Mobile signup 2026-10-05 | https://www.bowenresearch.com/sign-up.php |
| **Steele Recruiting** | Done | Gamer Google Form 2026-10-05 | https://www.steele-recruiting.com/join-the-fun |
| **Nelson Recruiting** | Done | Evan confirmed photo-ID / register already done 2026-10-05 | https://nelsonrecruiting.com/register-for-a-focus-group/ |

PlaytestCloud *(stretch)* is still **Not started** here for Evan to confirm, but live account mail (onboarding / login) is already in the inbox.

Admin UI mirror: `/admin/firms`.

**Ingest tip:** On `/admin/ingest`, tip-style emails need **Enrich before Approve** — open the firm portal, grab title/pay/screener, paste into Enrich, then Approve.

## Skipped (intentionally)

| Name | Why skipped |
| :--- | :--- |
| LocalFocusGroup / NationalFocusGroups / bayareafocusgroups.com | Mailing-list aggregators / boards — not firm From domains; risk of third-party rehosted screeners |
| Quantum Market Research, Amplify Research, UEG, eBay, PayPal, Zynga | Invite-only or no public consumer join (Drive “partnership later”) |
| UserTesting | Gig/app marketplace; weaker “firm screener email” fit for Bay facility wedge |
| Adobe Feedback Program | Product feedback, not paid focus-group / sensory wedge |
| Meta Viewpoints | App-only channel |
| Beta Hat / Good Gamer Group / Sprung | Smaller playtest communities; revisit after core volume |
| Schlesinger / Focus Pointe as separate brands | Merged into Focus Group (Sago) panel |

*Compiled for Evan · Bay Studies firm expansion · 2026-10-03*
