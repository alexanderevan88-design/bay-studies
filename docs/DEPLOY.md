# Deploy Bay Studies + real Mailgun inbound

This guide gets the Next.js app on a public URL and wires Mailgun so firm panel emails land in `/admin/ingest`.

**Local first:** you do **not** need Vercel or Mailgun to demo. `npm run dev` + 15 sample emails on `/admin/ingest` (or `POST /api/inbound/dev` with a `firm` preset) is enough. Use this doc on laptop day when you want a public ingest address.

**You** create the Mailgun account, buy/point the domain, and click Deploy. This repo only provides the webhook endpoint and checklist UI.

---

## 1. Preferred host: Vercel (Next.js)

Bay Studies is a Next.js 14 App Router app. **Vercel** is the simplest path.

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected). Root directory: repo root (or `bay-studies` if the app lives in a subfolder).
4. **Do not** put secrets in the repo. Set env vars in the Vercel project UI (see below).
5. Click **Deploy**. Note your URL, e.g. `https://bay-studies.vercel.app` or a custom domain.

### Other hosts (also fine)

| Host | Notes |
|------|--------|
| **Fly.io / Railway / Render** | Use a long-running Node process (`npm run build && npm start`). File-based inbox (`data/inbox.json`) works better on a single persistent disk than on pure serverless. |
| **Docker / VPS** | Same: build + `next start` behind HTTPS (Caddy/nginx). |

### Important: inbox storage on serverless (persistence limits)

Inbound mail is stored via `src/lib/inboxStore.ts`:

| Mode | When | Path / key |
|------|------|------------|
| **Vercel Blob** (preferred on Vercel) | `BLOB_READ_WRITE_TOKEN` is set | Blob pathname `inbox/bay-studies-inbox.json` |
| Ephemeral file | Vercel without Blob token | `/tmp/bay-studies-inbox.json` |
| Local file | Laptop / single-disk host | `data/inbox.json` (gitignored; `data/.gitkeep` keeps the dir) |

**Without Blob on Vercel**

- Each serverless invocation may run on a **different instance** with an empty or reset filesystem.
- `/tmp` writes are **ephemeral**: mail can vanish on cold starts, deploys, or across concurrent instances.
- Soft-launch still works without Blob (inject a few emails, Approve once). Expect lost mail under load.

**Enable Vercel Blob (recommended before real firm volume)**

1. In the Vercel dashboard: open the **bay-studies** project → **Storage** → **Create** → **Blob**.
2. Choose **Private** access (inbox JSON must not be public). Connect the store to **Production** (and Preview if you want).
3. Vercel adds `BLOB_READ_WRITE_TOKEN` to the project env automatically. Redeploy so the runtime picks it up.
4. Or from a linked CLI (already logged in as the project owner):

```bash
vercel blob create-store bay-studies-inbox --access private --yes --environment production
vercel --prod
```

5. Confirm: after deploy, inbound mail should survive cold starts. `inboxPath()` reports `blob:inbox/bay-studies-inbox.json` when the token is present.

### Published feed cache (Blob + fallback)

Public `GET /api/published` is layered so friend traffic stays cheap even on Hobby:

| Layer | What | TTL / behavior |
|------|------|----------------|
| **Instance memory** | Warm serverless process | ~45s — no Blob ops |
| **Vercel CDN** | `s-maxage=45, stale-while-revalidate=30` on the route | Friend hits rarely invoke the function |
| **Vercel Blob CDN** | `get("inbox/bay-studies-published.json")` with `cacheControlMaxAge=1d` | Origin miss ~daily when healthy |
| **File + bundled fallback** | `/tmp` (ephemeral) then `data/published-fallback.json` | Used when Blob is down; **5 minute** probe backoff |

**Approve / patch / remove** still try Blob first. On success or failure they also write the file store and best-effort sync `data/published-fallback.json` (works on laptop/CI; read-only on Vercel). Responses include `source` and `blobStatus` (`ok` / `suspended` / `error` / `disabled`).

