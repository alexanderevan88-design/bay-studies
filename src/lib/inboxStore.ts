import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
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

const BLOB_PATHNAME = "inbox/bay-studies-inbox.json";

/**
 * Local / single-disk hosts: data/inbox.json
 * Vercel serverless without Blob: /tmp (writable; ephemeral per instance)
 * With BLOB_READ_WRITE_TOKEN: durable Vercel Blob JSON at inbox/bay-studies-inbox.json
 */
function resolveInboxPath(): string {
  if (process.env.VERCEL || process.env.INBOX_USE_TMP === "1") {
    return path.join("/tmp", "bay-studies-inbox.json");
  }
  return path.join(process.cwd(), "data", "inbox.json");
}

const INBOX_PATH = resolveInboxPath();

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function ensureFileStore(): Promise<void> {
  const dir = path.dirname(INBOX_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(INBOX_PATH);
  } catch {
    await fs.writeFile(INBOX_PATH, "[]\n", "utf8");
  }
}

async function readInboxFromFile(): Promise<InboxItem[]> {
  await ensureFileStore();
  try {
    const raw = await fs.readFile(INBOX_PATH, "utf8");
    const parsed = JSON.parse(raw) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInboxToFile(items: InboxItem[]): Promise<void> {
  await ensureFileStore();
  await fs.writeFile(INBOX_PATH, JSON.stringify(items, null, 2) + "\n", "utf8");
}

async function readInboxFromBlob(): Promise<InboxItem[]> {
  try {
    const result = await get(BLOB_PATHNAME, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return [];
    }
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw) as InboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    const message = err instanceof Error ? err.message : String(err);
    // Missing blob on first boot — start empty.
    if (
      name === "BlobNotFoundError" ||
      /not found|404/i.test(message)
    ) {
      return [];
    }
    console.error("[inboxStore] blob read failed, falling back to file:", message);
    return readInboxFromFile();
  }
}

async function writeInboxToBlob(items: InboxItem[]): Promise<void> {
  const body = JSON.stringify(items, null, 2) + "\n";
  await put(BLOB_PATHNAME, body, {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

export async function readInbox(): Promise<InboxItem[]> {
  if (blobEnabled()) {
    return readInboxFromBlob();
  }
  return readInboxFromFile();
}

export async function writeInbox(items: InboxItem[]): Promise<void> {
  if (blobEnabled()) {
    try {
      await writeInboxToBlob(items);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[inboxStore] blob write failed, falling back to file:", message);
    }
  }
  await writeInboxToFile(items);
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
  if (blobEnabled()) {
    return `blob:${BLOB_PATHNAME}`;
  }
  return INBOX_PATH;
}
