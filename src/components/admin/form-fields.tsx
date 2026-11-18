"use client";

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { FieldError, Input, Label, Select, Switch, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import type { FieldConfig } from "@/lib/admin/resources";
import { cn } from "@/lib/utils";
import { LocationField } from "./fields/location-field";
import { TagInput } from "./fields/tag-input";
import { UploadField } from "./fields/upload-field";

// Tiptap is heavy — only load it when a rich text field is on screen.
const RichTextEditor = dynamic(() => import("./fields/rich-text-editor").then((m) => m.RichTextEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-72" />,
});

export type FormValues = Record<string, unknown>;

/** Converts DB nulls into controlled-input friendly values. */
export function toFormValues(fields: FieldConfig[], row: Record<string, unknown> | null, defaults: FormValues = {}) {
  const out: FormValues = {};
  for (const f of fields) {
    const v = row?.[f.name] ?? defaults[f.name];
    if (f.type === "switch") out[f.name] = Boolean(v);
    else if (f.type === "tags") out[f.name] = Array.isArray(v) ? v : [];
    else if (f.type === "number" || f.type === "range") out[f.name] = v ?? 0;
    else out[f.name] = v == null ? "" : String(v);
  }
  return out;
}

export function FormFields({
  fields,
  values,
  errors,
  onChange,
  idPrefix,
}: {
  fields: FieldConfig[];
  values: FormValues;
  errors: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((f, i) => {
        const id = `${idPrefix}-${f.name}`;
        const heading = f.section && f.section !== fields[i - 1]?.section ? f.section : null;
        const err = errors[f.name];
        const errId = `${id}-error`;
        const describedBy = err ? errId : f.help ? `${id}-help` : undefined;
        const common = { id, invalid: Boolean(err), "aria-describedby": describedBy };
        const v = values[f.name];

        let control: React.ReactNode;
        switch (f.type) {
          case "textarea":
            control = (
              <Textarea {...common} value={String(v ?? "")} placeholder={f.placeholder} rows={4} onChange={(e) => onChange(f.name, e.target.value)} />
            );
            break;
          case "number":
            control = (
              <Input
                {...common}
                type="number"
                inputMode="numeric"
                min={f.min}
                max={f.max}
                value={String(v ?? "")}
                onChange={(e) => onChange(f.name, e.target.value === "" ? "" : Number(e.target.value))}
              />
            );
            break;
          case "range":
            control = (
              <div className="flex h-11 items-center gap-3">
                <input
                  id={id}
                  type="range"
                  min={f.min ?? 0}
                  max={f.max ?? 100}
                  value={Number(v ?? 0)}
                  onChange={(e) => onChange(f.name, Number(e.target.value))}
                  className="flex-1 accent-[var(--brand)]"
                />
                <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">{Number(v ?? 0)}%</span>
              </div>
            );
            break;
          case "switch":
            control = <Switch id={id} checked={Boolean(v)} onChange={(c) => onChange(f.name, c)} label={f.label} />;
            break;
          case "select":
            control = (
              <Select id={id} value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
            break;
          case "tags":
            control = (
              <TagInput id={id} value={(v as string[]) ?? []} onChange={(t) => onChange(f.name, t)} placeholder={f.placeholder} invalid={Boolean(err)} />
            );
            break;
          case "image":
          case "file":
            control = (
              <UploadField
                id={id}
                kind={f.type}
                folder={f.folder}
                accept={f.accept}
                value={String(v ?? "")}
                onChange={(url) => onChange(f.name, url)}
                invalid={Boolean(err)}
              />
            );
            break;
          case "richtext":
            control = (
              <RichTextEditor value={String(v ?? "")} onChange={(html) => onChange(f.name, html)} folder={f.folder} invalid={Boolean(err)} />
            );
            break;
          case "location":
            control = (
              <LocationField
                id={id}
                value={String(v ?? "")}
                onChange={(text) => onChange(f.name, text)}
                invalid={Boolean(err)}
                placeholder={f.placeholder}
                describedBy={describedBy}
              />
            );
            break;
          case "color":
            control = (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label={`${f.label} picker`}
                  value={/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : "#6c63ff"}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-card p-1"
                />
                <Input {...common} value={String(v ?? "")} onChange={(e) => onChange(f.name, e.target.value)} className="font-mono" />
              </div>
            );
            break;
          default:
            control = (
              <Input
                {...common}
                type={f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "date" ? "date" : "text"}
                inputMode={f.type === "url" ? "url" : f.type === "email" ? "email" : undefined}
                value={String(v ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => onChange(f.name, e.target.value)}
              />
            );
        }

        return (
          <Fragment key={f.name}>
          {heading && (
            <h3 className={cn("eyebrow flex items-center gap-3 text-[11px] text-muted-foreground sm:col-span-2", i > 0 && "mt-4 border-t border-border pt-6")}>
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-accent" aria-hidden />
              {heading}
            </h3>
          )}
          <div className={cn((f.full || f.type === "richtext") && "sm:col-span-2")}>
            {f.type !== "switch" && (
              <Label htmlFor={id}>
                {f.label}
                {f.required && <span className="ml-0.5 text-red-500">*</span>}
              </Label>
            )}
            {control}
            {f.help && !err && (
              <p id={`${id}-help`} className="mt-1.5 text-xs text-muted-foreground">
                {f.help}
              </p>
            )}
            <FieldError id={errId} message={err} />
          </div>
          </Fragment>
        );
      })}
    </div>
  );
}
