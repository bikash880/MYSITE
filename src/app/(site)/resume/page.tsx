import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Download, Globe, Mail, MapPin, Phone } from "lucide-react";
import { Reveal } from "@/components/site/motion";
import { Eyebrow, RichTitle } from "@/components/site/section";
import { PrintButton, ResumeNav, type ResumeSection } from "@/components/site/resume-nav";
import { getSocialLinks } from "@/components/social-icons";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { getCertificates, getEducation, getExperiences, getProfile, getProjects, getSkills } from "@/lib/data";
import { downloadUrl, formatDate, formatRange } from "@/lib/utils";
import type { Skill } from "@/types";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return {
    title: "Resume",
    description: `Resume of ${profile.full_name} — ${profile.title}. Experience, education, skills and certifications.`,
    alternates: { canonical: "/resume" },
  };
}

function ResumeSectionCard({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="scroll-mt-40 rounded-[1.75rem] border border-border bg-card p-6 shadow-soft sm:p-9 lg:scroll-mt-28 print:break-inside-avoid print:rounded-none print:border-0 print:p-0 print:py-4 print:shadow-none"
      >
        <h2 id={`${id}-title`} className="flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
          <span aria-hidden className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-accent print:hidden" />
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </section>
    </Reveal>
  );
}

export default async function ResumePage() {
  const [profile, experiences, education, skills, certificates, projects] = await Promise.all([
    getProfile(),
    getExperiences(),
    getEducation(),
    getSkills(),
    getCertificates(),
    getProjects(),
  ]);

  const summary = (profile.bio ?? profile.short_intro ?? "").split(/\n\s*\n/).filter(Boolean);
  const skillGroups = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const selectedProjects = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 4);
  const socials = getSocialLinks(profile).filter((s) => !s.href.startsWith("mailto:"));

  const sections: ResumeSection[] = [
    { id: "summary", label: "Summary" },
    experiences.length > 0 && { id: "experience", label: "Experience" },
    education.length > 0 && { id: "education", label: "Education" },
    skills.length > 0 && { id: "skills", label: "Skills" },
    certificates.length > 0 && { id: "certifications", label: "Certifications" },
    selectedProjects.length > 0 && { id: "projects", label: "Projects" },
  ].filter(Boolean) as ResumeSection[];

  const contacts = [
    profile.email && { icon: Mail, label: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { icon: Phone, label: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
    profile.location && { icon: MapPin, label: profile.location },
    profile.website_url && { icon: Globe, label: profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, ""), href: profile.website_url },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href?: string }[];

  return (
    <div className="container-page pt-12 sm:pt-20 print:pt-0">
      {/* Header */}
      <Reveal>
        <header className="flex flex-col gap-10 border-b border-border pb-12 lg:flex-row lg:items-end lg:justify-between print:pb-6">
          <div>
            <Eyebrow className="mb-6 print:hidden">Resume / CV</Eyebrow>
            <h1 className="text-5xl font-semibold leading-[1] tracking-tight sm:text-7xl print:text-4xl">
              <RichTitle text={`${profile.full_name.split(" ").slice(0, -1).join(" ")} *${profile.full_name.split(" ").slice(-1)[0] ?? ""}*`.trim()} />
            </h1>
            <p className="mt-4 text-xl text-muted-foreground sm:text-2xl print:text-lg">{profile.title}</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {contacts.map(({ icon: Icon, label, href }) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {href ? (
                    <a href={href} className="transition-colors hover:text-foreground">
                      {label}
                    </a>
                  ) : (
                    label
                  )}
                </li>
              ))}
              {socials.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
                    {label} <ArrowUpRight className="h-3.5 w-3.5 print:hidden" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch print:hidden">
            {profile.cv_url && (
              <a href={downloadUrl(profile.cv_url)} download className={buttonVariants({ size: "lg" })}>
                <Download className="relative h-4 w-4" /> <span className="relative">Download PDF</span>
              </a>
            )}
            <PrintButton className="h-13 px-7 lg:hidden" />
            <Link href="/contact" className={buttonVariants({ size: "lg", variant: profile.cv_url ? "ghost" : "primary" })}>
              Contact me <ArrowIcon />
            </Link>
          </div>
        </header>
      </Reveal>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[13rem_1fr] lg:gap-14 print:block">
        <ResumeNav sections={sections} />

        <div className="min-w-0 space-y-6 print:space-y-0">
          <ResumeSectionCard id="summary" title="Professional summary">
            <div className="space-y-4 leading-relaxed text-foreground/85">
              {summary.length ? summary.map((p, i) => <p key={i}>{p}</p>) : <p>{profile.title}</p>}
            </div>
            <dl className="mt-6 flex flex-wrap gap-3 text-sm">
              {(profile.years_experience ?? 0) > 0 && (
                <div className="rounded-full border border-border bg-muted/50 px-3.5 py-1.5">
                  <dt className="sr-only">Experience</dt>
                  <dd>
                    <span className="font-semibold">{profile.years_experience}+</span> years experience
                  </dd>
                </div>
              )}
              <div className="rounded-full border border-border bg-muted/50 px-3.5 py-1.5">
                <dt className="sr-only">Availability</dt>
                <dd className="inline-flex items-center gap-2">
                  <span className={profile.available ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-muted-foreground"} />
                  {profile.available ? "Available for new opportunities" : "Not currently available"}
                </dd>
              </div>
            </dl>
          </ResumeSectionCard>

          {experiences.length > 0 && (
            <ResumeSectionCard id="experience" title="Work experience">
              <ol className="space-y-8">
                {experiences.map((e) => (
                  <li key={e.id} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6 print:break-inside-avoid">
                    <p className="font-mono text-xs text-muted-foreground sm:pt-1">
                      {formatRange(e.start_date, e.end_date, e.is_current)}
                    </p>
                    <div>
                      <h3 className="font-semibold tracking-tight">
                        {e.role} <span className="font-normal text-muted-foreground">· {e.company}</span>
                      </h3>
                      {e.location && <p className="text-sm text-muted-foreground">{e.location}</p>}
                      {e.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{e.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </ResumeSectionCard>
          )}

          {education.length > 0 && (
            <ResumeSectionCard id="education" title="Education">
              <ol className="space-y-8">
                {education.map((e) => (
                  <li key={e.id} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-6 print:break-inside-avoid">
                    <p className="font-mono text-xs text-muted-foreground sm:pt-1">
                      {formatRange(e.start_date, e.end_date, e.is_current)}
                    </p>
                    <div>
                      <h3 className="font-semibold tracking-tight">{e.degree}</h3>
                      <p className="text-sm text-muted-foreground">
                        {e.institution}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                      {e.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{e.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </ResumeSectionCard>
          )}

          {skills.length > 0 && (
            <ResumeSectionCard id="skills" title="Skills">
              <div className="grid gap-6 sm:grid-cols-2">
                {Object.entries(skillGroups).map(([category, list]) => (
                  <div key={category}>
                    <h3 className="eyebrow text-[10.5px] text-muted-foreground">{category}</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {list.map((s) => (
                        <li key={s.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 py-1 pr-3 pl-1.5 text-sm">
                          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary/10 px-1.5 font-mono text-[10px] text-primary print:hidden">
                            {s.level}
                          </span>
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ResumeSectionCard>
          )}

          {certificates.length > 0 && (
            <ResumeSectionCard id="certifications" title="Certifications">
              <ul className="divide-y divide-border">
                {certificates.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between print:break-inside-avoid">
                    <div>
                      <h3 className="font-semibold tracking-tight">{c.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {c.issuer} · {formatDate(c.issue_date, { year: "numeric", month: "short" })}
                        {c.credential_id ? ` · ID ${c.credential_id}` : ""}
                      </p>
                    </div>
                    {c.credential_url && (
                      <a
                        href={c.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline print:hidden"
                      >
                        <BadgeCheck className="h-4 w-4" /> Verify
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <Link href="/certificates" className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary print:hidden">
                View certificates gallery <ArrowIcon />
              </Link>
            </ResumeSectionCard>
          )}

          {selectedProjects.length > 0 && (
            <ResumeSectionCard id="projects" title="Selected projects">
              <ul className="grid gap-4 sm:grid-cols-2">
                {selectedProjects.map((p) => (
                  <li key={p.id} className="print:break-inside-avoid">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="group block h-full rounded-2xl border border-border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--brand)_35%,var(--border))] hover:shadow-soft print:border-0 print:p-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold tracking-tight">{p.title}</h3>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary print:hidden" />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
                      {p.tech.length > 0 && <p className="mt-3 font-mono text-[11px] text-muted-foreground">{p.tech.join(" · ")}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </ResumeSectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
