"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BadgeCheck, CalendarDays, ExternalLink, Hash, Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn, formatDate, isExternalImage } from "@/lib/utils";
import type { Certificate } from "@/types";
import { Spotlight } from "./motion";

const isExpired = (c: Certificate) => Boolean(c.expiry_date && new Date(`${c.expiry_date}T23:59:59`) < new Date());

function CertificateArt({ cert, sizes, className }: { cert: Certificate; sizes: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {cert.image_url ? (
        <Image
          src={cert.image_url}
          alt={`${cert.title} certificate`}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized={isExternalImage(cert.image_url)}
        />
      ) : (
        // Elegant generated "certificate" when no scan is uploaded.
        <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_15%_10%,color-mix(in_oklab,var(--brand)_35%,transparent),transparent_55%),radial-gradient(circle_at_90%_95%,color-mix(in_oklab,var(--brand-2)_28%,transparent),transparent_50%)]">
          <div aria-hidden className="bg-grid absolute inset-0 opacity-50" />
          <div aria-hidden className="absolute inset-3 rounded-2xl border border-foreground/10" />
          <div className="relative flex flex-col items-center px-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-glow">
              <Award className="h-7 w-7" />
            </span>
            <span className="eyebrow mt-4 text-[9.5px] text-muted-foreground">Certificate of completion</span>
            <span className="accent-serif mt-1 line-clamp-2 text-2xl leading-tight text-foreground/85">{cert.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function CertificateCard({ cert, onOpen }: { cert: Certificate; onOpen: () => void }) {
  const expired = isExpired(cert);
  return (
    <Spotlight className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--brand)_35%,var(--border))] hover:shadow-[0_30px_60px_-20px_color-mix(in_oklab,var(--brand)_30%,transparent)]">
      <div className="relative">
        <CertificateArt
          cert={cert}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[4/3] [&_img]:transition-transform [&_img]:duration-[1.2s] group-hover:[&_img]:scale-105"
        />
        <span
          aria-hidden
          className="glass absolute right-4 top-4 grid h-10 w-10 scale-75 place-items-center rounded-full border border-white/20 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
        >
          <Maximize2 className="h-4 w-4" />
        </span>
        {expired ? (
          <span className="glass absolute left-4 top-4 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-300">
            Expired
          </span>
        ) : (
          cert.credential_url && (
            <span className="glass absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" /> Verifiable
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow text-[10.5px] text-primary">{cert.issuer}</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
          {/* Card-wide click target opens the viewer. */}
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:content-['']">
            {cert.title}
          </button>
        </h3>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Issued {formatDate(cert.issue_date, { year: "numeric", month: "short" })}
          {cert.expiry_date && <> · {expired ? "Expired" : "Valid until"} {formatDate(cert.expiry_date, { year: "numeric", month: "short" })}</>}
        </p>
        {cert.skills.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {cert.skills.slice(0, 4).map((s) => (
              <li key={s} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {s}
              </li>
            ))}
          </ul>
        )}
        <div className="relative z-10 mt-auto flex items-center gap-2 pt-6">
          <button type="button" onClick={onOpen} className={buttonVariants({ size: "sm", variant: "outline" })}>
            View details
          </button>
          {cert.credential_url && (
            <a
              href={cert.credential_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "sm", variant: "ghost", className: "text-primary" })}
              aria-label={`Verify ${cert.title} (opens in a new tab)`}
            >
              Verify <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </Spotlight>
  );
}

function CertificateDetails({ cert }: { cert: Certificate }) {
  const expired = isExpired(cert);
  const rows = [
    { icon: Award, label: "Issued by", value: cert.issuer },
    { icon: CalendarDays, label: "Issue date", value: formatDate(cert.issue_date, { dateStyle: "long" }) },
    cert.expiry_date && {
      icon: CalendarDays,
      label: expired ? "Expired on" : "Valid until",
      value: formatDate(cert.expiry_date, { dateStyle: "long" }),
    },
    cert.credential_id && { icon: Hash, label: "Credential ID", value: cert.credential_id },
  ].filter(Boolean) as { icon: typeof Award; label: string; value: string }[];

  return (
    <div className="space-y-6">
      <CertificateArt cert={cert} sizes="(max-width: 896px) 100vw, 896px" className="aspect-[4/3] rounded-2xl border border-border sm:aspect-[16/10]" />
      <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 bg-card p-4">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="break-all font-medium">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      {cert.description && <p className="leading-relaxed text-muted-foreground">{cert.description}</p>}
      {cert.skills.length > 0 && (
        <div>
          <p className="eyebrow text-[10.5px] text-muted-foreground">Skills covered</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cert.skills.map((s) => (
              <li key={s} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Filterable certificate grid with a detail viewer. */
export function CertificatesGallery({ certificates, showFilter = true }: { certificates: Certificate[]; showFilter?: boolean }) {
  const issuers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of certificates) counts.set(c.issuer, (counts.get(c.issuer) ?? 0) + 1);
    return [["All", certificates.length] as const, ...[...counts.entries()].sort(([a], [b]) => a.localeCompare(b))];
  }, [certificates]);
  const [active, setActive] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const filtered = active === "All" ? certificates : certificates.filter((c) => c.issuer === active);
  const open = certificates.find((c) => c.id === openId) ?? null;

  if (!certificates.length) {
    return <EmptyState icon={Award} title="No certificates yet" description="Certificates will appear here once they're published." />;
  }

  return (
    <>
      {showFilter && issuers.length > 2 && (
        <div
          role="tablist"
          aria-label="Filter certificates by issuer"
          className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {issuers.map(([name, count]) => (
            <button
              key={name}
              role="tab"
              aria-selected={active === name}
              onClick={() => setActive(name)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-300",
                active === name ? "border-transparent text-white" : "border-border bg-card/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {active === name && (
                <motion.span
                  layoutId="cert-filter"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-[color-mix(in_oklab,var(--brand)_70%,var(--brand-2))] shadow-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{name}</span>
              <span className={cn("relative font-mono text-[11px]", active === name ? "text-white/75" : "text-muted-foreground/60")}>{count}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <CertificateCard cert={c} onOpen={() => setOpenId(c.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <Modal
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open?.title ?? ""}
        description={open?.issuer}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setOpenId(null)} className={buttonVariants({ variant: "outline" })}>
              Close
            </button>
            {open?.credential_url && (
              <a href={open.credential_url} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                <BadgeCheck className="relative h-4 w-4" /> <span className="relative">Verify credential</span>
              </a>
            )}
          </>
        }
      >
        {open && <CertificateDetails cert={open} />}
      </Modal>
    </>
  );
}
