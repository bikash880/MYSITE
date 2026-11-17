import { adminRoute, errorJson, json } from "@/lib/server/http";
import { storeUpload } from "@/lib/server/media";

/** multipart/form-data: file=<File>, folder=<string>. Returns { url: "/api/media/<id>" }. */
export const POST = adminRoute(async (req, _ctx, user) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorJson("Expected multipart/form-data", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return errorJson("No file provided", 400);
  const folder = String(form.get("folder") ?? "uploads");
  const stored = await storeUpload(file, folder, user.id);
  return json(stored, 201);
});
