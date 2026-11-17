"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const PULL_MAX = 18; // px the bead can be pulled down
const PULL_TRIGGER = 7; // px past which releasing the bead toggles the theme
const SEEN_KEY = "pf-lamp-seen";
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Navbar theme switch shaped like a pendant lamp. Click the lamp, pull its bead,
 * or press Enter/Space to switch between light (lamp on) and dark (lamp off).
 */
export function LampToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const swing = useAnimationControls();
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  useEffect(() => setMounted(true), []);

  const on = mounted && resolvedTheme === "light";

  const doSwing = (strength = 1) => {
    if (reduce) return;
    void swing.start({
      rotate: [0, 14 * strength, -9 * strength, 5 * strength, -2 * strength, 0],
      transition: { duration: 1.3, ease: EASE },
    });
  };

  const toggle = () => {
    setTheme(on ? "dark" : "light");
    doSwing();
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };

  // First visit: one gentle swing so people notice the lamp is interactive.
  useEffect(() => {
    if (!mounted) return;
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = setTimeout(() => doSwing(0.6), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const label = mounted ? `Switch to ${on ? "dark" : "light"} mode` : "Switch theme";

  return (
    <div className={cn("relative shrink-0", className)}>
      <motion.button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={on}
        title={on ? "Turn the lamp off (dark mode)" : "Turn the lamp on (light mode)"}
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className={cn(
          "group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border transition-[border-color,box-shadow,background-color] duration-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          on
            ? "border-amber-300/70 bg-amber-50 shadow-[0_0_0_4px_rgba(251,191,36,.14),0_8px_24px_-8px_rgba(245,158,11,.55)]"
            : "border-border bg-muted/60 hover:border-foreground/20",
        )}
      >
        {/* warm light pooling inside the button */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.6 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_72%,rgba(253,224,140,.95),rgba(251,191,36,.25)_55%,transparent_80%)]"
        />

        {/* the lamp, swinging from the top of the button */}
        <motion.svg
          aria-hidden
          viewBox="0 0 24 28"
          animate={swing}
          style={{ transformOrigin: "50% 0%" }}
          className="relative -mt-2 h-[30px] w-[26px] transition-transform duration-500 group-hover:rotate-[5deg]"
        >
          <defs>
            <linearGradient id={`shade-${gid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5b5b68" />
              <stop offset=".55" stopColor="#2a2a33" />
              <stop offset="1" stopColor="#141419" />
            </linearGradient>
            <linearGradient id={`rim-${gid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--brand)" />
              <stop offset=".5" stopColor="var(--brand-3)" />
              <stop offset="1" stopColor="var(--brand-2)" />
            </linearGradient>
            <radialGradient id={`bulb-${gid}`} cx=".5" cy=".2" r=".9">
              <stop offset="0" stopColor="#fffbe8" />
              <stop offset=".6" stopColor="#fde68a" />
              <stop offset="1" stopColor="#f59e0b" />
            </radialGradient>
          </defs>
          {/* cord + cap */}
          <line x1="12" y1="0" x2="12" y2="7.5" stroke="currentColor" strokeOpacity=".45" strokeWidth="1" />
          <rect x="10.4" y="6.6" width="3.2" height="2.2" rx=".7" fill="#4a4a55" />
          {/* shade */}
          <path d="M4.5 16.2C4.5 11.6 7.8 8.4 12 8.4s7.5 3.2 7.5 7.8Z" fill={`url(#shade-${gid})`} />
          <path d="M6.2 13.4c.7-2.2 2.6-3.7 4.8-3.9" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".9" strokeLinecap="round" />
          <line x1="4.9" y1="16.2" x2="19.1" y2="16.2" stroke={`url(#rim-${gid})`} strokeWidth="1.1" strokeLinecap="round" />
          {/* bulb: flickers on, fades off */}
          <motion.path
            d="M9.1 16.4a2.9 2.9 0 0 0 5.8 0Z"
            initial={false}
            animate={
              on
                ? { fill: `url(#bulb-${gid})`, opacity: reduce ? 1 : [0.35, 1, 0.55, 1] }
                : { fill: "#6b6b78", opacity: 1 }
            }
            transition={{ duration: on ? 0.55 : 0.35, ease: "easeOut" }}
          />
          {/* rays */}
          <AnimatePresence>
            {on && (
              <motion.g
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
                stroke="#f59e0b"
                strokeWidth="1.1"
                strokeLinecap="round"
              >
                <line x1="12" y1="21.4" x2="12" y2="24" />
                <line x1="8.2" y1="20.4" x2="6.8" y2="22.6" />
                <line x1="15.8" y1="20.4" x2="17.2" y2="22.6" />
              </motion.g>
            )}
          </AnimatePresence>
        </motion.svg>
      </motion.button>

      {/* pull string + bead, dangling just below the button */}
      <div className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center">
        <span aria-hidden className="block h-[9px] w-px bg-foreground/35" />
        <motion.button
          type="button"
          tabIndex={-1}
          aria-hidden
          drag={reduce ? false : "y"}
          dragConstraints={{ top: 0, bottom: PULL_MAX }}
          dragElastic={0.12}
          dragSnapToOrigin
          dragTransition={{ bounceStiffness: 700, bounceDamping: 14 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > PULL_TRIGGER) toggle();
          }}
          onTap={toggle}
          whileTap={{ y: 6 }}
          className="-m-2 grid cursor-grab touch-none place-items-center p-2 active:cursor-grabbing"
        >
          <span
            className={cn(
              "block h-[8px] w-[6px] rounded-full transition-[background-color,box-shadow] duration-500",
              on ? "bg-amber-400 shadow-[0_0_8px_1px_rgba(251,191,36,.8)]" : "bg-gradient-to-b from-primary to-accent shadow-[0_2px_6px_-1px_var(--brand)]",
            )}
          />
        </motion.button>
      </div>
    </div>
  );
}
