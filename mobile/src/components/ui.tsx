import { forwardRef, useEffect } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type PressableProps, type TextInputProps } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image as ExpoImage } from "expo-image";
import { cssInterop } from "nativewind";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "@/providers/theme";
import type { IoniconName } from "@/lib/icons";
import { mediaUrl } from "@/lib/api";
import { initials } from "@/lib/utils";

// Let expo-image accept className (cached images work offline).
const StyledImage = cssInterop(ExpoImage, { className: "style" });

/** expo-image with className support; resolves uploaded "/api/media/<id>" paths against the API URL. */
export function Image({ source, ...props }: React.ComponentProps<typeof StyledImage>) {
  const resolved =
    source && typeof source === "object" && !Array.isArray(source) && "uri" in source && typeof source.uri === "string"
      ? { ...source, uri: mediaUrl(source.uri) }
      : source;
  return <StyledImage source={resolved} {...props} />;
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

const variantBox: Record<Variant, string> = {
  primary: "bg-primary",
  secondary: "bg-muted",
  outline: "border border-border bg-transparent",
  ghost: "bg-transparent",
  danger: "bg-danger",
};
const variantText: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  danger: "text-white",
};

export function Button({
  title,
  icon,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  textClassName,
  ...props
}: PressableProps & {
  title?: string;
  icon?: IoniconName;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
  textClassName?: string;
}) {
  const { colors } = useTheme();
  const fg = variant === "primary" || variant === "danger" ? "#fff" : colors.foreground;
  const h = size === "sm" ? "h-9 px-3" : size === "lg" ? "h-14 px-6" : "h-12 px-5";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80",
        h,
        variantBox[variant],
        (disabled || loading) && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={fg} />
      ) : null}
      {title ? (
        <Text className={cn("font-semibold", size === "sm" ? "text-sm" : "text-base", variantText[variant], textClassName)}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = 22,
  className,
}: {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  className?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className={cn("h-10 w-10 items-center justify-center rounded-xl active:bg-muted", className)}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.foreground} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Inputs                                                             */
/* ------------------------------------------------------------------ */

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text className="mb-1.5 text-sm font-medium text-foreground">
      {children}
      {required ? <Text className="text-danger"> *</Text> : null}
    </Text>
  );
}

export function FieldMessage({ error, help }: { error?: string; help?: string }) {
  if (error) return <Text className="mt-1.5 text-xs font-medium text-danger" accessibilityLiveRegion="polite">{error}</Text>;
  if (help) return <Text className="mt-1.5 text-xs text-muted-foreground">{help}</Text>;
  return null;
}

export const Input = forwardRef<TextInput, TextInputProps & { invalid?: boolean; className?: string }>(function Input(
  { invalid, className, multiline, ...props },
  ref,
) {
  const { colors, scheme } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedForeground + "AA"}
      keyboardAppearance={scheme}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      className={cn(
        "rounded-2xl border bg-card px-4 text-base text-foreground",
        multiline ? "min-h-28 py-3" : "h-12",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Display                                                            */
/* ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <View className={cn("rounded-3xl border border-border bg-card", className)}>{children}</View>;
}

export function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "primary" | "success" | "warning" | "danger" }) {
  const box = {
    default: "bg-muted",
    primary: "bg-primary/15",
    success: "bg-success/15",
    warning: "bg-warning/15",
    danger: "bg-danger/15",
  }[tone];
  const txt = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];
  return (
    <View className={cn("self-start rounded-full px-2.5 py-0.5", box)}>
      <Text className={cn("text-xs font-semibold capitalize", txt)}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn("rounded-full px-4 py-2", active ? "bg-primary" : "bg-muted")}
    >
      <Text className={cn("text-sm font-medium", active ? "text-white" : "text-muted-foreground")}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 48 }: { uri?: string | null; name: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center overflow-hidden bg-primary/15"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
      ) : (
        <Text className="font-bold text-primary" style={{ fontSize: size * 0.36 }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <View className="mb-4 flex-row items-end justify-between gap-3">
      <View className="flex-1">
        {eyebrow ? <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</Text> : null}
        <Text className="text-2xl font-bold text-foreground" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: object }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View className={cn("rounded-2xl bg-muted", className)} style={[anim, style]} />;
}

export function ListSkeleton({ rows = 4, image = true }: { rows?: number; image?: boolean }) {
  return (
    <View className="gap-4" accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="overflow-hidden rounded-3xl border border-border bg-card">
          {image ? <Skeleton className="h-44 rounded-none" /> : null}
          <View className="gap-2.5 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  description,
  action,
}: {
  icon?: IoniconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View className="items-center rounded-3xl border border-dashed border-border px-6 py-12">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
      {description ? <Text className="mt-1 text-center text-sm text-muted-foreground">{description}</Text> : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = (error as { message?: string })?.message ?? "Something went wrong";
  const offline = msg.includes("Network request failed");
  return (
    <EmptyState
      icon={offline ? "cloud-offline-outline" : "alert-circle-outline"}
      title={offline ? "You're offline" : "Couldn't load this"}
      description={offline ? "Connect to the internet and pull to refresh." : msg}
      action={onRetry ? <Button title="Try again" variant="outline" size="sm" icon="refresh" onPress={onRetry} /> : undefined}
    />
  );
}
