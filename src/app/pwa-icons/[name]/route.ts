import { getProfile, getSettings } from "@/lib/data";
import { renderIcon } from "@/lib/pwa-icon";
import { initials } from "@/lib/utils";

export const revalidate = 3600;

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-192.png": { size: 192, maskable: true },
  "maskable-512.png": { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const icon = ICONS[name];
  if (!icon) return new Response("Not found", { status: 404 });

  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return renderIcon(icon.size, initials(profile.full_name) || "P", settings.theme_color, {
    maskable: icon.maskable,
  });
}
