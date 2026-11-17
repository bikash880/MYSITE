import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP settings (server .env):
 *   SMTP_HOST, SMTP_PORT (465 = TLS, 587 = STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM
 * For Gmail use smtp.gmail.com:465 with an App Password (Google Account → Security → App passwords).
 */
// Google shows App Passwords as "abcd efgh ijkl mnop" — the spaces aren't part of it.
const smtpPass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");
const smtpUser = (process.env.SMTP_USER ?? "").trim();
const smtpHost = (process.env.SMTP_HOST ?? "").trim();

export const isMailConfigured = Boolean(smtpHost && smtpUser && smtpPass);

let transporter: Transporter | undefined;
function getTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  transporter ??= nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

/** Turns nodemailer errors into an actionable message (never includes the password). */
export function describeMailError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  if (e?.code === "EAUTH" || e?.responseCode === 535 || e?.responseCode === 534)
    return "Gmail rejected the SMTP login. SMTP_PASS must be a 16-character Google App Password (not your normal Gmail password) for SMTP_USER, with 2-Step Verification enabled.";
  if (
    [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ESOCKET",
      "ECONNECTION",
      "EDNS",
      "ENOTFOUND",
    ].includes(e?.code ?? "")
  )
    return `Couldn't reach ${smtpHost}:${process.env.SMTP_PORT || 465} (${e.code}). Check SMTP_HOST/SMTP_PORT and that your network/antivirus allows outgoing SMTP.`;
  return e?.message ?? String(err);
}

export type OtpDelivery = "email" | "console";
export type OtpPurpose = "login" | "register";

const escapeHtmlInline = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Sends a verification code. In development without SMTP, prints it to the server terminal instead. */
export async function sendOtpEmail(to: string, code: string, ip: string, purpose: OtpPurpose = "login"): Promise<OtpDelivery> {
  const label = purpose === "register" ? "registration" : "login";
  if (!isMailConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email delivery is not configured (SMTP_* variables). Admin access is disabled until it is.");
    }
    console.log(`\n[admin-otp] Development only — email not configured. ${purpose === "register" ? "Registration" : "Login"} code for ${to}: ${code}\n`);
    return "console";
  }

  const from = process.env.SMTP_FROM || smtpUser;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "your portfolio";
  const copy =
    purpose === "register"
      ? {
          kicker: "Admin registration",
          title: "Confirm your email",
          lead: "Enter this code to create your admin account. It expires in <b>10 minutes</b>.",
          warn: `If you didn't start creating the admin account on ${site}, ignore this email — no account is created without this code.`,
        }
      : {
          kicker: "Admin sign-in",
          title: "Your login code",
          lead: "Enter this code to finish signing in. It expires in <b>10 minutes</b>.",
          warn: `If you didn't try to sign in to ${site}, someone may know your password — change it right away.`,
        };
  try {
    await getTransport().sendMail({
      from,
      to,
      subject: `${code} is your admin ${label} code`,
      text: `Your admin ${label} code is ${code}.\n\nIt expires in 10 minutes. ${copy.warn}\n\nRequest from IP: ${ip}`,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:460px;margin:auto;padding:24px;color:#0b0b12">
      <p style="margin:0 0 8px;color:#6c63ff;font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:600">${copy.kicker}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${copy.title}</h1>
      <p style="margin:0 0 20px;color:#4a4a55">${copy.lead}</p>
      <p style="margin:0 0 24px;font-size:34px;font-weight:700;letter-spacing:.35em;font-family:ui-monospace,Menlo,monospace">${code}</p>
      <p style="margin:0;color:#6b6b78;font-size:13px">${escapeHtmlInline(copy.warn)}<br/>Request from IP: ${escapeHtmlInline(ip)}</p>
    </div>`,
    });
  } catch (err) {
    console.error(`[admin-otp] Email delivery failed: ${describeMailError(err)}`);
    if (process.env.NODE_ENV === "production") throw err;
    // Development: don't lock you out while SMTP is being fixed.
    console.log(`\n[admin-otp] Development fallback — ${label} code for ${to}: ${code}\n`);
    return "console";
  }
  console.log(`[admin-otp] ${label === "login" ? "Login" : "Registration"} code emailed to ${to.replace(/^(.).*(@.*)$/, "$1***$2")}`);
  return "email";
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

/**
 * Security notifications to the admin (new sign-in, lockout). Never throws — a failed alert
 * must not break authentication. Without SMTP they're logged to the server console.
 */
export async function sendSecurityAlert(
  to: string,
  kind: "signin" | "lockout" | "registered" | "password",
  details: {
    ip: string;
    userAgent?: string | null;
    when?: Date;
    reason?: string;
  },
) {
  const when = (details.when ?? new Date()).toUTCString();
  const ua = (details.userAgent ?? "Unknown device").slice(0, 200);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "your portfolio";
  const change = "Admin → Account & security → Change password";
  const text = {
    signin: {
      subject: "New sign-in to your admin panel",
      lead: `Your admin account on ${site} was just signed in to (password + email code verified).`,
      advice: `If this wasn't you, open Admin → Account & security, sign out all other sessions and change your password (${change}).`,
    },
    lockout: {
      subject: "Admin sign-in temporarily locked",
      lead: `Sign-in to your admin panel on ${site} was locked for 15 minutes: ${details.reason ?? "too many failed attempts"}.`,
      advice: `If this wasn't you, someone may be guessing your password. Consider changing it (${change}).`,
    },
    registered: {
      subject: "Your admin account was created",
      lead: `The admin account for ${site} was registered with this email. Public registration is now permanently closed.`,
      advice: "If this wasn't you, contact your hosting provider immediately and reset the account from the server (npm run admin:password -- --reset-registration).",
    },
    password: {
      subject: "Your admin password was changed",
      lead: `The admin password on ${site} was just changed and all other sessions were signed out.`,
      advice: "If this wasn't you, reset it from the server right away (npm run admin:password -- \"new-password\").",
    },
  }[kind];
  const { subject, lead, advice } = text;
  const accent = kind === "lockout" ? "#d97706" : "#6c63ff";

  if (!isMailConfigured) {
    console.log(
      `[admin-security] ${subject} — ${lead} IP ${details.ip}, ${ua}, ${when}`,
    );
    return;
  }
  try {
    await getTransport().sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to,
      subject,
      text: `${lead}\n\nTime: ${when}\nIP address: ${details.ip}\nDevice: ${ua}\n\n${advice}`,
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0b0b12">
        <p style="margin:0 0 8px;color:${accent};font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:600">Security alert</p>
        <h1 style="margin:0 0 14px;font-size:21px">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 18px;color:#4a4a55">${escapeHtml(lead)}</p>
        <table style="font-size:14px;color:#0b0b12;border-collapse:collapse">
          <tr><td style="padding:4px 16px 4px 0;color:#6b6b78">Time</td><td>${escapeHtml(when)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b6b78">IP address</td><td>${escapeHtml(details.ip)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b6b78">Device</td><td>${escapeHtml(ua)}</td></tr>
        </table>
        <p style="margin:18px 0 0;color:#6b6b78;font-size:13px">${escapeHtml(advice)}</p>
      </div>`,
    });
  } catch (err) {
    console.error(
      `[admin-security] alert email failed: ${describeMailError(err)}`,
    );
  }
}
