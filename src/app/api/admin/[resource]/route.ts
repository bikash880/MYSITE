import { revalidatePath } from "next/cache";
import { isResourceKey } from "@/lib/admin/resources";
import { adminRoute, errorJson, fromResult, json, readJson } from "@/lib/server/http";
import { listResource, saveResource } from "@/lib/server/repo";

type Ctx = { params: Promise<{ resource: string }> };

/** GET lists all items (including drafts/hidden); POST creates one. */
export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const { resource } = await params;
  return isResourceKey(resource) ? json(await listResource(resource)) : errorJson("Not found", 404);
});

export const POST = adminRoute<Ctx>(async (req, { params }) => {
  const { resource } = await params;
  if (!isResourceKey(resource)) return errorJson("Not found", 404);
  const res = await saveResource(resource, null, await readJson(req));
  if (res.ok) revalidatePath("/", "layout");
  return fromResult(res, 201);
});
