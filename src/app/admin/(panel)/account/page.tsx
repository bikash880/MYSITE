import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, KeyRound, Laptop, Lock, MailCheck, ShieldCheck, Smartphone } from "lucide-react";
import { ChangePasswordForm, SessionControls } from "@/components/admin/account-forms";
import { Badge, Card } from "@/components/ui/misc";
import { getCurrentAdmin, registrationStatus, sessionInfo } from "@/lib/server/auth";
import { sessionPolicy } from "@/lib/server/admin-config";
import { isMailConfigured } from "@/lib/server/mailer";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Account & security" };

const when = (iso: string) => formatDate(iso, { dateStyle: "medium", timeStyle: "short" });

function deviceLabel(ua: string | null) {
  if (!ua) return "Unknown device";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const app = /Expo|okhttp|CFNetwork|Dalvik/.test(ua) ? "Mobile app" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return [app, os].filter(Boolean).join(" on ");
}

export default async function AccountPage() {
  const user = await getCurrentAdmin();
  if (!user?.session) redirect("/admin/login?expired=1");
  const [info, reg] = await Promise.all([sessionInfo(user.id, user.session.id), registrationStatus()]);
  const registeredAt = reg.registeredAt?.toISOString() ?? null;
  const policy = sessionPolicy();

  const protections = [
    { icon: MailCheck, label: "Email verification", value: isMailConfigured ? "6-digit code by email" : "Code in server console (dev)" },
    { icon: Lock, label: "Session token", value: "Encrypted JWT (A256GCM)" },
    { icon: Clock, label: "Auto sign-out", value: `${policy.idleMs / 60000} min idle · ${policy.maxAgeMs / 3600000} h max` },
    { icon: ShieldCheck, label: "Attempt limits", value: "8 per IP · 5 codes · 15-min lock" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Account & security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{user.email}</span> — the only account allowed into this panel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {protections.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-medium">{value}</p>
          </Card>
        ))}
      </div>

      {!isMailConfigured && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="flex items-center gap-2 font-medium">
            <MailCheck className="h-4 w-4" /> Email delivery isn&apos;t configured
          </p>
          <p className="mt-1">
            Login codes and security alerts are printed in the server terminal (development only). Add <code>SMTP_PASS</code> (a Gmail App Password) to{" "}
            <code>.env.local</code> to receive them by email. In production, admin login is blocked until email is set up.
          </p>
        </div>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Active sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This session ends at <span className="font-medium text-foreground">{when(user.session.expiresAt)}</span>, or after{" "}
              {policy.idleMs / 60000} minutes of inactivity. Last sign-in: {info.lastLogin ? when(info.lastLogin) : "—"}.
            </p>
          </div>
          <SessionControls active={info.active} />
        </div>
        <ul className="mt-5 divide-y divide-border rounded-2xl border border-border">
          {info.sessions.map((s) => {
            const mobile = /Expo|okhttp|CFNetwork|Dalvik|Android|iPhone/.test(s.userAgent ?? "");
            return (
              <li key={s.id} className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  {mobile ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {deviceLabel(s.userAgent)}
                    {s.current && <Badge tone="success">This device</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    IP {s.ip} · signed in {when(s.createdAt)} · last active {when(s.lastSeenAt)} · expires {when(s.expiresAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-5 w-5 text-primary" /> Change password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stored only as a bcrypt hash. Changing it signs out every other device and emails you a security alert.
        </p>
        <ChangePasswordForm />
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Lock className="h-5 w-5 text-primary" /> Server recovery
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Public registration is permanently closed{registeredAt ? <> (account created {when(registeredAt)})</> : null}. If you ever lose access,
          run one of these in the project folder on the server, then restart it:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-muted/60 p-3 text-xs leading-relaxed">
          <code>{`npm run admin:password -- "new-strong-password"     # reset the password (signs out all sessions)
npm run admin:password -- --reset-registration      # delete the account and re-open one-time registration
npm run admin:password -- --secret-only --rotate    # rotate AUTH_SECRET (invalidates every session)`}</code>
        </pre>
      </Card>
    </div>
  );
}
