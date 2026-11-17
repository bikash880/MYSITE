import type { Metadata } from "next";
import { MediaLibrary } from "@/components/admin/media-library";
import { listMedia } from "@/lib/server/media";

export const metadata: Metadata = { title: "Media library" };

export default async function MediaPage() {
  const items = await listMedia();
  return <MediaLibrary items={items} />;
}
