"use client";

import { motion } from "framer-motion";
import { Briefcase, GraduationCap } from "lucide-react";
import { formatRange } from "@/lib/utils";
import type { Education, Experience, Skill } from "@/types";
import { Spotlight } from "./motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function SkillBars({ skills }: { skills: Skill[] }) {
  const groups = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Object.entries(groups).map(([category, list], gi) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: gi * 0.08, ease: EASE }}
        >
          <Spotlight className="h-full rounded-[1.75rem] border border-border bg-card p-6 shadow-soft sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">{category}</h3>
              <span className="font-mono text-xs text-muted-foreground">{String(list.length).padStart(2, "0")}</span>
            </div>
            <ul className="space-y-5">
              {list.map((s, i) => (
                <li key={s.id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      {s.icon && (
                        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-[15px]">
                          {s.icon}
                        </span>
                      )}
                      {s.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{s.level}%</span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={s.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.name} proficiency`}
                  >
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-[color-mix(in_oklab,var(--brand)_60%,var(--brand-2))] to-accent shadow-[0_0_12px_color-mix(in_oklab,var(--brand)_60%,transparent)]"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.level}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, delay: 0.15 + i * 0.07, ease: EASE }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Spotlight>
        </motion.div>
      ))}
    </div>
  );
}

type TimelineItem = {
  id: string;
  title: string;
  subtitle: string;
  location: string | null;
  range: string;
  current: boolean;
  description: string | null;
};

export function Timeline({ type, items }: { type: "work" | "education"; items: (Experience | Education)[] }) {
  const Icon = type === "work" ? Briefcase : GraduationCap;
  const rows: TimelineItem[] = items.map((it) =>
    "role" in it
      ? {
          id: it.id,
          title: it.role,
          subtitle: it.company,
          location: it.location,
          range: formatRange(it.start_date, it.end_date, it.is_current),
          current: it.is_current,
          description: it.description,
        }
      : {
          id: it.id,
          title: it.degree,
          subtitle: it.institution,
          location: it.location,
          range: formatRange(it.start_date, it.end_date, it.is_current),
          current: it.is_current,
          description: it.description,
        },
  );

  return (
    <ol className="relative space-y-5 pl-10 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-gradient-to-b before:from-primary before:via-border before:to-transparent">
      {rows.map((r, i) => (
        <motion.li
          key={r.id}
          className="relative"
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
        >
          <span
            className={
              "absolute -left-10 top-5 grid h-8 w-8 place-items-center rounded-full border bg-card " +
              (r.current ? "border-primary text-primary shadow-glow" : "border-border text-muted-foreground")
            }
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <Spotlight className="rounded-[1.5rem] border border-border bg-card p-6 shadow-soft transition-colors hover:border-[color-mix(in_oklab,var(--brand)_30%,var(--border))]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted-foreground">{r.range}</p>
              {r.current && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                  Current
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">{r.title}</h3>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground/80">{r.subtitle}</span>
              {r.location ? ` · ${r.location}` : ""}
            </p>
            {r.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{r.description}</p>}
          </Spotlight>
        </motion.li>
      ))}
    </ol>
  );
}
