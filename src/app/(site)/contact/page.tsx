import type { Metadata } from "next";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/site/section";
import { ContactForm } from "@/components/site/contact-form";
import { Reveal, Spotlight } from "@/components/site/motion";
import { SocialLinks } from "@/components/social-icons";
import { getProfile } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch — let's talk about your project.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const profile = await getProfile();
  const details = [
    profile.email && { icon: Mail, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { icon: Phone, label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
    profile.location && { icon: MapPin, label: "Location", value: profile.location },
    { icon: Clock, label: "Response time", value: "Usually within 24 hours" },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHeader
        eyebrow={profile.available ? "Available for new projects" : "Contact"}
        title="Let's create something *great*."
        description="Tell me about your project, idea or role — I'd love to hear from you."
      />

      <section className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal className="flex flex-col gap-4">
          {details.map(({ icon: Icon, label, value, href }) => {
            const body = (
              <Spotlight className="group flex items-center gap-5 rounded-[1.5rem] border border-border bg-card p-5 shadow-soft transition-all duration-500 hover:border-[color-mix(in_oklab,var(--brand)_35%,var(--border))]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary ring-1 ring-primary/20 transition-all duration-500 group-hover:from-primary group-hover:to-accent group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block text-[10.5px] text-muted-foreground">{label}</span>
                  <span className="mt-1 block break-all font-medium">{value}</span>
                </span>
                {href && (
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                )}
              </Spotlight>
            );
            return href ? (
              <a key={label} href={href} className="rounded-[1.5rem]">
                {body}
              </a>
            ) : (
              <div key={label}>{body}</div>
            );
          })}
          <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-soft">
            <p className="eyebrow text-[10.5px] text-muted-foreground">Find me online</p>
            <SocialLinks profile={profile} className="mt-4" />
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="border-gradient relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight">Send a message</h2>
              <p className="mt-1 text-sm text-muted-foreground">All fields are required.</p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
