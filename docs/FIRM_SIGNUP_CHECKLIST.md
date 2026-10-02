# Bay Studies — firm signup checklist

Use a dedicated ingest address per firm (e.g. `clc@studies.YOUR_DOMAIN`) so invites hit Mailgun → `/api/inbound`. Until DNS is live, keep notes of which personal/forwarding inbox you used.

**Forward tip:** If a firm won’t accept `*@studies.…`, sign up with your normal email and forward study invites to `ingest@studies.YOUR_DOMAIN` (or your Mailgun route recipient).

| Firm | Why included | Signup URL |
| :--- | :--- | :--- |
| **CLC** | Pleasanton / East Bay sensory & UX; primary email-ingest firm | https://www.theclc.com/individualregistration.html |
| **Tasteocracy** | Livermore taste tests; reliable invite mail | https://www.tasteocracy.com/become-tester |
| **Curion** | Redwood City panelist register; product / concept tests | https://curionpanelist.com/register |
| **Nichols Research** | Bay Area focus groups (Sunnyvale / Peninsula / East Bay) | https://nicholsresearch.com/registration-form/ |
| **Fieldwork** | SF FiDi facility; national network with local room | https://participate.fieldwork.com/Account/Register |
| **Fleischman Field Research** | Long-running SF Union Square facility; public respondent DB | https://www.ffrsf.com/join-database/ |
| **L&E Opinions** | L&E Research panel with SF–Oakland–SJ metro studies + email screeners | https://www.leopinions.com/san-francisco-oakland-san-jose-ca-paid-studies/ |
| **Focus Group (Sago)** | National panel (ex–Focus Pointe / Schlesinger community); email invites | https://www.focusgroup.com/Account/Join |
| **VGM** | South SF game research labs + remote playtests | https://vgm.co/signup/ |
| **Google UX Research** | Public consumer UX panel; Bay Area office sessions | https://userresearch.google.com/ |
| **EA Playtesting** | Redwood Shores campus playtests | https://www.ea.com/playtesting |
| **Salesforce Research** *(stretch)* | SF HQ UX / customer research program | https://uxresearch.my.salesforce-sites.com/ux/uxCRPSignup |
| **PlaytestCloud** *(stretch)* | Remote paid playtests; clear email invites | https://app.playtestcloud.com/signup |
| **User Interviews** *(stretch)* | High-quality UX participant marketplace; email apply links | https://www.userinterviews.com/participants/signup |
| **Meta AR/VR Research** *(stretch)* | Public AR/VR panel (not Viewpoints app) | https://www.meta.com/research/ar-vr-panel/ |

Admin UI mirror: `/admin/firms`.

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

*Compiled for Evan · Bay Studies firm expansion · 2026-10-02*
