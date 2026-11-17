import { View } from "react-native";
import { Tabs, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { IconButton } from "@/components/ui";
import { useAuth } from "@/providers/auth";
import { useTheme } from "@/providers/theme";
import type { IoniconName } from "@/lib/icons";

const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: "index", title: "Home", icon: "home-outline", iconActive: "home" },
  { name: "about", title: "About", icon: "person-outline", iconActive: "person" },
  { name: "projects", title: "Projects", icon: "folder-open-outline", iconActive: "folder-open" },
  { name: "certificates", title: "Certificates", icon: "ribbon-outline", iconActive: "ribbon" },
  { name: "contact", title: "Contact", icon: "chatbubble-ellipses-outline", iconActive: "chatbubble-ellipses" },
];

function HeaderActions() {
  const { scheme, toggle } = useTheme();
  const { isAdmin } = useAuth();
  return (
    <View className="mr-2 flex-row items-center">
      <IconButton
        icon={scheme === "dark" ? "sunny-outline" : "moon-outline"}
        label={`Switch to ${scheme === "dark" ? "light" : "dark"} mode`}
        onPress={toggle}
      />
      <IconButton
        icon={isAdmin ? "grid-outline" : "lock-closed-outline"}
        label={isAdmin ? "Open admin dashboard" : "Admin sign in"}
        onPress={() => router.push(isAdmin ? "/admin" : "/login")}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontWeight: "700", color: colors.foreground },
        headerRight: () => <HeaderActions />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? t.iconActive : t.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
