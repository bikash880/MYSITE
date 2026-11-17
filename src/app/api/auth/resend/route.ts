import { requestMeta, resendOtp } from "@/lib/server/auth";
import { errorJson, json, publicRoute, readJson } from "@/lib/server/http";

/** Mobile sign-in: resend the code for { challengeId } (60-second cooldown). */
export const POST = publicRoute(async (req) => {
  const body = (await readJson(req)) as { challengeId?: unknown } | null;
  if (typeof body?.challengeId !== "string") return errorJson("Missing challengeId", 422);
  return json(await resendOtp(body.challengeId, requestMeta(req)));
});