**If Storage shows the store as Suspended** (`limits-exceeded-suspended`):

1. Production keeps serving the feed from memory → CDN → bundled fallback (no 500s).
2. New Approves on Vercel alone may not survive cold starts until Blob works again **or** you redeploy with an updated `data/published-fallback.json`.
3. In the Vercel dashboard: **Project → Storage → bay-studies-inbox** — unsuspend / clear the limit, or upgrade the Blob plan if Hobby ops are exhausted. Exact billing/upsell copy is in the Vercel UI (do not guess limits here).
4. Confirm with: `npx vercel blob list-stores` (Status should leave Suspended) and `curl -s https://YOUR_DOMAIN/api/published | jq .blobStatus`.

**When you outgrow a single JSON blob**

```
# TODO: Postgres (Vercel Postgres / Neon / Supabase) for query, dedupe by messageId, multi-admin.
# Keep the same InboxItem shape; swap readInbox / writeInbox / upsertInboxItem.
```

**Hosts with a disk**

- On a **single Node host** (Fly volume, Railway, Render, VPS) with persistent disk, the local JSON store is OK for early demo traffic (leave `BLOB_READ_WRITE_TOKEN` unset).

---

### Automatic expiry

Studies hide themselves once their dates pass (read-time date math, no
redeploy, nothing deleted). Rules and the `expiresAt` override: see
[EXPIRY.md](./EXPIRY.md).

## 2. Environment variables

Copy from `.env.example`. In Vercel: **Project → Settings → Environment Variables** (Production + Preview as you prefer).

| Variable | Required? | What it does |
|----------|-----------|--------------|
| `INBOUND_WEBHOOK_SECRET` | **Yes in production** | Shared secret. When set (non-empty), `POST /api/inbound` returns **401** unless the request includes the secret (see below). Leave empty only for local demo. |
| `MAIL_PROVIDER` | Recommended | `mailgun` in prod. Use `dev` locally so `/api/inbound/dev` stays open. |
| `ALLOW_INBOUND_DEV` | Optional | Set to `1` only if you intentionally want the open `/api/inbound/dev` injector in production. Keep unset in real prod. |
| `BLOB_READ_WRITE_TOKEN` | Recommended on Vercel | When set, inbox persists to Vercel Blob (`inbox/bay-studies-inbox.json`) instead of ephemeral `/tmp`. Created automatically when you add a Blob store in the Vercel UI / CLI. Soft-launch works without it; mail can vanish on cold starts. |
| `ADMIN_SECRET` | **Yes in production** | Shared secret for `/admin/*` (ingest, firms, setup). When set, middleware redirects unauthenticated browsers to `/admin/login`. Leave empty only for local/dev (amber warning banner). Soft-launch: not OAuth. |

### How the secret is sent

When `INBOUND_WEBHOOK_SECRET` is set, the webhook accepts **any one** of:

1. Header: `Authorization: Bearer <secret>`
2. Header: `X-Inbound-Secret: <secret>`
3. Query: `https://YOUR_DOMAIN/api/inbound?secret=<secret>`

Mailgun **Receiving → Routes** usually use a forward URL, so the easiest prod pattern is the **query param** on the route action.

Unsigned / wrong-secret requests are rejected with `401` and `{ "ok": false, "error": "Unauthorized — invalid or missing webhook secret" }`.

Generate a strong secret, e.g.:

```bash
openssl rand -hex 32
```

---

## 2b. Admin UI gate (`ADMIN_SECRET`)

Soft-launch protection for `/admin/ingest`, `/admin/firms`, and `/admin/setup` (not OAuth).

1. Generate: `openssl rand -hex 32`
2. Set on Vercel **Production** (and Preview if you want):

```bash
printf '%s' 'YOUR_SECRET' | vercel env add ADMIN_SECRET production --project bay-studies
# or: vercel env add ADMIN_SECRET production
```

