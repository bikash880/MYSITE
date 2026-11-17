"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ResumeSection = { id: string; label: string };

/**
 * Scroll-spy: the active section is the last one whose top has passed a line
 * just below the sticky header (the last section wins at the very bottom).
 */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerWidth >= 1024 ? 140 : 200;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      if (atBottom && ids.length) current = ids[ids.length - 1]!;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);
  return [active, setActive] as const;
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

/** Sticky sidebar (desktop) + horizontal chip bar (mobile). */
export function ResumeNav({ sections }: { sections: ResumeSection[] }) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const [active, setActive] = useActiveSection(ids);

  const onClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setActive(id);
    scrollTo(id);
  };

  return (
    <>
      {/* Mobile / tablet */}
      <nav aria-label="Resume sections" className="glass sticky top-[4.75rem] z-30 -mx-5 mb-8 border-y border-border px-5 py-2.5 lg:hidden print:hidden">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={onClick(s.id)}
                aria-current={active === s.id ? "true" : undefined}
                className={cn(
                  "block rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active === s.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop */}
      <nav aria-label="Resume sections" className="sticky top-28 hidden self-start lg:block print:hidden">
        <p className="eyebrow text-[10.5px] text-muted-foreground">On this page</p>
        <ul className="relative mt-5 space-y-1 border-l border-border">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={onClick(s.id)}
                aria-current={active === s.id ? "true" : undefined}
                className={cn(
                  "relative -ml-px block border-l py-1.5 pl-4 text-sm transition-colors",
                  active === s.id ? "border-transparent font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {active === s.id && (
                  <motion.span
                    layoutId="resume-toc"
                    className="absolute inset-y-0 -left-px w-0.5 rounded-full bg-gradient-to-b from-primary to-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <PrintButton className="mt-8 w-full" />
      </nav>
    </>
  );
}

export function PrintButton({ className, label = "Print / Save PDF" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: "outline", className })}>
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
