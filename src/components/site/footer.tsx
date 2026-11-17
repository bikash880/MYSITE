import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { getSocialLinks } from "@/components/social-icons";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { RichTitle } from "./section";
import type { Profile } from "@/types";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/certificates", label: "Certificates" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
];

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-full border border-border bg-card/50 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary";

/** Compact site footer: slim CTA strip, three short columns and a bottom bar. */
export function Footer({ profile, siteTitle }: { profile: Profile; siteTitle: string }) {
  const socials = getSocialLinks(profile).filter((s) => !s.href.startsWith("mailto:"));

  return (
    <footer className="relative isolate mt-20 overflow-hidden border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/2 -z-10 h-64 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />

      {/* CTA strip */}
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-5 border-b border-border py-8 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-[10.5px] text-primary">Have a project in mind?</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              <RichTitle text="Let's build something *remarkable*." />
            </h2>
          </div>
          <Link href="/contact" className={buttonVariants({ className: "shrink-0" })}>
            Start a project <ArrowIcon />
          </Link>
        </div>
      </div>

      {/* Columns */}
      <div className="container-page grid gap-8 py-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="text-base font-semibold tracking-tight">
            {siteTitle}
            <span className="text-primary">.</span>
          </Link>
          {profile.short_intro && <p className="mt-2 max-w-xs text-sm text-muted-foreground">{profile.short_intro}</p>}
          {profile.available && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Available for new work
            </p>
          )}
        </div>

        <nav aria-label="Footer">
          <h3 className="eyebrow text-[10.5px] text-foreground/70">Navigate</h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="eyebrow text-[10.5px] text-foreground/70">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {profile.email && (
              <li>
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 break-all transition-colors hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {profile.email}
                </a>
              </li>
            )}
            {profile.phone && (
              <li>
                <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {profile.phone}
                </a>
              </li>
            )}
            {profile.location && (
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {profile.location}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="container-page flex flex-col-reverse items-center justify-between gap-3 border-t border-border py-4 text-xs text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.full_name}. All rights reserved.
        </p>
        <ul className="flex items-center gap-1.5">
          {socials.map(({ label, href, Icon }) => (
            <li key={label}>
              <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={iconBtn}>
                <Icon className="h-4 w-4" />
              </a>
            </li>
          ))}
          {/* Admin entry point — /admin is protected by login (middleware + server checks). */}
          <li>
            <Link
              href="/admin"
              aria-label="Admin panel"
              title="Admin panel — sign in to manage the website"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/50 px-3.5 text-xs font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            >
              <Mail className="h-4 w-4" /> Admin
            </Link>
          </li>
          {socials.length > 0 && (
            <li className="hidden sm:block">
              <Link href="/contact" className="ml-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                Say hello <ArrowUpRight className="h-3 w-3" />
              </Link>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}
