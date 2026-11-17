"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFile } from "@/lib/admin/upload";
import { cn, errorMessage } from "@/lib/utils";

export function UploadField({
  id,
  value,
  onChange,
  kind,
  folder = "uploads",
  accept,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  kind: "image" | "file";
  folder?: string;
  accept?: string;
  invalid?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, folder, kind);
      onChange(url);
      toast.success(`${kind === "image" ? "Image" : "File"} uploaded`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex items-center gap-4 rounded-xl border border-dashed p-3 transition",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          invalid && "border-red-500",
        )}
      >
        {kind === "image" ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview of arbitrary uploaded URL
              <img src={value} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />
            )}
          </div>
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            {value ? (
              <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {decodeURIComponent(value.split("/").pop() ?? value)}
              </a>
            ) : (
              <span className="text-muted-foreground">Drag & drop or choose a {kind}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => onChange("")} disabled={uploading}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept ?? (kind === "image" ? "image/*" : undefined)}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </div>
      <Input
        aria-label="Or paste a URL"
        placeholder="…or paste a URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
        className="h-9 text-xs sm:text-xs"
      />
    </div>
  );
}
