import { revalidatePath } from "next/cache";
import { isResourceKey } from "@/lib/admin/resources";
import { adminRoute, errorJson, fromResult, json, readJson } from "@/lib/server/http";
import { deleteResource, getResource, saveResource } from "@/lib/server/repo";

type Ctx = { params: Promise<{ resource: string; id: string }> };

export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const { resource, id } = await params;
  if (!isResourceKey(resource)) return errorJson("Not found", 404);
  const row = await getResource(resource, id);
  return row ? json(row) : errorJson("Not found", 404);
});

export const PUT = adminRoute<Ctx>(async (req, { params }) => {
  const { resource, id } = await params;
  if (!isResourceKey(resource)) return errorJson("Not found", 404);
  const res = await saveResource(resource, id, await readJson(req));
  if (res.ok) revalidatePath("/", "layout");
  return fromResult(res);
});

export const DELETE = adminRoute<Ctx>(async (_req, { params }) => {
  const { resource, id } = await params;
  if (!isResourceKey(resource)) return errorJson("Not found", 404);
  const res = await deleteResource(resource, id);
  if (res.ok) revalidatePath("/", "layout");
  return fromResult(res);
});
