"use client";

import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { JoinReturnPrompt } from "./JoinReturnPrompt";

export function AppShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-fog">
      <div
        className={`mx-auto min-h-dvh max-w-lg bg-fog ${
          showNav ? "pb-24" : ""
        }`}
      >
        {children}
      </div>
      <JoinReturnPrompt raised={showNav} />
      {showNav && (
        <>
          <InstallPrompt />
          <BottomNav />
        </>
      )}
    </div>
  );
}
