import {
  FIRM_INBOUND_PRESETS,
  FIRM_PRESET_IDS,
  type FirmPresetId,
} from "@/data/firms";
import type { RawEmail } from "@/lib/types";

/**
 * Fixture inbound emails for local demo (no live SMTP / Mailgun).
 * One invite per allowlisted firm (11 FIRST + 4 STRETCH = 15).
 * Bodies stay in sync with FIRM_INBOUND_PRESETS.
 */
const RECEIVED_AT: Record<FirmPresetId, string> = {
  clc: "2026-09-28T16:12:00-07:00",
  tasteocracy: "2026-09-29T09:40:00-07:00",
  fieldwork: "2026-09-30T11:05:00-07:00",
  curion: "2026-10-01T08:20:00-07:00",
  nichols: "2026-10-01T14:55:00-07:00",
  fleischman: "2026-09-27T15:30:00-07:00",
  "le-opinions": "2026-09-26T10:15:00-07:00",
  focusgroup: "2026-09-25T13:45:00-07:00",
  vgm: "2026-09-24T18:00:00-07:00",
  "google-ux": "2026-09-23T11:20:00-07:00",
  ea: "2026-09-22T16:40:00-07:00",
  salesforce: "2026-09-21T09:10:00-07:00",
  playtestcloud: "2026-09-20T14:25:00-07:00",
  "user-interviews": "2026-09-19T12:00:00-07:00",
  "meta-arvr": "2026-09-18T17:35:00-07:00",
};

export const SAMPLE_EMAILS: RawEmail[] = FIRM_PRESET_IDS.map((id, index) => {
  const preset = FIRM_INBOUND_PRESETS[id];
  return {
    id: `em-${id}-${String(index + 1).padStart(3, "0")}`,
    messageId: `<${id}-demo-2026@baystudies.local>`,
    from: preset.from,
    to: preset.to.includes("YOUR_DOMAIN")
      ? "ingest@baystudies.local"
      : preset.to,
    subject: preset.subject,
    receivedAt: RECEIVED_AT[id],
    text: preset.text,
  };
});

export function getSampleEmailById(id: string): RawEmail | undefined {
  return SAMPLE_EMAILS.find((e) => e.id === id);
}
