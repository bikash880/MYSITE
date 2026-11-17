import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { isFullyVerified, openSession, sealSession } from "@/lib/session-token";
import { getAdminConfig, maskEmail, sessionPolicy } from "./admin-config";
import { getDb, isDbConfigured } from "./db";
import { sendOtpEmail, sendSecurityAlert, type OtpDelivery, type OtpPurpose } from "./mailer";

/*
 * Admin authentication
 * --------------------
 * 0. One-time registration (/admin/register) — only ADMIN_EMAIL. The address is proven with an
 *    emailed code, then the password is chosen and stored as a bcrypt hash in MongoDB. Completing
 *    it atomically inserts a lock document; from then on registration is permanently closed
 *    (re-opening requires server access: npm run admin:password -- --reset-registration).
 * 1. Password step — the email must equal ADMIN_EMAIL and the password must match the stored
 *    bcrypt hash. Rate-limited per email+IP, per email and per IP.
 * 2. Email OTP step — a 6-digit code is emailed; only its hash is stored. 10-minute expiry,
 *    5 attempts, 60-second resend cooldown, max 5 sends, bound to the device that started the login.
 * 3. Session — an encrypted JWT (JWE A256GCM, key from AUTH_SECRET) carrying a random session id,
 *    the admin email and amr=["pwd","otp"]. The middleware verifies it before any admin route runs;
 *    the server then checks the session in MongoDB (revocable) and enforces absolute + idle expiry.
 *    No session is ever created without a verified email code.
 */

export const SESSION_COOKIE = "pf_session";
export const OTP_COOKIE = "pf_otp";
/** Non-secret UI hint ("an admin uses this browser"). Never trusted — the encrypted session is. */
export const ADMIN_HINT_COOKIE = "pf_admin";

const MAX_FAILED_LOGINS = 8; // per email+IP per 15 minutes (login_attempts TTL)
const MAX_FAILED_LOGINS_EMAIL = 20; // per email from any IP — stops attackers rotating X-Forwarded-For
const MAX_FAILED_LOGINS_IP = 30; // per IP across all emails — stops credential spraying
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;
// Compared against when the email is wrong, so response time doesn't reveal which field failed.
const DUMMY_HASH = "$2b$12$0M0glC2TisWXpHB2kb8h5O2PAkmsY7eATSJEPt0oxfOouMaX505FG";

export interface AdminSessionMeta {
  id: string;
  expiresAt: string;
  idleExpiresAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin";
  session?: AdminSessionMeta;
}

interface UserDoc {
  _id: ObjectId;
  email: string;
  name?: string | null;
  role: string;
  password_hash?: string; // bcrypt (cost 12) — set at registration / password change
  password_changed_at?: Date;
  created_at: Date;
  last_login_at?: Date;
}

/** Exists once the admin account has been registered. Its presence permanently closes signup. */
const REGISTRATION_LOCK_ID = "admin_registration" as const;
interface RegistrationLock {
  _id: typeof REGISTRATION_LOCK_ID;
  email: string;
  registered_at: Date;
  ip: string;
}

interface ChallengeDoc {
  _id: string; // sha256(challengeId)
  purpose?: OtpPurpose; // missing on old docs = "login"
  email: string;
  code_hash: string;
  attempts: number;
  sends: number;
  last_sent_at: Date;
  expires_at: Date;
  ip: string;
  ua_hash: string | null;
}

interface SessionDoc {
  _id: ObjectId;
  token_hash: string; // sha256(session id) — the id itself only exists inside the encrypted token
  user_id: ObjectId;
  amr: string[];
  created_at: Date;
  expires_at: Date;
  last_seen_at: Date;
  ip: string;
  user_agent: string | null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const codeHash = (code: string, challengeId: string) => sha256(`${challengeId}:${code}`);
const newCode = () => randomInt(0, 1_000_000).toString().padStart(6, "0");
const uaHash = (ua?: string | null) => (ua ? sha256(ua) : null);

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;

export class AuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
  }
}

function toAdmin(u: UserDoc, session?: AdminSessionMeta): AdminUser {
  return { id: u._id.toHexString(), email: u.email, name: u.name ?? null, role: "admin", ...(session ? { session } : {}) };
}

