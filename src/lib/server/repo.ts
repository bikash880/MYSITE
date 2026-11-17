import "server-only";
import { after } from "next/server";
import type { Sort } from "mongodb";
import { z } from "zod";
import { DEFAULT_MAINTENANCE, DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@/lib/defaults";
import { isResourceKey, profileForm, RESOURCES, settingsForm } from "@/lib/admin/resources";
import { contactSchema, fieldErrors, maintenanceSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import type { ActionResult, Certificate, Education, Experience, MaintenanceState, Message, Profile, Project, Settings, Skill } from "@/types";
import { getDb, isDuplicateKey, isObjectId, oid, serialize, serializeAll } from "./db";
import { sendNewMessagePush } from "./push";

type Row = Record<string, unknown> & { id: string };

/** Turns absolute links to our own media (e.g. from the mobile app) into portable relative paths. */
function normalizeMedia<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(/https?:\/\/[^\s"'<>()]+?(\/api\/media\/[a-f0-9]{24})/gi, "$1") as T;
  }
  if (Array.isArray(value)) return value.map(normalizeMedia) as T;
  return value;
}

function sortOf(orderBy: { column: string; ascending: boolean }[]): Sort {
  return Object.fromEntries(orderBy.map((o) => [o.column, o.ascending ? 1 : -1]));
}

/* ------------------------------------------------------------------ */
/*  Public reads (only published content)                              */
/* ------------------------------------------------------------------ */

export async function fetchProfile(): Promise<Profile> {
  const db = await getDb();
  const doc = serialize<Profile>(await db.collection("profile").findOne({ _id: "main" as never }));
  return { ...DEFAULT_PROFILE, ...(doc ?? {}) };
}

export async function fetchSettings(): Promise<Settings> {
  const db = await getDb();
  const doc = serialize<Settings>(await db.collection("settings").findOne({ _id: "main" as never }));
  return { ...DEFAULT_SETTINGS, ...(doc ?? {}) };
}

/* ------------------------------------------------------------------ */
/*  Maintenance mode                                                   */
/* ------------------------------------------------------------------ */

interface MaintenanceDoc {
  _id: "maintenance";
  enabled: boolean;
  message: string | null;
  starts_at?: Date | null;
  eta: Date | null;
  updated_at: Date;
  updated_by?: string;
}

export async function fetchMaintenance(): Promise<MaintenanceState> {
  const db = await getDb();
  const doc = await db.collection<MaintenanceDoc>("system").findOne({ _id: "maintenance" });
  if (!doc) return DEFAULT_MAINTENANCE;
  return {
    enabled: Boolean(doc.enabled),
    message: doc.message ?? null,
    starts_at: doc.starts_at ? new Date(doc.starts_at).toISOString() : null,
    eta: doc.eta ? new Date(doc.eta).toISOString() : null,
    updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
  };
}

export async function saveMaintenance(values: unknown, updatedBy: string): Promise<ActionResult<MaintenanceState>> {
  const parsed = maintenanceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const { enabled, message, eta } = parsed.data;
  const db = await getDb();
  const now = new Date();
  // Switching on without a start time = maintenance starts now.
  const startsAt = parsed.data.starts_at ? new Date(parsed.data.starts_at) : enabled ? now : null;
  await db.collection<MaintenanceDoc>("system").updateOne(
    { _id: "maintenance" },
    { $set: { enabled, message, starts_at: startsAt, eta: eta ? new Date(eta) : null, updated_at: now, updated_by: updatedBy } },
    { upsert: true },
  );
  return {
    ok: true,
    data: await fetchMaintenance(),
    message: enabled ? "Maintenance mode is ON — visitors now see the maintenance page" : "Maintenance mode is OFF — the website is live again",
  };
}

const list = async <T,>(collection: string, filter: object, sort: Sort) => {
  const db = await getDb();
  return serializeAll<T>(await db.collection(collection).find(filter).sort(sort).toArray());
};

export const fetchSkills = () => list<Skill>("skills", {}, { sort_order: 1, name: 1 });
export const fetchExperiences = () => list<Experience>("experiences", {}, { sort_order: 1, start_date: -1 });
export const fetchEducation = () => list<Education>("education", {}, { sort_order: 1, start_date: -1 });
export const fetchProjects = () => list<Project>("projects", { published: true }, { sort_order: 1, created_at: -1 });
export const fetchCertificates = () =>
  list<Certificate>("certificates", { published: true }, { sort_order: 1, issue_date: -1 });

export async function fetchProject(slug: string) {
  const db = await getDb();
  return serialize<Project>(await db.collection("projects").findOne({ slug, published: true }));
}

/* ------------------------------------------------------------------ */
/*  Admin collections                                                  */
/* ------------------------------------------------------------------ */

export async function listResource(key: string): Promise<Row[]> {
  if (!isResourceKey(key)) throw new Error("Unknown resource");
  const cfg = RESOURCES[key];
  return list<Row>(cfg.table, {}, sortOf(cfg.orderBy));
}

export async function getResource(key: string, id: string): Promise<Row | null> {
  if (!isResourceKey(key) || !isObjectId(id)) return null;
  const db = await getDb();
  return serialize<Row>(await db.collection(RESOURCES[key].table).findOne({ _id: oid(id) }));
}

export async function saveResource(key: string, id: string | null, values: unknown): Promise<ActionResult<Row>> {
  if (!isResourceKey(key)) return { ok: false, error: "Unknown resource" };
  if (id !== null && !isObjectId(id)) return { ok: false, error: "Invalid id" };
  const cfg = RESOURCES[key];

  const parsed = cfg.schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) data[k] = normalizeMedia(v ?? null);

  if (cfg.slugFrom && !data.slug) data.slug = slugify(String(data[cfg.slugFrom] ?? "")) || `item-${Date.now()}`;

  const db = await getDb();
  const col = db.collection(cfg.table);
  const now = new Date();

  try {
    if (id) {
      const res = await col.findOneAndUpdate({ _id: oid(id) }, { $set: { ...data, updated_at: now } }, { returnDocument: "after" });
      if (!res) return { ok: false, error: `${cfg.singular} not found` };
      return { ok: true, data: serialize<Row>(res)!, message: `${cfg.singular} updated` };
    }
    const doc = { ...data, created_at: now, updated_at: now };
    const { insertedId } = await col.insertOne(doc);
    return { ok: true, data: serialize<Row>({ ...doc, _id: insertedId })!, message: `${cfg.singular} created` };
  } catch (err) {
    if (isDuplicateKey(err)) {
      return { ok: false, error: "That slug is already in use.", fieldErrors: { slug: "Already in use — choose another" } };
    }
    throw err;
  }
}

export async function deleteResource(key: string, id: string): Promise<ActionResult> {
  if (!isResourceKey(key)) return { ok: false, error: "Unknown resource" };
  if (!isObjectId(id)) return { ok: false, error: "Invalid id" };
  const cfg = RESOURCES[key];
  const db = await getDb();
  const { deletedCount } = await db.collection(cfg.table).deleteOne({ _id: oid(id) });
  return deletedCount ? { ok: true, message: `${cfg.singular} deleted` } : { ok: false, error: `${cfg.singular} not found` };
}

/* ------------------------------------------------------------------ */
/*  Singletons (profile / settings)                                    */
/* ------------------------------------------------------------------ */

const SINGLETON_SCHEMAS: Record<"profile" | "settings", z.ZodTypeAny> = {
  profile: profileForm.schema,
  settings: settingsForm.schema,
};

export const isSingletonKind = (k: string): k is "profile" | "settings" => k === "profile" || k === "settings";

export async function getSingleton(kind: "profile" | "settings") {
  return kind === "profile" ? fetchProfile() : fetchSettings();
}

/** Updates only the given profile fields (e.g. just the CV), validated with the same schema. */
export async function patchProfile(values: unknown): Promise<ActionResult> {
  const parsed = profileForm.schema.partial().safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (v !== undefined) data[k] = normalizeMedia(v ?? null);
  }
  if (!Object.keys(data).length) return { ok: false, error: "Nothing to update" };
  const db = await getDb();
  await db.collection("profile").updateOne({ _id: "main" as never }, { $set: { ...data, updated_at: new Date() } }, { upsert: true });
  return { ok: true, message: "Profile updated" };
}

