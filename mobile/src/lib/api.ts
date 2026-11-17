import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The app talks to the website's REST API (which owns the MongoDB Atlas connection).
 * The database credentials never ship inside the app.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const isApiConfigured = /^https?:\/\/.+/.test(API_URL) && !API_URL.includes("your-site");

const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/*  Session token (Keychain / Keystore via SecureStore)                */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = "auth.token";
const USER_KEY = "auth.user";
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

// SecureStore isn't available on web — fall back to AsyncStorage there.
const store = {
  get: (k: string) => (Platform.OS === "web" ? AsyncStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? AsyncStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? AsyncStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

export const authStorage = {
  async load<U>() {
    const [t, u] = await Promise.all([store.get(TOKEN_KEY), store.get(USER_KEY)]);
    token = t;
    return { token: t, user: u ? (JSON.parse(u) as U) : null };
  },
  async save(t: string, user: unknown) {
    token = t;
    await Promise.all([store.set(TOKEN_KEY, t), store.set(USER_KEY, JSON.stringify(user))]);
  },
  async clear() {
    token = null;
    await Promise.all([store.del(TOKEN_KEY), store.del(USER_KEY)]);
  },
};

/** Called when an authenticated request gets 401 (expired/revoked session). */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

/* ------------------------------------------------------------------ */
/*  Requests                                                           */
/* ------------------------------------------------------------------ */

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; auth?: boolean };

export async function api<T = unknown>(path: string, { method = "GET", body, auth = false }: Options = {}): Promise<T> {
  if (!isApiConfigured) throw new ApiError("The API URL isn't configured (EXPO_PUBLIC_API_URL).", 0);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload, signal: controller.signal });
  } catch {
    // Same wording the UI uses to detect offline state.
    throw new ApiError("Network request failed", 0);
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.();
    const d = data as { error?: string; fieldErrors?: Record<string, string> } | null;
    throw new ApiError(d?.error ?? `Request failed (${res.status})`, res.status, d?.fieldErrors);
  }
  return data as T;
}

/** Uploaded files are stored as "/api/media/<id>" — make them absolute for <Image> and the WebView. */
export function mediaUrl(url: string | null | undefined) {
  if (!url) return url ?? undefined;
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
