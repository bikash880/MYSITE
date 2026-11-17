import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/providers/theme";
import { formatDate } from "@/lib/utils";
import type { Certificate, Project } from "@/lib/types";
import { openLink } from "./social-links";
import { cn, Image } from "./ui";

function Cover({ uri, className, icon = "image-outline" }: { uri: string | null; className?: string; icon?: "image-outline" | "ribbon" }) {
  const { colors } = useTheme();
  return (
    <View className={cn("items-center justify-center overflow-hidden bg-muted", className)}>
      {uri ? (
        <Image source={{ uri }} className="h-full w-full" contentFit="cover" transition={250} cachePolicy="disk" />
      ) : (
        <Ionicons name={icon} size={36} color={colors.primary + "99"} />
      )}
    </View>
  );
}

export function ProjectCard({ project, compact }: { project: Project; compact?: boolean }) {
  return (
    <Link href={`/project/${project.slug}`} asChild>
      <Pressable
        className={cn("overflow-hidden rounded-3xl border border-border bg-card active:opacity-90", compact && "w-72")}
        accessibilityRole="link"
        accessibilityLabel={`${project.title}, ${project.category}`}
      >
        <Cover uri={project.image_url} className="aspect-video w-full" />
        <View className="p-4">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary">{project.category}</Text>
          <Text className="mt-1 text-lg font-semibold text-foreground" numberOfLines={1}>
            {project.title}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground" numberOfLines={compact ? 2 : 3}>
            {project.summary}
          </Text>
          {project.tech.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {project.tech.slice(0, compact ? 3 : 6).map((t) => (
                <View key={t} className="rounded-md bg-muted px-2 py-0.5">
                  <Text className="text-xs text-muted-foreground">{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const isExpired = (c: Certificate) => Boolean(c.expiry_date && new Date(`${c.expiry_date}T23:59:59`) < new Date());

export function CertificateCard({ cert, compact }: { cert: Certificate; compact?: boolean }) {
  const { colors } = useTheme();
  const expired = isExpired(cert);
  return (
    <View
      className={cn("overflow-hidden rounded-3xl border border-border bg-card", compact && "w-72")}
      accessible
      accessibilityLabel={`${cert.title}, issued by ${cert.issuer}`}
    >
      <Cover uri={cert.image_url} className="aspect-[4/3] w-full" icon="ribbon" />
      <View className="p-4">
        <Text className="text-xs font-bold uppercase tracking-wider text-primary" numberOfLines={1}>
          {cert.issuer}
        </Text>
        <Text className="mt-1 text-lg font-semibold leading-6 text-foreground" numberOfLines={2}>
          {cert.title}
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1">
          <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground">
            Issued {formatDate(cert.issue_date, false)}
            {cert.expiry_date ? ` · ${expired ? "Expired" : "Valid until"} ${formatDate(cert.expiry_date, false)}` : ""}
          </Text>
        </View>
        {cert.credential_id ? <Text className="mt-1 text-xs text-muted-foreground">ID {cert.credential_id}</Text> : null}
        {cert.skills.length > 0 && !compact && (
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {cert.skills.map((s) => (
              <View key={s} className="rounded-md bg-primary/10 px-2 py-0.5">
                <Text className="text-xs text-primary">{s}</Text>
              </View>
            ))}
          </View>
        )}
        {cert.credential_url ? (
          <Pressable
            onPress={() => openLink(cert.credential_url!)}
            accessibilityRole="link"
            accessibilityLabel={`Verify ${cert.title}`}
            className="mt-4 flex-row items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 active:bg-muted"
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <Text className="text-sm font-semibold text-primary">Verify credential</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
