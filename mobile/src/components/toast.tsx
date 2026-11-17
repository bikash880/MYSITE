import Toast, { BaseToast, ErrorToast, type ToastConfig } from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/providers/theme";

export const toast = {
  success(text: string, detail?: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Toast.show({ type: "success", text1: text, text2: detail });
  },
  error(text: string, detail?: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Toast.show({ type: "error", text1: text, text2: detail, visibilityTime: 5000 });
  },
  info(text: string, detail?: string) {
    Toast.show({ type: "info", text1: text, text2: detail });
  },
};

/** Themed toast host — render once at the root. */
export function ToastHost() {
  const { colors } = useTheme();
  const base = {
    style: { backgroundColor: colors.card, borderLeftWidth: 5, borderRadius: 16, borderColor: colors.border },
    text1Style: { color: colors.foreground, fontSize: 15, fontWeight: "600" as const },
    text2Style: { color: colors.mutedForeground, fontSize: 13 },
    text2NumberOfLines: 3,
  };
  const config: ToastConfig = {
    success: (p) => <BaseToast {...p} {...base} style={[base.style, { borderLeftColor: "#10b981" }]} />,
    error: (p) => <ErrorToast {...p} {...base} style={[base.style, { borderLeftColor: "#ef4444" }]} />,
    info: (p) => <BaseToast {...p} {...base} style={[base.style, { borderLeftColor: colors.primary }]} />,
  };
  return <Toast config={config} topOffset={60} />;
}
