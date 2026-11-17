import "server-only";
import { MongoClient, ObjectId, type Db, type Document } from "mongodb";

const uri = process.env.MONGODB_URI ?? "";
const dbName = process.env.MONGODB_DB || "portfolio";

export const isDbConfigured = Boolean(uri && !uri.includes("<password>") && !uri.includes("your-cluster"));

type Cache = { client?: Promise<MongoClient>; indexes?: Promise<void> };
// Reuse one connection pool across hot reloads (dev) and warm serverless invocations (prod).
const g = globalThis as unknown as { __mongo?: Cache };
const cache: Cache = (g.__mongo ??= {});

export async function getDb(): Promise<Db> {
  if (!isDbConfigured) throw new Error("MONGODB_URI is not configured. See README → MongoDB Atlas setup.");
  cache.client ??= new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    appName: "portfolio",
  })
    .connect()
    .catch((err) => {
      cache.client = undefined; // allow retry on next request
      throw err;
    });
  const db = (await cache.client).db(dbName);
  cache.indexes ??= ensureIndexes(db).catch((err) => {
    cache.indexes = undefined;
    console.error("[db] index creation failed", err);
  });
  await cache.indexes;
  return db;
}

/** Idempotent — safe to run on every cold start. */
export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ token_hash: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection("login_attempts").createIndex({ created_at: 1 }, { expireAfterSeconds: 15 * 60 }),
    db.collection("login_attempts").createIndex({ key: 1 }),
    db.collection("login_attempts").createIndex({ email: 1 }),
    db.collection("login_attempts").createIndex({ ip: 1 }),
    db.collection("otp_challenges").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
    db.collection("otp_challenges").createIndex({ email: 1 }),
    db.collection("projects").createIndex({ slug: 1 }, { unique: true }),
    db.collection("projects").createIndex({ published: 1, sort_order: 1 }),
    db.collection("certificates").createIndex({ published: 1, sort_order: 1, issue_date: -1 }),
    db.collection("messages").createIndex({ created_at: -1 }),
    db.collection("messages").createIndex({ is_read: 1 }),
    db.collection("page_views").createIndex({ created_at: -1 }),
    db.collection("push_tokens").createIndex({ token: 1 }, { unique: true }),
  ]);
}

export const isObjectId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
export const oid = (id: string) => new ObjectId(id);

/** Mongo document → plain JSON (id string, ISO dates). Safe to pass to client components. */
export function serialize<T = Record<string, unknown>>(doc: Document | null | undefined): T | null {
  if (!doc) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === "_id") {
      out.id = v instanceof ObjectId ? v.toHexString() : v === "main" ? 1 : v;
    } else if (v instanceof Date) out[k] = v.toISOString();
    else if (v instanceof ObjectId) out[k] = v.toHexString();
    else out[k] = v;
  }
  return out as T;
}

export const serializeAll = <T,>(docs: Document[]) => docs.map((d) => serialize<T>(d)!);

/** True for MongoDB duplicate-key errors (e.g. slug already used). */
export const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;
