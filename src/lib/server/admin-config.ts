import "server-only";
import { isStrongSecret } from "@/lib/session-token";

/**
 * Server environment (never in code):
 *   ADMIN_EMAIL             the ONLY email that can register / sign in
 *   AUTH_SECRET             ≥ 32 random chars — encrypts/authenticates session tokens (JWE)
 *   SESSION_MAX_AGE_HOURS   absolute session lifetime (default 12)
 *   SESSION_IDLE_MINUTES    sign out after this much inactivity (default 60)
 *   SMTP_*                  Gmail SMTP used to email the verification codes
 * The password itself is created once at /admin/register (email-verified) and stored only as a
 * bcrypt hash in MongoDB. Generate AUTH_SECRET with:  npm run admin:password -- --secret-only
 */
export function getAdminConfig() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const secret = process.env.AUTH_SECRET ?? "";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const secretOk = isStrongSecret(secret);
  return {
    email,
    secret,
    configured: emailOk && secretOk,
    problems: [
      !emailOk && "ADMIN_EMAIL is missing",
      !secretOk && "AUTH_SECRET is missing (run npm run admin:password -- --secret-only)",
    ].filter(Boolean) as string[],
  };
}

const num = (v: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

/** Session lifetime policy. */
export function sessionPolicy() {
  return {
    maxAgeMs: num(process.env.SESSION_MAX_AGE_HOURS, 12, 1, 24 * 30) * 3600_000,
    idleMs: num(process.env.SESSION_IDLE_MINUTES, 60, 5, 24 * 60) * 60_000,
  };
}

/** "bikashji681@gmail.com" → "bi••••••81@gmail.com" */
export function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  if (user.length <= 3) return `${user[0] ?? ""}•••@${domain}`;
  return `${user.slice(0, 2)}${"•".repeat(Math.min(6, user.length - 4))}${user.slice(-2)}@${domain}`;
}
