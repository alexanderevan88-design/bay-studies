# Study expiry (automatic)

Studies disappear from the feed on their own once they're over, so friends
don't sign up for dead studies. **Nothing is deleted**: expired studies stay in
`data/published-fallback.json` (and the Blob store); they're only hidden.

All logic lives in `src/lib/expiry.ts` and runs at **read time** (in
`GET /api/published` and again in the browser), so a study closes on time
without a redeploy. The API's edge cache is 45 seconds, well under an hour.

## When a study closes

Checked in this order. "End of day" means the study is hidden from 00:00
Pacific time on the following day.

1. **`expiresAt` override** (optional field on the study) always wins.
   - `"2026-10-20"` → closes at the end of Oct 20 PT.
   - `"2026-10-20T17:00:00-07:00"` (any full ISO timestamp) → closes at that moment.
2. **Multi-week at-home studies** (remote, plus a length in weeks/days or a
   `when` that starts with "Starting"/"Starts"/"From"): close at the end of the
   **start** day, because sign-ups stop before the study begins.
   If only an end date is given ("until Oct 30"), the end date is used.
3. **Studies with session dates** (`when` like "Oct 13 & 16", "Wednesday,
   October 14th or Thursday, October 15th", "02-Nov-2026"): close at the end
   of the **last** session day.
4. **No usable date** ("See screener", "Ongoing", month only like
   "November"): close at the end of the day **10 days after `publishedAt`**.

Dates come from `when`. If `when` has none, the description is scanned
(forwarded-email header lines like `Date: Sun, Oct 4` are ignored); those are
marked as guesses. A date without a year takes the year that puts it nearest to,
or after, the publish date.

## Setting an override

Add `expiresAt` to the study in `data/published-fallback.json` (then redeploy,
since the Blob store is suspended), or PATCH it as admin:

```json
{ "id": "pub-cl-7975583982", "patch": { "expiresAt": "2026-10-31" } }
```

To keep a study up longer than its parsed date, set a later `expiresAt`.
To bring an expired study back, set `expiresAt` in the future.

## What people see

- **Feed / counts / filter chips**: closed studies are excluded.
- **Closing soon** tag (orange tint with a clock) when a study closes within
  48 hours, on cards and the detail page.
- **Fresh today** tag (solid orange, white dot) on studies published today,
  Pacific time. They sort first in the default feed order.
- Tag priority, one per card: **Closing soon > Fresh today > New** (New =
  published in the last 3 days, or a new profile match).
- **Closed detail URL** (`/studies/<id>`) shows "This study has closed" with a
  link back to the feed, not a 404.
- **Saved**: closed saved studies show greyed in a "Closed" group with a Remove button.

## API

`GET /api/published` returns live studies only, plus:

- `liveCount`, `closedCount`
- `closed`: `[{ id, title, firm, closedAt }]` (enough for Saved and the closed page)
- `expiry`: `{ [id]: { closesAt, basis, guessed } }`, where basis is one of
  `override | last-session | start-date | end-date | fallback-10d | none`

`GET /api/published?include=closed` returns every study. Admin ingest and
`scripts/craigslist-etc-import.ts` use it so dedupe still sees closed posts.

`publishedAt` is set on every ingest path: `draftToStudy` covers Gmail and
Craigslist (both go through the inbox and Approve), and `upsertPublished`
fills it in server-side if it's ever missing.

The existing `expired` flag is different: it means the link check found a dead
apply link.
