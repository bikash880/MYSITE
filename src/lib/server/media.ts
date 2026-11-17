import "server-only";
import { Readable } from "node:stream";
import { GridFSBucket } from "mongodb";
import { getDb, isObjectId, oid } from "./db";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is 4.5 MB
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

// SVG is excluded on purpose: it can carry scripts and we serve uploads from our own origin.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"];
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function bucket() {
  return new GridFSBucket(await getDb(), { bucketName: "media" });
}

export class UploadError extends Error {}

/** Stores an uploaded file in MongoDB GridFS and returns its public path. */
export async function storeUpload(file: File, folder: string, uploadedBy: string) {
  const type = file.type || "application/octet-stream";
  const isImage = IMAGE_TYPES.includes(type);
  if (!isImage && !DOC_TYPES.includes(type)) {
    throw new UploadError("Unsupported file type. Use JPG, PNG, WebP, GIF, AVIF, HEIC, PDF or Word.");
  }
  const max = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  if (file.size > max) throw new UploadError(`File is too large (max ${max / 1024 / 1024} MB).`);
  if (file.size === 0) throw new UploadError("File is empty.");

  const safeName = (file.name || "upload").replace(/[^\w.\-]+/g, "-").slice(-80);
  const b = await bucket();
  const stream = b.openUploadStream(safeName, {
    metadata: {
      contentType: type,
      folder: folder.replace(/[^\w-]/g, "").slice(0, 40) || "uploads",
      uploaded_by: uploadedBy,
      size: file.size,
    },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream)
      .pipe(stream)
      .on("finish", () => resolve())
      .on("error", reject);
  });
  return { id: stream.id.toString(), url: `/api/media/${stream.id.toString()}`, contentType: type, size: file.size };
}

/** Finds a stored file and returns a web stream for the response body. */
export async function openMedia(id: string) {
  if (!isObjectId(id)) return null;
  const b = await bucket();
  const [file] = await b.find({ _id: oid(id) }).limit(1).toArray();
  if (!file) return null;
  const nodeStream = b.openDownloadStream(file._id);
  return {
    file,
    contentType: (file.metadata?.contentType as string) ?? "application/octet-stream",
    body: Readable.toWeb(nodeStream) as unknown as ReadableStream,
  };
}

/* ------------------------------------------------------------------ */
/*  Media library                                                      */
/* ------------------------------------------------------------------ */

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  folder: string;
  uploadedAt: string;
  /** Where this file is referenced (e.g. "Profile photo", "Project: Foo"). */
  usedIn: string[];
}

/** Collects every place a media URL is referenced in the content. */
async function mediaUsage(): Promise<Map<string, string[]>> {
  const db = await getDb();
  const usage = new Map<string, string[]>();
  const add = (value: unknown, label: string) => {
    if (typeof value !== "string") return;
    for (const m of value.matchAll(/\/api\/media\/([a-f0-9]{24})/gi)) {
      const list = usage.get(m[1]!) ?? [];
      if (!list.includes(label)) list.push(label);
      usage.set(m[1]!, list);
    }
  };
  const [profile, settings, projects, certificates] = await Promise.all([
    db.collection("profile").findOne({ _id: "main" as never }),
    db.collection("settings").findOne({ _id: "main" as never }),
    db.collection("projects").find({}, { projection: { title: 1, image_url: 1, content: 1 } }).toArray(),
    db.collection("certificates").find({}, { projection: { title: 1, image_url: 1 } }).toArray(),
  ]);
  add(profile?.photo_url, "Profile photo");
  add(profile?.cv_url, "Resume / CV");
  add(settings?.og_image_url, "Social share image");
  for (const p of projects) {
    add(p.image_url, `Project cover: ${p.title}`);
    add(p.content, `Project details: ${p.title}`);
  }
  for (const c of certificates) add(c.image_url, `Certificate: ${c.title}`);
  return usage;
}

export async function listMedia(): Promise<MediaItem[]> {
  const db = await getDb();
  const [files, usage] = await Promise.all([
    db.collection("media.files").find({}).sort({ uploadDate: -1 }).limit(500).toArray(),
    mediaUsage(),
  ]);
  return files.map((f) => {
    const id = f._id.toString();
    return {
      id,
      url: `/api/media/${id}`,
      filename: f.filename as string,
      contentType: (f.metadata?.contentType as string) ?? "application/octet-stream",
      size: f.length as number,
      folder: (f.metadata?.folder as string) ?? "uploads",
      uploadedAt: (f.uploadDate as Date).toISOString(),
      usedIn: usage.get(id) ?? [],
    };
  });
}

/** Deletes a stored file. Refuses when it's still referenced unless `force` is set. */
export async function deleteMedia(id: string, force = false): Promise<{ ok: true } | { ok: false; error: string; usedIn?: string[] }> {
  if (!isObjectId(id)) return { ok: false, error: "Invalid id" };
  if (!force) {
    const usedIn = (await mediaUsage()).get(id);
    if (usedIn?.length) return { ok: false, error: "This file is still in use.", usedIn };
  }
  try {
    await (await bucket()).delete(oid(id));
    return { ok: true };
  } catch {
    return { ok: false, error: "File not found" };
  }
}