3. Redeploy so middleware picks it up: `vercel --prod`

**When `ADMIN_SECRET` is set**, unauthenticated visits to `/admin/*` redirect to `/admin/login`. Auth via any one of:

1. Password form on `/admin/login` → httpOnly cookie `bay_studies_admin`
2. Header: `Authorization: Bearer <secret>`
3. Header: `X-Admin-Secret: <secret>`
4. Query once: `https://YOUR_DOMAIN/admin/ingest?admin_secret=<secret>` (sets cookie, strips query)

**When unset/empty** (local/dev): admin pages stay open and show an amber **ADMIN_SECRET unset** banner. Do not ship Production without the secret.

Sign out: use **Sign out** in the admin chrome (clears the cookie) or `POST /api/admin/logout`.

### Mutating APIs (same `ADMIN_SECRET`)

When `ADMIN_SECRET` is set, these writes require the same auth as `/admin` (cookie from login, Bearer, `X-Admin-Secret`, or query). Same-origin browser calls from `/admin/ingest` send the httpOnly cookie automatically (`credentials: "same-origin"`).

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/published` | **Public** (feed) |
| POST / PATCH / DELETE | `/api/published` | Admin |
| GET | `/api/inbox` | **Public** (admin UI reads; soft-launch) |
| POST | `/api/inbox/reparse` | Admin |
| POST | `/api/inbox/import` | Admin — Craigslist etc drafts only (does not publish) |
| POST | `/api/inbound` | **Mailgun webhook** (`INBOUND_WEBHOOK_SECRET`, not admin) |
| POST | `/api/inbound/dev` | Dev gate only (`ALLOW_INBOUND_DEV` / `MAIL_PROVIDER`) |

Unauthenticated mutating calls return `401` `{ "ok": false, "error": "Unauthorized — …" }`. When `ADMIN_SECRET` is unset, writes stay open (local/dev).

Quick check after deploy:

```bash
# should 401 when ADMIN_SECRET is set
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://YOUR_DOMAIN/api/published \
  -H 'Content-Type: application/json' -d '{"study":{"id":"x"}}'

# logged-in Approve/Reject/reparse in /admin/ingest still works via cookie
```

---

## 3. Point Mailgun inbound at your app

1. Create a [Mailgun](https://www.mailgun.com/) account (you do this — not automated by the app).
2. Add and verify a domain (your own domain, or a Mailgun sandbox domain for testing).
3. Open **Receiving** → **Create Route** (wording may vary slightly):
   - **Expression:** match the address you will give firms, e.g.  
     `match_recipient("studies@YOUR_DOMAIN")`  
     or a catch-all: `catch_all()`
   - **Action:** forward (HTTP) to:  
     `https://YOUR_DOMAIN/api/inbound?secret=YOUR_INBOUND_WEBHOOK_SECRET`  
     (or omit `?secret=` and use another supported auth method if your route UI allows custom headers).
4. Set host env: `MAIL_PROVIDER=mailgun` and the same `INBOUND_WEBHOOK_SECRET`.
5. Send a test message to that recipient → open `/admin/ingest` → **Refresh inbox**.

Mailgun posts multipart fields (`sender` / `from`, `subject`, `body-plain`, `body-html`, `Message-Id`, etc.). The app normalizes them in `src/lib/inboundPayload.ts` and runs `parseEmail`.

**SendGrid Inbound Parse** can use the same `POST /api/inbound` URL if you prefer that provider later.

---

## 4. Domain + MX (plain language)

Email for `studies@YOUR_DOMAIN` only arrives if the **internet’s mail servers know where to deliver it**.

1. **Buy a domain** (Namecheap, Google Domains / Squarespace, Cloudflare Registrar, etc.) — or use a subdomain you already control.
2. In Mailgun, add that domain and follow their DNS checklist. You will paste records at your DNS host:
   - **MX** — “where inbound mail for this domain should go” (Mailgun’s MX hosts).
   - Often also **TXT** (SPF / domain verification) and sometimes DKIM for *sending*; for *receiving* into a webhook, MX + Mailgun’s verify step matter most.
