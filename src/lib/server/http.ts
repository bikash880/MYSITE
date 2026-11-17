import "server-only";
import { NextResponse } from "next/server";
import type { ActionResult } from "@/types";
import { AuthError, requireAdminRequest, type AdminUser } from "./auth";
import { isDbConfigured } from "./db";
import { UploadError } from "./media";

export const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });

export const errorJson = (error: string, status: number, fieldErrors?: Record<string, string>) =>
  json({ error, ...(fieldErrors ? { fieldErrors } : {}) }, status);

/** Maps an ActionResult to an HTTP response (422 for validation, 404 for not found, 400 otherwise). */
export function fromResult<T>(res: ActionResult<T>, okStatus = 200) {
  if (res.ok) return json({ ok: true, data: res.data ?? null, message: res.message ?? null }, okStatus);
  const status = res.fieldErrors ? 422 : /not found/i.test(res.error) ? 404 : 400;
  return errorJson(res.error, status, res.fieldErrors);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

function handleError(err: unknown) {
  if (err instanceof AuthError) return errorJson(err.message, err.status);
  if (err instanceof UploadError) return errorJson(err.message, 400);
  console.error("[api]", err);
  return errorJson("Internal server error", 500);
}

/** Wraps a public route: DB check + uniform error handling. */
export function publicRoute<C>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    if (!isDbConfigured) return errorJson("Database not configured", 503);
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

/** Wraps an admin route: requires a valid admin session (Bearer token or same-origin cookie). */
export function adminRoute<C>(handler: (req: Request, ctx: C, user: AdminUser) => Promise<Response>): Handler<C> {
  return async (req, ctx) => {
    if (!isDbConfigured) return errorJson("Database not configured", 503);
    try {
      const user = await requireAdminRequest(req);
      return await handler(req, ctx, user);
    } catch (err) {
      return handleError(err);
    }
  };
}
