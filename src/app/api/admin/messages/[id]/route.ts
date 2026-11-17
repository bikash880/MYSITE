import { revalidatePath } from "next/cache";
import { adminRoute, errorJson, fromResult, json, readJson } from "@/lib/server/http";
import { deleteMessage, getMessage, setMessageRead } from "@/lib/server/repo";

type Ctx = { params: Promise<{ id: string }> };

export const GET = adminRoute<Ctx>(async (_req, { params }) => {
  const msg = await getMessage((await params).id);
  return msg ? json(msg) : errorJson("Message not found", 404);
});

/** PATCH { is_read: boolean } */
export const PATCH = adminRoute<Ctx>(async (req, { params }) => {
  const body = (await readJson(req)) as { is_read?: unknown } | null;
  if (typeof body?.is_read !== "boolean") return errorJson("is_read must be a boolean", 422);
  const res = await setMessageRead((await params).id, body.is_read);
  revalidatePath("/admin", "layout");
  return fromResult(res);
});

export const DELETE = adminRoute<Ctx>(async (_req, { params }) => {
  const res = await deleteMessage((await params).id);
  revalidatePath("/admin", "layout");
  return fromResult(res);
});
