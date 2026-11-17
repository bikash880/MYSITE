/**
 * Admin session tokens — encrypted JWTs (JWE, alg "dir", enc "A256GCM").
 *
 * - Encrypted: the payload (session id, email, auth methods) can't be read by the client.
 * - Authenticated: AES-GCM detects any tampering, so tokens can't be forged or modified.
 * - Expiring: standard `exp` claim (absolute lifetime), checked on every request.
 *
 * Edge-safe (no Node APIs) so the middleware can verify tokens before any admin route runs.
 * The key is derived from AUTH_SECRET (server env, ≥ 32 chars) with SHA-256.
 */
import { EncryptJWT, jwtDecrypt, errors } from "jose";

export const SESSION_ISSUER = "portfolio-admin";
export const SESSION_AUDIENCE = "portfolio-admin-panel";

export interface SessionClaims {
  /** Session id — looked up (hashed) in the database so sessions can be revoked. */
  sid: string;
  /** The admin's email. */
  sub: string;
  /** Authentication methods completed: must include both "pwd" and "otp". */
  amr: string[];
  iat: number;
  exp: number;
}

let cached: { secret: string; key: Uint8Array } | null = null;

async function keyFrom(secret: string) {
  if (cached?.secret === secret) return cached.key;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  cached = { secret, key: new Uint8Array(digest) };
  return cached.key;
}

export const isStrongSecret = (secret: string | undefined): secret is string => typeof secret === "string" && secret.length >= 32;

export async function sealSession(
  claims: { sid: string; sub: string; amr: string[] },
  expiresAt: Date,
  secret: string,
): Promise<string> {
  if (!isStrongSecret(secret)) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return new EncryptJWT({ sid: claims.sid, amr: claims.amr })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .encrypt(await keyFrom(secret));
}

/** Decrypts and validates a token. Returns null for anything invalid, tampered or expired. */
export async function openSession(token: string | null | undefined, secret: string | undefined): Promise<SessionClaims | null> {
  if (!token || !isStrongSecret(secret) || token.length > 2048 || token.split(".").length !== 5) return null;
  try {
    const { payload } = await jwtDecrypt(token, await keyFrom(secret), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
      clockTolerance: 5,
    });
    if (typeof payload.sid !== "string" || typeof payload.sub !== "string" || !Array.isArray(payload.amr)) return null;
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;
    return { sid: payload.sid, sub: payload.sub, amr: payload.amr.map(String), iat: payload.iat, exp: payload.exp };
  } catch (err) {
    if (!(err instanceof errors.JOSEError)) console.error("[session-token]", err);
    return null;
  }
}

/** A session only counts if the email OTP step was completed (never password alone). */
export function isFullyVerified(claims: SessionClaims, adminEmail: string) {
  return claims.sub === adminEmail && claims.amr.includes("pwd") && claims.amr.includes("otp");
}
