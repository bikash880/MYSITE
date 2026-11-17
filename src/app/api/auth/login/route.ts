import { requestMeta, startLogin } from "@/lib/server/auth";
import { errorJson, json, publicRoute, readJson } from "@/lib/server/http";
import { fieldErrors, loginSchema } from "@/lib/validations";

/**
 * Mobile sign-in, step 1: email + password → emails a 6-digit code.
 * Returns { otpRequired: true, challengeId, maskedEmail, delivery, expiresAt }.
 */
export const POST = publicRoute(async (req) => {
  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) return errorJson("Please fix the highlighted fields.", 422, fieldErrors(parsed.error));
  const challenge = await startLogin(parsed.data.email, parsed.data.password, requestMeta(req));
  return json({ otpRequired: true, ...challenge });
});
