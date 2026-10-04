import Link from "next/link";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { isAdminOpenMode } from "@/lib/adminAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const open = isAdminOpenMode();

  return (
    <>
      {open ? (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-xs leading-relaxed text-amber-950 sm:text-sm">
          <strong className="font-semibold">ADMIN_SECRET unset</strong> — admin
          pages are open (local/dev). Set{" "}
          <code className="rounded bg-white/80 px-1 text-[11px]">
            ADMIN_SECRET
          </code>{" "}
          on Production before sharing the URL. See{" "}
          <Link href="/admin/setup" className="font-semibold underline">
            /admin/setup
          </Link>{" "}
          · docs/DEPLOY.md
        </div>
      ) : (
        <div className="flex items-center justify-end gap-3 border-b border-sage-100 bg-cream/90 px-4 py-1.5 text-xs text-stone-500">
          <span>Admin unlocked</span>
          <AdminLogoutButton />
        </div>
      )}
      {children}
    </>
  );
}
