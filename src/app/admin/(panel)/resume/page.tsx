import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import { CvManager } from "@/components/admin/cv-manager";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { resumeStatus } from "@/lib/server/repo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resume" };

export default async function AdminResumePage() {
  const { profile, checks, score, counts } = await resumeStatus();
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const sections = [
    { label: "Profile & summary", value: profile.full_name, href: "/admin/profile" },
    { label: "Experience", value: plural(counts.experiences, "entry", "entries"), href: "/admin/experiences" },
    { label: "Education", value: plural(counts.education, "entry", "entries"), href: "/admin/education" },
    { label: "Skills", value: plural(counts.skills, "skill", "skills"), href: "/admin/skills" },
    { label: "Certifications", value: `${counts.certificates} published`, href: "/admin/certificates" },
    { label: "Projects", value: `${counts.projects} published`, href: "/admin/projects" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Resume</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your public resume is built from these sections. Keep them up to date here.</p>
        </div>
        <a href="/resume" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
          Preview resume <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Downloadable CV</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">Used by every “Download CV / PDF” button on the site.</p>
          <CvManager cvUrl={profile.cv_url} />
        </Card>

        <Card className="flex items-center gap-5 p-5 sm:p-6">
          <div
            className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--brand) ${score * 3.6}deg, var(--muted) 0deg)` }}
            role="img"
            aria-label={`Resume ${score}% complete`}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-card font-display text-xl font-bold">{score}%</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Completeness</p>
            <p className="text-sm text-muted-foreground">
              {checks.filter((c) => c.done).length} of {checks.length} items done
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Checklist</h2>
          <ul className="mt-4 divide-y divide-border">
            {checks.map((c) => (
              <li key={c.key}>
                <Link href={c.href} className="group flex items-center gap-3 py-3">
                  {c.done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-label="Done" />
                  ) : (
                    <CircleDashed className="h-5 w-5 shrink-0 text-amber-500" aria-label="To do" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{c.label}</span>
                    <span className={cn("block truncate text-xs", c.done ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400")}>{c.detail}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Resume sections</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="flex h-full flex-col rounded-2xl border border-border p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <span className="mt-1 truncate font-medium">{s.value}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
