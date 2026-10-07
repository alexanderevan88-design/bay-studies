"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export function BottomNav() {
  return (
    <Suspense fallback={<NavShell />}>
      <BottomNavInner />
    </Suspense>
  );
}

function NavShell({ children }: { children?: React.ReactNode }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-sage-100 bg-white/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2 pb-2">
        {children ?? (
          <>
            <span className="min-w-[4.5rem] py-4" />
            <span className="min-w-[4.5rem] py-4" />
            <span className="min-w-[4.5rem] py-4" />
          </>
        )}
      </div>
    </nav>
  );
}

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { unread } = useNotifications();

  const feedActive =
    (pathname.startsWith("/feed") || pathname.startsWith("/studies")) &&
    tab !== "saved";
  const savedActive = pathname.startsWith("/feed") && tab === "saved";
  const meActive =
    pathname.startsWith("/me") ||
    pathname.startsWith("/vault") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/privacy");

  return (
    <NavShell>
      <TabLink
        href="/feed"
        label="Feed"
        active={feedActive}
        icon="feed"
        badge={unread > 0 ? unread : undefined}
      />
      <TabLink
        href="/feed?tab=saved"
        label="Saved"
        active={savedActive}
        icon="saved"
      />
      <TabLink href="/me" label="Me" active={meActive} icon="me" />
    </NavShell>
  );
}

function TabLink({
  href,
  label,
  active,
  icon,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: "feed" | "saved" | "me";
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[44px] min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
        active ? "text-sage-800" : "text-stone-500 hover:text-sage-800"
      }`}
    >
      <span className="relative">
        {icon === "feed" && <FeedIcon active={active} />}
        {icon === "saved" && <SavedIcon active={active} />}
        {icon === "me" && <MeIcon active={active} />}
        {badge != null && badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-bold leading-none text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-sage-700" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h10"
      />
    </svg>
  );
}

function SavedIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-sage-700" : ""}`}
      fill={active ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
      />
    </svg>
  );
}

function MeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-sage-700" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
