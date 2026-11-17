import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { RegisterForm } from "./register-form";
import { getCurrentAdmin, registrationStatus } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/db";
import { getAdminConfig, maskEmail } from "@/lib/server/admin-config";

export const metadata: Metadata = { title: "Create admin account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * One-time admin registration. Only exists until the admin account is created — after that this
 * route is a 404 forever (re-opening needs server access: npm run admin:password -- --reset-registration).
 */
export default async function RegisterPage() {
  if (!isDbConfigured) redirect("/admin/login");
  const status = await registrationStatus();
  if (status.registered) {
    if (await getCurrentAdmin()) redirect("/admin");
    notFound();
  }
  const admin = getAdminConfig();

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_30%,transparent),transparent)]" />
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000,transparent_65%)]" />
      </div>

      <div className="w-full max-w-[26rem]">
        <Link href="/" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to site
        </Link>
        <div className="mb-8">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create the <span className="accent-serif text-gradient">admin</span> account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One-time setup. Only {admin.email ? <span className="font-medium text-foreground">{maskEmail(admin.email)}</span> : "the configured admin email"}{" "}
            can register. Once it&apos;s created, registration closes permanently.
          </p>
        </div>
        {!admin.configured && (
          <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            Server setup incomplete: {admin.problems.join("; ")}. Fix <code>.env.local</code> and restart the server.
          </p>
        )}
        <RegisterForm />
      </div>
    </main>
  );
}
