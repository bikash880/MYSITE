import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRefreshControl } from "@/components/screen";
import { toast } from "@/components/toast";
import { Badge, Button, EmptyState, ErrorState, IconButton, Image, Input, ListSkeleton } from "@/components/ui";
import { useAdminList, useDeleteRecord } from "@/hooks/use-admin-data";
import { useRefresh } from "@/hooks/use-public-data";
import { isResourceKey, RESOURCES, type ResourceConfig, type ResourceKey } from "@/lib/resources";
import type { Row } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { useTheme } from "@/providers/theme";

export default function ResourceListScreen() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  if (!isResourceKey(resource)) return <EmptyState icon="help-circle-outline" title="Unknown section" />;
  return <ResourceList resourceKey={resource} />;
}

function ResourceList({ resourceKey }: { resourceKey: ResourceKey }) {
  const cfg: ResourceConfig = RESOURCES[resourceKey];
  const { colors } = useTheme();
  const { data, isLoading, error, refetch } = useAdminList(resourceKey);
  const del = useDeleteRecord(resourceKey);
  const { refreshing, onRefresh } = useRefresh(refetch);
  const refreshControl = useRefreshControl(refreshing, onRefresh);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r) =>
      [cfg.titleField, cfg.subtitleField].some((f) => f && String(r[f] ?? "").toLowerCase().includes(q)),
    );
  }, [data, query, cfg]);

  const edit = (id: string) => router.push(`/admin/${resourceKey}/${id}` as Href);

  function confirmDelete(row: Row) {
    Alert.alert(`Delete ${cfg.singular.toLowerCase()}?`, `“${String(row[cfg.titleField])}” will be permanently deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          del.mutate(row.id, {
            onSuccess: () => toast.success(`${cfg.singular} deleted`),
            onError: (e) => toast.error("Delete failed", errorMessage(e)),
          }),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: cfg.plural,
          headerRight: () => <IconButton icon="add" label={`New ${cfg.singular}`} onPress={() => edit("new")} color={colors.primary} />,
        }}
      />
      <FlatList
        data={isLoading ? [] : rows}
        keyExtractor={(r) => r.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View className="gap-3">
            <Text className="text-sm text-muted-foreground">{cfg.description}</Text>
            {(data?.length ?? 0) > 4 && (
              <Input value={query} onChangeText={setQuery} placeholder={`Search ${cfg.plural.toLowerCase()}…`} clearButtonMode="while-editing" />
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ListSkeleton rows={4} image={false} />
          ) : error && !data ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : query ? (
            <EmptyState icon="search-outline" title="No matches" />
          ) : (
            <EmptyState
              icon={cfg.icon}
              title={`No ${cfg.plural.toLowerCase()} yet`}
              action={<Button title={`New ${cfg.singular.toLowerCase()}`} icon="add" onPress={() => edit("new")} />}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => edit(item.id)}
            onLongPress={() => confirmDelete(item)}
            accessibilityRole="button"
            accessibilityHint="Long-press to delete"
            className="flex-row items-center gap-3 rounded-3xl border border-border bg-card p-3 active:opacity-80"
          >
            {cfg.imageField ? (
              <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                {item[cfg.imageField] ? (
                  <Image source={{ uri: String(item[cfg.imageField]) }} className="h-full w-full" contentFit="cover" />
                ) : (
                  <Ionicons name="image-outline" size={20} color={colors.mutedForeground} />
                )}
              </View>
            ) : null}
            <View className="flex-1 gap-1">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {String(item[cfg.titleField] ?? "Untitled")}
              </Text>
              {cfg.subtitleField && item[cfg.subtitleField] ? (
                <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                  {String(item[cfg.subtitleField])}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap gap-1.5">
                {cfg.badges.map((b) => (
                  <RowBadge key={b.name} format={b.format} value={item[b.name]} label={b.label} />
                ))}
              </View>
            </View>
            <IconButton icon="trash-outline" label={`Delete ${String(item[cfg.titleField])}`} color="#ef4444" size={19} onPress={() => confirmDelete(item)} />
          </Pressable>
        )}
      />
      <Pressable
        onPress={() => edit("new")}
        accessibilityRole="button"
        accessibilityLabel={`New ${cfg.singular}`}
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-80"
        style={{ shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </>
  );
}

function RowBadge({ format, value, label }: { format: string; value: unknown; label?: string }) {
  switch (format) {
    case "status":
      return <Badge label={value ? "Published" : "Hidden"} tone={value ? "success" : "default"} />;
    case "bool":
      return value ? <Badge label={label ?? "Yes"} tone="primary" /> : null;
    case "percent":
      return <Badge label={`${Number(value ?? 0)}%`} tone="primary" />;
    case "stars":
      return <Badge label={"★".repeat(Number(value ?? 0))} tone="warning" />;
    default: {
      const v = String(value ?? "");
      if (!v) return null;
      return <Badge label={v} tone={v === "published" ? "success" : v === "draft" ? "warning" : "primary"} />;
    }
  }
}
