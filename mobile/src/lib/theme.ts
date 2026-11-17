import { vars } from "nativewind";

/** Same palette as the website (src/app/globals.css). */
export const palette = {
  light: {
    background: "#FAFAFB",
    foreground: "#0F0F14",
    card: "#FFFFFF",
    muted: "#F1F1F5",
    mutedForeground: "#5B5B6B",
    border: "#E4E4EA",
  },
  dark: {
    background: "#0B0B10",
    foreground: "#EDEDF2",
    card: "#13131A",
    muted: "#1B1B24",
    mutedForeground: "#A0A0B2",
    border: "#26262F",
  },
} as const;

export const DEFAULT_BRAND = "#6C63FF";

export type Scheme = "light" | "dark";
export type ThemeColors = (typeof palette)[Scheme] & { primary: string };

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function themeColors(scheme: Scheme, brand: string): ThemeColors {
  return { ...palette[scheme], primary: isHex(brand) ? brand : DEFAULT_BRAND };
}

/** NativeWind CSS variables consumed by tailwind.config.js colours. */
export function themeVars(c: ThemeColors) {
  return vars({
    "--brand": rgb(c.primary),
    "--background": rgb(c.background),
    "--foreground": rgb(c.foreground),
    "--card": rgb(c.card),
    "--muted": rgb(c.muted),
    "--muted-foreground": rgb(c.mutedForeground),
    "--border": rgb(c.border),
  });
}
