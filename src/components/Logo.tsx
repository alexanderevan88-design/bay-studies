export function BridgeMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 15c3-6 15-6 18 0" />
      <path d="M7 12.4V19M17 12.4V19M3 19h18" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";
  const mark =
    size === "lg" ? "h-10 w-10" : size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div className="inline-flex items-center gap-2.5">
      <span
        className={`inline-flex ${mark} items-center justify-center rounded-[10px] bg-bridge text-white shadow-sm`}
        aria-hidden
      >
        <BridgeMark className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span
        className={`font-display font-bold tracking-tight text-ink ${text}`}
      >
        Bay Studies
      </span>
    </div>
  );
}