export interface ResumeCheck {
  key: string;
  label: string;
  done: boolean;
  detail: string;
  href: string;
}

/** What the public resume is built from, and what's still missing. */
export async function resumeStatus() {
  const db = await getDb();
  const [profile, experiences, education, skills, certificates, projects, featured] = await Promise.all([
    fetchProfile(),
    db.collection("experiences").countDocuments(),
    db.collection("education").countDocuments(),
    db.collection("skills").countDocuments(),
    db.collection("certificates").countDocuments({ published: true }),
    db.collection("projects").countDocuments({ published: true }),
    db.collection("projects").countDocuments({ published: true, featured: true }),
  ]);
  const placeholderName = profile.full_name.trim().toLowerCase() === "your name";
  const bioLen = (profile.bio ?? "").trim().length;
  const checks: ResumeCheck[] = [
    { key: "name", label: "Name & title", done: !placeholderName && Boolean(profile.title), detail: placeholderName ? "Still the placeholder \"Your Name\"" : `${profile.full_name} — ${profile.title}`, href: "/admin/profile" },
    { key: "photo", label: "Profile photo", done: Boolean(profile.photo_url), detail: profile.photo_url ? "Uploaded" : "No photo yet", href: "/admin/profile" },
    { key: "bio", label: "Professional summary", done: bioLen >= 80, detail: bioLen ? `${bioLen} characters` : "Empty", href: "/admin/profile" },
    { key: "contact", label: "Contact details", done: Boolean(profile.email && (profile.phone || profile.location)), detail: [profile.email, profile.phone, profile.location].filter(Boolean).join(" · ") || "Missing", href: "/admin/profile" },
    { key: "cv", label: "Downloadable CV (PDF)", done: Boolean(profile.cv_url), detail: profile.cv_url ? "Uploaded" : "Not uploaded", href: "/admin/resume" },
    { key: "experience", label: "Work experience", done: experiences > 0, detail: `${experiences} entr${experiences === 1 ? "y" : "ies"}`, href: "/admin/experiences" },
    { key: "education", label: "Education", done: education > 0, detail: `${education} entr${education === 1 ? "y" : "ies"}`, href: "/admin/education" },
    { key: "skills", label: "Skills", done: skills >= 3, detail: `${skills} skill${skills === 1 ? "" : "s"}`, href: "/admin/skills" },
    { key: "certificates", label: "Certifications", done: certificates > 0, detail: `${certificates} published`, href: "/admin/certificates" },
    { key: "projects", label: "Projects", done: projects > 0, detail: `${projects} published · ${featured} featured`, href: "/admin/projects" },
  ];
  const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return { profile, checks, score, counts: { experiences, education, skills, certificates, projects } };
}

