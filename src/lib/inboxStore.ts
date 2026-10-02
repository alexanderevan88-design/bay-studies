import { promises as fs } from "fs";
import path from "path";
import type { ParseLog, RawEmail, StudyDraft } from "./types";

/** One persisted inbound email + parse result (server-side store). */
export interface InboxItem {
  email: RawEmail;
  draft: StudyDraft;
  parseLog: ParseLog;
  /** mailgun | sendgrid | dev | unknown */
  provider: string;
  storedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INBOX_PATH = path.join(DATA_DIR, "inbox.json");

// Persistence: data/inbox.json is gitignored and works locally / on a single disk host.
// On Vercel serverless the filesystem is ephemeral — do not rely on it for production volume.
// TODO: swap read/write/upsert for Vercel Blob or Postgres (keep InboxItem shape).

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(INBOX_PATH);
  } catch {
    await fs.writeFile(INBOX_PATH, "[]\n", "utf8");
  }
}

export async function readInbox(): Promise<InboxItem[]> {
  await ensureStore();
  try {
    const raw = await fs.readFile(INBOX_PATH, "utf8");
    const parsed = JSON.parse(raw) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeInbox(items: InboxItem[]): Promise<void> {
  await ensureStore();
  await fs.writeFile(INBOX_PATH, JSON.stringify(items, null, 2) + "\n", "utf8");
}

/** Append or replace by messageId / email.id. Newest first. */
export async function upsertInboxItem(item: InboxItem): Promise<InboxItem> {
  const items = await readInbox();
  const idx = items.findIndex(
    (i) =>
      i.email.id === item.email.id ||
      i.email.messageId === item.email.messageId
  );
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.unshift(item);
  }
  await writeInbox(items);
  return item;
}

export async function findByMessageId(
  messageId: string
): Promise<InboxItem | undefined> {
  const items = await readInbox();
  return items.find((i) => i.email.messageId === messageId);
}

export function inboxPath(): string {
  return INBOX_PATH;
}
