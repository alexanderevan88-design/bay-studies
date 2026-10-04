"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { NotifyToast } from "@/components/NotifyToast";
import { StudyCard } from "@/components/StudyCard";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { computeMatchPercent, isProfileMatch } from "@/lib/match";
import { METRO_LABELS } from "@/lib/types";
import { SEED_FIRM_COUNT } from "@/data/studies";

type FeedTab = "feed" | "saved" | "applied";

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
          </div>
        </AppShell>
      }
    >
      <FeedInner />
    </Suspense>
  );
}

function FeedInner() {
  const { profile, ready } = useProfile();
  const { studies, published, ready: studiesReady } = useFeedStudies();
  const {
    toast,
    unread,
    pullPendingToast,
    dismissToast,
    isNewMatch,
    markAllRead,
    seeMatch,
    seeAllMatches,
  } = useNotifications();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: FeedTab =
    tabParam === "saved"
      ? "saved"
      : tabParam === "applied"
        ? "applied"
        : "feed";

  useEffect(() => {
    pullPendingToast();
  }, [pullPendingToast]);

  const ranked = useMemo(() => {
    const publishedIds = new Set(published.map((study) => study.id));
    const list = studies
      .filter((s) => !profile.dismissedStudyIds.includes(s.id))
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));

    // Soft filter by prefs when onboarded (keep expired visible with badge).
    // Pay is intentionally not a soft filter during soft launch: keep the feed full.
    // Server-published studies are human-approved, so never hide them for prefs.
    let filtered = list;
    if (profile.onboarded) {
      filtered = list.filter(({ study }) => {
        if (publishedIds.has(study.id)) return true;
        if (!profile.studyTypes.includes(study.type)) return false;
        if (
          profile.modality !== "both" &&
          profile.modality !== study.modality
        ) {
          return false;
        }
        return true;
      });
    }

    const softFilteredEmpty =
      profile.onboarded && filtered.length === 0 && list.length > 0;

    const sorted = (softFilteredEmpty ? list : filtered).sort((a, b) => {
      const aNew = isNewMatch(a.study.id, a.matched) ? 1 : 0;
      const bNew = isNewMatch(b.study.id, b.matched) ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;
      if (Boolean(a.study.expired) !== Boolean(b.study.expired)) {
        return a.study.expired ? 1 : -1;
      }
      if (a.match !== b.match) return b.match - a.match;
      // Human-approved publications win ties with seed studies.
      const aPublished = publishedIds.has(a.study.id) ? 1 : 0;
      const bPublished = publishedIds.has(b.study.id) ? 1 : 0;
      return bPublished - aPublished;
    });

    return { cards: sorted, softFilteredEmpty, rawCount: list.length };
  }, [profile, studies, published, isNewMatch]);

  const saved = useMemo(
    () =>
      ranked.cards.filter(({ study }) =>
        profile.savedStudyIds.includes(study.id)
      ),
    [ranked.cards, profile.savedStudyIds]
  );

  const applied = useMemo(
    () =>
      ranked.cards.filter(({ study }) =>
        profile.appliedStudyIds.includes(study.id)
      ),
    [ranked.cards, profile.appliedStudyIds]
  );

  // Also surface applied/saved that may have been dismissed from main feed
  const appliedOnly = useMemo(() => {
    const ids = new Set(applied.map(({ study }) => study.id));
    const extras = studies
      .filter(
        (s) =>
          profile.appliedStudyIds.includes(s.id) && !ids.has(s.id)
      )
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));
    return [...applied, ...extras];
  }, [applied, studies, profile]);

  const savedOnly = useMemo(() => {
    const ids = new Set(saved.map(({ study }) => study.id));
    const extras = studies
      .filter(
        (s) => profile.savedStudyIds.includes(s.id) && !ids.has(s.id)
      )
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));
    return [...saved, ...extras];
  }, [saved, studies, profile]);

  const cards =
    tab === "saved" ? savedOnly : tab === "applied" ? appliedOnly : ranked.cards;

  const profileIncomplete =
    !profile.onboarded ||
    !profile.metro ||
    profile.age === "" ||
    profile.studyTypes.length === 0;

  if (!ready || !studiesReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {toast && (
        <NotifyToast notification={toast} onDismiss={dismissToast} />
      )}

      <header className="sticky top-0 z-30 overflow-x-hidden border-b border-sage-100/80 bg-cream/95 px-4 py-4 backdrop-blur sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <Link
              href="/admin/ingest"
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-xs font-medium text-stone-500 hover:bg-sage-50 hover:text-sage-800"
              title="Admin demo ingest"
            >
              Ingest
            </Link>
            <Link
              href="/alerts"
              className="relative inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-medium text-sage-800 hover:bg-sage-50"
            >
              Alerts
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </Link>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
              {profile.metro
                ? METRO_LABELS[profile.metro]
                : "Bay Area"}
            </p>
            <h1 className="font-serif text-2xl font-semibold text-sage-900">
              {tab === "saved"
                ? "Saved"
                : tab === "applied"
                  ? "Applied"
                  : "Your feed"}
            </h1>
          </div>
          {tab === "feed" && (
            <div className="text-right">
              <p className="text-sm text-stone-500">
                {cards.length} stud{cards.length === 1 ? "y" : "ies"}
                {profile.onboarded ? " for you" : ""}
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const ids = ranked.cards
                      .filter(({ study, matched }) =>
                        isNewMatch(study.id, matched)
                      )
                      .map(({ study }) => study.id);
                    seeAllMatches(ids);
                    markAllRead();
                  }}
                  className="text-xs font-medium text-sage-700 underline"
                >
                  Clear {unread} new
                </button>
              )}
            </div>
          )}
          {tab === "saved" && (
            <p className="text-sm text-stone-500">
              {cards.length} saved
            </p>
          )}
          {tab === "applied" && (
            <p className="text-sm text-stone-500">
              {cards.length} applied
            </p>
          )}
        </div>

        <nav className="mt-4 flex gap-1 rounded-xl bg-sage-50/80 p-1">
          <TabChip href="/feed" label="Feed" active={tab === "feed"} />
          <TabChip
            href="/feed?tab=saved"
            label="Saved"
            active={tab === "saved"}
            count={profile.savedStudyIds.length}
          />
          <TabChip
            href="/feed?tab=applied"
            label="Applied"
            active={tab === "applied"}
            count={profile.appliedStudyIds.length}
          />
        </nav>
      </header>

      <div className="space-y-3 overflow-x-hidden px-4 py-5 sm:px-5">
        {profileIncomplete && tab === "feed" && (
          <IncompleteProfileCard onboarded={profile.onboarded} />
        )}

        {tab === "feed" &&
          ranked.softFilteredEmpty &&
          cards.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Nothing hit your filters right now — showing all{" "}
              {ranked.rawCount} from our verified firms.{" "}
              <Link
                href="/onboarding/preferences"
                className="font-semibold underline"
              >
                Tweak preferences
              </Link>
            </div>
          )}

        {tab === "feed" && cards.length > 0 && (
          <div className="rounded-xl border border-sage-100 bg-white/80 px-3.5 py-2.5 text-xs leading-relaxed text-stone-600">
            <span className="font-semibold text-sage-800">
              Bay Area · verified firms
            </span>
            {" · "}
            Soft-launch: allowlisted sources, human Approve for new domains.{" "}
            <Link
              href="/about/verify"
              className="font-semibold text-sage-800 underline"
            >
              How we source
            </Link>
            {" · "}
            No fee. Ever.
          </div>
        )}

        {cards.length === 0 ? (
          <EmptyState
            tab={tab}
            profileIncomplete={profileIncomplete}
            hasAnyStudies={studies.length > 0}
            publishedEmpty={published.length === 0}
          />
        ) : (
          cards.map(({ study, match, matched }) => {
            const neu = isNewMatch(study.id, matched);
            return (
              <div
                key={study.id}
                onClick={() => {
                  if (neu) seeMatch(study.id);
                }}
              >
                <StudyCard
                  study={study}
                  matchPercent={match}
                  saved={profile.savedStudyIds.includes(study.id)}
                  applied={profile.appliedStudyIds.includes(study.id)}
                  isNewMatch={neu}
                  profileReady={profile.onboarded}
                />
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

function TabChip({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-sage-900 shadow-sm"
          : "text-stone-500 hover:text-sage-800"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-sage-100 text-sage-800" : "bg-stone-200 text-stone-600"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function IncompleteProfileCard({ onboarded }: { onboarded: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
      <div className="px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
          {onboarded ? "Profile incomplete" : "Finish setup"}
        </p>
        <h2 className="mt-1 font-serif text-lg font-semibold text-sage-900">
          {onboarded
            ? "Add a few details for better matches"
            : "Complete your profile to unlock matches"}
        </h2>
        <p className="mt-1.5 text-sm text-stone-600">
          Metro, age, and study types help us filter junk and surface real paid
          studies from {SEED_FIRM_COUNT} verified Bay Area firms (soft-launch:
          human Approve for new domains).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/onboarding/about"
            className="inline-flex rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-800"
          >
            {onboarded ? "Update about you" : "Continue setup"}
          </Link>
          <Link
            href="/onboarding/preferences"
            className="inline-flex rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-semibold text-sage-800 hover:bg-sage-50"
          >
            Preferences
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  tab,
  profileIncomplete,
  hasAnyStudies,
  publishedEmpty,
}: {
  tab: FeedTab;
  profileIncomplete: boolean;
  hasAnyStudies: boolean;
  /** True when server published store has no approved email studies yet. */
  publishedEmpty: boolean;
}) {
  if (tab === "saved") {
    return (
      <div className="rounded-2xl border border-dashed border-sage-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        </div>
        <p className="mt-4 font-serif text-xl text-sage-900">
          Nothing saved yet
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Tap the heart on a study detail to keep it here for later.
        </p>
        <Link
          href="/feed"
          className="mt-5 inline-flex rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Browse feed
        </Link>
      </div>
    );
  }

  if (tab === "applied") {
    return (
      <div className="rounded-2xl border border-dashed border-sage-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="mt-4 font-serif text-xl text-sage-900">
          No applications yet
        </p>
        <p className="mt-2 text-sm text-stone-500">
          When you open a firm screener, we mark it Applied so you can track
          what you&apos;ve already tapped.
        </p>
        <Link
          href="/feed"
          className="mt-5 inline-flex rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Find a study
        </Link>
      </div>
    );
  }

  // Feed — empty: distinguish no published mail yet vs prefs miss vs true quiet
  const quietPublished =
    publishedEmpty && !hasAnyStudies;

  return (
    <div className="rounded-2xl border border-dashed border-sage-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-700">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h10"
          />
        </svg>
      </div>
      <p className="mt-4 font-serif text-xl text-sage-900">
        {profileIncomplete
          ? "Your feed wakes up after a quick profile"
          : quietPublished
            ? "Still warming up — check back soon"
            : hasAnyStudies
              ? "Nothing fits your filters right now"
              : "Quiet week — we’re still watching"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        {profileIncomplete
          ? `Add metro, age, and study types so we can match you against ${SEED_FIRM_COUNT} verified Bay Area firms. Soft-launch: every listing is allowlisted and human-reviewed.`
          : quietPublished
            ? `We’re onboarding ${SEED_FIRM_COUNT} verified Bay Area firms. New invites need a human Approve before they appear — keep Alerts on and complete your profile so you’re ready.`
            : hasAnyStudies
              ? "Try lowering min pay or turning on more study types — then check Alerts so you don’t miss the next verified fit."
              : `We watch ${SEED_FIRM_COUNT} verified Bay Area firms. Soft-launch means human Approve for new domains. Keep Alerts on and we’ll nudge you when a paid study lands.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {profileIncomplete ? (
          <Link
            href="/onboarding/about"
            className="inline-flex rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Complete profile
          </Link>
        ) : (
          <Link
            href="/onboarding/preferences"
            className="inline-flex rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Adjust preferences
          </Link>
        )}
        <Link
          href="/alerts"
          className="inline-flex rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-semibold text-sage-800"
        >
          Check Alerts
        </Link>
        <Link
          href="/about/verify"
          className="inline-flex rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600"
        >
          How we verify
        </Link>
      </div>
      <p className="mt-4 text-xs text-stone-400">
        {SEED_FIRM_COUNT} verified Bay Area firms · Human Approve · No fee.
        Ever.
      </p>
    </div>
  );
}
