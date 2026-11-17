"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Download, FileText, MapPin } from "lucide-react";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { SocialLinks } from "@/components/social-icons";
import { downloadUrl, initials, isExternalImage } from "@/lib/utils";
import type { Profile } from "@/types";
import { CountUp, Magnetic, WordReveal } from "./motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});

/** "Full-Stack Developer" → "Full-Stack *Developer*" (last word becomes the serif accent). */
function accentTitle(title: string) {
  const words = title.trim().split(/\s+/);
  if (!words.length || !words[0]) return title;
  const last = words.pop()!;
  return [...words, `*${last}*`].join(" ");
}

export function Hero({ profile, projectCount }: { profile: Profile; projectCount: number }) {
  const years = profile.years_experience ?? 0;
  // "Software Developer | Full-Stack Developer | AI Enthusiast" → headline + supporting roles line.
  const [lead = profile.title, ...roles] = profile.title
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="container-page relative grid items-center gap-12 pt-8 pb-14 sm:gap-14 sm:pt-12 sm:pb-16 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-12">
      <div className="relative z-10">
        <motion.div {...fade(0)} className="flex flex-wrap items-center gap-3">
          {profile.available ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Available for new projects
            </span>
          ) : null}
          {profile.location && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </span>
          )}
        </motion.div>

        <motion.p {...fade(0.08)} className="mt-7 flex items-center gap-3 text-sm text-muted-foreground sm:text-[15px]">
          <span className="font-mono text-xs font-medium text-primary sm:text-[13px]">&lt;hello /&gt;</span>
          <span aria-hidden className="h-px w-8 bg-gradient-to-r from-primary/70 to-transparent" />
          <span>
            I&apos;m <span className="font-semibold text-foreground">{profile.full_name}</span>
          </span>
        </motion.p>

        <WordReveal
          text={accentTitle(lead)}
          delay={0.15}
          className="mt-4 max-w-[20ch] text-[clamp(1.86rem,5.4vw,3.9rem)] font-semibold leading-[1.04] tracking-[-0.035em]"
        />

        {roles.length > 0 && (
          <motion.p
            {...fade(0.35)}
            className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15px] font-medium text-foreground/80 sm:text-lg"
          >
            {roles.map((role, i) => (
              <span key={role} className="inline-flex items-center gap-3">
                {i > 0 && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary to-accent" />}
                {role}
              </span>
            ))}
          </motion.p>
        )}

        {profile.short_intro && (
          <motion.p {...fade(0.45)} className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base lg:text-[17px]">
            {profile.short_intro}
          </motion.p>
        )}

        <motion.div {...fade(0.55)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Magnetic>
            <Link href="/contact" className={buttonVariants({ className: "w-full px-6 sm:w-auto" })}>
              Let&apos;s work together <ArrowIcon />
            </Link>
          </Magnetic>
          <Link href="/resume" className={buttonVariants({ variant: "outline", className: "px-6" })}>
            <FileText className="h-4 w-4" /> View resume
          </Link>
        </motion.div>

        <motion.div {...fade(0.65)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border/60 pt-6 sm:max-w-lg">
          <SocialLinks profile={profile} />
          {profile.cv_url && (
            <a
              href={downloadUrl(profile.cv_url)}
              download
              rel="noopener"
              className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              <span className="underline decoration-border underline-offset-4 group-hover:decoration-primary">Download CV</span>
            </a>
          )}
        </motion.div>

        {/* Scroll cue → smooth-scrolls to the About section */}
        <motion.a
          {...fade(0.8)}
          href="#about-me"
          className="group mt-10 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
        >
          <span className="relative flex h-9 w-5 justify-center rounded-full border border-border">
            <motion.span
              className="mt-1.5 h-1.5 w-1 rounded-full bg-primary"
              animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
          Scroll to explore
        </motion.a>
      </div>

      {/* Portrait */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
        className="relative mx-auto w-full max-w-[18rem] sm:max-w-[21rem] lg:mr-0 lg:max-w-[24rem] xl:max-w-[26rem]"
      >
        <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_35%,transparent),transparent)] blur-2xl" />

        <div className="border-gradient relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-card shadow-[0_40px_100px_-30px_color-mix(in_oklab,var(--brand)_45%,transparent)]">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt={`Photo of ${profile.full_name}`}
              fill
              priority
              sizes="(max-width: 1024px) 384px, 480px"
              className="object-cover"
              unoptimized={isExternalImage(profile.photo_url)}
            />
          ) : (
            <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand)_45%,transparent),transparent_60%),radial-gradient(circle_at_80%_90%,color-mix(in_oklab,var(--brand-2)_35%,transparent),transparent_55%)]">
              <div aria-hidden className="bg-grid absolute inset-0 opacity-50" />
              <span className="accent-serif relative text-[6.5rem] leading-none text-foreground/90 sm:text-[7.5rem]">{initials(profile.full_name)}</span>
            </div>
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
          <p className="absolute bottom-5 left-6 right-6 text-sm font-medium text-white/90">
            {profile.full_name}
            <span className="block text-xs font-normal text-white/70">{profile.title}</span>
          </p>
        </div>

        {/* Floating stats */}
        {years > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
            className="glass animate-float absolute -left-4 top-10 rounded-2xl border border-border px-3.5 py-2.5 shadow-soft sm:-left-8"
          >
            <p className="text-2xl font-semibold tracking-tight">
              <CountUp value={years} suffix="+" />
            </p>
            <p className="text-xs text-muted-foreground">Years of experience</p>
          </motion.div>
        )}
        {projectCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.05, duration: 0.8, ease: EASE }}
            style={{ animationDelay: "1.5s" }}
            className="glass animate-float absolute -right-3 bottom-20 rounded-2xl border border-border px-3.5 py-2.5 shadow-soft sm:-right-6"
          >
            <p className="text-2xl font-semibold tracking-tight">
              <CountUp value={projectCount} suffix="+" />
            </p>
            <p className="text-xs text-muted-foreground">Projects shipped</p>
          </motion.div>
        )}

        {/* Rotating badge */}
        <Link
          href="/contact"
          aria-label="Get in touch"
          className="group absolute -top-5 -right-3 grid h-24 w-24 place-items-center rounded-full sm:-right-6"
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 animate-spin-slow text-foreground/70" aria-hidden>
            <defs>
              <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
            </defs>
            {/* textLength makes the phrase wrap the circle exactly once (circumference ≈ 238). */}
            <text fontSize="8.5" fill="currentColor" className="font-mono uppercase">
              <textPath href="#badge-circle" textLength="236" lengthAdjust="spacing">
                {profile.available ? "Available for work · Let's talk · " : "Say hello · Get in touch · "}
              </textPath>
            </text>
          </svg>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-glow transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </Link>
      </motion.div>
    </section>
  );
}
