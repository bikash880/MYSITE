import { z } from "zod";

/* Same helpers as the website (src/lib/validations.ts). Empty strings → null. */

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const reqText = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const optText = (max = 5000) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Must be at most ${max} characters`).nullable().optional());

/** Absolute http(s) URL, or a path to our own uploaded media ("/api/media/<id>"). */
export function isSafeUrl(value: string) {
  if (/^\/api\/media\/[a-f0-9]{24}$/i.test(value)) return true;
  try {
    const u = new URL(value);
    // Only http(s): blocks javascript:, data: and other schemes in links.
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const optUrl = () =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(2048, "URL is too long").refine(isSafeUrl, "Must be a valid URL (https://…)").nullable().optional(),
  );

export const optEmail = () =>
  z.preprocess(emptyToNull, z.string().trim().email("Must be a valid email").nullable().optional());

export const optDate = () =>
  z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date").nullable().optional());

export const reqDate = (label: string) =>
  z.string({ required_error: `${label} is required` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);

export const int = (min: number, max: number, label = "Value") =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be ≥ ${min}`)
    .max(max, `${label} must be ≤ ${max}`);

export const bool = () => z.boolean().default(false);

export const tags = () => z.array(z.string().trim().min(1).max(40)).max(20, "At most 20 tags").default([]);

export const slug = () =>
  z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only")
      .max(80)
      .nullable()
      .optional(),
  );

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(200),
  subject: z.string().trim().min(2, "Please add a subject").max(200),
  message: z.string().trim().min(10, "Message should be at least 10 characters").max(5000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
