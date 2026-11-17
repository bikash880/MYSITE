"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { contactSchema, fieldErrors, type ContactInput } from "@/lib/validations";
import { sendMessage } from "@/lib/actions-client";

const EMPTY: ContactInput = { name: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [pending, startTransition] = useTransition();

  const set = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((e) => { const next = { ...e }; delete next[k]; return next; });
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const res = await sendMessage(parsed.data, honeypot);
      if (res.ok) {
        toast.success(res.message ?? "Message sent!");
        setValues(EMPTY);
        setErrors({});
      } else {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  const field = (k: keyof ContactInput) => ({
    id: `contact-${k}`,
    name: k,
    value: values[k],
    onChange: set(k),
    invalid: Boolean(errors[k]),
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Honeypot (hidden from humans) */}
      <div className="hidden" aria-hidden>
        <label>
          Company <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Name</Label>
          <Input {...field("name")} autoComplete="name" placeholder="Jane Doe" />
          <FieldError id="contact-name-error" message={errors.name} />
        </div>
        <div>
          <Label htmlFor="contact-email">Email</Label>
          <Input {...field("email")} type="email" autoComplete="email" inputMode="email" placeholder="jane@company.com" />
          <FieldError id="contact-email-error" message={errors.email} />
        </div>
      </div>
      <div>
        <Label htmlFor="contact-subject">Subject</Label>
        <Input {...field("subject")} placeholder="Project inquiry" />
        <FieldError id="contact-subject-error" message={errors.subject} />
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <Textarea {...field("message")} rows={6} placeholder="Tell me about your project, timeline and budget…" />
        <FieldError id="contact-message-error" message={errors.message} />
      </div>
      <div className="flex flex-col-reverse items-start gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">I usually reply within 24 hours.</p>
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">
          {!pending && <Send className="relative h-4 w-4" />} <span className="relative">Send message</span>
        </Button>
      </div>
    </form>
  );
}
