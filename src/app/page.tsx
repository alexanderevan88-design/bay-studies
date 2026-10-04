"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
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
      <main className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </main>
    );
  }

  const returning = profile.onboarded;

  function continueNext() {
    if (!metro) return;
    update({ metro });
    router.push(returning ? "/feed" : "/onboarding/about");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col bg-cream px-5 pb-10 pt-10">
      <Logo size="lg" />

      {returning ? (
        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-wide text-sage-700">
            Welcome back
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-sage-900 text-balance">
            {profile.metro
              ? `${METRO_LABELS[profile.metro]} feed is ready`
              : "Your Bay Area feed is ready"}
          </h1>
          <p className="mt-3 text-base text-stone-600">
            Jump back to matched studies, or update your metro below if you
            moved.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push("/feed")}
              className="min-h-12 w-full rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-sage-800"
            >
              Open my feed
            </button>
            <Link
              href="/me"
              className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-sage-800"
            >
              Review profile · Me
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-wide text-sage-700">
            First time here
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-sage-900 text-balance">
            Real studies.
            <br />
            Real pay.
            <br />
            <span className="text-sage-600">No scam board junk.</span>
          </h1>
          <p className="mt-4 text-base text-stone-600">
            Bay Area only (MVP). The feed lists paid studies only after a
            human Approve — not sample listings. You apply on the firm&apos;s
            site. No fee. Ever.
          </p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-800">
          {returning ? "Confirm metro" : "Your metro"}
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          {returning
            ? "Optional — change only if your area moved."
            : "Pick one to start matching local paid studies."}
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
      </section>

      <div className="mt-auto pt-8">
        <TrustLine />
        {!returning && (
          <button
            type="button"
            disabled={!metro}
            onClick={continueNext}
            className="mt-4 min-h-12 w-full rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        )}
        {returning && metro && metro !== profile.metro && (
          <button
            type="button"
            onClick={continueNext}
            className="mt-4 min-h-12 w-full rounded-xl border border-sage-300 bg-white px-4 py-3.5 text-base font-semibold text-sage-900 transition hover:bg-sage-50"
          >
            Save metro &amp; open feed
          </button>
        )}
        <p className="mt-3 text-center text-xs text-stone-500">
          No account required for this demo — profile stays on your device.{" "}
          <Link
            href="/privacy"
            className="font-medium text-sage-800 underline"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/about/verify"
            className="font-medium text-sage-800 underline"
          >
            How we verify
          </Link>
        </p>
      </div>
    </main>
  );
}
