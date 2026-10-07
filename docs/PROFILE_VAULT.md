# Bay Studies — Profile vault (product sketch)

_Status: soft-launch scaffold, Oct 5, 2026. On-device only. No accounts yet._

## The bridge, in one line

> **The studies feed is free for everyone. Optional signup saves you time on
> firm applications and unlocks exclusive Bay Studies projects.**

Use that framing everywhere: free first, signup is a convenience, never a gate.

## Locked product intent

- The full studies feed stays **free and public**. No login wall, no blurred
  cards, no "sign up to see pay".
- Signup is **optional** and earns its keep two ways:
  1. **Save time applying** to firm studies (consented fill / copy helpers).
  2. **Exclusive in-house Bay Studies projects** (later).
- Feed publishing keeps the **human Approve** step.
- Sensitive answers (DOB, ID) are **always user-confirmed** and never sent
  automatically.
- No billing. No selling data. Ever.

## User journey

1. **Browse free** — land on `/` or `/feed`, see every approved study. Apply on
   the firm's site. Nothing asked of you.
2. **Soft pitch** — one short line on the homepage and feed banner: signing up
   saves time on firm apps + unlocks exclusive studies. Link → `/vault`.
3. **Optional account** _(later)_ — email magic link. Soft launch skips this;
   the vault works on-device with no signup.
4. **Vault** — `/vault` (also reachable from `/me`). Answer the usual screener
   questions once, by section. Skip anything. Sensitive fields are labeled.
5. **"Fill this screener"** — on a study detail page (`/studies/[id]`), tap
   Open, tick the consent checklist, then copy everyday vault+profile answers
   as chips. Sensitive fields need per-field "Show & copy". Copy-only (no
   autofill of firm sites). Empty vault → CTA to `/vault`. The person always
   pastes, reviews, and presses the firm's Submit.
6. **Exclusive studies** _(later)_ — members see Bay Studies' own projects
   (in-house research, partner pilots) in addition to the public feed.

## Field categories

Every field starts empty for every user. We never ship anyone's real answers
as defaults.

| Section | Field | Tier | Stored in |
|---|---|---|---|
| Contact | Full name | Everyday | vault |
| | Email | Everyday | profile (onboarding) |
| | Phone | Everyday | profile |
| | ZIP | Everyday | profile |
| | Street address | **Sensitive** | vault |
| About you | Age | Everyday | profile |
| | Date of birth | **Sensitive** | profile |
| | Gender | Everyday | profile |
| | Ethnicity | **Sensitive** | vault |
| | Marital status | Everyday | vault |
| | Education | Everyday | vault |
| Household | Kids at home | Everyday | profile |
| | Housing (rent/own) | Everyday | vault |
| | Household income band | Everyday (ranges + prefer-not) | vault |
| | Pets | Everyday | vault |
| Work | Employment | Everyday | profile |
| | Job title | Everyday | vault |
| | Company or industry | Everyday | vault |
| Tech & life | Phone / OS | Everyday | vault |
| | Mobile carrier | Everyday | vault |
| | Vehicle | Everyday | vault |
| | Hobbies | Everyday | vault |
| | Gaming (platforms, genres) | Everyday | vault |
| Health | Health notes (default: prefer not to say) | **Sensitive** | vault |
| — | Government ID numbers (license, passport, SSN) | **Never stored** | — |

- **Everyday** = OK to include in a consented fill after the checklist.
- **Sensitive** = masked in the UI, never part of a bulk fill, confirmed field
  by field on every screener. Aligns with CPRA "sensitive personal info"
  (ethnicity, health, precise location) plus DOB.
- **Never stored** = ID numbers. If a firm needs ID, the person shows it to the
  firm directly.

## Consent model

- **Per screener, per session.** Consent is a checklist on the screener the
  person opened themselves — not a one-time blanket "allow".
