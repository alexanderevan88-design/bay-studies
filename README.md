# Bay Studies

SF Bay Area trusted focus-group / paid-study aggregator MVP.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS  
**Auth:** none yet — profile + approved studies live in `localStorage`  
**Email:** fixtures + live inbox store (`data/inbox.json`) — **no paid keys required** for local demo

## Run

```bash
cd bay-studies
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm start       # serve production build
```

## Deploy (public + Mailgun)

See **[docs/DEPLOY.md](docs/DEPLOY.md)** for Vercel (preferred), env vars (`INBOUND_WEBHOOK_SECRET`, `MAIL_PROVIDER`), pointing a Mailgun inbound route at `https://YOUR_DOMAIN/api/inbound`, MX/domain notes, and an ngrok tunnel alternative before you buy a domain.

In-app checklist: [/admin/setup](http://localhost:3000/admin/setup) after `npm run dev` (or on your deployed host).

## Install on your phone (PWA)

Bay Studies can be added to the home screen (Chrome Android **Install** / iPhone Safari **Share → Add to Home Screen**). See **[docs/PWA.md](docs/PWA.md)** for steps, local testing notes, and what’s included (`public/manifest.webmanifest`, icons, `sw.js`).


## Routes

| Path | Screen |
|------|--------|
| `/` | Welcome — metro select |
| `/onboarding/about` | Demographics |
| `/onboarding/preferences` | Format, pay, travel, types, push |
| `/feed` | Matched study cards (seed + approved from ingest) · **New match** badges · toast banner |
| `/feed?tab=saved` | Saved studies |
| `/studies/[id]` | Detail — why matched · Open screener · Not for me |
| `/alerts` | Push / digest / quiet hours · **recent notifications** |
| `/me` | Profile · **Laptop day** (deploy + Mailgun) · Saved / Applied · verify |
| `/about/verify` | **How we verify sources** (trust checklist) |
| `/privacy` | Privacy & about stub (local profile · no fee) |
| `/feed?tab=applied` | Applied studies |
| `/admin/ingest` | Admin demo — Approve / **Auto-publish** / Reject · link health · **analytics footer** |
| `/admin/setup` | Deploy checklist — domain, Mailgun, webhook URL, secret, first firm ingest email |
| `/admin/firms` | Firm join checklist + stretch panels — join URLs, ingest emails, notes |
| `POST /api/inbound` | Mailgun/SendGrid-style webhook (multipart or JSON) → parse → `data/inbox.json` |
| `GET /api/inbox` | Admin list of live inbox items |
| `POST /api/inbound/dev` | Inject a test email (no provider); optional `firm` preset (see `FIRM_PRESET_IDS` in `src/data/firms.ts`) |
| `GET /api/check-link?url=` | **Week 3** server-side HEAD/GET apply URL (CORS-safe) |

---

## Week 1 — Product UI

- Sage / olive (`#5F6F52`) + cream/white
- Serif headlines (Source Serif 4), sans body (DM Sans)
- Mobile-first, max-width card column
- Trust: verified badges, pay + time upfront, “No fee. Ever.”, apply domain shown
- Seed studies: 15 fixtures spanning FIRST + STRETCH allowlisted firms (Fieldwork → Meta AR/VR)
- Match %: `src/lib/match.ts`

## Week 2 — Email ingest foundation

Demo-capable **without live SMTP**. Sample firm emails are parsed locally; Approve publishes into the feed store (`localStorage`).

### Data model

| File | Role |
|------|------|
| `src/data/sources.ts` | Allowlist: CLC, Tasteocracy, Curion, Nichols, Fieldwork — From domains + apply domains |
| `src/lib/types.ts` | `Source`, `RawEmail`, `StudyDraft`, `ParseLog`, `DraftStatus`, `IngestItemState` |
| `src/data/sampleEmails.ts` | 15 fixture invites — one per FIRST + STRETCH firm (synced from `FIRM_INBOUND_PRESETS`) |
| `src/lib/parseEmail.ts` | From gate, link extract, `$` / minutes / age-range regexes, confidence, per-firm overrides |
| `src/lib/storage.ts` | Profile + **published studies** + **ingest review state** |

### Parser (`parseEmail`)

1. **From gate** — match sender domain to `SOURCES`
2. Extract links, pay (`$125`), duration (`60 minutes` / `2 hours`), age range (`Ages 25–40`)
3. Guess type / modality / metro from body hints
4. Prefer apply URLs on the firm’s allowlisted domains
5. Apply light per-firm overrides (CLC → remote UX, Fieldwork → SF focus group, etc.)
6. Score **confidence** 0–100; collect warnings

### Admin approve flow (how to demo)

1. `npm run dev` → open [/admin/ingest](http://localhost:3000/admin/ingest)
2. Page is stamped **admin demo** (no auth)
3. Left: 15 sample raw emails (all allowlisted firms) with From OK / confidence / status
4. Select one → raw body + **extracted draft JSON** + parse log
5. **Approve → feed** — writes a `Study` (`id: pub-<emailId>`) into `localStorage` and marks the item approved
6. Open [/feed](http://localhost:3000/feed) — the new study appears with the seed list (badge “From email” on detail)
7. **Reject** — marks rejected and removes a previously published copy
8. **Reset demo** — clears published + ingest localStorage keys

Feed header also has a quiet **Ingest** link for quick access.

### Live inbox (still no paid keys)

Server store: `data/inbox.json` (gitignored). `/admin/ingest` loads **GET /api/inbox** when items exist, otherwise falls back to fixtures.

| Piece | Role |
|-------|------|
| `POST /api/inbound` | Accepts Mailgun/SendGrid-style **multipart** or **JSON** (`from`/`sender`, `subject`, `body-plain`/`text`, `body-html`/`html`, `Message-Id`) → `parseEmail` → append store |
| `GET /api/inbox` | Returns stored items for admin |
| `POST /api/inbound/dev` | Inject a test email without a provider |
| `scripts/dev-send-email.ts` | CLI helper (`npm run dev:send-email`) |
| `.env.example` | `INBOUND_WEBHOOK_SECRET`, `MAIL_PROVIDER=mailgun\|sendgrid\|dev` |

---

## Week 3 — Match + notify + freshness

Offline / demo-safe: still no real push provider, no Mailgun, no auth. Matching uses the single localStorage profile.

### Match

| Piece | Behavior |
|-------|----------|
| `computeMatchPercent` | Soft score (age, gender, metro, kids, modality, type, min pay) |
| `isProfileMatch` | Onboarded + score ≥ 70 + not expired |
| `explainMatch` | Human “why matched” lines on `/studies/[id]` |
| Approve | Runs match against local profile; matching studies get **New match** on `/feed` |

Unread badge on the **Feed** tab (bottom nav) counts unread *matched* notifications. Opening a study or tapping **Clear N new** marks them seen/read.

### Simulated push

1. Turn **Push notifications** on at `/alerts` (default on).
2. Complete onboarding so the profile can match.
3. On `/admin/ingest`, **Approve → feed** a study that fits (e.g. CLC remote UX if prefs allow).
4. Navigate to `/feed` — in-app toast/banner: **“New $X study — ages…”**.
5. Same event is stored under notifications; `/alerts` lists **Recent notifications** (persisted).

If push is off, matching still surfaces **New match** on the feed, but no toast is queued.

### Link health (freshness)

Browser CORS often blocks direct HEAD of firm apply URLs, so checks go through:

`GET /api/check-link?url=<applyUrl>` → server-side `HEAD` (fallback `GET`), returns `{ ok, status, expired, checkedAt }`.

On `/admin/ingest`:

- **Check apply link** — selected email’s published / draft apply URL
- **Check all links** — every published study

Non-2xx (or fetch error) sets `study.expired = true` (+ `linkStatus`, `linkCheckedAt`). Feed/detail show a **Link expired** badge; detail disables the screener CTA.

### Demo steps (Week 3)

1. `npm run dev` → finish onboarding (metro, age ~30–40, push on, study types include UX / focus group).
2. Open `/admin/ingest` → Approve **CLC** (or Fieldwork) invite.
3. Open `/feed` — toast + **New match** badge + Feed tab unread dot.
4. Open study — **Why you matched** list; badge clears when viewed.
5. `/alerts` — see the persisted notification; toggle push off/on.
6. Back on ingest → **Check apply link** / **Check all links** (live network to firm sites; may mark expired if hosts block bots).
7. `npm run build` must pass.

### localStorage keys

- `bay-studies-profile-v1` — user profile (Week 1)
- `bay-studies-published-v1` — approved studies array (may include `expired`, `linkStatus`, `publishedAt`)
- `bay-studies-ingest-v1` — per-email `{ status, publishedStudyId, reviewedAt }`
- `bay-studies-notifications-v1` — recent in-app notifications (Week 3)
- `bay-studies-seen-matches-v1` — study ids whose “New match” was seen
- `bay-studies-pending-toast-v1` — one-shot toast payload after Approve (consumed on `/feed`)

---

## Week 4 — Soft-launch harden

Offline / demo-safe. Still no Mailgun, push provider, or auth.

### Auto-publish path

On [`/admin/ingest`](http://localhost:3000/admin/ingest):

| Rule | Behavior |
|------|----------|
| Confidence ≥ **75%** (0.75) | Show **Auto-publish** button next to manual **Approve → feed** |
| New From domain | Always flagged in the list + detail; Auto-publish disabled until that domain is manually Approved once |
| Global toggle | Header **Auto-publish** checkbox — when on, pending eligible invites publish on load |
| Manual Approve | Always available; first Approve for a domain **trusts** that From domain for future auto-publish |

Helpers: `src/lib/analytics.ts` (`AUTO_PUBLISH_CONFIDENCE_THRESHOLD`, `canAutoPublish`, trusted-domain store).

### Empty states

- Incomplete profile card on `/feed` with Continue setup / Preferences CTAs
- Polished empties for Feed (no matches), Saved, and Applied tabs

### Applied + Saved lists

- `/feed` in-page tabs: **Feed · Saved · Applied** (counts on chips)
- `/me` shows Saved and Applied study rows (deep-link to detail) + activity stats

### How we verify sources

- [`/about/verify`](http://localhost:3000/about/verify) — full trust checklist (`src/data/trustChecklist.ts`)
- Summary + link on `/me`

### Analytics (localStorage)

Counters on `/admin/ingest` footer:

| Counter | When |
|---------|------|
| Publishes | Approve or Auto-publish |
| Opens | Study detail view |
| False rejects | Re-approving a previously rejected invite |

Key: `bay-studies-analytics-v1`. Reset demo clears analytics + trusted domains + auto-publish pref.

### Demo steps (Week 4)

1. `npm run dev` → finish onboarding (metro, age ~30–40, prefs, push on).
2. Open [/admin/ingest](http://localhost:3000/admin/ingest) — every sample shows **New domain**.
3. Select **CLC** (confidence ≥ 75%). **Auto-publish** is disabled while the domain is new. Click **Approve → feed** → Publishes +1; `consumerlearningcenter.com` is now trusted.
4. **Reject** CLC, then click **Auto-publish** (domain still trusted, confidence high) → publishes again without manual Approve. Footer: Publishes increments.
5. **Reject** again, then **Approve → feed** → **False rejects** +1 (re-approve after reject).
6. Open the study from [/feed](http://localhost:3000/feed) → back on ingest, **Opens** +1.
7. Feed tabs: **Saved** (heart on detail) · **Applied** (Open screener). Check lists on [/me](http://localhost:3000/me).
8. [/about/verify](http://localhost:3000/about/verify) — full trust checklist. Incomplete-profile CTA: clear profile on Me, revisit `/feed`.
9. Header **Auto-publish** toggle: after at least one domain is trusted, turn ON to auto-publish other pending high-confidence mail from trusted domains (Approve each new firm once first).
10. `npm run build` must pass.

### localStorage keys (Week 4 adds)

- `bay-studies-analytics-v1` — `{ publishes, opens, falseRejects }`
- `bay-studies-trusted-from-v1` — From domains unlocked by manual Approve
- `bay-studies-auto-publish-v1` — `"1"` when global auto-publish toggle is on

---

## Week 5 — Real inbox wiring (demo-safe)

Still runnable **without** Mailgun/SendGrid API keys. Local inject uses `/api/inbound/dev`.

### Env

Copy `.env.example` → `.env.local` (optional):

```bash
INBOUND_WEBHOOK_SECRET=   # empty = open webhook (local). Set in prod.
MAIL_PROVIDER=dev         # mailgun | sendgrid | dev
```

When `INBOUND_WEBHOOK_SECRET` is set, `POST /api/inbound` requires one of:
`Authorization: Bearer <secret>`, header `X-Inbound-Secret`, or `?secret=`.

### Local demo (curl → admin)

```bash
npm run dev

# Inject a test email (no provider)
curl -s -X POST http://localhost:3000/api/inbound/dev \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Recruiting <invite@consumerlearningcenter.com>",
    "subject": "Paid study: Dev inject UX — $125 / 60 min",
    "text": "Compensation: $125\nDuration: 60 minutes via Zoom\nAges: 30–55\nhttps://www.consumerlearningcenter.com/screener/dev"
  }'

# Confirm store
curl -s http://localhost:3000/api/inbox | head -c 400

# Open admin — should show "Live inbox" (not fixtures)
open http://localhost:3000/admin/ingest
```

Or: `npm run dev:send-email` (requires the dev server).


### Durable inbox (local) + Vercel limits

- Runtime store: `data/inbox.json` (**gitignored**). `data/.gitkeep` keeps the folder in git.
- Local / single-node: file persists across `npm run dev` restarts.
- **Vercel serverless:** filesystem is ephemeral — inbox may vanish between instances/deploys. See **[docs/DEPLOY.md](docs/DEPLOY.md)** § inbox storage.  
  `# TODO: Vercel Blob or Postgres` before real production volume (`src/lib/inboxStore.ts`).

### First firms checklist

Open [/admin/firms](http://localhost:3000/admin/firms) for join URLs + suggested ingest emails for the soft-launch / Bay Area priority panels (CLC, Tasteocracy, Curion, Nichols, Fieldwork, Fleischman, L&E Opinions, Focus Group/Sago, VGM, Google UX, EA), plus stretch sources (Salesforce, PlaytestCloud, User Interviews, Meta AR/VR). Full list: `docs/FIRM_SIGNUP_CHECKLIST.md`.

### Firm preset inject + smoke script

```bash
# Inject one firm sample (no Mailgun)
curl -s -X POST http://localhost:3000/api/inbound/dev \
  -H 'Content-Type: application/json' \
  -d '{"firm":"clc"}'

# Or run all three samples + list inbox (server must be up)
npm run test:inbound
# BASE_URL=http://localhost:3000 bash scripts/test-inbound.sh
```

Presets (15): `clc` · `tasteocracy` · `curion` · `nichols` · `fieldwork` · `fleischman` · `le-opinions` · `focusgroup` · `vgm` · `google-ux` · `ea` · `salesforce` · `playtestcloud` · `user-interviews` · `meta-arvr` (body `firm` or `?firm=`).

### Point Mailgun at a deployed host

Step-by-step (Vercel, env vars, MX, ngrok): **[docs/DEPLOY.md](docs/DEPLOY.md)**. Checklist UI: `/admin/setup`.

1. Deploy the app (Vercel preferred). Note: the JSON file store (`data/inbox.json`) is fine for a single-node/demo host; on serverless it is ephemeral — see DEPLOY.md (TODO: Vercel Blob or Postgres).
2. In Mailgun → **Receiving** → create a route:
   - **Expression:** `match_recipient("studies@yourdomain.com")` (or your catch-all)
   - **Action:** `forward("https://YOUR_DOMAIN/api/inbound?secret=YOUR_INBOUND_WEBHOOK_SECRET")`
3. Set `MAIL_PROVIDER=mailgun` and a strong `INBOUND_WEBHOOK_SECRET` on the host. When the secret is set, unsigned `POST /api/inbound` is rejected (401).
4. Mailgun sends multipart fields (`sender`, `from`, `subject`, `body-plain`, `body-html`, `Message-Id`). The route normalizes them, runs `parseEmail`, and appends to the inbox.
5. Open `/admin/ingest` on the deployed host → **Refresh inbox** → Approve as before.

SendGrid Inbound Parse works the same: point the parse webhook at `POST /api/inbound` (fields `from`, `to`, `subject`, `text`, `html`, `headers`).

### Provider POST shape (JSON example)

```bash
curl -s -X POST http://localhost:3000/api/inbound \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Fieldwork SF <recruiting@fieldwork.com>",
    "subject": "SF Focus Group — $150",
    "body-plain": "Incentive: $150\nLength: 90 minutes\nAges: 25 to 40\nhttps://www.fieldwork.com/join/sf-demo",
    "Message-Id": "<demo-fw@fieldwork.com>"
  }'
```

### Phone polish + Laptop day

- `/admin/setup` and `/admin/firms` — larger tap targets, stacked headers, `break-all` on long URLs/emails for narrow screens.
- `/me` — **Laptop day** card: short deploy + Mailgun steps with links to `/admin/setup` and `/admin/firms`.
- Feed / study cards — clearer **From email** badge (icon + violet ring) on published `pub-*` studies; overflow guards on titles and badge rows.

### Demo checklist

1. `npm run build` passes.
2. `npm run dev` → `npm run test:inbound` (or `curl` POST `/api/inbound/dev` with `{"firm":"clc"}`) → `GET /api/inbox` lists items.
3. `/admin/ingest` shows **Live inbox** with the injected emails; Approve → feed still works.
4. `/admin/firms` — firm join checklist (localStorage check marks).
