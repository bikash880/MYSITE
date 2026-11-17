import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, Download, Mail, MapPin, Sparkles } from "lucide-react";
import { PageHeader, Section, SectionHeading } from "@/components/site/section";
import { SkillBars, Timeline } from "@/components/site/about-blocks";
import { Reveal } from "@/components/site/motion";
import { SocialLinks } from "@/components/social-icons";
import { EmptyState } from "@/components/ui/misc";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { getCertificates, getEducation, getExperiences, getProfile, getSkills } from "@/lib/data";
import { CertificatesGallery } from "@/components/site/certificates";
import { downloadUrl, initials, isExternalImage } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About",
  description: "My background, skills, education and work experience.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [profile, skills, experiences, education, certificates] = await Promise.all([
    getProfile(),
    getSkills(),
    getExperiences(),
    getEducation(),
    getCertificates(),
  ]);
  const paragraphs = (profile.bio ?? profile.short_intro ?? "").split(/\n\s*\n/).filter(Boolean);
  const facts = [
    profile.location && { icon: MapPin, label: "Based in", value: profile.location },
    (profile.years_experience ?? 0) > 0 && { icon: Briefcase, label: "Experience", value: `${profile.years_experience}+ years` },
    { icon: Sparkles, label: "Status", value: profile.available ? "Open to new projects" : "Currently booked" },
    profile.email && { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHeader
        eyebrow="About me"
        title={`Hi, I'm *${profile.full_name.split(" ")[0] || profile.full_name}*.`}
        description={profile.title + (profile.short_intro ? ` — ${profile.short_intro}` : "")}
      />

      <section className="container-page grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <Reveal className="mx-auto w-full max-w-sm lg:max-w-none">
          <div className="lg:sticky lg:top-28">
            <div className="border-gradient relative aspect-[4/5] overflow-hidden rounded-[2.25rem] bg-card shadow-[0_40px_90px_-35px_color-mix(in_oklab,var(--brand)_45%,transparent)]">
              {profile.photo_url ? (
                <Image
                  src={profile.photo_url}
                  alt={profile.full_name}
                  fill
                  sizes="(max-width: 1024px) 384px, 460px"
                  className="object-cover"
                  unoptimized={isExternalImage(profile.photo_url)}
                />
              ) : (
                <div className="relative grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand)_45%,transparent),transparent_60%),radial-gradient(circle_at_80%_90%,color-mix(in_oklab,var(--brand-2)_35%,transparent),transparent_55%)]">
                  <div aria-hidden className="bg-grid absolute inset-0 opacity-50" />
                  <span className="accent-serif relative text-8xl text-foreground/90">{initials(profile.full_name)}</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold tracking-tight">{profile.full_name}</p>
                <p className="text-sm text-muted-foreground">{profile.title}</p>
              </div>
              <SocialLinks profile={profile} className="justify-end" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="space-y-6 text-lg leading-[1.8] text-foreground/80 sm:text-xl sm:leading-[1.75]">
            {paragraphs.length ? (
              paragraphs.map((p, i) => (
                <p key={i} className={i === 0 && p.length > 160 ? "text-foreground first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-7xl first-letter:leading-[0.85] first-letter:text-primary" : undefined}>
                  {p}
                </p>
              ))
            ) : (
              <p>Bio coming soon.</p>
            )}
          </div>

          <dl className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4 bg-card p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 break-words font-medium">
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

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {profile.cv_url && (
              <a href={downloadUrl(profile.cv_url)} download className={buttonVariants({ size: "lg" })}>
                <Download className="relative h-4 w-4" /> <span className="relative">Download CV</span>
              </a>
            )}
            <Link href="/resume" className={buttonVariants({ size: "lg", variant: profile.cv_url ? "outline" : "primary" })}>
              View resume <ArrowIcon />
            </Link>
          </div>
        </Reveal>
      </section>

      <Section>
        <SectionHeading eyebrow="Toolbox" title="Skills & *expertise*" description="The tools and technologies I reach for every day." />
        {skills.length ? <SkillBars skills={skills} /> : <EmptyState title="No skills added yet" />}
      </Section>

      <Section className="grid gap-16 pt-0 sm:pt-0 lg:grid-cols-2 lg:gap-12">
        <div>
          <SectionHeading eyebrow="Career" title="Experience" />
          {experiences.length ? <Timeline type="work" items={experiences} /> : <EmptyState title="No experience added yet" />}
        </div>
        <div>
          <SectionHeading eyebrow="Learning" title="Education" />
          {education.length ? <Timeline type="education" items={education} /> : <EmptyState title="No education added yet" />}
        </div>
      </Section>

      {certificates.length > 0 && (
        <Section className="pt-0 sm:pt-0">
          <SectionHeading
            eyebrow="Certifications"
            title="Always *learning*"
            action={
              <Link href="/certificates" className={buttonVariants({ variant: "outline" })}>
                All certificates <ArrowIcon />
              </Link>
            }
          />
          <CertificatesGallery certificates={certificates.slice(0, 3)} showFilter={false} />
        </Section>
      )}
    </>
  );
}
