import { bearerToken, logout } from "@/lib/server/auth";
import { json, publicRoute } from "@/lib/server/http";

/** Revokes the bearer token's session. Always succeeds (idempotent). */
export const POST = publicRoute(async (req) => {
  await logout(bearerToken(req));
  return json({ ok: true });
});
