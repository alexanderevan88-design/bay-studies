"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import {
  STUDY_TYPE_LABELS,
  type Modality,
  type StudyType,
} from "@/lib/types";

const STUDY_TYPES = Object.keys(STUDY_TYPE_LABELS) as StudyType[];

export default function PreferencesPage() {
  const { profile, update, ready } = useProfile();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  const [modality, setModality] = useState<Modality>("both");
  const [minPay, setMinPay] = useState(50);
  const [travelMiles, setTravelMiles] = useState(25);
  const [studyTypes, setStudyTypes] = useState<StudyType[]>(STUDY_TYPES);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    if (!ready || hydrated) return;
    setModality(profile.modality);
    setMinPay(profile.minPay);
    setTravelMiles(profile.travelMiles);
    setStudyTypes(profile.studyTypes);
    setPushEnabled(profile.pushEnabled);
    setHydrated(true);
  }, [ready, hydrated, profile]);

  if (!ready || !hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-fog">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </main>
    );
  }

  function toggleType(t: StudyType) {
    setStudyTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function seeFeed() {
    update({
      modality,
      minPay,
      travelMiles,
      studyTypes: studyTypes.length > 0 ? studyTypes : STUDY_TYPES,
      pushEnabled,
      onboarded: true,
    });
    router.push("/feed?view=foryou");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-fog px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link
          href="/onboarding/about"
          className="text-sm font-medium text-sage-600"
        >
          ← Back
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          2 / 2
        </span>
      </div>

      <h1 className="mt-6 font-display text-3xl font-semibold text-sage-900">
        Preferences
      </h1>
      <p className="mt-2 text-stone-600">
        Almost there — then we&apos;ll score studies against your prefs.
      </p>

      <section className="mt-8 space-y-6">
        <fieldset>
          <legend className="text-sm font-semibold text-sage-800">
            Format
          </legend>
          <div className="mt-2 grid gap-2">
            {(
              [
                ["in-person", "In-person"],
                ["remote", "Remote"],
                ["both", "Both"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setModality(value)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                  modality === value
                    ? "border-sage-600 bg-sage-50 text-sage-900 ring-1 ring-sage-600"
                    : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    modality === value
                      ? "border-sage-700 bg-sage-700"
                      : "border-stone-300"
                  }`}
                >
                  {modality === value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-sage-800">
              Min pay
            </label>
            <span className="text-sm font-semibold text-sage-900">
              ${minPay}
            </span>
          </div>
          <input
            type="range"
            min={25}
            max={200}
            step={25}
            value={minPay}
            onChange={(e) => setMinPay(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-stone-400">
            <span>$25</span>
            <span>$200</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-sage-800">
              Travel radius
            </label>
            <span className="text-sm font-semibold text-sage-900">
              {travelMiles} mi
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={travelMiles}
            onChange={(e) => setTravelMiles(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-sage-800">
            Study types
          </legend>
          <div className="mt-2 space-y-2">
            {STUDY_TYPES.map((t) => {
              const on = studyTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    on
                      ? "border-sage-600 bg-sage-50 text-sage-900"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      on
                        ? "border-sage-700 bg-sage-700 text-white"
                        : "border-stone-300 bg-white"
                    }`}
                  >
                    {on && (
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M6.5 11.5L3 8l1.2-1.2 2.3 2.3 5.3-5.3L13 5.2z" />
                      </svg>
                    )}
                  </span>
                  {STUDY_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3.5">
          <span className="text-sm font-medium text-stone-800">
            Push notifications
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => setPushEnabled((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition ${
              pushEnabled ? "bg-sage-700" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                pushEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={seeFeed}
        className="mt-8 w-full rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-sage-800"
      >
        See my matches
      </button>
      <p className="mt-3 text-center text-sm">
        <Link href="/feed" className="inline-flex min-h-11 items-center font-semibold text-sage-800 underline">
          Skip — browse all studies
        </Link>
      </p>
    </main>
  );
}