export interface RequestMeta {
  ip: string;
  userAgent: string | null;
}

/* ------------------------------------------------------------------ */
/*  Step 1 — password                                                  */
/* ------------------------------------------------------------------ */

export interface OtpChallenge {
  challengeId: string;
  maskedEmail: string;
  delivery: OtpDelivery;
  expiresAt: string;
}

export async function startLogin(email: string, password: string, meta: RequestMeta): Promise<OtpChallenge> {
  const admin = getAdminConfig();
  if (!admin.configured) {
    throw new AuthError(`Admin login isn't configured on the server (${admin.problems.join(", ")}).`, 503);
  }
  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  const key = `${normalized}|${meta.ip}`;

  const [byKey, byEmail, byIp] = await Promise.all([
    db.collection("login_attempts").countDocuments({ key }),
    db.collection("login_attempts").countDocuments({ email: normalized }),
    db.collection("login_attempts").countDocuments({ ip: meta.ip }),
  ]);
  if (byKey >= MAX_FAILED_LOGINS || byEmail >= MAX_FAILED_LOGINS_EMAIL || byIp >= MAX_FAILED_LOGINS_IP) {
    throw new AuthError("Too many failed attempts. Try again in 15 minutes.", 429);
  }

  const reg = await registrationStatus();
  if (!reg.registered) {
    throw new AuthError("No admin account exists yet. Create it first at /admin/register.", 409);
  }
  if (!reg.passwordSet) {
    throw new AuthError("The admin account has no password. On the server run: npm run admin:password -- --reset-registration", 503);
  }

  const emailOk = normalized === admin.email;
  // Always run bcrypt (even for a wrong email) so timing doesn't reveal which field was wrong.
  const passwordOk = await bcrypt.compare(password, emailOk ? reg.hash! : DUMMY_HASH);
  if (!emailOk || !passwordOk) {
    await db.collection("login_attempts").insertOne({ key, email: normalized, ip: meta.ip, created_at: new Date() });
    // Alert the admin the moment their account gets locked.
    if (emailOk && (byKey + 1 === MAX_FAILED_LOGINS || byEmail + 1 === MAX_FAILED_LOGINS_EMAIL)) {
      after(() => sendSecurityAlert(admin.email, "lockout", { ...meta, reason: "too many wrong passwords" }));
    }
    throw new AuthError("Incorrect email or password");
  }
  await db.collection("login_attempts").deleteMany({ key });

  return issueChallenge("login", admin.email, meta);
}

/** Creates a single pending OTP challenge for the admin email and emails the code. */
async function issueChallenge(purpose: OtpPurpose, email: string, meta: RequestMeta): Promise<OtpChallenge> {
  const db = await getDb();
  const challengeId = randomBytes(24).toString("base64url");
  const code = newCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  // One pending challenge per admin at a time.
  await db.collection<ChallengeDoc>("otp_challenges").deleteMany({ email });
  await db.collection<ChallengeDoc>("otp_challenges").insertOne({
    _id: sha256(challengeId),
    purpose,
    email,
    code_hash: codeHash(code, challengeId),
    attempts: 0,
    sends: 1,
    last_sent_at: now,
    expires_at: expiresAt,
    ip: meta.ip,
    ua_hash: uaHash(meta.userAgent),
  });

  let delivery: OtpDelivery;
  try {
    delivery = await sendOtpEmail(email, code, meta.ip, purpose);
  } catch (err) {
    await db.collection<ChallengeDoc>("otp_challenges").deleteOne({ _id: sha256(challengeId) });
    console.error("[auth] OTP email failed", err);
    throw new AuthError("Couldn't send the verification email. Check the SMTP settings in .env.local (npm run mail:test).", 502);
  }
  return { challengeId, maskedEmail: maskEmail(email), delivery, expiresAt: expiresAt.toISOString() };
}

/* ------------------------------------------------------------------ */
/*  Registration (one time only)                                       */
/* ------------------------------------------------------------------ */

