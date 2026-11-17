"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { changeAdminPassword, signOutOtherDevices } from "@/lib/actions-client";
import { changePasswordSchema, fieldErrors } from "@/lib/validations";

export function SessionControls({ active }: { active: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium">
            {active} active session{active === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted-foreground">Including this browser.</p>
        </div>
      </div>
      <Button
        variant="outline"
        loading={pending}
        disabled={active <= 1}
        onClick={() =>
          start(async () => {
            const res = await signOutOtherDevices();
            if (res.ok) {
              toast.success(res.message);
              router.refresh();
            } else toast.error(res.error);
          })
        }
      >
        {!pending && <LogOut className="h-4 w-4" />} Sign out other devices
      </Button>
    </div>
  );
}

const noAutoFix = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;

/** Change password — requires the current password; signs out every other session. */
export function ChangePasswordForm() {
  const router = useRouter();
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    start(async () => {
      const res = await changeAdminPassword(parsed.data);
      if (res.ok) {
        toast.success(res.message);
        setValues({ current: "", password: "", confirm: "" });
        router.refresh();
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  const type = show ? "text" : "password";
  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 sm:grid-cols-3">
      <div>
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" type={type} autoComplete="current-password" {...noAutoFix} value={values.current} onChange={set("current")} invalid={Boolean(errors.current)} />
        <FieldError message={errors.current} />
      </div>
      <div>
        <Label htmlFor="pw-new">New password</Label>
        <Input id="pw-new" type={type} autoComplete="new-password" {...noAutoFix} value={values.password} onChange={set("password")} invalid={Boolean(errors.password)} />
        <FieldError message={errors.password ?? "12+ characters, with a letter and a number"} />
      </div>
      <div>
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input id="pw-confirm" type={type} autoComplete="new-password" {...noAutoFix} value={values.confirm} onChange={set("confirm")} invalid={Boolean(errors.confirm)} />
        <FieldError message={errors.confirm} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" loading={pending}>
          {!pending && <KeyRound className="h-4 w-4" />} Change password
        </Button>
        <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? "Hide" : "Show"} passwords
        </button>
      </div>
    </form>
  );
}