export async function saveSingleton(kind: "profile" | "settings", values: unknown): Promise<ActionResult> {
  const parsed = SINGLETON_SCHEMAS[kind].safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) data[k] = normalizeMedia(v ?? null);

  const db = await getDb();
  await db
    .collection(kind)
    .updateOne({ _id: "main" as never }, { $set: { ...data, updated_at: new Date() } }, { upsert: true });
  return { ok: true, message: `${kind === "profile" ? "Profile" : "Settings"} saved` };
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

export async function createMessage(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }
  const db = await getDb();
  const doc = { ...parsed.data, is_read: false, created_at: new Date() };
  const { insertedId } = await db.collection("messages").insertOne(doc);
  // Runs after the response is sent; a push failure must never fail the visitor's message.
  after(() =>
    sendNewMessagePush({ id: insertedId.toHexString(), name: doc.name, subject: doc.subject }).catch((e) =>
      console.warn("[push]", e),
    ),
  );
  return { ok: true, message: "Thanks! Your message has been sent." };
}

export async function listMessages() {
  return list<Message>("messages", {}, { created_at: -1 });
}

export async function getMessage(id: string) {
  if (!isObjectId(id)) return null;
  const db = await getDb();
  return serialize<Message>(await db.collection("messages").findOne({ _id: oid(id) }));
}

