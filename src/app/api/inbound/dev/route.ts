import { NextResponse } from "next/server";
import {
  FIRM_PRESET_IDS,
  getFirmInboundPreset,
  type FirmPresetId,
} from "@/data/firms";
import {
  normalizeInboundPayload,
  normalizedToRawEmail,
} from "@/lib/inboundPayload";
import { upsertInboxItem } from "@/lib/inboxStore";
import { buildParseLog, parseEmail } from "@/lib/parseEmail";

export const dynamic = "force-dynamic";

/**
 * Dev-only injector — no provider webhook needed.
 * POST JSON: { from, subject, text?, html?, messageId?, to?, firm? }
 * Optional firm preset: any of FIRM_PRESET_IDS (15 FIRST+STRETCH firms)
 *   (also accepted as ?firm= query). Preset fills defaults; body fields override.
 * Disabled when MAIL_PROVIDER is mailgun|sendgrid AND NODE_ENV=production
 * (unless ALLOW_INBOUND_DEV=1).
 */
function devAllowed(): boolean {
  if (process.env.ALLOW_INBOUND_DEV === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  const provider = (process.env.MAIL_PROVIDER ?? "dev").toLowerCase();
  return provider === "dev";
}

const DEFAULT_DEV_EMAIL = {
  from: "Recruiting <invite@consumerlearningcenter.com>",
  to: "ingest@baystudies.local",
  subject: "Dev inject: Remote UX interview — $130 / 55 min",
  text: `Hi (dev inject),

We're recruiting Bay Area residents for a remote UX interview.

Compensation: $130
Duration: about 55 minutes via Zoom
Ages: 28–55
Location: Remote (SF Bay Area)

Apply:
https://www.consumerlearningcenter.com/screener/dev-inject

— CLC Recruiting (dev)
`,
};

function resolveFirmKey(
  body: Record<string, unknown>,
  url: URL
): string | undefined {
  const q = url.searchParams.get("firm") ?? url.searchParams.get("preset");
  if (q && q.trim()) return q.trim().toLowerCase();
  for (const key of ["firm", "preset", "firmId"] as const) {
    const v = body[key];
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase();
  }
  return undefined;
}

export async function POST(request: Request) {
  if (!devAllowed()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Dev inbound disabled in production with MAIL_PROVIDER≠dev. Set ALLOW_INBOUND_DEV=1 to override.",
      },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  let body: Record<string, unknown> = {};
  try {
    const json = await request.json();
    if (json && typeof json === "object" && !Array.isArray(json)) {
      body = json as Record<string, unknown>;
    }
  } catch {
    // empty body → use default or firm preset
  }

  const firmKey = resolveFirmKey(body, url);
  const firmPreset = firmKey ? getFirmInboundPreset(firmKey) : undefined;

  if (firmKey && !firmPreset) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown firm preset "${firmKey}". Use one of: ${FIRM_PRESET_IDS.join(", ")}`,
        presets: FIRM_PRESET_IDS,
      },
      { status: 400 }
    );
  }

  const base = firmPreset
    ? {
        from: firmPreset.from,
        to: firmPreset.to,
        subject: firmPreset.subject,
        text: firmPreset.text,
      }
    : DEFAULT_DEV_EMAIL;

  const merged = {
    ...base,
    ...body,
    "body-plain":
      (typeof body.text === "string" && body.text) ||
      (typeof body["body-plain"] === "string" && body["body-plain"]) ||
      base.text,
    "Message-Id":
      (typeof body.messageId === "string" && body.messageId) ||
      (typeof body["Message-Id"] === "string" && body["Message-Id"]) ||
      `<dev-${firmPreset?.id ?? "inject"}-${Date.now()}@baystudies.local>`,
  };

  // Drop control keys so they don't pollute normalize
  delete (merged as Record<string, unknown>).firm;
  delete (merged as Record<string, unknown>).preset;
  delete (merged as Record<string, unknown>).firmId;

  const normalized = normalizeInboundPayload(merged, "dev");
  const email = normalizedToRawEmail(normalized);
  const draft = parseEmail(email);
  const parseLog = buildParseLog(email, draft);

  const item = await upsertInboxItem({
    email,
    draft,
    parseLog,
    provider: "dev",
    storedAt: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      ok: true,
      demo: true,
      id: item.email.id,
      messageId: item.email.messageId,
      confidence: draft.confidence,
      fromAllowed: draft.fromAllowed,
      subject: email.subject,
      firm: (firmPreset?.id as FirmPresetId | undefined) ?? null,
      admin: "/admin/ingest",
    },
    { status: 201 }
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    demo: true,
    allowed: devAllowed(),
    message:
      "POST JSON { from, subject, text } or { firm: \"clc\"|\"tasteocracy\"|\"curion\"|\"nichols\"|\"fieldwork\" } to inject a test email into data/inbox.json without Mailgun/SendGrid. Query ?firm= also works.",
    presets: FIRM_PRESET_IDS,
    example: DEFAULT_DEV_EMAIL,
    exampleFirm: { firm: "clc" },
  });
}
