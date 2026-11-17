import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen } from "@/components/screen";
import { toast } from "@/components/toast";
import { Card, ErrorState, IconButton, Skeleton, cn } from "@/components/ui";
import { useDashboardStats } from "@/hooks/use-admin-data";
import { useRefresh } from "@/hooks/use-public-data";
import { isPushEnabled, PUSH_PREF_KEY, registerForPushNotifications, unregisterPushNotifications } from "@/lib/notifications";
import { RESOURCES } from "@/lib/resources";
import type { IoniconName } from "@/lib/icons";
import { useAuth } from "@/providers/auth";
import { useTheme, type ThemePref } from "@/providers/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Dashboard() {
  const { colors, pref, setPref } = useTheme();
  const { user, signOut } = useAuth();
  const stats = useDashboardStats();
  const { refreshing, onRefresh } = useRefresh(stats.refetch);
  const [push, setPush] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Offer notifications automatically the first time an admin opens the dashboard.
  useEffect(() => {
    (async () => {
      const enabled = await isPushEnabled();
      setPush(enabled);
      const asked = await AsyncStorage.getItem(PUSH_PREF_KEY);
      if (!enabled && asked === null) togglePush(true, true);
    })();
     
  }, []);

  async function togglePush(next: boolean, silent = false) {
    setPushBusy(true);
    try {
      if (next) {
        const res = await registerForPushNotifications();
        if (res.ok) {
          setPush(true);
          if (!silent) toast.success("Notifications on", "You'll be notified about new messages.");
        } else {
          await AsyncStorage.setItem(PUSH_PREF_KEY, "0");
          setPush(false);
          if (!silent) toast.error("Couldn't enable notifications", res.reason);
        }
      } else {
        await unregisterPushNotifications();
        setPush(false);
        toast.info("Notifications off");
      }
    } finally {
      setPushBusy(false);
    }
  }

  const s = stats.data;
  const cards: { label: string; value?: number; hint?: string; icon: IoniconName; href?: Href; highlight?: boolean }[] = [
    { label: "Projects", value: s?.projects, icon: "folder-open", href: "/admin/projects" },
    { label: "Certificates", value: s?.certificates, icon: "ribbon", href: "/admin/certificates", hint: s ? `${s.skills} skills listed` : undefined },
    { label: "Messages", value: s?.messages, icon: "mail", href: "/admin/messages" },
    { label: "Unread", value: s?.unread, icon: "mail-unread", href: "/admin/messages", highlight: (s?.unread ?? 0) > 0 },
    { label: "Site visits", value: s?.visits, icon: "eye", hint: s ? `${s.visitsWeek} in last 7 days` : undefined },
  ];

  const menu: { label: string; icon: IoniconName; href: Href; badge?: number }[] = [
    { label: "Profile", icon: "person-circle", href: "/admin/profile" },
    ...Object.values(RESOURCES).map((r) => ({ label: r.plural, icon: r.icon, href: `/admin/${r.key}` as Href })),
    { label: "Messages", icon: "mail", href: "/admin/messages", badge: s?.unread },
    { label: "Site settings", icon: "settings", href: "/admin/settings" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <IconButton icon="close" label="Back to portfolio" onPress={() => router.dismissTo("/")} />,
        }}
      />
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Text className="text-sm text-muted-foreground">Signed in as {user?.email}</Text>

        {stats.error && !s ? (
          <ErrorState error={stats.error} onRetry={stats.refetch} />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {cards.map((c, i) => (
              <Pressable
                key={c.label}
                disabled={!c.href}
                onPress={() => c.href && router.push(c.href)}
                className={i === cards.length - 1 ? "w-full" : "w-[48.5%]"}
              >
                <Card className={cn("p-4", c.highlight && "border-primary/50 bg-primary/5")}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">{c.label}</Text>
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                      <Ionicons name={c.icon} size={16} color={colors.primary} />
                    </View>
                  </View>
                  {stats.isLoading ? (
                    <Skeleton className="mt-3 h-8 w-12" />
                  ) : (
                    <Text className="mt-2 text-3xl font-bold text-foreground">{(c.value ?? 0).toLocaleString()}</Text>
                  )}
                  {c.hint ? <Text className="mt-0.5 text-xs text-muted-foreground">{c.hint}</Text> : null}
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <Card className="overflow-hidden">
          {menu.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => router.push(m.href)}
              accessibilityRole="button"
              className={cn("flex-row items-center gap-3 px-4 py-3.5 active:bg-muted", i > 0 && "border-t border-border")}
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Ionicons name={m.icon} size={18} color={colors.primary} />
              </View>
              <Text className="flex-1 text-base font-medium text-foreground">{m.label}</Text>
              {m.badge ? (
                <View className="min-w-6 items-center rounded-full bg-primary px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">{m.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </Card>

        <Card className="gap-4 p-4">
          <View className="flex-row items-center gap-3">
            <Ionicons name="notifications-outline" size={20} color={colors.foreground} />
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">New message alerts</Text>
              <Text className="text-xs text-muted-foreground">Push notification when someone uses the contact form</Text>
            </View>
            <Switch
              value={push}
              disabled={pushBusy}
              onValueChange={(v) => togglePush(v)}
              trackColor={{ true: colors.primary, false: colors.muted }}
              thumbColor="#fff"
              accessibilityLabel="New message alerts"
            />
          </View>
          <View className="flex-row items-center gap-3 border-t border-border pt-4">
            <Ionicons name="contrast-outline" size={20} color={colors.foreground} />
            <Text className="flex-1 text-base font-medium text-foreground">Appearance</Text>
            <View className="flex-row rounded-xl bg-muted p-1">
              {(["system", "light", "dark"] as ThemePref[]).map((p) => (
                <Pressable key={p} onPress={() => setPref(p)} className={cn("rounded-lg px-3 py-1.5", pref === p && "bg-card")}>
                  <Text className={cn("text-xs font-semibold capitalize", pref === p ? "text-foreground" : "text-muted-foreground")}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <Pressable
          onPress={() =>
            Alert.alert("Sign out?", undefined, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: async () => {
                  await signOut();
                  router.dismissTo("/");
                },
              },
            ])
          }
          className="flex-row items-center justify-center gap-2 py-3"
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text className="font-semibold text-danger">Sign out</Text>
        </Pressable>
      </Screen>
    </>
  );
}
