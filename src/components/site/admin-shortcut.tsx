"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shows a "Dashboard" shortcut only when the visitor is a signed-in admin.
 * Checked client-side (GET /api/auth/me with the session cookie) so public pages stay static.
 */
export function AdminShortcut({ className }: { className?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Only ask the server when this browser has signed in before (pf_admin hint cookie);
    // visitors never trigger the request. The server still verifies the real httpOnly session.
    if (!/(?:^|;\s*)pf_admin=1/.test(document.cookie)) return;
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => {
        if (!active) return;
        setIsAdmin(r.ok);
        // Stale hint (session expired) — drop it so we stop asking.
        if (r.status === 401) document.cookie = "pf_admin=; Max-Age=0; path=/";
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white",
        className,
      )}
    >
      <LayoutDashboard className="h-4 w-4" />
      <span className="hidden sm:inline">Dashboard</span>
    </Link>
  );
}
