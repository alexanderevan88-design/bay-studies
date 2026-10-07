import Link from "next/link";

export function TrustLine({
  domain,
  compact = false,
}: {
  domain?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-xs leading-snug text-stone-500">
        <span className="font-medium text-sage-800">No fee. Ever.</span>
        {domain ? (
          <>
            {" "}
            · Apply on{" "}
            <span className="font-medium text-sage-800">{domain}</span>
          </>
        ) : (
          <> · Verified Bay Area firms</>
        )}
        {" · "}
        <Link
          href="/about/verify"
          className="inline-flex min-h-11 items-center font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:text-sage-900"
        >
          How we source
        </Link>
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-sage-100 bg-sage-50/80 px-3.5 py-3 text-sm text-sage-900">
      <p className="font-medium">No fee. Ever. · Bay Area verified firms</p>
      <p className="mt-1 text-stone-600">
        {domain ? (
          <>
            You&apos;ll finish on{" "}
            <span className="font-semibold text-sage-800">{domain}</span> — we
            never take a cut. Soft-launch: invites are allowlisted and
            human-approved before they hit your feed.
          </>
        ) : (
          <>
            Soft-launch aggregator for SF Bay Area focus groups &amp; paid
            studies. Verified firms only — a human reviews new domains before
            publish. You leave the app to apply on their site.
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-sage-800">
        <Link
          href="/about/verify"
          className="inline-flex min-h-11 items-center font-semibold underline decoration-sage-300 underline-offset-2 hover:text-sage-950"
        >
          How we verify &amp; source →
        </Link>
      </p>
    </div>
  );
}
