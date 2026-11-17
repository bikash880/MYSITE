"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import type { Project } from "@/types";

export function ProjectsGrid({
  projects,
  showFilter = true,
  bento = false,
}: {
  projects: Project[];
  showFilter?: boolean;
  /** First card spans two columns (used for "featured work"). */
  bento?: boolean;
}) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [["All", projects.length] as const, ...[...counts.entries()].sort(([a], [b]) => a.localeCompare(b))];
  }, [projects]);
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  if (!projects.length) {
    return <EmptyState icon={FolderOpen} title="No projects yet" description="Projects will appear here once they're published." />;
  }

  return (
    <>
      {showFilter && categories.length > 2 && (
        <div
          role="tablist"
          aria-label="Filter projects by category"
          className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {categories.map(([c, count]) => (
            <button
              key={c}
              role="tab"
              aria-selected={active === c}
              onClick={() => setActive(c)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-300",
                active === c ? "border-transparent text-white" : "border-border bg-card/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {active === c && (
                <motion.span
                  layoutId="project-filter"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-[color-mix(in_oklab,var(--brand)_70%,var(--brand-2))] shadow-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{c}</span>
              <span className={cn("relative font-mono text-[11px]", active === c ? "text-white/75" : "text-muted-foreground/60")}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => {
            const big = bento && i === 0 && filtered.length > 2;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className={cn(big && "sm:col-span-2 lg:row-span-2")}
              >
                <ProjectCard project={p} featured={big} index={i} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
