import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded media is served by our own /api/media route (MongoDB GridFS) — a local path, so no host allow-list is needed.
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Browsers and crawlers request /favicon.ico directly — serve the generated app icon.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      // Public pages never need device sensors.
      {
        source: "/((?!admin).*)",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }],
      },
      // The admin panel may read the admin's own location (Profile → "Use current location").
      {
        source: "/admin/:path*",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
