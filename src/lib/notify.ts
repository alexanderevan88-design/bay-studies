import {
  ageRangeLabel,
  formatMatchNotifyTitle,
  isProfileMatch,
} from "./match";
import {
  loadProfile,
  pushNotification,
  setPendingToast,
} from "./storage";
import type { AppNotification, Study } from "./types";

/**
 * After admin Approve: if local profile matches and push is on,
 * persist a notification and queue a /feed toast.
 * Always tags the study as a candidate "new match" when matched.
 */
export function onStudyApproved(study: Study): {
  matched: boolean;
  notification: AppNotification | null;
} {
  const profile = loadProfile();
  const matched = isProfileMatch(study, profile);
  const title = formatMatchNotifyTitle(study);
  const body = `${study.title} · ${study.firm} · ${ageRangeLabel(study)}`;

  const notification: AppNotification = {
    id: `n-${study.id}-${Date.now()}`,
    studyId: study.id,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    matched,
    pay: study.pay,
    ageLabel: ageRangeLabel(study),
  };

  if (matched) {
    pushNotification(notification);
    if (profile.pushEnabled) {
      setPendingToast(notification);
    }
    return { matched: true, notification };
  }

  // Still record a quiet digest-style entry when push is on (demo trail)
  if (profile.pushEnabled && profile.onboarded) {
    const soft: AppNotification = {
      ...notification,
      matched: false,
      title: `Published: $${study.pay} study`,
      read: true,
    };
    pushNotification(soft);
  }

  return { matched: false, notification: matched ? notification : null };
}
