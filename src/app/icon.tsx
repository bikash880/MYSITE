import { getProfile, getSettings } from "@/lib/data";
import { renderIcon } from "@/lib/pwa-icon";
import { initials } from "@/lib/utils";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Icon() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return renderIcon(64, initials(profile.full_name) || "P", settings.theme_color);
}
