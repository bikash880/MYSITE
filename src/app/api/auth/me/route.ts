import { adminRoute, json } from "@/lib/server/http";

/** Returns the signed-in admin (401 if the token is missing, expired or revoked). */
export const GET = adminRoute(async (_req, _ctx, user) => json({ user }));
