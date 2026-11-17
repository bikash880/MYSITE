"use client";

/**
 * Client-side entry point for every Server Action.
 *
 * A Server Action is called by an ID baked into the page. If the server was rebuilt after the
 * page loaded (a deploy, or a dev restart that cleared `.next`), that ID no longer exists and
 * Next.js throws `UnrecognizedActionError` ("Server Action not found"). Each action here is wrapped
 * so that case reloads the page once — fetching fresh IDs — instead of crashing the UI.
 *
 * Always import actions from this module in client components, never from the "use server" files.
 */
import { unstable_isUnrecognizedActionError } from "next/navigation";
import * as admin from "@/app/admin/actions";
import * as contact from "@/app/(site)/contact/actions";

const RELOAD_KEY = "pf:stale-action-reload";

function reloadForFreshActions(): Promise<never> {
  let recentlyReloaded = false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    recentlyReloaded = Date.now() - last < 15_000;
    if (!recentlyReloaded) sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage unavailable — still reload */
  }
  if (recentlyReloaded) {
    // Already reloaded moments ago and it still fails — don't loop; surface a clear message.
    return Promise.reject(new Error("The site was just updated. Please refresh the page and try again."));
  }
  window.location.reload();
  // Never settles: the page is navigating away, so callers shouldn't show an error meanwhile.
  return new Promise<never>(() => {});
}

function guard<A extends unknown[], R>(action: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await action(...args);
    } catch (err) {
      if (unstable_isUnrecognizedActionError(err)) return reloadForFreshActions();
      throw err;
    }
  };
}

// Auth & account
export const signIn = guard(admin.signIn);
export const verifyLoginCode = guard(admin.verifyLoginCode);
export const resendLoginCode = guard(admin.resendLoginCode);
export const cancelLogin = guard(admin.cancelLogin);
export const signOut = guard(admin.signOut);
export const startAdminRegistration = guard(admin.startAdminRegistration);
export const completeAdminRegistration = guard(admin.completeAdminRegistration);
export const changeAdminPassword = guard(admin.changeAdminPassword);
export const signOutOtherDevices = guard(admin.signOutOtherDevices);

// Content
export const saveResource = guard(admin.saveResource);
export const deleteResource = guard(admin.deleteResource);
export const saveProfile = guard(admin.saveProfile);
export const saveSettings = guard(admin.saveSettings);
export const setMaintenanceMode = guard(admin.setMaintenanceMode);
export const updateProfileFields = guard(admin.updateProfileFields);
export const deleteMediaFile = guard(admin.deleteMediaFile);
export const setMessageRead = guard(admin.setMessageRead);
export const deleteMessage = guard(admin.deleteMessage);
export const markAllMessagesRead = guard(admin.markAllMessagesRead);

// Public site
export const sendMessage = guard(contact.sendMessage);
