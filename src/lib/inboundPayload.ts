import type { RawEmail } from "./types";

export type MailProvider = "mailgun" | "sendgrid" | "dev" | "unknown";

export interface NormalizedInbound {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
  provider: MailProvider;
}

function firstString(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    // formData-style: sometimes arrays
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
      return v[0].trim();
    }
  }
  return undefined;
}

function extractMessageIdFromHeaders(headers: string | undefined): string | undefined {
  if (!headers) return undefined;
  const m = headers.match(/^message-id:\s*(.+)$/im);
  return m?.[1]?.trim();
}

/** Map Mailgun / SendGrid / generic JSON or form fields → normalized inbound. */
export function normalizeInboundPayload(
  fields: Record<string, unknown>,
  preferredProvider?: string | null
): NormalizedInbound {
  const from =
    firstString(fields, ["from", "sender", "From", "Sender"]) ??
    "unknown@example.com";
  const to =
    firstString(fields, ["to", "recipient", "To", "Recipient"]) ??
    "ingest@baystudies.local";
  const subject =
    firstString(fields, ["subject", "Subject"]) ?? "(no subject)";
  const text =
    firstString(fields, [
      "body-plain",
      "stripped-text",
      "text",
      "plain",
      "body",
      "TextBody",
    ]) ?? "";
  const html = firstString(fields, [
    "body-html",
    "stripped-html",
    "html",
    "HtmlBody",
  ]);
  const headers = firstString(fields, ["headers", "message-headers"]);
  const messageId =
    firstString(fields, [
      "Message-Id",
      "Message-ID",
      "message-id",
      "messageId",
      "MessageId",
    ]) ??
    extractMessageIdFromHeaders(headers) ??
    `<generated-${Date.now()}@baystudies.local>`;

  const provider = detectProvider(fields, preferredProvider);

  return { from, to, subject, text, html, messageId, provider };
}

function detectProvider(
  fields: Record<string, unknown>,
  preferred?: string | null
): MailProvider {
  const pref = (preferred ?? process.env.MAIL_PROVIDER ?? "dev").toLowerCase();
  if (pref === "mailgun" || pref === "sendgrid" || pref === "dev") {
    return pref;
  }
  if ("body-plain" in fields || "stripped-text" in fields) return "mailgun";
  if ("headers" in fields && ("text" in fields || "html" in fields)) {
    return "sendgrid";
  }
  return "unknown";
}

export function normalizedToRawEmail(
  n: NormalizedInbound,
  id?: string
): RawEmail {
  const safeId =
    id ??
    `em-live-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  return {
    id: safeId,
    messageId: n.messageId,
    from: n.from,
    to: n.to,
    subject: n.subject,
    receivedAt: new Date().toISOString(),
    text: n.text || (n.html ? stripHtml(n.html) : ""),
    html: n.html,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Convert FormData → plain object (first value per key). */
export function formDataToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") {
      out[key] = value;
    }
    // skip File blobs for demo
  });
  return out;
}

/**
 * Optional webhook secret check.
 * When INBOUND_WEBHOOK_SECRET is unset/empty, always allow (local demo).
 */
export function verifyInboundSecret(request: Request): {
  ok: boolean;
  error?: string;
} {
  const secret = process.env.INBOUND_WEBHOOK_SECRET?.trim();
  if (!secret) return { ok: true };

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const header = request.headers.get("x-inbound-secret")?.trim();
  const url = new URL(request.url);
  const query = url.searchParams.get("secret")?.trim();

  if (bearer === secret || header === secret || query === secret) {
    return { ok: true };
  }
  return { ok: false, error: "Unauthorized — invalid or missing webhook secret" };
}
