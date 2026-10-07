/**
 * Craigslist SF Bay jobs → etc → admin inbox drafts.
 *
 * Does NOT publish to the public feed. Approve still happens in /admin/ingest.
 *
 *   npx tsx scripts/craigslist-etc-import.ts --dry-run --out /tmp/cl-import.json
 *   npx tsx scripts/craigslist-etc-import.ts --write-inbox
 *   ADMIN_SECRET=... npx tsx scripts/craigslist-etc-import.ts --post https://bay-studies.vercel.app
 *
 * Default filters: last 7 days, focus group / market research / paid study,
 * Bay metros only. Skips clinical (HIV, vaccine, C.diff) and noise
 * (dentist Endo Focus, teachers). Out-of-area (Jamestown, Sacramento, …)
 * is skipped unless --include-out-of-area.
 *
 * Also skips (warns in the report) when the apply URL is already on a
 * different published study, or normalized title + pay is already on the feed.
 */
import { promises as fs } from "fs";
import path from "path";
import {
  isClinicalText,
  listingToDraft,
  listingToInboxItem,
  scrapeBayEtc,
  type CraigslistListing,
  type CraigslistSkip,
} from "../src/lib/craigslist";
import { craigslistFeedSkipReason } from "../src/lib/nearDuplicate";
import type { InboxItem } from "../src/lib/inboxStore";
import type { Study } from "../src/lib/types";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return undefined;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

async function upsertFile(file: string, items: InboxItem[]): Promise<number> {
  let existing: InboxItem[] = [];
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as InboxItem[];
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  for (const item of items) {
    const idx = existing.findIndex(
      (i) =>
        i.email.id === item.email.id || i.email.messageId === item.email.messageId
    );
    if (idx >= 0) existing[idx] = item;
    else existing.unshift(item);
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(existing, null, 2) + "\n", "utf8");
  return existing.length;
}

async function loadEnriched(file: string, includeOutOfArea: boolean): Promise<{
  kept: CraigslistListing[];
  skipped: CraigslistSkip[];
}> {
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Array<{
    posting_id: number;
    posted: number;
    title: string;
    url: string;
    subarea?: string;
    location?: string;
    body?: string;
    pay?: number | null;
    links?: string[];
  }>;
  const { isBayListing, pickExternalApplyUrl } = await import("../src/lib/craigslist");
  const kept: CraigslistListing[] = [];
  const skipped: CraigslistSkip[] = [];
  const seenApply = new Set<string>();
  const rows = [...raw].sort((a, b) => {
    const bay = (r: typeof a) =>
      isBayListing({ subarea: r.subarea, location: r.location, title: r.title, body: r.body })
        ? 0
        : 1;
    return bay(a) - bay(b);
  });
  for (const row of rows) {
    const listing: CraigslistListing = {
      postingId: row.posting_id,
      postedEpoch: row.posted,
      title: row.title,
      url: row.url,
      subarea: row.subarea ?? "",
      location: row.location ?? "",
      price: null,
      body: row.body ?? "",
      links: row.links ?? [],
      pay: row.pay ?? undefined,
      applyUrl: pickExternalApplyUrl(row.links ?? []),
    };
    const hay = `${listing.title}\n${listing.body}`;
    if (isClinicalText(hay)) {
      skipped.push({
        postingId: listing.postingId,
        title: listing.title,
        reason: "clinical — skipped",
      });
      continue;
    }
    if (!includeOutOfArea && !isBayListing(listing)) {
      skipped.push({
        postingId: listing.postingId,
        title: listing.title,
        reason: `outside Bay metros (${listing.location || "unknown"})`,
      });
      continue;
    }
    const key = (listing.applyUrl ?? "").replace(/\/+$/, "").toLowerCase();
    if (key && seenApply.has(key)) {
      skipped.push({
        postingId: listing.postingId,
        title: listing.title,
        reason: "duplicate apply link",
      });
      continue;
    }
    if (key) seenApply.add(key);
    kept.push(listing);
  }
  return { kept, skipped };
}


