import {
  DEFAULT_PROFILE,
  type AppNotification,
  type IngestItemState,
  type Profile,
  type Study,
} from "./types";

const PROFILE_KEY = "bay-studies-profile-v1";
const PUBLISHED_KEY = "bay-studies-published-v1";
const INGEST_KEY = "bay-studies-ingest-v1";
const NOTIFICATIONS_KEY = "bay-studies-notifications-v1";
const SEEN_MATCHES_KEY = "bay-studies-seen-matches-v1";
const PENDING_TOAST_KEY = "bay-studies-pending-toast-v1";

export const NOTIFY_EVENT = "bay-studies-notify";
export const MATCH_EVENT = "bay-studies-match-updated";

/* ── Profile (Week 1) ─────────────────────────────────────────────── */

export function loadProfile(): Profile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as Profile;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}

/* ── Published studies from admin approve (Week 2) ────────────────── */

export function loadPublishedStudies(): Study[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Study[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function savePublishedStudies(studies: Study[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(studies));
}

export function upsertPublishedStudy(study: Study): Study[] {
  const current = loadPublishedStudies();
  const idx = current.findIndex((s) => s.id === study.id);
  const next =
    idx >= 0
      ? current.map((s, i) => (i === idx ? study : s))
      : [...current, study];
  savePublishedStudies(next);
  return next;
}

export function removePublishedStudy(id: string): Study[] {
  const next = loadPublishedStudies().filter((s) => s.id !== id);
  savePublishedStudies(next);
  return next;
}

export function patchPublishedStudy(
  id: string,
  patch: Partial<Study>
): Study[] {
  const current = loadPublishedStudies();
  const next = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
  savePublishedStudies(next);
  return next;
}

/* ── Ingest review state (pending / approved / rejected) ──────────── */

export function loadIngestStates(): Record<string, IngestItemState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(INGEST_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, IngestItemState>;
  } catch {
    return {};
  }
}

export function saveIngestStates(
  states: Record<string, IngestItemState>
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INGEST_KEY, JSON.stringify(states));
}

export function setIngestState(state: IngestItemState): Record<string, IngestItemState> {
  const all = loadIngestStates();
  const next = { ...all, [state.emailId]: state };
  saveIngestStates(next);
  return next;
}

export function clearIngestDemoData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PUBLISHED_KEY);
  localStorage.removeItem(INGEST_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(SEEN_MATCHES_KEY);
  localStorage.removeItem(PENDING_TOAST_KEY);
  // Week 4 soft-launch keys (trusted domains + auto-publish pref; keep analytics unless full reset)
  localStorage.removeItem("bay-studies-trusted-from-v1");
  localStorage.removeItem("bay-studies-auto-publish-v1");
}

/** Full demo wipe including analytics counters (Week 4). */
export function clearAllDemoData(): void {
  clearIngestDemoData();
  if (typeof window === "undefined") return;
  localStorage.removeItem("bay-studies-analytics-v1");
}

/* ── Week 3: notifications + unread matches ───────────────────────── */

export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as AppNotification[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveNotifications(list: AppNotification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 40)));
}

export function pushNotification(n: AppNotification): AppNotification[] {
  const next = [n, ...loadNotifications().filter((x) => x.id !== n.id)];
  saveNotifications(next);
  dispatchNotify();
  return next;
}

export function markNotificationRead(id: string): AppNotification[] {
  const next = loadNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(next);
  dispatchNotify();
  return next;
}

export function markAllNotificationsRead(): AppNotification[] {
  const next = loadNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(next);
  dispatchNotify();
  return next;
}

export function unreadMatchCount(): number {
  return loadNotifications().filter((n) => n.matched && !n.read).length;
}

export function loadSeenMatchIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEEN_MATCHES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function markMatchSeen(studyId: string): string[] {
  const current = loadSeenMatchIds();
  if (current.includes(studyId)) return current;
  const next = [...current, studyId];
  if (typeof window !== "undefined") {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MATCH_EVENT));
  }
  return next;
}

export function markMatchesSeen(studyIds: string[]): string[] {
  const set = new Set(loadSeenMatchIds());
  for (const id of studyIds) set.add(id);
  const next = Array.from(set);
  if (typeof window !== "undefined") {
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MATCH_EVENT));
  }
  return next;
}

/** Pending toast payload shown once on /feed after approve. */
export function setPendingToast(payload: AppNotification | null): void {
  if (typeof window === "undefined") return;
  if (!payload) {
    localStorage.removeItem(PENDING_TOAST_KEY);
    return;
  }
  localStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(payload));
}

export function consumePendingToast(): AppNotification | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_TOAST_KEY);
    return JSON.parse(raw) as AppNotification;
  } catch {
    localStorage.removeItem(PENDING_TOAST_KEY);
    return null;
  }
}

function dispatchNotify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFY_EVENT));
    window.dispatchEvent(new Event(MATCH_EVENT));
  }
}
