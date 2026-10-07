"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { isSeedStudy } from "@/data/studies";
import { useFeedStudies } from "@/hooks/useFeedStudies";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfile";
import {
  computeMatchPercent,
  explainMatch,
  isProfileMatch,
} from "@/lib/match";
import {
  applyButtonText,
  cleanDescription,
  cleanTitle,
  firmInitial,
  firmName,
  firmTone,
  hourlyRate,
  isFresh,
  lengthLabel,
  modalityLabel,
  payBadge,
  payDetail,
  studyCode,
  typeLabel,
} from "@/lib/display";
import { bumpOpen } from "@/lib/analytics";
import { FillScreenerHelper } from "@/components/FillScreenerHelper";
import { CopyNextHelper } from "@/components/CopyNextHelper";
import { pilotFirmFor } from "@/lib/copyNext";
import { HeadlineTag } from "@/components/HeadlineTag";
import { AccessTag, CopyCode } from "@/components/LoginSteps";
import {
  joinedPrimaryLabel,
  loginAccess,
  memberLabel,
  primaryLabel,
  primaryUrl,
} from "@/lib/firmAccess";
import { useJoinedFirms } from "@/hooks/useJoinedFirms";
import { markJoinPending } from "@/lib/joinedFirms";
import { useNow } from "@/hooks/useNow";
import { closesLabel, isClosingSoon, postedAgo } from "@/lib/expiry";

