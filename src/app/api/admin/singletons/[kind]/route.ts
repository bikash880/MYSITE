import { revalidatePath } from "next/cache";
import { adminRoute, errorJson, fromResult, json, readJson } from "@/lib/server/http";
import { getSingleton, isSingletonKind, saveSingleton } from "@/lib/server/repo";

type Ctx = { params: Promise<{ kind: string }> };

/** GET/PUT /api/admin/singletons/profile | settings */
export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const { kind } = await params;
  return isSingletonKind(kind) ? json(await getSingleton(kind)) : errorJson("Not found", 404);
});

export const PUT = adminRoute<Ctx>(async (req, { params }) => {
  const { kind } = await params;
  if (!isSingletonKind(kind)) return errorJson("Not found", 404);
  const res = await saveSingleton(kind, await readJson(req));
  if (res.ok) revalidatePath("/", "layout");
  return fromResult(res);
});
