"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  AuthError,
  changePassword,
  clearOtpCookie,
  completeRegistration,
  clearSessionCookie,
  logout,
  readOtpCookie,
  requireAdmin,
  resendOtp,
  revokeOtherSessions,
  setOtpCookie,
  setSessionCookie,
  SESSION_COOKIE,
  startLogin,
  startRegistration,
  verifyOtp,
} from "@/lib/server/auth";
import * as repo from "@/lib/server/repo";
import { deleteMedia } from "@/lib/server/media";
import { isDbConfigured } from "@/lib/server/db";
import { changePasswordSchema, fieldErrors, loginSchema, registerCompleteSchema, registerStartSchema } from "@/lib/validations";
import { errorMessage } from "@/lib/utils";
import type { ActionResult, MaintenanceState } from "@/types";

/** Public pages are ISR-cached — refresh all of them after any content change. */
function revalidateSite() {
  revalidatePath("/", "layout");
}

async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    await requireAdmin();
    return await fn();
  } catch (err) {
    console.error("[admin action]", err);
    return { ok: false, error: err instanceof AuthError ? err.message : errorMessage(err) };
  }
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent"),
  };
}

const authFail = (err: unknown): ActionResult<never> => ({
  ok: false,
  error: err instanceof AuthError ? err.message : "Sign in failed. Please try again.",
});

/** Step 1: email + password. On success an OTP is emailed and a short-lived challenge cookie is set. */
export async function signIn(input: unknown): Promise<ActionResult<{ maskedEmail: string; delivery: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!isDbConfigured) return { ok: false, error: "The database isn't configured. Set MONGODB_URI (see README)." };
  try {
    const challenge = await startLogin(parsed.data.email, parsed.data.password, await requestMeta());
    await setOtpCookie(challenge.challengeId);
    return { ok: true, data: { maskedEmail: challenge.maskedEmail, delivery: challenge.delivery } };
  } catch (err) {
    if (!(err instanceof AuthError)) console.error("[signIn]", err);
    return authFail(err);
  }
}

/** Step 2: the 6-digit code from the email. Creates the session on success. */
export async function verifyLoginCode(code: unknown): Promise<ActionResult> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    return { ok: false, error: "Enter the 6-digit code.", fieldErrors: { code: "Enter the 6-digit code" } };
  }
  try {
    const { token, expiresAt } = await verifyOtp(await readOtpCookie(), code, await requestMeta());
    await clearOtpCookie();
    await setSessionCookie(token, expiresAt);
    return { ok: true, message: "Welcome back!" };
  } catch (err) {
    if (err instanceof AuthError && (err.status === 410 || err.status === 429)) await clearOtpCookie();
    return { ...authFail(err), ...(err instanceof AuthError && err.status === 401 ? { fieldErrors: { code: err.message } } : {}) } as ActionResult;
  }
}

export async function resendLoginCode(): Promise<ActionResult<{ maskedEmail: string; delivery: string }>> {
  try {
    const challenge = await resendOtp(await readOtpCookie(), await requestMeta());
    return { ok: true, data: { maskedEmail: challenge.maskedEmail, delivery: challenge.delivery }, message: "A new code has been sent." };
  } catch (err) {
    return authFail(err);
  }
}

/* ---------- One-time admin registration ---------- */

/** Registration step 1: only ADMIN_EMAIL; emails a 6-digit code. Refused once the account exists. */
export async function startAdminRegistration(input: unknown): Promise<ActionResult<{ maskedEmail: string; delivery: string }>> {
  const parsed = registerStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!isDbConfigured) return { ok: false, error: "The database isn't configured. Set MONGODB_URI (see README)." };
  try {
    const challenge = await startRegistration(parsed.data.email, await requestMeta());
    await setOtpCookie(challenge.challengeId);
    return { ok: true, data: { maskedEmail: challenge.maskedEmail, delivery: challenge.delivery } };
  } catch (err) {
    if (!(err instanceof AuthError)) console.error("[register]", err);
    return { ...authFail(err), ...(err instanceof AuthError && err.status === 403 ? { fieldErrors: { email: err.message } } : {}) } as ActionResult<never>;
  }
}

/** Registration step 2: code + new password. Creates the account, closes signup forever, signs in. */
export async function completeAdminRegistration(input: unknown): Promise<ActionResult> {
  // Validate the password BEFORE using up the code.
  const parsed = registerCompleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const { token, expiresAt } = await completeRegistration(await readOtpCookie(), parsed.data.code, parsed.data.password, await requestMeta());
    await clearOtpCookie();
    await setSessionCookie(token, expiresAt);
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Admin account created" };
  } catch (err) {
    if (!(err instanceof AuthError)) console.error("[register]", err);
    if (err instanceof AuthError && (err.status === 410 || err.status === 429)) await clearOtpCookie();
    return { ...authFail(err), ...(err instanceof AuthError && err.status === 401 ? { fieldErrors: { code: err.message } } : {}) } as ActionResult;
  }
}

