import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceManager } from "@/components/admin/resource-manager";
import { isResourceKey, RESOURCES } from "@/lib/admin/resources";
import { listResource } from "@/lib/server/repo";
import { errorMessage } from "@/lib/utils";

type Props = { params: Promise<{ resource: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resource } = await params;
  return { title: isResourceKey(resource) ? RESOURCES[resource].plural : "Not found" };
}

export default async function ResourcePage({ params }: Props) {
  const { resource } = await params;
  if (!isResourceKey(resource)) notFound();
  const cfg = RESOURCES[resource];

  try {
    const rows = await listResource(resource);
    return <ResourceManager resource={resource} rows={rows} />;
  } catch (err) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
        Could not load {cfg.plural.toLowerCase()}: {errorMessage(err)}
      </p>
    );
  }
}