/** Whether the single admin account exists. Once `registered` is true, signup is closed for good. */
export async function registrationStatus() {
  const admin = getAdminConfig();
  const db = await getDb();
  const [lock, user] = await Promise.all([
    db.collection<RegistrationLock>("system").findOne({ _id: REGISTRATION_LOCK_ID }),
    admin.email ? db.collection<UserDoc>("users").findOne({ email: admin.email }, { projection: { password_hash: 1 } }) : null,
  ]);
  const hash = user?.password_hash && BCRYPT_RE.test(user.password_hash) ? user.password_hash : null;
  return { registered: Boolean(lock), passwordSet: Boolean(hash), hash, registeredAt: lock?.registered_at ?? null };
}

const MAX_REGISTER_STARTS_IP = 10; // per IP per 15 minutes

/** Step 1 of registration: the email must be ADMIN_EMAIL; a code is emailed to prove ownership. */
export async function startRegistration(email: string, meta: RequestMeta): Promise<OtpChallenge> {
  const admin = getAdminConfig();
  if (!admin.configured) throw new AuthError(`Admin access isn't configured on the server (${admin.problems.join("; ")}).`, 503);
  if ((await registrationStatus()).registered) throw new AuthError("Registration is closed. The admin account already exists.", 410);

  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  const key = `register|${meta.ip}`;
  if ((await db.collection("login_attempts").countDocuments({ key })) >= MAX_REGISTER_STARTS_IP) {
    throw new AuthError("Too many attempts. Try again in 15 minutes.", 429);
  }
  // Every start counts (codes are emailed), so this also throttles email sending.
  await db.collection("login_attempts").insertOne({ key, email: normalized, ip: `reg:${meta.ip}`, created_at: new Date() });
  if (normalized !== admin.email) throw new AuthError("This email isn't allowed to create the admin account.", 403);
  return issueChallenge("register", admin.email, meta);
}

/**
 * Step 2 of registration: verifies the emailed code, stores the bcrypt password hash and closes
 * registration permanently (atomic — a second registration can never succeed). Signs the admin in.
 */
export async function completeRegistration(challengeId: string | null | undefined, code: string, password: string, meta: RequestMeta) {
  const admin = getAdminConfig();
  if (!admin.configured) throw new AuthError("Admin access isn't configured on the server.", 503);
  if ((await registrationStatus()).registered) throw new AuthError("Registration is closed. The admin account already exists.", 410);
  const { db, doc } = await findChallenge(challengeId, meta, "register");
  await checkCode(db, doc, challengeId!, code, admin.email, meta);

  const passwordHash = await hashPassword(password);
  const now = new Date();
  try {
    // The lock's fixed _id makes this the single point of truth: only one insert can ever succeed.
    await db.collection<RegistrationLock>("system").insertOne({ _id: REGISTRATION_LOCK_ID, email: admin.email, registered_at: now, ip: meta.ip });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) throw new AuthError("Registration is closed. The admin account already exists.", 410);
    throw err;
  }
  let user: UserDoc;
  try {
    user = (await db.collection<UserDoc>("users").findOneAndUpdate(
      { email: admin.email },
      {
        $set: { role: "admin", password_hash: passwordHash, password_changed_at: now, last_login_at: now },
        $setOnInsert: { created_at: now, name: null },
      },
      { upsert: true, returnDocument: "after" },
    ))!;
  } catch (err) {
    // Never leave registration closed without a password.
    await db.collection<RegistrationLock>("system").deleteOne({ _id: REGISTRATION_LOCK_ID });
    throw err;
  }
  // Exactly one account: drop anything else, and any sessions/challenges from before.
  await Promise.all([
    db.collection("users").deleteMany({ email: { $ne: admin.email } }),
    db.collection("sessions").deleteMany({}),
    db.collection("otp_challenges").deleteMany({}),
  ]);
  after(() => sendSecurityAlert(admin.email, "registered", { ...meta, when: now }));
  return createSession(db, user, admin, meta);
}