export async function changeAdminPassword(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  try {
    const user = await requireAdmin();
    const revoked = await changePassword(user, parsed.data.current, parsed.data.password, await requestMeta());
    return { ok: true, message: `Password changed${revoked ? ` — signed out ${revoked} other session(s)` : ""}` };
  } catch (err) {
    if (err instanceof AuthError && err.status === 400 && /current/i.test(err.message)) {
      return { ok: false, error: err.message, fieldErrors: { current: err.message } };
    }
    return { ok: false, error: err instanceof AuthError ? err.message : errorMessage(err) };
  }
}

export async function cancelLogin(): Promise<ActionResult> {
  await clearOtpCookie();
  return { ok: true };
}

export async function signOut(): Promise<ActionResult> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await logout(token).catch(() => {});
  await clearSessionCookie();
  return { ok: true, message: "Signed out" };
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

export async function saveResource(key: string, id: string | null, values: unknown) {
  return guard(async () => {
    const res = await repo.saveResource(key, id, values);
    if (res.ok) revalidateSite();
    return res;
  });
}

export async function deleteResource(key: string, id: string) {
  return guard(async () => {
    const res = await repo.deleteResource(key, id);
    if (res.ok) revalidateSite();
    return res;
  });
}

export async function saveProfile(values: unknown) {
  return guard(async () => {
    const res = await repo.saveSingleton("profile", values);
    if (res.ok) revalidateSite();
    return res;
  });
}

/** Turns maintenance mode on/off. Public pages switch immediately; the admin panel is never affected. */
export async function setMaintenanceMode(values: unknown): Promise<ActionResult<MaintenanceState>> {
  try {
    const user = await requireAdmin();
    const res = await repo.saveMaintenance(values, user.email);
    if (res.ok) revalidateSite();
    return res;
  } catch (err) {
    console.error("[maintenance]", err);
    return { ok: false, error: err instanceof AuthError ? err.message : errorMessage(err) };
  }
}

export async function saveSettings(values: unknown) {
  return guard(async () => {
    const res = await repo.saveSingleton("settings", values);
    if (res.ok) revalidateSite();
    return res;
  });
}

/* ------------------------------------------------------------------ */
/*  Messages                                                           */
/* ------------------------------------------------------------------ */

export async function setMessageRead(id: string, isRead: boolean) {
  return guard(async () => {
    const res = await repo.setMessageRead(id, isRead);
    revalidatePath("/admin", "layout");
    return res;
  });
}

export async function markAllMessagesRead() {
  return guard(async () => {
    const res = await repo.markAllMessagesRead();
    revalidatePath("/admin", "layout");
    return res;
  });
}

export async function deleteMessage(id: string) {
  return guard(async () => {
    const res = await repo.deleteMessage(id);
    revalidatePath("/admin", "layout");
    return res;
  });
}

/* ------------------------------------------------------------------ */
/*  Media library                                                      */
/* ------------------------------------------------------------------ */

export async function deleteMediaFile(id: string, force = false): Promise<ActionResult<{ usedIn?: string[] }>> {
  try {
    await requireAdmin();
    const res = await deleteMedia(id, force);
    if (!res.ok) return { ok: false, error: res.usedIn ? `${res.error} Used in: ${res.usedIn.join(", ")}` : res.error };
    if (force) revalidateSite();
    revalidatePath("/admin/media");
    return { ok: true, message: "File deleted" };
  } catch (err) {
    return { ok: false, error: err instanceof AuthError ? err.message : errorMessage(err) };
  }
}

/* ------------------------------------------------------------------ */
/*  Resume (partial profile updates, e.g. replacing the CV)            */
/* ------------------------------------------------------------------ */

export async function updateProfileFields(values: unknown) {
  return guard(async () => {
    const res = await repo.patchProfile(values);
    if (res.ok) {
      revalidateSite();
      revalidatePath("/admin", "layout");
    }
    return res;
  });
}

/* ------------------------------------------------------------------ */
/*  Account security                                                   */
/* ------------------------------------------------------------------ */

export async function signOutOtherDevices(): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const count = await revokeOtherSessions(user.id, user.session?.id);
    return { ok: true, message: count ? `Signed out ${count} other session(s)` : "No other active sessions" };
  } catch (err) {
    return { ok: false, error: err instanceof AuthError ? err.message : errorMessage(err) };
  }
}
