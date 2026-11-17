import { useEffect } from "react";
import { Platform } from "react-native";
import { router, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";

/** Opens the message when a push notification is tapped; refreshes the inbox when one arrives. */
export function useNotificationRouting() {
  const qc = useQueryClient();

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;

    const open = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/admin/")) {
        qc.invalidateQueries({ queryKey: ["admin"] });
        // Let the navigator mount first on cold start.
        setTimeout(() => router.push(url as Href), 0);
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (mounted && response) open(response.notification);
    });

    const tapped = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    const received = Notifications.addNotificationReceivedListener(() => qc.invalidateQueries({ queryKey: ["admin"] }));

    return () => {
      mounted = false;
      tapped.remove();
      received.remove();
    };
  }, [qc]);
}
