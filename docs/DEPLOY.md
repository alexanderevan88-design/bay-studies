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

Inbound mail is stored in `data/inbox.json` on the server filesystem (`src/lib/inboxStore.ts`). The file is **gitignored**; `data/.gitkeep` keeps the directory in the repo.

**Vercel / serverless limits**

- Each serverless invocation may run on a **different instance** with an empty or reset filesystem.
- Writes to `data/inbox.json` on Vercel are **ephemeral**: they can disappear between deploys, cold starts, or across concurrent instances. Do **not** treat this store as durable production storage.
- Fine for a soft-launch smoke test (inject a few emails, Approve once). Not fine for real firm volume or multi-user review.

**When you outgrow the JSON file**

```
# TODO: replace data/inbox.json with durable storage before real production volume.
# Preferred options on Vercel:
#   - Vercel Blob (simple object store for JSON / serialized inbox items)
#   - Postgres (Vercel Postgres / Neon / Supabase) — better for query, dedupe by messageId, multi-admin
# Keep the same InboxItem shape in src/lib/inboxStore.ts; swap readInbox / writeInbox / upsertInboxItem.
```

**Hosts with a disk**

- On a **single Node host** (Fly volume, Railway, Render, VPS) with persistent disk, the JSON store is OK for early demo traffic.

---

## 2. Environment variables

Copy from `.env.example`. In Vercel: **Project → Settings → Environment Variables** (Production + Preview as you prefer).

| Variable | Required? | What it does |
|----------|-----------|--------------|
| `INBOUND_WEBHOOK_SECRET` | **Yes in production** | Shared secret. When set (non-empty), `POST /api/inbound` returns **401** unless the request includes the secret (see below). Leave empty only for local demo. |
| `MAIL_PROVIDER` | Recommended | `mailgun` in prod. Use `dev` locally so `/api/inbound/dev` stays open. |
| `ALLOW_INBOUND_DEV` | Optional | Set to `1` only if you intentionally want the open `/api/inbound/dev` injector in production. Keep unset in real prod. |

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
- [ ] `MAIL_PROVIDER=mailgun`
- [ ] Mailgun domain verified (MX / DNS)
- [ ] Mailgun route → `https://YOUR_DOMAIN/api/inbound?secret=…`
- [ ] First firm panel signup uses ingest address `studies@YOUR_DOMAIN` (or whatever you matched in the route)
- [ ] Test email appears under `/admin/ingest` (Live inbox)
- [ ] Approve → feed still works

Also open `GET https://YOUR_DOMAIN/api/inbound` — JSON should show `secretConfigured: true` when the secret is set (it does not reveal the secret).

---

## 7. What humans still must do

The app cannot create your Mailgun account or click Deploy for you. Exact next steps:

1. Deploy to Vercel (or another host) and copy the public HTTPS URL.
2. Create a Mailgun account; add/verify a domain (or use sandbox + ngrok first).
3. Set `INBOUND_WEBHOOK_SECRET` + `MAIL_PROVIDER=mailgun` on the host.
4. Create a Mailgun receiving route forwarding to `/api/inbound` with the secret.
5. Sign up for the first research-firm panel using **that ingest address** as your email.
6. When invites arrive, review/Approve on `/admin/ingest`.

See also [/admin/setup](/admin/setup) after deploy for a visual checklist.
