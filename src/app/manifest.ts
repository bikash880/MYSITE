import type { MetadataRoute } from "next";
import { getProfile, getSettings } from "@/lib/data";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  return {
    id: "/",
    name: settings.site_title,
    short_name: profile.full_name.split(" ")[0] || "Portfolio",
    description: settings.seo_description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b0b10",
    theme_color: settings.theme_color,
    categories: ["portfolio", "business", "productivity"],
    icons: [
      { src: "/pwa-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Projects", url: "/projects" },
      { name: "Resume", url: "/resume" },
      { name: "Certificates", url: "/certificates" },
      { name: "Contact", url: "/contact" },
    ],
  };
}
