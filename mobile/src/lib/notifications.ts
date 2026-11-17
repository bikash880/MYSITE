import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

const TOKEN_KEY = "push:token";
export const PUSH_PREF_KEY = "push:enabled";

// Show banners for new messages even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Asks for permission, gets this device's Expo push token and registers it with
 * the API (stored in MongoDB `push_tokens`). The server sends a push to every
 * registered device whenever a contact message is created.
 */
export async function registerForPushNotifications(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (Platform.OS === "web") return { ok: false, reason: "Push notifications aren't supported on web." };
  if (!Device.isDevice) return { ok: false, reason: "Push notifications need a physical device." };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "New messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6C63FF",
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { ok: false, reason: "Notification permission was denied. Enable it in Settings." };

  const id = projectId();
  if (!id) return { ok: false, reason: "Missing EAS projectId — run `eas init` (see README)." };

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  } catch (e) {
    return { ok: false, reason: `Could not get a push token: ${(e as Error).message}` };
  }

  try {
    await api("/api/admin/push-tokens", { method: "POST", body: { token, platform: Platform.OS }, auth: true });
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }

  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [PUSH_PREF_KEY, "1"],
  ]);
  return { ok: true };
}

/** Removes this device's token so it stops receiving notifications. */
export async function unregisterPushNotifications() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await api("/api/admin/push-tokens", { method: "DELETE", body: { token }, auth: true }).catch(() => {});
  await AsyncStorage.multiRemove([TOKEN_KEY]);
  await AsyncStorage.setItem(PUSH_PREF_KEY, "0");
}

export async function isPushEnabled() {
  return (await AsyncStorage.getItem(PUSH_PREF_KEY)) === "1" && Boolean(await AsyncStorage.getItem(TOKEN_KEY));
}