async function loadPublishedFeed(postHost?: string): Promise<{
  studies: Study[];
  source: string;
}> {
  const hosts: string[] = [];
  if (postHost) hosts.push(postHost.replace(/\/$/, ""));
  const prod = "https://bay-studies.vercel.app";
  if (!hosts.includes(prod)) hosts.push(prod);
  for (const host of hosts) {
    try {
      const res = await fetch(`${host}/api/published`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const json = (await res.json()) as { ok?: boolean; studies?: Study[] };
      if (res.ok && json.ok && Array.isArray(json.studies)) {
        return { studies: json.studies, source: host };
      }
    } catch (err) {
      console.error(
        `[cl-import] published feed ${host} failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  for (const file of ["data/published.json", "data/published-fallback.json"]) {
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(process.cwd(), file), "utf8")
      ) as Study[];
      if (Array.isArray(raw) && raw.length > 0) {
        return { studies: raw, source: file };
      }
    } catch {
      /* try the next snapshot */
    }
  }
  return { studies: [], source: "none" };
}

function skipAlreadyOnFeed(
  listings: CraigslistListing[],
  studies: Study[]
): { kept: CraigslistListing[]; skipped: CraigslistSkip[] } {
  if (studies.length === 0) return { kept: listings, skipped: [] };
  const kept: CraigslistListing[] = [];
  const skipped: CraigslistSkip[] = [];
  for (const listing of listings) {
    const draft = listingToDraft(listing);
    const reason = craigslistFeedSkipReason(
      {
        id: `pub-cl-${listing.postingId}`,
        title: draft.title ?? listing.title,
        pay: draft.pay,
        payLabel: draft.payLabel,
        metro: draft.metro,
        applyUrl: draft.applyUrl || listing.url,
      },
      studies
    );
    if (reason) {
      skipped.push({
        postingId: listing.postingId,
        title: listing.title,
        reason,
      });
      continue;
    }
    kept.push(listing);
  }
  return { kept, skipped };
}

async function main() {
  const dry = has("--dry-run") || (!has("--write-inbox") && !has("--post"));
  const includeOutOfArea = has("--include-out-of-area");
  const enriched = arg("--from-enriched");
  const scraped = enriched
    ? await loadEnriched(enriched, includeOutOfArea)
    : await scrapeBayEtc({ includeOutOfArea });

  const post = arg("--post");
  const feed = await loadPublishedFeed(post);
  if (feed.studies.length === 0) {
    console.error(
      "[cl-import] no published feed loaded — apply-URL / title+pay skip not applied"
    );
  } else {
    console.error(
      `[cl-import] comparing to ${feed.studies.length} published studies (${feed.source})`
    );
  }
  const againstFeed = skipAlreadyOnFeed(scraped.kept, feed.studies);
  const skipped = [...scraped.skipped, ...againstFeed.skipped];
  const items = againstFeed.kept.map((listing) => listingToInboxItem(listing));
  const report = {
    dryRun: dry && !has("--write-inbox") && !has("--post"),
    publishedFeed: { source: feed.source, count: feed.studies.length },
    kept: againstFeed.kept.map((l) => ({
      id: `cl-${l.postingId}`,
      title: l.title,
      url: l.url,
      applyUrl: l.applyUrl ?? null,
      pay: l.pay ?? null,
      location: l.location,
    })),
    skipped,
    published: false,
  };

  const out = arg("--out");
  if (out) {
    await fs.writeFile(out, JSON.stringify({ ...report, items }, null, 2) + "\n");
    console.log(`wrote ${out}`);
  }

  if (has("--write-inbox")) {
    const file = arg("--inbox") ?? path.join(process.cwd(), "data", "inbox.json");
    const n = await upsertFile(file, items);
    console.log(`inbox ${file} now ${n} items (upserted ${items.length})`);
  }

  if (post) {
    const secret = process.env.ADMIN_SECRET?.trim();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(`${post.replace(/\/$/, "")}/api/inbox/import`, {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
    if (!res.ok || !json.ok) process.exit(1);
  }

  console.log(JSON.stringify(report, null, 2));
  if (items.length === 0) {
    console.log("No listings kept. Clinical and out-of-area stays in skipped.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
