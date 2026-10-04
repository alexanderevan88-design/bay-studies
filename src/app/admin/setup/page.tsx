"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type InboundEnv = {
  mailProvider?: string;
  secretConfigured?: boolean;
};

type CheckId =
  | "domain"
  | "mailgun"
  | "webhook"
  | "secret"
  | "adminSecret"
  | "firmEmail";

type CheckItem = {
  id: CheckId;
  title: string;
  detail: string;
};

const CHECKS: CheckItem[] = [
  {
    id: "domain",
    title: "Domain (or tunnel)",
    detail:
      "Public HTTPS URL for the app — Vercel custom domain, *.vercel.app, or an ngrok tunnel for pre-domain testing.",
  },
  {
    id: "mailgun",
    title: "Mailgun account + domain",
    detail:
      "Create a Mailgun account, add a receiving domain (or sandbox), and verify DNS / MX so mail can be delivered.",
  },
  {
    id: "webhook",
    title: "Webhook URL",
    detail:
      "Mailgun Receiving route forwards to https://YOUR_DOMAIN/api/inbound (add ?secret=… when using the shared secret).",
  },
  {
    id: "secret",
    title: "INBOUND_WEBHOOK_SECRET",
    detail:
      "Set a strong secret on the host. When set, unsigned POSTs to /api/inbound are rejected with 401.",
  },
  {
    id: "adminSecret",
    title: "ADMIN_SECRET",
    detail:
      "Shared secret for /admin/* pages. When set, middleware redirects to /admin/login. Leave empty only for local/dev (amber banner). Soft-launch: not OAuth.",
  },
  {
    id: "firmEmail",
    title: "First firm panel signup email",
    detail:
      "Use your ingest address (e.g. studies@YOUR_DOMAIN) when signing up for the first research firm panel so invites hit Mailgun → this app.",
  },
];

const STORAGE_KEY = "bay-studies-setup-checklist-v1";