/** Changes the password (current password required). Signs out every other session. */
export async function changePassword(user: AdminUser, currentPassword: string, newPassword: string, meta: RequestMeta) {
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne({ _id: new ObjectId(user.id) });
  if (!doc?.password_hash || !(await bcrypt.compare(currentPassword, doc.password_hash))) {
    throw new AuthError("Your current password is incorrect.", 400);
  }
  if (await bcrypt.compare(newPassword, doc.password_hash)) throw new AuthError("The new password must be different from the current one.", 400);
  await db.collection<UserDoc>("users").updateOne(
    { _id: doc._id },
    { $set: { password_hash: await hashPassword(newPassword), password_changed_at: new Date() } },
  );
  const revoked = await revokeOtherSessions(user.id, user.session?.id);
  after(() => sendSecurityAlert(doc.email, "password", { ...meta, when: new Date() }));
  return revoked;
}

/* ------------------------------------------------------------------ */
/*  Step 2 — email OTP                                                 */
/* ------------------------------------------------------------------ */

async function findChallenge(challengeId: string | null | undefined, meta: RequestMeta, purpose?: OtpPurpose) {
  if (!challengeId || challengeId.length > 64) throw new AuthError("Your verification session expired. Please start again.", 410);
  const db = await getDb();
  const doc = await db.collection<ChallengeDoc>("otp_challenges").findOne({ _id: sha256(challengeId) });
  if (!doc || doc.expires_at < new Date()) throw new AuthError("Your code expired. Please start again.", 410);
  // A registration code can't be used to sign in, and vice versa.
  if (purpose && (doc.purpose ?? "login") !== purpose) throw new AuthError("This code isn't valid here. Please start again.", 410);
  // The code only works on the device/browser that entered the password.
  if (doc.ua_hash && doc.ua_hash !== uaHash(meta.userAgent)) {
    throw new AuthError("Please finish signing in on the same device you started on.", 410);
  }
  return { db, doc };
}

export async function resendOtp(challengeId: string | null | undefined, meta: RequestMeta): Promise<OtpChallenge> {
  const { db, doc } = await findChallenge(challengeId, meta);
  const wait = OTP_RESEND_COOLDOWN_MS - (Date.now() - doc.last_sent_at.getTime());
  if (wait > 0) throw new AuthError(`Please wait ${Math.ceil(wait / 1000)}s before requesting a new code.`, 429);
  if (doc.sends >= OTP_MAX_SENDS) throw new AuthError("Too many codes requested. Please sign in again.", 429);

  const code = newCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await db.collection<ChallengeDoc>("otp_challenges").updateOne(
    { _id: doc._id },
    { $set: { code_hash: codeHash(code, challengeId!), attempts: 0, last_sent_at: new Date(), expires_at: expiresAt }, $inc: { sends: 1 } },
  );
  const delivery = await sendOtpEmail(doc.email, code, meta.ip, doc.purpose ?? "login");
  return { challengeId: challengeId!, maskedEmail: maskEmail(doc.email), delivery, expiresAt: expiresAt.toISOString() };
}

/** Verifies the email code and, only then, creates a session. Returns the encrypted session token. */
export async function verifyOtp(challengeId: string | null | undefined, code: string, meta: RequestMeta) {
  const admin = getAdminConfig();
  if (!admin.configured) throw new AuthError("Admin login isn't configured on the server.", 503);
  const { db, doc } = await findChallenge(challengeId, meta, "login");
  await checkCode(db, doc, challengeId!, code, admin.email, meta);

  const now = new Date();
  const user = await db.collection<UserDoc>("users").findOneAndUpdate(
    { email: admin.email, role: "admin" },
    { $set: { last_login_at: now } },
    { returnDocument: "after" },
  );
  if (!user?.password_hash) throw new AuthError("The admin account no longer exists. Please register again.", 410);
  after(() => sendSecurityAlert(admin.email, "signin", { ...meta, when: now }));
  return createSession(db, user, admin, meta);
}

type Db = Awaited<ReturnType<typeof getDb>>;

