"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { uploadFile } from "@/lib/admin/upload";
import { downloadUrl, errorMessage } from "@/lib/utils";
import { updateProfileFields } from "@/lib/actions-client";

/** Upload / replace / remove the downloadable CV without opening the full profile form. */
export function CvManager({ cvUrl }: { cvUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadFile(file, "cv", "file");
      const res = await updateProfileFields({ cv_url: url });
      if (!res.ok) throw new Error(res.error);
      toast.success(cvUrl ? "CV replaced" : "CV uploaded", { description: "All “Download CV” buttons now use this file." });
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">{cvUrl ? "CV uploaded" : "No CV uploaded"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {cvUrl ? decodeURIComponent(cvUrl.split("/").pop() ?? cvUrl) : "Upload a PDF to enable the Download CV buttons."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {cvUrl && (
          <a href={downloadUrl(cvUrl)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted">
            <Download className="h-4 w-4" /> Download
          </a>
        )}
        <Button size="sm" onClick={() => inputRef.current?.click()} loading={busy}>
          {!busy && <Upload className="relative h-4 w-4" />} <span className="relative">{cvUrl ? "Replace" : "Upload CV"}</span>
        </Button>
        {cvUrl && (
          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.doc,.docx"
        className="sr-only"
        aria-label="Upload CV"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={pending}
        title="Remove CV?"
        description="Download CV buttons will be hidden. The file stays in your Media library."
        confirmLabel="Remove"
        onConfirm={() =>
          start(async () => {
            const res = await updateProfileFields({ cv_url: "" });
            if (res.ok) {
              toast.success("CV removed");
              setConfirm(false);
              router.refresh();
            } else toast.error(res.error);
          })
        }
      />
    </div>
  );
}
