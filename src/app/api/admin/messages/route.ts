import { revalidatePath } from "next/cache";
import { adminRoute, errorJson, fromResult, json, readJson } from "@/lib/server/http";
import { listMessages, markAllMessagesRead } from "@/lib/server/repo";

export const GET = adminRoute(async () => json(await listMessages()));

/** POST { action: "read-all" } marks every message as read. */
export const POST = adminRoute(async (req) => {
  const body = (await readJson(req)) as { action?: string } | null;
  if (body?.action !== "read-all") return errorJson("Unknown action", 400);
  const res = await markAllMessagesRead();
  revalidatePath("/admin", "layout");
  return fromResult(res);
});
