"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { BridgeInFog } from "@/components/BridgeInFog";
import { TrustLine } from "@/components/TrustLine";
import { useProfile } from "@/hooks/useProfile";
import { METRO_LABELS, type Metro } from "@/lib/types";

const METROS = Object.keys(METRO_LABELS) as Metro[];

export default function WelcomePage() {
  const { profile, update, ready } = useProfile();
  const router = useRouter();
  const [metro, setMetro] = useState<Metro | "">("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready || hydrated) return;
    setMetro(profile.metro);
    setHydrated(true);
  }, [ready, hydrated, profile.metro]);

  if (!ready || !hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fog">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </main>
    );
  }

  const returning = profile.onboarded;

  function rememberMetro() {
    if (metro !== profile.metro) update({ metro });
  }

  function browseAll() {
    rememberMetro();
    router.push("/feed");
  }

  function seeMatches() {
    rememberMetro();
    router.push(returning ? "/feed?view=foryou" : "/onboarding/about");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-fog px-5 pb-10 pt-8">
      <Logo size="lg" />
      <div className="mt-8 rounded-[22px] border border-line bg-white px-5 py-5 shadow-card">
        <BridgeInFog />
      </div>

      {returning ? (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-muted">
            Welcome back
          </p>
          <h1 className="mt-1 font-display text-[32px] font-extrabold leading-[1.1] tracking-tight text-ink text-balance">
            Fresh paid studies around the Bay
          </h1>
          <p className="mt-3 text-base text-muted">
            Browse everything that&apos;s open, or jump to the ones that fit
            you.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-muted">
            Paid studies around the Bay
          </p>
          <h1 className="mt-1 font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink text-balance">
            Real studies.
            <br />
            Real pay.
            <br />
            <span className="text-bridge-link">Never a fee.</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Taste tests, focus groups and try-at-home products from real Bay
            Area firms. Browse everything now, add details later if you want
            better picks. You sign up on the firm&apos;s site and they pay you.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <button
          type="button"
          onClick={browseAll}
          className="min-h-12 w-full rounded-[14px] bg-bridge px-4 py-3.5 text-base font-bold text-white transition hover:bg-bridge-dark"
        >
          Browse all studies
        </button>
        <button
          type="button"
          onClick={seeMatches}
          className="min-h-12 w-full rounded-[14px] border border-line bg-white px-4 py-3.5 text-base font-semibold text-ink transition hover:bg-bridge-tint"
        >
          {returning ? "See matches for you" : "Get better matches"}
        </button>
        {returning && (
          <Link
            href="/me"
            className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-sage-800"
          >
            Review profile · Me
          </Link>
        )}
      </div>

      <p className="mt-4 text-center text-sm leading-relaxed text-stone-600">
        The feed is free for everyone. Optional signup saves you time on firm
        applications and, soon, unlocks exclusive Bay Studies projects.{" "}
        <Link href="/vault" className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline">
          See how
        </Link>
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-800">
          Metro <span className="font-normal normal-case tracking-normal text-stone-500">(optional)</span>
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          Helps matching later. You can browse without picking one.
        </p>
        <div className="mt-3 grid gap-2">
          {METROS.map((m) => {
            const selected = metro === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMetro(m)}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-base transition ${
                  selected
                    ? "border-sage-600 bg-sage-50 text-sage-900 ring-1 ring-sage-600"
                    : "border-stone-200 bg-white text-stone-800 hover:border-sage-300"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-sage-700 bg-sage-700"
                      : "border-stone-300"
                  }`}
                >
                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                {METRO_LABELS[m]}
              </button>
            );
          })}
        </div>
        {metro && (
          <button
            type="button"
            onClick={() => setMetro("")}
            className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-stone-500 underline"
          >
            Clear metro
          </button>
        )}
      </section>

      <div className="mt-auto pt-8">
        <TrustLine />
        <p className="mt-3 text-center text-xs text-stone-500">
          No account required for this demo — profile stays on your device.{" "}
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center font-medium text-sage-800 underline"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/about/verify"
            className="inline-flex min-h-11 items-center font-medium text-sage-800 underline"
          >
            How we verify
          </Link>
        </p>
      </div>
    </main>
  );
}
