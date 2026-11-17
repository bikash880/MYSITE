import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import { useRefreshControl } from "@/components/screen";
import { toast } from "@/components/toast";
import { Chip, EmptyState, ErrorState, IconButton, ListSkeleton, cn } from "@/components/ui";
import { useMarkAllRead, useMessages } from "@/hooks/use-admin-data";
import { useRefresh } from "@/hooks/use-public-data";
import { errorMessage, timeAgo } from "@/lib/utils";
import { useTheme } from "@/providers/theme";

type Filter = "all" | "unread" | "read";

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { data, isLoading, error, refetch } = useMessages();
  const markAll = useMarkAllRead();
  const { refreshing, onRefresh } = useRefresh(refetch);
  const refreshControl = useRefreshControl(refreshing, onRefresh);
  const [filter, setFilter] = useState<Filter>("all");

  const unread = data?.filter((m) => !m.is_read).length ?? 0;
  const list = (data ?? []).filter((m) => (filter === "all" ? true : filter === "unread" ? !m.is_read : m.is_read));

  return (
    <>
      <Stack.Screen
        options={{
          title: unread ? `Messages (${unread})` : "Messages",
          headerRight: unread
            ? () => (
                <IconButton
                  icon="checkmark-done"
                  label="Mark all as read"
                  color={colors.primary}
                  onPress={() =>
                    markAll.mutate(undefined, {
                      onSuccess: () => toast.success("All messages marked as read"),
                      onError: (e) => toast.error("Failed", errorMessage(e)),
                    })
                  }
                />
              )
            : undefined,
        }}
      />
      <FlatList
        data={isLoading ? [] : list}
        keyExtractor={(m) => m.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 48 }}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View className="mb-1 flex-row gap-2" accessibilityRole="tablist">
            {(["all", "unread", "read"] as Filter[]).map((f) => (
              <Chip key={f} label={f[0]!.toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ListSkeleton rows={5} image={false} />
          ) : error && !data ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <EmptyState
              icon="mail-open-outline"
              title={data?.length ? `No ${filter} messages` : "Inbox is empty"}
              description={data?.length ? undefined : "Messages from your contact form appear here."}
            />
          )
        }
        renderItem={({ item: m }) => (
          <Pressable
            onPress={() => router.push(`/admin/messages/${m.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={`${m.is_read ? "" : "Unread. "}${m.name}: ${m.subject}`}
            className={cn("rounded-3xl border bg-card p-4 active:opacity-80", m.is_read ? "border-border" : "border-primary/40")}
          >
            <View className="flex-row items-center gap-2">
              {!m.is_read && <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
              <Text className={cn("flex-1 text-base text-foreground", !m.is_read && "font-bold")} numberOfLines={1}>
                {m.name}
              </Text>
              <Text className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</Text>
            </View>
            <Text className={cn("mt-1 text-sm", m.is_read ? "text-muted-foreground" : "font-semibold text-foreground")} numberOfLines={1}>
              {m.subject}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={2}>
              {m.message}
            </Text>
          </Pressable>
        )}
      />
    </>
  );
}
