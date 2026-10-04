import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  CRAIGSLIST_SOURCE_ID,
  isClinicalText,
  listingToInboxItem,
  type CraigslistListing,
} from "@/lib/craigslist";
import { inboxPath, upsertInboxItem, type InboxItem } from "@/lib/inboxStore";

export const dynamic = "force-dynamic";

/**
 * Admin import for non-email providers (Craigslist etc).
 * Upserts inbox drafts only. Does not publish to the public feed.
 *
 * Auth: ADMIN_SECRET (cookie / Bearer / X-Admin-Secret / query), same as
 * POST /api/published. Open when the secret is unset (local/dev).
 *
 * Body: { items?: InboxItem[] } or { listings?: CraigslistListing[] }
 */
export async function POST(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { items?: InboxItem[]; listings?: CraigslistListing[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body" },
      { status: 400 }
    );
  }

  const incoming: InboxItem[] = [];
  if (Array.isArray(body.items)) incoming.push(...body.items);
  if (Array.isArray(body.listings)) {
    for (const listing of body.listings) {
      if (!listing || typeof listing.postingId !== "number" || !listing.title) {
        return NextResponse.json(
          { ok: false, error: "Each listing needs postingId and title" },
          { status: 400 }
        );
      }
      incoming.push(listingToInboxItem(listing));
    }
  }

  if (incoming.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Body must include items or listings" },
      { status: 400 }
    );
  }

  const stored: { id: string; messageId: string; provider: string }[] = [];
  const rejected: { id?: string; reason: string }[] = [];

  for (const item of incoming) {
    if (!item?.email?.id || !item.email.messageId || !item.draft) {
      rejected.push({ reason: "item missing email.id, messageId, or draft" });
      continue;
    }
    const provider = item.provider || "craigslist";
    if (provider === "mailgun" || provider === "sendgrid") {
      rejected.push({
        id: item.email.id,
        reason: "use POST /api/inbound for email providers",
      });
      continue;
    }
    const hay = `${item.email.subject}\n${item.email.text}\n${item.draft.title ?? ""}`;
    if (isClinicalText(hay)) {
      rejected.push({ id: item.email.id, reason: "clinical trial — not imported" });
      continue;
    }
    if (
      provider === "craigslist" &&
      item.draft.matchedSourceId &&
      item.draft.matchedSourceId !== CRAIGSLIST_SOURCE_ID
    ) {
      rejected.push({ id: item.email.id, reason: "unexpected matchedSourceId" });
      continue;
    }
    const saved = await upsertInboxItem({
      ...item,
      provider,
      draft: {
        ...item.draft,
        fromAllowed: item.draft.fromAllowed ?? true,
        matchedSourceId: item.draft.matchedSourceId ?? CRAIGSLIST_SOURCE_ID,
        confidence: Math.min(42, item.draft.confidence ?? 38),
        warnings: item.draft.warnings ?? [],
        extractedLinks: item.draft.extractedLinks ?? [],
      },
      storedAt: item.storedAt || new Date().toISOString(),
    });
    stored.push({
      id: saved.email.id,
      messageId: saved.email.messageId,
      provider: saved.provider,
    });
  }

  return NextResponse.json({
    ok: true,
    imported: stored.length,
    rejected,
    items: stored,
    store: inboxPath(),
    published: false,
  });
}
