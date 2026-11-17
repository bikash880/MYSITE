import { Text, View } from "react-native";
import { router } from "expo-router";
import { mediaUrl } from "@/lib/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "@/components/screen";
import { openLink } from "@/components/social-links";
import { Button, Card, EmptyState, ErrorState, SectionHeader, Skeleton } from "@/components/ui";
import { useEducation, useExperiences, useProfile, useRefresh, useSkills } from "@/hooks/use-public-data";
import { formatRange } from "@/lib/utils";
import type { Education, Experience, Skill } from "@/lib/types";
import { useTheme } from "@/providers/theme";

export default function AboutScreen() {
  const profile = useProfile();
  const skills = useSkills();
  const experiences = useExperiences();
  const education = useEducation();
  const { refreshing, onRefresh } = useRefresh(profile.refetch, skills.refetch, experiences.refetch, education.refetch);

  const p = profile.data!;
  const paragraphs = (p.bio ?? p.short_intro ?? "").split(/\n\s*\n/).filter(Boolean);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Animated.View entering={FadeInDown}>
        <Text className="text-xs font-bold uppercase tracking-widest text-primary">About me</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground" accessibilityRole="header">
          {p.full_name}
        </Text>
        <Text className="text-lg text-muted-foreground">{p.title}</Text>
        <View className="mt-4 gap-3">
          {paragraphs.length ? (
            paragraphs.map((t, i) => (
              <Text key={i} className="text-base leading-7 text-muted-foreground">
                {t}
              </Text>
            ))
          ) : (
            <Text className="text-muted-foreground">Bio coming soon.</Text>
          )}
        </View>
        <View className="mt-5 flex-row gap-3">
          <Button title="View resume" icon="document-text-outline" className="flex-1" onPress={() => router.push("/resume")} />
          {p.cv_url ? <Button title="Download CV" icon="download-outline" variant="outline" className="flex-1" onPress={() => openLink(mediaUrl(p.cv_url)!)} /> : null}
        </View>
      </Animated.View>

      <View className="mt-6">
        <SectionHeader eyebrow="Skills" title="What I work with" />
        {skills.isLoading ? (
          <Skeleton className="h-48" />
        ) : skills.error && !skills.data ? (
          <ErrorState error={skills.error} onRetry={skills.refetch} />
        ) : skills.data?.length ? (
          <SkillGroups skills={skills.data} />
        ) : (
          <EmptyState title="No skills added yet" />
        )}
      </View>

      <View className="mt-6">
        <SectionHeader eyebrow="Career" title="Experience" />
        {experiences.isLoading ? <Skeleton className="h-40" /> : <Timeline items={experiences.data ?? []} icon="briefcase" empty="No experience added yet" />}
      </View>

      <View className="mt-6">
        <SectionHeader eyebrow="Learning" title="Education" />
        {education.isLoading ? <Skeleton className="h-32" /> : <Timeline items={education.data ?? []} icon="school" empty="No education added yet" />}
      </View>
    </Screen>
  );
}

function SkillGroups({ skills }: { skills: Skill[] }) {
  const groups = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  return (
    <View className="gap-4">
      {Object.entries(groups).map(([category, list]) => (
        <Card key={category} className="p-5">
          <Text className="mb-4 font-semibold text-foreground">{category}</Text>
          <View className="gap-4">
            {list.map((s) => (
              <View key={s.id} accessible accessibilityLabel={`${s.name}, ${s.level} percent`}>
                <View className="mb-1.5 flex-row justify-between">
                  <Text className="text-sm font-medium text-foreground">
                    {s.icon ? `${s.icon}  ` : ""}
                    {s.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">{s.level}%</Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-muted">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${s.level}%` }} />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

function Timeline({
  items,
  icon,
  empty,
}: {
  items: (Experience | Education)[];
  icon: "briefcase" | "school";
  empty: string;
}) {
  const { colors } = useTheme();
  if (!items.length) return <EmptyState title={empty} />;
  return (
    <View className="ml-4 border-l border-border">
      {items.map((it, i) => {
        const title = "role" in it ? it.role : it.degree;
        const sub = "role" in it ? it.company : it.institution;
        return (
          <Animated.View key={it.id} entering={FadeInDown.delay(i * 60)} className="relative pb-8 pl-8 last:pb-0">
            <View className="absolute -left-4 top-0 h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
              <Ionicons name={icon} size={14} color={colors.primary} />
            </View>
            <Text className="text-xs font-bold uppercase tracking-wider text-primary">
              {formatRange(it.start_date, it.end_date, it.is_current)}
            </Text>
            <Text className="mt-1 text-lg font-semibold text-foreground">{title}</Text>
            <Text className="text-sm text-muted-foreground">
              {sub}
              {it.location ? ` · ${it.location}` : ""}
            </Text>
            {it.description ? <Text className="mt-2 text-sm leading-6 text-muted-foreground">{it.description}</Text> : null}
          </Animated.View>
        );
      })}
    </View>
  );
}
