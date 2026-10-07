"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import type { DigestFrequency } from "@/lib/types";

export default function AlertsPage() {
  const { profile, update, ready } = useProfile();
  const { notifications, unread, markAllRead, markRead, ready: nReady } =
    useNotifications();

  if (!ready || !nReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  const pushOn = profile.pushEnabled;
  const profileReady = profile.onboarded && Boolean(profile.metro);

  return (
    <AppShell>
      <header className="px-5 py-5">
        <Link
          href="/me"
          className="inline-flex min-h-11 items-center text-sm font-medium text-sage-700"
        >
          ← Me
        </Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-sage-900">
          Alerts
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          In-app only for this demo — no device push yet. Matching publishes
          show a toast on{" "}
          <Link href="/feed" className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline">
            /feed
          </Link>{" "}
          and land below.
        </p>
      </header>

      <div className="space-y-3 px-5 pb-10">
        <section className="rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sage-700">
            When alerts fire
          </p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-stone-700">
            <li>
              Finish onboarding so we can score matches (age, metro, prefs).
            </li>
            <li>
              Keep <span className="font-semibold">Push</span> on (below).
            </li>
            <li>
              On{" "}
              <Link
                href="/admin/ingest"
                className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline"
              >
                /admin/ingest
              </Link>
              , Approve (or Auto-publish) a study that fits you.
            </li>
            <li>
              Open <span className="font-semibold">/feed</span> — toast like
              “New $150 study — ages 25–40”, plus a row here.
            </li>
          </ol>
          {!profileReady && (
            <Link
              href="/onboarding/about"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white hover:bg-sage-800"
            >
              Finish profile first
            </Link>
          )}
        </section>

        <div
          className={`rounded-xl border px-3.5 py-2.5 text-sm ${
            pushOn
              ? "border-sage-200 bg-sage-50 text-sage-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          {pushOn ? (
            <>
              <span className="font-semibold">Push on</span>
              {" — "}matching Approves queue a /feed toast. New-match badges
              still appear if you turn this off.
            </>
          ) : (
            <>
              <span className="font-semibold">Push off</span>
              {" — "}no toast after Approve. Matching studies still get a{" "}
              <span className="font-semibold">New match</span> badge on /feed.
            </>
          )}
        </div>

        <Row
          title="Push notifications"
          subtitle={pushOn ? "Toasts enabled" : "Toasts paused"}
          right={
            <Toggle
              on={pushOn}
              onChange={(v) => update({ pushEnabled: v })}
            />
          }
        />

        <div className="rounded-2xl border border-sage-100 bg-white p-4">
          <p className="text-sm font-semibold text-stone-800">Email digest</p>
          <p className="mt-1 text-xs text-stone-500">
            Preference only — no outbound email in this demo.
          </p>
          <div className="mt-3 flex gap-2">
            {(
              [
                ["off", "Off"],
                ["daily", "Daily"],
                ["weekly", "Weekly"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ digest: value as DigestFrequency })}
                className={`min-h-11 flex-1 rounded-lg border px-2 py-2.5 text-sm font-medium transition ${
                  profile.digest === value
                    ? "border-sage-600 bg-sage-50 text-sage-900"
                    : "border-stone-200 text-stone-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white p-4">
          <p className="text-sm font-semibold text-stone-800">Quiet hours</p>
          <p className="mt-1 text-xs text-stone-500">
            Saved locally. Demo does not suppress toasts yet — for laptop day
            with a real push provider.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex-1">
              <span className="text-xs font-medium text-stone-600">From</span>
              <input
                type="time"
                value={profile.quietHoursStart}
                onChange={(e) => update({ quietHoursStart: e.target.value })}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900"
              />
            </label>
            <label className="flex-1">
              <span className="text-xs font-medium text-stone-600">To</span>
              <input
                type="time"
                value={profile.quietHoursEnd}
                onChange={(e) => update({ quietHoursEnd: e.target.value })}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-sage-100 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-stone-800">
                Recent notifications
              </p>
              <p className="text-xs text-stone-500">
                Stored on this device
                {unread > 0 ? ` · ${unread} unread` : ""}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-sage-800 underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-sage-200 bg-sage-50/60 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-sage-900">
                No alerts yet
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                {pushOn
                  ? "Approve a matching invite on Ingest, then open /feed to catch the toast."
                  : "Turn Push on, finish your profile, then Approve a matching study on Ingest."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href="/admin/ingest"
                  className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white"
                >
                  Open ingest
                </Link>
                <Link
                  href="/feed"
                  className="inline-flex min-h-11 items-center rounded-xl border border-sage-200 bg-white px-4 text-sm font-semibold text-sage-800"
                >
                  Go to feed
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-stone-100">
              {notifications.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          n.read
                            ? "font-medium text-stone-600"
                            : "font-semibold text-sage-900"
                        }`}
                      >
                        {!n.read && (
                          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 align-middle" />
                        )}
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                        {n.body}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {formatPt(n.createdAt)}
                        {n.matched ? " · match" : " · published"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <Link
                        href={`/studies/${n.studyId}`}
                        onClick={() => markRead(n.id)}
                        className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-sage-800"
                      >
                        View
                      </Link>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="inline-flex min-h-11 items-center px-1 text-xs font-medium text-stone-500 hover:text-stone-800"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-sage-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">
            Demo match toast
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-800">
            “New $150 study — ages 25–40”
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Appears once at the top of /feed after Approve when Push is on and
            your profile matches (≥70%). Dismiss or tap Open study.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 rounded-2xl border border-sage-100 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-stone-800">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
        )}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? "Turn push off" : "Turn push on"}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 rounded-full transition before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-[""] ${
        on ? "bg-sage-700" : "bg-stone-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
          on ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

function formatPt(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " PT"
    );
  } catch {
    return iso;
  }
}