function loadDone(): Record<CheckId, boolean> {
  const empty = {
    domain: false,
    mailgun: false,
    webhook: false,
    secret: false,
    adminSecret: false,
    firmEmail: false,
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Record<CheckId, boolean>>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

export default function AdminSetupPage() {
  const [done, setDone] = useState<Record<CheckId, boolean>>({
    domain: false,
    mailgun: false,
    webhook: false,
    secret: false,
    adminSecret: false,
    firmEmail: false,
  });
  const [ready, setReady] = useState(false);
  const [env, setEnv] = useState<InboundEnv | null>(null);
  const [origin, setOrigin] = useState("");

  const refreshEnv = useCallback(async () => {
    try {
      const res = await fetch("/api/inbound");
      const data = (await res.json()) as {
        ok?: boolean;
        env?: InboundEnv;
      };
      if (res.ok && data.env) setEnv(data.env);
    } catch {
      setEnv(null);
    }
  }, []);

  useEffect(() => {
    setDone(loadDone());
    setOrigin(window.location.origin);
    setReady(true);
    void refreshEnv();
  }, [refreshEnv]);

  const toggle = (id: CheckId) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const completed = useMemo(
    () => CHECKS.filter((c) => done[c.id]).length,
    [done]
  );

  const webhookExample = origin
    ? `${origin}/api/inbound?secret=YOUR_INBOUND_WEBHOOK_SECRET`
    : "https://YOUR_DOMAIN/api/inbound?secret=YOUR_INBOUND_WEBHOOK_SECRET";

  const ingestHint = origin.includes("localhost")
    ? "studies@YOUR_DOMAIN (after DNS) — or use ngrok + Mailgun sandbox for a temporary address"
    : `studies@${origin.replace(/^https?:\/\//, "").split("/")[0]} (match your Mailgun route)`;

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-100">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-stone-100 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href="/admin/ingest"
              className="mt-0.5 shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-50"
            >
              ← Ingest
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-xl font-semibold leading-tight text-sage-900 sm:text-2xl">
                  Deploy setup
                </h1>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  checklist
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                Public deploy + Mailgun inbound · {completed}/{CHECKS.length}{" "}
                done
              </p>
            </div>
          </div>
          <Link
            href="/feed"
            className="pl-11 text-sm font-medium text-stone-600 hover:underline sm:pl-0"
          >
            Feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 overflow-x-hidden px-4 py-5 sm:py-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm leading-relaxed text-stone-600">
            Walk through these steps before relying on live firm email. Full
            write-up:{" "}
            <code className="break-all rounded bg-stone-100 px-1 text-xs">
              docs/DEPLOY.md
            </code>
            . This page does <strong>not</strong> create a Mailgun account or
            deploy for you.
          </p>
          <dl className="mt-3 grid gap-2 text-xs">
            <div className="rounded-lg bg-stone-50 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-stone-400">
                This origin
              </dt>
              <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-stone-800 sm:text-xs">
                {origin || "—"}
              </dd>
            </div>
            <div className="rounded-lg bg-stone-50 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-stone-400">
                Host env (from GET /api/inbound)
              </dt>
              <dd className="mt-1 break-words leading-relaxed text-stone-800">
                {env ? (
                  <>
                    <span
                      className={
                        env.secretConfigured
                          ? "font-semibold text-sage-800"
                          : "font-semibold text-amber-800"
                      }
                    >
                      secret{" "}
                      {env.secretConfigured ? "configured" : "not set"}
                    </span>
                    <span className="text-stone-400"> · </span>
                    <span className="break-all">
                      MAIL_PROVIDER=
                      <span className="font-mono">
                        {env.mailProvider ?? "dev"}
                      </span>
                    </span>
                  </>
                ) : (
                  "Could not load — is the server up?"
                )}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => void refreshEnv()}
            className="mt-3 min-h-[44px] rounded-lg px-2 text-xs font-medium text-sage-700 hover:bg-sage-50 hover:underline sm:min-h-0"
          >
            Refresh env status
          </button>
        </section>

        <ol className="space-y-3">
          {CHECKS.map((item, index) => {
            const checked = done[item.id];
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                  checked
                    ? "border-sage-300 bg-sage-50/40"
                    : "border-stone-200"
                }`}
              >
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-sage-700"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
                        {index + 1}
                      </span>
                      <span className="font-serif text-base font-semibold leading-snug text-stone-900 sm:text-lg">
                        {item.title}
                      </span>
                    </span>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                      {item.detail}
                    </p>
                    {item.id === "webhook" && (
                      <p className="mt-2 break-all rounded-lg bg-stone-900 px-3 py-2.5 font-mono text-[10px] leading-relaxed text-emerald-100 sm:text-[11px]">
                        {webhookExample}
                      </p>
                    )}
                    {item.id === "firmEmail" && (
                      <p className="mt-2 rounded-lg border border-dashed border-sage-300 bg-sage-50 px-3 py-2.5 text-xs leading-relaxed text-sage-900">
                        Suggested ingest address:{" "}
                        <strong className="break-all font-mono text-[11px] sm:text-xs">
                          {ingestHint}
                        </strong>
                      </p>
                    )}
                    {item.id === "secret" && env && (
                      <p
                        className={`mt-2 text-xs font-medium leading-relaxed ${
                          env.secretConfigured
                            ? "text-sage-800"
                            : "text-amber-800"
                        }`}
                      >
                        {env.secretConfigured
                          ? "Detected: secret is set on this host."
                          : "Detected: secret empty — open webhook (OK for local; set before public Mailgun)."}
                      </p>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ol>

        <section className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-600">
          <p className="font-semibold text-stone-800">Quick links</p>
          <ul className="mt-2 space-y-2">
            <li className="leading-relaxed">
              <Link href="/admin/firms" className="text-sage-700 underline">
                /admin/firms
              </Link>{" "}
              — firm join URLs + stretch panels (Salesforce / PlaytestCloud / …)
            </li>
            <li className="leading-relaxed">
              <Link href="/admin/ingest" className="text-sage-700 underline">
                /admin/ingest
              </Link>{" "}
              — review live inbox / Approve
            </li>
            <li className="break-words leading-relaxed">
              <code className="text-xs">GET /api/inbound</code> — webhook info +{" "}
              <code className="text-xs">secretConfigured</code>
            </li>
            <li className="break-words leading-relaxed">
              <code className="text-xs">POST /api/inbound/dev</code> — local
              inject (disabled when MAIL_PROVIDER≠dev in production unless{" "}
              <code className="text-xs">ALLOW_INBOUND_DEV=1</code>)
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