/** Timing-safe code check with attempt limits. Destroys the challenge on success (single use). */
async function checkCode(db: Db, doc: ChallengeDoc, challengeId: string, code: string, adminEmail: string, meta: RequestMeta) {
  if (doc.email !== adminEmail) throw new AuthError("This account isn't authorised.", 403);
  const admin = { email: adminEmail };
  const given = Buffer.from(codeHash(String(code).trim(), challengeId), "hex");
  const expected = Buffer.from(doc.code_hash, "hex");
  if (!/^\d{6}$/.test(String(code).trim()) || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    const attempts = doc.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await db.collection<ChallengeDoc>("otp_challenges").deleteOne({ _id: doc._id });
      after(() => sendSecurityAlert(admin.email, "lockout", { ...meta, reason: "too many wrong verification codes" }));
      throw new AuthError("Too many incorrect codes. Please start again.", 429);
    }
    await db.collection<ChallengeDoc>("otp_challenges").updateOne({ _id: doc._id }, { $set: { attempts } });
    const left = OTP_MAX_ATTEMPTS - attempts;
    throw new AuthError(`Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.`);
  }
  // Single use: the challenge is destroyed before the session exists.
  const { deletedCount } = await db.collection<ChallengeDoc>("otp_challenges").deleteOne({ _id: doc._id });
  if (!deletedCount) throw new AuthError("This code was already used. Please start again.", 410);
}

/** Creates a revocable DB session and returns the encrypted token (only ever after password + OTP). */
async function createSession(db: Db, user: UserDoc, admin: { email: string; secret: string }, meta: RequestMeta) {
  const now = new Date();
  const { maxAgeMs, idleMs } = sessionPolicy();
  const sid = randomBytes(32).toString("base64url");
  const amr = ["pwd", "otp"];
  const expiresAt = new Date(now.getTime() + maxAgeMs);
  const { insertedId } = await db.collection<Omit<SessionDoc, "_id">>("sessions").insertOne({
    token_hash: sha256(sid),
    user_id: user._id,
    amr,
    created_at: now,
    expires_at: expiresAt,
    last_seen_at: now,
    ip: meta.ip,
    user_agent: meta.userAgent?.slice(0, 300) ?? null,
  });
  const token = await sealSession({ sid, sub: admin.email, amr }, expiresAt, admin.secret);

  return {
    token,
    expiresAt,
    user: toAdmin(user, {
      id: insertedId.toHexString(),
      expiresAt: expiresAt.toISOString(),
      idleExpiresAt: new Date(now.getTime() + idleMs).toISOString(),
    }),
  };
}

/* ------------------------------------------------------------------ */
/*  Sessions                                                           */
/* ------------------------------------------------------------------ */

/**
 * Resolves an encrypted session token to the admin. Returns null when the token is missing,
 * tampered, expired, not OTP-verified, revoked, idle too long, or not for ADMIN_EMAIL.
 */
export async function userFromToken(token: string | undefined | null): Promise<AdminUser | null> {
  if (!token || !isDbConfigured) return null;
  const admin = getAdminConfig();
  if (!admin.configured) return null;
  const claims = await openSession(token, admin.secret);
  if (!claims || !isFullyVerified(claims, admin.email)) return null;
  try {
    const db = await getDb();
    const now = new Date();
    const sessions = db.collection<SessionDoc>("sessions");
    const session = await sessions.findOne({ token_hash: sha256(claims.sid), expires_at: { $gt: now } });
    if (!session) return null;

    const { idleMs } = sessionPolicy();
    if (now.getTime() - session.last_seen_at.getTime() > idleMs) {
      await sessions.deleteOne({ _id: session._id }); // idle timeout → session is gone for good
      return null;
    }
    if (now.getTime() - session.last_seen_at.getTime() > TOUCH_INTERVAL_MS) {
      await sessions.updateOne({ _id: session._id }, { $set: { last_seen_at: now } });
      session.last_seen_at = now;
    }

    const user = await db.collection<UserDoc>("users").findOne({ _id: session.user_id });
    // Only the email configured in ADMIN_EMAIL is ever an admin — old accounts are locked out.
    if (!user || user.role !== "admin" || user.email !== admin.email || !user.password_hash) return null;
    return toAdmin(user, {
      id: session._id.toHexString(),
      expiresAt: session.expires_at.toISOString(),
      idleExpiresAt: new Date(Math.min(session.last_seen_at.getTime() + idleMs, session.expires_at.getTime())).toISOString(),
    });
  } catch (err) {
    console.error("[auth]", err);
    return null;
  }
}