export default function StudyDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getById, getClosedById, ready: studiesReady } = useFeedStudies();
  const study = getById(id);
  const closedStudy = study ? undefined : getClosedById(id);
  const { profile, ready, toggleSaved, dismissStudy, markApplied } =
    useProfile();
  const { seeMatch, isNewMatch } = useNotifications();
  const router = useRouter();
  const now = useNow();
  const { isJoined, toggle: toggleJoined } = useJoinedFirms();

  useEffect(() => {
    if (study && isProfileMatch(study, profile)) {
      seeMatch(study.id);
    }
  }, [study, profile, seeMatch]);

  useEffect(() => {
    if (study) {
      bumpOpen();
    }
    // Count once per study id mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?.id]);

  if (!ready || !studiesReady) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </div>
      </AppShell>
    );
  }

  if (!study && closedStudy) {
    const saved = profile.savedStudyIds.includes(closedStudy.id);
    const closedOn = closedStudy.closedAt
      ? new Date(Date.parse(closedStudy.closedAt) - 1).toLocaleDateString("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : null;
    return (
      <AppShell showNav={false}>
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-fog/95 px-2 backdrop-blur">
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-ink hover:bg-white/70"
          >
            ← All studies
          </Link>
        </header>
        <div className="px-5 pb-16 pt-10">
          <div className="rounded-[20px] border border-line bg-white p-6 text-center shadow-card">
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-muted">
              Closed
            </span>
            <h1 className="mt-3 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
              This study has closed
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              <b className="font-semibold text-ink">{closedStudy.title}</b>
              {closedStudy.firm ? <> from {closedStudy.firm}</> : null}
              {closedOn ? <> stopped taking sign-ups after {closedOn}.</> : <> is no longer taking sign-ups.</>}{" "}
              We hide studies once their dates pass so nobody signs up for one that&apos;s over.
            </p>
            <Link
              href="/feed"
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-bridge px-4 text-[15px] font-bold text-white hover:bg-bridge-dark"
            >
              See open studies
            </Link>
            {saved && (
              <button
                type="button"
                onClick={() => toggleSaved(closedStudy.id)}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-bridge-link hover:bg-fog"
              >
                Remove from Saved
              </button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!study) {
    return (
      <AppShell>
        <div className="px-5 py-16 text-center">
          <p className="font-display text-xl text-sage-900">Study not found</p>
          <Link
            href="/feed"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-sage-600"
          >
            ← Back to feed
          </Link>
        </div>
      </AppShell>
    );
  }

  const match = computeMatchPercent(study, profile);
  const reasons = explainMatch(study, profile);
  const saved = profile.savedStudyIds.includes(study.id);
  const applied = profile.appliedStudyIds.includes(study.id);
  const matched = isProfileMatch(study, profile);
  const neu = isNewMatch(study.id, matched);
  const title = cleanTitle(study);
  const code = studyCode(study);
  const pay = payBadge(study);
  const fullPay = payDetail(study);
  const length = lengthLabel(study);
  const hourly = hourlyRate(study);
  const about = cleanDescription(study);
  const firmLabel = firmName(study);
  const login = loginAccess(study);
  const member = !!login && isJoined(login.firmId);
  const ctaText = login
    ? member
      ? joinedPrimaryLabel(login)
      : primaryLabel(login)
    : applyButtonText(study);
  const ctaHref = login ? (member ? login.memberUrl : primaryUrl(login)) : study.applyUrl;
  const joinTap = () => {
    if (login?.firmId && login.joinUrl) markJoinPending(login.firmId);
  };
  const posted = now != null ? postedAgo(study.publishedAt, now) : null;
  const pilot = pilotFirmFor(study);

  return (
    <AppShell showNav={false}>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-fog/95 px-2 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/feed");
          }}
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold text-ink hover:bg-white/70"
        >
          ← Back
        </button>
        <Link
          href="/feed"
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-bridge-link hover:bg-white/70"
        >
          All studies
        </Link>
      </header>

      <div className="px-5 pb-36 pt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${firmTone(study)}`}
          >
            {firmInitial(study)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">
              {firmLabel}
            </p>
            <p className="truncate text-xs text-muted">{study.firmDomain}</p>

          </div>
          {study.verified && (
            <div className="ml-auto shrink-0">
              <VerifiedBadge href="/about/verify" />
            </div>
          )}
        </div>

        <h1 className="mt-3.5 break-words font-display text-[26px] font-bold leading-[1.15] tracking-tight text-ink">
          {title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-xl px-3 py-0.5 font-display tracking-tight ${
              pay.known
                ? "bg-cash-tint text-[28px] font-extrabold text-cash"
                : "bg-stone-100 py-1.5 text-lg font-bold text-muted"
            }`}
          >
            {pay.text}
          </span>
          {(posted || hourly) && (
            <span className="text-sm text-muted">
              {posted}
              {posted && hourly ? " · " : ""}
              {hourly}
            </span>
          )}
          <HeadlineTag study={study} isNew={neu || isFresh(study)} />
          <AccessTag access={login} member={member} />
          {study.expired && (
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
              Link expired
            </span>
          )}
          {applied && (
            <span className="rounded-full bg-bay-tint px-2.5 py-0.5 text-xs font-semibold text-bay">
              Applied
            </span>
          )}
        </div>
        {isClosingSoon(study) && (
          <p className="mt-1.5 text-sm font-semibold text-bridge-dark">
            Closing soon: last day listed here is {closesLabel(study)}.
          </p>
        )}
        {fullPay && (
          <p className="mt-1.5 text-sm text-stone-600">Pay: {fullPay}</p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-2">
          <FactTile label="When" value={study.when || "On the screener"} wide />
          <FactTile
            label="Where"
            value={
              study.modality === "remote"
                ? `From home · ${study.location}`
                : (study.address ?? study.location)
            }
            wide
          />
          <FactTile label="Length" value={length ?? "On the screener"} />
          <FactTile
            label="Type"
            value={`${typeLabel(study)} · ${modalityLabel(study)}`}
          />
        </dl>

        <section className="mt-4 rounded-[20px] border border-line bg-white p-4 shadow-card">
          <h2 className="font-display text-lg font-bold text-ink">
            How to sign up
          </h2>
          <ol className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">
            {login ? (
              <>
                <Step n={1}>
                  {member ? (
                    <>
                      Tap <strong className="font-semibold">{ctaText}</strong> below
                      {login.memberIsLogin
                        ? " and log in with your account."
                        : ` and sign in to your ${login.firm} account.`}{" "}
                      <a
                        href={login.joinUrl ?? login.memberUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={joinTap}
                        className="text-muted underline"
                      >
                        Not a member yet? Join
                      </a>
                    </>
                  ) : login.joinUrl ? (
                    <>
                      Tap <strong className="font-semibold">{ctaText}</strong> below
                      to make your own free account, or{" "}
                      <a
                        href={login.memberUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markApplied(study.id)}
                        className="font-semibold text-bridge-link underline"
                      >
                        {login.memberIsLogin ? "log in" : `visit ${login.firm}`}
                      </a>{" "}
                      if you already have one. This link can&apos;t open the study
                      itself.
                    </>
                  ) : (
                    <>
                      Tap <strong className="font-semibold">{ctaText}</strong> below
                      and join or log in with your own free account. This link
                      can&apos;t open the study itself.
                    </>
                  )}
                </Step>
                <Step n={2}>
                  {login.searchable && login.code ? (
                    <>
                      Then search this code in {login.where}:
                      <CodeChip code={login.code} />
                    </>
                  ) : (
                    <>
                      Then look for{" "}
                      <strong className="font-semibold">“{login.lookFor}”</strong> in{" "}
                      {login.where}.
                      {login.caveat ? ` ${login.caveat}` : ""}
                      {login.code && (
                        <>
                          {" "}Reference code:
                          <CodeChip code={login.code} />
                        </>
                      )}
                    </>
                  )}
                </Step>
              </>
            ) : (
              <>
                <Step n={1}>
                  {study.portalNote ? (
                    <>
                      Tap <strong className="font-semibold">{ctaText}</strong>{" "}
                      below. {study.portalNote}
                    </>
                  ) : (
                    <>
                      Tap <strong className="font-semibold">{ctaText}</strong>{" "}
                      below. It opens {study.firmDomain} in a new tab.
                    </>
                  )}
                </Step>
                <Step n={2}>
                  {code ? (
                    <>
                      Look for this study by its code:
                      <CodeChip code={code} />
                    </>
                  ) : (
                    <>Find this study by its title and answer the short screener quiz.</>
                  )}
                </Step>
              </>
            )}
            <Step n={3}>
              If you qualify, the firm books you and pays you directly. No fee,
              ever.
            </Step>
          </ol>

          {login?.firmId && (
            <button
              type="button"
              role="switch"
              aria-checked={member}
              onClick={() => toggleJoined(login.firmId!)}
              className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-[14px] border px-3.5 text-sm font-bold transition ${
                member
                  ? "border-cash/40 bg-cash-tint text-cash"
                  : "border-line bg-white text-ink hover:bg-fog"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                  member ? "border-cash bg-cash text-white" : "border-stone-300 bg-white"
                }`}
              >
                {member && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              I&apos;m a {login.firm} member
            </button>
          )}

          {pilot ? (
            <CopyNextHelper profile={profile} firm={pilot} studyId={study.id} />
          ) : (
            <FillScreenerHelper profile={profile} firmName={study.firm} embedded />
          )}
        </section>

        {study.expired && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
            <p className="font-semibold">Apply link looks dead or closed</p>
            <p className="mt-1 text-rose-900/90">
              Last check
              {study.linkCheckedAt
                ? ` ${formatPt(study.linkCheckedAt)}`
                : " (when an admin ran Check link)"}
              {study.linkStatus != null ? ` · HTTP ${study.linkStatus}` : ""}.
              The firm may have filled the study. You can still try the link or{" "}
              <a
                href={`https://${study.firmDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold underline"
              >
                visit {study.firmDomain}
              </a>
              .
            </p>
          </div>
        )}

        {about && (
          <section className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              About this study
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
              {about}
            </p>
          </section>
        )}

        {study.eligibility.notes && (
          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Who they’re looking for
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
              {study.eligibility.notes}
            </p>
          </section>
        )}

        <section className="mt-5 rounded-[20px] border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Is it a fit?
            </h2>
            {profile.onboarded && (
              <span className="rounded-full bg-cash-tint px-2.5 py-0.5 text-xs font-semibold text-cash">
                {match}% match
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {profile.onboarded
              ? "Checked against your profile. Green is a fit, amber is a miss or gap."
              : "Optional. Add your details for personal fit reasons. You can apply either way."}
          </p>
          {!profile.onboarded && (
            <Link
              href="/onboarding/about"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-sage-800 underline"
            >
              Add details for better matches
            </Link>
          )}
          <ul className="mt-2 space-y-1.5">
            {reasons.map((r) => (
              <li
                key={r.label}
                className={`flex items-start gap-2 text-sm ${
                  r.ok ? "text-stone-700" : "text-stone-500"
                }`}
              >
                <span
                  className={`mt-0.5 text-xs font-bold ${
                    r.ok ? "text-sage-600" : "text-amber-600"
                  }`}
                  aria-hidden
                >
                  {r.ok ? "✓" : "!"}
                </span>
                {r.label}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          {study.verified ? (
            <>
              <span className="font-semibold text-cash">Verified firm</span>
              {" · "}
              Allowlisted Bay Area source
              {isSeedStudy(study.id)
                ? " · sample listing for local demo only"
                : " · checked by a person before it’s listed"}
              .{" "}
            </>
          ) : (
            <>Unverified source. Confirm the firm before you share details. </>
          )}
          <Link
            href="/about/verify"
            className="inline-flex min-h-11 items-center font-medium text-sage-800 underline"
          >
            How we pick studies
          </Link>
        </p>

        <button
          type="button"
          onClick={() => {
            dismissStudy(study.id);
            router.push("/feed");
          }}
          className="mt-2 min-h-11 w-full py-3 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Not for me, hide it
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur safe-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 pt-2.5">
          <button
            type="button"
            onClick={() => toggleSaved(study.id)}
            aria-pressed={saved}
            aria-label={saved ? "Unsave study" : "Save study"}
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border transition active:scale-95 ${
              saved
                ? "border-bridge/30 bg-bridge-tint text-bridge"
                : "border-line bg-white text-stone-500"
            }`}
          >
            <svg
              className="h-6 w-6"
              fill={saved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
              />
            </svg>
          </button>
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (login && !member) joinTap();
              markApplied(study.id);
            }}
            className={`flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] px-4 text-base font-bold transition ${
              study.expired
                ? "border border-rose-300 bg-white text-rose-900 hover:bg-rose-50"
                : "bg-bridge text-white hover:bg-bridge-dark"
            }`}
          >
            <span className="truncate">{ctaText}</span>
            <span aria-hidden className="text-sm font-normal opacity-90">
              ↗
            </span>
          </a>
        </div>
        {login ? (
          <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-x-3 px-4 pb-0.5 text-xs">
            {member ? (
              <a
                href={login.joinUrl ?? login.memberUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={joinTap}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-muted underline underline-offset-2"
              >
                Not a member yet? Join
              </a>
            ) : login.joinUrl ? (
              <a
                href={login.memberUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markApplied(study.id)}
                className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-bridge-link underline underline-offset-2"
              >
                {memberLabel(login)}
              </a>
            ) : (
              <span className="truncate text-muted">Use your own free account</span>
            )}
            {login.searchable && login.code ? (
              <span className="flex shrink-0 items-center gap-1 text-muted">
                then search <CopyCode code={login.code} compact />
              </span>
            ) : (
              <span className="shrink-0 text-muted">then find the study</span>
            )}
          </div>
        ) : (
          <p className="mx-auto max-w-lg truncate px-4 pb-1 pt-1 text-center text-xs text-muted">
            Opens {study.firmDomain} · we mark it Applied for you
          </p>
        )}
      </div>
    </AppShell>
  );
}

function FactTile({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border border-line bg-white px-3 py-2.5 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <dt className="text-xs font-semibold text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[14.5px] font-semibold leading-snug text-ink">
        {value}
      </dd>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bridge-tint text-xs font-bold text-bridge-dark"
      >
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <code className="rounded-lg border border-dashed border-line bg-fog px-2.5 py-1.5 font-mono text-sm font-semibold text-ink">
        {code}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-semibold text-bridge-link underline"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
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
