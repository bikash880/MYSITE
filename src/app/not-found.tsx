import Link from "next/link";
import { ArrowIcon, buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_30%,transparent),transparent)]" />
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(circle,#000,transparent_65%)]" />
      </div>
      <div>
        <p className="eyebrow text-primary">Error 404</p>
        <p className="accent-serif text-gradient mt-4 text-[clamp(7rem,28vw,14rem)] leading-[0.85]">Lost?</p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">This page drifted off the map.</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Back home <ArrowIcon />
          </Link>
          <Link href="/projects" className={buttonVariants({ size: "lg", variant: "outline" })}>
            See my work
          </Link>
        </div>
      </div>
    </main>
  );
}
