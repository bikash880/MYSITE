import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-5 text-center">
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_28%,transparent),transparent)]" />
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary ring-1 ring-primary/20">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          You&apos;re <span className="accent-serif text-gradient">offline</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">Check your connection — pages you visited before are still available.</p>
        {/* Plain anchor so it does a real reload when back online */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-white shadow-glow transition-transform active:scale-95"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
