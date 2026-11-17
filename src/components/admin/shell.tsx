"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Construction,
  FileText,
  ImageIcon,
  ShieldCheck,
  Briefcase,
  ExternalLink,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut as signOutAction } from "@/lib/actions-client";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
  badge?: "unread";
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { href: "/admin/messages", label: "Messages", icon: Mail, badge: "unread", group: "Overview" },
  { href: "/admin/profile", label: "Profile & contact", icon: User, group: "Content" },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban, group: "Content" },
  { href: "/admin/certificates", label: "Certificates", icon: Award, group: "Content" },
  { href: "/admin/resume", label: "Resume", icon: FileText, group: "Resume" },
  { href: "/admin/experiences", label: "Experience", icon: Briefcase, group: "Resume" },
  { href: "/admin/education", label: "Education", icon: GraduationCap, group: "Resume" },
  { href: "/admin/skills", label: "Skills", icon: Sparkles, group: "Resume" },
  { href: "/admin/media", label: "Media library", icon: ImageIcon, group: "Library" },
  { href: "/admin/settings", label: "Site settings", icon: Settings, group: "System" },
  { href: "/admin/account", label: "Account & security", icon: ShieldCheck, group: "System" },
];

export function AdminShell({
  email,
  unread,
  maintenance = false,
  children,
}: {
  email: string;
  unread: number;
  maintenance?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("admin:collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("admin:collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  async function signOut() {
    await signOutAction();
    toast.success("Signed out");
    router.replace("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (compact: boolean) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon, badge, group }, i) => (
          <li key={href}>
            {group !== NAV[i - 1]?.group &&
              (compact ? (
                i > 0 && <div aria-hidden className="mx-3 my-2 h-px bg-border" />
              ) : (
                <p className={cn("px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70", i > 0 && "pt-4")}>
                  {group}
                </p>
              ))}
            <Link
              href={href}
              title={compact ? label : undefined}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                isActive(href) ? "bg-primary text-white shadow-md shadow-primary/25" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                compact && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!compact && <span className="flex-1 truncate">{label}</span>}
              {badge === "unread" && unread > 0 && (
                <span
                  className={cn(
                    "grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive(href) ? "bg-white text-primary" : "bg-primary text-white",
                    compact && "absolute right-1 top-1 h-4 min-w-4 px-1",
                  )}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  const brand = (compact: boolean) => (
    <Link href="/admin" className={cn("flex h-16 items-center gap-2 px-5 font-display text-lg font-bold", compact && "justify-center px-0")}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-white">A</span>
      {!compact && <span>Admin</span>}
    </Link>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {brand(collapsed)}
        {nav(collapsed)}
        <div className="border-t border-border p-3">
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card pt-[env(safe-area-inset-top)]"
            >
              <div className="flex items-center justify-between pr-3">
                {brand(false)}
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {nav(false)}
              <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <p className="mb-2 truncate px-3 text-xs text-muted-foreground">{email}</p>
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            {maintenance && (
              <Link
                href="/admin/settings#maintenance"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 dark:text-amber-400"
                title="The public website is hidden behind the maintenance page"
              >
                <Construction className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Maintenance mode on</span>
                <span className="sm:hidden">Maintenance</span>
              </Link>
            )}
            <Link
              href="/"
              target="_blank"
              className="hidden h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              View site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <ThemeToggle />
            <span className="hidden max-w-48 truncate px-2 text-sm text-muted-foreground md:inline">{email}</span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out" className="hidden lg:inline-flex">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
