"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCheck, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";
import { cn, formatDate } from "@/lib/utils";
import { deleteMessage, markAllMessagesRead, setMessageRead } from "@/lib/actions-client";
import type { Message } from "@/types";

type Filter = "all" | "unread" | "read";

export function MessagesInbox({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  // Optimistic read state so the UI responds instantly.
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});

  const list = useMemo(
    () =>
      messages
        .map((m) => ({ ...m, is_read: readOverrides[m.id] ?? m.is_read }))
        .filter((m) => (filter === "all" ? true : filter === "unread" ? !m.is_read : m.is_read)),
    [messages, filter, readOverrides],
  );
  const unreadCount = messages.filter((m) => !(readOverrides[m.id] ?? m.is_read)).length;
  const selected = list.find((m) => m.id === selectedId) ?? messages.find((m) => m.id === selectedId) ?? null;

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, quiet = false) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (!quiet && res.message) toast.success(res.message);
        router.refresh();
      } else toast.error(res.error ?? "Something went wrong");
    });
  }

  function open(m: Message) {
    setSelectedId(m.id);
    if (!(readOverrides[m.id] ?? m.is_read)) {
      setReadOverrides((o) => ({ ...o, [m.id]: true }));
      run(() => setMessageRead(m.id, true), true);
    }
  }

  function toggleRead(m: Message) {
    const next = !(readOverrides[m.id] ?? m.is_read);
    setReadOverrides((o) => ({ ...o, [m.id]: next }));
    run(() => setMessageRead(m.id, next));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {messages.length} total · {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={pending}
            onClick={() => {
              setReadOverrides(Object.fromEntries(messages.map((m) => [m.id, true])));
              run(markAllMessagesRead);
            }}
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Filter messages">
        {(["all", "unread", "read"] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition",
              filter === f ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {messages.length === 0 ? (
        <EmptyState icon={Mail} title="Inbox is empty" description="Messages from your contact form will appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* List — hidden on mobile while a message is open */}
          <ul className={cn("space-y-2", selected && "hidden lg:block")}>
            {list.length === 0 && <EmptyState icon={MailOpen} title={`No ${filter} messages`} className="py-10" />}
            {list.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => open(m)}
                  className={cn(
                    "w-full rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40",
                    selectedId === m.id ? "border-primary ring-2 ring-primary/20" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("flex min-w-0 items-center gap-2", !m.is_read && "font-semibold")}>
                      {!m.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      <span className="truncate">{m.name}</span>
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground">{formatDate(m.created_at)}</time>
                  </div>
                  <p className={cn("mt-1 truncate text-sm", m.is_read ? "text-muted-foreground" : "text-foreground")}>
                    {m.subject}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{m.message}</p>
                </button>
              </li>
            ))}
          </ul>

          {/* Detail */}
          <div className={cn(!selected && "hidden lg:block")}>
            {selected ? (
              <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
                <Button variant="ghost" size="sm" className="-ml-2 mb-3 lg:hidden" onClick={() => setSelectedId(null)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold">{selected.subject}</h2>
                    <p className="mt-1 text-sm">
                      <span className="font-medium">{selected.name}</span>{" "}
                      <a href={`mailto:${selected.email}`} className="break-all text-primary hover:underline">
                        &lt;{selected.email}&gt;
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(selected.created_at, { dateStyle: "full", timeStyle: "short" })}
                    </p>
                  </div>
                  <Badge tone={(readOverrides[selected.id] ?? selected.is_read) ? "default" : "primary"}>
                    {(readOverrides[selected.id] ?? selected.is_read) ? "Read" : "Unread"}
                  </Badge>
                </div>
                <p className="mt-5 whitespace-pre-wrap break-words border-t border-border pt-5 text-sm leading-relaxed">
                  {selected.message}
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <a
                    href={`mailto:${selected.email}?subject=${encodeURIComponent("Re: " + selected.subject)}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-white"
                  >
                    <Reply className="h-4 w-4" /> Reply
                  </a>
                  <Button size="sm" variant="outline" onClick={() => toggleRead(selected)} disabled={pending}>
                    {(readOverrides[selected.id] ?? selected.is_read) ? (
                      <>
                        <Mail className="h-4 w-4" /> Mark as unread
                      </>
                    ) : (
                      <>
                        <MailOpen className="h-4 w-4" /> Mark as read
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10" onClick={() => setToDelete(selected)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </article>
            ) : (
              <EmptyState icon={MailOpen} title="Select a message" description="Choose a message to read it." className="h-full" />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        loading={pending}
        title="Delete message?"
        description={toDelete ? `The message from ${toDelete.name} will be permanently deleted.` : undefined}
        onConfirm={() => {
          if (!toDelete) return;
          const id = toDelete.id;
          startTransition(async () => {
            const res = await deleteMessage(id);
            if (res.ok) {
              toast.success(res.message);
              setToDelete(null);
              if (selectedId === id) setSelectedId(null);
              router.refresh();
            } else toast.error(res.error);
          });
        }}
      />
    </div>
  );
}
