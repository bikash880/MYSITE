// Shared helper for the database scripts. Run them via npm (they load .env.local).
import { MongoClient } from "mongodb";

export async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✖ MONGODB_URI is not set. Add it to .env.local (see README → MongoDB Atlas setup).");
    process.exit(1);
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, appName: "portfolio-scripts" });
  try {
    await client.connect();
  } catch (err) {
    console.error("✖ Could not connect to MongoDB:", err.message);
    console.error("  Check the connection string, the database user's password, and Atlas → Network Access.");
    process.exit(1);
  }
  const db = client.db(process.env.MONGODB_DB || "portfolio");
  return { client, db };
}

/** Same indexes as src/lib/server/db.ts → ensureIndexes(). */
export async function ensureIndexes(db) {
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

export const DEFAULT_PROFILE = {
  full_name: "Your Name",
  title: "Full-Stack Developer",
  short_intro: "I build fast, accessible and beautiful web experiences.",
  bio: "Write a few paragraphs about yourself from the admin panel.",
  photo_url: null,
  cv_url: null,
  email: "hello@example.com",
  phone: null,
  location: "Earth",
  years_experience: 3,
  available: true,
  github_url: null,
  linkedin_url: null,
  twitter_url: null,
  instagram_url: null,
  website_url: null,
};

export const DEFAULT_SETTINGS = {
  site_title: "My Portfolio",
  seo_description: "Personal portfolio — projects, blog and services.",
  seo_keywords: null,
  theme_color: "#6C63FF",
  og_image_url: null,
};
