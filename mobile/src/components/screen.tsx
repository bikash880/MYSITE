import { RefreshControl, ScrollView, type ScrollViewProps } from "react-native";
import { useTheme } from "@/providers/theme";

/** Scrollable screen body with consistent padding and optional pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  padded = true,
  ...props
}: ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; padded?: boolean }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingBottom: 48 }, padded && { padding: 16, gap: 16 }]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        ) : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function useRefreshControl(refreshing: boolean, onRefresh: () => void) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />
  );
}
