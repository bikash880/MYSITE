import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MaintenanceScreen } from "@/components/site/maintenance-screen";
import { getCurrentAdmin } from "@/lib/server/auth";
import { fetchMaintenance, fetchProfile, fetchSettings } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Maintenance preview" };
export const dynamic = "force-dynamic";

/** Admin-only preview of the page visitors see while maintenance mode is on. */
export default async function MaintenancePreviewPage() {
  if (!(await getCurrentAdmin())) redirect("/admin/login?next=/admin/maintenance-preview");
  const [profile, settings, maintenance] = await Promise.all([fetchProfile(), fetchSettings(), fetchMaintenance()]);
  return (
    <MaintenanceScreen
      preview
      name={profile.full_name}
      siteTitle={settings.site_title}
      email={profile.email}
      message={maintenance.message}
      startsAt={maintenance.starts_at}
      eta={maintenance.eta}
    />
  );
}
