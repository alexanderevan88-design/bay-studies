"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_EMAILS } from "@/data/sampleEmails";
import { SOURCES, extractEmailDomain } from "@/data/sources";
import { notifyFeedUpdated } from "@/hooks/useFeedStudies";
import {
  ANALYTICS_EVENT,
  AUTO_PUBLISH_CONFIDENCE_THRESHOLD,
  bumpFalseReject,
  bumpPublish,
  canAutoPublish,
  clearAutoPublishPref,
  isNewFromDomain,
  loadAnalytics,
  loadAutoPublishEnabled,
  resetAnalytics,
  saveAutoPublishEnabled,
  trustFromDomain,
  type AnalyticsCounters,
} from "@/lib/analytics";
import {
  buildParseLog,
  draftToStudy,
  parseEmail,
} from "@/lib/parseEmail";
import { onStudyApproved } from "@/lib/notify";
import {
  clearAllDemoData,
  loadIngestStates,
  loadPublishedStudies,
  patchPublishedStudy,
  removePublishedStudy,
  setIngestState,
  upsertPublishedStudy,
} from "@/lib/storage";
import type {
  DraftStatus,
  IngestItemState,
  ParseLog,
  RawEmail,
  Study,
  StudyDraft,
} from "@/lib/types";

type Row = {
  email: RawEmail;
  draft: StudyDraft;
  parseLog: ParseLog;
  status: DraftStatus;
  publishedStudyId?: string;
  fromDomain: string | null;
  isNewDomain: boolean;
  autoEligible: boolean;
};

type LinkCheckState = {
  checking: boolean;
  lastMessage: string | null;
};