3. DNS can take minutes to hours to propagate. Mailgun’s UI shows when the domain is verified.
4. Point your **website** (A/CNAME) at Vercel (or your host) separately from MX. Website DNS and mail DNS can share one domain safely if you follow each provider’s records.

Until MX points at Mailgun, panel firms can email `studies@…` all day and nothing will hit `/api/inbound`.

---

## 5. Local tunnel (ngrok) — test before buying a domain

You can prove the webhook before DNS or a custom domain:

1. Terminal A: `npm run dev` (http://localhost:3000).
2. Terminal B: [ngrok](https://ngrok.com/) (or Cloudflare Tunnel):  
   `ngrok http 3000`  
   Copy the HTTPS URL, e.g. `https://abc123.ngrok-free.app`.
3. In Mailgun, create a route that forwards to:  
   `https://abc123.ngrok-free.app/api/inbound?secret=YOUR_SECRET`  
   (set `INBOUND_WEBHOOK_SECRET` in `.env.local` to match).
4. For Mailgun sandbox, you often must authorize the sender address first.
5. Send a test → watch the Next.js terminal → `/admin/ingest` → Refresh inbox.

When you buy a real domain later, swap the route URL to `https://YOUR_DOMAIN/api/inbound?secret=…` and set the same env vars on Vercel.

---

## 6. Soft-launch checklist

Use the in-app page **[/admin/setup](/admin/setup)** or this list:

- [ ] App deployed on HTTPS (`YOUR_DOMAIN`)
- [ ] `INBOUND_WEBHOOK_SECRET` set on the host (non-empty)
- [ ] `ADMIN_SECRET` set on Production (non-empty) — `/admin/*` redirects to login
- [ ] `MAIL_PROVIDER=mailgun`
- [ ] Mailgun domain verified (MX / DNS)
- [ ] Mailgun route → `https://YOUR_DOMAIN/api/inbound?secret=…`
- [ ] First firm panel signup uses ingest address `studies@YOUR_DOMAIN` (or whatever you matched in the route)
- [ ] Test email appears under `/admin/ingest` (Live inbox)
- [ ] Approve → feed still works
- [ ] Enrich form used for thin/tip emails before Approve
- [ ] (Recommended) Vercel Blob store connected + `BLOB_READ_WRITE_TOKEN` set so inbox survives cold starts

Also open `GET https://YOUR_DOMAIN/api/inbound` — JSON should show `secretConfigured: true` when the secret is set (it does not reveal the secret).

---

---

## Enrich before Approve (/admin/ingest)

Pending inbox items show an **Enrich before Approve** form (title, firm, who/what, pay, duration, location/modality, screener URL, optional portal note). **Approve → feed** publishes the edited values, not the raw parser draft alone. Tip-style emails (low confidence, no pay, dashboard-only links like `my.theclc.com`) show a gentle hint to add a title + screener/portal link first. Reject is unchanged. Feed cards then surface title, firm, a short who/what snippet, pay/duration when set, and an **Open screener** / **View at firm** CTA.

## 7. What humans still must do

The app cannot create your Mailgun account or click Deploy for you. Exact next steps:

1. Deploy to Vercel (or another host) and copy the public HTTPS URL.
2. Create a Mailgun account; add/verify a domain (or use sandbox + ngrok first).
3. Set `INBOUND_WEBHOOK_SECRET` + `MAIL_PROVIDER=mailgun` on the host.
4. Create a Mailgun receiving route forwarding to `/api/inbound` with the secret.
5. Sign up for the first research-firm panel using **that ingest address** as your email.
6. When invites arrive, review/Approve on `/admin/ingest`.

See also [/admin/setup](/admin/setup) after deploy for a visual checklist.
