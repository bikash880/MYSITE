"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LampToggle } from "./lamp-toggle";
import { DevLogo } from "./dev-logo";
import { AdminShortcut } from "./admin-shortcut";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/certificates", label: "Certificates" },
  { href: "/resume", label: "Resume" },
  { href: "/contact", label: "Contact" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const BRAND_NAME = "Bikash Kumar Mahato";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Lock page scroll + close on Escape while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="container-page">
          <motion.nav
            aria-label="Main"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE }}
            className={cn(
              "pointer-events-auto relative flex h-14 items-center justify-between gap-3 rounded-full pl-2.5 pr-2 transition-all duration-500",
              scrolled || open
                ? "glass border border-border shadow-soft"
                : "border border-transparent bg-transparent",
            )}
          >
            <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${BRAND_NAME} — home`}>
              <DevLogo />
              {/* Name is hidden on small screens (logo only) and where it would crowd the centred links. */}
              <span className="hidden truncate text-[14.5px] font-semibold tracking-tight sm:inline lg:hidden xl:inline">{BRAND_NAME}</span>
            </Link>

            <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex" onMouseLeave={() => setHovered(null)}>
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} onMouseEnter={() => setHovered(item.href)}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative block rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {hovered === item.href && (
                        <motion.span
                          layoutId="nav-hover"
                          className="absolute inset-0 -z-10 rounded-full bg-muted"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-1">
              <AdminShortcut className="mr-1" />
              <LampToggle className="ml-1" />
              <button
                type="button"
                className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="sr-only">Menu</span>
                <span
                  aria-hidden
                  className={cn("absolute h-[1.5px] w-5 rounded bg-current transition-transform duration-300", open ? "rotate-45" : "-translate-y-[4px]")}
                />
                <span
                  aria-hidden
                  className={cn("absolute h-[1.5px] w-5 rounded bg-current transition-transform duration-300", open ? "-rotate-45" : "translate-y-[4px]")}
                />
              </button>
            </div>
          </motion.nav>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
            <nav className="container-page relative flex min-h-full flex-col pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]" aria-label="Mobile">
              <ul className="flex flex-col">
                {NAV.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.045, duration: 0.6, ease: EASE }}
                    className="border-b border-border/70"
                  >
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className="group flex items-center justify-between py-4 text-3xl font-semibold tracking-tight"
                    >
                      <span className={cn(isActive(item.href) ? "text-gradient" : "text-foreground")}>{item.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
                className="mt-auto pt-10"
              >
                <Link href="/contact" className={buttonVariants({ size: "lg", className: "w-full" })}>
                  Start a project <ArrowIcon />
                </Link>
                <Link href="/admin" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">
                  Admin login
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
