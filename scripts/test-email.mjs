// Checks the SMTP settings in .env.local and sends a test email to ADMIN_EMAIL.
// Usage: npm run mail:test
import nodemailer from "nodemailer";

const host = (process.env.SMTP_HOST ?? "").trim();
const port = Number(process.env.SMTP_PORT || 465);
const user = (process.env.SMTP_USER ?? "").trim();
const pass = (process.env.SMTP_PASS ?? "").replace(/\s+/g, ""); // App Passwords are shown with spaces
const from = process.env.SMTP_FROM || user;
const to = (process.env.ADMIN_EMAIL ?? user).trim();

const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS", !to && "ADMIN_EMAIL"].filter(Boolean);
if (missing.length) {
  console.error(`✖ Missing in .env.local: ${missing.join(", ")}`);
  if (!pass) {
    console.error(`
  SMTP_PASS must be a Gmail App Password:
    1. https://myaccount.google.com/signinoptions/twosv  → turn on 2-Step Verification
    2. https://myaccount.google.com/apppasswords         → create one named "Portfolio"
    3. Put the 16 letters in .env.local:  SMTP_PASS=abcdefghijklmnop
    4. npm run mail:test`);
  }
  process.exit(1);
}
if (/gmail\.com$/i.test(host) && pass.length !== 16) {
  console.warn(`⚠ SMTP_PASS is ${pass.length} characters — Gmail App Passwords are exactly 16. Your normal Gmail password will not work.`);
}

console.log(`• Connecting to ${host}:${port} as ${user} …`);
const t = nodemailer.createTransport({
  host, port, secure: port === 465, requireTLS: port !== 465,
  auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
});
try {
  await t.verify();
  console.log("✔ SMTP login OK");
  const info = await t.sendMail({
    from, to,
    subject: "Portfolio admin — test email",
    text: "SMTP is configured correctly. Admin login codes will be delivered to this inbox.",
  });
  console.log(`✔ Test email sent to ${to} (id ${info.messageId}). Check your inbox (and Spam once).`);
} catch (err) {
  const code = err?.code, rc = err?.responseCode;
  if (code === "EAUTH" || rc === 535 || rc === 534) {
    console.error("✖ Gmail rejected the login. Use a 16-character App Password for SMTP_USER (not your normal password), with 2-Step Verification on.");
  } else if (["ECONNREFUSED", "ETIMEDOUT", "ESOCKET", "ECONNECTION", "EDNS", "ENOTFOUND"].includes(code)) {
    console.error(`✖ Couldn't reach ${host}:${port} (${code}). Try SMTP_PORT=587, or allow outgoing SMTP in your firewall/antivirus.`);
  } else {
    console.error("✖", err?.message ?? err);
  }
  process.exit(1);
}
