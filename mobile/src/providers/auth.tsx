import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, authStorage, isApiConfigured, setUnauthorizedHandler } from "@/lib/api";
import { unregisterPushNotifications } from "@/lib/notifications";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin";
}

export interface OtpChallenge {
  challengeId: string;
  maskedEmail: string;
  delivery: "email" | "console";
  expiresAt: string;
}

type AuthCtx = {
  user: AdminUser | null;
  isAdmin: boolean;
  loading: boolean;
  /** Step 1: email + password → a code is emailed. */
  signIn: (email: string, password: string) => Promise<{ error?: string; challenge?: OtpChallenge }>;
  /** Step 2: the 6-digit code. */
  verifyCode: (challengeId: string, code: string) => Promise<{ error?: string; restart?: boolean }>;
  resendCode: (challengeId: string) => Promise<{ error?: string; challenge?: OtpChallenge }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(isApiConfigured);

  const clearLocal = useCallback(async () => {
    await authStorage.clear();
    setUser(null);
    // Drop private admin data (messages etc.) from the persisted cache.
    queryClient.removeQueries({ queryKey: ["admin"] });
  }, [queryClient]);

  // Restore the saved session and confirm it with the server.
  useEffect(() => {
    if (!isApiConfigured) return;
    let active = true;
    (async () => {
      const saved = await authStorage.load<AdminUser>().catch(() => ({ token: null, user: null }));
      if (!saved.token) {
        if (active) setLoading(false);
        return;
      }
      if (active) setUser(saved.user); // optimistic — works offline
      try {
        const { user: fresh } = await api<{ user: AdminUser }>("/api/auth/me", { auth: true });
        if (active) setUser(fresh);
      } catch (e) {
        // 401 = expired/revoked session. Network errors keep the cached session (offline mode).
        if (e instanceof ApiError && e.status === 401) await clearLocal();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clearLocal]);

  // Any authenticated request that returns 401 signs the app out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => void clearLocal());
    return () => setUnauthorizedHandler(null);
  }, [clearLocal]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const challenge = await api<OtpChallenge & { otpRequired: true }>("/api/auth/login", { method: "POST", body: { email, password } });
      return { challenge };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Sign in failed" };
    }
  }, []);

  const verifyCode = useCallback(async (challengeId: string, code: string) => {
    try {
      const res = await api<{ token: string; user: AdminUser }>("/api/auth/verify", { method: "POST", body: { challengeId, code } });
      await authStorage.save(res.token, res.user);
      setUser(res.user);
      return {};
    } catch (e) {
      // 410 = expired, 429 = too many attempts → the user must start again.
      const restart = e instanceof ApiError && (e.status === 410 || e.status === 429);
      return { error: e instanceof Error ? e.message : "Verification failed", restart };
    }
  }, []);

  const resendCode = useCallback(async (challengeId: string) => {
    try {
      const challenge = await api<OtpChallenge>("/api/auth/resend", { method: "POST", body: { challengeId } });
      return { challenge };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't resend the code" };
    }
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPushNotifications().catch(() => {});
    await api("/api/auth/logout", { method: "POST", auth: true }).catch(() => {});
    await clearLocal();
  }, [clearLocal]);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === "admin", loading, signIn, verifyCode, resendCode, signOut }),
    [user, loading, signIn, verifyCode, resendCode, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
