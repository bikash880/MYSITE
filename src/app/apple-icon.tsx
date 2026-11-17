import { getProfile, getSettings } from "@/lib/data";
import { renderIcon } from "@/lib/pwa-icon";
import { initials } from "@/lib/utils";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function AppleIcon() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  // iOS applies its own rounded mask, so render full-bleed.
  return renderIcon(180, initials(profile.full_name) || "P", settings.theme_color, { maskable: true });
}