export default function AdminIngestPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [inboxSource, setInboxSource] = useState<"live" | "fixtures" | "loading">(
    "loading"
  );
  const [liveEmails, setLiveEmails] = useState<RawEmail[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [published, setPublished] = useState<Study[]>([]);
  const [linkCheck, setLinkCheck] = useState<LinkCheckState>({
    checking: false,
    lastMessage: null,
  });
  const [autoPublishOn, setAutoPublishOn] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsCounters>({
    publishes: 0,
    opens: 0,
    falseRejects: 0,
  });
  const autoRanRef = useRef(false);

  const rebuild = useCallback((emails?: RawEmail[]) => {
    const list =
      emails ??
      liveEmails ??
      (inboxSource === "live" ? [] : SAMPLE_EMAILS);
    const states = loadIngestStates();
    const next: Row[] = list.map((email) => {
      const draft = parseEmail(email);
      const parseLog = buildParseLog(email, draft);
      const state: IngestItemState | undefined = states[email.id];
      const fromDomain = extractEmailDomain(email.from);
      const newDomain = isNewFromDomain(fromDomain);
      return {
        email,
        draft,
        parseLog,
        status: state?.status ?? "pending",
        publishedStudyId: state?.publishedStudyId,
        fromDomain,
        isNewDomain: newDomain,
        autoEligible: canAutoPublish({
          confidence: draft.confidence,
          fromAllowed: draft.fromAllowed,
          fromDomain,
        }),
      };
    });
    setRows(next);
    setSelectedId((prev) => {
      if (prev && next.some((r) => r.email.id === prev)) return prev;
      return next[0]?.email.id ?? null;
    });
    const pub = loadPublishedStudies();
    setPublished(pub);
    setPublishedCount(pub.length);
    setAnalytics(loadAnalytics());
    setAutoPublishOn(loadAutoPublishEnabled());
    setReady(true);
    return next;
  }, [liveEmails, inboxSource]);

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      const data = (await res.json()) as {
        ok?: boolean;
        count?: number;
        items?: { email: RawEmail }[];
      };
      if (res.ok && data.ok && Array.isArray(data.items) && data.items.length > 0) {
        const emails = data.items.map((i) => i.email);
        setLiveEmails(emails);
        setInboxSource("live");
        rebuild(emails);
        return;
      }
    } catch {
      /* fall through to fixtures */
    }
    setLiveEmails(null);
    setInboxSource("fixtures");
    rebuild(SAMPLE_EMAILS);
  }, [rebuild]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const onAnalytics = () => setAnalytics(loadAnalytics());
    window.addEventListener(ANALYTICS_EVENT, onAnalytics);
    return () => window.removeEventListener(ANALYTICS_EVENT, onAnalytics);
  }, []);

  const selected = useMemo(
    () => rows.find((r) => r.email.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const publishRow = useCallback(
    (emailId: string, opts: { viaAuto: boolean; trustDomain: boolean }) => {
      const row = rows.find((r) => r.email.id === emailId);
      if (!row) return false;
      if (!row.draft.fromAllowed) {
        flash("Blocked: From domain not on allowlist");
        return false;
      }
      if (opts.viaAuto && row.isNewDomain) {
        flash("New From domain — manual review required");
        return false;
      }
      if (
        opts.viaAuto &&
        row.draft.confidence < AUTO_PUBLISH_CONFIDENCE_THRESHOLD
      ) {
        flash(
          `Confidence ${row.draft.confidence}% < ${AUTO_PUBLISH_CONFIDENCE_THRESHOLD}% — use Approve`
        );
        return false;
      }

      const wasRejected = row.status === "rejected";
      const study = draftToStudy(row.draft, emailId);
      upsertPublishedStudy(study);
      setIngestState({
        emailId,
        status: "approved",
        publishedStudyId: study.id,
        reviewedAt: new Date().toISOString(),
      });
      if (opts.trustDomain && row.fromDomain) {
        trustFromDomain(row.fromDomain);
      }
      bumpPublish();
      if (wasRejected) {
        bumpFalseReject();
      }
      const { matched, notification } = onStudyApproved(study);
      notifyFeedUpdated();
      rebuild();
      const how = opts.viaAuto ? "Auto-published" : "Approved";
      if (matched && notification) {
        flash(
          `${how} → ${study.id}. Match! Toast queued: “${notification.title}”. Open /feed.`
        );
      } else {
        flash(
          `${how} → ${study.id}. ${
            matched ? "" : "No profile match (or not onboarded)."
          } Check /feed.`
        );
      }
      return true;
    },
    [rows, rebuild]
  );

  const approve = (emailId: string) => {
    publishRow(emailId, { viaAuto: false, trustDomain: true });
  };

  const autoPublish = (emailId: string) => {
    publishRow(emailId, { viaAuto: true, trustDomain: false });
  };

  // When global toggle is on, auto-publish eligible pending rows once per mount/toggle
  useEffect(() => {
    if (!ready || !autoPublishOn) {
      autoRanRef.current = false;
      return;
    }
    if (autoRanRef.current) return;
    const eligible = rows.filter(
      (r) => r.status === "pending" && r.autoEligible
    );
    if (eligible.length === 0) return;
    autoRanRef.current = true;
    let n = 0;
    for (const r of eligible) {
      const ok = publishRow(r.email.id, { viaAuto: true, trustDomain: false });
      if (ok) n += 1;
    }
    if (n > 0) {
      flash(`Auto-publish ran for ${n} eligible invite(s).`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot on toggle/ready
  }, [ready, autoPublishOn, rows]);

  const reject = (emailId: string) => {
    const row = rows.find((r) => r.email.id === emailId);
    if (row?.publishedStudyId) {
      removePublishedStudy(row.publishedStudyId);
    }
    setIngestState({
      emailId,
      status: "rejected",
      reviewedAt: new Date().toISOString(),
    });
    notifyFeedUpdated();
    rebuild();
    flash("Rejected — removed from feed if it was published.");
  };

  const resetDemo = () => {
    clearAllDemoData();
    clearAutoPublishPref();
    resetAnalytics();
    autoRanRef.current = false;
    notifyFeedUpdated();
    rebuild();
    flash("Cleared published + ingest + notifications + analytics demo state.");
  };

  const toggleAutoPublish = (on: boolean) => {
    saveAutoPublishEnabled(on);
    setAutoPublishOn(on);
    autoRanRef.current = false;
    flash(
      on
        ? `Auto-publish ON — ≥${AUTO_PUBLISH_CONFIDENCE_THRESHOLD}% + trusted From domains.`
        : "Auto-publish OFF — manual Approve only."
    );
  };

  const checkUrl = async (url: string) => {
    const res = await fetch(
      `/api/check-link?url=${encodeURIComponent(url)}`
    );
    return (await res.json()) as {
      ok: boolean;
      status: number | null;
      expired?: boolean;
      error?: string;
      checkedAt: string;
      url?: string;
    };
  };

  const checkSelectedLink = async () => {
    if (!selected?.draft.applyUrl && !selected?.publishedStudyId) {
      flash("No apply URL on this draft.");
      return;
    }
    const studyId = selected.publishedStudyId;
    const url =
      (studyId
        ? published.find((s) => s.id === studyId)?.applyUrl
        : undefined) ??
      selected.draft.applyUrl;
    if (!url) {
      flash("No apply URL to check.");
      return;
    }
    setLinkCheck({ checking: true, lastMessage: null });
    try {
      const result = await checkUrl(url);
      if (studyId) {
        patchPublishedStudy(studyId, {
          expired: !result.ok,
          linkStatus: result.status,
          linkCheckedAt: result.checkedAt,
        });
        notifyFeedUpdated();
        rebuild();
      }
      const msg = result.ok
        ? `Link OK (${result.status})`
        : `Marked expired — ${result.status ?? "no status"}${
            result.error ? `: ${result.error}` : ""
          }`;
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check failed";
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    }
  };

  const checkAllPublishedLinks = async () => {
    const list = loadPublishedStudies();
    if (list.length === 0) {
      flash("No published studies to check.");
      return;
    }
    setLinkCheck({ checking: true, lastMessage: null });
    let expiredCount = 0;
    try {
      for (const study of list) {
        const result = await checkUrl(study.applyUrl);
        if (!result.ok) expiredCount += 1;
        patchPublishedStudy(study.id, {
          expired: !result.ok,
          linkStatus: result.status,
          linkCheckedAt: result.checkedAt,
        });
      }
      notifyFeedUpdated();
      rebuild();
      const msg = `Checked ${list.length} link(s) — ${expiredCount} expired / non-2xx.`;
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Batch check failed";
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    }
  };

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const selectedPublished = selected?.publishedStudyId
    ? published.find((s) => s.id === selected.publishedStudyId)
    : undefined;

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="text-sm font-medium text-sage-700 hover:underline"
            >
              ← Feed
            </Link>
            <Link
              href="/admin/setup"
              className="text-sm font-medium text-stone-500 hover:underline"
              title="Deploy + Mailgun checklist"
            >
              Setup
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-semibold text-sage-900">
                  Email ingest
                </h1>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  admin demo
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Soft-launch · auto-publish ≥{AUTO_PUBLISH_CONFIDENCE_THRESHOLD}%
                · new domains always review
                {inboxSource === "live" ? (
                  <span className="ml-1 font-medium text-sage-700">
                    · live inbox ({rows.length})
                  </span>
                ) : inboxSource === "fixtures" ? (
                  <span className="ml-1 text-amber-700/80">
                    · fixtures (live inbox empty)
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Stat label="Pending" value={counts.pending} />
            <Stat label="Approved" value={counts.approved} />
            <Stat label="Rejected" value={counts.rejected} />
            <Stat label="Published" value={publishedCount} />
            <label
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium ${
                autoPublishOn
                  ? "border-sage-400 bg-sage-50 text-sage-900"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
              title={`When on, pending invites with confidence ≥${AUTO_PUBLISH_CONFIDENCE_THRESHOLD}% and a previously approved From domain publish automatically`}
            >
              <input
                type="checkbox"
                className="accent-sage-700"
                checked={autoPublishOn}
                onChange={(e) => toggleAutoPublish(e.target.checked)}
              />
              Auto-publish
            </label>
            <button
              type="button"
              disabled={linkCheck.checking || publishedCount === 0}
              onClick={checkAllPublishedLinks}
              className="rounded-lg border border-sage-300 bg-sage-50 px-2.5 py-1.5 font-medium text-sage-800 hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="HEAD/GET each published applyUrl via /api/check-link"
            >
              {linkCheck.checking ? "Checking…" : "Check all links"}
            </button>
            <button
              type="button"
              onClick={() => {
                void loadInbox().then(() => flash("Inbox refreshed from /api/inbox"));
              }}
              className="rounded-lg border border-sage-300 bg-sage-50 px-2.5 py-1.5 font-medium text-sage-800 hover:bg-sage-100"
              title="Reload from GET /api/inbox (falls back to fixtures if empty)"
            >
              Refresh inbox
            </button>
            <button
              type="button"
              onClick={resetDemo}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 font-medium text-stone-600 hover:bg-stone-50"
            >
              Reset demo
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="border-b border-sage-200 bg-sage-50 px-4 py-2 text-center text-sm text-sage-900">
          {toast}
        </div>
      )}
      {linkCheck.lastMessage && !toast && (
        <div className="border-b border-stone-200 bg-white px-4 py-1.5 text-center text-xs text-stone-600">
          Link health: {linkCheck.lastMessage}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {inboxSource === "live" ? "Live inbox" : "Sample raw emails"} ({rows.length})
            {inboxSource === "live" && (
              <span className="ml-1 rounded bg-sage-100 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-sage-800">
                API
              </span>
            )}
          </p>
          {rows.map((row) => {
            const pub = row.publishedStudyId
              ? published.find((s) => s.id === row.publishedStudyId)
              : undefined;
            return (
              <button
                key={row.email.id}
                type="button"
                onClick={() => setSelectedId(row.email.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedId === row.email.id
                    ? "border-sage-400 bg-white shadow-sm"
                    : "border-stone-200 bg-white/70 hover:border-sage-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium text-stone-900">
                    {row.email.subject}
                  </p>
                  <StatusPill status={row.status} />
                </div>
                <p className="mt-1 truncate text-xs text-stone-500">
                  {row.email.from}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      row.draft.fromAllowed
                        ? "bg-sage-100 text-sage-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {row.draft.fromAllowed ? "From OK" : "From blocked"}
                  </span>
                  {row.isNewDomain && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                      New domain
                    </span>
                  )}
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
                    {row.draft.confidence}% conf
                  </span>
                  {row.autoEligible && row.status === "pending" && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800">
                      Auto-ready
                    </span>
                  )}
                  {row.draft.pay != null && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
                      ${row.draft.pay}
                    </span>
                  )}
                  {pub?.expired && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800">
                      Expired
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 p-3 text-xs text-stone-500">
            <p className="font-semibold text-stone-700">
              {inboxSource === "live" ? "Live inbox" : "Fixtures (empty live inbox)"}
            </p>
            <p className="mt-1 leading-relaxed">
              {inboxSource === "live"
                ? "Loaded from GET /api/inbox (data/inbox.json). New mail arrives via POST /api/inbound (Mailgun) or POST /api/inbound/dev for local inject."
                : "No items in data/inbox.json yet — showing sample firm invites so you can demo Approve → feed. Inject a test with npm run dev:send-email, then Refresh inbox."}
            </p>
            {inboxSource !== "live" && (
              <p className="mt-2 text-[11px] text-stone-400">
                Soft launch: keep reviewing fixtures until Mailgun + YOUR_DOMAIN are live.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 p-3 text-xs text-stone-500">
            <p className="font-semibold text-stone-700">Allowlist</p>
            <ul className="mt-1 space-y-0.5">
              {SOURCES.map((s) => (
                <li key={s.id}>
                  {s.name}{" "}
                  <span className="text-stone-400">
                    ({s.fromDomains[0]})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="space-y-4">
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
              <p className="font-serif text-lg text-sage-900">
                {rows.length === 0 ? "Inbox is empty" : "Select an invite"}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {rows.length === 0
                  ? "Refresh after injecting via /api/inbound/dev, or fall back will show fixtures."
                  : "Pick a raw email on the left to review the parse draft, then Approve → feed or Reject."}
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Raw email
                    </p>
                    <h2 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                      {selected.email.subject}
                    </h2>
                    <dl className="mt-2 space-y-1 text-xs text-stone-600">
                      <div>
                        <span className="font-medium text-stone-400">From </span>
                        {selected.email.from}
                        {selected.isNewDomain && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                            New domain — review required
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-stone-400">To </span>
                        {selected.email.to}
                      </div>
                      <div>
                        <span className="font-medium text-stone-400">
                          Received{" "}
                        </span>
                        {formatPt(selected.email.receivedAt)}
                      </div>
                      <div>
                        <span className="font-medium text-stone-400">
                          Message-Id{" "}
                        </span>
                        <span className="font-mono">
                          {selected.email.messageId}
                        </span>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.draft.confidence >=
                      AUTO_PUBLISH_CONFIDENCE_THRESHOLD &&
                      selected.draft.fromAllowed && (
                        <button
                          type="button"
                          disabled={
                            selected.status === "approved" ||
                            selected.isNewDomain
                          }
                          onClick={() => autoPublish(selected.email.id)}
                          className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            selected.isNewDomain
                              ? "New From domain must be manually Approved once first"
                              : `Confidence ${selected.draft.confidence}% ≥ ${AUTO_PUBLISH_CONFIDENCE_THRESHOLD}%`
                          }
                        >
                          Auto-publish
                        </button>
                      )}
                    <button
                      type="button"
                      disabled={selected.status === "approved"}
                      onClick={() => approve(selected.email.id)}
                      className="rounded-xl bg-sage-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve → feed
                    </button>
                    <button
                      type="button"
                      disabled={selected.status === "rejected"}
                      onClick={() => reject(selected.email.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={
                        linkCheck.checking ||
                        !(
                          selected.draft.applyUrl ||
                          selectedPublished?.applyUrl
                        )
                      }
                      onClick={checkSelectedLink}
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Check apply link
                    </button>
                  </div>
                </div>
                {selected.isNewDomain && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <strong>New From domain.</strong> Manual{" "}
                    <em>Approve → feed</em> unlocks this domain for future
                    auto-publish. Auto-publish stays disabled until then.
                  </div>
                )}
                <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 whitespace-pre-wrap">
                  {selected.email.text}
                </pre>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Extracted draft JSON
                    </p>
                    <p className="text-sm text-stone-600">
                      Confidence{" "}
                      <strong className="text-sage-800">
                        {selected.draft.confidence}%
                      </strong>
                      {selected.draft.confidence >=
                      AUTO_PUBLISH_CONFIDENCE_THRESHOLD ? (
                        <span className="ml-1 text-violet-700">
                          (≥{AUTO_PUBLISH_CONFIDENCE_THRESHOLD}% auto threshold)
                        </span>
                      ) : (
                        <span className="ml-1 text-stone-400">
                          (below auto threshold)
                        </span>
                      )}
                      {selected.draft.matchedSourceId && (
                        <>
                          {" "}
                          · source{" "}
                          <strong>{selected.draft.matchedSourceId}</strong>
                        </>
                      )}
                    </p>
                  </div>
                  <StatusPill status={selected.status} />
                </div>
                {selected.draft.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    {selected.draft.warnings.map((w) => (
                      <li key={w}>⚠ {w}</li>
                    ))}
                  </ul>
                )}
                <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl bg-stone-900 p-3 text-[11px] leading-relaxed text-emerald-100">
                  {JSON.stringify(selected.draft, null, 2)}
                </pre>
                <details className="mt-3 text-xs text-stone-500">
                  <summary className="cursor-pointer font-medium text-stone-600">
                    Parse log
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-lg bg-stone-50 p-2">
                    {JSON.stringify(selected.parseLog, null, 2)}
                  </pre>
                </details>
                {selected.publishedStudyId && (
                  <div className="mt-3 space-y-1 text-sm text-sage-800">
                    <p>
                      Live on feed as{" "}
                      <Link
                        href={`/studies/${selected.publishedStudyId}`}
                        className="font-semibold underline"
                      >
                        {selected.publishedStudyId}
                      </Link>
                    </p>
                    {selectedPublished && (
                      <p className="text-xs text-stone-500">
                        Link:{" "}
                        {selectedPublished.expired
                          ? `expired (HTTP ${selectedPublished.linkStatus ?? "—"})`
                          : selectedPublished.linkCheckedAt
                            ? `OK (HTTP ${selectedPublished.linkStatus})`
                            : "not checked yet"}
                        {selectedPublished.linkCheckedAt &&
                          ` · ${formatPt(selectedPublished.linkCheckedAt)}`}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold uppercase tracking-wide text-stone-400">
              Analytics
            </span>
            <Stat label="Publishes" value={analytics.publishes} />
            <Stat label="Opens" value={analytics.opens} />
            <Stat label="False rejects" value={analytics.falseRejects} />
          </div>
          <p className="text-stone-400">
            localStorage · demo only · opens count on study detail
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatusPill({ status }: { status: DraftStatus }) {
  const styles: Record<DraftStatus, string> = {
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-sage-100 text-sage-900",
    rejected: "bg-rose-100 text-rose-900",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-stone-100 px-2 py-1 text-stone-700">
      <span className="font-semibold text-stone-900">{value}</span> {label}
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
