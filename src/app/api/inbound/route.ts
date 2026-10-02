import { NextResponse } from "next/server";
import {
  formDataToObject,
  normalizeInboundPayload,
  normalizedToRawEmail,
  verifyInboundSecret,
} from "@/lib/inboundPayload";
import { upsertInboxItem, findByMessageId } from "@/lib/inboxStore";
import { buildParseLog, parseEmail } from "@/lib/parseEmail";

export const dynamic = "force-dynamic";

/**
 * Inbound email webhook — Mailgun / SendGrid-style multipart or JSON.
 *
 * Accepts fields: from/sender, subject, body-plain|text, body-html|html, Message-Id
 * Parses with parseEmail, appends to data/inbox.json, visible via GET /api/inbox.
 *
 * Auth: when INBOUND_WEBHOOK_SECRET is set (non-empty), unsigned requests are
 * rejected with 401. Send Bearer / X-Inbound-Secret / ?secret= (Mailgun routes
 * usually append ?secret= on the forward URL). Empty secret = open (local demo).
 * MAIL_PROVIDER=mailgun|sendgrid|dev (hint only; field detection is flexible)
 */
export async function POST(request: Request) {
  const auth = verifyInboundSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  let fields: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      fields = formDataToObject(form);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      fields =
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
    } else {
      // Try form first, then JSON
      try {
        const form = await request.formData();
        fields = formDataToObject(form);
      } catch {
        try {
          const body = await request.json();
          if (body && typeof body === "object") {
            fields = body as Record<string, unknown>;
          }
        } catch {
          return NextResponse.json(
            { ok: false, error: "Expected multipart/form-data or JSON body" },
            { status: 400 }
          );
        }
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to parse body";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const normalized = normalizeInboundPayload(
    fields,
    process.env.MAIL_PROVIDER
  );

  if (!normalized.text && !normalized.html) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing body — send body-plain / text (and optionally body-html / html)",
      },
      { status: 400 }
    );
  }

  const existing = await findByMessageId(normalized.messageId);
  const email = normalizedToRawEmail(normalized, existing?.email.id);
  const draft = parseEmail(email);
  const parseLog = buildParseLog(email, draft);

  const item = await upsertInboxItem({
    email,
    draft,
    parseLog,
    provider: normalized.provider,
    storedAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      id: item.email.id,
      messageId: item.email.messageId,
      provider: item.provider,
      fromAllowed: draft.fromAllowed,
      confidence: draft.confidence,
      subject: email.subject,
      duplicate: Boolean(existing),
    },
    { status: existing ? 200 : 201 }
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST Mailgun/SendGrid-style inbound here (multipart or JSON). List stored mail via GET /api/inbox. Local demo: POST /api/inbound/dev",
    env: {
      mailProvider: process.env.MAIL_PROVIDER ?? "dev",
      secretConfigured: Boolean(process.env.INBOUND_WEBHOOK_SECRET?.trim()),
    },
  });
}
