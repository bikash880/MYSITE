import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { GitHubIcon } from "@/components/social-icons";
import { cn } from "@/lib/utils";
import { CoverImage } from "./cover-image";
import { Spotlight } from "./motion";
import type { Project } from "@/types";

export function ProjectCard({ project, featured = false, index }: { project: Project; featured?: boolean; index?: number }) {
  return (
    <Spotlight
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft transition-all duration-500",
        "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand)_35%,var(--border))] hover:shadow-[0_30px_60px_-20px_color-mix(in_oklab,var(--brand)_30%,transparent)]",
      )}
    >
      <Link
        href={`/projects/${project.slug}`}
        className={cn("relative block overflow-hidden", featured && "lg:flex-1")}
        aria-label={`View ${project.title}`}
        tabIndex={-1}
      >
        <CoverImage
          src={project.image_url}
          alt={project.title}
          label={project.title}
          sizes={featured ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className={cn(
            "[&_img]:transition-transform [&_img]:duration-[1.2s] [&_img]:ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:[&_img]:scale-[1.06]",
            // In the bento layout the big card's image grows to fill the two-row height.
            featured ? "aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[18rem]" : "aspect-[16/11]",
          )}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span
          aria-hidden
          className="glass absolute right-4 top-4 grid h-11 w-11 scale-75 place-items-center rounded-full border border-white/20 text-foreground opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
        >
          <ArrowUpRight className="h-5 w-5" />
        </span>
        {project.featured && (
          <span className="glass absolute left-4 top-4 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium">★ Featured</span>
        )}
      </Link>

      <div className={cn("flex flex-col p-6", featured ? "lg:flex-none" : "flex-1")}>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {typeof index === "number" && <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>}
          <span className="eyebrow text-[10.5px] text-primary">{project.category}</span>
        </div>
        <h3 className={cn("mt-2 font-semibold tracking-tight", featured ? "text-2xl sm:text-3xl" : "text-xl")}>
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {project.title}
          </Link>
        </h3>
        <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", featured ? "line-clamp-3 sm:text-base" : "line-clamp-2")}>
          {project.summary}
        </p>

        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          {project.tech.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {project.tech.slice(0, featured ? 6 : 4).map((t) => (
                <li key={t} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <span />
          )}
          {/* z-10 keeps these links above the card-wide link overlay */}
          <div className="relative z-10 flex shrink-0 gap-1">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title} source code on GitHub`}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <GitHubIcon className="h-4 w-4" />
              </a>
            )}
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.title} live demo`}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Spotlight>
  );
}
