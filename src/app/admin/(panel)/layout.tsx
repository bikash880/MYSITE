import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { SessionGuard } from "@/components/admin/session-guard";
import { getCurrentAdmin } from "@/lib/server/auth";
import { sessionPolicy } from "@/lib/server/admin-config";
import { isDbConfigured } from "@/lib/server/db";
import { countUnread, fetchMaintenance } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isDbConfigured) redirect("/admin/login");

  // Second line of defence after the middleware: decrypts the token AND checks the session in the
  // database (revoked, idle-expired or not OTP-verified sessions are rejected here).
  const user = await getCurrentAdmin();
  if (!user?.session) redirect("/admin/login?expired=1");

  const [unread, maintenance] = await Promise.all([countUnread().catch(() => 0), fetchMaintenance().catch(() => null)]);

  return (
    <AdminShell email={user.email} unread={unread} maintenance={Boolean(maintenance?.enabled)}>
      <SessionGuard idleMs={sessionPolicy().idleMs} expiresAt={user.session.expiresAt} />
      {children}
    </AdminShell>
  );
}
