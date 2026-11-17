import { Linking, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/providers/theme";
import type { IoniconName } from "@/lib/icons";
import type { Profile } from "@/lib/types";

export function socialLinks(p: Profile) {
  return [
    { label: "GitHub", href: p.github_url, icon: "logo-github" },
    { label: "LinkedIn", href: p.linkedin_url, icon: "logo-linkedin" },
    { label: "X (Twitter)", href: p.twitter_url, icon: "logo-twitter" },
    { label: "Instagram", href: p.instagram_url, icon: "logo-instagram" },
    { label: "Website", href: p.website_url, icon: "globe-outline" },
    { label: "Email", href: p.email ? `mailto:${p.email}` : null, icon: "mail-outline" },
  ].filter((l): l is { label: string; href: string; icon: IoniconName } => Boolean(l.href));
}

export function openLink(href: string) {
  if (href.startsWith("http")) return WebBrowser.openBrowserAsync(href).catch(() => Linking.openURL(href));
  return Linking.openURL(href).catch(() => {});
}

export function SocialLinks({ profile, center }: { profile: Profile; center?: boolean }) {
  const { colors } = useTheme();
  const links = socialLinks(profile);
  if (!links.length) return null;
  return (
    <View className={center ? "flex-row flex-wrap justify-center gap-2" : "flex-row flex-wrap gap-2"}>
      {links.map((l) => (
        <Pressable
          key={l.label}
          onPress={() => openLink(l.href)}
          accessibilityRole="link"
          accessibilityLabel={l.label}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card active:border-primary"
        >
          <Ionicons name={l.icon} size={19} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}
