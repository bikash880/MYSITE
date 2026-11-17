"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Construction, ExternalLink, Globe, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/misc";
import { setMaintenanceMode } from "@/lib/actions-client";
import { cn, formatDate } from "@/lib/utils";
import type { MaintenanceState } from "@/types";

/** ISO → value for <input type="datetime-local"> in the admin's own timezone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MaintenanceControl({ initial, compact = false }: { initial: MaintenanceState; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState(initial.message ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial.starts_at));
  const [eta, setEta] = useState(toLocalInput(initial.eta));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const on = state.enabled;
  const dirty =
    message !== (state.message ?? "") || startsAt !== toLocalInput(state.starts_at) || eta !== toLocalInput(state.eta);

  function save(enabled: boolean, opts: { confirm?: boolean } = {}) {
    if (opts.confirm && enabled && !window.confirm("Turn on maintenance mode? Visitors will see the maintenance page until you turn it off. The admin panel stays available.")) {
      return;
    }
    setErrors({});
    start(async () => {
      const res = await setMaintenanceMode({
        enabled,
        message: message.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        eta: eta ? new Date(eta).toISOString() : null,
      });
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      setState(res.data!);
      // The server fills in the start time when switching on without one.
      setStartsAt(toLocalInput(res.data!.starts_at));
      toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <Card
      id="maintenance"
      className={cn(
        "relative scroll-mt-24 overflow-hidden p-5 transition-colors duration-500 sm:p-6",
        on ? "border-amber-500/40 bg-amber-500/[0.06]" : "",
      )}
    >
      <AnimatePresence>
        {on && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(135deg,#f59e0b_0_12px,#111_12px_24px)] opacity-80"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors duration-500",
              on ? "bg-amber-500 text-black" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            )}
          >
            {on ? <Construction className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
              Maintenance mode
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  on ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", on ? "animate-pulse bg-amber-500" : "bg-emerald-500")} />
                {on ? "Site is down for visitors" : "Site is live"}
              </span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {on
                ? "Visitors see the maintenance page. Turn it off to restore the website instantly — open maintenance pages reload by themselves."
                : "Temporarily hide the whole public website behind a maintenance page. The admin panel always stays available."}
              <span className="block pt-0.5 text-xs">
                {on && state.starts_at && <>Started {formatDate(state.starts_at, { dateStyle: "medium", timeStyle: "short" })}</>}
                {on && state.eta && <> · est. completion {formatDate(state.eta, { dateStyle: "medium", timeStyle: "short" })}</>}
                {!on && state.updated_at && <>Last changed {formatDate(state.updated_at, { dateStyle: "medium", timeStyle: "short" })}</>}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={on ? "Turn maintenance mode off" : "Turn maintenance mode on"}
          disabled={pending}
          onClick={() => save(!on, { confirm: true })}
          className={cn(
            "relative h-9 w-[68px] shrink-0 self-start rounded-full transition-colors duration-500 disabled:opacity-60 sm:self-center",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            on ? "bg-amber-500" : "bg-muted-foreground/30",
          )}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className={cn("absolute top-1 grid h-7 w-7 place-items-center rounded-full bg-white shadow", on ? "right-1" : "left-1")}
          >
            {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black/70" />}
          </motion.span>
        </button>
      </div>

      {!compact && (
        <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="maint-message">Message for visitors (optional)</Label>
            <Textarea
              id="maint-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We're polishing a few things behind the scenes. Back shortly!"
              maxLength={280}
              className="min-h-24"
              invalid={Boolean(errors.message)}
            />
            <FieldError message={errors.message} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/280</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="maint-start">Maintenance start</Label>
              <button
                type="button"
                onClick={() => setStartsAt(toLocalInput(new Date().toISOString()))}
                className="mb-1.5 text-xs font-medium text-primary hover:underline"
              >
                Now
              </button>
            </div>
            <Input
              id="maint-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              invalid={Boolean(errors.starts_at)}
            />
            <FieldError message={errors.starts_at} />
            <p className="mt-1.5 text-xs text-muted-foreground">Leave empty to use the moment you switch it on.</p>
          </div>
          <div>
            <Label htmlFor="maint-eta">Estimated completion</Label>
            <Input id="maint-eta" type="datetime-local" value={eta} min={startsAt || undefined} onChange={(e) => setEta(e.target.value)} invalid={Boolean(errors.eta)} />
            <FieldError message={errors.eta} />
            <p className="mt-1.5 text-xs text-muted-foreground">Shows a countdown and live progress bar to visitors.</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!compact && (
          <Button size="sm" variant="secondary" onClick={() => save(on)} loading={pending} disabled={!dirty}>
            {!pending && <Save className="h-4 w-4" />} Save details
          </Button>
        )}
        <Link
          href="/admin/maintenance-preview"
          target="_blank"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Preview page <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        {compact && (
          <Link href="/admin/settings#maintenance" className="inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            Schedule & message →
          </Link>
        )}
      </div>
    </Card>
  );
}
