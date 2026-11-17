import { errorJson, publicRoute } from "@/lib/server/http";
import { openMedia } from "@/lib/server/media";

/** Serves files stored in MongoDB GridFS. Add ?download=1 to force a download (e.g. the CV). */
export const GET = publicRoute<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const etag = `"${id}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });

  const media = await openMedia(id);
  if (!media) return errorJson("Not found", 404);

  const download = new URL(req.url).searchParams.has("download");
  const filename = media.file.filename.replace(/["\\\r\n]/g, "");
  return new Response(media.body, {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.file.length),
      // Files never change (new upload = new id), so cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      // Defence in depth: never let an uploaded file run scripts on our origin.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
});
