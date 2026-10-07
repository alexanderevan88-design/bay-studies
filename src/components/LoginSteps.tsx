"use client";

import { useState } from "react";
import { memberLabel, type LoginAccess } from "@/lib/firmAccess";

/** "then search RWC_J104933 [Copy]" right under a login-style button. */
export function LoginThenLine({
  access,
  className = "",
}: {
  access: LoginAccess;
  className?: string;
}) {
  const showCode = access.searchable && access.code;
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-[13px] leading-snug text-muted ${className}`}>
      {showCode ? (
        <>
          <span>then search</span>
          <CopyCode code={access.code!} />
        </>
      ) : (
        <span className="min-w-0">
          then look for <b className="font-semibold text-ink">“{access.lookFor}”</b>
          {access.code ? (
            <>
              {" "}
              <span className="whitespace-nowrap">
                (ref <CopyCode code={access.code} compact />)
              </span>
            </>
          ) : null}
        </span>
      )}
    </p>
  );
}

export function CopyCode({ code, compact = false }: { code: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <code
        className={`rounded-md border border-dashed border-line bg-fog font-mono font-semibold text-ink ${
          compact ? "px-1 text-xs" : "px-1.5 py-0.5 text-[13px]"
        }`}
      >
        {code}
      </code>
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable */
          }
        }}
        aria-label={copied ? `Copied ${code}` : `Copy ${code}`}
        className="relative inline-flex min-h-11 items-center px-1.5 text-[13px] font-semibold text-bridge-link underline"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/** "Direct link" vs "Join panel first" (expanded cards + detail page only). */
export function AccessTag({ access }: { access: LoginAccess | null }) {
  return access ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-ink">
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
      </svg>
      Join panel first
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-bay-tint px-2.5 py-0.5 text-xs font-semibold text-bay">
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3h7v7M13 3L5 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Direct link
    </span>
  );
}

/** Secondary "Already a member? Log in" link + "then search CODE [Copy]". */
export function MemberLine({
  access,
  onOpen,
  className = "",
}: {
  access: LoginAccess;
  onOpen?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {access.joinUrl && (
        <a
          href={access.memberUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpen?.()}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-bridge-link underline underline-offset-2"
        >
          {memberLabelText(access)}
          <span aria-hidden className="ml-1 text-xs font-normal no-underline">↗</span>
        </a>
      )}
      <LoginThenLine access={access} className={access.joinUrl ? "-mt-1.5" : "mt-1"} />
    </div>
  );
}

function memberLabelText(a: LoginAccess): string {
  return memberLabel(a);
}
