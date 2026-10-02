export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const mark =
    size === "lg" ? "h-9 w-9" : size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className={`inline-flex ${mark} items-center justify-center rounded-xl bg-sage-700 text-white shadow-sm`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 3c-1.5 3.5-5 5.5-5 10a5 5 0 0010 0c0-4.5-3.5-6.5-5-10zm0 14.5a2.5 2.5 0 01-2.5-2.5c0-1.8 1.2-3.1 2.5-5.2 1.3 2.1 2.5 3.4 2.5 5.2a2.5 2.5 0 01-2.5 2.5z" />
        </svg>
      </span>
      <span className={`font-serif font-semibold tracking-tight text-sage-900 ${text}`}>
        Bay Studies
      </span>
    </div>
  );
}
