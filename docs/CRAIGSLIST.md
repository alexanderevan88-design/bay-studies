# Craigslist SF Bay jobs → etc

Craigslist **etc** is an inspiration source, not a verified firm. A weekly scrape lands **admin inbox drafts**. Nothing from this path is auto-published.

Human **Approve → feed** in `/admin/ingest` is still required. Approved cards stay `verified: false` and carry a portal note that the source is Craigslist.

## Weekly scrape

```bash
npm run cl:import -- --dry-run --out /tmp/cl-etc.json
npm run cl:import -- --write-inbox
# production inbox (drafts only — not the public feed):
# ADMIN_SECRET=... npm run cl:import -- --post https://bay-studies.vercel.app
```

Search: Craigslist public JSON API, `searchPath=etc`, postal `94103`, 50 miles, Referer `https://sfbay.craigslist.org/`. No browser, no login.

## Default filters

Kept when all of these pass:

- Posted in the last 7 days
- Title looks like a focus group, market research, paid study, or research panel
- Bay metro (`sfc` / `eby` / `pen` / `sby` / `nby` / `scz`, or a Bay location)

Skipped (listed in the script report, not imported):

- **Clinical** — HIV, vaccines, C.diff / Flourish, investigational or phase 1 language. Never imported, even with `--include-out-of-area`.
- **Noise** — dentist “Endo Focus”, teachers, speech pathologists, mechanics
- **Outside Bay metros** — Jamestown / Tuolumne, Sacramento, Auburn, Fresno, and similar. A duplicate Research America panel in Sacramento is dropped when the Bay Area posting shares the same apply link.

`--include-out-of-area` only lifts the geography skip. It does not lift the clinical skip.

## Approve

Drafts use source id `craigslist-sfbay-etc` (`From` `listings@craigslist.org`) so Approve is not blocked by the email allowlist. Confidence is capped at 42, under the auto-publish threshold. The apply link is the first non-Craigslist https URL in the posting.

Open `/admin/ingest`, confirm the firm and link, then **Approve → feed**. Reject anything that still looks like a clinic or a job ad.

## 2026-10-04 soft launch

Three cards were approved onto the public feed (`verified: false`, portal note says Craigslist):

- `pub-cl-7974124959` — SF market research, $400, paidfocusgroupstudies.com
- `pub-cl-7975583982` — Research America Bay Area panel (Sacramento duplicate skipped), pay varies
- `pub-cl-7977416475` — Jamestown / Tuolumne $300 on Oct 27 (outside Bay metros; included only because it was manually approved)

Not published: Bridge HIV duplicates and the Flourish C.diff vaccine study in Walnut Creek.
