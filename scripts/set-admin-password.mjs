// Server-side admin account tools. Requires shell access to the server — this is the ONLY way to
// re-open registration or reset a forgotten password once the admin account exists.
//
//   npm run admin:password                                   show status (email, registration, secret)
//   npm run admin:password -- --secret-only [--rotate]       create (or rotate) AUTH_SECRET in .env.local
//   npm run admin:password -- "new-strong-password"          reset the admin password (signs out every session)
//   npm run admin:password -- --reset-registration           delete the admin password + re-open one-time registration
//   npm run admin:password -- --email you@example.com        set ADMIN_EMAIL (the only email allowed to register/sign in)
//
// Normal setup needs none of this: start the server and open /admin/register.
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const ENV_FILE = path.resolve(process.cwd(), ".env.local");
const args = process.argv.slice(2);
const takeFlag = (name, withValue = false) => {
  const i = args.indexOf(name);
  if (i < 0) return withValue ? undefined : false;
  const [, value] = args.splice(i, withValue ? 2 : 1);
  return withValue ? value : true;
};
const emailArg = takeFlag("--email", true);
const secretOnly = takeFlag("--secret-only");
const rotate = takeFlag("--rotate");
const resetRegistration = takeFlag("--reset-registration");
const password = args[0]?.trim(); // the login form trims too

let env = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
const original = env;
const getVar = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim() ?? "";
const setVar = (name, value) => {
  const line = `${name}=${value}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : `${env.replace(/\s*$/, "")}\n${line}\n`;
};

// ---- .env.local: AUTH_SECRET, ADMIN_EMAIL, drop the old ADMIN_PASSWORD_HASH -----------------
const currentSecret = getVar("AUTH_SECRET");
let revokeAll = false;
if (!currentSecret || currentSecret.length < 32 || rotate) {
  setVar("AUTH_SECRET", randomBytes(64).toString("base64url"));
  console.log(currentSecret ? "✔ Rotated AUTH_SECRET — every session token is now invalid." : "✔ Generated AUTH_SECRET (session encryption key).");
  revokeAll = true;
} else if (secretOnly) {
  console.log("• AUTH_SECRET already set (add --rotate to replace it).");
}
// Stable Server Action IDs: without this key Next.js picks a random one per build, so pages
// opened before a restart/deploy fail with "Server Action not found".
if (!/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=.+/m.test(env)) {
  setVar("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
  console.log("✔ Generated NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (stable Server Action IDs).");
}
if (emailArg) {
  const e = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    console.error("✖ --email needs a valid address.");
    process.exit(1);
  }
  setVar("ADMIN_EMAIL", e);
  console.log(`✔ ADMIN_EMAIL set to ${e}`);
}
if (/^ADMIN_PASSWORD_HASH=/m.test(env)) {
  env = env.replace(/^ADMIN_PASSWORD_HASH=.*\r?\n?/m, "");
  console.log("✔ Removed ADMIN_PASSWORD_HASH from .env.local — the password now lives (hashed) in the database.");
}
if (env !== original) fs.writeFileSync(ENV_FILE, env.endsWith("\n") ? env : `${env}\n`);

const email = (getVar("ADMIN_EMAIL") || process.env.ADMIN_EMAIL || "").toLowerCase();
const uri = getVar("MONGODB_URI") || process.env.MONGODB_URI;
const dbName = getVar("MONGODB_DB") || process.env.MONGODB_DB || "portfolio";
if (secretOnly && !revokeAll) process.exit(0);
if (!uri) {
  console.error("✖ MONGODB_URI is not set in .env.local.");
  process.exit(1);
}
if (!email) {
  console.error("✖ ADMIN_EMAIL is not set. Run: npm run admin:password -- --email you@example.com");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db(dbName);
  const LOCK = { _id: "admin_registration" };

  if (password) {
    const problems = [password.length < 12 && "at least 12 characters", !/[a-z]/i.test(password) && "a letter", !/\d/.test(password) && "a number"].filter(Boolean);
    if (problems.length) {
      console.error(`✖ Password too weak — it needs ${problems.join(", ")}.`);
      process.exit(1);
    }
    const now = new Date();
    await db.collection("users").updateOne(
      { email },
      { $set: { role: "admin", password_hash: await bcrypt.hash(password, 12), password_changed_at: now }, $setOnInsert: { created_at: now, name: null } },
      { upsert: true },
    );
    // Setting a password from the server also counts as registering (signup stays closed).
    await db.collection("system").updateOne(LOCK, { $setOnInsert: { email, registered_at: now, ip: "server-cli" } }, { upsert: true });
    console.log(`✔ Password for ${email} saved (bcrypt, cost 12). Registration is closed.`);
    revokeAll = true;
  }

  if (resetRegistration) {
    await db.collection("system").deleteOne(LOCK);
    await db.collection("users").updateMany({}, { $unset: { password_hash: "", password_changed_at: "" } });
    console.log(`✔ Registration re-opened. Open /admin/register and verify ${email} to create the account again.`);
    revokeAll = true;
  }

  if (revokeAll) {
    const { deletedCount: removed } = await db.collection("users").deleteMany({ email: { $ne: email } });
    const { deletedCount: sessions } = await db.collection("sessions").deleteMany({});
    await db.collection("otp_challenges").deleteMany({});
    await db.collection("login_attempts").deleteMany({});
    console.log(`✔ Signed out ${sessions} session(s)${removed ? `, removed ${removed} other account(s)` : ""}.`);
  }

  // Status
  const [lock, user] = await Promise.all([db.collection("system").findOne(LOCK), db.collection("users").findOne({ email })]);
  console.log(`\nAdmin email:   ${email}`);
  console.log(`Account:       ${lock && user?.password_hash ? `registered ${lock.registered_at.toISOString()} — signup closed` : "not registered — open /admin/register"}`);
  console.log(`AUTH_SECRET:   ${getVar("AUTH_SECRET").length >= 32 ? "set" : "MISSING"}`);
  console.log(`SMTP_PASS:     ${getVar("SMTP_PASS") ? "set" : "missing — codes print in the server terminal (dev only)"}`);
  if (revokeAll) console.log("\nRestart the server if you changed .env.local.");
} catch (err) {
  console.error(`✖ Database error: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
