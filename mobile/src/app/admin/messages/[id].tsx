import { useEffect, useRef } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { Screen } from "@/components/screen";
import { toast } from "@/components/toast";
import { Badge, Button, Card, EmptyState, ErrorState, ListSkeleton } from "@/components/ui";
import { useDeleteMessage, useMessage, useMessages, useSetMessageRead } from "@/hooks/use-admin-data";
import { errorMessage, formatDateTime } from "@/lib/utils";

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m, isLoading, error, refetch } = useMessage(id);
  const { data: all } = useMessages();
  const setRead = useSetMessageRead();
  const del = useDeleteMessage();
  const autoMarked = useRef(false);

  // Opening a message marks it as read (once).
  useEffect(() => {
    if (m && !m.is_read && !autoMarked.current) {
      autoMarked.current = true;
      setRead.mutate({ id: m.id, isRead: true });
    }
  }, [m, setRead]);

  // Keep the app-icon badge in sync with the unread count.
  useEffect(() => {
    if (all) Notifications.setBadgeCountAsync(all.filter((x) => !x.is_read).length).catch(() => {});
  }, [all]);

  if (isLoading && !m) {
    return (
      <Screen>
        <ListSkeleton rows={1} image={false} />
      </Screen>
    );
  }
  if (!m) {
    return <Screen>{error ? <ErrorState error={error} onRetry={refetch} /> : <EmptyState icon="mail-outline" title="Message not found" />}</Screen>;
  }

  return (
    <Screen>
      <Card className="p-5">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-xl font-bold text-foreground" selectable>
            {m.subject}
          </Text>
          <Badge label={m.is_read ? "Read" : "Unread"} tone={m.is_read ? "default" : "primary"} />
        </View>
        <Text className="mt-3 text-base font-semibold text-foreground" selectable>
          {m.name}
        </Text>
        <Text className="text-sm text-primary" selectable onPress={() => Linking.openURL(`mailto:${m.email}`)}>
          {m.email}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.created_at)}</Text>
        <View className="my-4 h-px bg-border" />
        <Text className="text-base leading-7 text-foreground" selectable>
          {m.message}
        </Text>
      </Card>

      <Button
        title="Reply by email"
        icon="arrow-undo"
        onPress={() => Linking.openURL(`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`)}
      />
      <Button
        title={m.is_read ? "Mark as unread" : "Mark as read"}
        icon={m.is_read ? "mail-unread-outline" : "mail-open-outline"}
        variant="outline"
        onPress={() =>
          setRead.mutate(
            { id: m.id, isRead: !m.is_read },
            { onSuccess: () => toast.success(m.is_read ? "Marked as unread" : "Marked as read"), onError: (e) => toast.error("Failed", errorMessage(e)) },
          )
        }
      />
      <Button
        title="Delete message"
        icon="trash-outline"
        variant="ghost"
        textClassName="text-danger"
        loading={del.isPending}
        onPress={() =>
          Alert.alert("Delete message?", `The message from ${m.name} will be permanently deleted.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () =>
                del.mutate(m.id, {
                  onSuccess: () => {
                    toast.success("Message deleted");
                    router.back();
                  },
                  onError: (e) => toast.error("Delete failed", errorMessage(e)),
                }),
            },
          ])
        }
      />
    </Screen>
  );
}
