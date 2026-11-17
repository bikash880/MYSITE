"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LogIn, MailCheck, RotateCw, ShieldCheck, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/misc";
import { fieldErrors, loginSchema } from "@/lib/validations";
import { cancelLogin, resendLoginCode, signIn, verifyLoginCode } from "@/lib/actions-client";
import { cn } from "@/lib/utils";

type Step = { kind: "password" } | { kind: "otp"; maskedEmail: string; delivery: string };

const RESEND_SECONDS = 60;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await signIn(parsed.data);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      setPassword("");
      setStep({ kind: "otp", maskedEmail: res.data!.maskedEmail, delivery: res.data!.delivery });
      toast.success(res.data!.delivery === "email" ? "Verification code sent" : "Verification code generated");
    });
  }

  if (step.kind === "otp") {
    return (
      <OtpStep
        maskedEmail={step.maskedEmail}
        delivery={step.delivery}
        onBack={() => {
          startTransition(async () => {
            await cancelLogin();
            setStep({ kind: "password" });
          });
        }}
        onSuccess={() => {
          const next = params.get("next");
          // Only allow internal admin redirects.
          router.replace(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
          router.refresh();
        }}
        onDelivery={(delivery) => setStep((s) => (s.kind === "otp" ? { ...s, delivery } : s))}
      />
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={onPasswordSubmit} noValidate className="space-y-4">
        <div>
          <Label htmlFor="email">Admin email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={Boolean(errors.email)}
            autoFocus
          />
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
          <FieldError message={errors.password} />
        </div>
        <Button type="submit" className="w-full" loading={pending}>
          {!pending && <LogIn className="relative h-4 w-4" />} <span className="relative">Continue</span>
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> A verification code will be sent to your email
        </p>
      </form>
    </Card>
  );
}

function OtpStep({
  maskedEmail,
  delivery,
  onBack,
  onSuccess,
  onDelivery,
}: {
  maskedEmail: string;
  delivery: string;
  onBack: () => void;
  onSuccess: () => void;
  onDelivery: (d: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string>("");
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  function submit(value = code) {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await verifyLoginCode(value);
      if (res.ok) {
        toast.success("Welcome back!");
        onSuccess();
        return;
      }
      setError(res.fieldErrors?.code ?? res.error);
      toast.error(res.error);
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      // Expired / locked challenge → back to the password step.
      if (!res.fieldErrors?.code) setTimeout(onBack, 1200);
    });
  }

  function setDigit(i: number, raw: string) {
    const chars = raw.replace(/\D/g, "");
    if (!chars) {
      setDigits((d) => d.map((v, j) => (j === i ? "" : v)));
      return;
    }
    // Typing or pasting several digits fills the following boxes.
    const next = [...digits];
    for (let k = 0; k < chars.length && i + k < 6; k++) next[i + k] = chars[k]!;
    setDigits(next);
    setError("");
    const focus = Math.min(i + chars.length, 5);
    refs.current[focus]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
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
                Email isn&apos;t configured yet, so the code for <span className="font-medium text-foreground">{maskedEmail}</span> was printed in
                the server terminal (development only).
              </>
            )}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <Label htmlFor="otp-0">Verification code</Label>
        <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
              }}
              onPaste={(e) => {
                e.preventDefault();
                setDigit(i, e.clipboardData.getData("text"));
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={Boolean(error) || undefined}
              disabled={pending}
              className={cn(
                "h-14 w-full min-w-0 rounded-2xl border bg-card/70 text-center font-mono text-2xl font-semibold transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
                error ? "border-red-500" : "border-border",
              )}
            />
          ))}
        </div>
        <FieldError message={error} />

        <Button type="submit" className="mt-5 w-full" loading={pending} disabled={code.length !== 6}>
          {!pending && <ShieldCheck className="relative h-4 w-4" />} <span className="relative">Verify & sign in</span>
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Use a different account
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
                setDigits(Array(6).fill(""));
                refs.current[0]?.focus();
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
