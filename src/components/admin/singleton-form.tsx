"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { profileForm, settingsForm } from "@/lib/admin/resources";
import { fieldErrors } from "@/lib/validations";
import { saveProfile, saveSettings } from "@/lib/actions-client";
import { FormFields, toFormValues, type FormValues } from "./form-fields";

const FORMS = {
  profile: { ...profileForm, save: saveProfile },
  settings: { ...settingsForm, save: saveSettings },
};

export function SingletonForm({ kind, initial }: { kind: keyof typeof FORMS; initial: Record<string, unknown> | null }) {
  const form = FORMS[kind];
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => toFormValues(form.fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function onChange(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
    setDirty(true);
    if (errors[name]) setErrors((e) => { const next = { ...e }; delete next[name]; return next; });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = form.schema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const res = await form.save(values);
      if (res.ok) {
        toast.success(res.message);
        setDirty(false);
        router.refresh();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="p-5 sm:p-6">
        <FormFields fields={form.fields} values={values} errors={errors} onChange={onChange} idPrefix={kind} />
      </Card>
      {/* Sticky save bar — easy to reach on phones */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{dirty ? "You have unsaved changes" : "All changes saved"}</p>
          <Button type="submit" loading={pending} disabled={!dirty}>
            {!pending && <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>
    </form>
  );
}
