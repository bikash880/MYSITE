import { requestMeta, verifyOtp } from "@/lib/server/auth";
import { errorJson, json, publicRoute, readJson } from "@/lib/server/http";

/** Mobile sign-in, step 2: { challengeId, code } → { token, expiresAt, user }. */
export const POST = publicRoute(async (req) => {
  const body = (await readJson(req)) as { challengeId?: unknown; code?: unknown } | null;
  if (typeof body?.challengeId !== "string" || typeof body.code !== "string" || !/^\d{6}$/.test(body.code.trim())) {
    return errorJson("Enter the 6-digit code.", 422, { code: "Enter the 6-digit code" });
  }
  const { token, expiresAt, user } = await verifyOtp(body.challengeId, body.code, requestMeta(req));
  return json({ token, expiresAt: expiresAt.toISOString(), user });
});
