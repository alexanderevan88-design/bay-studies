"use client";

import Link from "next/link";
import type { AppNotification } from "@/lib/types";

export function NotifyToast({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="pointer-events-auto fixed left-3 right-3 top-3 z-50 mx-auto max-w-md"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-sage-200 bg-white px-4 py-3 shadow-lg shadow-sage-900/10">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sm font-bold text-sage-800">
          $
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-sage-700">
            New match
          </p>
          <p className="mt-0.5 text-sm font-semibold text-sage-900">
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
            {notification.body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={`/studies/${notification.studyId}`}
              onClick={onDismiss}
              className="inline-flex min-h-11 items-center text-xs font-semibold text-sage-800 underline"
            >
              Open study
            </Link>
            <span className="text-xs text-stone-500">Demo match toast</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 hover:text-stone-800"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
