"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-cream">
          <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/admin/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        setConfigured(Boolean(d.configured));
        if (!d.configured) {
          // Open mode — bounce to next
          router.replace(nextPath);
        }
      })
      .catch(() => setConfigured(true));
  }, [nextPath, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        open?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Login failed");
        setBusy(false);
        return;
      }
      router.replace(nextPath);
    } catch {
      setError("Network error — try again");
      setBusy(false);
    }
  }

  if (configured === null || configured === false) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-sage-200" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-cream px-5 py-10">
      <Logo size="sm" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-sage-600">
        Admin
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-sage-900">
        Enter admin secret
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        Soft-launch gate for ingest, firms, and setup. Same value as{" "}
        <code className="rounded bg-white px-1 text-xs">ADMIN_SECRET</code> on
        the host. Not OAuth — shared secret only.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Secret
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="mt-1.5 min-h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-base text-stone-900 outline-none ring-sage-600 focus:ring-2"
            placeholder="Paste ADMIN_SECRET"
            required
          />
        </label>
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !secret.trim()}
          className="min-h-12 w-full rounded-xl bg-sage-700 px-4 text-base font-semibold text-white transition hover:bg-sage-800 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Unlock admin"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-stone-500">
        Or open any admin URL with{" "}
        <code className="rounded bg-white px-1">?admin_secret=…</code> once to
        set the cookie.{" "}
        <Link href="/feed" className="font-medium text-sage-800 underline">
          Back to feed
        </Link>
      </p>
    </main>
  );
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/admin")) return "/admin/ingest";
  if (raw.startsWith("//") || raw.includes("://")) return "/admin/ingest";
  return raw;
}
