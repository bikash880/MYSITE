"use client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"];
const MAX_BYTES = 4 * 1024 * 1024; // keep in sync with src/lib/server/media.ts (Vercel body limit 4.5 MB)

/** Uploads a file to MongoDB GridFS via the admin API and returns its URL (/api/media/<id>). */
export async function uploadFile(file: File, folder: string, kind: "image" | "file" = "image") {
  if (kind === "image" && !IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please choose a JPG, PNG, WebP, GIF, AVIF or HEIC image.");
  }
  if (file.size > MAX_BYTES) throw new Error("File is too large (max 4 MB).");

  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const res = await fetch("/api/admin/upload", { method: "POST", body, credentials: "same-origin" });
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !json?.url) throw new Error(json?.error ?? `Upload failed (${res.status})`);
  return json.url;
}
