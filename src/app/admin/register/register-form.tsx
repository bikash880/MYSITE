"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, MailCheck, RotateCw, Send, ShieldCheck, Terminal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/misc";
import { fieldErrors, registerCompleteSchema, registerStartSchema } from "@/lib/validations";
import { cancelLogin, completeAdminRegistration, resendLoginCode, startAdminRegistration } from "@/lib/actions-client";
import { cn } from "@/lib/utils";

const RESEND_SECONDS = 60;

const noAutoFix = { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } as const;

export function RegisterForm() {
  const [step, setStep] = useState<{ kind: "email" } | { kind: "verify"; maskedEmail: string; delivery: string }>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerStartSchema.safeParse({ email });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    startTransition(async () => {
      const res = await startAdminRegistration(parsed.data);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      setStep({ kind: "verify", maskedEmail: res.data!.maskedEmail, delivery: res.data!.delivery });
      toast.success(res.data!.delivery === "email" ? "Verification code sent" : "Verification code generated");
    });
  }

  if (step.kind === "verify") {
    return (
      <VerifyStep
        maskedEmail={step.maskedEmail}
        delivery={step.delivery}
        onDelivery={(delivery) => setStep((s) => (s.kind === "verify" ? { ...s, delivery } : s))}
        onBack={() =>
          startTransition(async () => {
            await cancelLogin();
            setStep({ kind: "email" });
          })
        }
      />
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={onEmailSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="reg-email">Admin email</Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            {...noAutoFix}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(errors.email)}
            autoFocus
          />
          <FieldError message={errors.email} />
        </div>
        <Button type="submit" className="w-full" loading={pending}>
          {!pending && <Send className="relative h-4 w-4" />} <span className="relative">Send verification code</span>
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> We&apos;ll email a 6-digit code to prove you own this address
        </p>
      </form>
    </Card>
  );
}

const rules = [
  { label: "12+ characters", test: (v: string) => v.trim().length >= 12 },
  { label: "A letter", test: (v: string) => /[a-z]/i.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
];

function VerifyStep({
  maskedEmail,
  delivery,
  onBack,
  onDelivery,
}: {
  maskedEmail: string;
  delivery: string;
  onBack: () => void;
  onDelivery: (d: string) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerCompleteSchema.safeParse({ code, password, confirm });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    startTransition(async () => {
      const res = await completeAdminRegistration(parsed.data);
      if (res.ok) {
        toast.success("Admin account created — registration is now closed");
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      toast.error(res.error);
      if (res.fieldErrors?.code) setCode("");
      // Expired / locked / already registered → start over.
      if (!res.fieldErrors) setTimeout(() => (/closed/i.test(res.error) ? router.replace("/admin/login") : onBack()), 1400);
    });
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {delivery === "email" ? <MailCheck className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            {delivery === "email" ? (
              <>
                We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>. It expires in 10 minutes.
              </>
            ) : (
              <>
                Email (SMTP) isn&apos;t configured, so the code for <span className="font-medium text-foreground">{maskedEmail}</span> was
                printed in the server terminal (development only).
              </>
            )}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="reg-code">Verification code</Label>
          <Input
            id="reg-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            maxLength={6}
            invalid={Boolean(errors.code)}
            className="text-center font-mono text-2xl tracking-[0.5em]"
            autoFocus
          />
          <FieldError message={errors.code} />
        </div>

        <div>
          <Label htmlFor="reg-password">Create password</Label>
          <div className="relative">
            <Input
              id="reg-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              {...noAutoFix}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              invalid={Boolean(errors.password)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
            {rules.map((r) => {
              const met = r.test(password);
              return (
                <li key={r.label} className={cn("inline-flex items-center gap-1", met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {r.label}
                </li>
              );
            })}
          </ul>
          <FieldError message={errors.password} />
        </div>

        <div>
          <Label htmlFor="reg-confirm">Confirm password</Label>
          <Input
            id="reg-confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            {...noAutoFix}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            invalid={Boolean(errors.confirm)}
          />
          <FieldError message={errors.confirm} />
        </div>

        <Button type="submit" className="w-full" loading={pending}>
          {!pending && <ShieldCheck className="relative h-4 w-4" />} <span className="relative">Create admin account</span>
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          disabled={cooldown > 0 || resending}
          onClick={() =>
            startResend(async () => {
              const res = await resendLoginCode();
              if (res.ok) {
                toast.success(res.message);
                onDelivery(res.data!.delivery);
                setCooldown(RESEND_SECONDS);
                setCode("");
              } else {
                toast.error(res.error);
              }
            })
          }
          className="inline-flex items-center gap-1.5 font-medium text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
        >
          <RotateCw className={cn("h-4 w-4", resending && "animate-spin")} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </Card>
  );
}
