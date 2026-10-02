import { NextResponse } from "next/server";
import { readInbox } from "@/lib/inboxStore";

export const dynamic = "force-dynamic";

/**
 * Admin list of server-stored inbound emails (data/inbox.json).
 * Used by /admin/ingest — falls back to fixtures when empty.
 */
export async function GET() {
  try {
    const items = await readInbox();
    return NextResponse.json({
      ok: true,
      source: "live",
      count: items.length,
      items,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read inbox";
    return NextResponse.json(
      { ok: false, source: "error", count: 0, items: [], error: message },
      { status: 500 }
    );
  }
}
