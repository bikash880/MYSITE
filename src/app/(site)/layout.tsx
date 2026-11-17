import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { VisitTracker } from "@/components/site/visit-tracker";
import { BackToTop, ScrollProgress } from "@/components/site/motion";
import type { Metadata } from "next";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { getMaintenance, getProfile, getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const maintenance = await getMaintenance();
  if (!maintenance.enabled) return {};
  return {
    // A template without "%s" replaces every page's own title while in maintenance.
    title: { default: "Down for maintenance", template: "Down for maintenance" },
    robots: { index: false, follow: false },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, settings, maintenance] = await Promise.all([getProfile(), getSettings(), getMaintenance()]);

  // Maintenance mode: every public page shows the maintenance screen instead. (/admin is a separate
  // layout and is never affected.) Turning it off in the admin revalidates all pages instantly.
  if (maintenance.enabled) {
    return (
      <MaintenanceScreen
        name={profile.full_name}
        siteTitle={settings.site_title}
        email={profile.email}
        message={maintenance.message}
        startsAt={maintenance.starts_at}
        eta={maintenance.eta}
      />
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
      {/* Ambient background: aurora glow, fading grid and film grain. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px] print:hidden overflow-hidden [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]">
        <div className="absolute -top-64 left-1/2 h-[42rem] w-[72rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_32%,transparent),transparent)] blur-2xl" />
        <div className="absolute top-24 -right-48 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-2)_22%,transparent),transparent)] blur-2xl" />
        <div className="absolute top-72 -left-56 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-3)_16%,transparent),transparent)] blur-2xl" />
        <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_30%,transparent_75%)]" />
      </div>
      <div aria-hidden className="bg-noise pointer-events-none fixed inset-0 z-[60] print:hidden opacity-[0.035] mix-blend-overlay dark:opacity-[0.05]" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="print:hidden">
        <ScrollProgress />
        <Navbar />
      </div>
      <main id="main" className="flex-1 pt-20 print:pt-0">
        {children}
      </main>
      <div className="print:hidden">
        <Footer profile={profile} siteTitle={settings.site_title} />
        <BackToTop />
      </div>
      <VisitTracker />
    </div>
  );
}
