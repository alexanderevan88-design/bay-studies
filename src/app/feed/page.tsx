"use client";

import { isFreshToday, type ClosedStudy } from "@/lib/expiry";
import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { NotifyToast } from "@/components/NotifyToast";
import { StudyCard } from "@/components/StudyCard";
import { BridgeInFog } from "@/components/BridgeInFog";
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
            <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
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
  const { studies, published, closed, ready: studiesReady } = useFeedStudies();
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

  /** Saved studies whose dates have passed: shown greyed in Saved, never in the feed. */
  const closedSaved = useMemo(
    () => closed.filter((c) => profile.savedStudyIds.includes(c.id)),
    [closed, profile.savedStudyIds]
  );

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
          <div className="h-8 w-8 animate-pulse rounded-full bg-line" />
        </div>
      </AppShell>
    );
  }

  const openCount = baseCards.filter(({ study }) => !study.expired).length;
  const filterCounts = Object.fromEntries(
    FILTERS.map((f) => [
      f.id,
      ranked.allCards.filter(({ study }) => passesFilter(study, f.id)).length,
    ])
  ) as Record<FeedFilter, number>;
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

      <header className="sticky top-0 z-30 border-b border-line bg-fog/95 backdrop-blur">
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
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-white/70"
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
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-bridge ring-2 ring-fog" />
            )}
          </Link>
        </div>
      </header>

      <div className="overflow-x-hidden px-4 pt-4 sm:px-5">
        {tab === "feed" ? (
          <>
            <p className="text-[13px] font-semibold text-muted">
              {weekdayPt()} around {placeName}
            </p>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink">
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
                  className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-sage-600 underline"
                >
                  Clear {unread} new
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                className="mr-1.5 inline h-[13px] w-[13px] -translate-y-px text-cash"
                aria-hidden
              >
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm3.03 4.72l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z" />
              </svg>
              Real firms only. Never a fee. You get paid by the firm.{" "}
              <Link
                href="/about/verify"
                className="inline-flex min-h-11 items-center font-semibold text-bridge-link underline decoration-bridge/30 underline-offset-2"
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
                  count={f.id === "week" ? undefined : filterCounts[f.id]}
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
            <p className="text-[13px] font-semibold text-muted">
              {tab === "saved" ? "Saved" : "Applied"}
            </p>
            <h1 className="mt-0.5 font-display text-[30px] font-extrabold leading-[1.1] tracking-tight text-ink">
              {tab === "saved" ? "Your shortlist" : "Studies you tried"}
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

        {tab === "feed" && forYouLocked ? null : cards.length === 0 && tab === "saved" && closedSaved.length > 0 ? null : cards.length === 0 ? (
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
              total={ranked.allCards.length}
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

        {tab === "saved" && closedSaved.length > 0 && (
          <section aria-label="Closed studies" className="space-y-2 pt-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted">
              Closed · dates have passed
            </h2>
            {closedSaved.map((c) => (
              <ClosedSavedCard
                key={c.id}
                study={c}
                onRemove={() => toggleSaved(c.id)}
              />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ClosedSavedCard({
  study,
  onRemove,
}: {
  study: ClosedStudy;
  onRemove: () => void;
}) {
  const closedOn = study.closedAt
    ? new Date(Date.parse(study.closedAt) - 1).toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "short",
        day: "numeric",
      })
    : null;
  return (
    <article className="flex items-center gap-3 rounded-[20px] border border-line bg-white/70 px-3.5 py-3">
      <Link href={`/studies/${encodeURIComponent(study.id)}`} className="min-w-0 flex-1 py-1">
        <span className="flex items-center gap-1.5">
          <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-px text-xs font-extrabold uppercase tracking-wide text-muted">
            Closed
          </span>
          <span className="truncate text-sm font-semibold text-muted">{study.firm}</span>
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink/70 line-through decoration-ink/30">
          {study.title}
        </span>
        {closedOn && <span className="block text-xs text-muted">Closed after {closedOn}</span>}
      </Link>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-bridge-link hover:bg-fog"
      >
        Remove
      </button>
    </article>
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
    // Posted today (PT) goes first, unless its link is dead.
    const aToday = isFreshToday(a.study) && !a.study.expired ? 1 : 0;
    const bToday = isFreshToday(b.study) && !b.study.expired ? 1 : 0;
    if (bToday !== aToday) return bToday - aToday;
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
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
        active
          ? "bg-bridge text-white"
          : "border border-line bg-white text-ink hover:bg-bridge-tint"
      }`}
    >
      {label}
      {typeof count === "number" && (
        <span className={`text-xs font-semibold ${active ? "text-white/90" : "text-muted"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function FilterEmpty({ onReset }: { onReset: () => void }) {
  return (
    <FogEmpty
      title="Nothing in this filter"
      body="Nothing open matches right now. New studies usually show up midweek."
    >
      <button
        type="button"
        onClick={onReset}
        className={PRIMARY_BTN}
      >
        Show all studies
      </button>
    </FogEmpty>
  );
}

const PRIMARY_BTN =
  "inline-flex min-h-12 items-center rounded-[14px] bg-bridge px-5 text-base font-bold text-white transition hover:bg-bridge-dark";
const SECONDARY_BTN =
  "inline-flex min-h-12 items-center rounded-[14px] border border-line bg-white px-5 text-base font-semibold text-ink transition hover:bg-bridge-tint";

function FogEmpty({
  title,
  body,
  children,
  footnote,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
  footnote?: string;
}) {
  return (
    <div className="rounded-[22px] border-[1.5px] border-dashed border-line bg-white px-5 py-8 text-center">
      <BridgeInFog />
      <p className="mt-3.5 font-display text-[21px] font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-[14.5px] leading-relaxed text-muted">
        {body}
      </p>
      {children && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
      )}
      {footnote && <p className="mt-4 text-xs text-muted">{footnote}</p>}
    </div>
  );
}

function IncompleteProfileCard({ onboarded }: { onboarded: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-line bg-bay-tint px-4 py-3">
      <p className="min-w-0 flex-1 text-sm leading-snug text-stone-700">
        <span className="font-semibold text-bay">Optional:</span>{" "}
        {onboarded
          ? "fill in a few gaps for better picks."
          : "add your age and ZIP and we’ll point out the best fits."}
      </p>
      <Link
        href="/onboarding/about"
        className="inline-flex min-h-11 shrink-0 items-center rounded-[14px] bg-bay px-3.5 text-sm font-bold text-white hover:opacity-90"
      >
        {onboarded ? "Update" : "Add details"}
      </Link>
    </div>
  );
}

function ForYouGate() {
  return (
    <div className="rounded-[22px] border border-line bg-white px-5 py-8 text-center shadow-card">
      <p className="text-xs font-bold uppercase tracking-wide text-sage-600">
        For you
      </p>
      <p className="mt-2 font-display text-xl text-sage-900">
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
  total,
}: {
  tab: FeedTab;
  browse: BrowseView;
  hasAnyStudies: boolean;
  listEmpty: boolean;
  prefsMiss: boolean;
  /** True when server published store has no approved email studies yet. */
  publishedEmpty: boolean;
  total: number;
}) {
  const browseLabel =
    total > 0 ? `Browse ${total} stud${total === 1 ? "y" : "ies"}` : "Browse studies";

  if (tab === "saved") {
    return (
      <FogEmpty
        title="Nothing saved yet"
        body="Tap the heart on anything that looks fun. We’ll keep it here so you don’t lose it in the fog."
      >
        <Link href="/feed" className={PRIMARY_BTN}>
          {browseLabel}
        </Link>
      </FogEmpty>
    );
  }

  if (tab === "applied") {
    return (
      <FogEmpty
        title="Nothing tried yet"
        body="When you open a firm’s sign-up page from here, we mark it so you remember what you’ve already tapped."
      >
        <Link href="/feed" className={PRIMARY_BTN}>
          {browseLabel}
        </Link>
      </FogEmpty>
    );
  }

  if (prefsMiss) {
    return (
      <FogEmpty
        title="Nothing for you just yet"
        body="Your preferences filtered these out. Every study is still under All."
      >
        <Link href="/feed" className={PRIMARY_BTN}>
          See all studies
        </Link>
        <Link href="/onboarding/preferences" className={SECONDARY_BTN}>
          Tweak preferences
        </Link>
      </FogEmpty>
    );
  }

  const hiddenAll = listEmpty && hasAnyStudies;
  void publishedEmpty;

  return (
    <FogEmpty
      title={hiddenAll ? "You’ve cleared the list" : "Quiet day around the Bay"}
      body={
        hiddenAll
          ? "You hid everything that’s open. New studies will show up here as they come in."
          : "New studies usually show up midweek. We’ll ping you."
      }
      footnote={`${SEED_FIRM_COUNT} verified Bay Area firms · Never a fee`}
    >
      {browse === "foryou" && (
        <Link href="/feed" className={PRIMARY_BTN}>
          See all studies
        </Link>
      )}
      <Link href="/alerts" className={browse === "foryou" ? SECONDARY_BTN : PRIMARY_BTN}>
        Turn on alerts
      </Link>
      <Link href="/about/verify" className={SECONDARY_BTN}>
        How we pick
      </Link>
    </FogEmpty>
  );
}
