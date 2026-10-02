"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MATCH_EVENT,
  NOTIFY_EVENT,
  consumePendingToast,
  loadNotifications,
  loadSeenMatchIds,
  markAllNotificationsRead,
  markMatchSeen,
  markMatchesSeen,
  markNotificationRead,
  unreadMatchCount,
} from "@/lib/storage";
import type { AppNotification } from "@/lib/types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenMatchIds, setSeenMatchIds] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setNotifications(loadNotifications());
    setSeenMatchIds(loadSeenMatchIds());
    setUnread(unreadMatchCount());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onEvt = () => refresh();
    window.addEventListener(NOTIFY_EVENT, onEvt);
    window.addEventListener(MATCH_EVENT, onEvt);
    window.addEventListener("storage", onEvt);
    window.addEventListener("focus", onEvt);
    return () => {
      window.removeEventListener(NOTIFY_EVENT, onEvt);
      window.removeEventListener(MATCH_EVENT, onEvt);
      window.removeEventListener("storage", onEvt);
      window.removeEventListener("focus", onEvt);
    };
  }, [refresh]);

  /** Show pending toast from approve (once) and keep listening for live events. */
  const pullPendingToast = useCallback(() => {
    const pending = consumePendingToast();
    if (pending) setToast(pending);
    refresh();
  }, [refresh]);

  const dismissToast = useCallback(() => setToast(null), []);

  const markRead = useCallback((id: string) => {
    setNotifications(markNotificationRead(id));
    setUnread(unreadMatchCount());
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(markAllNotificationsRead());
    setUnread(0);
  }, []);

  const seeMatch = useCallback((studyId: string) => {
    setSeenMatchIds(markMatchSeen(studyId));
    // Also mark related notifications read
    const related = loadNotifications().filter(
      (n) => n.studyId === studyId && !n.read
    );
    for (const n of related) markNotificationRead(n.id);
    setNotifications(loadNotifications());
    setUnread(unreadMatchCount());
  }, []);

  const seeAllMatches = useCallback((ids: string[]) => {
    setSeenMatchIds(markMatchesSeen(ids));
  }, []);

  const isNewMatch = useCallback(
    (studyId: string, matched: boolean) => {
      if (!matched) return false;
      return !seenMatchIds.includes(studyId);
    },
    [seenMatchIds]
  );

  return {
    notifications,
    seenMatchIds,
    unread,
    toast,
    ready,
    refresh,
    pullPendingToast,
    dismissToast,
    markRead,
    markAllRead,
    seeMatch,
    seeAllMatches,
    isNewMatch,
  };
}
