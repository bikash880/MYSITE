import { json, publicRoute, readJson } from "@/lib/server/http";
import { recordPageView } from "@/lib/server/repo";

/** Records a page view for the "site visits" dashboard stat. */
export const POST = publicRoute(async (req) => {
  await recordPageView(await readJson(req));
  return json({ ok: true }, 202);
});
