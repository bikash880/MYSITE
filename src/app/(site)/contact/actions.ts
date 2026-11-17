"use server";

import { isDbConfigured } from "@/lib/server/db";
import { createMessage, fetchMaintenance } from "@/lib/server/repo";
import type { ActionResult } from "@/types";

export async function sendMessage(input: unknown, honeypot?: string): Promise<ActionResult> {
  // Bots fill hidden fields; pretend success so they don't retry.
  if (honeypot) return { ok: true };
  if (!isDbConfigured) return { ok: false, error: "The contact form is not configured yet." };
  try {
    if ((await fetchMaintenance()).enabled) {
      return { ok: false, error: "The site is under maintenance right now. Please try again a little later." };
    }
    return await createMessage(input);
  } catch (err) {
    console.error("[contact]", err);
    return { ok: false, error: "Could not send your message. Please try again later." };
  }
}
