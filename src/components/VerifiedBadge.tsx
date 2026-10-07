import Link from "next/link";

export function VerifiedBadge({
  className = "",
  href,
}: {
  className?: string;
  /** Optional link (e.g. /about/verify) for trust consistency. */
  href?: string;
}) {
  const inner = (
    <>
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3.5 w-3.5 text-sage-600"
        aria-hidden
      >
        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm3.03 4.72l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z" />
      </svg>
      Verified firm
    </>
  );

  const classes = `inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 text-xs font-medium text-sage-800 ring-1 ring-sage-200 ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className="group inline-flex min-h-11 items-center"
        title="Allowlisted Bay Area firm — how we verify"
      >
        <span
          className={`${classes} transition group-hover:bg-sage-100 group-hover:ring-sage-300`}
        >
          {inner}
        </span>
      </Link>
    );
  }

  return (
    <span className={classes} title="Allowlisted Bay Area firm">
      {inner}
    </span>
  );
}
