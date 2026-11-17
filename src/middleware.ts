import { NextResponse, type NextRequest } from "next/server";
import { isFullyVerified, openSession } from "@/lib/session-token";

const SESSION_COOKIE = "pf_session";
const ADMIN_HINT_COOKIE = "pf_admin";

/** Admin responses must never be cached or indexed. */
function harden(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

/**
 * Edge gatekeeper for /admin and /api/admin.
 * Decrypts + authenticates the session token (JWE) and checks it is unexpired, belongs to
 * ADMIN_EMAIL and completed BOTH password and email-OTP verification. Anything else never
 * reaches an admin page or API. The server additionally checks the session in the database
 * (revocation, idle timeout) on every request.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const secret = process.env.AUTH_SECRET;
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

  // Login and the one-time registration page are reachable without a session. The register page
  // itself returns 404 once the admin account exists (checked server-side against the database).
  if (pathname === "/admin/login" || pathname === "/admin/register") return harden(NextResponse.next());

  const auth = request.headers.get("authorization");
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const token = isApi && auth?.startsWith("Bearer ") ? auth.slice(7).trim() : cookieToken;
  const claims = await openSession(token, secret);
  const valid = Boolean(claims && adminEmail && isFullyVerified(claims, adminEmail));

  if (valid) return harden(NextResponse.next());

  if (isApi) {
    return harden(NextResponse.json({ error: "You are not signed in." }, { status: 401 }));
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname);
  if (cookieToken) loginUrl.searchParams.set("expired", "1");
  const res = NextResponse.redirect(loginUrl);
  // Drop invalid/expired cookies so the browser stops sending them.
  if (cookieToken) res.cookies.delete(SESSION_COOKIE);
  if (request.cookies.has(ADMIN_HINT_COOKIE)) res.cookies.delete(ADMIN_HINT_COOKIE);
  return harden(res);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
