import type { Metadata } from "next";
import Link from "next/link";
import { CertificatesGallery } from "@/components/site/certificates";
import { CountUp, Reveal } from "@/components/site/motion";
import { PageHeader } from "@/components/site/section";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { getCertificates } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Certificates",
  description: "Certifications, courses and credentials I've earned.",
  alternates: { canonical: "/certificates" },
};

export default async function CertificatesPage() {
  const certificates = await getCertificates();
  const issuers = new Set(certificates.map((c) => c.issuer)).size;
  const skills = new Set(certificates.flatMap((c) => c.skills)).size;
  const verifiable = certificates.filter((c) => c.credential_url).length;
  const stats = [
    { label: "Certificates", value: certificates.length },
    { label: "Issuing organisations", value: issuers },
    { label: "Skills covered", value: skills },
    { label: "Verifiable online", value: verifiable },
  ].filter((s) => s.value > 0);

  return (
    <>
      <PageHeader
        eyebrow="Credentials"
        title="Certificates & *achievements*"
        description="Courses, certifications and credentials that back up my skills. Open any card for details or to verify it."
      >
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/resume" className={buttonVariants({ size: "lg" })}>
            View full resume <ArrowIcon />
          </Link>
          <Link href="/contact" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Get in touch
          </Link>
        </div>
      </PageHeader>

      {stats.length > 0 && (
        <Reveal className="container-page mb-14">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] border border-border bg-border lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-card p-6">
                <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  <CountUp value={s.value} className="text-gradient" />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <section className="container-page">
        <CertificatesGallery certificates={certificates} />
      </section>
    </>
  );
}