export interface SessionListItem {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string;
  userAgent: string | null;
}

export async function sessionInfo(userId: string, currentSessionId?: string) {
  const db = await getDb();
  const _id = new ObjectId(userId);
  const [list, user] = await Promise.all([
    db.collection<SessionDoc>("sessions").find({ user_id: _id, expires_at: { $gt: new Date() } }).sort({ last_seen_at: -1 }).limit(20).toArray(),
    db.collection<UserDoc>("users").findOne({ _id }, { projection: { last_login_at: 1, created_at: 1 } }),
  ]);
  const sessions: SessionListItem[] = list.map((s) => ({
    id: s._id.toHexString(),
    current: s._id.toHexString() === currentSessionId,
    createdAt: s.created_at.toISOString(),
    lastSeenAt: s.last_seen_at.toISOString(),
    expiresAt: s.expires_at.toISOString(),
    ip: s.ip,
    userAgent: s.user_agent,
  }));
  return { active: sessions.length, sessions, lastLogin: user?.last_login_at?.toISOString() ?? null };
}

/** Signs out every session except the current one. */
export async function revokeOtherSessions(userId: string, currentSessionId?: string) {
  const db = await getDb();
  const { deletedCount } = await db.collection<SessionDoc>("sessions").deleteMany({
    user_id: new ObjectId(userId),
    ...(currentSessionId ? { _id: { $ne: new ObjectId(currentSessionId) } } : {}),
  });
  return deletedCount;
}

export async function logout(token: string | undefined | null) {
  if (!token) return;
  const claims = await openSession(token, getAdminConfig().secret);
  if (!claims) return;
  const db = await getDb();
  await db.collection("sessions").deleteOne({ token_hash: sha256(claims.sid) });
}

/* ------------------------------------------------------------------ */
/*  Web (cookie) sessions                                              */
/* ------------------------------------------------------------------ */

const secure = process.env.NODE_ENV === "production";

export async function setSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(ADMIN_HINT_COOKIE, "1", { httpOnly: false, secure, sameSite: "lax", path: "/", expires: expiresAt });
  // httpOnly (no JS access) + SameSite=Strict (never sent on cross-site requests) + Secure in production.
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "strict", path: "/", expires: expiresAt, priority: "high" });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(ADMIN_HINT_COOKIE);
}

/** Pending OTP challenge for the web login (httpOnly, scoped to /admin, 10 minutes). */
export async function setOtpCookie(challengeId: string) {
  (await cookies()).set(OTP_COOKIE, challengeId, { httpOnly: true, secure, sameSite: "strict", path: "/admin", maxAge: OTP_TTL_MS / 1000 });
}

export async function readOtpCookie() {
  return (await cookies()).get(OTP_COOKIE)?.value ?? null;
}

export async function clearOtpCookie() {
  (await cookies()).delete({ name: OTP_COOKIE, path: "/admin" });
}

/** Current admin from the session cookie. Cached per request. */
export const getCurrentAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return userFromToken(token);
});

/** Use at the top of every admin server action. */
export async function requireAdmin() {
  const user = await getCurrentAdmin();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  return user;
}

/* ------------------------------------------------------------------ */
/*  API (Bearer token or cookie) sessions                              */
/* ------------------------------------------------------------------ */

export function bearerToken(req: Request) {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

/**
 * Authenticates an API request. Mobile sends `Authorization: Bearer <token>`;
 * the web admin sends its httpOnly cookie (with a same-origin check against CSRF).
 */
export async function requireAdminRequest(req: Request) {
  const bearer = bearerToken(req);
  if (bearer) {
    const user = await userFromToken(bearer);
    if (!user) throw new AuthError("Session expired. Please sign in again.");
    return user;
  }

  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) throw new AuthError("You are not signed in.");
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) throw new AuthError("Cross-site request blocked.", 403);
  }
  const user = await userFromToken(cookie);
  if (!user) throw new AuthError("You are not signed in.");
  return user;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function requestMeta(req: Request): RequestMeta {
  return { ip: clientIp(req), userAgent: req.headers.get("user-agent") };
}
