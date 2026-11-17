"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster richColors closeButton position="top-center" theme="system" />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
