import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CoverImage } from "@/components/site/cover-image";
import { RichText } from "@/components/site/rich-text";
import { Reveal, Stagger, StaggerItem } from "@/components/site/motion";
import { ProjectCard } from "@/components/site/project-card";
import { Eyebrow, SectionHeading } from "@/components/site/section";
import { GitHubIcon } from "@/components/social-icons";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { getProject, getProjects } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.summary,
      type: "article",
      ...(project.image_url ? { images: [{ url: project.image_url }] } : {}),
    },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [project, all] = await Promise.all([getProject(slug), getProjects()]);
  if (!project) notFound();
  const more = all.filter((p) => p.id !== project.id).slice(0, 3);

  return (
    <>
      <article>
        <header className="container-page pt-12 sm:pt-20">
          <Reveal>
            <Link
              href="/projects"
              className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> All projects
            </Link>
            <div className="mt-8">
              <Eyebrow>{project.category}</Eyebrow>
            </div>
            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[1] tracking-tight sm:text-7xl">{project.title}</h1>
            <p className="mt-6 max-w-3xl text-lg text-muted-foreground sm:text-xl">{project.summary}</p>
          </Reveal>

          {/* Meta strip */}
          <Reveal delay={0.1}>
            <dl className="mt-12 grid gap-px overflow-hidden rounded-[1.5rem] border border-border bg-border sm:grid-cols-3">
              <div className="bg-card p-5">
                <dt className="eyebrow text-[10.5px] text-muted-foreground">Category</dt>
                <dd className="mt-2 font-medium">{project.category}</dd>
              </div>
              <div className="bg-card p-5">
                <dt className="eyebrow text-[10.5px] text-muted-foreground">Year</dt>
                <dd className="mt-2 font-medium">{formatDate(project.created_at, { year: "numeric" })}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-2 bg-card p-5">
                {project.live_url && (
                  <a href={project.live_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                    <span className="relative">Live site</span> <ArrowUpRight className="relative h-4 w-4" />
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                    <GitHubIcon className="h-4 w-4" /> Source
                  </a>
                )}
                {!project.live_url && !project.github_url && <span className="text-sm text-muted-foreground">Private project</span>}
              </div>
            </dl>
          </Reveal>
        </header>

        <Reveal delay={0.15} className="container-page mt-10">
          <CoverImage
            src={project.image_url}
            alt={project.title}
            label={project.title}
            priority
            sizes="(max-width: 1280px) 100vw, 1216px"
            className="aspect-[16/9] rounded-[2rem] border border-border shadow-[0_40px_100px_-40px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
          />
        </Reveal>

        <div className="container-page mt-16 grid gap-12 lg:grid-cols-[1fr_17rem] lg:gap-16">
          <div className="min-w-0">{project.content ? <RichText html={project.content} className="sm:prose-lg" /> : null}</div>
          {project.tech.length > 0 && (
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="eyebrow text-[10.5px] text-muted-foreground">Tech stack</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {project.tech.map((t) => (
                  <li key={t} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm shadow-soft">
                    {t}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </article>

      {more.length > 0 && (
        <section className="container-page mt-28">
          <SectionHeading
            eyebrow="Keep exploring"
            title="More *projects*"
            action={
              <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
                All work <ArrowIcon />
              </Link>
            }
          />
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <StaggerItem key={p.id}>
                <ProjectCard project={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </>
  );
}
