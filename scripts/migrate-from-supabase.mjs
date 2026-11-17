// One-off: copy existing data from a Supabase project into MongoDB Atlas.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:supabase
//
// • Copies every content table + messages + page views (uses Supabase's REST API, no SDK needed).
// • Downloads every file referenced from Supabase Storage into MongoDB GridFS and rewrites the URLs.
// • Skips documents that already exist (matched by slug, or by the original Supabase id) — safe to re-run.
// • Passwords can't be exported from Supabase Auth: set your admin with `npm run admin:password`.
import { GridFSBucket } from "mongodb";
import { Readable } from "node:stream";
import { connect, ensureIndexes } from "./_db.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("✖ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).");
  process.exit(1);
}

const TABLES = ["skills", "experiences", "education", "projects", "services", "blog_posts", "testimonials", "messages", "page_views"];
const DATE_FIELDS = ["created_at", "updated_at", "published_at"];
const STORAGE_RE = new RegExp(`${SUPABASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/storage/v1/object/public/[^\\s"'<>)]+`, "g");

async function fetchTable(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    if (res.status === 404) return null; // table doesn't exist
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const { client, db } = await connect();
const bucket = new GridFSBucket(db, { bucketName: "media" });
const fileMap = new Map(); // supabase url -> /api/media/<id>

async function migrateFile(url) {
  if (fileMap.has(url)) return fileMap.get(url);
  // Re-runs reuse files copied previously instead of downloading duplicates.
  const existing = await db.collection("media.files").findOne({ "metadata.source": url }, { projection: { _id: 1 } });
  if (existing) {
    const local = `/api/media/${existing._id.toString()}`;
    fileMap.set(url, local);
    return local;
  }
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! could not download ${url} (HTTP ${res.status}) — keeping original URL`);
    fileMap.set(url, url);
    return url;
  }
  const name = decodeURIComponent(url.split("/").pop() ?? "file").replace(/[^\w.\-]+/g, "-").slice(-80);
  const upload = bucket.openUploadStream(name, {
    metadata: { contentType: res.headers.get("content-type") ?? "application/octet-stream", folder: "migrated", source: url },
  });
  await new Promise((resolve, reject) => Readable.fromWeb(res.body).pipe(upload).on("finish", resolve).on("error", reject));
  const local = `/api/media/${upload.id.toString()}`;
  fileMap.set(url, local);
  return local;
}

async function rewriteUrls(value) {
  if (typeof value === "string") {
    const matches = value.match(STORAGE_RE);
    if (!matches) return value;
    let out = value;
    for (const m of new Set(matches)) out = out.split(m).join(await migrateFile(m));
    return out;
  }
  if (Array.isArray(value)) return Promise.all(value.map(rewriteUrls));
  return value;
}

async function toDoc(row) {
  const { id, ...rest } = row;
  const doc = { supabase_id: String(id) };
  for (const [k, v] of Object.entries(rest)) {
    doc[k] = DATE_FIELDS.includes(k) && v ? new Date(v) : await rewriteUrls(v);
  }
  doc.created_at ??= new Date();
  return doc;
}

try {
  await ensureIndexes(db);

  for (const kind of ["profile", "settings"]) {
    const rows = await fetchTable(kind);
    if (!rows?.length) continue;
    const { id: _id, ...data } = rows[0];
    const doc = await toDoc(data);
    delete doc.supabase_id;
    delete doc.created_at;
    await db.collection(kind).updateOne({ _id: "main" }, { $set: doc }, { upsert: true });
    console.log(`✔ ${kind}: migrated`);
  }

  for (const table of TABLES) {
    const rows = await fetchTable(table);
    if (rows === null) {
      console.log(`• ${table}: not found in Supabase — skipped`);
      continue;
    }
    let inserted = 0;
    for (const row of rows) {
      const doc = await toDoc(row);
      const match = doc.slug ? { $or: [{ slug: doc.slug }, { supabase_id: doc.supabase_id }] } : { supabase_id: doc.supabase_id };
      const res = await db.collection(table).updateOne(match, { $setOnInsert: doc }, { upsert: true });
      if (res.upsertedCount) inserted++;
    }
    console.log(`✔ ${table}: ${inserted} new of ${rows.length}`);
  }

  console.log(`✔ files: ${[...fileMap.values()].filter((v) => v.startsWith("/api/media/")).length} copied into GridFS`);
  console.log("Done. Next: npm run admin:password -- --email you@example.com");
} finally {
  await client.close();
}