- Checklist (soft-launch preview on `/vault`):
  1. I opened this screener myself, on the firm's own site.
  2. Fill my everyday details (name, email, phone, ZIP).
  3. Ask me before each sensitive field (DOB, address, health).
  4. I'll check every answer and press the firm's Submit button myself.
- **No auto-submit.** The helper never presses Submit, never creates firm
  accounts, never answers screening questions it doesn't have a saved answer
  for (no guessing to "qualify").
- **Honest answers only.** Vault answers are the person's real info; we don't
  suggest answers to game screeners.
- Every fill can be undone; the person can clear the vault anytime.

## Soft launch vs later

| | Soft launch (now) | Later |
|---|---|---|
| Feed | Free, public, human Approve | Same — always free |
| Account | None. Vault in localStorage on one device | Optional email magic-link account, synced vault, encrypted at rest |
| Vault UI | `/vault` sections, edit vault-only fields, profile fields link to About you, sensitive masked | Edit everything in one place, export/delete-my-data |
| Fill helper | **Copy-only** "Fill this screener" on `/studies/[id]`: consent checklist → everyday tap-to-copy chips; sensitive behind per-field "Show & copy". Empty vault → `/vault`. No firm-site autofill. Vault page shows the same checklist as a preview. | Browser extension / bookmarklet that can inject into firm forms after the same consent |
| Exclusive studies | Mentioned as "soon" | Members-only Bay Studies projects |
| Billing | None | None planned |

## Privacy notes

- **We never sell data.** Not the profile, not the vault, not usage.
- Soft launch stores everything in the person's browser only. Nothing syncs to
  a Bay Studies server; clearing the browser or tapping "Clear" removes it.
- When accounts ship: encrypt vault at rest, keep sensitive fields in a
  separate encrypted column, no third-party analytics on vault pages, one-tap
  export and delete, and a plain-English privacy page update before launch.
- Helping friends via the bot in soft launch: only use answers the friend gave
  for that application, confirm DOB/ID with them each time, don't keep copies
  after the application is done.

## Code map (scaffold)

- `src/lib/vault.ts` — section + field definitions, tiers, localStorage
  (`bay-studies-vault-v1`), progress helpers, shared `CONSENT_CHECKLIST`.
  Profile-backed fields are read from the existing `bay-studies-profile-v1`
  profile (single source).
- `src/app/vault/page.tsx` — vault page: bridge card, empty state, sections,
  ID note, "Fill this screener" consent preview (points at study pages),
  privacy line.
- `src/components/FillScreenerHelper.tsx` — study-detail sheet: consent →
  everyday copy chips + sensitive "Show & copy"; empty → `/vault` CTA.
- `src/app/studies/[id]/page.tsx` — hosts `FillScreenerHelper` (replaces the
  old phone/email/ZIP-only copy row).
- `src/app/me/page.tsx` — Profile vault card linking to `/vault`; "Clear local
  profile" also clears the vault.
- `src/app/page.tsx`, `src/app/feed/page.tsx` — one-line soft pitch → `/vault`.
- `src/app/privacy/page.tsx` — vault listed in "what we store"; no-selling line.

## Suggested next build step

Browser extension / bookmarklet that can inject consented everyday answers into
firm screener forms (still no auto-submit; sensitive still per-field confirm).

### Next: real autofill

See [AUTOFILL.md](./AUTOFILL.md) for the real firm-site autofill sketch (extension recommended, consent + allowlist, MVP scope, open questions).

## Copy next helper (shipped Oct 7, 2026)

On pilot-firm study pages (Curion, Fieldwork, CLC, Tasteocracy, Nichols), the
vault powers a step-by-step **Copy next** helper: one tap copies the next
answer in that firm's usual order. Same consent checklist, sensitive fields
still need their own tap, blank answers are skipped, and nothing leaves the
device. Details and per-firm order: [AUTOFILL.md §11](./AUTOFILL.md#11-shipped-copy-next-phone-helper-option-b).
