# Firm access: Direct link vs Join panel first

Config: `src/lib/firmAccess.ts` (`FIRMS`). Every URL was checked by hand
(curl, or real Chrome where a bot check blocks curl). Never add an unverified URL;
a firm with no verified join page gets a single homepage button.

| Firm | Join (public signup) | Member login | Always panel? |
|---|---|---|---|
| Curion | https://curionpanelist.com/register | https://curionpanelist.com/Portal/default | yes |
| Focus Group by Sago | https://www.focusgroup.com/Account/Join | https://www.focusgroup.com/ (Login pop-up) | yes |
| Fieldwork | https://participate.fieldwork.com/Account/Register | https://participate.fieldwork.com/Account/Login | yes |
| CLC | https://www.theclc.com/individualregistration.html | https://my.theclc.com/ | only if link is a homepage/login |
| Tasteocracy | https://www.tasteocracy.com/become-tester | https://myaccount.tasteocracy.com/ | only if link is a homepage/login |
| Nichols | https://nicholsresearch.com/registration-form/ | none (homepage) | only if link is a homepage/login |
| User Interviews | https://www.userinterviews.com/participants/signup | https://www.userinterviews.com/accounts/signin | no (project links are direct) |

Sago screener links (`survey.sago.com`) are per-member invites (`rid`/`seguid`)
and are always rewritten to the public join page; see `normalizePublicApplyUrl`.

## Joined panels (device only)

`/setup` is a one-time checklist. "I've joined" is stored in this browser's
localStorage (`bay-studies-joined-firms-v1`). Nothing goes to the server and
there's no telemetry. For a joined firm, cards and the study page show
"Log in to <firm>" + "then search <code>" with Copy, plus a small
"Not a member yet? Join" link.

After a Join tap, coming back to the tab asks once per firm per session:
"Did you finish joining <firm>?" (sessionStorage; Yes marks joined, Not yet does nothing).

The Get set up suggestion is optional: shown as the last onboarding step and
after the first vault save, with "Maybe later". After that only a small,
dismissible feed nudge appears.
