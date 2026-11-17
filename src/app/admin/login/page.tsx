import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";
import { getCurrentAdmin, registrationStatus } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/db";
import { getAdminConfig } from "@/lib/server/admin-config";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  if (isDbConfigured && (await getCurrentAdmin())) redirect("/admin");
  // No admin account yet → the one-time registration is the only way in.
  if (isDbConfigured && !(await registrationStatus().catch(() => ({ registered: true }))).registered) redirect("/admin/register");
  const { expired } = await searchParams;

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_30%,transparent),transparent)]" />
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_top,#000,transparent_65%)]" />
      </div>

      <div className="w-full max-w-[25rem]">
        <Link href="/" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to site
        </Link>
        <div className="mb-8">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome <span className="accent-serif text-gradient">back</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your password, then confirm with the code we email you.</p>
        </div>
        {!isDbConfigured && (
          <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            MongoDB isn&apos;t configured. Add <code>MONGODB_URI</code> to <code>.env.local</code> (see README).
          </p>
        )}
        {isDbConfigured && !getAdminConfig().configured && (
          <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            Server setup incomplete: {getAdminConfig().problems.join("; ")}. Fix <code>.env.local</code> and restart the server.
          </p>
        )}
        {expired && isDbConfigured && (
          <p className="mb-4 rounded-2xl border border-border bg-muted p-3 text-sm text-muted-foreground">
            Your session has ended. Please sign in again.
          </p>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
