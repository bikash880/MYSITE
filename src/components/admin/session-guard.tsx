"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/actions-client";

const CHECK_EVERY_MS = 10_000;
const HEARTBEAT_EVERY_MS = 4 * 60_000;
const WARN_BEFORE_MS = 60_000;

/**
 * Automatic session expiry in the browser (the server enforces the same limits):
 * - signs out after `idleMs` without keyboard/mouse/touch activity,
 * - signs out at the absolute `expiresAt`,
 * - warns one minute before an idle sign-out,
 * - while the admin is active, pings the server so its idle timer stays in sync.
 */
export function SessionGuard({ idleMs, expiresAt }: { idleMs: number; expiresAt: string }) {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());
  const warned = useRef(false);
  const ended = useRef(false);

  useEffect(() => {
    const absolute = new Date(expiresAt).getTime();

    const end = async (reason: "idle" | "expired") => {
      if (ended.current) return;
      ended.current = true;
      toast.dismiss("session-warning");
      await signOut().catch(() => {});
      toast.message(reason === "idle" ? "Signed out after inactivity" : "Your session has expired", {
        description: "Please sign in again to continue.",
      });
      router.replace("/admin/login?expired=1");
      router.refresh();
    };

    const heartbeat = async () => {
      lastHeartbeat.current = Date.now();
      try {
        const res = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (res.status === 401) await end("expired");
      } catch {
        /* offline — the next check will retry */
      }
    };

    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle < 1000) return;
      throttle = now;
      lastActivity.current = now;
      if (warned.current) {
        warned.current = false;
        toast.dismiss("session-warning");
      }
    };

    const tick = () => {
      const now = Date.now();
      if (now >= absolute) return void end("expired");
      const idleFor = now - lastActivity.current;
      if (idleFor >= idleMs) return void end("idle");
      if (idleMs - idleFor <= WARN_BEFORE_MS && !warned.current) {
        warned.current = true;
        toast.warning("You'll be signed out in 1 minute due to inactivity", {
          id: "session-warning",
          duration: WARN_BEFORE_MS,
          action: {
            label: "Stay signed in",
            onClick: () => {
              lastActivity.current = Date.now();
              warned.current = false;
              void heartbeat();
            },
          },
        });
      }
      // Keep the server's idle timer fresh only while the admin is actually active.
      if (now - lastHeartbeat.current >= HEARTBEAT_EVERY_MS && lastActivity.current > lastHeartbeat.current) void heartbeat();
    };

    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(tick, CHECK_EVERY_MS);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [idleMs, expiresAt, router]);

  return null;
}
