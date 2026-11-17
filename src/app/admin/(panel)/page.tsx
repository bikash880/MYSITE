import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  ImageIcon,
  Mail,
  Plus,
  UserRound,
} from "lucide-react";
import { dashboardStats, fetchMaintenance, listMessages, resumeStatus } from "@/lib/server/repo";
import { MaintenanceControl } from "@/components/admin/maintenance-control";
import { getCurrentAdmin } from "@/lib/server/auth";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [s, messages, resume, user, maintenance] = await Promise.all([
    dashboardStats(),
    listMessages(),
    resumeStatus(),
    getCurrentAdmin(),
    fetchMaintenance(),
  ]);
  const recentMessages = messages.slice(0, 5);
  const todo = resume.checks.filter((c) => !c.done);
  const firstName = resume.profile.full_name.split(" ")[0] ?? "";

  const stats = [
    { label: "Projects", value: s.projects, icon: FolderKanban, href: "/admin/projects" },
    { label: "Certificates", value: s.certificates, icon: Award, href: "/admin/certificates" },
    {
      label: "Messages",
      value: s.messages,
      icon: Mail,
      href: "/admin/messages",
      hint: s.unread ? `${s.unread} unread` : "All read",
      highlight: s.unread > 0,
    },
    { label: "Media files", value: s.media, icon: ImageIcon, href: "/admin/media" },
    { label: "Site visits", value: s.visits, icon: Eye, hint: `${s.visitsWeek} in last 7 days` },
  ] as { label: string; value: number; icon: typeof Mail; href?: string; hint?: string; highlight?: boolean }[];

  const actions = [
    { href: "/admin/projects?new=1", label: "Add a project", icon: Plus },
    { href: "/admin/certificates?new=1", label: "Add a certificate", icon: Award },
    { href: "/admin/media", label: "Upload images", icon: ImageIcon },
    { href: "/admin/resume", label: "Update resume & CV", icon: FileText },
    { href: "/admin/profile", label: "Edit contact details", icon: UserRound },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Welcome back{firstName && firstName.toLowerCase() !== "your" ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {user?.email}. Here&apos;s an overview of your portfolio.</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          View live site <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <MaintenanceControl initial={maintenance} compact />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, href, hint, highlight }) => {
          const body = (
            <Card
              className={cn(
                "h-full p-4 transition sm:p-5",
                href && "hover:-translate-y-0.5 hover:border-primary/40",
                highlight && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value.toLocaleString()}</p>
              {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
            </Card>
          );
          return href ? (
            <Link key={label} href={href} className="last:col-span-2 lg:last:col-span-1">
              {body}
            </Link>
          ) : (
            <div key={label} className="last:col-span-2 lg:last:col-span-1">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Portfolio / resume completeness */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div
              className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(var(--brand) ${resume.score * 3.6}deg, var(--muted) 0deg)` }}
              role="img"
              aria-label={`Portfolio ${resume.score}% complete`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-sm font-bold">{resume.score}%</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Portfolio completeness</h2>
              <p className="text-sm text-muted-foreground">
                {todo.length ? `${todo.length} item${todo.length === 1 ? "" : "s"} to finish` : "Everything is filled in"}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-1">
            {(todo.length ? todo.slice(0, 4) : resume.checks.slice(0, 3)).map((c) => (
              <li key={c.key}>
                <Link href={c.href} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-amber-500" />}
                  <span className="flex-1">{c.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/resume" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Open resume hub <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* Recent messages */}
        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent messages</h2>
            <Link href="/admin/messages" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentMessages.length ? (
            <ul className="divide-y divide-border">
              {recentMessages.map((m) => (
                <li key={m.id}>
                  <Link href="/admin/messages" className="flex items-start gap-3 py-3">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", m.is_read ? "bg-transparent" : "bg-primary")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("truncate text-sm", !m.is_read && "font-semibold")}>{m.name}</p>
                        <time className="shrink-0 text-xs text-muted-foreground">{formatDate(m.created_at)}</time>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{m.subject}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Mail} title="No messages yet" className="py-8" />
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-5 sm:p-6">
          <h2 className="mb-3 font-display text-lg font-semibold">Quick actions</h2>
          <div className="grid gap-2">
            {actions.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={buttonVariants({ variant: "outline", className: "justify-start" })}>
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
          {s.unread > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              You have <Badge tone="primary">{s.unread}</Badge> unread message{s.unread === 1 ? "" : "s"}.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
