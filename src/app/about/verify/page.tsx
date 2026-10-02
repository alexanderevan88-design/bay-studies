"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { TRUST_CHECKLIST, TRUST_FIRMS } from "@/data/trustChecklist";
import { SOURCES } from "@/data/sources";

export default function VerifySourcesPage() {
  return (
    <AppShell>
      <header className="border-b border-sage-100 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo size="sm" />
          <Link
            href="/me"
            className="text-sm font-medium text-sage-700 hover:underline"
          >
            ← Me
          </Link>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-sage-600">
          Trust
        </p>
        <h1 className="font-serif text-3xl font-semibold text-sage-900">
          How we verify sources
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Bay Studies is a soft-launch aggregator — not a job board dump. Every
          invite passes From-gate, parse confidence, and (for new domains) a
          human review before it hits your feed.
        </p>
      </header>

      <div className="space-y-3 px-5 py-5 pb-10">
        <section className="rounded-2xl border border-sage-100 bg-sage-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Firms we list
          </p>
          <p className="mt-2 text-sm text-stone-700">
            {TRUST_FIRMS.join(" · ")}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-stone-500">
            {SOURCES.map((s) => (
              <li key={s.id}>
                <span className="font-medium text-stone-700">{s.name}</span>{" "}
                — from {s.fromDomains[0]}
                {s.fromDomains.length > 1 ? "…" : ""} · apply{" "}
                {s.applyDomains[0]}
              </li>
            ))}
          </ul>
        </section>

        <ol className="space-y-3">
          {TRUST_CHECKLIST.map((item, i) => (
            <li
              key={item.id}
              className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-bold text-sage-800">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-sage-900">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                    {item.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="rounded-xl border border-dashed border-sage-200 bg-white px-4 py-3 text-center text-sm font-medium text-sage-800">
          No fee. Ever.{" "}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
