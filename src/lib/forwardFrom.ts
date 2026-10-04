/**
 * Recover the original firm From when Mailgun receives a Gmail manual/auto
 * forward (envelope From is baystudies4788@gmail.com / other Gmail).
 *
 * Gmail wraps the original headers in a block like:
 *
 *   ---------- Forwarded message ---------
 *   From: Info@theclc.com <Info@theclc.com>
 *   Date: …
 *   Subject: New study available!
 *   To: baystudies4788@gmail.com
 *
 * The stored email keeps the real envelope From for audit; parseEmail uses
 * the recovered address for allowlist / matchedSourceId / fromAllowed.
 */

const FORWARDED_BLOCK_RE =
  /(?:^-{5,}\s*Forwarded message\s*-{5,}\s*$|^Begin forwarded message:?\s*$)/im;

const FROM_LINE_RE = /^\s*From:\s*(.+?)\s*$/im;

/** Envelope From looks like Gmail (manual/auto forward hop). */
export function isGmailEnvelopeFrom(from: string): boolean {
  const m = from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  if (!m) return false;
  const domain = m[1].toLowerCase();
  return domain === "gmail.com" || domain === "googlemail.com";
}

/**
 * Pull the original From: out of a Gmail/Apple-style forwarded block.
 * Returns the full From value (display + address) when present.
 */
export function extractForwardedOriginalFrom(
  text: string
): string | undefined {
  if (!text?.trim()) return undefined;

  const blockMatch = text.match(FORWARDED_BLOCK_RE);
  if (!blockMatch || blockMatch.index == null) return undefined;

  // Prefer the header area right after the marker (first ~2KB).
  const searchRegion = text.slice(blockMatch.index, blockMatch.index + 2000);
  const fromMatch = searchRegion.match(FROM_LINE_RE);
  if (!fromMatch) return undefined;

  const raw = fromMatch[1].trim();
  if (!raw) return undefined;
  if (!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return undefined;

  // Don't treat our own Gmail hop as the "original"
  if (isGmailEnvelopeFrom(raw)) return undefined;

  return raw;
}

/**
 * When envelope From is Gmail, recover the firm From for allowlist matching.
 * Returns undefined when recovery does not apply.
 */
export function recoverFirmFromForParse(email: {
  from: string;
  subject: string;
  text: string;
}): string | undefined {
  // Only when the envelope itself is a Gmail hop (or Fwd: + forwarded block).
  const gmailHop = isGmailEnvelopeFrom(email.from);
  const hasFwdSubject = /^fwd:/i.test(email.subject.trim());
  const hasBlock = FORWARDED_BLOCK_RE.test(email.text);

  if (!gmailHop && !(hasFwdSubject && hasBlock)) return undefined;
  if (!hasBlock) return undefined;

  return extractForwardedOriginalFrom(email.text);
}
