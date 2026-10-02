"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";

/**
 * Privacy / About stub — honest MVP copy for soft launch.
 * No live hosting URL invented; profile stays on-device until auth ships.
 */
export default function PrivacyPage() {
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
          About
        </p>
        <h1 className="font-serif text-3xl font-semibold text-sage-900">
          Privacy &amp; about
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Bay Studies helps Bay Area people find real paid focus groups and UX /
          playtest sessions from verified firms — without scam-board junk.
        </p>
      </header>

      <div className="space-y-3 px-5 py-5 pb-10">
        <section className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-sage-900">
            What we store today
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            This soft-launch demo keeps your profile, saved / applied studies,
            alert prefs, and notifications in{" "}
            <strong className="font-semibold text-stone-800">
              your browser&apos;s localStorage
            </strong>
            . We don&apos;t run account signup yet, so nothing is synced to a
            Bay Studies server for matching.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-stone-600">
            <li>Demographics you enter (age, metro, ZIP, optional phone/email)</li>
            <li>Study preferences (format, min pay, types, travel)</li>
            <li>Saved, applied, and dismissed study IDs</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-sage-900">
            What we don&apos;t do
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-stone-600">
            <li>We never charge a fee to apply — finish on the firm&apos;s site.</li>
            <li>We don&apos;t sell your screener answers (we never collect them).</li>
            <li>
              We don&apos;t invent live hosting URLs or email you until you
              deploy Mailgun / a public host yourself.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-sage-900">
            Inbound firm email (admin)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            When you (or an operator) wire a receiving address, invites land in
            a local inbox file for review. Parsed drafts are approved into the
            feed by a human (or high-confidence auto-publish after a domain is
            trusted). Firm apply links stay on allowlisted domains.
          </p>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-white p-4 shadow-sm">
          <h2 className="font-serif text-lg font-semibold text-sage-900">
            Your controls
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Clear local profile from{" "}
            <Link href="/me" className="font-semibold text-sage-800 underline">
              Me
            </Link>
            , tweak Alerts anytime, or dismiss studies you don&apos;t want. For
            how firms get verified, see{" "}
            <Link
              href="/about/verify"
              className="font-semibold text-sage-800 underline"
            >
              How we verify sources
            </Link>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-sage-100 bg-sage-50/80 p-4">
          <p className="text-sm font-medium text-sage-900">No fee. Ever.</p>
          <p className="mt-1 text-sm text-stone-600">
            Questions about this stub? Treat it as product intent for soft
            launch — update this page when auth and hosting go live.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
