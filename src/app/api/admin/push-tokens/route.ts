import { adminRoute, fromResult, readJson } from "@/lib/server/http";
import { deletePushToken, savePushToken } from "@/lib/server/repo";

/** POST { token, platform } registers this device for new-message notifications. */
export const POST = adminRoute(async (req, _ctx, user) => fromResult(await savePushToken(user.id, await readJson(req))));

/** DELETE { token } unregisters it. */
export const DELETE = adminRoute(async (req, _ctx, user) => {
  const body = (await readJson(req)) as { token?: unknown } | null;
  return fromResult(await deletePushToken(user.id, body?.token));
});
