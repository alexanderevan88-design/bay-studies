"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FIRST_FIRMS,
  STRETCH_FIRMS,
  type FirmOnboard,
  type StretchFirmOnboard,
} from "@/data/firms";

const STORAGE_KEY = "bay-studies-firms-checklist-v1";

type DoneMap = Record<string, boolean>;

type FirmCard = FirmOnboard | StretchFirmOnboard;

function loadDone(): DoneMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DoneMap;
  } catch {
    return {};
  }
}

function ingestPlaceholder(firm: FirmCard, origin: string): string {
  if (!origin || origin.includes("localhost")) {
    return firm.suggestedIngestEmail;
  }
  const host = origin.replace(/^https?:\/\//, "").split("/")[0];
  return firm.suggestedIngestEmail.replace("YOUR_DOMAIN", host);
}

export default function AdminFirmsPage() {
  const [done, setDone] = useState<DoneMap>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const saved = loadDone();
    setDone(saved);
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}-notes`);
      if (raw) setNotes(JSON.parse(raw) as Record<string, string>);
    } catch {
      /* ignore */
    }
    setOrigin(window.location.origin);
    setReady(true);
  }, []);

  const completed = useMemo(
    () => FIRST_FIRMS.filter((f) => done[f.id]).length,
    [done]
  );

  const stretchDone = useMemo(
    () => STRETCH_FIRMS.filter((f) => done[f.id]).length,
    [done]
  );

  const toggle = (id: string) => {
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

  const saveNote = (id: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [id]: value };
      try {
        localStorage.setItem(`${STORAGE_KEY}-notes`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
              href="/admin/setup"
              className="mt-0.5 shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-sage-600 hover:bg-sage-50"
            >
              ← Setup
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-xl font-semibold leading-tight text-sage-900 sm:text-2xl">
                  First firms
                </h1>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  checklist
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                Soft-launch + Bay Area priority · {completed}/
                {FIRST_FIRMS.length} joined
                {stretchDone > 0 ? ` · ${stretchDone} stretch` : ""}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 pl-11 text-sm sm:pl-0">
            <Link
              href="/admin/ingest"
              className="font-medium text-stone-600 hover:underline"
            >
              Ingest
            </Link>
            <Link
              href="/feed"
              className="font-medium text-stone-600 hover:underline"
            >
              Feed
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 overflow-x-hidden px-4 py-5 sm:py-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm leading-relaxed text-stone-600">
            Sign up for each allowlisted firm using a dedicated ingest address
            so invites land in{" "}
            <Link href="/admin/ingest" className="text-sage-600 underline">
              /admin/ingest
            </Link>
            . Replace{" "}
            <code className="break-all rounded bg-stone-100 px-1 text-xs">
              YOUR_DOMAIN
            </code>{" "}
            after Mailgun + DNS are live (see{" "}
            <Link href="/admin/setup" className="text-sage-600 underline">
              /admin/setup
            </Link>
            ).
          </p>
          <p className="mt-2 break-words text-xs leading-relaxed text-stone-500">
            Dev inject with a firm preset:{" "}
            <code className="break-all rounded bg-stone-100 px-1">
              POST /api/inbound/dev {"{"} &quot;firm&quot;: &quot;clc&quot; {"}"}
            </code>
          </p>
        </section>

        <ol className="space-y-3">
          {FIRST_FIRMS.map((firm, index) => (
            <FirmChecklistCard
              key={firm.id}
              firm={firm}
              index={index + 1}
              checked={!!done[firm.id]}
              email={ingestPlaceholder(firm, origin)}
              note={notes[firm.id] ?? ""}
              onToggle={() => toggle(firm.id)}
              onNote={(v) => saveNote(firm.id, v)}
            />
          ))}
        </ol>

        <section className="pt-2">
          <div className="mb-3 flex flex-wrap items-baseline gap-2 px-0.5">
            <h2 className="font-serif text-lg font-semibold text-sage-900">
              Optional stretch
            </h2>
            <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
              later
            </span>
            <p className="w-full text-xs leading-relaxed text-stone-500">
              Salesforce, PlaytestCloud, User Interviews, Meta AR/VR — join when
              core panels are humming. Already on the From-gate allowlist.
            </p>
          </div>
          <ol className="space-y-3">
            {STRETCH_FIRMS.map((firm, index) => (
              <FirmChecklistCard
                key={firm.id}
                firm={firm}
                index={index + 1}
                checked={!!done[firm.id]}
                email={ingestPlaceholder(firm, origin)}
                note={notes[firm.id] ?? ""}
                onToggle={() => toggle(firm.id)}
                onNote={(v) => saveNote(firm.id, v)}
                stretch
              />
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-600">
          <p className="font-semibold text-stone-800">Related</p>
          <ul className="mt-2 space-y-2">
            <li className="leading-relaxed">
              <Link href="/admin/setup" className="text-sage-600 underline">
                /admin/setup
              </Link>{" "}
              — domain, Mailgun, webhook secret
            </li>
            <li className="leading-relaxed">
              <Link href="/admin/ingest" className="text-sage-600 underline">
                /admin/ingest
              </Link>{" "}
              — live inbox / Approve
            </li>
            <li className="leading-relaxed">
              <Link href="/about/verify" className="text-sage-600 underline">
                /about/verify
              </Link>{" "}
              — how we verify sources
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function FirmChecklistCard({
  firm,
  index,
  checked,
  email,
  note,
  onToggle,
  onNote,
  stretch,
}: {
  firm: FirmCard;
  index: number;
  checked: boolean;
  email: string;
  note: string;
  onToggle: () => void;
  onNote: (v: string) => void;
  stretch?: boolean;
}) {
  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
        checked
          ? "border-sage-300 bg-sage-50/40"
          : stretch
            ? "border-stone-200 border-dashed"
            : "border-stone-200"
      }`}
    >
      <div className="flex gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-sage-700"
          checked={checked}
          onChange={onToggle}
          aria-label={`Mark ${firm.name} joined`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-400">
              {index}
            </span>
            <h2 className="font-serif text-base font-semibold leading-snug text-stone-900 sm:text-lg">
              {firm.name}
            </h2>
            {stretch && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                stretch
              </span>
            )}
            <span className="w-full text-xs text-stone-500 sm:w-auto">
              {firm.metroHint}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {firm.notes}
          </p>

          <dl className="mt-3 space-y-2 text-xs">
            <div className="rounded-lg bg-stone-50 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-stone-400">
                Join URL
              </dt>
              <dd className="mt-1 break-all">
                <a
                  href={firm.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] leading-relaxed text-sage-800 underline sm:text-xs"
                >
                  {firm.joinUrl}
                </a>
              </dd>
            </div>
            <div className="rounded-lg border border-dashed border-sage-300 bg-sage-50 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-sage-600/70">
                Suggested ingest email
              </dt>
              <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-sage-900 sm:text-xs">
                {email}
              </dd>
            </div>
          </dl>

          <label className="mt-3 block text-xs text-stone-500">
            Your notes
            <textarea
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-stone-800 outline-none focus:border-sage-400"
              rows={2}
              placeholder="Account created? Confirmation received? …"
              value={note}
              onChange={(e) => onNote(e.target.value)}
            />
          </label>
        </div>
      </div>
    </li>
  );
}
