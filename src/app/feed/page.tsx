"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { NotifyToast } from "@/components/NotifyToast";
import { StudyCard } from "@/components/StudyCard";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import { computeMatchPercent, isProfileMatch } from "@/lib/match";
import { effectivePay, isThisWeek } from "@/lib/display";
import { METRO_LABELS, type Profile, type Study } from "@/lib/types";
import { SEED_FIRM_COUNT } from "@/data/studies";

type FeedTab = "feed" | "saved" | "applied";
type BrowseView = "all" | "foryou";

type RankedCard = {
  study: Study;
  match: number;
  matched: boolean;
};

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
  const { profile, ready, toggleSaved, markApplied } = useProfile();
  const router = useRouter();
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
  const browse: BrowseView =
    searchParams.get("view") === "foryou" ? "foryou" : "all";
  const filter = parseFilter(searchParams.get("f"));

  useEffect(() => {
    pullPendingToast();
  }, [pullPendingToast]);

  const ranked = useMemo(() => {
    const publishedIds = new Set(published.map((study) => study.id));
    const list: RankedCard[] = studies
      .filter((s) => !profile.dismissedStudyIds.includes(s.id))
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));

    const allCards = sortCards(list, publishedIds, profile.onboarded, isNewMatch);

    // For you only: soft-filter by study type and modality.
    // Human-approved publications stay visible. Pay is not a filter.
    // All never hides studies for prefs.
    let forYouCards = allCards;
    let softFilteredEmpty = false;
    if (profile.onboarded) {
      const filtered = list.filter(({ study }) =>
        passesSoftPrefs(study, profile, publishedIds)
      );
      softFilteredEmpty = filtered.length === 0 && list.length > 0;
      forYouCards = sortCards(
        filtered,
        publishedIds,
        true,
        isNewMatch
      );
    }

    return {
      allCards,
      forYouCards,
      softFilteredEmpty,
      rawCount: list.length,
    };
  }, [profile, studies, published, isNewMatch]);

  const savedOnly = useMemo(() => {
    const ids = new Set(ranked.allCards.map(({ study }) => study.id));
    const extras = studies
      .filter(
        (s) => profile.savedStudyIds.includes(s.id) && !ids.has(s.id)
      )
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));
    const saved = ranked.allCards.filter(({ study }) =>
      profile.savedStudyIds.includes(study.id)
    );
    return [...saved, ...extras];
  }, [ranked.allCards, studies, profile]);

  const appliedOnly = useMemo(() => {
    const ids = new Set(ranked.allCards.map(({ study }) => study.id));
    const extras = studies
      .filter(
        (s) => profile.appliedStudyIds.includes(s.id) && !ids.has(s.id)
      )
      .map((s) => ({
        study: s,
        match: computeMatchPercent(s, profile),
        matched: isProfileMatch(s, profile),
      }));
    const applied = ranked.allCards.filter(({ study }) =>
      profile.appliedStudyIds.includes(study.id)
    );
    return [...applied, ...extras];
  }, [ranked.allCards, studies, profile]);

  const forYouLocked = browse === "foryou" && !profile.onboarded;
  const baseCards =
    tab === "saved"
      ? savedOnly
      : tab === "applied"
        ? appliedOnly
        : forYouLocked
          ? []
          : browse === "foryou"
            ? ranked.forYouCards
            : ranked.allCards;
  const cards =
    tab === "feed"
      ? baseCards.filter(({ study }) => passesFilter(study, filter))
      : baseCards;

  const profileNeedsDetails =
    !profile.onboarded || profile.age === "" || profile.studyTypes.length === 0;

  if (!ready || !studiesReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  const openCount = baseCards.filter(({ study }) => !study.expired).length;
  const placeName = profile.metro ? METRO_LABELS[profile.metro] : "the Bay";

  function setFilter(next: FeedFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("f");
    else params.set("f", next);
    params.delete("view");
    const qs = params.toString();
    router.replace(qs ? `/feed?${qs}` : "/feed", { scroll: false });
  }

  function setForYou() {
    router.replace("/feed?view=foryou", { scroll: false });
  }

  return (
    <AppShell>
      {toast && (
        <NotifyToast notification={toast} onDismiss={dismissToast} />
      )}

      <header className="sticky top-0 z-30 border-b border-sage-100/80 bg-cream/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <Link
            href="/"
            aria-label="Bay Studies home"
            className="inline-flex min-h-11 items-center"
          >
            <Logo size="sm" />
          </Link>
          <Link
            href="/alerts"
            aria-label={unread > 0 ? `Alerts, ${unread} new` : "Alerts"}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-sage-800 hover:bg-sage-50"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-cream" />
            )}
          </Link>
        </div>
      </header>

      <div className="overflow-x-hidden px-4 pt-4 sm:px-5">
        {tab === "feed" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
              {weekdayPt()} around {placeName}
            </p>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <h1 className="font-serif text-2xl font-semibold leading-tight text-sage-900">
                {forYouLocked
                  ? "For you"
                  : `${openCount} paid stud${openCount === 1 ? "y" : "ies"} open`}
              </h1>
              {unread > 0 && !forYouLocked && (
                <button
                  type="button"
                  onClick={() => {
                    const ids = cards
                      .filter(({ study, matched }) =>
                        isNewMatch(study.id, matched)
                      )
                      .map(({ study }) => study.id);
                    seeAllMatches(ids);
                    markAllRead();
                  }}
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-sage-700 underline"
                >
                  Clear {unread} new
                </button>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Real firms only. No fee, ever. You get paid by the firm.{" "}
              <Link
                href="/about/verify"
                className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline decoration-sage-300 underline-offset-2"
              >
                How we pick
              </Link>
            </p>

            <div
              role="group"
              aria-label="Filter studies"
              className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden"
            >
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.id}
                  label={f.label}
                  active={browse === "all" && filter === f.id}
                  onClick={() => setFilter(f.id)}
                />
              ))}
              {profile.onboarded && (
                <FilterChip
                  label="For you"
                  active={browse === "foryou"}
                  onClick={setForYou}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-semibold text-sage-900">
              {tab === "saved" ? "Saved" : "Applied"}
            </h1>
            <div
              role="group"
              aria-label="Your lists"
              className="mt-2 flex gap-2"
            >
              <FilterChip
                label={`Saved${profile.savedStudyIds.length ? ` · ${profile.savedStudyIds.length}` : ""}`}
                active={tab === "saved"}
                onClick={() => router.replace("/feed?tab=saved", { scroll: false })}
              />
              <FilterChip
                label={`Applied${profile.appliedStudyIds.length ? ` · ${profile.appliedStudyIds.length}` : ""}`}
                active={tab === "applied"}
                onClick={() => router.replace("/feed?tab=applied", { scroll: false })}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-3 overflow-x-hidden px-4 pb-6 pt-3 sm:px-5">
        {tab === "feed" && forYouLocked && <ForYouGate />}

        {tab === "feed" && forYouLocked ? null : cards.length === 0 ? (
          tab === "feed" && filter !== "all" && baseCards.length > 0 ? (
            <FilterEmpty onReset={() => setFilter("all")} />
          ) : (
            <EmptyState
              tab={tab}
              browse={browse}
              hasAnyStudies={studies.length > 0}
              listEmpty={ranked.rawCount === 0}
              prefsMiss={
                browse === "foryou" &&
                profile.onboarded &&
                ranked.softFilteredEmpty
              }
              publishedEmpty={published.length === 0}
            />
          )
        ) : (
          cards.map(({ study, matched }, i) => {
            const neu = isNewMatch(study.id, matched);
            return (
              <div key={study.id} className="space-y-3">
                <StudyCard
                  study={study}
                  saved={profile.savedStudyIds.includes(study.id)}
                  applied={profile.appliedStudyIds.includes(study.id)}
                  isNewMatch={neu}
                  onToggleSave={() => toggleSaved(study.id)}
                  onApply={() => markApplied(study.id)}
                  onOpen={() => {
                    if (neu) seeMatch(study.id);
                  }}
                />
                {tab === "feed" &&
                  browse === "all" &&
                  profileNeedsDetails &&
                  i === Math.min(2, cards.length - 1) && (
                    <IncompleteProfileCard onboarded={profile.onboarded} />
                  )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}

type FeedFilter = "all" | "inperson" | "home" | "75" | "week";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "inperson", label: "In person" },
  { id: "home", label: "From home" },
  { id: "75", label: "$75+" },
  { id: "week", label: "This week" },
];

function parseFilter(raw: string | null): FeedFilter {
  return FILTERS.some((f) => f.id === raw) ? (raw as FeedFilter) : "all";
}

function passesFilter(study: Study, filter: FeedFilter): boolean {
  switch (filter) {
    case "inperson":
      return study.modality === "in-person";
    case "home":
      return study.modality === "remote";
    case "75":
      return effectivePay(study) >= 75;
    case "week":
      return isThisWeek(study);
    default:
      return true;
  }
}

function weekdayPt(): string {
  try {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "America/Los_Angeles",
    });
  } catch {
    return "Today";
  }
}

function passesSoftPrefs(
  study: Study,
  profile: Profile,
  publishedIds: Set<string>
) {
  if (publishedIds.has(study.id)) return true;
  if (!profile.studyTypes.includes(study.type)) return false;
  if (profile.modality !== "both" && profile.modality !== study.modality) {
    return false;
  }
  return true;
}

function sortCards(
  list: RankedCard[],
  publishedIds: Set<string>,
  useMatch: boolean,
  isNewMatch: (id: string, matched: boolean) => boolean
) {
  return [...list].sort((a, b) => {
    const aNew = isNewMatch(a.study.id, a.matched) ? 1 : 0;
    const bNew = isNewMatch(b.study.id, b.matched) ? 1 : 0;
    if (bNew !== aNew) return bNew - aNew;
    if (Boolean(a.study.expired) !== Boolean(b.study.expired)) {
      return a.study.expired ? 1 : -1;
    }
    if (useMatch && a.match !== b.match) return b.match - a.match;
    const aPublished = publishedIds.has(a.study.id) ? 1 : 0;
    const bPublished = publishedIds.has(b.study.id) ? 1 : 0;
    if (bPublished !== aPublished) return bPublished - aPublished;
    const aTime = a.study.publishedAt ? Date.parse(a.study.publishedAt) : 0;
    const bTime = b.study.publishedAt ? Date.parse(b.study.publishedAt) : 0;
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
        active
          ? "bg-sage-700 text-white"
          : "border border-sage-200 bg-white text-sage-800 hover:bg-sage-50"
      }`}
    >
      {label}
    </button>
  );
}

function FilterEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-sage-200 bg-white px-6 py-10 text-center">
      <p className="font-serif text-xl text-sage-900">Nothing here right now</p>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        No open studies match this filter. New ones usually show up midweek.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 text-sm font-semibold text-white"
      >
        Show all studies
      </button>
    </div>
  );
}

function IncompleteProfileCard({ onboarded }: { onboarded: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-sage-50/70 px-4 py-3">
      <p className="min-w-0 flex-1 text-sm leading-snug text-stone-700">
        <span className="font-semibold text-sage-900">Optional:</span>{" "}
        {onboarded
          ? "fill in a few gaps for better picks."
          : "add your age and ZIP and we’ll point out the best fits."}
      </p>
      <Link
        href="/onboarding/about"
        className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-sage-700 px-3.5 text-sm font-semibold text-white hover:bg-sage-800"
      >
        {onboarded ? "Update" : "Add details"}
      </Link>
    </div>
  );
}

function ForYouGate() {
  return (
    <div className="rounded-2xl border border-sage-200 bg-white px-5 py-8 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-sage-700">
        For you
      </p>
      <p className="mt-2 font-serif text-xl text-sage-900">
        Add your details to see personal matches
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Optional. All studies stay available — this view only ranks the ones
        that fit you.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/onboarding/about"
          className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Get better matches
        </Link>
        <Link
          href="/feed"
          className="inline-flex min-h-11 items-center rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-semibold text-sage-800"
        >
          Back to all studies
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  tab,
  browse,
  hasAnyStudies,
  listEmpty,
  prefsMiss,
  publishedEmpty,
}: {
  tab: FeedTab;
  browse: BrowseView;
  hasAnyStudies: boolean;
  listEmpty: boolean;
  prefsMiss: boolean;
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
          Tap the heart on anything that looks fun and we’ll keep it here.
        </p>
        <Link
          href="/feed"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Browse all studies
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
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Browse all studies
        </Link>
      </div>
    );
  }

  if (prefsMiss) {
    return (
      <div className="rounded-2xl border border-dashed border-sage-200 bg-white px-6 py-12 text-center">
        <p className="font-serif text-xl text-sage-900">
          Nothing in For you right now
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Your preferences filtered these out. All studies are still on the
          All tab.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            See all studies
          </Link>
          <Link
            href="/onboarding/preferences"
            className="inline-flex min-h-11 items-center rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-semibold text-sage-800"
          >
            Tweak preferences
          </Link>
        </div>
      </div>
    );
  }

  const quietPublished = publishedEmpty && !hasAnyStudies;

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
        {quietPublished
          ? "No studies yet"
          : listEmpty && hasAnyStudies
            ? "No studies left in this list"
            : "No studies right now"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        {quietPublished
          ? `We’re onboarding ${SEED_FIRM_COUNT} verified Bay Area firms. New invites need a human Approve before they show up here.`
          : listEmpty && hasAnyStudies
            ? "You’ve hidden the current studies. New approved studies will show up here."
            : browse === "foryou"
              ? "Nothing to rank yet. Check All, or come back after the next Approve."
              : `We watch ${SEED_FIRM_COUNT} verified Bay Area firms. New domains need a human Approve.`}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {browse === "foryou" && (
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-xl bg-sage-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            See all studies
          </Link>
        )}
        <Link
          href="/alerts"
          className="inline-flex min-h-11 items-center rounded-xl border border-sage-200 bg-white px-4 py-2.5 text-sm font-semibold text-sage-800"
        >
          Check Alerts
        </Link>
        <Link
          href="/about/verify"
          className="inline-flex min-h-11 items-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600"
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
