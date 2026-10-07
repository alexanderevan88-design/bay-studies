/**
 * Which firm panels this person has joined. Device only (localStorage),
 * never sent anywhere, no telemetry — same stance as the vault.
 *
 * Also tracks, per browser tab session, a "Join was tapped" marker so we can
 * ask once "Did you finish joining X?" when they come back.
 */
const JOINED_KEY = "bay-studies-joined-firms-v1";
const PENDING_KEY = "bay-studies-join-pending-v1";
const ASKED_KEY = "bay-studies-join-asked-v1";
export const JOINED_EVENT = "bay-studies-joined-firms-updated";

export type JoinedMap = Record<string, string>; // firmId -> ISO time marked

function read<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(store: Storage | undefined, key: string, value: unknown) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / full: still works for this page view */
  }
}

const local = () => (typeof window === "undefined" ? undefined : window.localStorage);
const session = () => (typeof window === "undefined" ? undefined : window.sessionStorage);

export function loadJoined(): JoinedMap {
  const m = read<JoinedMap>(local(), JOINED_KEY, {});
  return m && typeof m === "object" ? m : {};
}

export function setJoined(firmId: string, joined: boolean): JoinedMap {
  const m = loadJoined();
  if (joined) m[firmId] = new Date().toISOString();
  else delete m[firmId];
  write(local(), JOINED_KEY, m);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(JOINED_EVENT));
  return m;
}

/** Call when a Join button is tapped (opens the firm's signup in a new tab). */
export function markJoinPending(firmId: string) {
  write(session(), PENDING_KEY, { firmId, at: Date.now() });
}

/**
 * Firm to ask about on return, or null. Only once per firm per session,
 * never for firms already marked joined.
 */
export function takeJoinQuestion(): string | null {
  const p = read<{ firmId?: string; at?: number } | null>(session(), PENDING_KEY, null);
  if (!p?.firmId) return null;
  // Give them a moment on the other tab before asking.
  if (Date.now() - (p.at ?? 0) < 5000) return null;
  session()?.removeItem(PENDING_KEY);
  const asked = read<string[]>(session(), ASKED_KEY, []);
  if (asked.includes(p.firmId) || loadJoined()[p.firmId]) return null;
  write(session(), ASKED_KEY, [...asked, p.firmId]);
  return p.firmId;
}

/* ── Optional "Get set up" suggestion (never forced) ─────────────── */

const SUGGEST_KEY = "bay-studies-setup-suggest-v1";

export interface SetupSuggestState {
  /** "later" = picked Maybe later; "opened" = went to /setup. */
  choice?: "later" | "opened";
  /** Feed nudge closed for good. */
  nudgeDismissed?: boolean;
}

export function loadSetupSuggest(): SetupSuggestState {
  return read<SetupSuggestState>(local(), SUGGEST_KEY, {}) || {};
}

export function saveSetupSuggest(patch: SetupSuggestState): SetupSuggestState {
  const next = { ...loadSetupSuggest(), ...patch };
  write(local(), SUGGEST_KEY, next);
  return next;
}
