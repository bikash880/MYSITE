"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Records one page view per path per browser session (used for the admin "site visits" stat). */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const key = `pv:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked — still count */
    }
    const body = JSON.stringify({ path: pathname.slice(0, 300), referrer: document.referrer ? document.referrer.slice(0, 500) : null });
    fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
