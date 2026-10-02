"use client";

import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-cream">
      <div
        className={`mx-auto min-h-dvh max-w-lg bg-cream ${
          showNav ? "pb-24" : ""
        }`}
      >
        {children}
      </div>
      {showNav && (
        <>
          <InstallPrompt />
          <BottomNav />
        </>
      )}
    </div>
  );
}
