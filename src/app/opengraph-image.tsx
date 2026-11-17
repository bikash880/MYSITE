import { ImageResponse } from "next/og";
import { getProfile, getSettings } from "@/lib/data";

export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/** Default Open Graph image, generated from your profile + theme colour. */
export default async function OpengraphImage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const brand = settings.theme_color || "#6C63FF";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0b0b10",
          backgroundImage: `radial-gradient(circle at 80% 0%, ${brand}66, transparent 60%)`,
          color: "#ededf2",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: brand, fontWeight: 600, letterSpacing: 4 }}>
          {settings.site_title.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
          {profile.full_name}
        </div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 16, color: "#a0a0b2" }}>{profile.title}</div>
        <div style={{ display: "flex", marginTop: 48, width: 160, height: 10, borderRadius: 999, background: brand }} />
      </div>
    ),
    size,
  );
}
