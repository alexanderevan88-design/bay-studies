import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  findByMessageId,
  inboxPath,
  readInbox,
  upsertInboxItem,
  type InboxItem,
} from "@/lib/inboxStore";
import { buildParseLog, parseEmail } from "@/lib/parseEmail";

export const dynamic = "force-dynamic";

/**
 * Re-run parseEmail on a stored inbox item and persist draft + parseLog.
 * Use for old Gmail forwards so recoveredFrom / CLC allowlist updates stick.
 *
 * POST body: { emailId?: string, messageId?: string }
 * Requires ADMIN_SECRET (cookie / Bearer / X-Admin-Secret / query) when configured.
 */
export async function POST(request: Request) {
  const auth = verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      emailId?: string;
      messageId?: string;
    };
    const emailId = body.emailId?.trim();
    const messageId = body.messageId?.trim();
    if (!emailId && !messageId) {
      return NextResponse.json(
        { ok: false, error: "Provide emailId or messageId" },
        { status: 400 }
      );
    }

    let item: InboxItem | undefined;
    if (messageId) {
      item = await findByMessageId(messageId);
    }
    if (!item && emailId) {
      const items = await readInbox();
      item = items.find((i) => i.email.id === emailId);
    }
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Inbox item not found" },
        { status: 404 }
      );
    }

    const draft = parseEmail(item.email);
    const parseLog = buildParseLog(item.email, draft);
    const updated: InboxItem = {
      ...item,
      draft,
      parseLog,
      storedAt: item.storedAt,
    };
    await upsertInboxItem(updated);

    return NextResponse.json({
      ok: true,
      item: updated,
      path: inboxPath(),
      recoveredFrom: draft.recoveredFrom ?? null,
      fromAllowed: draft.fromAllowed,
      confidence: draft.confidence,
      matchedSourceId: draft.matchedSourceId ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Re-parse failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