export async function setMessageRead(id: string, isRead: boolean): Promise<ActionResult> {
  if (!isObjectId(id)) return { ok: false, error: "Invalid id" };
  const db = await getDb();
  const { matchedCount } = await db.collection("messages").updateOne({ _id: oid(id) }, { $set: { is_read: Boolean(isRead) } });
  return matchedCount ? { ok: true, message: isRead ? "Marked as read" : "Marked as unread" } : { ok: false, error: "Message not found" };
}

export async function markAllMessagesRead(): Promise<ActionResult> {
  const db = await getDb();
  await db.collection("messages").updateMany({ is_read: false }, { $set: { is_read: true } });
  return { ok: true, message: "All messages marked as read" };
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  if (!isObjectId(id)) return { ok: false, error: "Invalid id" };
  const db = await getDb();
  const { deletedCount } = await db.collection("messages").deleteOne({ _id: oid(id) });
  return deletedCount ? { ok: true, message: "Message deleted" } : { ok: false, error: "Message not found" };
}

export async function countUnread() {
  const db = await getDb();
  return db.collection("messages").countDocuments({ is_read: false });
}

/* ------------------------------------------------------------------ */
/*  Dashboard, visits, push tokens                                     */
/* ------------------------------------------------------------------ */

export async function dashboardStats() {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [projects, certificates, skills, messages, unread, visits, visitsWeek, media] = await Promise.all([
    db.collection("projects").countDocuments(),
    db.collection("certificates").countDocuments(),
    db.collection("skills").countDocuments(),
    db.collection("messages").countDocuments(),
    db.collection("messages").countDocuments({ is_read: false }),
    db.collection("page_views").estimatedDocumentCount(),
    db.collection("page_views").countDocuments({ created_at: { $gte: weekAgo } }),
    db.collection("media.files").countDocuments(),
  ]);
  return { projects, certificates, skills, messages, unread, visits, visitsWeek, media };
}

const viewSchema = z.object({
  path: z.string().trim().min(1).max(300).startsWith("/"),
  referrer: z.string().max(500).nullable().optional(),
});

export async function recordPageView(input: unknown) {
  const parsed = viewSchema.safeParse(input);
  if (!parsed.success) return false;
  const db = await getDb();
  await db.collection("page_views").insertOne({ ...parsed.data, created_at: new Date() });
  return true;
}

const pushTokenSchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, "Invalid Expo push token"),
  platform: z.enum(["ios", "android"]).optional(),
});

export async function savePushToken(userId: string, input: unknown): Promise<ActionResult> {
  const parsed = pushTokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid token" };
  const db = await getDb();
  await db.collection("push_tokens").updateOne(
    { token: parsed.data.token },
    {
      $set: { user_id: oid(userId), platform: parsed.data.platform ?? null, updated_at: new Date() },
      $setOnInsert: { created_at: new Date() },
    },
    { upsert: true },
  );
  return { ok: true, message: "Notifications enabled" };
}

export async function deletePushToken(userId: string, token: unknown): Promise<ActionResult> {
  if (typeof token !== "string") return { ok: false, error: "Invalid token" };
  const db = await getDb();
  await db.collection("push_tokens").deleteOne({ token, user_id: oid(userId) });
  return { ok: true, message: "Notifications disabled" };
}
