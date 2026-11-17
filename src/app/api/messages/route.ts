import { fromResult, json, publicRoute, readJson } from "@/lib/server/http";
import { createMessage } from "@/lib/server/repo";

/** Public contact form endpoint (used by the mobile app; the website uses a server action). */
export const POST = publicRoute(async (req) => {
  const body = (await readJson(req)) as Record<string, unknown> | null;
  // Honeypot: bots fill hidden fields — pretend success.
  if (body && typeof body.company === "string" && body.company) return json({ ok: true });
  return fromResult(await createMessage(body), 201);
});
