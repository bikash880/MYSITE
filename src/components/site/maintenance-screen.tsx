"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarClock, Flag, Lock, Mail, RefreshCw } from "lucide-react";
import { BkmLogo } from "./bkm-logo";
import { LampToggle } from "./lamp-toggle";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
const POLL_MS = 30_000;
const DEFAULT_MESSAGE = "We're upgrading a few things behind the scenes to make the site faster and better. Thanks for your patience — we'll be back shortly.";

export interface MaintenanceScreenProps {
  name: string;
  siteTitle: string;
  email: string | null;
  message: string | null;
  /** ISO — when maintenance started. */
  startsAt: string | null;
  /** ISO — estimated completion. */
  eta: string | null;
  /** Admin preview: no auto-reload, shows a preview ribbon. */
  preview?: boolean;
}

/** Ticks every second after mount (null during SSR so server and client markup match). */
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function relative(ms: number) {
  const m = Math.round(Math.abs(ms) / 60_000);
  if (m < 1) return ms < 0 ? "just now" : "any moment";
  const text =
    m < 60
      ? `${m} min`
      : m < 60 * 24
        ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`
        : `${Math.round(m / 1440)} day${Math.round(m / 1440) > 1 ? "s" : ""}`;
  return ms < 0 ? `${text} ago` : `in ${text}`;
}

function countdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

export function MaintenanceScreen({ name, siteTitle, email, message, startsAt, eta, preview = false }: MaintenanceScreenProps) {
  const now = useNow();
  const [checking, setChecking] = useState(false);

  // Auto-restore: poll the status endpoint and reload the moment maintenance is switched off.
  useEffect(() => {
    if (preview) return;
    let stopped = false;
    async function check() {
      if (document.hidden) return;
      setChecking(true);
      try {
        const res = await fetch("/api/public/status", { cache: "no-store" });
        const data = (await res.json()) as { maintenance?: boolean };
        if (!stopped && data.maintenance === false) {
          window.location.reload();
          return;
        }
      } catch {
        /* offline or server restarting — try again next tick */
      } finally {
        if (!stopped) setChecking(false);
      }
    }
    const id = setInterval(check, POLL_MS);
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [preview]);

  const start = startsAt ? Date.parse(startsAt) : null;
  const end = eta ? Date.parse(eta) : null;
  const remaining = end !== null && now !== null ? Math.max(0, end - now) : null;
  const progress =
    start !== null && end !== null && now !== null && end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : null;

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="maint-blob absolute -top-56 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_30%,transparent),transparent)] blur-2xl" />
        <div className="maint-blob-2 absolute -bottom-40 -right-40 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-2)_22%,transparent),transparent)] blur-2xl" />
        <div className="maint-blob-3 absolute top-1/3 -left-48 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-3)_18%,transparent),transparent)] blur-2xl" />
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_55%_at_50%_42%,#000_25%,transparent_75%)]" />
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="maint-particle absolute block rounded-full bg-primary/50"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: 3 + (i % 3) * 2,
              height: 3 + (i % 3) * 2,
              animationDelay: `${-i * 1.7}s`,
              animationDuration: `${12 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
      <div aria-hidden className="bg-noise pointer-events-none fixed inset-0 z-[60] opacity-[0.035] mix-blend-overlay dark:opacity-[0.05]" />

      {preview && (
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-black sm:text-sm">
          Preview — this is what visitors see while maintenance mode is on.
          <Link href="/admin/settings#maintenance" className="rounded-full bg-black/15 px-3 py-0.5 font-semibold hover:bg-black/25">
            Back to admin
          </Link>
        </div>
      )}

      <header className="container-page flex h-16 items-center justify-between sm:h-20">
        <motion.span {...fade(0)} className="flex items-center gap-2.5">
          <BkmLogo size={30} animated={false} />
          <span className="text-sm font-semibold tracking-tight">
            {siteTitle}
            <span className="text-primary">.</span>
          </span>
        </motion.span>
        <motion.div {...fade(0.1)} className="pr-1">
          <LampToggle />
        </motion.div>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-8 sm:py-10">
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, ease: EASE }}>
            <BkmLogo size={104} />
          </motion.div>

          <motion.span
            {...fade(0.2)}
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-500 opacity-70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Scheduled maintenance
          </motion.span>

          <motion.h1
            {...fade(0.3)}
            className="mt-4 text-balance font-display text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-[2rem] md:text-[2.25rem]"
          >
            Website temporarily down <span className="accent-serif text-gradient">for maintenance</span>
          </motion.h1>

          <motion.p {...fade(0.38)} className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {message || DEFAULT_MESSAGE}
          </motion.p>

          {/* Schedule */}
          <motion.section
            {...fade(0.46)}
            aria-label="Maintenance schedule"
            className="mt-7 w-full rounded-2xl border border-border bg-card/60 p-4 text-left shadow-[0_20px_50px_-30px_rgba(0,0,0,.6)] backdrop-blur-xl sm:p-5"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <ScheduleItem
                icon={<CalendarClock className="h-3.5 w-3.5" />}
                label="Started"
                value={startsAt ? (now !== null ? fmtDate(startsAt) : "…") : "Just now"}
                hint={start !== null && now !== null ? relative(start - now) : undefined}
              />
              <ScheduleItem
                icon={<Flag className="h-3.5 w-3.5" />}
                label="Est. completion"
                value={eta ? (now !== null ? fmtDate(eta) : "…") : "To be announced"}
                hint={end !== null && now !== null ? (end > now ? relative(end - now) : "any moment now") : undefined}
                align="right"
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                <span>{progress !== null ? `${Math.floor(progress)}% complete` : "Working on it…"}</span>
                {remaining !== null && (
                  <span className="font-mono tabular-nums text-foreground">{remaining > 0 ? `${countdown(remaining)} left` : "Finishing up"}</span>
                )}
              </div>
              <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                {progress !== null ? (
                  <motion.span
                    className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-primary via-accent-2 to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(progress, 3)}%` }}
                    transition={{ duration: 1.2, ease: EASE }}
                  >
                    <span className="maint-progress absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                  </motion.span>
                ) : (
                  <span className="maint-progress absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-primary via-accent-2 to-accent" />
                )}
              </div>
            </div>
          </motion.section>

          <motion.div {...fade(0.56)} className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
              >
                <Mail className="h-4 w-4" /> Contact me
              </a>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card/60 px-5 text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/25"
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} /> Try again
            </button>
          </motion.div>

          {!preview && (
            <motion.p {...fade(0.64)} className="mt-5 flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              This page refreshes automatically when we&apos;re back
            </motion.p>
          )}
        </div>
      </main>

      <footer className="container-page flex flex-col items-center justify-between gap-2 border-t border-border/60 py-5 text-xs text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition hover:text-foreground" aria-label="Admin login">
          <Lock className="h-3.5 w-3.5" /> Admin
        </Link>
      </footer>
    </div>
  );
}

function ScheduleItem({
  icon,
  label,
  value,
  hint,
  align = "left",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p
        className={cn(
          "flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
          align === "right" && "justify-end",
        )}
      >
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold sm:text-sm">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
