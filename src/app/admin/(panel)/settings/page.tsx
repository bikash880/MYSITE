import type { Metadata } from "next";
import { SingletonForm } from "@/components/admin/singleton-form";
import { MaintenanceControl } from "@/components/admin/maintenance-control";
import { fetchMaintenance, getSingleton } from "@/lib/server/repo";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [data, maintenance] = await Promise.all([getSingleton("settings"), fetchMaintenance()]);
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Maintenance mode, site title, SEO and theme colour.</p>
      </div>
      <div className="mb-6">
        <MaintenanceControl initial={maintenance} />
      </div>
      <SingletonForm kind="settings" initial={data as unknown as Record<string, unknown>} />
    </div>
  );
}
