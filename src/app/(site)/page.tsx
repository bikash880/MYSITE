import Link from "next/link";
import { Briefcase, Download, FileText, Mail, MapPin, Sparkles } from "lucide-react";
import { Hero } from "@/components/site/hero";
import { RichTitle, Section, SectionHeading } from "@/components/site/section";
import { ProjectsGrid } from "@/components/site/projects-grid";
import { CertificatesGallery } from "@/components/site/certificates";
import { Timeline } from "@/components/site/about-blocks";
import { CountUp, Marquee, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/site/motion";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { getCertificates, getEducation, getExperiences, getProfile, getProjects, getSkills } from "@/lib/data";
import { downloadUrl, SITE_URL } from "@/lib/utils";

export const revalidate = 60;

export default async function HomePage() {
  const [profile, projects, certificates, skills, experiences, education] = await Promise.all([
    getProfile(),
    getProjects(),
    getCertificates(),
    getSkills(),
    getExperiences(),
    getEducation(),
  ]);

  // Featured items first, topped up with the latest others so grids are always full.
  const featuredProjects = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)].slice(0, 4);
  const featuredCerts = [...certificates.filter((c) => c.featured), ...certificates.filter((c) => !c.featured)].slice(0, 3);
  const bio = (profile.bio ?? profile.short_intro ?? "").split(/\n\s*\n/).filter(Boolean).slice(0, 2);

  const stats = [
    { label: "Years of experience", value: profile.years_experience ?? 0, suffix: "+" },
    { label: "Projects delivered", value: projects.length, suffix: "" },
    { label: "Certifications earned", value: certificates.length, suffix: "" },
    { label: "Technologies", value: skills.length, suffix: "" },
  ].filter((s) => s.value > 0);

  const facts = [
    profile.location && { icon: MapPin, label: "Based in", value: profile.location },
    (profile.years_experience ?? 0) > 0 && { icon: Briefcase, label: "Experience", value: `${profile.years_experience}+ years` },
    { icon: Sparkles, label: "Status", value: profile.available ? "Open to opportunities" : "Currently booked" },
    profile.email && { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string }[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    jobTitle: profile.title,
    url: SITE_URL,
    image: profile.photo_url ?? undefined,
    sameAs: [profile.github_url, profile.linkedin_url, profile.twitter_url, profile.instagram_url].filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero profile={profile} projectCount={projects.length} />

      {/* Tech ticker */}
      {skills.length > 0 && (
        <section aria-label="Technologies" className="border-y border-border bg-card/30 py-6 backdrop-blur">
          <Marquee duration={Math.max(25, skills.length * 5)}>
            {skills.map((s) => (
              <span key={s.id} className="mx-6 inline-flex items-center gap-3 text-lg font-medium text-muted-foreground sm:mx-10 sm:text-xl">
                {s.icon && <span aria-hidden>{s.icon}</span>}
                {s.name}
                <span aria-hidden className="ml-6 text-primary/40 sm:ml-10">✦</span>
              </span>
            ))}
          </Marquee>
        </section>
      )}

      {/* About snapshot */}
      <section id="about-me" className="container-page scroll-mt-24 py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow text-primary">About me</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              <RichTitle text="A little *about* me" />
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
              {bio.length ? bio.map((p, i) => <p key={i}>{p}</p>) : <p>{profile.title}</p>}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/about" className={buttonVariants({ size: "lg" })}>
                More about me <ArrowIcon />
              </Link>
              {profile.cv_url ? (
                <a href={downloadUrl(profile.cv_url)} download className={buttonVariants({ size: "lg", variant: "outline" })}>
                  <Download className="h-4 w-4" /> Download CV
                </a>
              ) : (
                <Link href="/resume" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  <FileText className="h-4 w-4" /> View resume
                </Link>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col gap-4">
            {stats.length > 0 && (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card p-6">
                    <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                      <CountUp value={s.value} suffix={s.suffix} className="text-gradient" />
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <dl className="grid gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border sm:grid-cols-2">
              {facts.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3 bg-card p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 break-words text-sm font-medium">
                      {href ? (
                        <a href={href} className="transition-colors hover:text-primary">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* Projects */}
      {featuredProjects.length > 0 && (
        <Section id="projects" className="scroll-mt-24 pt-0 sm:pt-0">
          <SectionHeading
            eyebrow="Projects"
            title="Selected *projects*"
            description="A curated selection of products, platforms and experiments — designed and built end to end."
            action={
              <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
                View all projects <ArrowIcon />
              </Link>
            }
          />
          <ProjectsGrid projects={featuredProjects} showFilter={false} bento />
        </Section>
      )}

      {/* Experience snapshot + resume card */}
      {(experiences.length > 0 || education.length > 0) && (
        <Section id="experience" className="scroll-mt-24">
          <SectionHeading eyebrow="Experience" title="Where I've *worked* & studied" />
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
            <div className="space-y-10">
              {experiences.length > 0 && <Timeline type="work" items={experiences.slice(0, 3)} />}
              {education.length > 0 && <Timeline type="education" items={education.slice(0, 2)} />}
            </div>
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <Spotlight className="border-gradient relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-7 shadow-soft">
                <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
                <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
                  <FileText className="h-5 w-5" />
                </span>
                <h3 className="relative mt-6 text-2xl font-semibold tracking-tight">
                  <RichTitle text="The *full* picture" />
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                  My complete resume — experience, education, skills and certifications — in one printable page.
                </p>
                <div className="relative mt-6 flex flex-col gap-2.5">
                  <Link href="/resume" className={buttonVariants({ className: "w-full" })}>
                    View resume <ArrowIcon />
                  </Link>
                  {profile.cv_url && (
                    <a href={downloadUrl(profile.cv_url)} download className={buttonVariants({ variant: "outline", className: "w-full" })}>
                      <Download className="h-4 w-4" /> Download PDF
                    </a>
                  )}
                </div>
              </Spotlight>
            </Reveal>
          </div>
        </Section>
      )}

      {/* Certificates */}
      {featuredCerts.length > 0 && (
        <Section id="certificates" className="scroll-mt-24">
          <SectionHeading
            eyebrow="Certificates"
            title="Credentials & *certifications*"
            description="Verified courses and certifications that back up my skills."
            action={
              <Link href="/certificates" className={buttonVariants({ variant: "outline" })}>
                All certificates <ArrowIcon />
              </Link>
            }
          />
          <Stagger>
            <StaggerItem>
              <CertificatesGallery certificates={featuredCerts} showFilter={false} />
            </StaggerItem>
          </Stagger>
        </Section>
      )}
    </>
  );
}
