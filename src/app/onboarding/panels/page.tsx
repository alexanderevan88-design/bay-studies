"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BridgeInFog } from "@/components/BridgeInFog";
import { SetupSuggestCard } from "@/components/SetupSuggest";

/** Optional last onboarding step: suggest /setup. Maybe later goes to the feed. */
export default function OnboardingPanelsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-fog px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link
          href="/onboarding/preferences"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-bridge-link"
        >
          ← Back
        </Link>
        <Link
          href="/feed?view=foryou"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-muted"
        >
          Skip
        </Link>
      </div>
      <div className="mt-6 text-center">
        <BridgeInFog />
        <p className="mt-3 text-[13px] font-semibold text-muted">You&apos;re in. One optional extra:</p>
      </div>
      <SetupSuggestCard className="mt-4" onLater={() => router.push("/feed?view=foryou")} />
      <p className="mt-4 text-center text-xs text-muted">
        You can always find this later under Me → Your panels.
      </p>
    </main>
  );
}
