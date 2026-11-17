"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FileText, ImageIcon, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { uploadFile } from "@/lib/admin/upload";
import { cn, errorMessage, formatDate } from "@/lib/utils";
import type { MediaItem } from "@/lib/server/media";
import { deleteMediaFile } from "@/lib/actions-client";

type Filter = "all" | "images" | "documents" | "unused";

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [deleting, startDeleting] = useTransition();

  const counts = useMemo(
    () => ({
      all: items.length,
      images: items.filter((i) => i.contentType.startsWith("image/")).length,
      documents: items.filter((i) => !i.contentType.startsWith("image/")).length,
      unused: items.filter((i) => !i.usedIn.length).length,
    }),
    [items],
  );

  const visible = items.filter((i) => {
    if (filter === "images" && !i.contentType.startsWith("image/")) return false;
    if (filter === "documents" && i.contentType.startsWith("image/")) return false;
    if (filter === "unused" && i.usedIn.length) return false;
    return !query.trim() || i.filename.toLowerCase().includes(query.trim().toLowerCase());
  });

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, file] of list.entries()) {
      try {
        await uploadFile(file, "library", file.type.startsWith("image/") ? "image" : "file");
        ok++;
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err)}`);
      }
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    if (ok) {
      toast.success(`${ok} file${ok === 1 ? "" : "s"} uploaded`);
      router.refresh();
    }
  }

  async function copy(item: MediaItem) {
    const url = `${window.location.origin}${item.url}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(item.id);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied((c) => (c === item.id ? null : c)), 1800);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  }

  function remove(force: boolean) {
    if (!toDelete) return;
    const id = toDelete.id;
    startDeleting(async () => {
      const res = await deleteMediaFile(id, force);
      if (res.ok) {
        toast.success(res.message);
        setToDelete(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Media library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Images and documents stored in your database — {counts.all} file{counts.all === 1 ? "" : "s"}.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} loading={Boolean(uploading)} className="w-full sm:w-auto">
          {!uploading && <Upload className="relative h-4 w-4" />}
          <span className="relative">{uploading ? `Uploading ${uploading.done}/${uploading.total}…` : "Upload files"}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,application/pdf,.doc,.docx"
          className="sr-only"
          aria-label="Upload files"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={cn(
          "mb-6 flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition-colors",
          dragOver ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground",
        )}
      >
        <Upload className="h-5 w-5" />
        <p>
          Drag & drop files here, or{" "}
          <button type="button" onClick={() => inputRef.current?.click()} className="font-medium text-primary hover:underline">
            browse
          </button>
        </p>
        <p className="text-xs">JPG, PNG, WebP, GIF, AVIF, HEIC, PDF or Word · max 4 MB each</p>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Filter files">
          {(["all", "images", "documents", "unused"] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
                filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
              <span className={cn("font-mono text-[11px]", filter === f ? "text-white/75" : "text-muted-foreground/60")}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search files" placeholder="Search by file name…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No files yet" description="Upload images and documents to reuse them across your portfolio." />
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="No matching files" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => {
            const isImage = item.contentType.startsWith("image/");
            return (
              <li key={item.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-square overflow-hidden bg-muted"
                  aria-label={`Open ${item.filename}`}
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of stored media
                    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="grid h-full w-full place-items-center">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </span>
                  )}
                  <span className="absolute left-2 top-2">
                    {item.usedIn.length ? (
                      <Badge tone="success" title={item.usedIn.join("\n")}>
                        In use
                      </Badge>
                    ) : (
                      <Badge>Unused</Badge>
                    )}
                  </span>
                </a>
                <div className="flex flex-1 flex-col p-3">
                  <p className="truncate text-sm font-medium" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(item.size)} · {formatDate(item.uploadedAt)}
                  </p>
                  {item.usedIn.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground" title={item.usedIn.join("\n")}>
                      {item.usedIn.join(" · ")}
                    </p>
                  )}
                  <div className="mt-auto flex gap-1 pt-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copy(item)} aria-label={`Copy URL of ${item.filename}`} title="Copy URL">
                      {copied === item.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-muted"
                      aria-label={`Open ${item.filename} in a new tab`}
                      title="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8 text-red-500 hover:bg-red-500/10"
                      onClick={() => setToDelete(item)}
                      aria-label={`Delete ${item.filename}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => !deleting && setToDelete(null)}
        title="Delete file?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => remove(Boolean(toDelete?.usedIn.length))} loading={deleting}>
              {toDelete?.usedIn.length ? "Delete anyway" : "Delete"}
            </Button>
          </>
        }
      >
        {toDelete && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{toDelete.filename}</span> will be permanently deleted.
            </p>
            {toDelete.usedIn.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
                <p className="font-medium">This file is still in use:</p>
                <ul className="mt-1 list-inside list-disc">
                  {toDelete.usedIn.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                <p className="mt-1">Those places will show a placeholder instead.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
