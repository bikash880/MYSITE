import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/providers";
import { getProfile, getSettings } from "@/lib/data";
import { SITE_URL } from "@/lib/utils";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.site_title, template: `%s | ${settings.site_title}` },
    description: settings.seo_description,
    keywords: settings.seo_keywords?.split(",").map((k) => k.trim()).filter(Boolean),
    authors: [{ name: profile.full_name }],
    creator: profile.full_name,
    applicationName: settings.site_title,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: settings.site_title,
      title: settings.site_title,
      description: settings.seo_description,
      url: SITE_URL,
      ...(settings.og_image_url ? { images: [{ url: settings.og_image_url, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: "summary_large_image", title: settings.site_title, description: settings.seo_description },
    appleWebApp: { capable: true, title: settings.site_title, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const brand = /^#[0-9a-fA-F]{6}$/.test(settings.theme_color) ? settings.theme_color : "#6C63FF";

  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        {/* Brand colour from Site Settings (validated hex, safe to inline). */}
        <style dangerouslySetInnerHTML={{ __html: `:root{--brand:${brand}}` }} />
      </head>
      <body className="min-h-dvh text-[15px] leading-relaxed sm:text-base">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
