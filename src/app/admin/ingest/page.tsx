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
import {
  draftToEnrich,
  isTipStyleDraft,
  mergeEnrichIntoDraft,
  type EnrichFields,
} from "@/lib/enrich";
import { findLiveNearDuplicate, type NearDuplicateHit } from "@/lib/nearDuplicate";
import { onStudyApproved } from "@/lib/notify";
import {
  clearAllDemoData,
  loadIngestStates,
  setIngestState,
} from "@/lib/storage";
import {
  apiPatchPublished,
  apiRemovePublished,
  apiUpsertPublished,
  fetchPublishedStudies,
} from "@/lib/publishedApi";
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
  const [reparsing, setReparsing] = useState(false);
  /** Operator edits keyed by email id — Approve uses these over raw draft. */
  const [enrichById, setEnrichById] = useState<Record<string, EnrichFields>>(
    {}
  );
  const [autoPublishOn, setAutoPublishOn] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsCounters>({
    publishes: 0,
    opens: 0,
    falseRejects: 0,
  });
  const autoRanRef = useRef(false);
  /** Set after Approve finds a live near-duplicate; second click publishes. */
  const [dupHold, setDupHold] = useState<{
    emailId: string;
    hit: NearDuplicateHit;
  } | null>(null);
  // Refs so rebuild/loadInbox stay stable. Putting liveEmails in those
  // callbacks and then listing loadInbox in an effect re-fetches forever:
  // setLiveEmails(new array) → new rebuild → new loadInbox → effect again.
  const liveEmailsRef = useRef<RawEmail[] | null>(null);
  const inboxSourceRef = useRef(inboxSource);
  liveEmailsRef.current = liveEmails;
  inboxSourceRef.current = inboxSource;

  const rebuild = useCallback((emails?: RawEmail[], publishedOverride?: Study[]) => {
    const source = inboxSourceRef.current;
    const list =
      emails ??
      liveEmailsRef.current ??
      (source === "live" ? [] : SAMPLE_EMAILS);
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
    // Mutations already returned the list — don't GET /api/published again.
    if (publishedOverride) {
      setPublished(publishedOverride);
      setPublishedCount(publishedOverride.length);
    } else {
      void fetchPublishedStudies({ fresh: true }).then((pub) => {
        setPublished(pub);
        setPublishedCount(pub.length);
      });
    }
    setAnalytics(loadAnalytics());
    setAutoPublishOn(loadAutoPublishEnabled());
    setReady(true);
    return next;
  }, []);

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
        liveEmailsRef.current = emails;
        inboxSourceRef.current = "live";
        setLiveEmails(emails);
        setInboxSource("live");
        rebuild(emails);
        return;
      }
    } catch {
      /* fall through to fixtures */
    }
    liveEmailsRef.current = null;
    inboxSourceRef.current = "fixtures";
    setLiveEmails(null);
    setInboxSource("fixtures");
    rebuild(SAMPLE_EMAILS);
  }, [rebuild]);

  // Once on mount. Refresh calls loadInbox directly. Do not depend on
  // loadInbox: a live inbox used to change its identity every fetch and loop.
  useEffect(() => {
    void loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onAnalytics = () => setAnalytics(loadAnalytics());
    window.addEventListener(ANALYTICS_EVENT, onAnalytics);
    return () => window.removeEventListener(ANALYTICS_EVENT, onAnalytics);
  }, []);

  const selected = useMemo(
    () => rows.find((r) => r.email.id === selectedId) ?? null,
    [rows, selectedId]
  );

  const getEnrich = useCallback(
    (row: Row): EnrichFields =>
      enrichById[row.email.id] ?? draftToEnrich(row.draft),
    [enrichById]
  );

  const patchEnrich = useCallback(
    (emailId: string, patch: Partial<EnrichFields>, baseDraft: StudyDraft) => {
      setEnrichById((prev) => {
        const current = prev[emailId] ?? draftToEnrich(baseDraft);
        return { ...prev, [emailId]: { ...current, ...patch } };
      });
      setDupHold((prev) => (prev?.emailId === emailId ? null : prev));
    },
    []
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const publishRow = useCallback(
    async (
      emailId: string,
      opts: { viaAuto: boolean; trustDomain: boolean; confirmDuplicate?: boolean }
    ): Promise<boolean> => {
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
      const enrich = getEnrich(row);
      const merged = mergeEnrichIntoDraft(row.draft, enrich);
      if (!merged.applyUrl?.trim()) {
        flash("Add a screener / portal link before publishing.");
        return false;
      }
      if (!merged.title?.trim()) {
        flash("Add a title before publishing.");
        return false;
      }
      const study = draftToStudy(merged, emailId);
      if (!opts.confirmDuplicate) {
        const live = await fetchPublishedStudies({ fresh: true });
        setPublished(live);
        setPublishedCount(live.length);
        const hit = findLiveNearDuplicate(study, live);
        if (hit) {
          if (opts.viaAuto) {
            flash(
              `Auto-publish skipped “${study.title}” — looks like “${hit.title}” already on the feed. Use Approve anyway.`
            );
            return false;
          }
          setDupHold({ emailId, hit });
          flash(
            `Looks like “${hit.title}” is already on the feed. Approve anyway to publish.`
          );
          return false;
        }
      }
      setDupHold((prev) => (prev?.emailId === emailId ? null : prev));
      const upserted = await apiUpsertPublished(study);
      const publishedList = upserted.studies;
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
      rebuild(undefined, publishedList);
      const how = opts.viaAuto ? "Auto-published" : "Approved";
      const blobNote =
        upserted.blobStatus === "suspended"
          ? " Blob suspended — feed uses fallback until you unsuspend Storage in Vercel."
          : upserted.warning
            ? " " + upserted.warning
            : "";
      if (matched && notification) {
        flash(
          `${how} → ${study.id}. Match! Toast queued: “${notification.title}”. Open /feed.${blobNote}`
        );
      } else {
        flash(
          `${how} → ${study.id}. ${
            matched ? "" : "No profile match (or not onboarded)."
          } Check /feed.${blobNote}`
        );
      }
      return true;
    },
    [rows, rebuild, getEnrich]
  );

  const approve = (emailId: string, confirmDuplicate = false) => {
    void publishRow(emailId, {
      viaAuto: false,
      trustDomain: true,
      confirmDuplicate,
    });
  };

  const autoPublish = (emailId: string) => {
    void publishRow(emailId, { viaAuto: true, trustDomain: false });
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
    void (async () => {
      let n = 0;
      for (const r of eligible) {
        const ok = await publishRow(r.email.id, {
          viaAuto: true,
          trustDomain: false,
        });
        if (ok) n += 1;
      }
      if (n > 0) {
        flash(`Auto-publish ran for ${n} eligible invite(s).`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot on toggle/ready
  }, [ready, autoPublishOn, rows]);

  const reject = (emailId: string) => {
    void (async () => {
      const row = rows.find((r) => r.email.id === emailId);
      const publishedList = row?.publishedStudyId
        ? await apiRemovePublished(row.publishedStudyId)
        : undefined;
      setIngestState({
        emailId,
        status: "rejected",
        reviewedAt: new Date().toISOString(),
      });
      notifyFeedUpdated();
      rebuild(undefined, publishedList);
      flash("Rejected — removed from feed if it was published.");
    })();
  };

  const resetDemo = () => {
    clearAllDemoData();
    clearAutoPublishPref();
    resetAnalytics();
    autoRanRef.current = false;
    setEnrichById({});
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
    if (
      !selected?.draft.applyUrl &&
      !selected?.publishedStudyId &&
      !(selected && getEnrich(selected).applyUrl.trim())
    ) {
      flash("No apply URL on this draft.");
      return;
    }
    const studyId = selected.publishedStudyId;
    const url =
      (studyId
        ? published.find((s) => s.id === studyId)?.applyUrl
        : undefined) ??
      (getEnrich(selected).applyUrl.trim() || undefined) ??
      selected.draft.applyUrl;
    if (!url) {
      flash("No apply URL to check.");
      return;
    }
    setLinkCheck({ checking: true, lastMessage: null });
    try {
      const result = await checkUrl(url);
      if (studyId) {
        const publishedList = await apiPatchPublished(studyId, {
          expired: !result.ok,
          linkStatus: result.status,
          linkCheckedAt: result.checkedAt,
        });
        notifyFeedUpdated();
        rebuild(undefined, publishedList);
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
    const list = await fetchPublishedStudies({ fresh: true });
    if (list.length === 0) {
      flash("No published studies to check.");
      return;
    }
    setLinkCheck({ checking: true, lastMessage: null });
    let expiredCount = 0;
    let publishedList = list;
    try {
      for (const study of list) {
        const result = await checkUrl(study.applyUrl);
        if (!result.ok) expiredCount += 1;
        publishedList = await apiPatchPublished(study.id, {
          expired: !result.ok,
          linkStatus: result.status,
          linkCheckedAt: result.checkedAt,
        });
      }
      notifyFeedUpdated();
      rebuild(undefined, publishedList);
      const msg = `Checked ${list.length} link(s) — ${expiredCount} expired / non-2xx.`;
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Batch check failed";
      setLinkCheck({ checking: false, lastMessage: msg });
      flash(msg);
    }
  };

  /** Re-run parseEmail on a live inbox item; persist draft+parseLog to inbox store. */
  const reparseSelected = async () => {
    if (!selected) return;
    if (inboxSource !== "live") {
      flash("Re-parse only applies to live inbox items (not fixtures).");
      return;
    }
    setReparsing(true);
    try {
      const res = await fetch("/api/inbox/reparse", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selected.email.id,
          messageId: selected.email.messageId,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        item?: { email: RawEmail; draft: StudyDraft; parseLog: ParseLog };
        recoveredFrom?: string | null;
        fromAllowed?: boolean;
        confidence?: number;
        matchedSourceId?: string | null;
      };
      if (!res.ok || !data.ok || !data.item) {
        flash(data.error ?? "Re-parse failed");
        return;
      }
      const { email, draft, parseLog } = data.item;
      setRows((prev) =>
        prev.map((r) => {
          if (r.email.id !== email.id) return r;
          const fromDomain = extractEmailDomain(email.from);
          const newDomain = isNewFromDomain(fromDomain);
          return {
            ...r,
            email,
            draft,
            parseLog,
            fromDomain,
            isNewDomain: newDomain,
            autoEligible: canAutoPublish({
              confidence: draft.confidence,
              fromAllowed: draft.fromAllowed,
              fromDomain,
            }),
          };
        })
      );
      // Clear enrich overrides so form shows fresh draft values
      setEnrichById((prev) => {
        const next = { ...prev };
        delete next[email.id];
        return next;
      });
      const bits = [
        `Re-parsed · ${data.confidence ?? draft.confidence}% conf`,
        data.fromAllowed ? "From OK" : "From blocked",
      ];
      if (data.recoveredFrom) bits.push(`recoveredFrom: ${data.recoveredFrom}`);
      if (data.matchedSourceId) bits.push(`source ${data.matchedSourceId}`);
      flash(bits.join(" · "));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Re-parse failed");
    } finally {
      setReparsing(false);
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
  const selectedEnrich = selected ? getEnrich(selected) : null;
  const tipStyle = selected ? isTipStyleDraft(selected.draft) : false;
  const enrichDisabled = selected?.status === "approved";
  const previewDup = useMemo(() => {
    if (!selected || !selectedEnrich) return null;
    const merged = mergeEnrichIntoDraft(selected.draft, selectedEnrich);
    return findLiveNearDuplicate(
      draftToStudy(merged, selected.email.id),
      published
    );
  }, [selected, selectedEnrich, published]);
  const dupHit =
    dupHold && selected && dupHold.emailId === selected.email.id
      ? dupHold.hit
      : previewDup;
  const dupNeedsConfirm = Boolean(
    dupHold && selected && dupHold.emailId === selected.email.id
  );

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
              className="text-sm font-medium text-sage-600 hover:underline"
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
                  <span className="ml-1 font-medium text-sage-600">
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
                  {row.draft.matchedSourceId === "craigslist-sfbay-etc"
                    ? `Craigslist etc · ${row.draft.firm ?? "unverified"}`
                    : row.email.from}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      row.draft.matchedSourceId === "craigslist-sfbay-etc"
                        ? "bg-amber-100 text-amber-900"
                        : row.draft.fromAllowed
                          ? "bg-sage-100 text-sage-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {row.draft.matchedSourceId === "craigslist-sfbay-etc"
                      ? "CL source"
                      : row.draft.fromAllowed
                        ? "From OK"
                        : "From blocked"}
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
                  {isTipStyleDraft(row.draft) && row.status === "pending" && (
                    <span
                      className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-900"
                      title="Tip-style invite — open firm portal, paste title/pay/screener into Enrich before Approve"
                    >
                      Tip
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
                ? "Loaded from GET /api/inbox. Email via POST /api/inbound. Craigslist etc drafts via scripts/craigslist-etc-import.ts → POST /api/inbox/import (human Approve; not auto-published)."
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
                      {selected.draft.matchedSourceId === "craigslist-sfbay-etc"
                        ? "Craigslist listing"
                        : "Raw email"}
                    </p>
                    <h2 className="mt-1 font-serif text-lg font-semibold text-stone-900">
                      {selected.email.subject}
                    </h2>
                    <dl className="mt-2 space-y-1 text-xs text-stone-600">
                      <div>
                        <span className="font-medium text-stone-400">
                          {selected.draft.matchedSourceId === "craigslist-sfbay-etc"
                            ? "Source "
                            : "From "}
                        </span>
                        {selected.draft.matchedSourceId === "craigslist-sfbay-etc"
                          ? "Craigslist SF Bay · jobs → etc"
                          : selected.email.from}
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
                      onClick={() =>
                        approve(selected.email.id, dupNeedsConfirm)
                      }
                      className={
                        dupNeedsConfirm
                          ? "rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                          : "rounded-xl bg-sage-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
                      }
                    >
                      {dupNeedsConfirm ? "Approve anyway" : "Approve → feed"}
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
                          selectedEnrich?.applyUrl.trim() ||
                          selected.draft.applyUrl ||
                          selectedPublished?.applyUrl
                        )
                      }
                      onClick={checkSelectedLink}
                      className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Check apply link
                    </button>
                    <button
                      type="button"
                      disabled={reparsing || inboxSource !== "live"}
                      onClick={() => {
                        void reparseSelected();
                      }}
                      className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Re-run parseEmail on this inbox item and save draft+parseLog (Gmail forwards / allowlist updates)"
                    >
                      {reparsing ? "Re-parsing…" : "Re-parse draft"}
                    </button>
                  </div>
                </div>
                {dupHit && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <strong>Possible duplicate on the live feed.</strong>{" "}
                    “{dupHit.title}”{" "}
                    <span className="font-mono">({dupHit.id})</span> — {dupHit.why}.
                    Existing cards stay up.{" "}
                    {dupNeedsConfirm ? (
                      <>
                        Not published yet.{" "}
                        <button
                          type="button"
                          onClick={() => approve(selected.email.id, true)}
                          className="font-semibold underline"
                        >
                          Approve anyway
                        </button>{" "}
                        if this is a different study, or{" "}
                        <button
                          type="button"
                          onClick={() => setDupHold(null)}
                          className="font-semibold underline"
                        >
                          cancel
                        </button>
                        .
                      </>
                    ) : (
                      <>
                        <em>Approve → feed</em> will ask you to confirm before
                        publishing.
                      </>
                    )}
                  </div>
                )}
                {selected.isNewDomain && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <strong>New From domain.</strong> Manual{" "}
                    <em>Approve → feed</em> unlocks this domain for future
                    auto-publish. Auto-publish stays disabled until then.
                  </div>
                )}
                {tipStyle && (
                  <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                    <strong>Tip email</strong> — open the firm portal, grab
                    the study title / pay / screener link, then paste into{" "}
                    <em>Enrich before Approve</em> below. Dashboard-only links
                    (e.g. my.theclc.com) make thin feed cards until you enrich.
                  </div>
                )}
                {selected.draft.matchedSourceId === "craigslist-sfbay-etc" && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <strong>Craigslist etc.</strong> Inspiration source, not a
                    verified firm. Confidence stays low and the card publishes
                    unverified. Confirm the apply link before Approve → feed.
                    {selected.draft.applyUrl && (
                      <>
                        {" "}
                        Apply:{" "}
                        <a
                          href={selected.draft.applyUrl}
                          className="font-semibold underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selected.draft.applyUrl}
                        </a>
                      </>
                    )}
                  </div>
                )}
                <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 whitespace-pre-wrap">
                  {selected.email.text}
                </pre>
              </section>

              {selectedEnrich && (
                <section className="rounded-2xl border border-sage-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                        Enrich before Approve
                      </p>
                      <p className="mt-0.5 text-sm text-stone-600">
                        Edits publish to the feed — not the raw parser draft
                        alone. Screener / portal link is required.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={enrichDisabled}
                      onClick={() =>
                        setEnrichById((prev) => {
                          const next = { ...prev };
                          delete next[selected.email.id];
                          return next;
                        })
                      }
                      className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reset to draft
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
                      Title
                      <input
                        type="text"
                        disabled={enrichDisabled}
                        value={selectedEnrich.title}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { title: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder="Study title for the feed"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600">
                      Firm
                      <input
                        type="text"
                        disabled={enrichDisabled}
                        value={selectedEnrich.firm}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { firm: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600">
                      Location / modality
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          disabled={enrichDisabled}
                          value={selectedEnrich.location}
                          onChange={(e) =>
                            patchEnrich(
                              selected.email.id,
                              { location: e.target.value },
                              selected.draft
                            )
                          }
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                          placeholder="Location"
                        />
                        <select
                          disabled={enrichDisabled}
                          value={selectedEnrich.modality}
                          onChange={(e) =>
                            patchEnrich(
                              selected.email.id,
                              {
                                modality: e.target.value as EnrichFields["modality"],
                              },
                              selected.draft
                            )
                          }
                          className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        >
                          <option value="">—</option>
                          <option value="in-person">In-person</option>
                          <option value="remote">Remote</option>
                        </select>
                      </div>
                    </label>
                    <label className="block text-xs font-medium text-stone-600">
                      Pay{" "}
                      <span className="font-normal text-stone-400">
                        (optional · number or text)
                      </span>
                      <input
                        type="text"
                        disabled={enrichDisabled}
                        value={selectedEnrich.pay}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { pay: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder="125 or gift card"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600">
                      Duration{" "}
                      <span className="font-normal text-stone-400">
                        (optional)
                      </span>
                      <input
                        type="text"
                        disabled={enrichDisabled}
                        value={selectedEnrich.duration}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { duration: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder="60 or 90 min"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
                      Who it&apos;s looking for / short description
                      <textarea
                        disabled={enrichDisabled}
                        value={selectedEnrich.description}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { description: e.target.value },
                            selected.draft
                          )
                        }
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder="Ages, who qualifies, what the session is about"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
                      Screener / apply URL{" "}
                      <span className="font-normal text-rose-600">
                        (required)
                      </span>
                      <input
                        type="url"
                        disabled={enrichDisabled}
                        value={selectedEnrich.applyUrl}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { applyUrl: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder="https://…"
                      />
                    </label>
                    <label className="block text-xs font-medium text-stone-600 sm:col-span-2">
                      Portal note{" "}
                      <span className="font-normal text-stone-400">
                        (optional)
                      </span>
                      <input
                        type="text"
                        disabled={enrichDisabled}
                        value={selectedEnrich.portalNote}
                        onChange={(e) =>
                          patchEnrich(
                            selected.email.id,
                            { portalNote: e.target.value },
                            selected.draft
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50"
                        placeholder='e.g. Log into CLC Activities for full details'
                      />
                    </label>
                  </div>
                </section>
              )}

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
            Published list: server store (/api/published) · analytics still localStorage
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
