import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(date: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", opts ?? { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(date),
  );
}

export function formatRange(start: string, end: string | null, current: boolean) {
  const fmt: Intl.DateTimeFormatOptions = { year: "numeric", month: "short" };
  return `${formatDate(start, fmt)} — ${current || !end ? "Present" : formatDate(end, fmt)}`;
}

export function readingTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Forces a download for files stored in MongoDB GridFS (/api/media/<id>). */
export function downloadUrl(url: string) {
  if (!url.includes("/api/media/")) return url;
  return url + (url.includes("?") ? "&" : "?") + "download=1";
}

/** Our own uploads (/api/media/...) are optimised by next/image; external URLs are served as-is. */
export const isExternalImage = (src: string) => !src.startsWith("/");

export function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong";
}
