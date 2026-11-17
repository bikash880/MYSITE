import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/providers/auth";
import { useTheme } from "@/providers/theme";

/** Everything under /admin requires a signed-in admin (the API enforces it server-side too). */
export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!user || !isAdmin) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerTintColor: colors.foreground,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: "700", color: colors.foreground },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Site settings" }} />
      <Stack.Screen name="messages/index" options={{ title: "Messages" }} />
      <Stack.Screen name="messages/[id]" options={{ title: "Message" }} />
      <Stack.Screen name="editor" options={{ presentation: "fullScreenModal", title: "Editor" }} />
    </Stack>
  );
}
