import { useEffect, useState } from "react";
import { Text } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useIsOnline() {
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  return online;
}

/** Thin banner shown while offline — cached content stays browsable. */
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="none"
      style={{ position: "absolute", top: insets.top + 4, left: 16, right: 16, zIndex: 100 }}
      className="flex-row items-center justify-center gap-2 rounded-full bg-foreground/90 px-4 py-2"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="cloud-offline" size={14} color="#fff" />
      <Text className="text-xs font-semibold text-background">Offline — showing saved content</Text>
    </Animated.View>
  );
}
