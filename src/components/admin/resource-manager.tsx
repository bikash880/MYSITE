"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { RESOURCES, type ColumnConfig, type ResourceKey } from "@/lib/admin/resources";
import { fieldErrors } from "@/lib/validations";
import { cn, formatDate } from "@/lib/utils";
import { deleteResource, saveResource } from "@/lib/actions-client";
import { FormFields, toFormValues, type FormValues } from "./form-fields";

type Row = Record<string, unknown> & { id: string };

export function ResourceManager({ resource, rows }: { resource: ResourceKey; rows: Row[] }) {
  const cfg = RESOURCES[resource];
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Deep link from the dashboard: /admin/<resource>?new=1 opens the create form.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openForm(null);
      router.replace(pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [cfg.titleField, cfg.subtitleField].some((f) => f && String(r[f] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, cfg]);

  function openForm(row: Row | null) {
    setEditing(row);
    setValues(toFormValues(cfg.fields, row, cfg.defaults));
    setErrors({});
    setFormOpen(true);
  }

  function onChange(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => { const next = { ...e }; delete next[name]; return next; });
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = cfg.schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    startSaving(async () => {
      const res = await saveResource(resource, editing?.id ?? null, values);
      if (res.ok) {
        toast.success(res.message);
        setFormOpen(false);
        router.refresh();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  function onDelete() {
    if (!toDelete) return;
    startDeleting(async () => {
      const res = await deleteResource(resource, toDelete.id);
      if (res.ok) {
        toast.success(res.message);
        setToDelete(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const title = (r: Row) => String(r[cfg.titleField] ?? "Untitled");
  const subtitle = (r: Row) => (cfg.subtitleField ? String(r[cfg.subtitleField] ?? "") : "");
  const image = (r: Row) => (cfg.imageField ? (r[cfg.imageField] as string | null) : null);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{cfg.plural}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{cfg.description}</p>
        </div>
        <Button onClick={() => openForm(null)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> New {cfg.singular.toLowerCase()}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`Search ${cfg.plural.toLowerCase()}`}
            placeholder={`Search ${cfg.plural.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${cfg.plural.toLowerCase()} yet`}
          description={`Create your first ${cfg.singular.toLowerCase()} to get started.`}
          action={
            <Button onClick={() => openForm(null)}>
              <Plus className="h-4 w-4" /> New {cfg.singular.toLowerCase()}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search term." />
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex gap-3">
                  {cfg.imageField && <Thumb src={image(r)} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{title(r)}</p>
                    {subtitle(r) && <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle(r)}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cfg.columns.map((c) => (
                    <span key={c.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{c.label}:</span>
                      <Cell col={c} value={r[c.name]} />
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openForm(r)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setToDelete(r)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{cfg.singular}</th>
                  {cfg.columns.map((c) => (
                    <th key={c.name} className={cn("px-4 py-3 font-medium", c.hideOnMobile && "hidden lg:table-cell")}>
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="transition hover:bg-muted/30">
                    <td className="max-w-md px-4 py-3">
                      <div className="flex items-center gap-3">
                        {cfg.imageField && <Thumb src={image(r)} small />}
                        <div className="min-w-0">
                          <button onClick={() => openForm(r)} className="block max-w-full truncate text-left font-medium hover:text-primary">
                            {title(r)}
                          </button>
                          {subtitle(r) && <p className="truncate text-xs text-muted-foreground">{subtitle(r)}</p>}
                        </div>
                      </div>
                    </td>
                    {cfg.columns.map((c) => (
                      <td key={c.name} className={cn("px-4 py-3", c.hideOnMobile && "hidden lg:table-cell")}>
                        <Cell col={c} value={r[c.name]} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" aria-label={`Edit ${title(r)}`} onClick={() => openForm(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${title(r)}`}
                          className="text-red-500 hover:bg-red-500/10"
                          onClick={() => setToDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={`${editing ? "Edit" : "New"} ${cfg.singular.toLowerCase()}`}
        size={cfg.fields.some((f) => f.type === "richtext") ? "lg" : "md"}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => onSubmit()} loading={saving}>
              {editing ? "Save changes" : `Create ${cfg.singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} noValidate>
          <FormFields fields={cfg.fields} values={values} errors={errors} onChange={onChange} idPrefix={resource} />
          <button type="submit" hidden />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        loading={deleting}
        title={`Delete ${cfg.singular.toLowerCase()}?`}
        description={toDelete ? `“${title(toDelete)}” will be permanently deleted.` : undefined}
      />
    </div>
  );
}

function Thumb({ src, small }: { src: string | null; small?: boolean }) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-lg bg-muted", small ? "h-10 w-10" : "h-14 w-14")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of arbitrary URL */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
    </div>
  );
}

function Cell({ col, value }: { col: ColumnConfig; value: unknown }) {
  switch (col.format) {
    case "date":
      return <span>{value ? formatDate(String(value)) : "—"}</span>;
    case "bool":
      return value ? <Check className="h-4 w-4 text-emerald-500" aria-label="Yes" /> : <X className="h-4 w-4 text-muted-foreground" aria-label="No" />;
    case "status":
      return value ? <Badge tone="success">Published</Badge> : <Badge>Hidden</Badge>;
    case "badge": {
      const v = String(value ?? "—");
      const tone = v === "published" ? "success" : v === "draft" ? "warning" : "primary";
      return <Badge tone={tone}>{v}</Badge>;
    }
    case "stars":
      return (
        <span className="inline-flex" aria-label={`${value} stars`}>
          {Array.from({ length: Number(value ?? 0) }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </span>
      );
    case "progress":
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <span className="block h-full bg-primary" style={{ width: `${Number(value ?? 0)}%` }} />
          </span>
          <span className="tabular-nums">{Number(value ?? 0)}%</span>
        </span>
      );
    case "tags":
      return <span>{Array.isArray(value) ? value.join(", ") : "—"}</span>;
    default:
      return <span>{value == null || value === "" ? "—" : String(value)}</span>;
  }
}
