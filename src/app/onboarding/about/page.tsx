"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import {
  EMPLOYMENT_LABELS,
  GENDER_LABELS,
  type Employment,
  type Gender,
} from "@/lib/types";

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Cantonese",
  "Mandarin",
  "Tagalog",
  "Vietnamese",
  "Korean",
  "Other",
];

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 focus:border-sage-600";

export default function AboutPage() {
  const { profile, update, ready } = useProfile();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [employment, setEmployment] = useState<Employment>("");
  const [hasKids, setHasKids] = useState<boolean | null>(null);
  const [languages, setLanguages] = useState<string[]>(["English"]);

  useEffect(() => {
    if (!ready || hydrated) return;
    setAge(profile.age === "" ? "" : String(profile.age));
    setDob(profile.dob);
    setGender(profile.gender);
    setZip(profile.zip);
    setPhone(profile.phone);
    setEmail(profile.email);
    setEmployment(profile.employment);
    setHasKids(profile.hasKids);
    setLanguages(profile.languages);
    setHydrated(true);
  }, [ready, hydrated, profile]);

  if (!ready || !hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </main>
    );
  }

  function toggleLang(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function onNext() {
    const ageNum = age ? parseInt(age, 10) : "";
    update({
      age: ageNum === "" || Number.isNaN(ageNum) ? "" : ageNum,
      dob,
      gender,
      zip,
      phone: phone.trim(),
      email: email.trim(),
      employment,
      hasKids,
      languages: languages.length ? languages : ["English"],
    });
    router.push(profile.onboarded ? "/me" : "/onboarding/preferences");
  }

  const canNext = Boolean(age || dob) && zip.length >= 5;

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-cream px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link
          href={profile.onboarded ? "/me" : "/"}
          className="text-sm font-medium text-sage-700"
        >
          ← Back
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          1 / 2
        </span>
      </div>

      <h1 className="mt-6 font-serif text-3xl font-semibold text-sage-900">
        About you
      </h1>
      <p className="mt-2 text-stone-600">
        Age + ZIP unlock better matches. Phone and email stay on this device
        for quick screener paste.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Age</span>
          <input
            type="number"
            inputMode="numeric"
            min={18}
            max={99}
            placeholder="e.g. 32"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Date of birth (optional)
          </span>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {(Object.keys(GENDER_LABELS) as Exclude<Gender, "">[]).map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">ZIP code</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="94107"
            value={zip}
            onChange={(e) =>
              setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Phone <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(415) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            Email <span className="font-normal text-stone-400">(optional)</span>
          </span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Employment</span>
          <select
            value={employment}
            onChange={(e) => setEmployment(e.target.value as Employment)}
            className={fieldClass}
          >
            <option value="">Select…</option>
            {(Object.keys(EMPLOYMENT_LABELS) as Exclude<Employment, "">[]).map(
              (emp) => (
                <option key={emp} value={emp}>
                  {EMPLOYMENT_LABELS[emp]}
                </option>
              )
            )}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-stone-700">
            Kids in household?
          </legend>
          <div className="mt-2 flex gap-2">
            {[
              { v: true, label: "Yes" },
              { v: false, label: "No" },
            ].map((opt) => (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => setHasKids(opt.v)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  hasKids === opt.v
                    ? "border-sage-600 bg-sage-50 text-sage-900 ring-1 ring-sage-600"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-stone-700">
            Languages
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => {
              const on = languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    on
                      ? "border-sage-600 bg-sage-700 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!canNext}
          className="mt-4 w-full rounded-xl bg-sage-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {profile.onboarded ? "Save profile" : "Continue"}
        </button>
      </form>
    </main>
  );
}
