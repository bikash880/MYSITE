import { onlineManager, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query";
import { RESOURCES, SINGLETONS, type ResourceKey, type SingletonKind } from "@/lib/resources";
import { fieldErrors } from "@/lib/validations";
import type { Message, Row } from "@/lib/types";

/** Thrown when validation fails (client-side Zod or server 422); carries per-field messages. */
export class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Please fix the highlighted fields.");
  }
}

function assertOnline() {
  if (!onlineManager.isOnline()) throw new Error("You're offline. Changes can be saved once you're connected.");
}

/** Authenticated admin request; turns server validation errors into ValidationError. */
async function adminApi<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET", body?: unknown) {
  if (method !== "GET") assertOnline();
  try {
    return await api<T>(path, { method, body, auth: true });
  } catch (e) {
    if (e instanceof ApiError && e.fieldErrors) throw new ValidationError(e.fieldErrors);
    throw e;
  }
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["public"] })]);
}

/* ------------------------------------------------------------------ */
/*  Collections                                                        */
/* ------------------------------------------------------------------ */

export function useAdminList(key: ResourceKey) {
  return useQuery({ queryKey: qk.admin(key), queryFn: () => adminApi<Row[]>(`/api/admin/${key}`) });
}

export function useAdminRecord(key: ResourceKey, id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.admin(key, id),
    enabled: Boolean(id),
    queryFn: async () => {
      try {
        return await adminApi<Row>(`/api/admin/${key}/${id}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    initialData: () => qc.getQueryData<Row[]>(qk.admin(key))?.find((r) => r.id === id),
  });
}

export function useSaveRecord(key: ResourceKey) {
  const cfg = RESOURCES[key];
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: Record<string, unknown> }) => {
      // Validate locally for instant feedback; the server validates again with the same schema.
      const parsed = cfg.schema.safeParse(values);
      if (!parsed.success) throw new ValidationError(fieldErrors(parsed.error));
      const res = id
        ? await adminApi<{ data: Row }>(`/api/admin/${key}/${id}`, "PUT", values)
        : await adminApi<{ data: Row }>(`/api/admin/${key}`, "POST", values);
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRecord(key: ResourceKey) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => adminApi(`/api/admin/${key}/${id}`, "DELETE"),
    onSuccess: invalidate,
  });
}

/* ------------------------------------------------------------------ */
/*  Singletons (profile / settings)                                    */
/* ------------------------------------------------------------------ */

export function useSingleton(kind: SingletonKind) {
  return useQuery({
    queryKey: qk.admin(kind),
    queryFn: () => adminApi<Record<string, unknown>>(`/api/admin/singletons/${kind}`),
  });
}

export function useSaveSingleton(kind: SingletonKind) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const parsed = SINGLETONS[kind].schema.safeParse(values);
      if (!parsed.success) throw new ValidationError(fieldErrors(parsed.error));
      await adminApi(`/api/admin/singletons/${kind}`, "PUT", values);
    },
    onSuccess: invalidate,
  });
}

/* ------------------------------------------------------------------ */
/*  Messages & dashboard                                               */
/* ------------------------------------------------------------------ */

export function useMessages() {
  return useQuery({ queryKey: qk.admin("messages"), queryFn: () => adminApi<Message[]>("/api/admin/messages") });
}

export function useMessage(id: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.admin("message", id),
    queryFn: async () => {
      try {
        return await adminApi<Message>(`/api/admin/messages/${id}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    initialData: () => qc.getQueryData<Message[]>(qk.admin("messages"))?.find((m) => m.id === id),
  });
}

export function useSetMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) =>
      adminApi(`/api/admin/messages/${id}`, "PATCH", { is_read: isRead }),
    // Optimistic update so the inbox reacts instantly.
    onMutate: async ({ id, isRead }) => {
      await qc.cancelQueries({ queryKey: qk.admin("messages") });
      const prev = qc.getQueryData<Message[]>(qk.admin("messages"));
      qc.setQueryData<Message[]>(qk.admin("messages"), (list) => list?.map((m) => (m.id === id ? { ...m, is_read: isRead } : m)));
      qc.setQueryData<Message | null>(qk.admin("message", id), (m) => (m ? { ...m, is_read: isRead } : m));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.admin("messages"), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi("/api/admin/messages", "POST", { action: "read-all" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi(`/api/admin/messages/${id}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export interface DashboardStats {
  projects: number;
  certificates: number;
  skills: number;
  messages: number;
  unread: number;
  visits: number;
  visitsWeek: number;
}

export function useDashboardStats() {
  return useQuery({ queryKey: qk.admin("stats"), queryFn: () => adminApi<DashboardStats>("/api/admin/stats") });
}
