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
          <> · Verified firms only</>
        )}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-sage-100 bg-sage-50/80 px-3.5 py-3 text-sm text-sage-900">
      <p className="font-medium">No fee. Ever.</p>
      <p className="mt-1 text-stone-600">
        {domain ? (
          <>
            You&apos;ll finish on{" "}
            <span className="font-semibold text-sage-800">{domain}</span> — we
            never take a cut. Verified firms only.
          </>
        ) : (
          <>
            Verified local firms only. You leave the app to apply on their site.
          </>
        )}
      </p>
    </div>
  );
}
